'use strict';

// Server-only Supabase RPC adapter for Juno's transactional inventory store.
// This module deliberately fails closed; it never falls back to Google Sheets.
// Callers must supply a server-validated checkout ID and normalized item list.

function config(env = process.env) {
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !/^https:\/\//i.test(url) || !key) {
    const err = new Error('Transactional inventory database is not configured.');
    err.code = 'INVENTORY_DB_NOT_CONFIGURED';
    throw err;
  }
  return { url, key };
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('At least one inventory item is required.');
    err.code = 'INVENTORY_INVALID_ITEMS';
    throw err;
  }
  const totals = new Map();
  for (const item of items) {
    const productId = String(item && (item.product_id ?? item.productId ?? item.id) || '').trim();
    const quantity = Number(item && item.quantity);
    if (!productId || productId.length > 160 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      const err = new Error('Invalid inventory product or quantity.');
      err.code = 'INVENTORY_INVALID_ITEMS';
      throw err;
    }
    const total = (totals.get(productId) || 0) + quantity;
    if (total > 99) {
      const err = new Error('Requested quantity exceeds the inventory limit.');
      err.code = 'INVENTORY_INVALID_ITEMS';
      throw err;
    }
    totals.set(productId, total);
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([product_id, quantity]) => ({ product_id, quantity }));
}

async function rpc(name, args, options = {}) {
  const { url, key } = config(options.env || process.env);
  const fetchImpl = options.fetch || global.fetch;
  if (typeof fetchImpl !== 'function') {
    const err = new Error('Server fetch is unavailable for inventory database calls.');
    err.code = 'INVENTORY_DB_UNAVAILABLE';
    throw err;
  }
  let response;
  try {
    response = await fetchImpl(url + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(args)
    });
  } catch (_) {
    const err = new Error('Transactional inventory database could not be reached.');
    err.code = 'INVENTORY_DB_UNAVAILABLE';
    throw err;
  }
  if (!response || !response.ok) {
    // Do not expose provider response bodies; they can contain internal diagnostics.
    const err = new Error('Transactional inventory operation failed.');
    err.code = response && response.status === 404 ? 'INVENTORY_DB_RPC_MISSING' : 'INVENTORY_DB_OPERATION_FAILED';
    err.status = response && response.status;
    throw err;
  }
  try {
    return await response.json();
  } catch (_) {
    const err = new Error('Transactional inventory database returned an invalid response.');
    err.code = 'INVENTORY_DB_BAD_RESPONSE';
    throw err;
  }
}

async function reserve(checkoutId, items, options = {}) {
  const id = String(checkoutId || '').trim();
  if (id.length < 8 || id.length > 160) {
    const err = new Error('Invalid inventory reservation ID.');
    err.code = 'INVENTORY_INVALID_CHECKOUT_ID';
    throw err;
  }
  return rpc('juno_reserve_inventory', {
    p_checkout_id: id,
    p_items: normalizeItems(items),
    p_ttl_seconds: options.ttlSeconds || 900
  }, options);
}

async function commit(checkoutId, options = {}) {
  const id = String(checkoutId || '').trim();
  if (id.length < 8 || id.length > 160) {
    const err = new Error('Invalid inventory reservation ID.');
    err.code = 'INVENTORY_INVALID_CHECKOUT_ID';
    throw err;
  }
  return rpc('juno_commit_inventory', { p_checkout_id: id }, options);
}

async function release(checkoutId, finalStatus = 'released', options = {}) {
  const id = String(checkoutId || '').trim();
  if (id.length < 8 || id.length > 160 || !['released', 'expired'].includes(finalStatus)) {
    const err = new Error('Invalid inventory release request.');
    err.code = 'INVENTORY_INVALID_RELEASE';
    throw err;
  }
  return rpc('juno_release_inventory', { p_checkout_id: id, p_final_status: finalStatus }, options);
}

module.exports = { config, normalizeItems, rpc, reserve, commit, release };
