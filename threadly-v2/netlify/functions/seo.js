const core = require('../lib/core');
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
exports.handler = async e => {
  const base = process.env.URL || 'https://' + ((e.headers || {})['x-forwarded-host'] || (e.headers || {}).host || ''), f = (e.queryStringParameters || {}).f;
  if (f === 'robots') return { statusCode: 200, headers: { 'Content-Type': 'text/plain' }, body: `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${base}/sitemap.xml\n` };
  let ids = []; try { ids = await core.visibleIds() } catch (x) { console.error('sitemap: products unavailable') }
  const urls = ['/', '/shipping-policy.html', '/refund-policy.html', '/privacy-policy.html', '/terms.html', '/cookie-policy.html', '/contact.html', ...ids.map(i => '/?p=' + encodeURIComponent(i))];
  return { statusCode: 200, headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }, body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(u => '<url><loc>' + esc(base + u) + '</loc></url>').join('') + '</urlset>' };
};
