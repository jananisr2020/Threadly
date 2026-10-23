'use strict';
const assert = require('node:assert/strict');
const { cell, get } = require('./export-image-qa');

for (const value of ['=1+1', '   =1+1', '\t+SUM(A1:A2)', '@cmd', '-1+2']) {
for (const value of ['=1+1', '   =1+1', '\t+SUM(A1:A2)', '@cmd', '-1+2']) {
  const result = cell(value);
  assert.ok(result.startsWith('"\''), 'formula-like cell must be apostrophe-prefixed: ' + JSON.stringify(value));
}
assert.equal(cell('plain text'), '"plain text"');
assert.equal(cell('say "hello"'), '"say ""hello"""');
assert.equal(cell(null), '""');
assert.equal(get({ id: 'JN1', title: 'Clip' }, ['id']), 'JN1');
assert.equal(get({ id: '', title: 'Clip' }, ['id', 'title']), 'Clip');
console.log('Image QA exporter tests passed (formula injection, CSV escaping, nulls and field fallback).');
