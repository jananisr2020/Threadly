'use strict';
const assert = require('node:assert/strict');
const { auditProduct, csvCell } = require('./audit-image-provenance');

const missing = auditProduct({ id: 'JN1', name: 'Clip' }, 0);
assert.equal(missing.status, 'IMAGE_MISSING');
const noProvenance = auditProduct({ id: 'JN2', name: 'Bow', img: 'https://example.test/bow.jpg' }, 1);
assert.equal(noProvenance.status, 'PROVENANCE_MISSING');
const needsHuman = auditProduct({
  id: 'JN3', name: 'Scrunchie', img: 'https://example.test/scrunchie.jpg',
  imageSourceUrl: 'https://seller.example.test/item/3', imageLicense: 'Seller supplied; permission recorded'
}, 2);
assert.equal(needsHuman.status, 'HUMAN_REVIEW_REQUIRED', 'automated metadata must never mark imagery approved');
assert.ok(csvCell('=HYPERLINK("x")').startsWith('"\'='));
assert.equal(csvCell('Clip, "gold"'), '"Clip, ""gold"""');
console.log('Image provenance audit tests passed (missing image, missing provenance, human review gate, CSV injection/escaping).');
