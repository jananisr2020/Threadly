#!/usr/bin/env node
'use strict';

// Offline regression tests for server-side checkout pricing and cart validation.
// Run from threadly-v2 with: npm test
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sheets = require('../netlify/lib/sheets');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const coupons = require('../netlify/lib/coupons');
const rows = [
  ['Product ID', 'Product Name', 'Category', 'Selling Price', 'Stock', 'Show on site', 'Seller ID', 'Approval Status'],
  ['JN0001', 'Basic scrunchie', 'Hair accessories', 100, 5, 'Yes', '', 'Approved'],
  ['JN0002', 'Seller hair clip', 'Hair accessories', 100, 50, 'Yes', 'JSRSELLER1', 'Approved'],
  ['JN0003', 'Hidden clip', 'Hair accessories', 100, 5, 'No', '', 'Approved'],
  ['JN0004', 'Pending clip', 'Hair accessories', 100, 5, 'Yes', 'JSRSELLER2', 'Pending'],
  ['JN0005', 'Over-budget clip', 'Hair accessories', 501, 5, 'Yes', '', 'Approved']
];
const originalRead = sheets.read;
const originalAppend = sheets.append;
const originalUpdate = sheets.update;
const originalEnsureTab = sheets.ensureTab;
let mockedSheets = {};
const appendedRows = [];
const updatedRows = [];
let failProductUpdate = false;
let failProductUpdateAfter = 0;
let productUpdateAttempts = 0;
sheets.read = async tab => {
  if (Object.prototype.hasOwnProperty.call(mockedSheets, tab)) return mockedSheets[tab];
  if (tab === 'Products') return rows;
  throw new Error('Unexpected sheet read in offline checkout test: ' + tab);
};
sheets.append = async (tab, row) => { appendedRows.push({ tab, row }); if (Array.isArray(mockedSheets[tab])) mockedSheets[tab].push(row); };
sheets.update = async (tab, rowNum, row) => {
  if (tab === 'Products') {
    const attempt = productUpdateAttempts++;
    if (failProductUpdate && attempt >= failProductUpdateAfter) throw new Error('simulated stock write failure');
  }
  updatedRows.push({ tab, rowNum, row });
  if (mockedSheets[tab] && mockedSheets[tab][rowNum - 1]) mockedSheets[tab][rowNum - 1] = row;
};
sheets.ensureTab = async () => true;

