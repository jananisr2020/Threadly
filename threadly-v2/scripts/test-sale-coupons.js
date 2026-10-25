const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { discount, publicList } = require('../netlify/lib/coupons');
const source = fs.readFileSync(path.join(__dirname, '..', 'netlify', 'lib', 'coupons.js'), 'utf8');
assert.equal(discount('JUNO10', 100), 10, 'existing JUNO10 coupon must remain functional');
assert.equal(discount('WELCOME50', 299), 50, 'existing WELCOME50 coupon must remain functional');
assert.equal(discount('JUNO15', 500), 0, 'JUNO15 minimum subtotal must remain enforced');
for (const code of ['JUNOFEST10','DIWALIGLOW15','LASTCHANCE15','PINKFRIDAY15','FRESHSTART10','FREEDOM10','LITTLELOVE10','COLOURPOP10','SUMMERSWITCH10','MONSOONMOOD10','AUGUSTEDIT10','FESTIVE2027']) {
  assert.match(source, new RegExp(code + ':\\s*\\{'), code + ' must have a configured timed rule');
  const rule = source.match(new RegExp(code + ':\\s*\\{([^}]+)\\}'))?.[1] || '';
  assert.match(rule, /start:\s*'20\d\d-\d\d-\d\d'/, code + ' needs a start date');
  assert.match(rule, /expires:\s*'20\d\d-\d\d-\d\d'/, code + ' needs an expiry date');
  assert.match(rule, /max:\s*\d+/, code + ' needs a discount cap');
}
assert.ok(Object.keys(publicList()).length >= 4, 'active public coupon list should preserve existing offers');
console.log('Juno timed coupon tests passed (existing coupons, start/end windows and discount caps).');
