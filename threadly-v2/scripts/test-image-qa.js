'use strict';
const assert = require('node:assert/strict');
const { cell, get, serialize } = require('./export-image-qa');

for (const value of ['=1+1', '   =1+1', '\t+SUM(A1:A2)', '@cmd', '-1+2']) {
  const result = cell(value);
  assert.ok(result.startsWith('"\''), 'formula-like cell must be apostrophe-prefixed: ' + JSON.stringify(value));
}
assert.equal(cell('plain text'), '"plain text"');
assert.equal(cell('say "hello"'), '"say ""hello"""');
assert.equal(cell(null), '""');
assert.equal(get({ id: 'JN1', title: 'Clip' }, ['id']), 'JN1');
assert.equal(get({ id: '', title: 'Clip' }, ['id', 'title']), 'Clip');
const csv = serialize([['Product ID', 'Product Name'], ['JN1', 'Clip, "gold"']]);
assert.equal(csv, '"Product ID","Product Name"\r\n"JN1","Clip, ""gold"""\r\n', 'CSV headers and data must be escaped exactly once');
assert.equal(csv.split('\r\n')[1].split(',').length, 3, 'quoted commas must remain inside a single CSV field');
console.log('Image QA exporter tests passed (formula injection, CSV escaping, nulls, field fallback and full-row serialization).');