const { _t, webhook, verifyPayment, securityHealth, health, trackWebsiteActivity, placeCod, createOrder, admin, signup, login, reset, sellerProducts, sellerOrders, sellerLogin, sellerApply, sellerActivate, ticket, returnRequest, myRequests, addReview, products, visibleIds, myOrders } = require('../netlify/lib/core');
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
    await check('public catalogue hides external seller products until the sales feature flag is enabled', async () => {
      const previousFlag = process.env.MARKETPLACE_SELLER_SALES_ENABLED;
      try {
        delete process.env.MARKETPLACE_SELLER_SALES_ENABLED;
        const disabled = await products(), disabledCsv = disabled.__raw.body;
        assert.match(disabledCsv, /JN0001/);
        assert.doesNotMatch(disabledCsv, /JN0002|JN0003|JN0004|JN0005|JSRSELLER1|JSRSELLER2|Pending/);
        assert.deepEqual(await visibleIds(), ['JN0001']);
        process.env.MARKETPLACE_SELLER_SALES_ENABLED = 'true';
        const enabled = await products(), enabledCsv = enabled.__raw.body;
        assert.match(enabledCsv, /JN0002/);
        assert.doesNotMatch(enabledCsv, /JN0003|JN0004|JN0005|JSRSELLER1|JSRSELLER2|Pending/);
        assert.deepEqual(await visibleIds(), ['JN0001', 'JN0002']);
      } finally {
        if (previousFlag === undefined) delete process.env.MARKETPLACE_SELLER_SALES_ENABLED;
        else process.env.MARKETPLACE_SELLER_SALES_ENABLED = previousFlag;
      }
    });
    await check('activity audit payload uses an allowlist and excludes credentials and personal delivery data', async () => {
      const details = JSON.parse(_t.safeActivityDetails({
        action: 'login', orderId: 'JN-123', password: 'DO_NOT_LOG', token: 'DO_NOT_LOG',
        paymentId: 'pay_secret', phone: '9876543210', address: 'private address', card: '4111111111111111',
        email: 'buyer@example.com', details: 'free text should not be logged'
      }));
      assert.deepEqual(details, { action: 'login', orderId: 'JN-123' });
      assert.equal(JSON.stringify(details).includes('DO_NOT_LOG'), false);
      assert.equal(JSON.stringify(details).includes('private address'), false);
      assert.equal(JSON.stringify(details).includes('pay_secret'), false);
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
    await check('customer signup enforces password policy and prevents duplicate accounts', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      process.env.JWT_SECRET = 'offline-customer-signup-secret';
      mockedSheets = { Users: [['Name', 'Email', 'Password Hash', 'Phone', 'Created', 'Last Login', 'Login Count']] };
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.20' } };
      try {
        await assert.rejects(() => signup({ name: 'Test Buyer', email: 'buyer@example.com', password: 'weak' }, event), /Password must contain/i);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Users').length, 0);
        const result = await signup({ name: 'Test Buyer', email: 'buyer@example.com', password: 'Strong!123' }, event);
        assert.equal(result.user.email, 'buyer@example.com');
        const saved = appendedRows.slice(previousAppends).find(x => x.tab === 'Users');
        assert.ok(saved, 'expected customer account to be created');
        assert.notEqual(saved.row[2], 'Strong!123');
        await assert.rejects(() => signup({ name: 'Test Buyer', email: 'buyer@example.com', password: 'Strong!123' }, event), /already has an account/i);
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('customer login rejects invalid credentials and updates login metadata', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets;
      process.env.JWT_SECRET = 'offline-customer-login-secret';
      const hash = await bcrypt.hash('Strong!123', 10);
      mockedSheets = { Users: [
        ['Name', 'Email', 'Password Hash', 'Phone', 'Created', 'Last Login', 'Login Count'],
        ['Test Buyer', 'buyer-login@example.com', hash, '', '', '', 0]
      ] };
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.21' } };
      try {
        await assert.rejects(() => login({ email: 'buyer-login@example.com', password: 'Wrong!123' }, event), /Wrong email or password/i);
        const result = await login({ email: 'buyer-login@example.com', password: 'Strong!123' }, event);
        assert.equal(result.user.email, 'buyer-login@example.com');
        assert.ok(result.token);
        assert.equal(mockedSheets.Users[1][6], 1);
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('password reset enforces policy, expires, and cannot be reused', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets, previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-password-reset-secret';
      const oldHash = await bcrypt.hash('OldStrong!123', 10);
      mockedSheets = { Users: [
        ['Name', 'Email', 'Password Hash', 'Phone', 'Created', 'Last Login', 'Login Count'],
        ['Reset Buyer', 'reset@example.com', oldHash, '', '', '', 1]
      ] };
      const payload = { email: 'reset@example.com', purpose: 'reset', h: String(oldHash).slice(-12) };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30m' });
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 });
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.22' } };
      try {
        await assert.rejects(() => reset({ token, password: 'weak' }, event), /Password must contain/i);
        const result = await reset({ token, password: 'NewStrong!456' }, event);
        assert.equal(result.user.email, 'reset@example.com');
        assert.ok(updatedRows.slice(previousUpdates).some(x => x.tab === 'Users'));
        await assert.rejects(() => reset({ token, password: 'NewStrong!456' }, event), /already used or has expired/i);
        await assert.rejects(() => reset({ token: expiredToken, password: 'NewStrong!456' }, event), /link has expired/i);
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('reviews enforce one-per-product and record verified purchases', async () => {
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      mockedSheets = {
        Reviews: [['Review ID', 'Product ID', 'Name', 'Email', 'Rating', 'Comment', 'Date', 'Verified', 'Status']],
        Orders: [
          ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
          ['ORDER-REVIEW', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Basic scrunchie x1', 1, 100, 0, 39, 139, 'UPI', 'Paid', 'pay_review', '', 'Delivered', '', 'STOCK_SYNCED']
        ],
        Users: [
          ['Name', 'Email', 'Password Hash', 'Phone', 'Created', 'Last Login', 'Login Count'],
          ['Buyer Name', 'buyer@example.com', 'hash', '', '', '', 1]
        ]
      };
      const user = { email: 'buyer@example.com' };
      try {
        await assert.rejects(() => addReview({ pid: 'JN0001', rating: 6, comment: 'Great item' }, { headers: {} }, user), /Pick a star rating/i);
        const result = await addReview({ pid: 'JN0001', rating: 5, comment: 'Nice quality and value' }, { headers: {} }, user);
        assert.equal(result.ok, true);
        const saved = appendedRows.slice(previousAppends).find(x => x.tab === 'Reviews');
        assert.ok(saved, 'expected review to be saved');
        assert.equal(saved.row[7], 'Yes');
        assert.equal(saved.row[8], 'Approved');
        await assert.rejects(() => addReview({ pid: 'JN0001', rating: 4, comment: 'Another review' }, { headers: {} }, user), /already reviewed this product/i);
      } finally {
        mockedSheets = previousSheets;
      }
    });
    await check('cancellation and return requests enforce order-state rules', async () => {
      const previousSheets = mockedSheets, previousAppends = appendedRows.length, previousUpdates = updatedRows.length;
      const orderRow = (id, status) => [id, '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Clip x1', 1, 100, 0, 39, 139, 'UPI', 'Paid', 'pay_' + id.toLowerCase(), '', status, '', ''];
      mockedSheets = {
        Orders: [
          ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
          orderRow('ORDER-NEW', 'New'),
          orderRow('ORDER-PACKED', 'Packed'),
          orderRow('ORDER-SHIPPED', 'Shipped'),
          orderRow('ORDER-DELIVERED', 'Delivered')
        ],
        Requests: [['Request ID', 'Date', 'Order ID', 'Email', 'Type', 'Reason', 'Details', 'Status', 'Admin Notes']]
      };
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.31' } }, user = { email: 'buyer@example.com' };
      try {
        const cancelled = await returnRequest({ type: 'Cancel', orderId: 'ORDER-NEW', reason: 'Changed my mind' }, event, user);
        assert.equal(cancelled.status, 'Approved');
        assert.equal(mockedSheets.Orders[1][17], 'Cancelled');
        assert.match(cancelled.message, /review the refund/i);
        assert.doesNotMatch(cancelled.message, /refund is processed/i);
        const packed = await returnRequest({ type: 'Cancel', orderId: 'ORDER-PACKED', reason: 'Changed my mind' }, event, user);
        assert.equal(packed.status, 'Requested');
        await assert.rejects(() => returnRequest({ type: 'Cancel', orderId: 'ORDER-SHIPPED', reason: 'Changed my mind' }, event, user), /already shipped/i);
        await assert.rejects(() => returnRequest({ type: 'Cancel', orderId: 'ORDER-DELIVERED', reason: 'Changed my mind' }, event, user), /request a return/i);
        await assert.rejects(() => returnRequest({ type: 'Return', orderId: 'ORDER-PACKED', reason: 'Item issue' }, event, user), /after delivery/i);
        const returned = await returnRequest({ type: 'Return', orderId: 'ORDER-DELIVERED', reason: 'Item issue' }, event, user);
        assert.equal(returned.status, 'Requested');
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Requests').length, 3);
        assert.ok(updatedRows.slice(previousUpdates).some(x => x.tab === 'Orders' && x.row[17] === 'Cancelled'));
      } finally {
        mockedSheets = previousSheets;
      }
    });
    await check('return policy enforces delivery windows and hygiene-sensitive item rules', async () => {
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      const delivered = ageDays => new Date(Date.now() - ageDays * 86400000).toISOString();
      const order = (id, note) => [id, '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Accessory x1', 1, 100, 0, 39, 139, 'UPI', 'Paid', 'pay_' + id.toLowerCase(), '', 'Delivered', '', note];
      mockedSheets = {
        Orders: [
          ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
          order('ORDER-OLD-RETURN', 'DELIVERED_AT=' + delivered(8)),
          order('ORDER-LATE-DAMAGE', 'DELIVERED_AT=' + delivered(3)),
          order('ORDER-HAIR-CHANGE', 'DELIVERED_AT=' + delivered(1)),
          order('ORDER-BAG-RETURN', 'DELIVERED_AT=' + delivered(3))
        ],
        Pending: [
          ['Razorpay Order ID', 'Order Data', 'Created', 'Status'],
          ['rzp-old', JSON.stringify({ id: 'ORDER-OLD-RETURN', itemDetails: [{ category: 'Bags and purses' }] }), '', 'recorded'],
          ['rzp-damage', JSON.stringify({ id: 'ORDER-LATE-DAMAGE', itemDetails: [{ category: 'Bags and purses' }] }), '', 'recorded'],
          ['rzp-hair', JSON.stringify({ id: 'ORDER-HAIR-CHANGE', itemDetails: [{ category: 'Hair Accessories' }] }), '', 'recorded'],
          ['rzp-bag', JSON.stringify({ id: 'ORDER-BAG-RETURN', itemDetails: [{ category: 'Bags and purses' }] }), '', 'recorded']
        ],
        Requests: [['Request ID', 'Date', 'Order ID', 'Email', 'Type', 'Reason', 'Details', 'Status', 'Admin Notes']]
      };
      try {
        const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.91' } }, user = { email: 'buyer@example.com' };
        await assert.rejects(() => returnRequest({ type: 'Return', orderId: 'ORDER-OLD-RETURN', reason: 'Changed my mind' }, event, user), /within 7 days/i);
        await assert.rejects(() => returnRequest({ type: 'Return', orderId: 'ORDER-LATE-DAMAGE', reason: 'Damaged or defective' }, event, user), /within 48 hours/i);
        await assert.rejects(() => returnRequest({ type: 'Return', orderId: 'ORDER-HAIR-CHANGE', reason: 'Changed my mind' }, event, user), /hygiene-sensitive/i);
        const ok = await returnRequest({ type: 'Return', orderId: 'ORDER-BAG-RETURN', reason: 'Changed my mind' }, event, user);
        assert.equal(ok.status, 'Requested');
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Requests').length, 1);
      } finally {
        mockedSheets = previousSheets;
      }
    });
    await check('support tickets persist and admin replies update the ticket record', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      process.env.JWT_SECRET = 'offline-ticket-admin-secret';
      mockedSheets = { Tickets: [['Ticket ID', 'Date', 'Type', 'Name', 'Email', 'Phone', 'Order ID', 'Message', 'Status', 'Admin Reply', 'Last Updated']] };
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.30' } };
      const adminToken = jwt.sign({ admin: true }, process.env.JWT_SECRET);
      try {
        await assert.rejects(() => ticket({ name: 'Test Buyer', email: 'buyer@example.com', message: 'short' }, event), /at least 10 characters/i);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Tickets').length, 0);
        const result = await ticket({ type: 'Query', name: 'Test Buyer', email: 'buyer@example.com', phone: '9876543210', orderId: 'ORDER-1', message: 'Please help me check my order status.' }, event);
        assert.equal(result.ok, true);
        const saved = appendedRows.slice(previousAppends).find(x => x.tab === 'Tickets');
        assert.ok(saved, 'expected ticket row to be saved');
        assert.equal(saved.row[8], 'Open');
        const updated = await admin({ action: 'updateTicket', id: result.id, status: 'In progress', reply: 'We are checking the order now.' }, { headers: { authorization: 'Bearer ' + adminToken } });
        assert.equal(updated.ok, true);
        const ticketRow = mockedSheets.Tickets.find(r => r[0] === result.id);
        assert.equal(ticketRow[8], 'In progress');
        assert.equal(ticketRow[9], 'We are checking the order now.');
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('seller application validates consent and writes a clean application record', async () => {
      const previousEnv = {
        SHEET_ID: process.env.SHEET_ID,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
      };
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      process.env.SHEET_ID = 'offline-test-sheet';
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'juno-test@example.com';
      process.env.GOOGLE_PRIVATE_KEY = 'offline-test-key';
      mockedSheets = { Requests: [['Request ID', 'Date', 'Order ID', 'Email', 'Type', 'Reason', 'Details', 'Status', 'Admin Notes']] };
      const application = { ownerName: 'Test Seller', storeName: 'Cute Clips Test', email: 'seller-apply@example.com', phone: '9876543210', city: 'Coimbatore', category: 'Hair accessories', about: 'Affordable handmade hair accessories for everyday use', social: '', consent: true };
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.10' } };
      try {
        await assert.rejects(() => sellerApply({ ...application, consent: false }, event), /application consent/i);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Requests').length, 0);
        const result = await sellerApply(application, event);
        assert.equal(result.ok, true);
        const saved = appendedRows.slice(previousAppends).find(x => x.tab === 'Requests');
        assert.ok(saved, 'expected seller application to be saved');
        assert.equal(saved.row[3], 'seller-apply@example.com');
        assert.equal(saved.row[4], 'Seller application');
        assert.equal(saved.row[7], 'Requested');
        assert.equal(JSON.parse(saved.row[6]).category, 'Hair accessories');
      } finally {
        mockedSheets = previousSheets;
        for (const [key, value] of Object.entries(previousEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    });
    await check('seller login validates credentials, updates last-login and rejects expired sessions', async () => {
      const previousSecret = process.env.JWT_SECRET, previousSheets = mockedSheets, previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-seller-login-secret';
      const hash = await bcrypt.hash('Strong!123', 10);
      mockedSheets = { Sellers: [
        ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
        ['JSRLOGIN1', 'APP-LOGIN', 'Login Clips', 'login-seller@example.com', hash, 'Coimbatore', 'Hair accessories', 'Active', '', '']
      ] };
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.12' } };
      try {
        await assert.rejects(() => sellerLogin({ email: 'login-seller@example.com', password: 'Wrong!123' }, event), /incorrect or the account is not active/i);
        const result = await sellerLogin({ email: 'login-seller@example.com', password: 'Strong!123' }, event);
        assert.equal(result.seller.id, 'JSRLOGIN1');
        assert.ok(result.token);
        assert.ok(mockedSheets.Sellers[1][9], 'successful login should update Last Login');
        assert.ok(updatedRows.slice(previousUpdates).some(x => x.tab === 'Sellers'));
        const expired = jwt.sign({ seller: true, sellerId: 'JSRLOGIN1', email: 'login-seller@example.com' }, process.env.JWT_SECRET, { expiresIn: -1 });
        await assert.rejects(
          () => sellerProducts({ action: 'profile' }, { headers: { authorization: 'Bearer ' + expired } }),
          /Please sign in to your seller account/i
        );
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('customer order history is email-scoped and never returns delivery phone or address fields', async () => {
      const previousSheets = mockedSheets;
      mockedSheets = { Orders: [
        ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'PIN', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
        ['JN-OWN-1', '10/21/2026', 'Buyer One', 'buyer.one@example.com', '9876543210', 'Private address one', '641001', 'Clip (₹100) x1', 1, 100, 0, 40, 140, 'UPI', 'Paid', 'pay_own', '2-4 days', 'Shipped', 'TRACK-OWN', ''],
        ['JN-OTHER-1', '10/21/2026', 'Buyer Two', 'buyer.two@example.com', '9876543211', 'Private address two', '600001', 'Clip (₹100) x1', 1, 100, 0, 40, 140, 'UPI', 'Paid', 'pay_other', '2-4 days', 'New', '', '']
      ] };
      try {
        const result = await myOrders({}, {}, { email: 'buyer.one@example.com' });
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 'JN-OWN-1');
        assert.equal(result[0].tracking, 'TRACK-OWN');
        for (const key of ['email', 'phone', 'address', 'pin', 'paymentId']) assert.equal(Object.hasOwn(result[0], key), false, 'customer history must not expose ' + key);
        assert.equal(JSON.stringify(result).includes('Private address'), false);
        assert.equal(JSON.stringify(result).includes('9876543210'), false);
        // A fresh request must reflect the latest persisted fulfilment status and tracking.
        mockedSheets.Orders[1][17] = 'Delivered';
        mockedSheets.Orders[1][18] = 'TRACK-DELIVERED';
        const refreshed = await myOrders({}, {}, { email: 'buyer.one@example.com' });
        assert.equal(refreshed[0].status, 'Delivered');
        assert.equal(refreshed[0].tracking, 'TRACK-DELIVERED');
      } finally {
        mockedSheets = previousSheets;
      }
    });
    await check('seller activation is one-time and expired activation links are rejected', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      process.env.JWT_SECRET = 'offline-seller-activation-secret';
      mockedSheets = {
        Requests: [
          ['Request ID', 'Date', 'Order ID', 'Email', 'Type', 'Reason', 'Details', 'Status', 'Admin Notes'],
          ['APP-1', '', '', 'approved@example.com', 'Seller application', 'Store review', JSON.stringify({ storeName: 'Approved Clips', city: 'Coimbatore', category: 'Hair accessories' }), 'Approved', '']
        ],
        Sellers: [['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login']]
      };
      const payload = { purpose: 'seller-activate', email: 'approved@example.com', applicationId: 'APP-1' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 });
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.11' } };
      try {
        const result = await sellerActivate({ token, password: 'Strong!123' }, event);
        assert.equal(result.ok, true);
        assert.equal(result.seller.email, 'approved@example.com');
        const saved = appendedRows.slice(previousAppends).find(x => x.tab === 'Sellers');
        assert.ok(saved, 'expected activated seller account to be saved');
        assert.equal(saved.row[7], 'Active');
        assert.notEqual(saved.row[4], 'Strong!123', 'password must be stored as a hash');
        await assert.rejects(() => sellerActivate({ token, password: 'Strong!123' }, event), /seller account already exists/i);
        await assert.rejects(() => sellerActivate({ token: expiredToken, password: 'Strong!123' }, event), /activation link expired/i);
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('seller product API rejects prices above ₹500', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousAppends = appendedRows.length;
      mockedSheets.Sellers = [
        ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
        ['JSRSELLER1', 'APP1', 'Cute Clips', 'seller@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active', '', '']
      ];
      process.env.JWT_SECRET = 'offline-seller-regression-secret';
      try {
        const token = jwt.sign({ seller: true, sellerId: 'JSRSELLER1', email: 'seller@example.com' }, process.env.JWT_SECRET);
        await assert.rejects(
          () => sellerProducts({ action: 'save', product: { name: 'Over budget clip', cat: 'Hair accessories', price: 501, mrp: 600, stock: 3, image: 'https://example.com/clip.jpg', details: 'A simple hair clip' } }, { headers: { authorization: 'Bearer ' + token } }),
          /price and stock/i
        );
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Products').length, 0);
      } finally {
        delete mockedSheets.Sellers;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('seller product listing is isolated to the authenticated seller', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets;
      process.env.JWT_SECRET = 'offline-seller-isolation-secret';
      mockedSheets = {
        Sellers: [
          ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
          ['JSRSELLER1', 'APP1', 'Seller One', 'one@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active', '', ''],
          ['JSRSELLER2', 'APP2', 'Seller Two', 'two@example.com', 'hash', 'Coimbatore', 'Jewellery', 'Active', '', '']
        ]
      };
      const token = jwt.sign({ seller: true, sellerId: 'JSRSELLER1', email: 'one@example.com' }, process.env.JWT_SECRET);
      try {
        const result = await sellerProducts({ action: 'load' }, { headers: { authorization: 'Bearer ' + token } });
        assert.equal(result.ok, true);
        assert.ok(result.products.every(product => product.id !== 'JN0004' && product.id !== 'JN0005'));
        assert.ok(result.products.every(product => product.id === 'JN0002'));
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('seller cannot read or update another seller order', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets;
      process.env.JWT_SECRET = 'offline-seller-order-isolation-secret';
      mockedSheets = {
        Sellers: [
          ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
          ['JSRSELLER1', 'APP1', 'Seller One', 'one@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active', '', ''],
          ['JSRSELLER2', 'APP2', 'Seller Two', 'two@example.com', 'hash', 'Coimbatore', 'Jewellery', 'Active', '', '']
        ],
        SellerOrders: [
          ['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID', 'Seller Store Name', 'Customer Name', 'Customer Email', 'Customer Phone', 'Shipping Address', 'Pincode', 'Items JSON', 'Item Count', 'Seller Subtotal', 'Shipping Allocation', 'Seller Order Total', 'Payment Status', 'Fulfilment Status', 'Tracking', 'Updated', 'Payment ID'],
          ['SO-ONE', 'ORDER-1', '', 'JSRSELLER1', 'Seller One', 'Buyer One', 'buyer1@example.com', '9876543210', 'Address one', '641001', '[]', 1, 100, 0, 100, 'Paid', 'New', '', '', 'pay_one'],
          ['SO-TWO', 'ORDER-2', '', 'JSRSELLER2', 'Seller Two', 'Buyer Two', 'buyer2@example.com', '9876543211', 'Address two', '641002', '[]', 1, 150, 0, 150, 'Paid', 'New', '', '', 'pay_two']
        ]
      };
      const token = jwt.sign({ seller: true, sellerId: 'JSRSELLER1', email: 'one@example.com' }, process.env.JWT_SECRET);
      try {
        const result = await sellerOrders({ action: 'load' }, { headers: { authorization: 'Bearer ' + token } });
        assert.deepEqual(result.orders.map(order => order.id), ['SO-ONE']);
        await assert.rejects(
          () => sellerOrders({ action: 'update', id: 'SO-TWO', status: 'Accepted' }, { headers: { authorization: 'Bearer ' + token } }),
          /Seller order not found/i
        );
        assert.equal(mockedSheets.SellerOrders[2][16], 'New', 'another seller order must remain unchanged');
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('seller can edit only owned products and edits return to moderation', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-seller-product-edit-secret';
      mockedSheets = {
        Sellers: [
          ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
          ['JSRSELLER1', 'APP1', 'Seller One', 'one@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active', '', ''],
          ['JSRSELLER2', 'APP2', 'Seller Two', 'two@example.com', 'hash', 'Coimbatore', 'Jewellery', 'Active', '', '']
        ],
        Products: [
          ['Product ID', 'Product Name', 'Category', 'Gender', 'MRP', 'Selling Price', 'Details', 'Sizes', 'Image', 'Stock', 'On Sale', 'Rating', 'Show on site', 'Seller ID', 'Approval Status'],
          ['SP-ONE', 'Original clip', 'Hair accessories', 'Unisex', 100, 80, 'Original details', '', 'https://example.com/one.jpg', 3, 'No', 0, 'Yes', 'JSRSELLER1', 'Approved'],
          ['SP-TWO', 'Other seller ring', 'Jewellery', 'Unisex', 150, 120, 'Ring details', '', 'https://example.com/two.jpg', 2, 'No', 0, 'Yes', 'JSRSELLER2', 'Approved']
        ]
      };
      const token = jwt.sign({ seller: true, sellerId: 'JSRSELLER1', email: 'one@example.com' }, process.env.JWT_SECRET);
      const product = { id: 'SP-ONE', name: 'Updated clip', cat: 'Hair accessories', price: 90, mrp: 120, stock: 7, image: 'https://example.com/updated.jpg', sizes: 'Pink, black', details: 'Updated product details' };
      try {
        await assert.rejects(
          () => sellerProducts({ action: 'update', product: { ...product, id: 'SP-TWO' } }, { headers: { authorization: 'Bearer ' + token } }),
          /Product not found in your seller account/i
        );
        assert.equal(updatedRows.slice(previousUpdates).filter(x => x.tab === 'Products').length, 0, 'cross-seller edit must not write any product row');
        const result = await sellerProducts({ action: 'update', product }, { headers: { authorization: 'Bearer ' + token } });
        assert.equal(result.ok, true);
        assert.equal(result.status, 'Pending');
        const saved = updatedRows.slice(previousUpdates).find(x => x.tab === 'Products');
        assert.ok(saved, 'expected an owned product update');
        assert.equal(saved.row[0], 'SP-ONE');
        assert.equal(saved.row[1], 'Updated clip');
        assert.equal(saved.row[5], 90);
        assert.equal(saved.row[9], 7);
        assert.equal(saved.row[12], 'No', 'edited product must be hidden pending review');
        assert.equal(saved.row[13], 'JSRSELLER1', 'seller ownership must not change');
        assert.equal(saved.row[14], 'Pending', 'edited product must return to moderation');
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin moderation blocks external seller publishing until the sales flag is enabled', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousFlag = process.env.MARKETPLACE_SELLER_SALES_ENABLED;
      const previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-seller-moderation-secret';
      delete process.env.MARKETPLACE_SELLER_SALES_ENABLED;
      mockedSheets = {
        Products: [
          ['Product ID', 'Product Name', 'Category', 'Gender', 'MRP', 'Selling Price', 'Details', 'Sizes', 'Image', 'Stock', 'On Sale', 'Rating', 'Show on site', 'Seller ID', 'Approval Status'],
          ['SP-ONE', 'Seller clip', 'Hair accessories', 'Unisex', 100, 80, 'Clip details', '', 'https://example.com/one.jpg', 3, 'No', 0, 'No', 'JSRSELLER1', 'Pending'],
          ['JN0001', 'Juno scrunchie', 'Hair accessories', 'Unisex', 100, 80, 'Scrunchie details', '', 'https://example.com/juno.jpg', 3, 'No', 4.5, 'Yes', '', 'Approved']
        ]
      };
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
      try {
        await assert.rejects(
          () => admin({ action: 'setSellerProductStatus', id: 'SP-ONE', status: 'Approved' }, { headers: { authorization: 'Bearer ' + token } }),
          /Seller sales are disabled until marketplace payment settlement/i
        );
        assert.equal(updatedRows.slice(previousUpdates).filter(x => x.tab === 'Products').length, 0);
        process.env.MARKETPLACE_SELLER_SALES_ENABLED = 'true';
        const result = await admin({ action: 'setSellerProductStatus', id: 'SP-ONE', status: 'Approved' }, { headers: { authorization: 'Bearer ' + token } });
        assert.equal(result.ok, true);
        const saved = updatedRows.slice(previousUpdates).find(x => x.tab === 'Products');
        assert.ok(saved, 'expected seller product moderation update');
        assert.equal(saved.row[12], 'Yes');
        assert.equal(saved.row[14], 'Approved');
        await assert.rejects(
          () => admin({ action: 'setSellerProductStatus', id: 'JN0001', status: 'Approved' }, { headers: { authorization: 'Bearer ' + token } }),
          /not a seller-submitted product/i
        );
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
        if (previousFlag === undefined) delete process.env.MARKETPLACE_SELLER_SALES_ENABLED;
        else process.env.MARKETPLACE_SELLER_SALES_ENABLED = previousFlag;
      }
    });
    await check('seller fulfilment updates enforce valid status transitions and tracking', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-seller-transition-secret';
      mockedSheets = {
        Sellers: [
          ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
          ['JSRSELLER1', 'APP1', 'Seller One', 'one@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active', '', '']
        ],
        SellerOrders: [
          ['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID', 'Seller Store Name', 'Customer Name', 'Customer Email', 'Customer Phone', 'Shipping Address', 'Pincode', 'Items JSON', 'Item Count', 'Seller Subtotal', 'Shipping Allocation', 'Seller Order Total', 'Payment Status', 'Fulfilment Status', 'Tracking', 'Updated', 'Payment ID'],
          ['SO-ONE', 'ORDER-1', '', 'JSRSELLER1', 'Seller One', 'Buyer One', 'buyer@example.com', '9876543210', 'Address one', '641001', '[]', 1, 100, 0, 100, 'Paid', 'New', '', '', 'pay_one']
        ]
      };
      const token = jwt.sign({ seller: true, sellerId: 'JSRSELLER1', email: 'one@example.com' }, process.env.JWT_SECRET);
      const event = { headers: { authorization: 'Bearer ' + token } };
      try {
        await assert.rejects(
          () => sellerOrders({ action: 'update', id: 'SO-ONE', status: 'Delivered' }, event),
          /status change is not allowed/i
        );
        assert.equal(updatedRows.slice(previousUpdates).filter(x => x.tab === 'SellerOrders').length, 0);
        const result = await sellerOrders({ action: 'update', id: 'SO-ONE', status: 'Accepted', tracking: 'TRACK-123' }, event);
        assert.equal(result.ok, true);
        const saved = updatedRows.slice(previousUpdates).find(x => x.tab === 'SellerOrders');
        assert.ok(saved, 'expected seller order update');
        assert.equal(saved.row[16], 'Accepted');
        assert.equal(saved.row[17], 'TRACK-123');
        assert.equal(saved.row[3], 'JSRSELLER1');
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin cannot manually mark an order as COD or alter payment status', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-payment-status-secret';
      mockedSheets = {
        Orders: [
          ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
          ['ORDER-1', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Clip x1', 1, 100, 0, 39, 139, 'UPI', 'Pending', '', '', 'New', '', '']
        ]
      };
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
      try {
        await assert.rejects(
          () => admin({ action: 'updateOrder', id: 'ORDER-1', pay: 'COD - collect on delivery' }, { headers: { authorization: 'Bearer ' + token } }),
          /Payment status is controlled by verified Razorpay events/i
        );
        assert.equal(updatedRows.slice(previousUpdates).filter(x => x.tab === 'Orders').length, 0);
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin can suspend a seller and the suspended seller loses API access', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-seller-suspension-secret';
      mockedSheets = {
        Sellers: [
          ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
          ['JSRSELLER1', 'APP1', 'Seller One', 'one@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active', '', '']
        ]
      };
      const adminToken = jwt.sign({ admin: true }, process.env.JWT_SECRET);
      const sellerToken = jwt.sign({ seller: true, sellerId: 'JSRSELLER1', email: 'one@example.com' }, process.env.JWT_SECRET);
      try {
        const result = await admin({ action: 'setSellerStatus', id: 'JSRSELLER1', status: 'Suspended' }, { headers: { authorization: 'Bearer ' + adminToken } });
        assert.equal(result.status, 'Suspended');
        const saved = updatedRows.slice(previousUpdates).find(x => x.tab === 'Sellers');
        assert.ok(saved, 'expected seller account status update');
        assert.equal(saved.row[7], 'Suspended');
        await assert.rejects(
          () => sellerProducts({ action: 'profile' }, { headers: { authorization: 'Bearer ' + sellerToken } }),
          /Seller account is inactive/i
        );
        await assert.rejects(
          () => sellerOrders({ action: 'load' }, { headers: { authorization: 'Bearer ' + sellerToken } }),
          /Seller account is inactive/i
        );
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin cannot mark a return Refunded before the Razorpay refund is verified', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets, previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-return-refund-gate-secret';
      mockedSheets = {
        Requests: [
          ['Request ID', 'Date', 'Order ID', 'Email', 'Type', 'Reason', 'Details', 'Status', 'Admin Notes'],
          ['RQ-RETURN', '', 'ORDER-RETURN', 'buyer@example.com', 'Return', 'Damaged item', 'Box damaged', 'Requested', '']
        ],
        Orders: [
          ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
          ['ORDER-RETURN', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Clip x1', 1, 100, 0, 39, 139, 'UPI', 'Paid', 'pay_return', '', 'Delivered', '', 'STOCK_SYNCED']
        ]
      };
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET), event = { headers: { authorization: 'Bearer ' + token } };
      try {
        await assert.rejects(() => admin({ action: 'updateRequest', id: 'RQ-RETURN', status: 'Refunded', notes: 'Refund complete' }, event), /wait for the verified refund webhook/i);
        assert.equal(mockedSheets.Requests[1][7], 'Requested');
        assert.equal(mockedSheets.Orders[1][17], 'Delivered');
        assert.equal(updatedRows.slice(previousUpdates).filter(x => x.tab === 'Requests' || x.tab === 'Orders').length, 0);
        mockedSheets.Orders[1][14] = 'Refunded';
        const result = await admin({ action: 'updateRequest', id: 'RQ-RETURN', status: 'Refunded', notes: 'Refund confirmed' }, event);
        assert.equal(result.ok, true);
        assert.equal(mockedSheets.Requests[1][7], 'Refunded');
        assert.equal(mockedSheets.Orders[1][17], 'Returned');
        const mine = await myRequests({}, {}, { email: 'buyer@example.com' });
        assert.equal(mine[0].status, 'Refunded');
        assert.equal(mine[0].notes, 'Refund confirmed');
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('seller approval does not change status when activation email is not configured', async () => {
      const previousSecret = process.env.JWT_SECRET, previousBrevo = process.env.BREVO_API_KEY, previousFrom = process.env.MAIL_FROM;
      const previousSheets = mockedSheets, previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-seller-approval-email-secret';
      delete process.env.BREVO_API_KEY; delete process.env.MAIL_FROM;
      mockedSheets = { Requests: [
        ['Request ID', 'Date', 'Order ID', 'Email', 'Type', 'Reason', 'Details', 'Status', 'Admin Notes'],
        ['APP-NO-MAIL', '', '', 'seller@example.com', 'Seller application', 'Store', JSON.stringify({ storeName: 'Test Store' }), 'Requested', '']
      ] };
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
      try {
        await assert.rejects(
          () => admin({ action: 'updateRequest', id: 'APP-NO-MAIL', status: 'Approved', notes: 'Looks good' }, { headers: { authorization: 'Bearer ' + token } }),
          /Configure BREVO_API_KEY and MAIL_FROM/i
        );
        assert.equal(mockedSheets.Requests[1][7], 'Requested');
        assert.equal(updatedRows.slice(previousUpdates).filter(x => x.tab === 'Requests').length, 0);
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
        if (previousBrevo === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = previousBrevo;
        if (previousFrom === undefined) delete process.env.MAIL_FROM; else process.env.MAIL_FROM = previousFrom;
      }
    });
    await check('admin data and mutation actions require an admin session', async () => {
      const previousSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'offline-admin-authorization-secret';
      const sellerToken = jwt.sign({ seller: true, sellerId: 'JSRSELLER1', email: 'seller@example.com' }, process.env.JWT_SECRET);
      try {
        await assert.rejects(() => admin({ action: 'load' }, { headers: {} }), /Session expired/i);
        await assert.rejects(() => admin({ action: 'saveProduct', product: { name: 'Attempted', price: 100, mrp: 100 } }, { headers: {} }), /Session expired/i);
        await assert.rejects(() => admin({ action: 'setSellerProductStatus', id: 'SP-ONE', status: 'Approved' }, { headers: { authorization: 'Bearer ' + sellerToken } }), /Session expired/i);
        await assert.rejects(() => admin({ action: 'refund', orderId: 'ORDER-1' }, { headers: { authorization: 'Bearer ' + sellerToken } }), /Session expired/i);
      } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin order updates persist fulfilment status and tracking without editing payment state', async () => {
      const previousSecret = process.env.JWT_SECRET, previousSheets = mockedSheets;
      process.env.JWT_SECRET = 'offline-admin-order-update-secret';
      mockedSheets = { Orders: [
        ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
        ['ORDER-ADMIN', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Clip x1', 1, 100, 0, 39, 139, 'UPI', 'Paid', 'pay_admin', '', 'New', '', '']
      ] };
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
      try {
        const result = await admin({ action: 'updateOrder', id: 'ORDER-ADMIN', status: 'Packed', tracking: 'TRK-123', notes: 'Packed safely' }, { headers: { authorization: 'Bearer ' + token } });
        assert.equal(result.ok, true);
        assert.equal(mockedSheets.Orders[1][17], 'Packed');
        assert.equal(mockedSheets.Orders[1][18], 'TRK-123');
        assert.equal(mockedSheets.Orders[1][19], 'Packed safely');
        assert.equal(mockedSheets.Orders[1][14], 'Paid', 'fulfilment updates must not alter payment status');
        await admin({ action: 'updateOrder', id: 'ORDER-ADMIN', status: 'Delivered' }, { headers: { authorization: 'Bearer ' + token } });
        assert.equal(mockedSheets.Orders[1][17], 'Delivered');
        assert.match(mockedSheets.Orders[1][19], /Packed safely \| DELIVERED_AT=\d{4}-\d{2}-\d{2}T/);
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin can create products and hide/update existing seller listings without changing ownership', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousSheets = mockedSheets, previousAppends = appendedRows.length, previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-admin-product-crud-secret';
      mockedSheets = {
        Products: [
          ['Product ID', 'Product Name', 'Category', 'Gender', 'MRP', 'Selling Price', 'Details', 'Sizes', 'Image', 'Stock', 'On Sale', 'Rating', 'Show on site', 'Seller ID', 'Approval Status'],
          ['SP-ONE', 'Seller clip', 'Hair accessories', 'Unisex', 100, 80, 'Clip details', 'Pink', 'https://example.com/one.jpg', 3, 'No', 4.2, 'Yes', 'JSRSELLER1', 'Approved']
        ]
      };
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET), event = { headers: { authorization: 'Bearer ' + token } };
      try {
        const created = await admin({ action: 'saveProduct', product: { name: 'New clip', cat: 'Hair accessories', g: 'Unisex', mrp: 150, price: 120, details: 'Simple hair clip', sizes: 'Pink', image: 'https://example.com/new.jpg', stock: 5, sale: 'No', rating: 4.2, show: 'Yes' } }, event);
        assert.equal(created.ok, true);
        const added = appendedRows.slice(previousAppends).find(x => x.tab === 'Products');
        assert.ok(added, 'expected new Juno-owned product');
        assert.equal(added.row[1], 'New clip');
        assert.equal(added.row[5], 120);
        assert.equal(added.row[12], 'Yes');
        assert.equal(added.row[13], '');
        assert.equal(added.row[14], 'Approved');
        const updated = await admin({ action: 'saveProduct', product: { id: 'SP-ONE', name: 'Seller clip updated', cat: 'Hair accessories', g: 'Unisex', mrp: 160, price: 130, details: 'Updated clip details', sizes: 'Pink, black', image: 'https://example.com/updated.jpg', stock: 7, sale: 'No', rating: 4.3, show: 'No' } }, event);
        assert.equal(updated.ok, true);
        const saved = updatedRows.slice(previousUpdates).find(x => x.tab === 'Products');
        assert.ok(saved, 'expected product update');
        assert.equal(saved.row[1], 'Seller clip updated');
        assert.equal(saved.row[5], 130);
        assert.equal(saved.row[12], 'No');
        assert.equal(saved.row[13], 'JSRSELLER1', 'admin edit must preserve seller ownership');
        assert.equal(saved.row[14], 'Approved');
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin product editor accepts the ₹500 price ceiling', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousAppends = appendedRows.length;
      process.env.JWT_SECRET = 'offline-admin-regression-secret';
      try {
        const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
        const result = await admin({ action: 'saveProduct', product: { name: 'Budget accessory', price: 500, mrp: 500 } }, { headers: { authorization: 'Bearer ' + token } });
        assert.equal(result.ok, true);
        const saved = appendedRows.slice(previousAppends).find(x => x.tab === 'Products');
        assert.ok(saved, 'expected product row to be appended');
        assert.equal(saved.row[5], 500);
      } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('admin product editor rejects MRP below selling price', async () => {
      const previousSecret = process.env.JWT_SECRET;
      const previousAppends = appendedRows.length;
      process.env.JWT_SECRET = 'offline-admin-regression-secret';
      try {
        const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
        await assert.rejects(
          () => admin({ action: 'saveProduct', product: { name: 'Invalid MRP accessory', price: 200, mrp: 150 } }, { headers: { authorization: 'Bearer ' + token } }),
          /MRP must be at least the selling price/i
        );
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Products').length, 0);
      } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('coupon rules enforce minimum spend, discount caps and case-insensitive codes', async () => {
      assert.equal(coupons.discount('juno10', 100), 10);
      assert.equal(coupons.discount('WELCOME50', 298), 0);
      assert.equal(coupons.discount('WELCOME50', 299), 50);
      assert.equal(coupons.discount('JUNO15', 599), 90);
      assert.equal(coupons.discount('JUNO15', 2000), 150);
      assert.equal(coupons.discount('NOT-A-COUPON', 1000), 0);
    });
    await check('rejects an empty cart', () => rejectsWith([], /cart is empty/i));
    await check('rejects a product that does not exist', () => rejectsWith([{ id: 'UNKNOWN', n: 1 }], /no longer available/i));
    await check('Razorpay test client creates an order and verifies a captured payment end-to-end', async () => {
      const previousEnv = {
        JWT_SECRET: process.env.JWT_SECRET,
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET
      };
      const previousFetch = global.fetch, previousSheets = mockedSheets, previousAppends = appendedRows.length;
      process.env.JWT_SECRET = 'offline-razorpay-flow-secret';
      process.env.RAZORPAY_KEY_ID = 'rzp_test_juno';
      process.env.RAZORPAY_KEY_SECRET = 'razorpay-test-secret';
      mockedSheets = {
        Products: [
          ['Product ID', 'Product Name', 'Category', 'Gender', 'MRP', 'Selling Price', 'Details', 'Sizes', 'Image', 'Stock', 'On Sale', 'Rating', 'Show on site', 'Seller ID', 'Approval Status'],
          ['JN0001', 'Basic scrunchie', 'Hair accessories', 'Unisex', 130, 100, 'Soft fabric scrunchie', 'Pink', '', 5, 'No', 4.5, 'Yes', '', 'Approved']
        ],
        Orders: [['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes']],
        Pending: [['Razorpay Order ID', 'Order Data', 'Created', 'Status']],
        Sellers: [['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login']],
        SellerOrders: [['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID', 'Seller Store Name', 'Customer Name', 'Customer Email', 'Customer Phone', 'Shipping Address', 'Pincode', 'Items JSON', 'Item Count', 'Seller Subtotal', 'Shipping Allocation', 'Seller Order Total', 'Payment Status', 'Fulfilment Status', 'Tracking', 'Updated', 'Payment ID']],
        SellerLedger: [['Ledger ID', 'Seller Order ID', 'Parent Order ID', 'Payment ID', 'Seller ID', 'Store Name', 'Gross Item Subtotal', 'Allocated Discount', 'Commission BPS', 'Commission Amount', 'Net Seller Amount', 'Currency', 'Ledger Status', 'Payout Reference', 'Created', 'Updated', 'Notes']]
      };
      let createPayload, fetchedPaymentStatus = 'authorized';
      const fakeRazorpay = {
        orders: { create: async payload => { createPayload = payload; return { id: 'order_rzp_test_1', amount: payload.amount, currency: 'INR' }; } },
        payments: { fetch: async id => ({ id, order_id: 'order_rzp_test_1', status: fetchedPaymentStatus, amount: 12900, currency: 'INR' }) }
      };
      _t.setRazorpayOverride(fakeRazorpay);
      global.fetch = async () => ({ ok: true, json: async () => [{ Status: 'Success', PostOffice: [{ State: 'Tamil Nadu', District: 'Coimbatore', Name: 'Coimbatore' }] }] });
      const event = { headers: { 'x-nf-client-connection-ip': '203.0.113.40' } }, user = { email: 'buyer@example.com' };
      try {
        const created = await createOrder({ method: 'UPI', addr: { name: 'Test Buyer', phone: '9876543210', line: '123 Test Street', pin: '641001' }, items: [{ id: 'JN0001', n: 1 }], coupon: 'JUNO10', total: 1, sub: 1, disc: 999, ship: 0 }, event, user);
        assert.equal(createPayload.amount, 12900);
        assert.equal(created.amount, 12900);
        assert.equal(created.key, 'rzp_test_juno');
        const tokenPayload = jwt.verify(created.orderToken, process.env.JWT_SECRET);
        assert.equal(tokenPayload.o.total, 129);
        await assert.rejects(
          () => verifyPayment({ razorpay_order_id: created.id, razorpay_payment_id: 'pay_test_1', razorpay_signature: 'bad', orderToken: created.orderToken }, event, user),
          /could not be verified/i
        );
        const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(created.id + '|pay_test_1').digest('hex');
        await assert.rejects(
          () => verifyPayment({ razorpay_order_id: created.id, razorpay_payment_id: 'pay_test_1', razorpay_signature: signature, orderToken: created.orderToken }, event, user),
          /Payment is not captured yet/i
        );
        assert.equal(mockedSheets.Orders.length, 1, 'authorized but uncaptured payment must not create a paid order');
        assert.equal(mockedSheets.Products[1][9], 5, 'uncaptured payment must not decrement stock');
        fetchedPaymentStatus = 'captured';
        const verified = await verifyPayment({ razorpay_order_id: created.id, razorpay_payment_id: 'pay_test_1', razorpay_signature: signature, orderToken: created.orderToken }, event, user);
        assert.equal(verified.ok, true);
        assert.equal(verified.orderId, created.orderId);
        assert.equal(mockedSheets.Orders[1][14], 'Paid');
        assert.equal(mockedSheets.Orders[1][15], 'pay_test_1');
        assert.equal(mockedSheets.Products[1][9], 4);
        assert.equal(mockedSheets.Pending[1][3], 'recorded');
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Orders').length, 1);
      } finally {
        _t.setRazorpayOverride(null);
        global.fetch = previousFetch;
        mockedSheets = previousSheets;
        for (const [key, value] of Object.entries(previousEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    });
    await check('order builder validates Tamil Nadu serviceability and ignores client totals', async () => {
      const previousFetch = global.fetch;
      global.fetch = async url => ({
        ok: true,
        json: async () => [{ Status: 'Success', PostOffice: [{ State: 'Tamil Nadu', District: 'Coimbatore', Name: 'Coimbatore' }] }]
      });
      try {
        const order = await _t.buildOrder({
          addr: { name: 'Test Buyer', phone: '9876543210', line: '123 Test Street', pin: '641001' },
          method: 'UPI',
          items: [{ id: 'JN0001', n: 1 }],
          coupon: 'JUNO10',
          sub: 1,
          disc: 999,
          ship: 0,
          total: 1
        }, { email: 'buyer@example.com' });
        assert.equal(order.sub, 100);
        assert.equal(order.disc, 10);
        assert.equal(order.ship, 39);
        assert.equal(order.total, 129);
        assert.notEqual(order.total, 1);
        await assert.rejects(
          () => _t.buildOrder({ addr: { name: 'Test Buyer', phone: '9876543210', line: '123 Test Street', pin: '400001' }, method: 'UPI', items: [{ id: 'JN0001', n: 1 }], total: 1 }, { email: 'buyer@example.com' }),
          /deliver only in Tamil Nadu/i
        );
        await assert.rejects(
          () => _t.buildOrder({ addr: { name: 'Test Buyer', phone: '123', line: '123 Test Street', pin: '641001' }, method: 'UPI', items: [{ id: 'JN0001', n: 1 }] }, { email: 'buyer@example.com' }),
          /check your delivery details/i
        );
        await assert.rejects(
          () => _t.buildOrder({ addr: { name: 'Test Buyer', phone: '9876543210', line: 'short', pin: '641001' }, method: 'UPI', items: [{ id: 'JN0001', n: 1 }] }, { email: 'buyer@example.com' }),
          /check your delivery details/i
        );
        await assert.rejects(
          () => _t.buildOrder({ addr: { name: 'Test Buyer', phone: '9876543210', line: '123 Test Street', pin: '641001' }, method: 'COD', items: [{ id: 'JN0001', n: 1 }] }, { email: 'buyer@example.com' }),
          /choose a payment method/i
        );
      } finally {
        global.fetch = previousFetch;
      }
    });
    await check('checkout rejects products priced above ₹500 instead of silently repricing them', () => rejectsWith([{ id: 'JN0005', n: 1 }], /no longer available/i));
    await check('rejects zero quantity', () => rejectsWith([{ id: 'JN0001', n: 0 }], /no longer available/i));
    await check('rejects more than 20 units on one cart line', () => rejectsWith([{ id: 'JN0001', n: 21 }], /no longer available/i));
    await check('rejects duplicate lines whose combined quantity exceeds 20', () => rejectsWith([{ id: 'JN0001', n: 11 }, { id: 'JN0001', n: 10 }], /up to 20 units/i));
    await check('rejects quantity above available stock', () => rejectsWith([{ id: 'JN0001', n: 6 }], /only 5 left/i));
    await check('does not allow hidden products at checkout', () => rejectsWith([{ id: 'JN0003', n: 1 }], /no longer available/i));
    await check('does not allow unapproved seller products at checkout', () => rejectsWith([{ id: 'JN0004', n: 1 }], /no longer available/i));
    await check('prices a valid order, shipping and coupon on the server', async () => {
      const result = await _t.price([{ id: 'JN0001', n: 2, s: 'pink' }], 'JUNO10');
      assert.equal(result.sub, 200);
      assert.equal(result.disc, 20);
      assert.equal(result.ship, 39);
      assert.equal(result.total, 219);
      assert.equal(result.itemDetails[0].unitPrice, 100);
      assert.equal(result.count, 2);
      assert.deepEqual(result.qty, [['JN0001', 2]]);
    });
    await check('preserves seller ownership in the priced order details when seller sales are enabled', async () => {
      const previousFlag = process.env.MARKETPLACE_SELLER_SALES_ENABLED;
      process.env.MARKETPLACE_SELLER_SALES_ENABLED = 'true';
      try {
        const result = await _t.price([{ id: 'JN0002', n: 1 }], '');
        assert.equal(result.itemDetails[0].sellerId, 'JSRSELLER1');
        assert.equal(result.itemDetails[0].unitPrice, 100);
      } finally {
        if (previousFlag === undefined) delete process.env.MARKETPLACE_SELLER_SALES_ENABLED;
        else process.env.MARKETPLACE_SELLER_SALES_ENABLED = previousFlag;
      }
    });
    await check('signed payment-captured webhook records paid orders and is replay-safe', async () => {
      const previousEnv = {
        JWT_SECRET: process.env.JWT_SECRET,
        RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
        RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
        WEBHOOK_DELAY_MS: process.env.WEBHOOK_DELAY_MS
      };
      const previousSheets = mockedSheets, previousFetch = global.fetch;
      process.env.JWT_SECRET = 'offline-captured-webhook-jwt';
      process.env.RAZORPAY_KEY_ID = 'rzp_test_juno';
      process.env.RAZORPAY_KEY_SECRET = 'razorpay-test-secret';
      process.env.RAZORPAY_WEBHOOK_SECRET = 'offline-captured-webhook-secret';
      process.env.WEBHOOK_DELAY_MS = '0';
      mockedSheets = {
        Products: [
          ['Product ID', 'Product Name', 'Category', 'Gender', 'MRP', 'Selling Price', 'Details', 'Sizes', 'Image', 'Stock', 'On Sale', 'Rating', 'Show on site', 'Seller ID', 'Approval Status'],
          ['JN0001', 'Basic scrunchie', 'Hair accessories', 'Unisex', 130, 100, 'Soft fabric scrunchie', 'Pink', '', 5, 'No', 4.5, 'Yes', '', 'Approved']
        ],
        Orders: [['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes']],
        Pending: [
          ['Razorpay Order ID', 'Order Data', 'Created', 'Status'],
          ['order_rzp_hook', JSON.stringify({ id: 'JN-HOOK-1', email: 'buyer@example.com', addr: { name: 'Buyer', phone: '9876543210', line: '123 Test Street', pin: '641001' }, method: 'UPI', eta: '2-4 days', lines: 'Basic scrunchie x1', count: 1, sub: 100, disc: 10, ship: 39, total: 129, qty: [['JN0001', 1]], itemDetails: [{ productId: 'JN0001', name: 'Basic scrunchie', unitPrice: 100, quantity: 1, sellerId: '' }] }), '', 'pending'],
          ['order_rzp_fail', JSON.stringify({ id: 'JN-HOOK-FAIL', email: 'failed@example.com', addr: { name: 'Buyer', phone: '9876543210', line: '123 Test Street', pin: '641001' }, method: 'UPI', eta: '2-4 days', lines: 'Basic scrunchie x1', count: 1, sub: 100, disc: 0, ship: 39, total: 139, qty: [['JN0001', 1]], itemDetails: [{ productId: 'JN0001', name: 'Basic scrunchie', unitPrice: 100, quantity: 1, sellerId: '' }] }), '', 'pending']
        ],
        Sellers: [['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login']],
        SellerOrders: [['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID', 'Seller Store Name', 'Customer Name', 'Customer Email', 'Customer Phone', 'Shipping Address', 'Pincode', 'Items JSON', 'Item Count', 'Seller Subtotal', 'Shipping Allocation', 'Seller Order Total', 'Payment Status', 'Fulfilment Status', 'Tracking', 'Updated', 'Payment ID']],
        SellerLedger: [['Ledger ID', 'Seller Order ID', 'Parent Order ID', 'Payment ID', 'Seller ID', 'Store Name', 'Gross Item Subtotal', 'Allocated Discount', 'Commission BPS', 'Commission Amount', 'Net Seller Amount', 'Currency', 'Ledger Status', 'Payout Reference', 'Created', 'Updated', 'Notes']]
      };
      _t.setRazorpayOverride({ payments: { fetch: async id => ({ id, order_id: 'order_rzp_hook', status: 'captured', amount: 12900, currency: 'INR' }) } });
      const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_hook_1', order_id: 'order_rzp_hook' } } } });
      const signature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
      const event = { body, headers: { 'x-razorpay-signature': signature } };
      try {
        const result = await webhook({}, event);
        assert.equal(result.ok, true);
        assert.equal(mockedSheets.Orders[1][14], 'Paid');
        assert.equal(mockedSheets.Orders[1][15], 'pay_hook_1');
        assert.equal(mockedSheets.Products[1][9], 4);
        assert.equal(mockedSheets.Pending[1][3], 'recorded');
        await webhook({}, event);
        assert.equal(mockedSheets.Orders.length, 2, 'replayed captured webhook must not create a duplicate order');
        assert.equal(mockedSheets.Products[1][9], 4, 'replayed captured webhook must not decrement stock twice');
        const failedBody = JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_failed_1', order_id: 'order_rzp_fail', error_description: 'declined by issuer' } } } });
        const failedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(failedBody).digest('hex');
        await webhook({}, { body: failedBody, headers: { 'x-razorpay-signature': failedSignature } });
        assert.equal(mockedSheets.Pending[2][3], 'payment_failed', 'failed payment attempt should be marked for recovery/cleanup');
        assert.equal(mockedSheets.Orders.length, 2, 'failed payment webhook must not create an order');
        assert.equal(mockedSheets.Products[1][9], 4, 'failed payment webhook must not alter stock');
        const lateFailureBody = JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_failed_late', order_id: 'order_rzp_hook', error_description: 'another attempt declined' } } } });
        const lateFailureSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(lateFailureBody).digest('hex');
        await webhook({}, { body: lateFailureBody, headers: { 'x-razorpay-signature': lateFailureSignature } });
        assert.equal(mockedSheets.Pending[1][3], 'recorded', 'a late failed attempt must not downgrade an already-paid order');
      } finally {
        _t.setRazorpayOverride(null);
        global.fetch = previousFetch;
        mockedSheets = previousSheets;
        for (const [key, value] of Object.entries(previousEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    });
    await check('admin refund initiation uses Razorpay, prevents duplicate retries and preserves failed attempts', async () => {
      const previousSecret = process.env.JWT_SECRET, previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      process.env.JWT_SECRET = 'offline-admin-refund-secret';
      mockedSheets = { Orders: [
        ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
        ['ORDER-REFUND-OK', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Clip x1', 1, 100, 0, 39, 139, 'UPI', 'Paid', 'pay_refund_ok', '', 'New', '', ''],
        ['ORDER-REFUND-FAIL', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Clip x1', 1, 100, 0, 0, 100, 'UPI', 'Paid', 'pay_refund_fail', '', 'New', '', '']
      ] };
      const calls = [];
      _t.setRazorpayOverride({ payments: { refund: async (pid, payload) => { calls.push({ pid, payload }); if (pid === 'pay_refund_fail') throw new Error('simulated gateway outage'); return { id: 'rfnd_test_1' }; } } });
      const token = jwt.sign({ admin: true }, process.env.JWT_SECRET), event = { headers: { authorization: 'Bearer ' + token } };
      try {
        const result = await admin({ action: 'refund', orderId: 'ORDER-REFUND-OK' }, event);
        assert.equal(result.ok, true);
        assert.equal(calls[0].pid, 'pay_refund_ok');
        assert.equal(calls[0].payload.amount, 13900);
        assert.equal(calls[0].payload.notes.orderId, 'ORDER-REFUND-OK');
        assert.equal(mockedSheets.Orders[1][14], 'Refund initiated');
        await assert.rejects(() => admin({ action: 'refund', orderId: 'ORDER-REFUND-OK' }, event), /Only orders marked Paid/i);
        await assert.rejects(() => admin({ action: 'refund', orderId: 'ORDER-REFUND-FAIL' }, event), /could not start the refund/i);
        assert.equal(mockedSheets.Orders[2][14], 'Paid', 'failed gateway request must not mark order refunded');
        assert.equal(updatedRows.slice(previousUpdates).filter(x => x.tab === 'Orders').length, 1);
      } finally {
        _t.setRazorpayOverride(null);
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
      }
    });
    await check('signed refund webhook updates order status and flags seller ledger review', async () => {
      const previousSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const previousSheets = mockedSheets;
      const previousUpdates = updatedRows.length;
      const secret = 'offline-refund-webhook-secret';
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;
      mockedSheets = {
        Orders: [
          ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
          ['ORDER-REFUND', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Clip x1', 1, 100, 0, 39, 139, 'UPI', 'Refund initiated', 'pay_refund_1', '', 'New', '', '']
        ],
        SellerLedger: [
          ['Ledger ID', 'Seller Order ID', 'Parent Order ID', 'Payment ID', 'Seller ID', 'Store Name', 'Gross Item Subtotal', 'Allocated Discount', 'Commission BPS', 'Commission Amount', 'Net Seller Amount', 'Currency', 'Ledger Status', 'Payout Reference', 'Created', 'Updated', 'Notes'],
          ['LEDGER-1', 'SO-1', 'ORDER-REFUND', 'pay_refund_1', 'JSRSELLER1', 'Seller One', 100, 0, 0, 0, 100, 'INR', 'READY_FOR_REVIEW', '', '', '', '']
        ]
      };
      const body = JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: { payment_id: 'pay_refund_1' } } } });
      const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
      try {
        const result = await webhook({}, { body, headers: { 'x-razorpay-signature': signature } });
        assert.equal(result.ok, true);
        assert.equal(mockedSheets.Orders[1][14], 'Refunded');
        assert.equal(mockedSheets.SellerLedger[1][12], 'REFUND_REVIEW');
        assert.match(mockedSheets.SellerLedger[1][16], /reconcile refund allocation/i);
        const beforeRetry = appendedRows.length;
        await webhook({}, { body, headers: { 'x-razorpay-signature': signature } });
        assert.equal(mockedSheets.Orders[1][14], 'Refunded');
        assert.equal(appendedRows.length, beforeRetry, 'replayed refund webhook must not append duplicate records');
      } finally {
        mockedSheets = previousSheets;
        if (previousSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
        else process.env.RAZORPAY_WEBHOOK_SECRET = previousSecret;
      }
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
    await check('mixed-seller ledger allocates order discounts and commission deterministically without payouts', async () => {
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      const previousBps = process.env.JUNO_MARKETPLACE_COMMISSION_BPS;
      mockedSheets = {
        Orders: [
          ['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes'],
          ['JUNO-MIXED-LEDGER', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Mixed seller items', 2, 300, 30, 39, 309, 'UPI', 'Paid', 'pay_mixed_ledger', '', 'New', '', 'STOCK_SYNCED']
        ],
        Pending: [['Razorpay Order ID', 'Order JSON', 'Created', 'Status'], ['order_rzp_mixed_ledger', '{}', '', 'pending']],
        Sellers: [
          ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status'],
          ['JSRSELLER1', 'APP1', 'Seller One', 'one@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active'],
          ['JSRSELLER2', 'APP2', 'Seller Two', 'two@example.com', 'hash', 'Coimbatore', 'Jewellery', 'Active']
        ],
        SellerOrders: [['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID', 'Seller Store Name', 'Customer Name', 'Customer Email', 'Customer Phone', 'Shipping Address', 'Pincode', 'Items JSON', 'Item Count', 'Seller Subtotal', 'Shipping Allocation', 'Seller Order Total', 'Payment Status', 'Fulfilment Status', 'Tracking', 'Updated', 'Payment ID']],
        SellerLedger: [['Ledger ID', 'Seller Order ID', 'Parent Order ID', 'Payment ID', 'Seller ID', 'Store Name', 'Gross Item Subtotal', 'Allocated Discount', 'Commission BPS', 'Commission Amount', 'Net Seller Amount', 'Currency', 'Ledger Status', 'Payout Reference', 'Created', 'Updated', 'Notes']]
      };
      process.env.JUNO_MARKETPLACE_COMMISSION_BPS = '500';
      const order = {
        id: 'JUNO-MIXED-LEDGER', total: 309, sub: 300, disc: 30,
        addr: { name: 'Buyer', phone: '9876543210', line: 'Test address', pin: '641001' },
        email: 'buyer@example.com',
        itemDetails: [
          { productId: 'SP-1', name: 'Seller One clip', unitPrice: 100, quantity: 1, sellerId: 'JSRSELLER1' },
          { productId: 'SP-2', name: 'Seller Two jewellery', unitPrice: 200, quantity: 1, sellerId: 'JSRSELLER2' }
        ]
      };
      try {
        assert.equal(await _t.recordPaid(order, 'pay_mixed_ledger', 'order_rzp_mixed_ledger'), true);
        const entries = appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerLedger').map(x => x.row);
        assert.equal(entries.length, 2);
        assert.deepEqual(entries.map(row => Number(row[7])), [10, 20], 'order discount should be allocated proportionally');
        assert.deepEqual(entries.map(row => Number(row[9])), [5, 9], '5% commission should be rounded per seller');
        assert.deepEqual(entries.map(row => Number(row[10])), [85, 171], 'net seller amounts should match allocated discount less commission');
        assert.ok(entries.every(row => row[12] === 'READY_FOR_REVIEW'), 'ledger entries are review-only');
        assert.ok(entries.every(row => !String(row[13] || '').trim()), 'no payout reference may be created');
        assert.equal(await _t.recordPaid(order, 'pay_mixed_ledger', 'order_rzp_mixed_ledger'), true);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerLedger').length, 2, 'replay must not duplicate ledger rows');
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerOrders').length, 2);
      } finally {
        mockedSheets = previousSheets;
        if (previousBps === undefined) delete process.env.JUNO_MARKETPLACE_COMMISSION_BPS;
        else process.env.JUNO_MARKETPLACE_COMMISSION_BPS = previousBps;
      }
    });

    await check('paid orders are retained and flagged when inventory writes partially fail', async () => {
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      mockedSheets = {
        Products: [
          ['Product ID', 'Product Name', 'Category', 'Gender', 'MRP', 'Selling Price', 'Details', 'Sizes', 'Image', 'Stock', 'On Sale', 'Rating', 'Show on site', 'Seller ID', 'Approval Status'],
          ['JN0001', 'Basic scrunchie', 'Hair accessories', 'Unisex', 130, 100, 'Soft fabric scrunchie', 'Pink', '', 5, 'No', 4.5, 'Yes', '', 'Approved'],
          ['JN0006', 'Basic hair clip', 'Hair accessories', 'Unisex', 130, 100, 'Metal hair clip', 'Pink', '', 5, 'No', 4.5, 'Yes', '', 'Approved']
        ],
        Orders: [['Order ID', 'Date', 'Name', 'Email', 'Phone', 'Address', 'Pincode', 'Items', 'Count', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Method', 'Payment Status', 'Payment ID', 'ETA', 'Status', 'Tracking', 'Notes']],
        Sellers: [['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login']],
        SellerOrders: [['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID', 'Seller Store Name', 'Customer Name', 'Customer Email', 'Customer Phone', 'Shipping Address', 'Pincode', 'Items JSON', 'Item Count', 'Seller Subtotal', 'Shipping Allocation', 'Seller Order Total', 'Payment Status', 'Fulfilment Status', 'Tracking', 'Updated', 'Payment ID']],
        SellerLedger: [['Ledger ID', 'Seller Order ID', 'Parent Order ID', 'Payment ID', 'Seller ID', 'Store Name', 'Gross Item Subtotal', 'Allocated Discount', 'Commission BPS', 'Commission Amount', 'Net Seller Amount', 'Currency', 'Ledger Status', 'Payout Reference', 'Created', 'Updated', 'Notes']]
      };
      failProductUpdate = true;
      failProductUpdateAfter = 1;
      productUpdateAttempts = 0;
      const order = { id: 'JN-PARTIAL-1', email: 'buyer@example.com', addr: { name: 'Buyer', phone: '9876543210', line: '123 Test Street', pin: '641001' }, method: 'UPI', eta: '2-4 days', lines: 'Basic scrunchie x1', count: 1, sub: 100, disc: 0, ship: 39, total: 139, qty: [['JN0001', 1], ['JN0006', 1]], itemDetails: [{ productId: 'JN0001', name: 'Basic scrunchie', unitPrice: 100, quantity: 1, sellerId: '' }, { productId: 'JN0006', name: 'Basic hair clip', unitPrice: 100, quantity: 1, sellerId: '' }] };
      try {
        await assert.rejects(() => _t.recordPaid(order, 'pay_partial_1', 'order_rzp_partial'), /Payment was recorded, but Juno could not finish updating stock/i);
        assert.equal(mockedSheets.Orders.length, 2, 'paid order must be preserved even when stock update fails');
        assert.match(mockedSheets.Orders[1][19], /STOCK_RECONCILIATION_REQUIRED: simulated stock write failure/i);
        assert.equal(mockedSheets.Products[1][9], 4, 'first stock write should demonstrate a partial update before the second write fails');
        assert.equal(mockedSheets.Products[2][9], 5, 'second product should remain unchanged after its write fails');
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'Orders').length, 1);
      } finally {
        failProductUpdate = false;
        failProductUpdateAfter = 0;
        productUpdateAttempts = 0;
        mockedSheets = previousSheets;
      }
    });
    await check('splits a mixed-seller paid order into seller-specific fulfilment records idempotently', async () => {
      const previousSheets = mockedSheets, previousAppends = appendedRows.length;
      const previousBps = process.env.JUNO_MARKETPLACE_COMMISSION_BPS;
      delete process.env.JUNO_MARKETPLACE_COMMISSION_BPS;
      mockedSheets = {
        Orders: [
          ['Order ID', '', '', '', '', '', '', '', '', 'Subtotal', 'Discount', 'Shipping', 'Total', '', 'Payment Status', 'Payment ID', '', 'Status', '', 'Notes'],
          ['MIXED-ORDER', '', 'Buyer', 'buyer@example.com', '9876543210', 'Test address', '641001', 'Juno item x1; seller items x2', 3, 350, 35, 39, 354, 'UPI', 'Paid', 'pay_mixed', '', 'New', '', 'STOCK_SYNCED']
        ],
        Pending: [
          ['Razorpay Order ID', 'Order Data', 'Created', 'Status'],
          ['order_rzp_mixed', '{}', '', 'pending']
        ],
        Sellers: [
          ['Seller ID', 'Application ID', 'Store Name', 'Email', 'Password Hash', 'City', 'Category', 'Status', 'Created', 'Last Login'],
          ['JSRSELLER1', 'APP1', 'Seller One', 'one@example.com', 'hash', 'Coimbatore', 'Hair accessories', 'Active', '', ''],
          ['JSRSELLER2', 'APP2', 'Seller Two', 'two@example.com', 'hash', 'Coimbatore', 'Jewellery', 'Active', '', '']
        ],
        SellerOrders: [['Seller Order ID', 'Parent Order ID', 'Date', 'Seller ID', 'Seller Store Name', 'Customer Name', 'Customer Email', 'Customer Phone', 'Shipping Address', 'Pincode', 'Items JSON', 'Item Count', 'Seller Subtotal', 'Shipping Allocation', 'Seller Order Total', 'Payment Status', 'Fulfilment Status', 'Tracking', 'Updated', 'Payment ID']],
        SellerLedger: [['Ledger ID', 'Seller Order ID', 'Parent Order ID', 'Payment ID', 'Seller ID', 'Store Name', 'Gross Item Subtotal', 'Allocated Discount', 'Commission BPS', 'Commission Amount', 'Net Seller Amount', 'Currency', 'Ledger Status', 'Payout Reference', 'Created', 'Updated', 'Notes']]
      };
      const order = { id: 'MIXED-ORDER', total: 354, sub: 350, disc: 35, ship: 39, addr: { name: 'Buyer', phone: '9876543210', line: 'Test address', pin: '641001' }, email: 'buyer@example.com', itemDetails: [
        { productId: 'JN0001', name: 'Juno scrunchie', unitPrice: 50, quantity: 1, sellerId: '' },
        { productId: 'SP-ONE', name: 'Seller One clip', unitPrice: 100, quantity: 1, sellerId: 'JSRSELLER1' },
        { productId: 'SP-TWO', name: 'Seller Two ring', unitPrice: 200, quantity: 1, sellerId: 'JSRSELLER2' }
      ] };
      try {
        assert.equal(await _t.recordPaid(order, 'pay_mixed', 'order_rzp_mixed'), true);
        const createdOrders = appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerOrders');
        const createdLedger = appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerLedger');
        assert.equal(createdOrders.length, 2);
        assert.deepEqual(createdOrders.map(x => x.row[3]).sort(), ['JSRSELLER1', 'JSRSELLER2']);
        assert.equal(createdLedger.length, 2);
        assert.equal(await _t.recordPaid(order, 'pay_mixed', 'order_rzp_mixed'), true);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerOrders').length, 2);
        assert.equal(appendedRows.slice(previousAppends).filter(x => x.tab === 'SellerLedger').length, 2);
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
