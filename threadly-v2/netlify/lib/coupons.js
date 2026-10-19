// Central coupon rules used by the storefront and server-side checkout.
// pct = percent off, flat = rupees off, min = minimum item subtotal,
// max = maximum discount in rupees, expires = final valid date (YYYY-MM-DD).
const COUPONS = {
  JUNO10: { pct: 10, label: 'Extra 10% off' },
  THREAD10: { pct: 10, label: 'Extra 10% off' },
  WELCOME50: { flat: 50, min: 299, label: 'Rs 50 off above Rs 299' },
  JUNO15: { pct: 15, min: 599, max: 150, label: '15% off above Rs 599 (max Rs 150)' }
};

const active = rule => !rule.expires || new Date() <= new Date(rule.expires + 'T23:59:59+05:30');

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
