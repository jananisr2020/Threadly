#!/usr/bin/env node
'use strict';

// Offline regression tests for server-side checkout pricing and cart validation.
// Run from threadly-v2 with: npm test
const assert = require('node:assert/strict');
const sheets = require('../netlify/lib/sheets');
const rows = [
  ['Product ID', 'Product Name', 'Category', 'Selling Price', 'Stock', 'Show on site', 'Seller ID', 'Approval Status'],
  ['JN0001', 'Basic scrunchie', 'Hair accessories', 100, 5, 'Yes', '', 'Approved'],
  ['JN0002', 'Seller hair clip', 'Hair accessories', 100, 50, 'Yes', 'JSRSELLER1', 'Approved'],
  ['JN0003', 'Hidden clip', 'Hair accessories', 100, 5, 'No', '', 'Approved'],
  ['JN0004', 'Pending clip', 'Hair accessories', 100, 5, 'Yes', 'JSRSELLER2', 'Pending']
];
const originalRead = sheets.read;
sheets.read = async tab => {
  if (tab === 'Products') return rows;
  throw new Error('Unexpected sheet read in offline checkout test: ' + tab);
};

const { _t, webhook, verifyPayment } = require('../netlify/lib/core');
const cases = [];
async function check(name, fn) {
  try {
    await fn();
    cases.push({ name, ok: true });
    process.stdout.write('✓ ' + name + '\n');
  } catch (err) {
    cases.push({ name, ok: false, error: err && err.message });
    process.stderr.write('✗ ' + name + ': ' + (err && err.message) + '\n');
  }
}
async function rejectsWith(items, pattern) {
  await assert.rejects(() => _t.price(items, ''), pattern);
}

(async () => {
  try {
    await check('rejects an empty cart', () => rejectsWith([], /cart is empty/i));
    await check('rejects a product that does not exist', () => rejectsWith([{ id: 'UNKNOWN', n: 1 }], /no longer available/i));
    await check('rejects zero quantity', () => rejectsWith([{ id: 'JN0001', n: 0 }], /no longer available/i));
    await check('rejects more than 20 units on one cart line', () => rejectsWith([{ id: 'JN0001', n: 21 }], /no longer available/i));
    await check('rejects duplicate lines whose combined quantity exceeds 20', () => rejectsWith([{ id: 'JN0001', n: 11 }, { id: 'JN0001', n: 10 }], /up to 20 units/i));
    await check('rejects quantity above available stock', () => rejectsWith([{ id: 'JN0001', n: 6 }], /only 5 left/i));
    await check('does not allow hidden products at checkout', () => rejectsWith([{ id: 'JN0003', n: 1 }], /no longer available/i));
    await check('does not allow unapproved seller products at checkout', () => rejectsWith([{ id: 'JN0004', n: 1 }], /no longer available/i));
    await check('prices a valid order, shipping and coupon on the server', async () => {
      const result = await _t.price([{ id: 'JN0001', n: 2, s: 'pink' }], 'JUNO10');
      assert.equal(result.sub, 100);
      assert.equal(result.disc, 10);
      assert.equal(result.ship, 39);
      assert.equal(result.total, 129);
      assert.equal(result.count, 2);
      assert.deepEqual(result.qty, [['JN0001', 2]]);
    });
    await check('preserves seller ownership in the priced order details', async () => {
      const result = await _t.price([{ id: 'JN0002', n: 1 }], '');
      assert.equal(result.itemDetails[0].sellerId, 'JSRSELLER1');
      assert.equal(result.itemDetails[0].unitPrice, 50);
    });
    await check('rejects webhook events when the webhook secret is missing', async () => {
      const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      try {
        await assert.rejects(() => webhook({}, { body: '{}', headers: {} }), /Webhook secret not set/i);
      } finally {
        if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
        else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
      }
    });
    await check('rejects webhook events with an invalid signature', async () => {
      const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
      process.env.RAZORPAY_WEBHOOK_SECRET = 'offline-test-secret';
      try {
        await assert.rejects(() => webhook({}, { body: '{"event":"payment.captured"}', headers: { 'x-razorpay-signature': 'invalid' } }), /Bad signature/i);
      } finally {
        if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
        else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
      }
    });
    await check('rejects payment verification requests missing required fields', async () => {
      await assert.rejects(() => verifyPayment({}, {}, { email: 'buyer@example.com' }), /Missing payment details/i);
    });
  } finally {
    sheets.read = originalRead;
  }

  const failed = cases.filter(x => !x.ok);
  process.stdout.write('\n' + (cases.length - failed.length) + '/' + cases.length + ' checkout tests passed.\n');
  if (failed.length) process.exitCode = 1;
})();
