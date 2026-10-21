# Juno Version 1 — fixed-scope delivery backlog

Last reviewed: 2026-10-21
Repository: `jananisr2020/Threadly`, app root `threadly-v2/`
Target: a launchable accessories marketplace inspired by the common shopping features of Meesho, Myntra, Amazon and Flipkart. This is not a promise to reproduce every enterprise-scale feature of those platforms.

## Fixed planning number

- **80 work items total**
- **33 confirmed complete** (code/test/CI evidence listed below)
- **47 open** (implementation, verification, external setup, or release acceptance still required)
- **Estimated effort: 50–70 working days** for one developer, assuming timely access to the Google Sheet, Netlify, Razorpay test/live setup, and email provider.
- **Calendar estimate: about 10–14 weeks** for one developer at 5 working days/week. External approval, credentials, production access or defects may extend this; the estimate is not a promise that a paid payment provider will approve marketplace payouts by a certain date.
- Suggested release gate: all P0 tasks passed; P1 tasks required for any feature advertised in V1 passed; no known critical/high security or payment bugs; production smoke test passed.
- Cash on delivery stays disabled. All customer-facing and seller-submitted product selling prices stay at or below ₹500. Launch sellers are accessories-only and free onboarding during the pilot.
- Google Sheets is the current data store. Concurrency-safe inventory and reliable multi-seller financial settlement are material risks; do not claim enterprise parity or enable automated seller transfers until tested and provider-approved.

## Confirmed complete (6)

- [x] **T01** Admin product API rejects a selling price above ₹500; regression test passes in CI.
- [x] **T02** Admin product API rejects MRP below selling price; regression test passes in CI.
- [x] **T03** Direct server-side COD handler rejects calls; regression test passes in CI.
- [x] **T04** Seller product API rejects a selling price above ₹500; regression test passes in CI.
- [x] **T05** Latest Checkout regression, Security checks and historical secret scan pass for commit `2bf380ce3e57f5cc4c740c3f4d0f4f992406b9f5`.
- [x] **T06** Repository audit tracker and benchmark scope are committed in `ECOMMERCE_AUDIT_TRACKER.md`.

## P0 — launch-blocking functionality and data integrity (T07–T30)

