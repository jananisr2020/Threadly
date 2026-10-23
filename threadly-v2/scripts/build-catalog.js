#!/usr/bin/env node
'use strict';

// Validate the bundled catalogue and emit compact JSON for the deployed static asset.
// This is deliberately dependency-free so Netlify can run it without a paid image/CDN service.
const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../public/catalog.json');
const source = fs.readFileSync(file, 'utf8');
const catalogue = JSON.parse(source);
if (!catalogue || !Array.isArray(catalogue.products) || catalogue.products.length < 100) {
  throw new Error('Catalogue must contain at least 100 products.');
}
if (Number(catalogue.productCount) !== catalogue.products.length) {
  throw new Error('productCount does not match products.length.');
}
const ids = new Set();
for (const product of catalogue.products) {
  if (!product || !String(product.id || '').trim()) throw new Error('Every product must have an ID.');
  if (ids.has(String(product.id))) throw new Error('Duplicate product ID: ' + product.id);
  ids.add(String(product.id));
  const price = Number(product.price), mrp = Number(product.mrp), off = Number(product.off);
  if (!(price > 0 && price <= 500)) throw new Error('Product price must be ₹1–₹500: ' + product.id);
  if (!(mrp >= price)) throw new Error('Product MRP must be at least its selling price: ' + product.id);
  const expectedOff = Math.max(0, Math.round((mrp - price) / mrp * 100));
  if (off !== expectedOff) throw new Error('Product discount is inconsistent with MRP: ' + product.id);
}
const compact = JSON.stringify(catalogue) + '\n';
fs.writeFileSync(file, compact, 'utf8');
const before = Buffer.byteLength(source);
const after = Buffer.byteLength(compact);
const saved = Math.max(0, before - after);
console.log('Catalogue build passed: ' + catalogue.products.length + ' products; ' + before + ' → ' + after + ' bytes; ' + saved + ' bytes (' + (before ? Math.round(saved / before * 100) : 0) + '%) whitespace removed.');
