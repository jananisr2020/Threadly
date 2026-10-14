const { getStore } = require('@netlify/blobs');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'GET only.' });
  const productId = String((event.queryStringParameters || {}).productId || '');
  const view = Number((event.queryStringParameters || {}).view || 0);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(productId) || !Number.isInteger(view) || view < 1 || view > 5) {
    return json(400, { error: 'Invalid product image request.' });
  }
  try {
    const key = 'products/' + productId + '/' + ['front', 'side', 'back', 'detail', 'model'][view - 1] + '.png';
    const store = getStore('juno-product-images');
    const imageBlob = await store.get(key, { type: 'blob' });
    if (!imageBlob) return json(404, { error: 'Image not found yet.' });
    const bytes = Buffer.from(await imageBlob.arrayBuffer());
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      },
      body: bytes.toString('base64')
    };
  } catch (error) {
    console.error('Juno product image read failed:', error);
    return json(500, { error: 'Could not load product image.' });
  }
};
