'use strict';
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..');
const input = path.join(appRoot, 'public', 'catalog.json');
const output = path.join(repoRoot, 'PRODUCT_IMAGE_QA.csv');

function cell(value) {
  let text = String(value == null ? '' : value).trim();
  if (/^\s*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function get(product, keys) {
  for (const key of keys) if (product[key] != null && String(product[key]).trim()) return product[key];
  return '';
}
function main() {
  const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
  const products = Array.isArray(raw) ? raw : raw && Array.isArray(raw.products) ? raw.products : null;
  if (!products) throw new Error('catalog.json must contain a product array or a { products: [] } object.');
  const seen = new Set();
  const rows = [[
    'Product ID', 'Product Name', 'Category', 'Selling Price (INR)',
    'Current Image URL', 'Replacement Image URL', 'Original Source URL',
    'Usage Permission / License', 'QA Status', 'Reviewer Notes'
  ]];
  let missing = 0, duplicates = 0;
  for (const product of products) {
    const id = get(product, ['id', 'productId', 'product_id', 'Product ID']);
    const name = get(product, ['name', 'title', 'productName', 'product_name', 'Product Name']);
    const category = get(product, ['category', 'cat', 'Category']);
    const price = get(product, ['price', 'sellingPrice', 'selling_price', 'Selling Price']);
    const image = get(product, ['image', 'imageUrl', 'image_url', 'Image']);
    const key = String(id || name).trim().toLowerCase();
    if (key && seen.has(key)) duplicates++;
    if (key) seen.add(key);
    if (!image) missing++;
    rows.push([id, name, category, price, image, '', '', '', image ? 'Needs QA' : 'Image needed', 'Use a real photo matching this exact product; verify rights, variant, crop and mobile readability.']);
  }
  fs.writeFileSync(output, '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n', 'utf8');
  console.log('Product image QA CSV created: ' + output);
  console.log('Products: ' + products.length + '; missing image URLs: ' + missing + '; duplicate IDs/names: ' + duplicates);
  console.log('Do not treat this template as image approval; fill source/permission fields and set QA Status to Approved only after human review.');
}
if (require.main === module) {
  try { main(); } catch (error) { console.error('Image QA export failed: ' + error.message); process.exitCode = 1; }
}

module.exports = { cell, get, main };
