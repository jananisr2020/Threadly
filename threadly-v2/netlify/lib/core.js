const sheets = require('./sheets'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), crypto = require('crypto');
const Razorpay = require('razorpay');
class E extends Error { constructor(m, code = 400) { super(m); this.code = code } }
const json = (code, obj, extra = {}) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }, body: JSON.stringify(obj) });
const parse = e => { try { return JSON.parse(e.body || '{}') } catch (x) { return {} } };
const clean = t => String(t == null ? '' : t).replace(/[<>]/g, '').trim().slice(0, 300);
const hits = new Map();
const ip = e => String((e.headers || {})['x-nf-client-connection-ip'] || (e.headers || {})['x-forwarded-for'] || '?').split(',')[0].trim();
const limit = (key, max, ms) => { const t = Date.now(), a = (hits.get(key) || []).filter(x => t - x < ms); if (a.length >= max) { hits.set(key, a); throw new E('Too many attempts. Please wait a few minutes and try again.', 429) } a.push(t); hits.set(key, a); if (hits.size > 5000) hits.clear() };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const secret = () => { if (!process.env.JWT_SECRET) throw new E('Server is not set up yet (JWT_SECRET missing).', 500); return process.env.JWT_SECRET };
const sign = (p, exp) => jwt.sign(p, secret(), { expiresIn: exp });
const bearer = e => { try { return jwt.verify(String((e.headers || {}).authorization || (e.headers || {}).Authorization || '').replace('Bearer ', ''), secret()) } catch (x) { return null } };
const wrap = (method, fn, auth) => async e => {
  if (e.httpMethod !== method) return json(405, { error: method + ' only' });
  try {
    let u = null;
    if (auth === 'user') { u = bearer(e); if (!u || !u.email || u.admin || u.purpose || u.o) throw new E('Please log in again.', 401) }
    const r = await fn(parse(e), e, u);
    return r && r.__raw ? r.__raw : json(200, r);
  } catch (x) { if (x.code) return json(x.code, { error: x.message }); console.error(x); return json(500, { error: 'Something went wrong. Please try again.' }) }
};
/* ---------- products ---------- */
const nk = h => String(h).trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '');
let pc = { t: 0, rows: [] };
const productRows = async force => { if (!force && Date.now() - pc.t < 30000 && pc.rows.length) return pc.rows; const rows = await sheets.read('Products'); pc = { t: Date.now(), rows }; return rows };
const invalidate = () => { pc = { t: 0, rows: [] } };
const csv = rows => rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');
const products = async () => ({ __raw: { statusCode: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'public, max-age=30' }, body: csv(await productRows()) } });
const productObjs = rows => { const k = (rows[0] || []).map(nk); return rows.slice(1).map((r, i) => { const o = { row: i + 2 }; k.forEach((n, j) => o[n] = r[j] == null ? '' : r[j]); return o }) };
const num = v => +String(v || '').replace(/[^\d.]/g, '') || 0;
async function catalogue() { const m = {}; productObjs(await productRows()).forEach(p => { if (p['product id'] && num(p['selling price']) && String(p['show on site']).toLowerCase() !== 'no') m[p['product id']] = { name: p['product name'], price: num(p['selling price']), stock: p.stock === '' ? 999 : num(p.stock), row: p.row } }); return m }
async function price(items, coupon) {
  if (!Array.isArray(items) || !items.length) throw new E('Your cart is empty.');
  const cat = await catalogue(); let sub = 0, count = 0; const lines = [], qty = [];
  for (const it of items) { const p = cat[it.id], n = Math.floor(+it.n); if (!p || !(n >= 1 && n <= 20)) throw new E('A product in your cart is no longer available.'); if (p.stock < n) throw new E(p.name + ' has only ' + p.stock + ' left.'); sub += p.price * n; count += n; lines.push(p.name + ' (' + clean(it.s) + ') x' + n); qty.push([it.id, n]) }
  const disc = ['JUNO10', 'THREAD10'].includes(String(coupon || '').toUpperCase()) ? Math.round(sub * .1) : 0, ship = sub - disc < 299 ? 39 : 0;
  return { sub, disc, ship, total: sub - disc + ship, count, lines: lines.join('; '), qty };
}
/* ---------- users ---------- */
const findUser = async email => { const rows = await sheets.read('Users'); for (let i = 1; i < rows.length; i++) if (String(rows[i][1] || '').toLowerCase() === email) return { row: i + 1, v: rows[i] }; return null };
const cred = b => { const email = clean(b.email).toLowerCase(), pw = String(b.password || ''); return { email, pw, name: clean(b.name) } };
const signup = async (b, e) => {
  limit('su:' + ip(e), 10, 36e5);
  const { email, pw, name } = cred(b); if (!/^\S+@\S+\.\S+$/.test(email) || pw.length < 6) throw new E('Enter a valid email and a 6+ character password.');
  if (await findUser(email)) throw new E('This email already has an account. Log in instead.');
  const nm = name || email.split('@')[0]; await sheets.append('Users', [nm, email, await bcrypt.hash(pw, 10), '', now(), now(), 1]);
  const u = { name: nm, email }; return { user: u, token: sign(u, '30d') };
};
const login = async (b, e) => {
  const { email, pw } = cred(b); limit('li:' + ip(e) + email, 8, 9e5); const f = await findUser(email);
  if (!f || !(await bcrypt.compare(pw, String(f.v[2] || '')))) throw new E('Wrong email or password.');
  const v = [f.v[0] || '', f.v[1], f.v[2], f.v[3] || '', f.v[4] || '', now(), (+f.v[6] || 0) + 1]; try { await sheets.update('Users', f.row, v) } catch (x) { console.error(x) }
  const u = { name: v[0], email }; return { user: u, token: sign(u, '30d') };
};
/* ---------- orders ---------- */
const OIDX = { id: 0, date: 1, name: 2, email: 3, phone: 4, addr: 5, pin: 6, items: 7, count: 8, sub: 9, disc: 10, ship: 11, total: 12, method: 13, pay: 14, payid: 15, eta: 16, status: 17, track: 18, notes: 19 };
const METHODS = ['UPI', 'Card / Netbanking', 'COD'];
async function buildOrder(b, u) {
  const a = b.addr || {}; if (clean(a.name).length < 2 || !/^[6-9]\d{9}$/.test(a.phone || '') || clean(a.line).length < 8 || !/^\d{6}$/.test(a.pin || '')) throw new E('Please check your delivery details.');
  if (!(await tnPin(a.pin))) throw new E('We currently deliver only in Tamil Nadu. We are expanding to other states soon.');
  if (!METHODS.includes(b.method)) throw new E('Choose a payment method.');
  const t = await price(b.items, b.coupon);
  return { id: 'TL' + Date.now().toString().slice(-8), email: u.email, addr: { name: clean(a.name), phone: a.phone, line: clean(a.line), pin: a.pin }, method: b.method, eta: clean(b.eta), ...t };
}
async function record(o, payStatus, payId) {
  await sheets.append('Orders', [o.id, now(), o.addr.name, o.email, o.addr.phone, o.addr.line, o.addr.pin, o.lines, o.count, o.sub, o.disc, o.ship, o.total, o.method, payStatus, payId || '', o.eta, 'New', '', '']);
  try { const rows = await productRows(true), ps = productObjs(rows), si = (rows[0] || []).map(nk).indexOf('stock');
    for (const [id, n] of o.qty) { const p = ps.find(x => x['product id'] === id); if (p && p.stock !== '' && si >= 0) { const row = rows[p.row - 1].slice(); while (row.length < 13) row.push(''); row[si] = Math.max(0, num(p.stock) - n); await sheets.update('Products', p.row, row) } }
    invalidate() } catch (x) { console.error('stock update failed', x) }
}
const placeCod = async (b, e, u) => { limit('ord:' + u.email, 20, 36e5); const o = await buildOrder({ ...b, method: 'COD' }, u); await record(o, 'COD - collect on delivery'); return { orderId: o.id } };
const rz = () => { if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new E('Payments are not set up yet.', 500); return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) };
const createOrder = async (b, e, u) => {
  if (b.method === 'COD') throw new E('Use cash on delivery checkout.');
  limit('ord:' + u.email, 20, 36e5);
  const o = await buildOrder(b, u), r = await rz().orders.create({ amount: o.total * 100, currency: 'INR', receipt: o.id, notes: { orderId: o.id, email: o.email } });
  try { await sheets.append('Pending', [r.id, JSON.stringify(o), now(), 'pending']) } catch (x) { console.error('pending save failed'); throw new E('Order tracking is not ready. Please contact support before paying.', 503) }
  return { id: r.id, amount: r.amount, key: process.env.RAZORPAY_KEY_ID, orderId: o.id, orderToken: sign({ o, rzp: r.id }, '2h') };
};
async function markPending(id, status) { try { const rows = await sheets.read('Pending'), i = rows.findIndex((r, k) => k > 0 && r[0] === id); if (i > 0) { const r = rows[i].slice(); while (r.length < 4) r.push(''); r[3] = status; await sheets.update('Pending', i + 1, r) } } catch (x) { console.error('pending mark failed', x) } }
async function recordPaid(o, payId, rzpId) { const rows = await sheets.read('Orders'); if (rows.some(r => r[15] === payId)) { await markPending(rzpId, 'recorded'); return false } await record(o, 'Paid', payId); await markPending(rzpId, 'recorded'); return true }
const verifyPayment = async (b, e, u) => {
  const { razorpay_order_id: oi, razorpay_payment_id: pi, razorpay_signature: sg, orderToken } = b;
  if (!oi || !pi || !sg || !orderToken) throw new E('Missing payment details.');
  const good = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(oi + '|' + pi).digest('hex');
  if (good.length !== String(sg).length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(String(sg)))) throw new E('Payment could not be verified.');
  let t; try { t = jwt.verify(orderToken, secret()) } catch (x) { throw new E('Order session expired. Contact support with your payment ID ' + pi + '.') }
  if (t.rzp !== oi || t.o.email !== u.email) throw new E('Order mismatch.');
  await recordPaid(t.o, pi, oi); return { ok: true, orderId: t.o.id };
};
/* Razorpay webhook: records paid orders even if the customer closed the page, and marks refunds */
const webhook = async (b, e) => {
  const raw = e.isBase64Encoded ? Buffer.from(e.body || '', 'base64').toString() : (e.body || ''), sec = process.env.RAZORPAY_WEBHOOK_SECRET, sg = String((e.headers || {})['x-razorpay-signature'] || '');
  if (!sec) throw new E('Webhook secret not set.', 500);
  const good = crypto.createHmac('sha256', sec).update(raw).digest('hex');
  if (!sg || good.length !== sg.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sg))) throw new E('Bad signature', 400);
  const ev = JSON.parse(raw), pl = ev.payload || {};
  if (ev.event === 'payment.captured' || ev.event === 'order.paid') {
    const pay = (pl.payment && pl.payment.entity) || {}, oid = pay.order_id || (pl.order && pl.order.entity && pl.order.entity.id), pid = pay.id;
    if (oid && pid) {
      await sleep(process.env.WEBHOOK_DELAY_MS !== undefined ? +process.env.WEBHOOK_DELAY_MS : 4000);
      const row = (await sheets.read('Pending')).find((r, k) => k > 0 && r[0] === oid);
      if (!row) console.error('webhook: no pending order for', oid);
      else { const o = JSON.parse(row[1]); if (pay.amount && pay.amount !== o.total * 100) console.error('webhook: amount mismatch', oid); else await recordPaid(o, pid, oid) }
    }
  } else if (ev.event === 'refund.processed' || ev.event === 'refund.created') {
    const pid = pl.refund && pl.refund.entity && pl.refund.entity.payment_id, rows = await sheets.read('Orders'), i = rows.findIndex((r, k) => k > 0 && r[15] === pid);
    if (i > 0) { const row = Array.from({ length: 20 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]); row[OIDX.pay] = 'Refunded'; await sheets.update('Orders', i + 1, row) }
  } else if (ev.event === 'payment.failed') console.error('payment failed', JSON.stringify(((pl.payment || {}).entity || {}).error_description || ''));
  return { ok: true };
};
/* Password reset by email (Brevo) */
const mail = async (to, subject, html) => {
  const k = process.env.BREVO_API_KEY, from = process.env.MAIL_FROM; if (!k || !from) throw new E('Email is not set up yet. Please contact the store.', 500);
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': k, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ sender: { name: 'Juno', email: from }, to: [{ email: to }], subject, htmlContent: html }) });
  if (!r.ok) { console.error('mail failed', r.status); throw new E('Could not send the email. Please try again later.', 500) }
};
const forgot = async (b, e) => {
  const email = clean(b.email).toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(email)) throw new E('Enter a valid email.');
  limit('fp:' + ip(e), 5, 36e5); limit('fpe:' + email, 3, 36e5);
  if (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM) throw new E('Email is not set up yet. Please contact the store.', 500);
  const f = await findUser(email);
  if (f) { const t = sign({ email, purpose: 'reset', h: String(f.v[2]).slice(-12) }, '30m'), base = process.env.URL || ('https://' + ((e.headers || {}).host || '')), link = base + '/?reset=' + encodeURIComponent(t);
    await mail(email, 'Reset your Juno password', `<p>Hi ${clean(f.v[0])},</p><p>Tap the button to choose a new password. The link works for 30 minutes and only once.</p><p><a href="${link}" style="background:#f0287a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p><p>If you did not ask for this, you can ignore this email.</p>`) }
  return { ok: true };
};
const reset = async (b, e) => {
  limit('rs:' + ip(e), 10, 36e5); const pw = String(b.password || ''); if (pw.length < 6) throw new E('Use a password with 6 or more characters.');
  let t; try { t = jwt.verify(String(b.token || ''), secret()) } catch (x) { throw new E('This reset link has expired. Please ask for a new one.') }
  if (t.purpose !== 'reset') throw new E('Invalid link.');
  const f = await findUser(t.email); if (!f || String(f.v[2]).slice(-12) !== t.h) throw new E('This reset link was already used or has expired. Please ask for a new one.');
  const v = f.v.slice(); while (v.length < 7) v.push(''); v[2] = await bcrypt.hash(pw, 10); await sheets.update('Users', f.row, v);
  const u = { name: v[0], email: t.email }; return { user: u, token: sign(u, '30d') };
};
/* ---------- reviews ---------- */
const reviews = async (b, e) => {
  const pid = clean((e.queryStringParameters || {}).pid); if (!pid) throw new E('Missing product.');
  let rows = []; try { rows = (await sheets.read('Reviews')).slice(1) } catch (x) { console.error('reviews tab missing') }
  const list = rows.filter(r => r[1] === pid && r[8] === 'Approved').map(r => ({ name: r[2], rating: +r[4], comment: r[5], date: String(r[6] || '').split(',')[0], verified: r[7] === 'Yes' })).reverse();
  const avg = list.length ? list.reduce((a, x) => a + x.rating, 0) / list.length : 0;
  return { avg: Math.round(avg * 10) / 10, count: list.length, list: list.slice(0, 30) };
};
const addReview = async (b, e, u) => {
  limit('rv:' + u.email, 10, 36e5);
  const pid = clean(b.pid), rating = Math.round(+b.rating), comment = clean(b.comment).slice(0, 500);
  if (!(rating >= 1 && rating <= 5)) throw new E('Pick a star rating.'); if (comment.length < 3) throw new E('Please write a short review.');
  const prod = (await catalogue())[pid]; if (!prod) throw new E('Product not found.', 404);
  const old = await sheets.read('Reviews'); if (old.some((r, k) => k > 0 && r[1] === pid && String(r[3]).toLowerCase() === u.email)) throw new E('You have already reviewed this product.');
  const orders = await sheets.read('Orders'), verified = orders.some((r, k) => k > 0 && String(r[3]).toLowerCase() === u.email && String(r[7] || '').includes(prod.name) && r[17] !== 'Cancelled') ? 'Yes' : 'No';
  const f = await findUser(u.email);
  await sheets.append('Reviews', ['RV' + Date.now().toString().slice(-8), pid, f ? clean(f.v[0]) : 'Customer', u.email, rating, comment, now(), verified, 'Approved']);
  return { ok: true };
};
/* ---------- return / cancellation requests ---------- */
const padOrder = r => Array.from({ length: 20 }, (_, j) => r[j] == null ? '' : r[j]);
const returnRequest = async (b, e, u) => {
  limit('rq:' + u.email, 10, 36e5);
  const type = b.type === 'Return' ? 'Return' : b.type === 'Cancel' ? 'Cancel' : null; if (!type) throw new E('Choose cancel or return.');
  const reason = clean(b.reason).slice(0, 100), details = clean(b.details).slice(0, 400); if (!reason) throw new E('Please choose a reason.');
  const orders = await sheets.read('Orders'), i = orders.findIndex((r, k) => k > 0 && r[0] === clean(b.orderId) && String(r[3]).toLowerCase() === u.email); if (i < 0) throw new E('Order not found.', 404);
  const st = orders[i][17] || 'New';
  if (st === 'Cancelled' || st === 'Returned') throw new E('This order is already ' + st.toLowerCase() + '.');
  const reqs = await sheets.read('Requests'); if (reqs.some((r, k) => k > 0 && r[2] === orders[i][0] && r[4] === type && !['Rejected', 'Closed'].includes(r[7]))) throw new E('You already have a ' + type.toLowerCase() + ' request for this order.');
  let status = 'Requested', message = 'Request received. We will update the status in your account.';
  if (type === 'Cancel') {
    if (st === 'New') { const row = padOrder(orders[i]); row[OIDX.status] = 'Cancelled'; await sheets.update('Orders', i + 1, row); status = 'Approved'; message = 'Order cancelled. If you paid online, the refund is processed in 5-7 working days.' }
    else if (st === 'Packed') message = 'Your order is already packed. We will try to stop it and confirm shortly.';
    else throw new E(st === 'Delivered' ? 'This order was delivered. You can request a return instead.' : 'This order has already shipped, so it cannot be cancelled. You can request a return after delivery.');
  } else if (st !== 'Delivered') throw new E('Returns can be requested after delivery.');
  await sheets.append('Requests', ['RQ' + Date.now().toString().slice(-8), now(), orders[i][0], u.email, type, reason, details, status, '']);
  return { ok: true, status, message };
};
const myRequests = async (b, e, u) => { let rows = []; try { rows = (await sheets.read('Requests')).slice(1) } catch (x) { } return rows.filter(r => String(r[3] || '').toLowerCase() === u.email).reverse().map(r => ({ id: r[0], date: String(r[1] || '').split(',')[0], orderId: r[2], type: r[4], status: r[7], notes: r[8] || '' })) };
/* Setup checker: shows which settings and sheet tabs are working. Never returns secrets. */
const why = x => {
  const st = (x && x.response && x.response.status) || x.code, m = String((x && x.message) || '');
  if (!process.env.SHEET_ID) return 'SHEET_ID is not set';
  if (/invalid_grant|DECODER|PEM|private key|invalid_client|unauthorized_client|No key or keyFile/i.test(m)) return 'Google sign-in failed: check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY';
  if (st === 403) return 'No access: share the sheet with the service account email as Editor, and make sure the Google Sheets API is enabled';
  if (st === 404) return 'Sheet not found: check SHEET_ID';
  if (st === 400 || /Unable to parse range/i.test(m)) return 'Tab is missing or named differently';
  return 'Error: ' + m.slice(0, 80);
};
const health = async () => {
  const names = ['SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'JWT_SECRET', 'ADMIN_PASSWORD', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'BREVO_API_KEY', 'MAIL_FROM'], env = {};
  names.forEach(k => env[k] = process.env[k] ? 'set' : 'MISSING');
  const key = process.env.GOOGLE_PRIVATE_KEY || '', keyCheck = !key ? 'MISSING' : (!/BEGIN PRIVATE KEY/.test(key) || !/END PRIVATE KEY/.test(key)) ? 'looks wrong: paste the whole private_key including the BEGIN and END lines' : /^\s*["']/.test(key) ? 'looks wrong: remove the quote marks around it' : 'looks fine';
  const tabs = {};
  for (const t of ['Products', 'Users', 'Orders', 'Pending', 'Reviews', 'Requests']) { try { await sheets.read(t); tabs[t] = 'ok' } catch (x) { tabs[t] = why(x) } }
  return { env, privateKey: keyCheck, shareSheetWith: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '(not set)', tabs };
};
/* ---------- pincode lookup and Tamil Nadu coverage ---------- */
const pinCache = new Map(), TN_RE = /^(60[0-9]|61[0-4]|62[0-9]|63[0-9]|64[1-3])\d{3}$/;
async function pinApi(path) {
  const c = pinCache.get(path); if (c && Date.now() - c.t < 864e5) return c.v;
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 3500);
  try { const r = await fetch('https://api.postalpincode.in/' + path, { signal: ac.signal }); if (!r.ok) return null; const d = await r.json(), v = Array.isArray(d) ? d[0] : null; if (v) { pinCache.set(path, { t: Date.now(), v }); if (pinCache.size > 500) pinCache.clear() } return v }
  catch (x) { return null } finally { clearTimeout(tm) }
}
async function tnPin(pin) { if (!TN_RE.test(String(pin))) return false; const v = await pinApi('pincode/' + pin); if (v && v.Status === 'Success' && v.PostOffice && v.PostOffice[0]) return v.PostOffice[0].State === 'Tamil Nadu'; return true }
const pincode = async (b, e) => {
  limit('pin:' + ip(e), 80, 6e5); const q = e.queryStringParameters || {};
  if (q.pin) {
    const pin = String(q.pin); if (!/^\d{6}$/.test(pin)) throw new E('Enter a 6-digit pincode.');
    const v = await pinApi('pincode/' + pin);
    if (!v) return { ok: false, approx: true, serviceable: TN_RE.test(pin), areas: [] };
    if (v.Status !== 'Success' || !v.PostOffice) return { ok: true, found: false, serviceable: false, areas: [] };
    const areas = v.PostOffice.map(p => ({ name: p.Name, district: p.District, state: p.State })), state = areas[0].state;
    return { ok: true, found: true, state, district: areas[0].district, serviceable: state === 'Tamil Nadu', areas: areas.slice(0, 12) };
  }
  if (q.q) {
    const t = String(q.q).trim(); if (!/^[A-Za-z][A-Za-z .-]{2,40}$/.test(t)) throw new E('Type at least 3 letters.');
    const v = await pinApi('postoffice/' + encodeURIComponent(t)), seen = new Set();
    const areas = ((v && v.PostOffice) || []).filter(p => p.State === 'Tamil Nadu').map(p => ({ name: p.Name, district: p.District, pin: p.Pincode })).filter(p => { const k = p.name + p.pin; return !seen.has(k) && seen.add(k) }).slice(0, 8);
    return { ok: !!v, areas };
  }
  throw new E('Missing pincode.');
};
/* ---------- support tickets (complaints and queries) ---------- */
const TTYPES = ['Query', 'Complaint', 'Order issue', 'Payment issue', 'Other'], lng = (t, n) => String(t == null ? '' : t).replace(/[<>]/g, '').trim().slice(0, n), brk = t => lng(t, 1000).replace(/\n/g, '<br>');
const SUP = () => process.env.SUPPORT_EMAIL || process.env.MAIL_FROM || '', PHONE = () => process.env.SUPPORT_PHONE || '8072796630';
const tryMail = async (to, sub, html) => { try { await mail(to, sub, html); return true } catch (x) { console.error('ticket email not sent'); return false } };
const ticket = async (b, e) => {
  limit('tk:' + ip(e), 6, 36e5);
  const type = TTYPES.includes(b.type) ? b.type : 'Query', name = clean(b.name), email = clean(b.email).toLowerCase(), phone = String(b.phone || '').replace(/\D/g, '').slice(-10), order = clean(b.orderId).slice(0, 30), msg = lng(b.message, 1000);
  if (name.length < 2) throw new E('Please enter your name.'); if (!/^\S+@\S+\.\S+$/.test(email)) throw new E('Enter a valid email so we can reply.');
  if (phone && !/^[6-9]\d{9}$/.test(phone)) throw new E('Enter a valid 10-digit mobile number, or leave it blank.');
  if (msg.length < 10) throw new E('Please describe your issue in a few words (at least 10 characters).');
  limit('tke:' + email, 10, 864e5);
  const id = 'TK' + Date.now().toString().slice(-8);
  await sheets.append('Tickets', [id, now(), type, name, email, phone, order, msg, 'Open', '', now()]);
  if (SUP()) await tryMail(SUP(), `[${id}] ${type} from ${name}`, `<p><b>${type}</b> ticket <b>${id}</b></p><p>${name} · ${email} · ${phone || 'no phone'}${order ? ' · Order ' + order : ''}</p><p>${brk(msg)}</p>`);
  const emailed = await tryMail(email, `We received your ${type.toLowerCase()} (${id})`, `<p>Hi ${name},</p><p>Thanks for contacting Juno. Your ticket number is <b>${id}</b>. We will reply by email. You can also call us on ${PHONE()}.</p><p><i>Your message:</i><br>${brk(msg)}</p>`);
  return { ok: true, id, emailed };
};
const myTickets = async (b, e, u) => { let rows = []; try { rows = (await sheets.read('Tickets')).slice(1) } catch (x) { } return rows.filter(r => String(r[4] || '').toLowerCase() === u.email).reverse().map(r => ({ id: r[0], date: String(r[1] || '').split(',')[0], type: r[2], message: r[7], status: r[8], reply: r[9] || '' })) };
/* ---------- homepage signals: real sales ranking + real review averages (no counts exposed) ---------- */
let sg = { t: 0, v: null };
const orderTime = t => { const m = String(t || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0 };
const signals = async () => {
  if (!sg.v || Date.now() - sg.t > 120000) {
    const [ps, orders, rv] = await Promise.all([productRows().then(productObjs), sheets.read('Orders').catch(() => []), sheets.read('Reviews').catch(() => [])]);
    const byName = {}; ps.forEach(p => { const n = p['product name']; if (n) byName[n] = byName[n] === undefined ? p['product id'] : null });
    const all = {}, recent = {}, cut = Date.now() - 14 * 864e5;
    orders.slice(1).forEach(r => {
      if (['Cancelled', 'Returned'].includes(r[17])) return; const t = orderTime(r[1]);
      String(r[7] || '').split(';').forEach(seg => { const m = seg.trim().match(/^(.*) \(.*\) x(\d+)$/); if (!m) return; const id = byName[m[1].trim()]; if (!id) return; const n = +m[2]; all[id] = (all[id] || 0) + n; if (t >= cut) recent[id] = (recent[id] || 0) + n });
    });
    const rank = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x[0]), rs = {};
    rv.slice(1).forEach(r => { if (r[8] !== 'Approved') return; const q = rs[r[1]] || (rs[r[1]] = { s: 0, n: 0 }); q.s += +r[4] || 0; q.n++ });
    const reviews = {}; Object.keys(rs).forEach(k => reviews[k] = { avg: Math.round(rs[k].s / rs[k].n * 10) / 10, count: rs[k].n });
    sg = { t: Date.now(), v: { bestsellers: rank(all), trending: rank(recent), reviews } };
  }
  return { __raw: { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' }, body: JSON.stringify(sg.v) } };
};
const visibleIds = async () => productObjs(await productRows()).filter(p => p['product id'] && num(p['selling price']) && String(p['show on site']).toLowerCase() !== 'no').map(p => p['product id']);
const myOrders = async (b, e, u) => (await sheets.read('Orders')).slice(1).filter(r => String(r[3] || '').toLowerCase() === u.email).reverse().map(r => ({ id: r[0], date: String(r[1] || '').split(',')[0], n: +r[8] || 0, method: r[13] === 'COD' ? 'Cash on delivery' : r[13], total: num(r[12]), eta: r[16], status: r[17] || 'New', tracking: r[18] || '' }));
/* ---------- admin ---------- */
const sha = t => crypto.createHash('sha256').update(String(t)).digest();
const adminLogin = async (b, e) => {
  limit('ad:' + ip(e), 6, 9e5);
  const pw = process.env.ADMIN_PASSWORD; if (!pw) throw new E('ADMIN_PASSWORD is not set.', 500);
  if (!crypto.timingSafeEqual(sha(b.password || ''), sha(pw))) { await new Promise(r => setTimeout(r, 900)); throw new E('Wrong password.', 401) }
  return { token: sign({ admin: true }, '12h') };
};
const PCOLS = ['Product ID', 'Product Name', 'Category', 'For', 'MRP', 'Selling Price', 'Details', 'Sizes/Colours', 'Image', 'Stock', 'Flash Sale', 'Rating', 'Show on site'];
const admin = async (b, e) => {
  if (b.action === 'login') return adminLogin(b, e);
  const u = bearer(e); if (!u || !u.admin) throw new E('Session expired. Log in again.', 401);
  if (b.action === 'load') {
    const [o, p, us, rv, rq, tk] = await Promise.all([sheets.read('Orders'), productRows(true), sheets.read('Users'), sheets.read('Reviews').catch(() => []), sheets.read('Requests').catch(() => []), sheets.read('Tickets').catch(() => [])]);
    return { orders: o.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 20 }, (_, j) => r[j] == null ? '' : r[j]) })), products: productObjs(p), reviews: rv.slice(1).map((r, i) => ({ row: i + 2, id: r[0] || '', pid: r[1] || '', name: r[2] || '', rating: r[4] || '', comment: r[5] || '', date: r[6] || '', verified: r[7] || '', status: r[8] || '' })), requests: rq.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 9 }, (_, j) => r[j] == null ? '' : r[j]) })), tickets: tk.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 11 }, (_, j) => r[j] == null ? '' : r[j]) })), users: us.slice(1).map((r, i) => ({ row: i + 2, name: r[0] || '', email: r[1] || '', phone: r[3] || '', joined: r[4] || '', last: r[5] || '', count: r[6] || 0 })) };
  }
  if (b.action === 'updateOrder') {
    const rows = await sheets.read('Orders'), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id); if (i < 0) throw new E('Order not found.', 404);
    const row = Array.from({ length: 20 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]);
    if (b.status != null) row[OIDX.status] = clean(b.status); if (b.tracking != null) row[OIDX.track] = clean(b.tracking); if (b.pay != null) row[OIDX.pay] = clean(b.pay); if (b.notes != null) row[OIDX.notes] = clean(b.notes);
    await sheets.update('Orders', i + 1, row); return { ok: true };
  }
  if (b.action === 'setReview') {
    const rows = await sheets.read('Reviews'), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id); if (i < 0) throw new E('Review not found.', 404);
    const row = Array.from({ length: 9 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]); row[8] = b.status === 'Hidden' ? 'Hidden' : 'Approved'; await sheets.update('Reviews', i + 1, row); return { ok: true };
  }
  if (b.action === 'updateRequest') {
    const ST = ['Requested', 'Approved', 'Rejected', 'Pickup scheduled', 'Refunded', 'Closed']; if (!ST.includes(b.status)) throw new E('Bad status.');
    const rows = await sheets.read('Requests'), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id); if (i < 0) throw new E('Request not found.', 404);
    const row = Array.from({ length: 9 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]); row[7] = b.status; row[8] = clean(b.notes); await sheets.update('Requests', i + 1, row);
    const want = row[4] === 'Cancel' && b.status === 'Approved' ? 'Cancelled' : row[4] === 'Return' && b.status === 'Refunded' ? 'Returned' : '';
    if (want) { const o = await sheets.read('Orders'), k = o.findIndex((r, n) => n > 0 && r[0] === row[2]); if (k > 0) { const orow = padOrder(o[k]); orow[OIDX.status] = want; await sheets.update('Orders', k + 1, orow) } }
    return { ok: true };
  }
  if (b.action === 'refund') {
    const o = await sheets.read('Orders'), k = o.findIndex((r, n) => n > 0 && r[0] === b.orderId); if (k < 0) throw new E('Order not found.', 404);
    const orow = padOrder(o[k]), pid = String(orow[OIDX.payid] || ''); if (!pid.startsWith('pay_')) throw new E('No online payment on this order. Refund cash-on-delivery orders by UPI or bank transfer, then set Payment Status to Refunded.');
    if (orow[OIDX.pay] !== 'Paid') throw new E('Only orders marked Paid can be refunded here.');
    const amt = Math.round(+orow[OIDX.total] * 100); if (!(amt > 0)) throw new E('Order total is missing.');
    try { await rz().payments.refund(pid, { amount: amt, notes: { orderId: b.orderId } }) } catch (x) { console.error('refund failed', x && x.error ? JSON.stringify(x.error) : x); throw new E('Razorpay could not start the refund. Check the Razorpay dashboard.', 502) }
    orow[OIDX.pay] = 'Refund initiated'; await sheets.update('Orders', k + 1, orow); return { ok: true };
  }
  if (b.action === 'updateTicket') {
    const TS = ['Open', 'In progress', 'Resolved', 'Closed']; if (!TS.includes(b.status)) throw new E('Bad status.');
    const rows = await sheets.read('Tickets'), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id); if (i < 0) throw new E('Ticket not found.', 404);
    const row = Array.from({ length: 11 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]), reply = lng(b.reply, 1000), changed = reply !== row[9] || b.status !== row[8];
    row[8] = b.status; row[9] = reply; row[10] = now(); await sheets.update('Tickets', i + 1, row);
    let emailed = false; if (changed && row[4]) emailed = await tryMail(row[4], `Update on your ticket ${row[0]}: ${b.status}`, `<p>Hi ${clean(row[3])},</p><p>Your ticket <b>${row[0]}</b> is now <b>${b.status}</b>.</p>${reply ? '<p><b>Our reply:</b><br>' + brk(reply) + '</p>' : ''}<p>Need more help? Call ${PHONE()} or reply to this email.</p>`);
    return { ok: true, emailed };
  }
  if (b.action === 'saveProduct') {
    const p = b.product || {}, rows = await productRows(true); let id = clean(p.id);
    const name = clean(p.name), sp = num(p.price), mrp = num(p.mrp) || sp;
    if (!name || !sp) throw new E('Name and selling price are required.');
    if (!id) { const mx = rows.slice(1).reduce((m, r) => Math.max(m, +String(r[0] || '').replace(/\D/g, '') || 0), 0); id = 'TL' + String(mx + 1).padStart(3, '0') }
    const row = [id, name, clean(p.cat) || 'More', clean(p.g) || 'Unisex', mrp, sp, clean(p.details), clean(p.sizes), String(p.image || '').trim().slice(0, 500), p.stock === '' || p.stock == null ? '' : num(p.stock), /^y/i.test(p.sale) ? 'Yes' : 'No', num(p.rating) || 4.2, /^n/i.test(p.show) ? 'No' : 'Yes'];
    const i = rows.findIndex((r, k) => k > 0 && r[0] === id);
    if (i > 0) await sheets.update('Products', i + 1, row); else await sheets.append('Products', row);
    invalidate(); return { ok: true, id };
  }
  throw new E('Unknown action.');
};
module.exports = { E, json, wrap, products, signup, login, forgot, reset, webhook, health, reviews, addReview, returnRequest, myRequests, ticket, myTickets, pincode, signals, visibleIds, placeCod, createOrder, verifyPayment, myOrders, admin, _t: { price, nk, csv } };