- [x] **T07** Run `npm run check`, `npm run check:security` and `npm test` from `threadly-v2/`; record exact logs on the latest main commit. (0.5 day)
- [ ] **T08** Verify live `/api/health` and error behavior without exposing secrets. (0.5 day)
- [ ] **T09** Verify production `SHEET_ID`, service-account access and required sheet names/headers privately. (0.5–1 day; owner setup may block)
- [ ] **T10** Verify catalogue API/Sheet data path, empty state, failure state and no misleading stale/fallback catalogue. (1 day)
- [x] **T11** Preserve Sheet selling prices/MRPs instead of silently rewriting them; filter any price above ₹500 from public listings, sitemap and checkout; admin/seller saves enforce the same ceiling. CI now validates all 604 bundled products have positive prices ≤₹500, MRP ≥ selling price, and discount percentages consistent with those values. Tests passed for commit `3f7f861c`; catalogue invariant check added in `9b5e759f`. (0.5–1 day)
- [x] **T12** Hidden and pending products are filtered from the public CSV catalogue and sitemap ID list, and checkout already rejects hidden/unapproved items. The public CSV blanks seller IDs and approval statuses so internal marketplace metadata is not exposed. Regression tests passed in CI for commit `73844422`. (0.5 day)
- [ ] **T13** Test search query, suggestions, no-result state and keyboard interaction. (0.5–1 day)
- [ ] **T14** Test category navigation and filter combinations on real catalogue data. (0.5–1 day)
- [ ] **T15** Test sorting by price, discount, newest and relevance where shown. (0.5 day)
- [ ] **T16** Test product detail route, variant selection, image failure and stock display. (0.5–1 day)
- [ ] **T17** Test cart persistence across refresh/reopen and correct removal. (0.5 day)
- [ ] **T18** Test quantity bounds, duplicate cart lines, stock checks and correct subtotal. (0.5 day)
- [x] **T19** Server order creation derives subtotal, discount, shipping and total from server-side product rows and coupon rules; client-supplied totals are not read. Regression tests verify source prices, discount, shipping and total; coupon boundary/cap tests passed in CI for commits `3f7f861c` and `8574dd9d`. (1 day)
- [x] **T20** Server order builder repeats Tamil Nadu serviceability checks. Regression tests mock a valid Coimbatore PIN and reject an out-of-state PIN. CI passed for commit `7652aca9`; live India Post lookup behavior still needs a production smoke test. (0.5 day)
- [x] **T21** Regression tests reject invalid mobile numbers and too-short delivery addresses, validate payment method, and verify server-side error handling. CI passed for commit `7652aca9`. (0.5 day)
- [ ] **T22** Backend order creation is regression-tested with an injected Razorpay test client, including server-calculated amount and Pending-row persistence (commit `8622fbde`). The real Razorpay test account and browser checkout integration still require a configured test key and live test-mode smoke test. (1 day)
- [x] **T23** Regression tests cover invalid Razorpay signatures, server-side payment fetch, rejection of authorized-but-uncaptured payments, and only recording the order/decrementing stock after a captured payment. CI passed for commit `996039f4`. (0.5–1 day)
- [x] **T24** Signed webhook regression tests cover payment.captured, payment.failed, refund.processed, captured-event replay, and refund-event replay. Captured events verify Razorpay payment status/amount/currency before recording; replay does not duplicate orders or decrement stock twice. CI passed for commit `4227e91e`. (1 day)
- [ ] **T25** Define and test inventory decrement/reservation on successful payment without overselling. (1–2 days)
- [ ] **T26** Define rollback/reconciliation for failed, abandoned and expired payment attempts. (1 day)
- [ ] **T27** Partial-write regression test now confirms a captured/paid order is preserved and flagged `STOCK_RECONCILIATION_REQUIRED` if inventory update fails (commit `6a8eeb4c`, CI passed). Still required: safe retry/reconciliation tooling for transient or multi-row Sheets failures before production. (1–2 days)
- [x] **T28** COD is rejected by direct server-side checkout, absent from storefront and admin payment-status options, and admin cannot manually change payment status; Razorpay events are authoritative. Regression tests passed for commit `ef415c97`; storefront validation passed for commit `7d22bbaf`. (0.5 day)
- [ ] **T29** Run a full prepaid test order from cart through payment, order record and customer order history. (1 day)
- [ ] **T30** Verify production deploy configuration, build base/publish/functions paths and current deployed commit. (0.5–1 day; Netlify access may block)

## P1 — customer accounts, seller workflows, orders and trust (T31–T55)

