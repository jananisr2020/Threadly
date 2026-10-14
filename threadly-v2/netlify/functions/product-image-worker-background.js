const { getStore } = require('@netlify/blobs');
const sheets = require('../lib/sheets');

const norm = value => String(value || '').trim().toLowerCase().replace(/\s*\(.*\)\s*$/, '');
const views = [
  { key: 'front', label: 'front-facing hero view' },
  { key: 'side', label: 'side or alternate-angle view' },
  { key: 'back', label: 'rear, reverse, or underside view where meaningful' },
  { key: 'detail', label: 'close-up detail showing material, texture, finish, stitching, or hardware' },
  { key: 'model', label: 'lifestyle view; for wearable products, show the item on an adult model, and for other products show a suitable in-use context' }
];
const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});
const safe = value => String(value || '').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100) || 'product';
const normalizeImageUrl = value => {
  const url = String(value || '').trim();
  const match = url.match(/drive\\.google\\.com\\/file\\/d\\/([^/]+)/) || url.match(/drive\\.google\\.com\\/open\\?id=([^&]+)/);
  return match ? 'https://drive.google.com/uc?export=download&id=' + match[1] : url;
};

async function openAiEdit({ apiKey, sourceBytes, contentType, productName, category, view }) {
  const prompt = [
    'Create one premium, photorealistic ecommerce product photograph for the Juno store.',
    'Product name: ' + productName + '. Category: ' + category + '.',
    'Use the uploaded image as the primary and authoritative visual reference.',
    'Preserve the same product identity, recognizable silhouette, colour, pattern, material, hardware, and design.',
    'Do not add logos, text, watermarks, extra products, or invented decorations.',
    'Use realistic lighting, a clean neutral studio background, accurate proportions, and a sharp commercial photography finish.',
    'Requested view: ' + view.label + '.',
    'If the source is generic, unclear, or does not depict the named product accurately, do not invent specific construction details; make the closest faithful view possible.',
    'One image only.'
  ].join(' ');
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const form = new FormData();
  form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('n', '1');
  form.append('image', new Blob([sourceBytes], { type: contentType }), 'reference.' + ext);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey },
      body: form,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
  const bodyText = await response.text();
  if (!response.ok) throw new Error('OpenAI image API ' + response.status + ': ' + bodyText.slice(0, 1000));
  const payload = JSON.parse(bodyText);
  const encoded = payload && payload.data && payload.data[0] && payload.data[0].b64_json;
  if (!encoded) throw new Error('OpenAI image API returned no base64 image.');
  return Buffer.from(encoded, 'base64');
}

async function getProductRow(productId) {
  const rows = await sheets.read('Products');
  if (!rows.length) throw new Error('Products sheet is empty.');
  const headers = rows[0].map(norm);
  const idCol = headers.indexOf('product id');
  if (idCol < 0) throw new Error('Products sheet has no Product ID column.');
  const rowIndex = rows.findIndex((row, i) => i > 0 && String(row[idCol] || '').trim() === String(productId).trim());
  if (rowIndex < 1) throw new Error('Product ID not found in Products sheet: ' + productId);
  const header = rows[0].slice();
  const ensure = name => {
    let i = header.findIndex(value => norm(value) === norm(name));
    if (i < 0) { i = header.length; header.push(name); }
    return i;
  };
  const imageCols = [1, 2, 3, 4, 5].map(n => ensure('AI Image ' + n));
  const statusCol = ensure('AI Images Status');
  const updatedCol = ensure('AI Images Updated');
  if (header.length !== rows[0].length) await sheets.update('Products', 1, header);
  const row = rows[rowIndex].slice();
  while (row.length < header.length) row.push('');
  return { row, rowNumber: rowIndex + 1, header, imageCols, statusCol, updatedCol };
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only.' });
  if (!process.env.JUNO_IMAGE_WORKER_TOKEN ||
      (event.headers || {})['x-juno-worker-token'] !== process.env.JUNO_IMAGE_WORKER_TOKEN) {
    return json(401, { error: 'Unauthorized.' });
  }
  const body = JSON.parse(event.body || '{}');
  const productId = String(body.productId || '').trim();
  if (!productId) return json(400, { error: 'productId is required.' });
  if (!process.env.OPENAI_API_KEY) return json(500, { error: 'OPENAI_API_KEY is missing.' });

  let sheetRow;
  try {
    sheetRow = await getProductRow(productId);
    sheetRow.row[sheetRow.statusCol] = 'Processing';
    sheetRow.row[sheetRow.updatedCol] = new Date().toISOString();
    await sheets.update('Products', sheetRow.rowNumber, sheetRow.row);

    const sourceUrl = normalizeImageUrl(body.sourceImage);
    if (!/^https?:\/\//i.test(sourceUrl)) throw new Error('This product has no valid source image URL.');
    const sourceResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(45000) });
    if (!sourceResponse.ok) throw new Error('Source image returned HTTP ' + sourceResponse.status);
    const contentType = String(sourceResponse.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      throw new Error('Source URL did not return JPEG, PNG, or WebP (received ' + (contentType || 'unknown') + ').');
    }
    const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
    if (sourceBytes.length > 20 * 1024 * 1024) throw new Error('Source image exceeds 20 MB.');
    const store = getStore('juno-product-images');
    const productKey = safe(productId);

    for (let i = 0; i < views.length; i++) {
      const key = 'products/' + productKey + '/' + views[i].key + '.png';
      const existingBlob = await store.get(key, { type: 'blob' });
      if (existingBlob) {
        sheetRow.row[sheetRow.imageCols[i]] = '/api/product-image?productId=' + encodeURIComponent(productId) + '&view=' + (i + 1);
        await sheets.update('Products', sheetRow.rowNumber, sheetRow.row);
        continue;
      }
      const png = await openAiEdit({
        apiKey: process.env.OPENAI_API_KEY,
        sourceBytes,
        contentType,
        productName: String(body.productName || productId),
        category: String(body.category || 'More'),
        view: views[i]
      });
      await store.set(key, png, { metadata: { contentType: 'image/png', productId, view: views[i].key } });
      sheetRow.row[sheetRow.imageCols[i]] = '/api/product-image?productId=' + encodeURIComponent(productId) + '&view=' + (i + 1);
      sheetRow.row[sheetRow.statusCol] = 'Processing';
      sheetRow.row[sheetRow.updatedCol] = new Date().toISOString();
      await sheets.update('Products', sheetRow.rowNumber, sheetRow.row);
    }

    sheetRow.row[sheetRow.statusCol] = 'Complete';
    sheetRow.row[sheetRow.updatedCol] = new Date().toISOString();
    await sheets.update('Products', sheetRow.rowNumber, sheetRow.row);
    return json(200, { ok: true, productId, status: 'Complete' });
  } catch (error) {
    console.error('Juno image worker failed for product', productId, error);
    if (sheetRow) {
      try {
        sheetRow.row[sheetRow.statusCol] = 'Failed: ' + String(error.message || error).slice(0, 180);
        sheetRow.row[sheetRow.updatedCol] = new Date().toISOString();
        await sheets.update('Products', sheetRow.rowNumber, sheetRow.row);
      } catch (writeError) { console.error('Could not update image status:', writeError); }
    }
    return json(500, { error: 'AI image generation failed. Check function logs and the product row status.' });
  }
};
