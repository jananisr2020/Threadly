'use strict';
const assert = require('node:assert/strict');
const inv = require('../netlify/lib/inventory');

async function run() {
  assert.throws(() => inv.config({}), e => e.code === 'INVENTORY_DB_NOT_CONFIGURED');
  assert.throws(() => inv.config({ SUPABASE_URL: 'http://example.test', SUPABASE_SERVICE_ROLE_KEY: 'secret' }),
    e => e.code === 'INVENTORY_DB_NOT_CONFIGURED');
  assert.deepEqual(inv.normalizeItems([
    { productId: 'JN0002', quantity: 1 },
    { id: 'JN0001', quantity: 2 },
    { product_id: 'JN0002', quantity: 3 }
  ]), [
    { product_id: 'JN0001', quantity: 2 },
    { product_id: 'JN0002', quantity: 4 }
  ]);
  assert.throws(() => inv.normalizeItems([]), e => e.code === 'INVENTORY_INVALID_ITEMS');
  assert.throws(() => inv.normalizeItems([{ id: 'JN0001', quantity: 0 }]), e => e.code === 'INVENTORY_INVALID_ITEMS');
  assert.throws(() => inv.normalizeItems([{ id: 'JN0001', quantity: 1.5 }]), e => e.code === 'INVENTORY_INVALID_ITEMS');
  assert.throws(() => inv.normalizeItems([{ id: 'JN0001', quantity: 50 }, { id: 'JN0001', quantity: 50 }]),
    e => e.code === 'INVENTORY_INVALID_ITEMS');
  assert.throws(() => inv.normalizeItems([{ id: 'x'.repeat(161), quantity: 1 }]), e => e.code === 'INVENTORY_INVALID_ITEMS');

  let call;
  const options = {
    env: { SUPABASE_URL: 'https://project.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key' },
    fetch: async (url, init) => {
      call = { url, init };
      return { ok: true, json: async () => ({ status: 'reserved', replayed: false }) };
    }
  };
  const reserved = await inv.reserve('checkout-12345678', [
    { id: 'JN0001', quantity: 1 }, { id: 'JN0001', quantity: 1 }
  ], options);
  assert.equal(reserved.status, 'reserved');
  assert.equal(call.url, 'https://project.supabase.co/rest/v1/rpc/juno_reserve_inventory');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers.Authorization, 'Bearer server-only-test-key');
  assert.deepEqual(JSON.parse(call.init.body), {
    p_checkout_id: 'checkout-12345678',
    p_items: [{ product_id: 'JN0001', quantity: 2 }],
    p_ttl_seconds: 900
  });

  await inv.commit('checkout-12345678', options);
  assert.equal(call.url, 'https://project.supabase.co/rest/v1/rpc/juno_commit_inventory');
  await inv.release('checkout-12345678', 'expired', options);
  assert.equal(call.url, 'https://project.supabase.co/rest/v1/rpc/juno_release_inventory');
  await assert.rejects(() => inv.release('checkout-12345678', 'anything', options),
    e => e.code === 'INVENTORY_INVALID_RELEASE');

  await assert.rejects(() => inv.reserve('checkout-12345678', [{ id: 'JN0001', quantity: 1 }], {
    ...options, fetch: async () => { throw new Error('network detail should not leak'); }
  }), e => e.code === 'INVENTORY_DB_UNAVAILABLE' && !e.message.includes('network detail'));

  await assert.rejects(() => inv.commit('checkout-12345678', {
    ...options, fetch: async () => ({ ok: false, status: 500, text: async () => 'secret/internal provider details' })
  }), e => e.code === 'INVENTORY_DB_OPERATION_FAILED' && !e.message.includes('secret'));

  await assert.rejects(() => inv.commit('checkout-12345678', {
    ...options, fetch: async () => ({ ok: true, json: async () => { throw new Error('bad json'); } })
  }), e => e.code === 'INVENTORY_DB_BAD_RESPONSE');

  console.log('Transactional inventory adapter tests passed.');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
