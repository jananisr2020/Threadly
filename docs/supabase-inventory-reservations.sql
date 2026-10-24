-- Juno transactional inventory reservation schema (Supabase/PostgreSQL)
-- Apply in a non-production project first. This migration does not copy stock from
-- Google Sheets automatically. Before enabling it, import and reconcile every product
-- into juno_inventory, then make this table the sole stock authority for checkout.

create extension if not exists pgcrypto;

create table if not exists public.juno_inventory (
  product_id text primary key,
  available_stock integer not null check (available_stock >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.juno_inventory_reservations (
  checkout_id text primary key,
  status text not null check (status in ('reserved', 'committed', 'released', 'expired')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists juno_inventory_reservations_expiry_idx
  on public.juno_inventory_reservations (expires_at)
  where status = 'reserved';

-- Atomically validates all requested quantities and decrements stock in one transaction.
-- Input items format: [{"product_id":"JN0001","quantity":2}, ...].
-- A checkout_id can reserve only once; retries return the original reservation state.
create or replace function public.juno_reserve_inventory(
  p_checkout_id text,
  p_items jsonb,
  p_ttl_seconds integer default 900
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_existing public.juno_inventory_reservations%rowtype;
  v_normalized jsonb := '[]'::jsonb;
  v_count integer := 0;
begin
  if p_checkout_id is null or length(trim(p_checkout_id)) < 8 or length(p_checkout_id) > 160 then
    raise exception 'invalid_checkout_id' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;
  if p_ttl_seconds < 60 or p_ttl_seconds > 1800 then
    raise exception 'invalid_reservation_ttl' using errcode = '22023';
  end if;

  select * into v_existing
    from public.juno_inventory_reservations
    where checkout_id = p_checkout_id
    for update;

  if found then
    if v_existing.items <> p_items then
      raise exception 'checkout_id_payload_mismatch' using errcode = '22023';
    end if;
    return jsonb_build_object('checkout_id', v_existing.checkout_id,
      'status', v_existing.status, 'expires_at', v_existing.expires_at, 'replayed', true);
  end if;

  -- Aggregate duplicate product IDs before locking and decrementing.
  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(product_id text, quantity integer)
    group by product_id
    order by product_id
  loop
    if v_item.product_id is null or trim(v_item.product_id) = ''
      or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'invalid_item_quantity' using errcode = '22023';
    end if;
    v_count := v_count + 1;
    v_normalized := v_normalized || jsonb_build_array(
      jsonb_build_object('product_id', v_item.product_id, 'quantity', v_item.quantity));
  end loop;

  if v_count = 0 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;

  -- Lock rows in deterministic order, validate all rows, then decrement.
  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(v_normalized) as x(product_id text, quantity integer)
    group by product_id
    order by product_id
  loop
    perform 1 from public.juno_inventory
      where product_id = v_item.product_id
      for update;
    if not found then
      raise exception 'inventory_product_not_found:%', v_item.product_id using errcode = 'P0002';
    end if;
    if (select available_stock from public.juno_inventory where product_id = v_item.product_id) < v_item.quantity then
      raise exception 'insufficient_stock:%', v_item.product_id using errcode = 'P0001';
    end if;
  end loop;

  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(v_normalized) as x(product_id text, quantity integer)
    group by product_id
    order by product_id
  loop
    update public.juno_inventory
      set available_stock = available_stock - v_item.quantity, updated_at = now()
      where product_id = v_item.product_id;
  end loop;

  insert into public.juno_inventory_reservations
    (checkout_id, status, items, expires_at)
  values (p_checkout_id, 'reserved', v_normalized, now() + make_interval(secs => p_ttl_seconds));

  return jsonb_build_object('checkout_id', p_checkout_id, 'status', 'reserved',
    'expires_at', now() + make_interval(secs => p_ttl_seconds), 'replayed', false);
end;
$$;

-- Call after the payment is authoritatively captured. Idempotent commit prevents double
-- finalization. It does not initiate payment and must be called only by trusted backend.
create or replace function public.juno_commit_inventory(p_checkout_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_status text;
begin
  select status into v_status
    from public.juno_inventory_reservations
    where checkout_id = p_checkout_id
    for update;
  if not found then raise exception 'reservation_not_found' using errcode = 'P0002'; end if;
  if v_status = 'committed' then
    return jsonb_build_object('checkout_id', p_checkout_id, 'status', 'committed', 'replayed', true);
  end if;
  if v_status <> 'reserved' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;
  update public.juno_inventory_reservations
    set status = 'committed', updated_at = now()
    where checkout_id = p_checkout_id;
  return jsonb_build_object('checkout_id', p_checkout_id, 'status', 'committed', 'replayed', false);
end;
$$;

-- Release is idempotent and restores stock only once. Invoke for verified failed/expired
-- payment attempts, never merely because a browser says payment failed.
create or replace function public.juno_release_inventory(p_checkout_id text, p_final_status text default 'released')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_res public.juno_inventory_reservations%rowtype; v_item record;
begin
  if p_final_status not in ('released', 'expired') then
    raise exception 'invalid_release_status' using errcode = '22023';
  end if;
  select * into v_res from public.juno_inventory_reservations
    where checkout_id = p_checkout_id for update;
  if not found then raise exception 'reservation_not_found' using errcode = 'P0002'; end if;
  if v_res.status in ('released', 'expired') then
    return jsonb_build_object('checkout_id', p_checkout_id, 'status', v_res.status, 'replayed', true);
  end if;
  if v_res.status <> 'reserved' then
    raise exception 'reservation_not_active' using errcode = 'P0001';
  end if;
  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(v_res.items) as x(product_id text, quantity integer)
    group by product_id order by product_id
  loop
    update public.juno_inventory
      set available_stock = available_stock + v_item.quantity, updated_at = now()
      where product_id = v_item.product_id;
    if not found then raise exception 'inventory_product_not_found:%', v_item.product_id using errcode = 'P0002'; end if;
  end loop;
  update public.juno_inventory_reservations
    set status = p_final_status, updated_at = now()
    where checkout_id = p_checkout_id;
  return jsonb_build_object('checkout_id', p_checkout_id, 'status', p_final_status, 'replayed', false);
end;
$$;

-- The browser must never call these functions directly. Backend service credentials only.
revoke all on function public.juno_reserve_inventory(text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.juno_commit_inventory(text) from public, anon, authenticated;
revoke all on function public.juno_release_inventory(text, text) from public, anon, authenticated;
revoke all on table public.juno_inventory from anon, authenticated;
revoke all on table public.juno_inventory_reservations from anon, authenticated;
