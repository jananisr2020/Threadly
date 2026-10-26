const sheets = require('../lib/sheets');

const HEADERS = [
  'material_id', 'category', 'material_name', 'variant', 'unit',
  'qty_on_hand', 'qty_reserved', 'reorder_level', 'unit_cost_inr',
  'supplier', 'supplier_sku', 'last_counted_at', 'storage_location',
  'quality_status', 'notes'
];

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
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' });
  }
  if (!process.env.SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return json(503, { error: 'Inventory is not configured yet.', inventoryConfigured: false });
  }

  try {
    await sheets.ensureTab('MaterialsStock', HEADERS);
    const rows = await sheets.read('MaterialsStock');
    if (rows.length < 2) {
      return json(200, {
        inventoryConfigured: true,
        availability: 'confirmation_required',
        message: 'No verified material counts are recorded yet.',
        materials: []
      });
    }
    const headers = rows[0].map(value => String(value || '').trim());
    const col = name => headers.indexOf(name);
    const get = (row, name) => {
      const i = col(name);
      return i < 0 ? '' : String(row[i] == null ? '' : row[i]).trim();
    };

    const materials = rows.slice(1).filter(row => get(row, 'material_id') && get(row, 'material_name')).map(row => {
      const onHandText = get(row, 'qty_on_hand');
      const reservedText = get(row, 'qty_reserved');
      const quality = get(row, 'quality_status').toLowerCase();
      const counted = Boolean(get(row, 'last_counted_at') && onHandText !== '' && Number.isFinite(Number(onHandText)) && Number.isFinite(Number(reservedText || '0')));
      const availableQty = counted ? Math.max(0, Number(onHandText) - Number(reservedText || '0')) : null;
      let availability = 'confirmation_required';
      if (['hold', 'damaged', 'inactive', 'do_not_use'].includes(quality)) availability = 'unavailable';
      else if (counted) availability = availableQty > 0 ? 'available' : 'unavailable';
      return {
        materialId: get(row, 'material_id'),
        category: get(row, 'category'),
        name: get(row, 'material_name'),
        variant: get(row, 'variant'),
        unit: get(row, 'unit'),
        availability,
        lastCountedAt: get(row, 'last_counted_at') || null
      };
    });

    return json(200, {
      inventoryConfigured: true,
      availability: materials.length ? 'live_check' : 'confirmation_required',
      message: 'Availability is indicative only; Juno must reconfirm stock before quoting or reserving.',
      materials
    });
  } catch (error) {
    console.error('design-inventory: could not read stock', error && error.message);
    return json(503, { error: 'Inventory is temporarily unavailable.', inventoryConfigured: false });
  }
};
