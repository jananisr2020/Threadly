const sheets = require('./sheets'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), crypto = require('crypto');
const Razorpay = require('razorpay');
class E extends Error { constructor(m, code = 400) { super(m); this.code = code } }
const json = (code, obj, extra = {}) => ({ statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }, body: JSON.stringify(obj) });
const parse = e => { try { return JSON.parse(e.body || '{}') } catch (x) { return {} } };
const clean = t => String(t == null ? '' : t).replace(/[<>]/g, '').trim().slice(0, 300);
const noteMarker = (note, key) => {
  const prefix = key + '=';
  const entry = String(note || '').split('|').map(s => s.trim()).find(s => s.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : '';
};
const setNoteMarker = (note, key, value) => {
  const prefix = key + '=';
  const parts = String(note || '').split('|').map(s => s.trim()).filter(s => s && !s.startsWith(prefix));
  parts.push(prefix + String(value || ''));
  return parts.join(' | ').slice(0, 500);
};
const hits = new Map();
const ip = e => String((e.headers || {})['x-nf-client-connection-ip'] || (e.headers || {})['x-forwarded-for'] || '?').split(',')[0].trim();
const limit = (key, max, ms) => { const t = Date.now(), a = (hits.get(key) || []).filter(x => t - x < ms); if (a.length >= max) { hits.set(key, a); throw new E('Too many attempts. Please wait a few minutes and try again.', 429) } a.push(t); hits.set(key, a); if (hits.size > 5000) hits.clear() };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const secret = () => { if (!process.env.JWT_SECRET) throw new E('Server is not set up yet (JWT_SECRET missing).', 500); return process.env.JWT_SECRET };
const sign = (p, exp) => jwt.sign(p, secret(), { expiresIn: exp });
const bearer = e => { try { return jwt.verify(String((e.headers || {}).authorization || (e.headers || {}).Authorization || '').replace('Bearer ', ''), secret()) } catch (x) { return null } };
const ACTIVITY_HEADERS = ['Event ID', 'Timestamp (IST)', 'Event', 'Actor Email', 'Role', 'Outcome', 'HTTP Method', 'Endpoint', 'IP Address', 'User Agent', 'Safe Details'];
let activityTabReady = null;
const safeActivityDetails = b => {
  const out = {};
  for (const k of ['action', 'status', 'id', 'orderId', 'applicationId', 'productId', 'type']) {
    if (b && b[k] != null && String(b[k]).length <= 100) out[k] = String(b[k]);
  }
  return JSON.stringify(out);
};
const writeActivity = async (e, fn, b, user, outcome, status) => {
  try {
    if (!process.env.SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return;
    if (!activityTabReady) activityTabReady = sheets.ensureTab('ActivityLog', ACTIVITY_HEADERS).catch(err => { activityTabReady = null; throw err; });
    await activityTabReady;
    const tokenUser = user || bearer(e) || {};
    const email = clean(tokenUser.email || b.email || '').toLowerCase();
    const role = tokenUser.admin || fn.name === 'admin' ? 'admin' : tokenUser.seller || fn.name === 'sellerLogin' || fn.name === 'sellerActivate' || fn.name === 'sellerProducts' || fn.name === 'sellerOrders' ? 'seller' : email ? 'customer' : 'anonymous';
    const label = fn.name === 'admin' && b.action ? 'admin.' + clean(b.action) : (fn.name || 'api') + (b.action ? '.' + clean(b.action) : '');
    const path = String(e.path || e.rawUrl || '').split('?')[0].slice(0, 250);
    const headers = e.headers || {};
    const address = String(headers['x-nf-client-connection-ip'] || '').slice(0, 80);
    const agent = String(headers['user-agent'] || '').slice(0, 250);
    const id = 'JA' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    await sheets.append('ActivityLog', [id, now(), label, email, role, outcome + ' (' + status + ')', String(e.httpMethod || '').slice(0, 12), path, address, agent, safeActivityDetails(b)]);
  } catch (err) {
    // Activity logging must never prevent a legitimate customer action.
    console.error('Juno activity log write failed:', err && (err.message || err));
  }
};
const wrap = (method, fn, auth) => async e => {
  const b = parse(e);
  if (e.httpMethod !== method) {
    await writeActivity(e, fn, b, null, 'rejected_method', 405);
    return json(405, { error: method + ' only' });
  }
  let u = null;
  try {
    if (auth === 'user') { u = bearer(e); if (!u || !u.email || u.admin || u.seller || u.sellerId || u.purpose || u.o) throw new E('Please log in again.', 401) }
    const r = await fn(b, e, u);
    const response = r && r.__raw ? r.__raw : json(200, r);
    const responseStatus = response.statusCode || 200;
    await writeActivity(e, fn, b, u, responseStatus >= 400 ? 'failure' : 'success', responseStatus);
    return response;
  } catch (x) {
    const status = x.code || 500;
    await writeActivity(e, fn, b, u, 'failure', status);
    if (x.code) return json(x.code, { error: x.message });
    console.error(x);
    return json(500, { error: 'Something went wrong. Please try again.' });
  }
};

/* ---------- privacy-conscious browser activity events ---------- */
const WEBSITE_ACTIVITY_HEADERS = ['Event ID','Timestamp (IST)','Session ID','Event','Page','Product ID','Control','Referrer Origin','Details'];
let websiteActivityTabReady = null;
const trackWebsiteActivity = async (b, e) => {
  if (b.consent !== 'all') throw new E('Activity tracking requires explicit consent.', 403);
  limit('website-activity:' + ip(e), 120, 60e3);
  const allowed = new Set(['page_view','product_view','product_click','add_to_cart','buy_now','wishlist_toggle','compare_toggle','search_submit','checkout_start','account_action','seller_action','cart_action']);
  const event = String(b.event || '');
  if (!allowed.has(event)) throw new E('Unsupported activity event.');
  const sessionId = String(b.sessionId || '');
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) throw new E('Invalid session identifier.');
  const safePath = String(b.page || '/').split('?')[0].split('#')[0].replace(/[^a-zA-Z0-9/_-]/g,'').slice(0,180) || '/';
  const productId = /^[a-zA-Z0-9_-]{1,80}$/.test(String(b.productId || '')) ? String(b.productId) : '';
  const control = String(b.control || '').replace(/[^a-zA-Z0-9 _.-]/g,'').slice(0,60);
  const referrerOrigin = (() => { try { const u = new URL(String(b.referrer || '')); return u.origin.slice(0,180); } catch (_) { return ''; } })();
  const details = {};
  if (Number.isFinite(Number(b.queryLength)) && b.queryLength >= 0) details.queryLength = Math.min(200, Math.floor(Number(b.queryLength)));
  if (['true','false'].includes(String(b.signedIn))) details.signedIn = String(b.signedIn) === 'true';
  if (!websiteActivityTabReady) websiteActivityTabReady = sheets.ensureTab('WebsiteActivity', WEBSITE_ACTIVITY_HEADERS).catch(err => { websiteActivityTabReady = null; throw err; });
  await websiteActivityTabReady;
  const id = 'JW' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
  await sheets.append('WebsiteActivity', [id, now(), sessionId, event, safePath, productId, control, referrerOrigin, JSON.stringify(details)]);
  return { ok: true };
};

/* ---------- products ---------- */
const nk = h => String(h).trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '');
let pc = { t: 0, rows: [] };
const productRows = async force => { if (!force && Date.now() - pc.t < 30000 && pc.rows.length) return pc.rows; const rows = await sheets.read('Products'); pc = { t: Date.now(), rows }; return rows };
const invalidate = () => { pc = { t: 0, rows: [] } };
const csv = rows => rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\n');
const products = async () => ({ __raw: { statusCode: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'public, max-age=30' }, body: csv(await publicProductRows()) } });
const productObjs = rows => { const k = (rows[0] || []).map(nk); return rows.slice(1).map((r, i) => { const o = { row: i + 2 }; k.forEach((n, j) => o[n] = r[j] == null ? '' : r[j]); return o }) };
const num = v => +String(v || '').replace(/[^\d.]/g, '') || 0;
const marketplaceSellerSalesEnabled = () => String(process.env.MARKETPLACE_SELLER_SALES_ENABLED || '').toLowerCase() === 'true';
async function publicProductRows(force = false) {
  const rows = await productRows(force);
  if (!rows || rows.length < 2) return rows || [];
  const heads = rows[0].map(nk), idI = heads.indexOf('product id'), priceI = heads.indexOf('selling price');
  const showI = heads.indexOf('show on site'), sellerI = heads.indexOf('seller id'), approvalI = heads.indexOf('approval status');
  const visible = rows.slice(1).filter(row => {
    if (idI >= 0 && !String(row[idI] || '').trim()) return false;
    if (sellerI >= 0 && String(row[sellerI] || '').trim() && !marketplaceSellerSalesEnabled()) return false;
    if (priceI >= 0 && !(num(row[priceI]) > 0 && num(row[priceI]) <= 500)) return false;
    if (showI >= 0 && String(row[showI] || '').trim().toLowerCase() === 'no') return false;
    if (approvalI >= 0 && String(row[approvalI] || '').trim() && String(row[approvalI]).trim().toLowerCase() !== 'approved') return false;
    return true;
  }).map(source => {
    const row = source.slice();
    if (sellerI >= 0) row[sellerI] = '';
    if (approvalI >= 0) row[approvalI] = '';
    return row;
  });
  return [rows[0], ...visible];
}
async function catalogue(force = false) { const m = {}; productObjs(await productRows(force)).forEach(p => { if (p['product id'] && num(p['selling price']) > 0 && num(p['selling price']) <= 500 && String(p['show on site']).toLowerCase() !== 'no' && (!p['approval status'] || String(p['approval status']).toLowerCase() === 'approved') && (!String(p['seller id'] || '').trim() || marketplaceSellerSalesEnabled())) m[p['product id']] = { name: p['product name'], price: num(p['selling price']), stock: p.stock === '' ? 999 : num(p.stock), row: p.row, sellerId: String(p['seller id'] || '').trim(), category: p.category || '', image: p.image || '' } }); return m }
async function price(items, coupon) {
  if (!Array.isArray(items) || !items.length) throw new E('Your cart is empty.');
  // Checkout always reads fresh product rows so stale cached stock cannot approve a known-out-of-stock cart.
  const cat = await catalogue(true); let sub = 0, count = 0; const lines = [], qty = [], requested = new Map();
  for (const it of items) {
    const p = cat[it.id], n = Math.floor(+it.n);
    if (!p || !(n >= 1 && n <= 20)) throw new E('A product in your cart is no longer available.');
    requested.set(it.id, (requested.get(it.id) || 0) + n);
    sub += p.price * n; count += n; lines.push(p.name + ' (' + clean(it.s) + ') x' + n);
  }
  for (const [id, n] of requested) {
    const p = cat[id];
    if (n > 20) throw new E('You can order up to 20 units of ' + p.name + ' per order.');
    if (p.stock < n) throw new E(p.name + ' has only ' + p.stock + ' left.');
    qty.push([id, n]);
  }
  const disc = require('./coupons').discount(coupon, sub), ship = sub - disc < 299 ? 39 : 0;
  const itemDetails = qty.map(([id, n]) => { const p = cat[id]; return { productId: id, name: p.name, category: p.category || '', unitPrice: p.price, quantity: n, sellerId: p.sellerId || '' }; });
  return { sub, disc, ship, total: sub - disc + ship, count, lines: lines.join('; '), qty, itemDetails };
}
/* ---------- users ---------- */
const findUser = async email => { const rows = await sheets.read('Users'); for (let i = 1; i < rows.length; i++) if (String(rows[i][1] || '').toLowerCase() === email) return { row: i + 1, v: rows[i] }; return null };
const cred = b => { const email = clean(b.email).toLowerCase(), pw = String(b.password || ''); return { email, pw, name: clean(b.name) } };

