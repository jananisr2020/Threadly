const sheets = require('../lib/sheets');

const REQUIRED_HEADERS = [
  'AI Image 1', 'AI Image 2', 'AI Image 3', 'AI Image 4', 'AI Image 5',
  'AI Images Status', 'AI Images Updated'
];
const norm = value => String(value || '').trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '');
const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

exports.config = { schedule: '* * * * *' };

exports.handler = async () => {
  try {
    if (!process.env.SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
        !process.env.GOOGLE_PRIVATE_KEY || !process.env.OPENAI_API_KEY ||
        !process.env.JUNO_IMAGE_WORKER_TOKEN || !process.env.URL) {
      console.error('Juno image scheduler is missing one or more required environment variables.');
      return response(500, { error: 'Image automation is not configured.' });
    }

    let rows = await sheets.read('Products');
    if (!rows.length) return response(200, { ok: true, message: 'Products sheet is empty.' });

    const headers = rows[0].slice();
    let changed = false;
    for (const name of REQUIRED_HEADERS) {
      if (!headers.some(h => norm(h) === norm(name))) {
        headers.push(name);
        changed = true;
      }
    }
    if (changed) {
      await sheets.update('Products', 1, headers);
      rows = await sheets.read('Products');
    }

    const h = (rows[0] || []).map(norm);
    const col = name => h.indexOf(norm(name));
    const idCol = col('product id');
    const nameCol = col('product name');
    const categoryCol = col('category');
    const imageCol = h.findIndex(v => v === 'image' || v === 'image url' || v === 'image 1' || v === 'product image' || v === 'main image');
    const imageCols = [1, 2, 3, 4, 5].map(n => col('ai image ' + n));
    const statusCol = col('ai images status');
    const updatedCol = col('ai images updated');

    if (idCol < 0 || nameCol < 0 || imageCol < 0 || statusCol < 0 || updatedCol < 0) {
      return response(500, { error: 'Products sheet must contain Product ID, Product Name, Category, and Image/Image URL columns.' });
    }

    const now = new Date().toISOString();
    const hasAllImages = row => imageCols.every(i => i >= 0 && String(row[i] || '').trim().startsWith('/api/product-image?'));
    const rowsWithId = rows.slice(1).map((row, index) => ({ row, rowNumber: index + 2 }))
      .filter(item => String(item.row[idCol] || '').trim());

    // Avoid dispatching another job while a previous job is queued or running.
    const active = rowsWithId.find(({ row }) => {
      const status = String(row[statusCol] || '').trim().toLowerCase();
      const updated = Date.parse(String(row[updatedCol] || ''));
      return ['queued', 'processing'].includes(status) && Number.isFinite(updated) && Date.now() - updated < 30 * 60 * 1000;
    });
    if (active) return response(200, { ok: true, message: 'An image job is already queued or processing.' });

    // A stale job is reset so it can be retried; failed jobs are also retried on the next scan.
    const candidate = rowsWithId.find(({ row }) => {
      if (hasAllImages(row)) return false;
      const status = String(row[statusCol] || '').trim().toLowerCase();
      if (status === 'needs source image') return false;
      const updatedAt = Date.parse(String(row[updatedCol] || ''));
      if (status.startsWith('failed') && Number.isFinite(updatedAt) && Date.now() - updatedAt < 6 * 60 * 60 * 1000) return false;
      const source = String(row[imageCol] || '').trim();
      if (!/^https?:\/\//i.test(source)) return false;
      return true;
    });
    if (!candidate) return response(200, { ok: true, message: 'No products need AI images.' });

    const { row, rowNumber } = candidate;
    const productId = String(row[idCol]).trim();
    const productName = String(row[nameCol] || productId).trim();
    const sourceImage = String(row[imageCol] || '').trim();
    const category = categoryCol >= 0 ? String(row[categoryCol] || 'More').trim() : 'More';
    const status = String(row[statusCol] || '').trim().toLowerCase();
    const updated = Date.parse(String(row[updatedCol] || ''));
    if (status === 'processing' && (!Number.isFinite(updated) || Date.now() - updated >= 30 * 60 * 1000)) {
      // Explicitly overwrite stale state below.
    }

    const next = row.slice();
    while (next.length < headers.length) next.push('');
    next[statusCol] = 'Queued';
    next[updatedCol] = now;
    await sheets.update('Products', rowNumber, next);

    const workerUrl = process.env.URL.replace(/\/$/, '') + '/.netlify/functions/product-image-worker-background';
    const dispatch = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-juno-worker-token': process.env.JUNO_IMAGE_WORKER_TOKEN },
      body: JSON.stringify({ productId, productName, category, sourceImage })
    });
    if (!dispatch.ok && dispatch.status !== 202) {
      next[statusCol] = 'Failed';
      next[updatedCol] = new Date().toISOString();
      await sheets.update('Products', rowNumber, next);
      console.error('Image worker dispatch failed:', dispatch.status, await dispatch.text().catch(() => ''));
      return response(502, { error: 'Could not start the product image worker.' });
    }
    return response(200, { ok: true, productId, message: 'Queued AI gallery generation.' });
  } catch (error) {
    console.error('Juno image scheduler error:', error);
    return response(500, { error: 'Image scheduler failed.' });
  }
};
