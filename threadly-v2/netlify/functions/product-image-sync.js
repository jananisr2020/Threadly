// Scheduled lightweight dispatcher. Image generation runs in a Netlify Background Function
// because image APIs can take longer than a standard scheduled-function execution window.
exports.handler = async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const token = process.env.JUNO_IMAGE_SYNC_TOKEN;
  if (!base || !token) {
    console.error('Image sync dispatcher needs Netlify URL and JUNO_IMAGE_SYNC_TOKEN.');
    return { statusCode: 500, body: 'Image sync dispatcher is not configured.' };
  }
  try {
    const r = await fetch(base.replace(/\/$/, '') + '/.netlify/functions/product-image-sync-background', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'scheduled-image-sync' })
    });
    if (!r.ok && r.status !== 202) {
      const detail = await r.text().catch(() => '');
      console.error('Background image worker dispatch failed:', r.status, detail.slice(0, 200));
      return { statusCode: 502, body: 'Could not start image sync background worker.' };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, dispatched: true }) };
  } catch (e) {
    console.error('Background image worker dispatch failed:', e);
    return { statusCode: 502, body: 'Could not start image sync background worker.' };
  }
};
exports.config = { schedule: '*/5 * * * *' };