/* ---------- marketplace: seller applications ---------- */
const sellerApply = async (b, e) => {
  limit('seller-apply:' + ip(e), 5, 36e5);
  // A seller application only needs the existing Requests tab. Do not make
  // first-time marketplace tab creation a prerequisite for submitting the form.
  if (!process.env.SHEET_ID) throw new E('Seller applications are temporarily unavailable: SHEET_ID is not configured in Netlify.', 503);
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) throw new E('Seller applications are temporarily unavailable: Google Sheets service-account credentials are missing in Netlify.', 503);
  const ownerName = clean(b.ownerName), storeName = clean(b.storeName);
  const email = clean(b.email).toLowerCase(), phone = String(b.phone || '').replace(/\D/g, '');
  const city = clean(b.city), category = clean(b.category), social = clean(b.social), about = String(b.about || '').replace(/[<>]/g, '').trim().slice(0, 1000);
  const allowed = ['Hair accessories', 'Jewellery', 'Bags and purses', 'Scarves and fashion accessories', 'Belts and wallets', 'Mixed accessories'];
  if (ownerName.length < 2 || storeName.length < 2) throw new E('Enter your name and store name.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new E('Enter a valid email address.');
  if (!/^[6-9]\d{9}$/.test(phone)) throw new E('Enter a valid 10-digit Indian mobile number.');
  if (!city || !allowed.includes(category) || about.length < 10) throw new E('Complete the city, category and store description.');
  if (b.consent !== true && String(b.consent) !== 'true' && String(b.consent) !== 'on') throw new E('Please confirm the application consent.');
  if (social) { try { const u = new URL(social); if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocol'); } catch (x) { throw new E('Enter a valid Instagram or store URL.'); } }
  let rows;
  try {
    rows = await sheets.read('Requests');
  } catch (x) {
    console.error('Seller application could not read Requests sheet:', x && (x.response && x.response.data || x.message || x));
    const status = x && x.response && x.response.status;
    if (status === 403) throw new E('Juno cannot access the Google Sheet. Share the Juno spreadsheet with the configured service-account email as an Editor, then try again.', 503);
    if (status === 404) throw new E('Juno could not find the configured Google Sheet. Check SHEET_ID in Netlify environment variables.', 503);
    throw new E('Juno could not read the Requests tab in Google Sheets. Check the SHEET_ID, service-account credentials and that the Requests tab exists.', 503);
  }
  const duplicate = rows.slice(1).find(r => String(r[3] || '').toLowerCase() === email && String(r[4] || '').toLowerCase() === 'seller application' && !['Rejected', 'Closed'].includes(String(r[7] || '')));
  if (duplicate) throw new E('We already have an active application for this email. Juno will review it shortly.', 409);
  const id = 'JS' + Date.now().toString(36).toUpperCase();
  const details = { ownerName, storeName, phone, city, category, social, about, consentAt: new Date().toISOString(), source: 'sell-on-juno-page' };
  try {
    await sheets.append('Requests', [id, now(), '', email, 'Seller application', storeName, JSON.stringify(details), 'Requested', '']);
  } catch (x) {
    console.error('Seller application could not append Requests sheet:', x && (x.response && x.response.data || x.message || x));
    const status = x && x.response && x.response.status;
    if (status === 403) throw new E('Juno can read the Google Sheet but cannot write to it. Share the spreadsheet with the configured service-account email as an Editor.', 503);
    if (status === 404) throw new E('Juno could not find the Requests tab or configured Google Sheet. Check SHEET_ID and the Requests tab name.', 503);
    throw new E('Juno could not save your application to Google Sheets. Check the Requests tab headers and service-account Editor access, then try again.', 503);
  }
  return { ok: true, applicationId: id, message: 'Application received for review.' };
};


/* ---------- marketplace: seller accounts and owned products ---------- */
const MARKETPLACE_SHEET_HEADERS = {
  Sellers: ["Seller ID","Application ID","Store Name","Email","Password Hash","City","Category","Status","Created","Last Login"],
  SellerOrders: ["Seller Order ID","Parent Order ID","Date","Seller ID","Seller Store Name","Customer Name","Customer Email","Customer Phone","Shipping Address","Pincode","Items JSON","Item Count","Seller Subtotal","Shipping Allocation","Seller Order Total","Payment Status","Fulfilment Status","Tracking","Updated","Payment ID"],
  SellerLedger: ["Ledger ID","Seller Order ID","Parent Order ID","Payment ID","Seller ID","Store Name","Gross Item Subtotal","Allocated Discount","Commission BPS","Commission Amount","Net Seller Amount","Currency","Ledger Status","Payout Reference","Created","Updated","Notes"]
};
const ensureMarketplaceTabs = async () => {
  for (const [tab, headers] of Object.entries(MARKETPLACE_SHEET_HEADERS)) await sheets.ensureTab(tab, headers);
};
const sellerRows = async () => { await sheets.ensureTab('Sellers', MARKETPLACE_SHEET_HEADERS.Sellers); return sheets.read('Sellers'); };
const sellerByEmail = async email => {
  const rows = await sellerRows();
  for (let i = 1; i < rows.length; i++) if (String(rows[i][3] || '').toLowerCase() === email) return { row: i + 1, v: rows[i] };
  return null;
};
const sellerPublic = v => ({ id: v[0], storeName: v[2], email: v[3], city: v[5], category: v[6] });
const sellerActivate = async (b, e) => {
  limit('seller-activate:' + ip(e), 8, 36e5);
  const password = String(b.password || ''); if (password.length < 8) throw new E('Use a password with at least 8 characters.');
  let t; try { t = jwt.verify(String(b.token || ''), secret()) } catch (x) { throw new E('This activation link expired. Ask Juno to resend it.') }
  if (t.purpose !== 'seller-activate' || !t.email || !t.applicationId) throw new E('Invalid seller activation link.');
  const reqs = await sheets.read('Requests');
  const req = reqs.find((r, i) => i > 0 && r[0] === t.applicationId && String(r[4] || '').toLowerCase() === 'seller application' && r[7] === 'Approved');
  if (!req || String(req[3] || '').toLowerCase() !== t.email) throw new E('This seller application is not approved or no longer valid.');
  if (await sellerByEmail(t.email)) throw new E('A seller account already exists. Please log in.');
  let d = {}; try { d = JSON.parse(req[6] || '{}') } catch (x) {}
  const id = 'JSR' + Date.now().toString(36).toUpperCase(), rows = await sellerRows();
  if (!rows.length) throw new E('The Sellers sheet needs its header row. Ask the Juno administrator to finish setup.', 503);
  await sheets.append('Sellers', [id, t.applicationId, clean(d.storeName || req[5]), t.email, await bcrypt.hash(password, 10), clean(d.city), clean(d.category), 'Active', now(), now()]);
  const seller = { id, storeName: clean(d.storeName || req[5]), email: t.email, city: clean(d.city), category: clean(d.category) };
  return { ok: true, seller, token: sign({ seller: true, sellerId: id, email: t.email }, '30d') };
};
const sellerLogin = async (b, e) => {
  limit('seller-login:' + ip(e), 10, 9e5);
  const email = clean(b.email).toLowerCase(), password = String(b.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) throw new E('Enter your seller email and password.');
  const f = await sellerByEmail(email);
  if (!f || f.v[7] !== 'Active' || !(await bcrypt.compare(password, String(f.v[4] || '')))) throw new E('Seller login details are incorrect or the account is not active.', 401);
  const row = f.v.slice(); row[9] = now(); await sheets.update('Sellers', f.row, row);
  return { ok: true, seller: sellerPublic(row), token: sign({ seller: true, sellerId: row[0], email }, '30d') };
};
const sellerOrders = async (b, e) => {
  const u = bearer(e); if (!u || !u.seller || !u.sellerId || !u.email) throw new E('Please sign in to your seller account.', 401);
  const sr = await sellerByEmail(u.email); if (!sr || sr.v[0] !== u.sellerId || sr.v[7] !== 'Active') throw new E('Seller account is inactive. Contact Juno.', 403);
  let rows; try { await sheets.ensureTab('SellerOrders', MARKETPLACE_SHEET_HEADERS.SellerOrders); rows = await sheets.read('SellerOrders'); } catch (x) { throw new E('Could not set up the SellerOrders tab. Check Google Sheets permissions and SHEET_ID.', 503); }
  if (!rows.length || String(rows[0][0] || '').trim() !== 'Seller Order ID') throw new E('SellerOrders sheet headers are not set up yet. Ask the Juno administrator to follow the README.', 503);
  if (b.action === 'load') return { ok: true, orders: rows.slice(1).filter(r => String(r[3]) === u.sellerId).reverse().map(r => ({ id:r[0], parentOrderId:r[1], date:r[2], storeName:r[4], customerName:r[5], phone:r[7], address:r[8], pincode:r[9], items:(()=>{try{return JSON.parse(r[10]||'[]')}catch(x){return []}})(), itemCount:+r[11]||0, subtotal:+r[12]||0, paymentStatus:r[15], status:r[16]||'New', tracking:r[17]||'' })) };
  if (b.action === 'update') {
    const allowed = ['New','Accepted','Packed','Shipped','Delivered','Cancelled'];
    if (!allowed.includes(b.status)) throw new E('Choose a valid fulfilment status.');
    const i = rows.findIndex((r,k)=>k>0 && r[0]===b.id && String(r[3])===u.sellerId);
    if (i < 0) throw new E('Seller order not found.',404);
    const row=rows[i].slice(); while(row.length<20) row.push('');
    const old=String(row[16]||'New');
    const transitions={New:['Accepted','Cancelled'],Accepted:['Packed','Cancelled'],Packed:['Shipped','Cancelled'],Shipped:['Delivered'],Delivered:[],Cancelled:[]};
    if (b.status !== old && !(transitions[old]||[]).includes(b.status)) throw new E('That fulfilment status change is not allowed.');
    row[16]=b.status; if (b.tracking != null) row[17]=clean(b.tracking); row[18]=now();
    await sheets.update('SellerOrders',i+1,row);
    return {ok:true};
  }
  throw new E('Unknown seller order action.');
};
const sellerProducts = async (b, e) => {
  const u = bearer(e); if (!u || !u.seller || !u.sellerId || !u.email) throw new E('Please sign in to your seller account.', 401);
  const sr = await sellerByEmail(u.email); if (!sr || sr.v[0] !== u.sellerId || sr.v[7] !== 'Active') throw new E('Seller account is inactive. Contact Juno.', 403);
  if (b.action === 'profile') return { ok: true, seller: sellerPublic(sr.v) };
  let rows = await productRows(true), headers = (rows[0] || []).map(nk);
  if (!headers.includes('seller id') || !headers.includes('approval status')) {
    const h = (rows[0] || []).slice(); while (h.length < 13) h.push('');
    if (!headers.includes('seller id')) h[13] = 'Seller ID';
    if (!headers.includes('approval status')) h[14] = 'Approval Status';
    await sheets.update('Products', 1, h); invalidate(); rows = await productRows(true); headers = (rows[0] || []).map(nk);
  }
  const sidCol = headers.indexOf('seller id'), statusCol = headers.indexOf('approval status');
  if (b.action === 'load') {
    const list = productObjs(rows).filter(p => String(p['seller id']) === u.sellerId).map(p => ({ id: p['product id'], name: p['product name'], category: p.category, price: num(p['selling price']), mrp: num(p.mrp), stock: p.stock === '' ? 0 : num(p.stock), details: p.details || '', sizes: p.sizes || '', image: p.image || '', status: p['approval status'] || 'Pending', visibility: String(p['show on site']).toLowerCase() === 'no' ? 'Hidden' : 'Live' }));
    return { ok: true, seller: sellerPublic(sr.v), products: list };
  }
  if (b.action === 'update') {
    const p = b.product || {}, id = clean(p.id), name = clean(p.name), cat = clean(p.cat), priceValue = num(p.price), mrp = num(p.mrp) || priceValue, stock = Number(p.stock);
    const categories = ['Hair accessories', 'Jewellery', 'Bags and purses', 'Scarves and fashion accessories', 'Belts and wallets', 'Mixed accessories'];
    if (!id) throw new E('Product ID is required to edit a product.');
    if (name.length < 2 || !categories.includes(cat) || !(priceValue > 0 && priceValue <= 500) || !(stock >= 0 && Number.isInteger(stock))) throw new E('Check product name, category, price and stock.');
    if (mrp < priceValue || mrp > 100000) throw new E('MRP must be at least the selling price.');
    const image = String(p.image || '').trim(); try { const im = new URL(image); if (!['http:', 'https:'].includes(im.protocol)) throw new Error(); } catch (x) { throw new E('Enter a valid https:// or http:// product image URL.'); }
    if (clean(p.details).length < 3) throw new E('Add a short product description.');
    const idCol = headers.indexOf('product id'), nameCol = headers.indexOf('product name'), catCol = headers.indexOf('category'), mrpCol = headers.indexOf('mrp'), priceCol = headers.indexOf('selling price'), detailsCol = headers.indexOf('details'), sizesCol = headers.indexOf('sizes'), imageCol = headers.indexOf('image'), stockCol = headers.indexOf('stock'), showCol = headers.indexOf('show on site');
    const requiredCols = [idCol, nameCol, catCol, mrpCol, priceCol, detailsCol, sizesCol, imageCol, stockCol, showCol, sidCol, statusCol];
    if (requiredCols.some(col => col < 0)) throw new E('Products sheet is missing columns required for safe seller product editing.', 503);
    const i = rows.findIndex((r, k) => k > 0 && String(r[idCol]) === id && String(r[sidCol]) === u.sellerId);
    if (i < 0) throw new E('Product not found in your seller account.', 404);
    const row = rows[i].slice();
    row[nameCol] = name; row[catCol] = cat; row[mrpCol] = mrp; row[priceCol] = priceValue; row[detailsCol] = clean(p.details); row[sizesCol] = clean(p.sizes); row[imageCol] = image.slice(0, 500); row[stockCol] = stock;
    row[showCol] = 'No'; row[statusCol] = 'Pending';
    await sheets.update('Products', i + 1, row); invalidate();
    return { ok: true, id, status: 'Pending', visibility: 'Hidden' };
  }
  if (b.action === 'save') {
    const p = b.product || {}, name = clean(p.name), cat = clean(p.cat), priceValue = num(p.price), mrp = num(p.mrp) || priceValue, stock = Number(p.stock);
    const categories = ['Hair accessories', 'Jewellery', 'Bags and purses', 'Scarves and fashion accessories', 'Belts and wallets', 'Mixed accessories'];
    if (name.length < 2 || !categories.includes(cat) || !(priceValue > 0 && priceValue <= 500) || !(stock >= 0 && Number.isInteger(stock))) throw new E('Check product name, category, price and stock.');
    if (mrp < priceValue || mrp > 100000) throw new E('MRP must be at least the selling price.');
    const image = String(p.image || '').trim(); try { const im = new URL(image); if (!['http:', 'https:'].includes(im.protocol)) throw new Error(); } catch (x) { throw new E('Enter a valid https:// or http:// product image URL.'); }
    if (clean(p.details).length < 3) throw new E('Add a short product description.');
    const id = 'JS' + Date.now().toString(36).toUpperCase();
    const row = [id, name, cat, 'Unisex', mrp, priceValue, clean(p.details), clean(p.sizes), image.slice(0, 500), stock, 'No', 0, 'No', u.sellerId, 'Pending'];
    await sheets.append('Products', row); invalidate();
    return { ok: true, id, status: 'Pending' };
  }
  throw new E('Unknown seller action.');
};

const passwordPolicyError = pw => {
  const missing = [];
  if (pw.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(pw)) missing.push('an uppercase letter');
  if (!/[a-z]/.test(pw)) missing.push('a lowercase letter');
  if (!/[0-9]/.test(pw)) missing.push('a number');
  if (!/[^A-Za-z0-9]/.test(pw)) missing.push('a special character');
  return missing.length ? 'Password must contain ' + missing.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.' : '';
};
const signup = async (b, e) => {
  limit('su:' + ip(e), 10, 36e5);
  const { email, pw, name } = cred(b);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new E('Enter a valid email address, for example name@example.com.', 400);
  const policyError = passwordPolicyError(pw); if (policyError) throw new E(policyError, 400);
  if (await findUser(email)) throw new E('This email already has an account. Log in instead.');
  const nm = name || email.split('@')[0]; await sheets.append('Users', [nm, email, await bcrypt.hash(pw, 10), '', now(), now(), 1]);
  const u = { name: nm, email }; return { user: u, token: sign(u, '30d') };
};
const customerProfile = async (b, e, u) => {
  const f = await findUser(String(u.email || '').toLowerCase());
  if (!f) throw new E('Customer account not found.', 404);
  return { user: { name: String(f.v[0] || ''), email: String(f.v[1] || '').toLowerCase() } };
};
const updateCustomerProfile = async (b, e, u) => {
  const name = clean(b.name).slice(0, 80);
  if (name.length < 2) throw new E('Enter a name with at least 2 characters.');
  const f = await findUser(String(u.email || '').toLowerCase());
  if (!f) throw new E('Customer account not found.', 404);
  const row = f.v.slice();
  while (row.length < 7) row.push('');
  row[0] = name;
  // The email and credential columns always come from the authenticated account row.
  await sheets.update('Users', f.row, row);
  return { ok: true, user: { name, email: String(row[1] || '').toLowerCase() } };
};
const login = async (b, e) => {
  const { email, pw } = cred(b); limit('li:' + ip(e) + email, 8, 9e5); const f = await findUser(email);
  if (!f || !(await bcrypt.compare(pw, String(f.v[2] || '')))) throw new E('Wrong email or password.');
  const v = [f.v[0] || '', f.v[1], f.v[2], f.v[3] || '', f.v[4] || '', now(), (+f.v[6] || 0) + 1]; try { await sheets.update('Users', f.row, v) } catch (x) { console.error(x) }
  const u = { name: v[0], email }; return { user: u, token: sign(u, '30d') };
};
/* ---------- orders ---------- */
const OIDX = { id: 0, date: 1, name: 2, email: 3, phone: 4, addr: 5, pin: 6, items: 7, count: 8, sub: 9, disc: 10, ship: 11, total: 12, method: 13, pay: 14, payid: 15, eta: 16, status: 17, track: 18, notes: 19 };
const METHODS = ['UPI', 'Card / Netbanking'];
async function buildOrder(b, u) {
  const a = b.addr || {}; if (clean(a.name).length < 2 || !/^[6-9]\d{9}$/.test(a.phone || '') || clean(a.line).length < 8 || !/^\d{6}$/.test(a.pin || '')) throw new E('Please check your delivery details.');
  if (!(await tnPin(a.pin))) throw new E('We currently deliver only in Tamil Nadu. We are expanding to other states soon.');
  if (!METHODS.includes(b.method)) throw new E('Choose a payment method.');
  const t = await price(b.items, b.coupon);
  return { id: 'JN' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase(), email: u.email, addr: { name: clean(a.name), phone: a.phone, line: clean(a.line), pin: a.pin }, method: b.method, eta: clean(b.eta), ...t };
}
async function record(o, payStatus, payId) {
  // Persist the paid order first. If inventory sync then fails, keep the order and flag
  // the exact problem rather than silently treating the checkout as fully reconciled.
  const orderRow = [o.id, now(), o.addr.name, o.email, o.addr.phone, o.addr.line, o.addr.pin, o.lines, o.count, o.sub, o.disc, o.ship, o.total, o.method, payStatus, payId || '', o.eta, 'New', '', 'STOCK_SYNC_PENDING'];
  await sheets.append('Orders', orderRow);
  try {
    const rows = await productRows(true), ps = productObjs(rows), si = (rows[0] || []).map(nk).indexOf('stock');
    if (si < 0) throw new Error('Products sheet has no Stock column.');
    for (const [id, n] of o.qty) {
      const p = ps.find(x => String(x['product id']) === String(id));
      if (!p) throw new Error('Product ' + id + ' was not found while updating stock.');
      // Blank stock means inventory is not tracked for this product; do not invent a quantity.
      if (p.stock === '') continue;
      const current = num(p.stock);
      if (current < n) throw new Error('Stock changed after payment for ' + String(p['product name'] || id) + ': requested ' + n + ', current stock ' + current + '.');
      const row = rows[p.row - 1].slice();
      while (row.length <= si) row.push('');
      row[si] = current - n;
      await sheets.update('Products', p.row, row);
      rows[p.row - 1] = row;
    }
    invalidate();
    const orderRows = await sheets.read('Orders');
    const oi = orderRows.findIndex((r, i) => i > 0 && String(r[0] || '') === String(o.id));
    if (oi > 0) { const row = orderRows[oi].slice(); while (row.length < 20) row.push(''); row[19] = 'STOCK_SYNCED'; await sheets.update('Orders', oi + 1, row); }
  } catch (x) {
    console.error('Inventory reconciliation required for paid order ' + o.id, x);
    try {
      const orderRows = await sheets.read('Orders');
      const oi = orderRows.findIndex((r, i) => i > 0 && String(r[0] || '') === String(o.id));
      if (oi > 0) { const row = orderRows[oi].slice(); while (row.length < 20) row.push(''); row[19] = 'STOCK_RECONCILIATION_REQUIRED: ' + String(x.message || 'inventory update failed').slice(0, 180); await sheets.update('Orders', oi + 1, row); }
    } catch (writeError) { console.error('Could not flag inventory reconciliation for paid order ' + o.id, writeError); }
    throw new E('Payment was recorded, but Juno could not finish updating stock for order ' + o.id + '. Do not pay again. Contact Juno support with this order ID while inventory is reconciled.', 503);
  }
}
const placeCod = async () => { throw new E('Cash on delivery is not available. Please pay online using UPI, cards or netbanking.', 410) };
let razorpayOverride = null;
const rz = () => { if (razorpayOverride) return razorpayOverride; if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new E('Payments are not set up yet.', 500); return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) };
const createOrder = async (b, e, u) => {
  if (b.method === 'COD') throw new E('Cash on delivery is not available. Please pay online using UPI, cards or netbanking.', 400);
  limit('ord:' + u.email, 20, 36e5);
  const o = await buildOrder(b, u), r = await rz().orders.create({ amount: o.total * 100, currency: 'INR', receipt: o.id, notes: { orderId: o.id, email: o.email } });
  try { await sheets.append('Pending', [r.id, JSON.stringify(o), now(), 'pending']) } catch (x) { console.error('pending save failed'); throw new E('Order tracking is not ready. Please contact support before paying.', 503) }
  return { id: r.id, amount: r.amount, key: process.env.RAZORPAY_KEY_ID, orderId: o.id, orderToken: sign({ o, rzp: r.id }, '2h') };
};
async function markPending(id, status) { try { const rows = await sheets.read('Pending'), i = rows.findIndex((r, k) => k > 0 && r[0] === id); if (i > 0) { const r = rows[i].slice(); while (r.length < 4) r.push(''); r[3] = status; await sheets.update('Pending', i + 1, r) } } catch (x) { console.error('pending mark failed', x) } }
async function ensureSellerOrders(o, payId) {
  if (!Array.isArray(o.itemDetails) || !o.itemDetails.length || !o.itemDetails.some(it => String(it.sellerId || '').trim())) return true;
  let rows;
  try { await sheets.ensureTab('SellerOrders', MARKETPLACE_SHEET_HEADERS.SellerOrders); rows = await sheets.read('SellerOrders'); } catch (x) { console.error('SellerOrders tab setup failed; seller fulfilment records were not created for', o.id); return false; }
  if (!rows.length || String(rows[0][0] || '').trim() !== 'Seller Order ID') { console.error('SellerOrders header row missing; seller fulfilment records were not created for', o.id); return false; }
  const existing = new Set(rows.slice(1).map(r => String(r[1] || '') + '|' + String(r[3] || '')));
  const sellers = new Map();
  for (const it of o.itemDetails) {
    const sellerId = String(it.sellerId || '').trim();
    if (!sellerId) continue; // Blank seller ID means the original Juno-owned catalogue.
    if (!sellers.has(sellerId)) sellers.set(sellerId, []);
    sellers.get(sellerId).push(it);
  }
  const sellerRowsData = await sellerRows();
  for (const [sellerId, items] of sellers) {
    if (existing.has(String(o.id) + '|' + sellerId)) continue;
    const sr = sellerRowsData.find((r, i) => i > 0 && String(r[0]) === sellerId);
    if (!sr || sr[7] !== 'Active') { console.error('Seller missing/inactive during order split', sellerId, o.id); return false; }
    const subtotal = items.reduce((sum, it) => sum + (+it.unitPrice || 0) * (+it.quantity || 0), 0);
    const itemCount = items.reduce((sum, it) => sum + (+it.quantity || 0), 0);
    const sid = 'SO' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    await sheets.append('SellerOrders', [sid, o.id, now(), sellerId, sr[2] || '', o.addr.name, o.email, o.addr.phone, o.addr.line, o.addr.pin, JSON.stringify(items), itemCount, subtotal, 0, subtotal, 'Paid', 'New', '', now(), payId || '']);
    existing.add(String(o.id) + '|' + sellerId);
  }
  return true;
}
async function ensureSellerLedger(parentOrderId) {
  let orders, ledger;
  try { await sheets.ensureTab('SellerOrders', MARKETPLACE_SHEET_HEADERS.SellerOrders); await sheets.ensureTab('SellerLedger', MARKETPLACE_SHEET_HEADERS.SellerLedger); orders = await sheets.read('SellerOrders'); ledger = await sheets.read('SellerLedger'); }
  catch (x) { console.error('SellerLedger sheet missing; seller amounts are not reconciled for', parentOrderId); return false; }
  if (!orders.length || String(orders[0][0] || '').trim() !== 'Seller Order ID' ||
      !ledger.length || String(ledger[0][0] || '').trim() !== 'Ledger ID') {
    console.error('SellerOrders/SellerLedger headers missing; ledger reconciliation skipped for', parentOrderId); return false;
  }
  const rawBps = process.env.JUNO_MARKETPLACE_COMMISSION_BPS;
  const hasBps = rawBps !== undefined && String(rawBps).trim() !== '';
  if (hasBps && !/^\d+$/.test(String(rawBps).trim())) throw new E('JUNO_MARKETPLACE_COMMISSION_BPS must be an integer from 0 to 5000.', 500);
  const configured = hasBps, bps = configured ? Number(String(rawBps).trim()) : null;
  if (configured && (!Number.isSafeInteger(bps) || bps < 0 || bps > 5000)) throw new E('JUNO_MARKETPLACE_COMMISSION_BPS must be an integer from 0 to 5000.', 500);
  const sellerOrders = orders.slice(1).filter(r => String(r[1] || '') === String(parentOrderId));
  const parentRows = await sheets.read('Orders');
  const parent = parentRows.find((r, i) => i > 0 && String(r[0] || '') === String(parentOrderId));
  for (const so of sellerOrders) {
    const id = String(so[0] || ''), existingIndex = ledger.findIndex((r, i) => i > 0 && String(r[1] || '') === id);
    const gross = Math.max(0, num(so[12]));
    const orderSubtotal = parent ? Math.max(0, num(parent[9])) : 0;
    const discount = parent ? Math.max(0, num(parent[10])) : 0;
    const allocatedDiscount = orderSubtotal > 0 ? Math.min(gross, Math.round(discount * gross / orderSubtotal)) : 0;
    const commissionBase = Math.max(0, gross - allocatedDiscount);
    const commission = configured ? Math.round(commissionBase * bps / 10000) : '';
    const net = configured ? commissionBase - commission : '';
    const current = existingIndex > 0 ? ledger[existingIndex].slice() : [];
    if (existingIndex > 0 && (String(current[13] || '').trim() || String(current[12] || '') === 'REFUND_REVIEW')) continue; // Never rewrite a paid-out or refund-review row.
    const lid = existingIndex > 0 ? current[0] : 'JL' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    const status = configured ? 'READY_FOR_REVIEW' : 'CONFIG_REQUIRED';
    const row = [lid, id, String(so[1] || ''), String(so[19] || ''), String(so[3] || ''), String(so[4] || ''), gross, allocatedDiscount, configured ? bps : '', commission, net, 'INR', status, '', existingIndex > 0 ? (current[14] || now()) : now(), now(), configured ? 'Calculation only; payout not sent.' : 'Set JUNO_MARKETPLACE_COMMISSION_BPS before reviewing seller payable amounts.'];
    if (existingIndex > 0) await sheets.update('SellerLedger', existingIndex + 1, row);
    else { await sheets.append('SellerLedger', row); ledger.push(row); }
  }
  return true;
}
async function recordPaid(o, payId, rzpId) {
  const rows = await sheets.read('Orders');
  // Razorpay verify and webhook can both report the same capture; dedupe by payment ID and our order ID.
  const existing = rows.find((r, i) => i > 0 && (String(r[15] || '') === String(payId) || String(r[0] || '') === String(o.id)));
  if (!existing) await record(o, 'Paid', payId);
  else if (String(existing[19] || '').startsWith('STOCK_RECONCILIATION_REQUIRED:')) {
    await markPending(rzpId, 'stock_reconciliation_required');
    throw new E('Payment is already recorded for order ' + o.id + ', but stock needs reconciliation. Do not pay again; contact Juno support with this order ID.', 503);
  }
  let sellerReconciled = true;
  try {
    sellerReconciled = (await ensureSellerOrders(o, payId)) !== false;
    if (sellerReconciled) sellerReconciled = (await ensureSellerLedger(o.id)) !== false;
  } catch (x) { sellerReconciled = false; console.error('seller order/ledger reconciliation needs retry for', o.id, x && x.message); }
  await markPending(rzpId, sellerReconciled ? 'recorded' : 'seller_reconciliation_required');
  return true;
}
const verifyPayment = async (b, e, u) => {
  const { razorpay_order_id: oi, razorpay_payment_id: pi, razorpay_signature: sg, orderToken } = b;
  if (!oi || !pi || !sg || !orderToken) throw new E('Missing payment details.');
  const good = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(oi + '|' + pi).digest('hex');
  if (good.length !== String(sg).length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(String(sg)))) throw new E('Payment could not be verified.');
  let t; try { t = jwt.verify(orderToken, secret()) } catch (x) { throw new E('Order session expired. Contact support with your payment ID ' + pi + '.') }
  if (t.rzp !== oi || t.o.email !== u.email) throw new E('Order mismatch.');
  let payment;
  try { payment = await rz().payments.fetch(pi); } catch (x) { throw new E('Payment signature is valid, but Razorpay could not confirm the payment status. Do not pay again; check My Orders or contact support with payment ID ' + pi + '.', 503); }
  if (!payment || payment.order_id !== oi || Number(payment.amount) !== Number(t.o.total) * 100 || String(payment.currency || '') !== 'INR') throw new E('Razorpay payment details do not match this order. Do not retry payment; contact support with payment ID ' + pi + '.', 400);
  if (payment.status !== 'captured') throw new E('Payment is not captured yet. Do not pay again; Juno will confirm the order after Razorpay reports capture. Keep payment ID ' + pi + ' for reference.', 409);
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
      else {
        const o = JSON.parse(row[1]);
        let confirmed;
        try { confirmed = await rz().payments.fetch(pid); } catch (x) { throw new E('Razorpay could not verify the webhook payment. Retry webhook delivery.', 503); }
        if (!confirmed || confirmed.order_id !== oid || Number(confirmed.amount) !== Number(o.total) * 100 || String(confirmed.currency || '') !== 'INR' || confirmed.status !== 'captured') {
          console.error('webhook: payment details mismatch; refusing to record paid order', oid);
          throw new E('Payment amount, currency or capture status mismatch.', 400);
        }
        await recordPaid(o, pid, oid);
      }
    }
  } else if (ev.event === 'refund.processed' || ev.event === 'refund.created') {
    const pid = pl.refund && pl.refund.entity && pl.refund.entity.payment_id, rows = await sheets.read('Orders'), i = rows.findIndex((r, k) => k > 0 && r[15] === pid);
    if (i > 0) {
      const row = Array.from({ length: 20 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]); row[OIDX.pay] = ev.event === 'refund.processed' ? 'Refunded' : 'Refund pending'; await sheets.update('Orders', i + 1, row);
      try { const ledger = await sheets.read('SellerLedger'); for (let k = 1; k < ledger.length; k++) if (String(ledger[k][2] || '') === String(rows[i][0] || '')) { const lr = ledger[k].slice(); while (lr.length < 17) lr.push(''); lr[12] = 'REFUND_REVIEW'; lr[15] = now(); lr[16] = 'Refund event received; reconcile refund allocation and any payout manually before settlement.'; await sheets.update('SellerLedger', k + 1, lr); } } catch (x) { console.error('refund received but seller ledger review update failed', rows[i][0], x && x.message); }
    }
  } else if (ev.event === 'payment.failed') {
    const failed = (pl.payment && pl.payment.entity) || {}, oid = String(failed.order_id || ''), pid = String(failed.id || '');
    if (oid) {
      const pending = await sheets.read('Pending'), pi = pending.findIndex((r, k) => k > 0 && String(r[0]) === oid);
      if (pi > 0) {
        const current = String(pending[pi][3] || '');
        const terminal = ['recorded', 'seller_reconciliation_required', 'stock_reconciliation_required'];
        let saved = {}; try { saved = JSON.parse(pending[pi][1] || '{}') } catch (x) {}
        const orders = await sheets.read('Orders');
        const alreadyPaid = orders.slice(1).some(r => String(r[0] || '') === String(saved.id || '') || (pid && String(r[15] || '') === pid));
        // A failed attempt must never downgrade a successfully recorded payment.
        if (!terminal.includes(current) && !alreadyPaid) await markPending(oid, 'payment_failed');
      }
    }
    // Do not log gateway descriptions: they can contain provider/user-supplied data.
    console.error('payment failed; pending status updated when an eligible attempt was found');
  }
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
  limit('rs:' + ip(e), 10, 36e5); const pw = String(b.password || '');
  const policyError = passwordPolicyError(pw); if (policyError) throw new E(policyError, 400);
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
  const reason = clean(b.reason).slice(0, 100); let details = clean(b.details).slice(0, 400); if (!reason) throw new E('Please choose a reason.');
  const orders = await sheets.read('Orders'), i = orders.findIndex((r, k) => k > 0 && r[0] === clean(b.orderId) && String(r[3]).toLowerCase() === u.email); if (i < 0) throw new E('Order not found.', 404);
  const st = orders[i][17] || 'New';
  if (st === 'Cancelled' || st === 'Returned') throw new E('This order is already ' + st.toLowerCase() + '.');
  const reqs = await sheets.read('Requests'); if (reqs.some((r, k) => k > 0 && r[2] === orders[i][0] && r[4] === type && !['Rejected', 'Closed'].includes(r[7]))) throw new E('You already have a ' + type.toLowerCase() + ' request for this order.');
  let status = 'Requested', message = 'Request received. We will update the status in your account.';
  if (type === 'Cancel') {
    if (st === 'New') { const row = padOrder(orders[i]); row[OIDX.status] = 'Cancelled'; await sheets.update('Orders', i + 1, row); status = 'Approved'; message = 'Order cancelled. If you paid online, Juno will review the refund and update its status.' }
    else if (st === 'Packed') message = 'Your order is already packed. We will try to stop it and confirm shortly.';
    else throw new E(st === 'Delivered' ? 'This order was delivered. You can request a return instead.' : 'This order has already shipped, so it cannot be cancelled. You can request a return after delivery.');
  } else {
    if (st !== 'Delivered') throw new E('Returns can be requested after delivery.');
    const deliveredText = noteMarker(orders[i][19], 'DELIVERED_AT');
    const deliveredAt = deliveredText ? Date.parse(deliveredText) : NaN;
    let reviewNote = '';
    let itemCategories = [];
    try {
      const pending = await sheets.read('Pending');
      const pendingRow = pending.slice(1).find(r => { try { return String(JSON.parse(r[1] || '{}').id || '') === String(orders[i][0]); } catch (x) { return false; } });
      if (pendingRow) {
        const saved = JSON.parse(pendingRow[1] || '{}');
        itemCategories = Array.isArray(saved.itemDetails) ? saved.itemDetails.map(it => String(it.category || '')) : [];
      }
    } catch (x) { /* older orders may not have a pending checkout row; route them for manual review */ }
    const exceptionReason = /damaged|defective|wrong item|not as shown/i.test(reason);
    if (Number.isFinite(deliveredAt)) {
      const age = Date.now() - deliveredAt;
      if (age < -5 * 60 * 1000) throw new E('Delivery timestamp is invalid. Please contact support.', 409);
      if (exceptionReason && age > 48 * 60 * 60 * 1000) throw new E('Damaged, defective or wrong-item reports must be submitted within 48 hours of delivery. Please contact support if you need an exception.');
      if (age > 7 * 24 * 60 * 60 * 1000) throw new E('Return requests must be submitted within 7 days of delivery. Please contact support if you need an exception.');
    } else {
      reviewNote = 'Manual eligibility review required: delivery timestamp is unavailable.';
    }
    if (itemCategories.length) {
      const hygieneSensitive = itemCategories.some(cat => /earring|hair.?accessor|hair.?clip|claw.?clip|hair.?band|scrunchie|ring|jewel/i.test(cat));
      if (hygieneSensitive && !exceptionReason) throw new E('This item is hygiene-sensitive and can be returned only if damaged, defective or the wrong item.');
    } else {
      reviewNote = [reviewNote, 'Manual eligibility review required: product categories are unavailable.'].filter(Boolean).join(' ');
    }
    details = [details, reviewNote].filter(Boolean).join(' | ').slice(0, 400);
  }
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
// Public liveness endpoint: do not disclose environment/configuration details anonymously.
const health = async () => ({ ok: true, service: 'Juno API', diagnostics: 'Admin authentication required for security diagnostics.' });

