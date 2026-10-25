// Central coupon rules used by the storefront and server-side checkout.
// pct = percent off, flat = rupees off, min = minimum item subtotal,
// max = maximum discount in rupees, expires = final valid date (YYYY-MM-DD).
const COUPONS = {
  JUNO10: { pct: 10, label: 'Extra 10% off' },
  THREAD10: { pct: 10, label: 'Extra 10% off' },
  WELCOME50: { flat: 50, min: 299, label: 'Rs 50 off above Rs 299' },
  JUNO15: { pct: 15, min: 599, max: 150, label: '15% off above Rs 599 (max Rs 150)' },
  JUNOFEST10: { pct: 10, max: 50, start: '2026-10-25', expires: '2026-11-08', label: 'Festive Edit: 10% off (max Rs 50)' },
  LASTCHANCE15: { pct: 15, max: 75, start: '2026-11-11', expires: '2026-11-18', label: 'Last-Chance Edit: 15% off (max Rs 75)' },
  DIWALIGLOW15: { pct: 15, max: 75, start: '2026-11-05', expires: '2026-11-09', label: 'Diwali Glow: 15% off (max Rs 75)' },
  PINKFRIDAY15: { pct: 15, max: 75, start: '2026-11-27', expires: '2026-11-30', label: 'Pink Friday: 15% off (max Rs 75)' },
  FRESHSTART10: { pct: 10, max: 50, start: '2026-12-28', expires: '2027-01-02', label: 'Fresh Start: 10% off (max Rs 50)' },
  FREEDOM10: { pct: 10, max: 50, start: '2027-01-20', expires: '2027-01-26', label: 'Freedom Finds: 10% off (max Rs 50)' },
  SUMMERSWITCH10: { pct: 10, max: 50, start: '2027-04-15', expires: '2027-04-30', label: 'Summer Switch: 10% off (max Rs 50)' },
  MONSOONMOOD10: { pct: 10, max: 50, start: '2027-07-10', expires: '2027-07-19', label: 'Monsoon Mood: 10% off (max Rs 50)' },
  AUGUSTEDIT10: { pct: 10, max: 50, start: '2027-08-10', expires: '2027-08-15', label: 'August Edit: 10% off (max Rs 50)' },
  FESTIVE2027: { pct: 10, max: 50, start: '2027-09-25', expires: '2027-10-19', label: 'Festive Edit: 10% off (max Rs 50)' },
  LITTLELOVE10: { pct: 10, max: 50, start: '2027-02-10', expires: '2027-02-14', label: 'Little Love: 10% off (max Rs 50)' },
  COLOURPOP10: { pct: 10, max: 50, start: '2027-03-18', expires: '2027-03-23', label: 'Colour Pop: 10% off (max Rs 50)' }
};

const active = rule => {
  const now = Date.now();
  const starts = !rule.start || now >= new Date(rule.start + 'T00:00:00+05:30').getTime();
  const ends = !rule.expires || now <= new Date(rule.expires + 'T23:59:59+05:30').getTime();
  return starts && ends;
};

function discount(code, subtotal) {
  const rule = COUPONS[String(code || '').trim().toUpperCase()];
  if (!rule || !active(rule) || subtotal < (rule.min || 0)) return 0;
  let amount = rule.pct ? Math.round(subtotal * rule.pct / 100) : (rule.flat || 0);
  if (rule.max) amount = Math.min(amount, rule.max);
  return Math.max(0, Math.min(amount, subtotal));
}

const publicList = () => Object.fromEntries(
  Object.entries(COUPONS).filter(([, rule]) => active(rule))
);

module.exports = { discount, publicList };
