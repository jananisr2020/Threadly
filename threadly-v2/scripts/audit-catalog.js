#!/usr/bin/env node
'use strict';

// Offline structural audit for the bundled Juno catalogue.
// Run from threadly-v2 with: node scripts/audit-catalog.js

const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'public', 'catalog.json');
let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  console.error('FAIL: Could not read/parse public/catalog.json:', error.message);
  process.exit(1);
}

const products = Array.isArray(data.products) ? data.products : [];
const errors = [];
const warnings = [];
const ids = new Set();
const names = new Map();
const categoryCounts = new Map();
const imageUrls = new Set();
const hostCounts = new Map();
let productsWithFiveGalleryImages = 0;
let productsWithDuplicateGalleryUrls = 0;
let genericImageProviderCount = 0;

for (const [index, product] of products.entries()) {
  const label = product.id || 'row ' + (index + 1);
  if (!product.id) errors.push(label + ': missing id');
  if (ids.has(product.id)) errors.push(label + ': duplicate product id');
  ids.add(product.id);

  if (!String(product.name || '').trim()) errors.push(label + ': missing name');
  if (!String(product.cat || '').trim()) errors.push(label + ': missing cat/category');
  if (!String(product.g || '').trim()) warnings.push(label + ': missing audience/group');
  if (typeof product.price !== 'number' || product.price < 0) errors.push(label + ': invalid price');
  if (typeof product.mrp !== 'number' || product.mrp < product.price) {
    errors.push(label + ': MRP is missing or below selling price');
  }

  const nameKey = String(product.name || '').trim().toLowerCase();
  names.set(nameKey, (names.get(nameKey) || 0) + 1);
  const category = String(product.cat || 'MISSING').trim();
  categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

  const gallery = Array.isArray(product.images) ? product.images : [];
  if (gallery.length >= 5) productsWithFiveGalleryImages++;
  if (new Set(gallery).size !== gallery.length) {
    productsWithDuplicateGalleryUrls++;
    warnings.push(label + ': duplicate URL inside gallery');
  }

  for (const url of [product.img, ...gallery].filter(Boolean)) {
    imageUrls.add(url);
    try {
      const parsed = new URL(url);
      hostCounts.set(parsed.hostname, (hostCounts.get(parsed.hostname) || 0) + 1);
      if (/loremflickr\.com/i.test(parsed.hostname)) genericImageProviderCount++;
    } catch {
      errors.push(label + ': malformed image URL: ' + url);
    }
  }
  if (!product.img) warnings.push(label + ': missing primary image');
}

for (const [name, count] of names) {
  if (name && count > 1) warnings.push('Repeated product name (' + count + '): ' + name);
}
if (data.productCount !== products.length) {
  errors.push('productCount metadata says ' + data.productCount + ', actual rows: ' + products.length);
}
if (data.categoryCount !== categoryCounts.size) {
  errors.push('categoryCount metadata says ' + data.categoryCount + ', actual categories: ' + categoryCounts.size);
}
if (genericImageProviderCount) {
  warnings.push(genericImageProviderCount + ' image URLs use loremflickr.com; URLs being unique does not prove the photo matches the exact product/SKU.');
}

console.log('JUNO CATALOGUE AUDIT');
console.log('Products:', products.length);
console.log('Categories:', categoryCounts.size);
console.log('Products with 5+ gallery URLs:', productsWithFiveGalleryImages);
console.log('Unique image URLs (primary + gallery):', imageUrls.size);
console.log('Image hosts:', [...hostCounts.entries()].map(([host, count]) => host + ': ' + count).join(', ') || 'none');
console.log('\nCATEGORY COUNTS');
for (const [category, count] of [...categoryCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(String(count).padStart(3) + '  ' + category);
}
console.log('\nErrors:', errors.length);
for (const item of errors) console.log('ERROR:', item);
console.log('Warnings:', warnings.length);
for (const item of warnings) console.log('WARN:', item);

if (errors.length) process.exitCode = 1;
