'use strict';
// Produce an evidence-based audit of catalogue image provenance without changing products.
// This intentionally does not approve imagery: a human must verify product match and usage rights.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'public', 'catalog.json');
const reportPath = path.resolve(root, '..', 'PRODUCT_IMAGE_PROVENANCE_AUDIT.csv');

function csvCell(value) {
  let s = String(value == null ? '' : value).trim();
  if (/^[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function first(product, keys) {
  for (const key of keys) if (product[key] != null && String(product[key]).trim()) return product[key];
  return '';
}
function auditProduct(product, index) {
  const id = first(product, ['id', 'productId', 'product_id', 'sku']) || 'row-' + (index + 1);
  const name = first(product, ['name', 'title', 'productName', 'product_name']);
  const images = Array.isArray(product.images) ? product.images : [];
  const primary = first(product, ['img', 'image', 'imageUrl', 'image_url', 'fallbackImg']) || images[0] || '';
  const source = first(product, ['imageSourceUrl', 'image_source_url', 'originalImageUrl', 'sourceUrl']);
  const rights = first(product, ['imageLicense', 'image_license', 'usagePermission', 'usage_permission', 'imageRights']);
  const localPath = typeof primary === 'string' && primary.startsWith('/') ? path.resolve(root, 'public', '.' + primary) : '';
  const localMissing = Boolean(localPath && !fs.existsSync(localPath));
  const status = !primary ? 'IMAGE_MISSING' : localMissing ? 'LOCAL_FILE_MISSING' : (!source || !rights) ? 'PROVENANCE_MISSING' : 'HUMAN_REVIEW_REQUIRED';
  return { id, name, primary, source, rights, status, viewCount: images.length, localMissing };
}
function main() {
  const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const products = Array.isArray(parsed) ? parsed : parsed && parsed.products;
  if (!Array.isArray(products)) throw new Error('catalog.json must contain a product array or { products: [] }.');
  const rows = [['Product ID', 'Product Name', 'Primary Image', 'Source URL', 'Usage Permission / License', 'Audit Status', 'Image Views']];
  const counts = {};
  for (const [index, product] of products.entries()) {
    const a = auditProduct(product || {}, index);
    counts[a.status] = (counts[a.status] || 0) + 1;
    rows.push([a.id, a.name, a.primary, a.source, a.rights, a.status, a.viewCount]);
  }
  fs.writeFileSync(reportPath, '\\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\\r\\n') + '\\r\\n', 'utf8');
  console.log(JSON.stringify({ products: products.length, statuses: counts, report: reportPath, note: 'No image is approved by this automated audit; human product-match and rights review is required.' }, null, 2));
  return { products: products.length, statuses: counts };
}
if (require.main === module) {
  try { main(); } catch (error) { console.error('Image provenance audit failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { auditProduct, csvCell, main };
