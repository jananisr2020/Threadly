#!/usr/bin/env node
'use strict';

// Offline regression tests for server-side checkout pricing and cart validation.
// Run from threadly-v2 with: npm test
const assert = require('node:assert/strict');
const sheets = require('../netlify/lib/sheets');
const jwt = require('jsonwebtoken');
const rows = [
  ['Product ID', 'Product Name', 'Category', 'Selling Price', 'Stock', 'Show on site', 'Seller ID', 'Approval Status'],
  ['JN0001', 'Basic scrunchie', 'Hair accessories', 100, 5, 'Yes', '', 'Approved'],
  ['JN0002', 'Seller hair clip', 'Hair accessories', 100, 50, 'Yes', 'JSRSELLER1', 'Approved'],
  ['JN0003', 'Hidden clip', 'Hair accessories', 100, 5, 'No', '', 'Approved'],
  ['JN0004', 'Pending clip', 'Hair accessories', 100, 5, 'Yes', 'JSRSELLER2', 'Pending']
];
const originalRead = sheets.read;
const originalAppend = sheets.append;
const originalUpdate = sheets.update;
const originalEnsureTab = sheets.ensureTab;
let mockedSheets = {};
const appendedRows = [];
const updatedRows = [];
sheets.read = async tab => {
  if (tab === 'Products') return rows;
  if (Object.prototype.hasOwnProperty.call(mockedSheets, tab)) return mockedSheets[tab];
  throw new Error('Unexpected sheet read in offline checkout test: ' + tab);
};
sheets.append = async (tab, row) => { appendedRows.push({ tab, row }); if (Array.isArray(mockedSheets[tab])) mockedSheets[tab].push(row); };
sheets.update = async (tab, rowNum, row) => {
  updatedRows.push({ tab, rowNum, row });
  if (mockedSheets[tab] && mockedSheets[tab][rowNum - 1]) mockedSheets[tab][rowNum - 1] = row;
};
sheets.ensureTab = async () => true;