- [x] **T31** Regression tests verify weak passwords are rejected, valid signup stores a password hash, and duplicate email registration is rejected. CI passed for commit `15eff8ec`. (0.5 day)
- [x] **T32** Regression tests cover invalid credentials and successful login/token issuance; code review confirms per-IP/email login rate limiting and login metadata updates. CI passed for commit `15eff8ec`. Live session-expiry smoke testing remains in T34. (0.5 day)
- [ ] **T33** Password reset token expiry, one-time use and password-policy behavior are CI-tested in commit `be0b3ab3`; live reset-email delivery still requires Brevo/MAIL_FROM configuration and a deployed smoke test. (0.5–1 day)
- [ ] **T34** Test logout, token expiry and access after account/session changes. (0.5 day)
- [ ] **T35** Verify customer profile data is read/written only for the authenticated customer. (0.5 day)
- [ ] **T36** Confirm whether addresses are device-local or server-synced; make behavior clear and test it. (0.5–1 day)
- [ ] **T37** Test order history privacy and status refresh. (0.5 day)
- [x] **T38** Regression tests cover cancellation of New orders, cancellation requests for Packed orders, rejection after shipment/delivery, and return eligibility only after delivery. Cancellation messaging no longer promises a refund before it is processed. CI passed for commit `9fd1d38b`. (0.5–1 day)
- [x] **T39** Regression tests cover return eligibility only after delivery, admin decision visibility in customer requests, and the rule that a return cannot be marked Refunded until the verified Razorpay refund webhook has set the order payment status to Refunded. CI passed for commit `b341c45e`. (0.5–1 day)
- [x] **T40** Regression tests cover Razorpay refund initiation, exact refund amount, failed-gateway behavior, duplicate-retry rejection, signed refund webhook status update and seller-ledger reconciliation flags. CI passed for commit `2e3275e9`; live Razorpay test-mode refund smoke test remains under T22/T29. (1 day)
- [ ] **T41** Verify stock reconciliation for cancelled/returned orders and prevent overselling. (0.5–1 day)
- [x] **T42** Regression tests cover rating validation, one review per customer/product, verified-purchase flagging from order history, and approved review persistence; admin can hide/show reviews. CI passed for commit `d4ca4e6e`. (0.5 day)
- [ ] **T43** Ticket validation, persistence and admin reply updates are CI-tested in commit `cba779e4`; customer/support email delivery still needs configured Brevo/MAIL_FROM and a deployed smoke test. (0.5–1 day)
- [ ] **T44** Verify email sender configuration and customer-facing success/failure messages. (0.5 day)
- [ ] **T45** Decide which V1 messages use email versus SMS/OTP; implement only configured providers and test delivery. (1–2 days plus provider setup)
- [x] **T46** Seller application validation/consent and persistence have regression coverage; tests verify missing consent does not write a request and a valid accessories application is stored in the existing Requests tab. CI passed for commit `1822fc2a`. Duplicate/rate-limit live behavior remains part of production smoke tests. (0.5 day)
- [x] **T47** Regression tests verify an approved application can activate a seller, password is hashed, activation is one-time, and expired links are rejected. CI passed for commit `60b527e1`. Actual approval email delivery still requires configured Brevo/MAIL_FROM and a live smoke test. (0.5–1 day)
- [ ] **T48** Test seller login, account suspension, session expiry and logout. (0.5–1 day)
- [x] **T49** Prove seller A cannot list/read/update seller B's products or orders; add regression tests. (1 day)
- [x] **T50** Add safe seller product editing/stock updates for owned products, with server-side validation. Edits preserve seller ownership and return the product to hidden/pending moderation; regression tests passed in CI for commit `5932bcdd`. (1–2 days)
- [x] **T51** Verify product moderation and approval-state changes are admin-only and immediately affect public visibility. Regression test confirms approval publishes seller products and Juno-owned products cannot be changed through the seller moderation action; CI passed for commit `8c9a65e6`. (0.5–1 day)
- [x] **T52** Test multi-seller cart order splitting and seller-specific fulfilment records. Regression test creates one fulfilment record per seller for a mixed cart and confirms retry does not duplicate seller orders or ledger rows. CI passed for commit `f63d2522`. Shipping/discount settlement policy remains a separate finance task. (1–2 days)
- [x] **T53** Test seller fulfilment status transitions and tracking updates; block unauthorized order IDs. Tests reject invalid status jumps, allow New → Accepted, persist tracking, and cross-seller updates are denied. CI passed for commit `f044c952`. (0.5–1 day)
- [ ] **T54** Review seller/customer personal data exposure; restrict addresses and phone numbers to authorized fulfilment views. (0.5–1 day)
- [ ] **T55** Verify shipping, cancellation, returns, refund, privacy, terms, contact and seller terms match actual operations. (1 day)

## P2 — marketplace polish and competitive shopping experience (T56–T72)