const securityHealth = async (b, e) => {
  const u = bearer(e);
  if (!u || !u.admin) throw new E('Admin login required.', 401);
  const names = ['SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'JWT_SECRET', 'ADMIN_PASSWORD', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'BREVO_API_KEY', 'MAIL_FROM'];
  const env = {};
  names.forEach(k => { env[k] = process.env[k] ? 'set' : 'MISSING'; });
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  const privateKey = !key ? 'MISSING' : (!/BEGIN PRIVATE KEY/.test(key) || !/END PRIVATE KEY/.test(key)) ? 'format_check_failed' : /^\s*["']/.test(key) ? 'remove_wrapping_quotes' : 'format_looks_ok';
  const tabs = {};
  for (const t of ['Products', 'Users', 'Orders', 'Pending', 'Reviews', 'Requests', 'Tickets', 'ActivityLog', 'WebsiteActivity']) {
    try {
      if (t === 'ActivityLog') await sheets.ensureTab(t, ACTIVITY_HEADERS);
      else if (t === 'WebsiteActivity') await sheets.ensureTab(t, WEBSITE_ACTIVITY_HEADERS);
      await sheets.read(t);
      tabs[t] = 'ok';
    } catch (x) { tabs[t] = why(x); }
  }
  let auditWrite = 'not_tested';
  if (env.SHEET_ID === 'set' && env.GOOGLE_SERVICE_ACCOUNT_EMAIL === 'set' && env.GOOGLE_PRIVATE_KEY === 'set') {
    try {
      const id = 'JH' + Date.now().toString(36).toUpperCase();
      await sheets.append('ActivityLog', [id, now(), 'security.health_check', '', 'admin', 'success (200)', 'GET', '/api/security-health', ip(e), String((e.headers || {})['user-agent'] || '').slice(0, 250), JSON.stringify({ probe: true })]);
      auditWrite = 'ok';
    } catch (x) { auditWrite = 'failed'; tabs.ActivityLog = why(x); }
  } else auditWrite = 'blocked_missing_configuration';
  const required = ['SHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'JWT_SECRET', 'ADMIN_PASSWORD', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
  const missingRequired = required.filter(k => env[k] !== 'set');
  const failedTabs = Object.entries(tabs).filter(([, v]) => v !== 'ok').map(([k]) => k);
  const result = { checkedAt: now(), env, privateKey, tabs, auditWrite, overall: missingRequired.length || failedTabs.length || auditWrite !== 'ok' ? 'degraded' : 'ok', missingRequired, failedTabs };
  return { __raw: { statusCode: result.overall === 'ok' ? 200 : 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(result) } };
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
const visibleIds = async () => productObjs(await productRows()).filter(p => p['product id'] && num(p['selling price']) > 0 && num(p['selling price']) <= 500 && String(p['show on site']).toLowerCase() !== 'no' && (!p['approval status'] || String(p['approval status']).toLowerCase() === 'approved') && (!String(p['seller id'] || '').trim() || marketplaceSellerSalesEnabled())).map(p => p['product id']);
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
    await ensureMarketplaceTabs();
    const [o, p, us, rv, rq, tk, so, sl, sellers] = await Promise.all([sheets.read('Orders'), productRows(true), sheets.read('Users'), sheets.read('Reviews').catch(() => []), sheets.read('Requests').catch(() => []), sheets.read('Tickets').catch(() => []), sheets.read('SellerOrders').catch(() => []), sheets.read('SellerLedger').catch(() => []), sheets.read('Sellers').catch(() => [])]);
    return { sellers: sellers.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 10 }, (_, j) => r[j] == null ? '' : r[j]) })), sellerLedger: sl.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 17 }, (_, j) => r[j] == null ? '' : r[j]) })), sellerOrders: so.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 20 }, (_, j) => r[j] == null ? '' : r[j]) })), orders: o.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 20 }, (_, j) => r[j] == null ? '' : r[j]) })), products: productObjs(p), reviews: rv.slice(1).map((r, i) => ({ row: i + 2, id: r[0] || '', pid: r[1] || '', name: r[2] || '', rating: r[4] || '', comment: r[5] || '', date: r[6] || '', verified: r[7] || '', status: r[8] || '' })), requests: rq.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 9 }, (_, j) => r[j] == null ? '' : r[j]) })), tickets: tk.slice(1).map((r, i) => ({ row: i + 2, v: Array.from({ length: 11 }, (_, j) => r[j] == null ? '' : r[j]) })), users: us.slice(1).map((r, i) => ({ row: i + 2, name: r[0] || '', email: r[1] || '', phone: r[3] || '', joined: r[4] || '', last: r[5] || '', count: r[6] || 0 })) };
  }
  if (b.action === 'updateOrder') {
    const rows = await sheets.read('Orders'), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id); if (i < 0) throw new E('Order not found.', 404);
    const row = Array.from({ length: 20 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]);
    const oldStatus = String(row[OIDX.status] || 'New');
    if (b.status != null) row[OIDX.status] = clean(b.status);
    if (b.tracking != null) row[OIDX.track] = clean(b.tracking);
    if (b.pay != null) throw new E('Payment status is controlled by verified Razorpay events and cannot be edited manually.');
    if (b.notes != null) row[OIDX.notes] = clean(b.notes);
    const deliveredMarker = noteMarker(rows[i][OIDX.notes], 'DELIVERED_AT');
    if (row[OIDX.status] === 'Delivered' && oldStatus !== 'Delivered') {
      row[OIDX.notes] = setNoteMarker(row[OIDX.notes], 'DELIVERED_AT', new Date().toISOString());
    } else if (deliveredMarker && !noteMarker(row[OIDX.notes], 'DELIVERED_AT')) {
      row[OIDX.notes] = setNoteMarker(row[OIDX.notes], 'DELIVERED_AT', deliveredMarker);
    }
    await sheets.update('Orders', i + 1, row); return { ok: true };
  }
  if (b.action === 'setReview') {
    const rows = await sheets.read('Reviews'), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id); if (i < 0) throw new E('Review not found.', 404);
    const row = Array.from({ length: 9 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]); row[8] = b.status === 'Hidden' ? 'Hidden' : 'Approved'; await sheets.update('Reviews', i + 1, row); return { ok: true };
  }
  if (b.action === 'updateRequest') {
    const ST = ['Requested', 'Approved', 'Rejected', 'Pickup scheduled', 'Refunded', 'Closed'];
    if (!ST.includes(b.status)) throw new E('Bad status.');
    const rows = await sheets.read('Requests'), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id);
    if (i < 0) throw new E('Request not found.', 404);
    const row = Array.from({ length: 9 }, (_, j) => rows[i][j] == null ? '' : rows[i][j]);
    const oldStatus = String(row[7] || 'Requested'), type = String(row[4] || '').toLowerCase();
    const approvingSeller = type === 'seller application' && b.status === 'Approved' && oldStatus !== 'Approved';
    if (approvingSeller && (!process.env.BREVO_API_KEY || !process.env.MAIL_FROM)) {
      throw new E('Configure BREVO_API_KEY and MAIL_FROM before approving this seller application so Juno can send the activation link.', 500);
    }
    const want = type === 'cancel' && b.status === 'Approved' ? 'Cancelled' : type === 'return' && b.status === 'Refunded' ? 'Returned' : '';
    let orderRows = null, orderIndex = -1, orderRow = null;
    if (want) {
      orderRows = await sheets.read('Orders');
      orderIndex = orderRows.findIndex((r, n) => n > 0 && r[0] === row[2]);
      if (orderIndex < 0) throw new E('Related order not found.', 404);
      orderRow = padOrder(orderRows[orderIndex]);
      if (want === 'Returned' && orderRow[OIDX.pay] !== 'Refunded') {
        throw new E('Complete the Razorpay refund and wait for the verified refund webhook before marking this return as Refunded.');
      }
    }
    row[7] = b.status; row[8] = clean(b.notes);
    await sheets.update('Requests', i + 1, row);
    if (approvingSeller) {
      let details = {}; try { details = JSON.parse(row[6] || '{}') } catch (x) {}
      const activation = sign({ purpose: 'seller-activate', email: String(row[3]).toLowerCase(), applicationId: row[0] }, '24h');
      const base = process.env.URL || ('https://' + ((e.headers || {}).host || ''));
      const link = base + '/seller-studio.html?activate=' + encodeURIComponent(activation);
      try {
        await mail(String(row[3]), 'Your Juno seller application is approved', '<p>Hi ' + clean(details.ownerName || details.storeName || 'there') + ',</p><p>Your seller application for <b>' + clean(details.storeName || row[5]) + '</b> has been approved.</p><p><a href="' + link + '" style="background:#d9186c;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Activate seller account</a></p><p>This secure link expires in 24 hours. If it expires, contact Juno support. Do not share it.</p>');
      } catch (mailError) {
        const rollback = row.slice(); rollback[7] = oldStatus;
        try { await sheets.update('Requests', i + 1, rollback); }
        catch (rollbackError) { console.error('Could not roll back seller approval after activation email failure', row[0], rollbackError && rollbackError.message); }
        throw new E('Could not send the seller activation email. Check Brevo/MAIL_FROM, then retry approval. The application status was restored when possible.', 502);
      }
    }
    if (want) { orderRow[OIDX.status] = want; await sheets.update('Orders', orderIndex + 1, orderRow); }
    return { ok: true };
  }
  if (b.action === 'refund') {
    const o = await sheets.read('Orders'), k = o.findIndex((r, n) => n > 0 && r[0] === b.orderId); if (k < 0) throw new E('Order not found.', 404);
    const orow = padOrder(o[k]), pid = String(orow[OIDX.payid] || ''); if (!pid.startsWith('pay_')) throw new E('No online payment ID is recorded for this order. Verify the order and payment record before starting a refund.');
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
  if (b.action === 'setSellerStatus') {
    const status = ['Active', 'Suspended'].includes(b.status) ? b.status : '';
    if (!status) throw new E('Choose Active or Suspended for the seller account.');
    const rows = await sellerRows(), i = rows.findIndex((r, k) => k > 0 && String(r[0]) === clean(b.id));
    if (i < 0) throw new E('Seller account not found.', 404);
    const row = rows[i].slice(); while (row.length < 10) row.push('');
    row[7] = status; await sheets.update('Sellers', i + 1, row);
    return { ok: true, id: row[0], status };
  }
  if (b.action === 'setSellerProductStatus') {
    const status = ['Approved', 'Rejected', 'Pending'].includes(b.status) ? b.status : '';
    if (!status) throw new E('Bad product review status.');
    const rows = await productRows(true), i = rows.findIndex((r, k) => k > 0 && r[0] === b.id);
    if (i < 0) throw new E('Product not found.', 404);
    const row = rows[i].slice(); while (row.length < 15) row.push('');
    if (!row[13]) throw new E('This is not a seller-submitted product.');
    if (status === 'Approved' && !marketplaceSellerSalesEnabled()) throw new E('Seller sales are disabled until marketplace payment settlement and inventory safeguards are configured. Set MARKETPLACE_SELLER_SALES_ENABLED=true only after launch approval.');
    row[14] = status; row[12] = status === 'Approved' ? 'Yes' : 'No';
    await sheets.update('Products', i + 1, row); invalidate(); return { ok: true };
  }
  if (b.action === 'saveProduct') {
    const p = b.product || {}, rows = await productRows(true); let id = clean(p.id);
    const name = clean(p.name), sp = num(p.price), mrp = num(p.mrp) || sp;
    if (!name || !(sp > 0)) throw new E('Name and selling price are required.');
    if (sp > 500) throw new E('Juno selling prices must be ₹500 or less.');
    if (mrp < sp || mrp > 100000) throw new E('MRP must be at least the selling price and no more than ₹100000.');
    if (!id) { const mx = rows.slice(1).reduce((m, r) => Math.max(m, +String(r[0] || '').replace(/\D/g, '') || 0), 0); id = 'TL' + String(mx + 1).padStart(3, '0') }
    const i = rows.findIndex((r, k) => k > 0 && r[0] === id);
    const row = [id, name, clean(p.cat) || 'More', clean(p.g) || 'Unisex', mrp, sp, clean(p.details), clean(p.sizes), String(p.image || '').trim().slice(0, 500), p.stock === '' || p.stock == null ? '' : num(p.stock), /^y/i.test(p.sale) ? 'Yes' : 'No', num(p.rating) || 4.2, /^n/i.test(p.show) ? 'No' : 'Yes'];
    if (i > 0) { const existing = rows[i]; while (row.length < existing.length) row.push(existing[row.length] == null ? '' : existing[row.length]); if (existing[13]) row[13] = existing[13]; if (existing[13] && existing[14] === 'Pending') row[12] = 'No'; await sheets.update('Products', i + 1, row); }
    else await sheets.append('Products', [...row, '', 'Approved']);
    invalidate(); return { ok: true, id };
  }
  throw new E('Unknown action.');
};
module.exports = { E, json, wrap, products, signup, login, customerProfile, updateCustomerProfile, forgot, reset, webhook, health, securityHealth, reviews, addReview, returnRequest, myRequests, ticket, myTickets, pincode, signals, visibleIds, trackWebsiteActivity, sellerApply, sellerActivate, sellerLogin, sellerProducts, sellerOrders, placeCod, createOrder, verifyPayment, myOrders, admin, _t: { price, nk, csv, recordPaid, buildOrder, setRazorpayOverride: client => { razorpayOverride = client || null }, safeActivityDetails } };