const { _t, webhook, verifyPayment, securityHealth, health, trackWebsiteActivity, placeCod, admin } = require('../netlify/lib/core');
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
    await check('public health endpoint does not disclose configuration details', async () => {
      const result = await health();
      assert.equal(result.ok, true);
      assert.equal(Object.prototype.hasOwnProperty.call(result, 'env'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(result, 'shareSheetWith'), false);
    });
    await check('security diagnostics require an admin session', async () => {
      await assert.rejects(() => securityHealth({}, { headers: {} }), /Admin login required/i);
    });
    await check('website activity endpoint rejects events without explicit consent', async () => {
      const previous = appendedRows.length;
      await assert.rejects(() => trackWebsiteActivity({ event: 'page_view', sessionId: 'test_session_123', page: '/' }, { headers: {} }), /explicit consent/i);
      assert.equal(appendedRows.slice(previous).filter(x => x.tab === 'WebsiteActivity').length, 0);
    });
    await check('website activity endpoint records only after explicit all-consent flag', async () => {
      const previous = appendedRows.length;
      await trackWebsiteActivity({ consent: 'all', event: 'page_view', sessionId: 'test_session_123', page: '/', referrer: '' }, { headers: { 'x-nf-client-connection-ip': '127.0.0.1' } });
      const row = appendedRows.slice(previous).find(x => x.tab === 'WebsiteActivity');
      assert.ok(row, 'expected WebsiteActivity append after consent');
      assert.equal(row.row[3], 'page_view');
    });
    await check('server-side COD handler always rejects direct calls', async () => {
      await assert.rejects(() => placeCod({}, { headers: {} }, { email: 'buyer@example.com' }), /Cash on delivery is not available/i);
    });
    await check('admin product editor rejects selling prices above ₹500', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousAppends = appendedRows.length;
      process.env.JWT_SECRET = 'offline-admin-regression-secret';
      try {
        const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
        await assert.rejects(
          () => admin({ action: 'saveProduct', product: { name: 'Over budget accessory', price: 501, mrp: 600 } }, { headers: { authorization: 'Bearer ' + token } }),
          /₹500 or less/i
        );
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Products').length, 0);
      } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
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
      // Seller-owned catalogue rows retain the seller's listed price; Juno budget pricing applies only to Juno-owned rows.
      assert.equal(result.itemDetails[0].unitPrice, 100);
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
    await check('blocks a payment retry when the existing order requires stock reconciliation', async () => {
      const previousSheets = mockedSheets;
      const previousAppends = appendedRows.length;
      const previousUpdates = updatedRows.length;
      mockedSheets = {
        Orders: [
          ['Order ID', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Payment ID', '', '', '', 'Notes'],
          ['JUNO-ORDER-RECON', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'pay_recon_1', '', '', '', 'STOCK_RECONCILIATION_REQUIRED: stock mismatch']
        ],
        Pending: [
          ['Razorpay Order ID', 'Order JSON', 'Created', 'Status'],
          ['order_rzp_recon', JSON.stringify({ id: 'JUNO-ORDER-RECON', total: 100, itemDetails: [] }), '', 'pending']
        ]
      };
      try {
        const order = { id: 'JUNO-ORDER-RECON', total: 100, itemDetails: [] };
        await assert.rejects(
          () => _t.recordPaid(order, 'pay_recon_1', 'order_rzp_recon'),
          /already recorded.*stock needs reconciliation.*Do not pay again/i
        );
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Orders').length, 0);
        const pendingUpdate = updatedRows.slice(previousUpdates).find(x => x.tab === 'Pending');
        assert.ok(pendingUpdate, 'expected pending payment status to be updated');
        assert.equal(pendingUpdate.row[3], 'stock_reconciliation_required');
      } finally {
        mockedSheets = previousSheets;
      }
    });

    await check('marks seller reconciliation required when seller tabs are unavailable', async () => {
      const previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      mockedSheets = {
        Orders: [['Order ID', '', '', '', '', '', '', '', '', 'Subtotal', 'Discount', '', '', '', '', 'Payment ID', '', '', '', 'Notes'], ['JUNO-SELLER-FAIL', '', '', '', '', '', '', '', '', 100, 0, '', '', '', '', 'pay_seller_fail', '', '', '', '']],
        Pending: [['Razorpay Order ID', 'Order JSON', 'Created', 'Status'], ['order_rzp_seller_fail', '{}', '', 'pending']]
      };
      try {
        const order = { id: 'JUNO-SELLER-FAIL', total: 100, sub: 100, disc: 0, itemDetails: [{ productId: 'JN0002', name: 'Seller hair clip', unitPrice: 100, quantity: 1, sellerId: 'JSRSELLER1' }] };
        assert.equal(await _t.recordPaid(order, 'pay_seller_fail', 'order_rzp_seller_fail'), true);
        const pendingUpdate = updatedRows.slice(previousUpdates).find(x => x.tab === 'Pending');
        assert.ok(pendingUpdate, 'expected pending status update');
        assert.equal(pendingUpdate.row[3], 'seller_reconciliation_required');
        assert.equal(appendedRows.filter(x => x.tab === 'Orders' && x.row[0] === order.id).length, 0);
      } finally { mockedSheets = previousSheets; }
    });

    await check('creates seller order and ledger records idempotently for a paid seller item', async () => {
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      mockedSheets = {
        Orders: [['Order ID', '', '', '', '', '', '', '', '', 'Subtotal', 'Discount', '', '', '', '', 'Payment ID', '', '', '', 'Notes'], ['JUNO-SELLER-OK', '', '', '', '', '', '', '', '', 100, 0, '', '', '', '', 'pay_seller_ok', '', '', '', '']],
        Pending: [['Razorpay Order ID', 'Order JSON', 'Created', 'Status'], ['order_rzp_seller_ok', '{}', '', 'pending']],
        Sellers: [['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status'], ['JSRSELLER1', 'APP1', 'Cute Clips', 'seller@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active']],
        SellerOrders: [['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID']],
        SellerLedger: [['Ledger ID', 'Seller Order ID', 'Parent Order ID', 'Payment ID', 'Seller ID', 'Store Name', 'Gross Item Subtotal', 'Allocated Discount', 'Commission BPS', 'Commission Amount', 'Net Seller Amount', 'Currency', 'Ledger Status', 'Payout Reference', 'Created', 'Updated', 'Notes']]
      };
      const previousBps = process.env.JUNO_MARKETPLACE_COMMISSION_BPS;
      process.env.JUNO_MARKETPLACE_COMMISSION_BPS = '500';
      try {
        const order = { id: 'JUNO-SELLER-OK', total: 100, sub: 100, disc: 0, addr: { name: 'Buyer', phone: '9876543210', line: 'Test address', pin: '641001' }, email: 'buyer@example.com', itemDetails: [{ productId: 'JN0002', name: 'Seller hair clip', unitPrice: 100, quantity: 1, sellerId: 'JSRSELLER1' }] };
        assert.equal(await _t.recordPaid(order, 'pay_seller_ok', 'order_rzp_seller_ok'), true);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerOrders').length, 1);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerLedger').length, 1);
        assert.equal(mockedSheets.SellerLedger[1][12], 'READY_FOR_REVIEW');
        assert.equal(mockedSheets.SellerLedger[1][10], 95);
        assert.equal(await _t.recordPaid(order, 'pay_seller_ok', 'order_rzp_seller_ok'), true);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerOrders').length, 1);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerLedger').length, 1);
      } finally {
        if (previousBps === undefined) delete process.env.JUNO_MARKETPLACE_COMMISSION_BPS; else process.env.JUNO_MARKETPLACE_COMMISSION_BPS = previousBps;
        mockedSheets = previousSheets;
      }
    });
    await check('does not create a duplicate paid order when payment recording is retried', async () => {
      const previousSheets = mockedSheets;
      const previousAppends = appendedRows.length;
      const previousUpdates = updatedRows.length;
      mockedSheets = {
        Orders: [
          ['Order ID', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Payment ID', '', '', '', 'Notes'],
          ['JUNO-ORDER-1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'pay_existing_1', '', '', '', '']
        ],
        Pending: [
          ['Razorpay Order ID', 'Order JSON', 'Created', 'Status'],
          ['order_rzp_1', JSON.stringify({ id: 'JUNO-ORDER-1', total: 100, itemDetails: [] }), '', 'pending']
        ],
        SellerOrders: [['Seller Order ID']],
        SellerLedger: [['Ledger ID']]
      };
      try {
        const order = { id: 'JUNO-ORDER-1', total: 100, itemDetails: [] };
        assert.equal(await _t.recordPaid(order, 'pay_existing_1', 'order_rzp_1'), true);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Orders').length, 0);
        const pendingUpdate = updatedRows.slice(previousUpdates).find(x => x.tab === 'Pending');
        assert.ok(pendingUpdate, 'expected pending payment status to be updated');
        assert.equal(pendingUpdate.row[3], 'recorded');
      } finally {
        mockedSheets = previousSheets;
      }
    });
  } finally {
    sheets.read = originalRead;
    sheets.append = originalAppend;
    sheets.update = originalUpdate;
    sheets.ensureTab = originalEnsureTab;
  }

  const failed = cases.filter(x => !x.ok);
  process.stdout.write('\n' + (cases.length - failed.length) + '/' + cases.length + ' checkout tests passed.\n');
  if (failed.length) process.exitCode = 1;
})();
