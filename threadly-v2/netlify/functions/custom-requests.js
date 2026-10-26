const sheets = require('../lib/sheets');

const REQUEST_HEADERS = [
  'request_id', 'created_at', 'customer_contact', 'request_type',
  'product_type', 'colour', 'motif', 'design_style', 'budget',
  'notes', 'status', 'matched_artisan_id', 'quoted_price_inr',
  'quoted_lead_days', 'customer_approval_at', 'order_id', 'status_updated_at'
];

const text = value => typeof value === 'string' ? value.trim() : '';
const json = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  },
  body: JSON.stringify(payload)
});

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { Allow: 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }
  if (!process.env.SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return json(503, { error: 'Custom requests are temporarily unavailable. Please try again later.' });
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Request body must be valid JSON.' }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return json(400, { error: 'Invalid request.' });
  }

  // Honeypot field for basic bot filtering. Real rate limiting should be enabled at the edge.
  if (text(input.website)) return json(200, { ok: true, requestId: null });

  const contact = text(input.contact);
  const requestType = text(input.requestType);
  const productType = text(input.productType);
  const budget = text(input.budget);
  const notes = text(input.notes);
  const colour = text(input.colour);
  const motif = text(input.motif);
  const designStyle = text(input.style);

  if (contact.length < 5 || contact.length > 160) {
    return json(400, { error: 'Please enter an email address or phone number so Juno can follow up.' });
  }
  if (!['custom_design', 'handmade'].includes(requestType)) {
    return json(400, { error: 'Choose a valid request type.' });
  }
  if (!productType || productType.length > 80 || !budget || budget.length > 80) {
    return json(400, { error: 'Please provide a product type and budget.' });
  }
  if ([notes, colour, motif, designStyle].some(value => value.length > 1000)) {
    return json(400, { error: 'One or more fields are too long.' });
  }

  const requestId = 'JCR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const createdAt = new Date().toISOString();
  const row = [
    requestId, createdAt, contact, requestType, productType,
    colour, motif, designStyle, budget, notes, 'submitted',
    '', '', '', '', '', createdAt
  ];

  try {
    await sheets.ensureTab('CustomRequests', REQUEST_HEADERS);
    await sheets.ensureTab('MaterialsStock', [
      'material_id', 'category', 'material_name', 'variant', 'unit',
      'qty_on_hand', 'qty_reserved', 'reorder_level', 'unit_cost_inr',
      'supplier', 'supplier_sku', 'last_counted_at', 'storage_location',
      'quality_status', 'notes'
    ]);
    await sheets.ensureTab('Artisans', [
      'artisan_id', 'display_name', 'contact', 'location', 'techniques',
      'supported_products', 'materials_provided', 'capacity_per_week',
      'typical_lead_days', 'labour_rate', 'sample_work_links',
      'quality_check_status', 'active_status', 'agreed_terms_date', 'last_verified_at'
    ]);
    await sheets.ensureTab('StockMovements', [
      'movement_id', 'timestamp', 'material_id', 'movement_type', 'quantity',
      'related_request_or_order', 'actor', 'notes'
    ]);
    await sheets.append('CustomRequests', row);
    return json(201, {
      ok: true,
      requestId,
      status: 'submitted',
      message: 'Your request has been sent to Juno for review. This is not an order or confirmed quote.'
    });
  } catch (error) {
    console.error('custom-requests: could not save request', error && error.message);
    return json(503, { error: 'We could not save your request right now. Please try again later.' });
  }
};