- [ ] **T56** Compare homepage/category experience against Meesho, Myntra, Amazon and Flipkart; fix navigation dead ends. (1 day)
- [ ] **T57** Verify wishlist add/remove/persistence and signed-in versus guest behavior. (0.5 day)
- [ ] **T58** Verify product comparison limits and accurate comparison attributes. (0.5 day)
- [ ] **T59** Verify recently viewed and recommendation sections use real catalogue data. (0.5–1 day)
- [x] **T60** Server-side coupon rules now have regression coverage for case-insensitive codes, minimum spend, flat discount, percentage discount cap and invalid codes; checkout recomputes discount from the submitted code and one code field is used (no stacking). CI passed for commit `8574dd9d`. Expiry behavior remains covered by the shared rule helper but the current configured codes have no expiry dates. (0.5–1 day)
- [ ] **T61** Verify product cards use relevant, non-duplicated, working images and meaningful fallbacks. (1–2 days; catalogue content may need manual sourcing)
- [ ] **T62** Verify mobile layout for home, search, product detail, cart and checkout. (1 day)
- [ ] **T63** Verify seller application and Seller Studio mobile layouts. (0.5 day)
- [ ] **T64** Verify PWA manifest, install prompt and app icons on Android browsers. (0.5 day)
- [ ] **T65** Verify service-worker cache invalidation so old storefront code does not persist after deploy. (0.5–1 day)
- [ ] **T66** Verify Juno branding, logo, favicon, tab icon and social sharing metadata everywhere. (0.5 day)
- [ ] **T67** Check keyboard navigation, visible focus, form labels, contrast and accessible status messages. (1 day)
- [ ] **T68** Check metadata, canonical URLs, structured data, sitemap and robots endpoints. (0.5–1 day)
- [ ] **T69** Run mobile performance checks; optimize oversized assets and unnecessary script work. (1 day)
- [ ] **T70** Test loading, empty, offline, timeout and retry states on major pages. (0.5–1 day)
- [ ] **T71** Verify consent UI matches activity tracking; document retention and avoid collecting unnecessary personal data. (0.5–1 day)
- [ ] **T72** Confirm customer notifications never expose payment secrets or sensitive address/payment details. (0.5 day)

## P3 — admin, marketplace finance, release and handover (T73–T80)

- [x] **T73** Verify admin authentication, session handling, rate limits and authorization for every admin action. Code review confirms a 12-hour admin token and rate-limited login; regression tests confirm data/mutation actions reject missing admin sessions and seller-role tokens. CI passed for commit `8426f0bf`. (1 day)
- [x] **T74** Regression tests cover admin product creation, update, hide (soft-delete) and preservation of seller ownership/approval status. Price-limit/MRP validation is also covered. CI passed for commit `223680d6`. Permanent hard deletion is intentionally not provided; hiding preserves order-history references. (0.5–1 day)
- [x] **T75** Admin now returns seller-account rows to the dashboard and supports Active/Suspended status changes; suspended accounts are denied seller product and order API access. Seller application copy now explains activation, product moderation and disabled payouts. Regression tests for suspension and product approval passed CI for commit `2786a1ed`; seller order oversight is present in Admin > Seller orders. (0.5–1 day)
- [x] **T76** Regression coverage now spans admin order status/tracking updates, return/refund gating, Razorpay refund initiation/error handling, review submission/moderation, and support-ticket persistence/admin replies. CI passed for commits `8c5b0e1a` and `2e3275e9`. Provider email delivery and live gateway smoke tests remain external release checks. (1 day)
- [ ] **T77** Verify security headers, dependency advisories, secret scanning and safe logs; remediate findings. (1 day)
- [ ] **T78** Validate seller ledger/commission/refund allocation with mixed-seller test orders; keep automatic payouts disabled until provider onboarding, KYC, commission policy and reconciliation are approved. (1–3 days for ledger tests; provider approval excluded)
- [ ] **T79** Run final GitHub Actions, production deploy and smoke tests against the exact deployed commit. (1 day plus external access)
- [ ] **T80** Complete release acceptance: evidence for each P0, known-issues list, rollback steps, owner handover and tracker update. (0.5–1 day)

## Benchmark boundaries

V1 should match the common customer-facing patterns users expect from large marketplaces—catalogue discovery, search/filter/sort, product detail, wishlist, cart, prepaid checkout, account/order history, reviews, support, seller onboarding, product moderation and seller fulfilment—within Juno's accessories niche and budget. It does **not** include a promise of enterprise-scale logistics networks, all-India delivery, instant seller payouts, warehouse orchestration, loyalty subscriptions, native iOS/Android apps, or every advanced recommendation/advertising feature of the benchmark platforms. Those require separate scope and/or external provider approval.

## Progress rule

A task moves to complete only when the relevant code and tests or live evidence are recorded. “Code exists” and “CI passes” do not prove a feature is correctly configured in production. Keep this file updated as work progresses; do not ask the user to type “Next” to advance the queue.
