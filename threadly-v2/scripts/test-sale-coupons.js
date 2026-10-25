const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { discount, publicList } = require('../netlify/lib/coupons');
const source = fs.readFileSync(path.join(__dirname, '..', 'netlify', 'lib', 'coupons.js'), 'utf8');
assert.equal(discount('JUNO10', 100), 10);
assert.equal(discount('WELCOME50', 299), 50);
assert.equal(discount('JUNO15', 500), 0);
for (const code of ['JUNOFEST10','DIWALIGLOW15','LASTCHANCE15','PINKFRIDAY15','FRESHSTART10','FREEDOM10','LITTLELOVE10','COLOURPOP10','SUMMERSWITCH10','MONSOONMOOD10','AUGUSTEDIT10','FESTIVE2027']) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(escaped + ':\\s*\\{([^}]+)\\}'));
  assert.ok(match, code + ' must have a configured timed rule');
  assert.match(match[1], /start:\s*'20\d\d-\d\d-\d\d'/, code + ' needs a start date');
  assert.match(match[1], /expires:\s*'20\d\d-\d\d-\d\d'/, code + ' needs an expiry date');
  assert.match(match[1], /max:\s*\d+/, code + ' needs a discount cap');
}
assert.ok(Object.keys(publicList()).length >= 4);
console.log('Juno timed coupon tests passed (existing coupons, date windows and caps).');
