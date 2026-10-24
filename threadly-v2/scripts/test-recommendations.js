'use strict';

const assert = require('node:assert/strict');
const { rankRelatedProducts } = require('../public/recommendations');

const current = { id: 'JN1', cat: 'Hair Accessories', price: 100, material: 'Satin', style: 'Cute' };
const products = [
  { id: 'JN1', cat: 'Hair Accessories', price: 90, material: 'Satin', style: 'Cute' },
  { id: 'JN2', cat: 'Hair Accessories', price: 105, material: 'Satin', style: 'Cute' },
  { id: 'JN3', cat: 'Hair Accessories', price: 480 },
  { id: 'JN4', cat: 'Earrings', price: 100 },
  { id: 'JN5', cat: 'Hair Accessories', price: 0 },
  { id: 'JN6', cat: 'Hair Accessories', price: 600 },
  { id: 'JN7', cat: 'Hair Accessories', price: 90, showOnSite: 'no' },
  { id: 'JN8', cat: 'Hair Accessories', price: 99, approved: false }
];

const picks = rankRelatedProducts(current, products, 4);
assert.deepEqual(picks.map(p => p.id), ['JN2', 'JN3', 'JN4']);
// Current product, invalid prices, hidden/unapproved products must never be recommended.
assert(!picks.some(p => ['JN1', 'JN5', 'JN6', 'JN7', 'JN8'].includes(p.id)));
assert.equal(picks[0].id, 'JN2', 'closest same-category/style/material product ranks first');
assert(picks.some(p => p.id === 'JN4'), 'valid different-category items fill the rail if needed');
assert.deepEqual(rankRelatedProducts(null, products), []);
assert.deepEqual(rankRelatedProducts(current, products, 0), []);
assert.equal(rankRelatedProducts(current, products, 2).length, 2);
console.log('People-also-viewed recommendation tests passed.');
