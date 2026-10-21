# Juno e-commerce audit and implementation tracker

Last reviewed: 2026-10-21  
Repository: `jananisr2020/Threadly`, application root `threadly-v2/`  
Production URL: https://threadly-fashion.netlify.app/  
Comparison set: Meesho, Myntra, Amazon, Flipkart

## Working rules

- Fix working functionality and data integrity before visual polish.
- Verify the repository before declaring a feature missing; verify production separately before declaring it live.
- COD must remain disabled. Checkout is prepaid-only.
- Product/seller listing prices must stay at or below ₹500.
- Do not claim a full marketplace until seller identity, ownership, moderation, order allocation, inventory, refunds and payouts are implemented and tested.
- Keep all credentials and private database exports out of Git.

## Current-state evidence (repository inspection)

| Area | Repository evidence | Status |
|---|---|---|
| Storefront/catalogue | `public/index.html`, `public/catalog.json`, `public/products.csv` exist; README documents the Google Sheets catalogue | Implemented in code; live data/rendering still needs production verification |
| Category/navigation and product discovery | Existing storefront and catalogue files are present; run link and UI tests before changing | Present; behavior not yet fully re-tested in this pass |
| Prepaid checkout | `create-order.js`, `verify-payment.js`, `razorpay-webhook.js`; offline checkout tests exist | Implemented in code; Razorpay end-to-end requires configured credentials/webhook and a test payment |
| COD disabled | README specifies prepaid only; `place-cod.js` handler still exists in the repository | **Audit item:** verify it always rejects and no storefront flow exposes COD |
| Authentication/account | login/signup/reset/my-orders endpoints exist | Implemented in code; session/account production flows need testing |
| Customer activity | `website-activity.js` requires explicit all-consent and validates event names/session IDs | Implemented in code; verify consent UI and retention/privacy behavior |
| Seller applications | `sell-on-juno.html`, `seller-apply.js`, admin application flow | Phase 1 exists; live submission must be tested against the configured Sheets tab |
| Seller account/products/orders | seller login, activation, products and orders endpoints and seller studio exist | Partial marketplace; verify every operation enforces verified seller identity and ownership |
| Seller payouts | Roadmap states payouts are subsequent work; no claim of automated payouts | Not launch-ready; keep transfers disabled |
| Admin/security | `admin.html`, `security-health.js`, activity logging in `netlify/lib/core.js` | Present; permission and data-isolation tests remain |
| CI / offline checks | `npm run check`, `npm run check:security`, `npm test`; GitHub Actions workflows exist | Must run on the latest commit and review the resulting logs |
| Netlify production | Root `netlify.toml` points to `threadly-v2/`; prior deploy attempt returned Forbidden | **Unverified:** do not equate a GitHub commit with a successful production deployment |

## Benchmark gap tracker

| Capability | Meesho / Myntra / Amazon / Flipkart expectation | Juno target | Priority |
|---|---|---|---|
| Catalogue reliability | Searchable catalogue, accurate price/stock and useful category filters | Sheet/API is the source of truth; no misleading fallback/empty catalogue; price and stock validation | P0 |
| Product discovery | Search suggestions, filters, sorting, relevant product detail | Test existing search/filter/sort and repair broken behavior before adding features | P0 |
| Cart and checkout | Persistent cart, quantity updates, clear totals and delivery fees | Validate cart quantities, totals, stock and server-side prices; prepaid only | P0 |
| Payment integrity | Confirmed payment status, idempotent callbacks, failed-payment recovery | Razorpay signature verification, webhook idempotency, no order marked paid from client-only claims | P0 |
| Account and addresses | Reliable login, order history, reusable address book | Verify session protection and whether address persistence is device-local vs server-synced | P0 |
| Orders, cancellations, returns/refunds | Clear status and self-service request tracking | Test order state transitions and Sheets persistence; refund provider workflow must be explicit | P1 |
| Seller marketplace | Seller onboarding, isolated seller inventory/orders, moderation and settlement | Finish identity/session and ownership checks, moderation and seller order allocation; payout integration later | P1 |
| Trust and compliance | Clear shipping, return, privacy, terms and contact information | Validate all policy links/content and avoid unsupported delivery/return promises | P1 |
| Mobile experience | Responsive storefront and reliable install/app experience | Run mobile viewport checks; verify PWA cache/version and Android wrapper separately | P1 |
| Performance/accessibility/SEO | Fast pages, accessible controls, metadata and indexable catalogue | Run link, metadata, keyboard/contrast and mobile checks; verify sitemap/robots endpoints | P2 |
| Retention/analytics | Consent-aware activity and useful customer communications | Ensure opt-in controls match tracking, log only safe details, test order email/SMS only when configured | P2 |

## Execution queue

### P0 — functional integrity (do these first)
- [ ] Run `npm install`, `npm run check`, `npm run check:security`, `npm test` from `threadly-v2/`; record the exact results. (Checkout regression workflow and Security checks passed on commit `f84fa36e`; see links in Session notes. Full local `npm install` / all-command run not claimed.)
- [ ] Inspect `placeCod` implementation and verify COD returns a rejection on the server even if called directly; test the UI has no COD option.
- [ ] Exercise checkout pricing against manipulated client prices, hidden/pending products, zero/negative quantities, insufficient stock, duplicate callbacks and invalid payment signatures.
- [ ] Verify production `/api/health`, catalogue endpoint, seller application submission, login and checkout without exposing environment values.
- [ ] Confirm Netlify build base/publish/functions settings and latest deploy status; diagnose the previous Forbidden permission issue without creating a duplicate site.
- [ ] Verify Google Sheet ID and required tabs/headers privately in Netlify; never place secret values in this file.

### P1 — account and marketplace safety
- [ ] Test seller session creation/expiry and enforce server-derived seller identity on product/order operations.
- [ ] Test seller A cannot read/update seller B's products or orders; pending/unapproved seller products must not appear publicly.
- [ ] Define stock decrement and order status transitions to prevent overselling or duplicate fulfilment.
- [ ] Verify customer order history, address persistence, cancellation/return requests and admin review end to end.
- [ ] Add automated regression tests for every confirmed defect before changing behavior.

### P2 — competitive polish after functionality passes
- [ ] Test autocomplete/search, filter combinations, sort, empty/error/loading states and mobile navigation.
- [ ] Audit all policy/footer links, product detail information, keyboard accessibility, metadata and page speed.
- [ ] Review consent UI, retention rules, order notification configuration and PWA cache update behavior.

## Validation and deployment checklist

- [ ] Record commit SHA and changed files.
- [ ] `npm run check` passes.
- [ ] `npm run check:security` passes.
- [ ] `npm test` passes.
- [ ] Relevant GitHub Actions workflows pass.
- [ ] Test environment checkout uses Razorpay test keys; webhook signature and replay behavior verified.
- [ ] Confirm required environment variable *names* and Sheet tabs/headers; never copy values into GitHub issues/logs.
- [ ] Production deploy succeeds; check the exact deployed commit/build stamp.
- [ ] Smoke-test home/catalogue/search/cart/login/seller form/admin/health on the live URL.
- [ ] Confirm COD is absent and direct server-side COD attempts fail. (Automated unit regression now covers the direct `placeCod` handler; checkout regression workflow passed on `f84fa36e`. Production UI smoke test remains open.)
- [ ] Mark a task complete only with a test/log or live verification evidence.

## Session notes

2026-10-21: Repository metadata confirms default branch `main` and write access. `threadly-v2/package.json` exposes `check`, `check:security` and `test`. Commit `f84fa36e` adds a regression test asserting the server-side `placeCod` handler always rejects direct calls. Checkout regression tests and Security checks passed on that commit (https://github.com/jananisr2020/Threadly/actions/runs/39592281920, https://github.com/jananisr2020/Threadly/actions/runs/39592282165). Commit `c6290a6b` adds server-side validation preventing the admin product editor from saving a selling price above ₹500 and invalid MRP; commit `fb0565cf` adds a regression test for that guard. The new checkout/security/secret-scan workflows for `fb0565cf` were queued or in progress at the last check, so those latest changes are not yet marked CI-verified. No production test payment or Netlify deployment is claimed by this tracker.


2026-10-21 follow-up: Commit `2bf380ce` adds a seller API regression test to ensure a seller cannot submit a product priced above ₹500. The new Checkout regression, Security checks and historical secret scan workflows were still running at the last status check (https://github.com/jananisr2020/Threadly/actions/runs/39594956249, https://github.com/jananisr2020/Threadly/actions/runs/39594956224, https://github.com/jananisr2020/Threadly/actions/runs/39594956284).

2026-10-21 backlog planning update: Commit `2bf380ce3e57f5cc4c740c3f4d0f4f992406b9f5` is now verified by all three workflows: [Checkout regression tests](https://github.com/jananisr2020/Threadly/actions/runs/39594956249), [Security checks](https://github.com/jananisr2020/Threadly/actions/runs/39594956224), and [Historical secret scan](https://github.com/jananisr2020/Threadly/actions/runs/39594956284) all completed successfully. Added the fixed 80-item V1 delivery backlog at [JUNO_V1_BACKLOG.md](https://github.com/jananisr2020/Threadly/blob/main/threadly-v2/JUNO_V1_BACKLOG.md): 6 confirmed complete, 74 open, estimated 50–70 working days for one developer, excluding external provider approval/setup delays. This is a planning estimate, not a claim that all listed features have been verified or deployed.


2026-10-21 execution update: Commit `e240dd85db010da6b0c53527dff35513f83d7950` adds regression tests proving seller product listings are restricted to the authenticated seller and that seller A cannot load or update seller B's fulfilment order. All three CI workflows passed: [Checkout regression tests](https://github.com/jananisr2020/Threadly/actions/runs/39595985008), [Security checks (including npm audit)](https://github.com/jananisr2020/Threadly/actions/runs/39595985438), and [Historical secret scan](https://github.com/jananisr2020/Threadly/actions/runs/39595984980). Backlog commit `042dd09f44ff9b84c97c737bf66fd30e21db3d26` marks T07 and T49 complete; the fixed backlog now shows 8 confirmed complete and 72 open. The automated tests verify mocked Sheets/API behavior, not live production account configuration or real customer/seller data.


2026-10-21 seller editing update: Commit `e59c1775` adds an ownership-checked seller product update API. Seller edits validate category, price ceiling, MRP, stock, image URL and description; the server checks both product ID and authenticated seller ID, preserves ownership, and hides the edited listing with Pending approval until moderation. Commit `b8b67660` adds Seller Studio edit UI. Commit `5932bcdd` adds tests for allowed owned-product edits, rejected cross-seller edits, and mandatory re-moderation. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39596361753) and [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39596361893). Backlog commit `dbdbf1f3` marks T50 complete; current count is 9 confirmed complete and 71 open. Also expanded the storefront validation workflow to syntax-check inline scripts across all public HTML pages; one intermediate workflow revision failed due to its script-matching regex and was corrected, with a subsequent run passing on commit `6e6148f2`. The latest workflow revision is being rechecked.


2026-10-21 moderation update: Commit `8c9a65e6d261e06e97c9d02ca91a02edf77cb553` adds a regression test for admin approval of seller-submitted products and confirms the seller moderation action refuses Juno-owned catalogue products. [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39596737168), including the regression suite and dependency audit. Backlog commit `74fbb162` marks T51 complete; progress is now 10 confirmed complete and 70 open. Product moderation is now covered by automated checks; production Sheet configuration and live end-to-end review remain unverified.


2026-10-21 fulfilment update: Commit `f044c952479d7d72cedc3afc1b8a94250dd73a4b` adds regression coverage for seller order status transitions and tracking updates. It rejects an invalid New → Delivered jump, accepts New → Accepted, verifies tracking is persisted, and complements the earlier cross-seller order ownership test. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39596862733) and [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39596862784). Backlog commit `3fc9a3f4` marks T53 complete; count is now 11 confirmed complete and 69 open. Historical secret scan for the same code commit was still running at last poll.


2026-10-21 admin authorization update: Commit `8426f0bf99529322ec8a967d3fb3c7a2eb96b6d1` adds regression tests showing that admin data and mutation actions reject requests without an admin session and reject seller-role tokens. Code review also confirms the admin login uses a 12-hour token and per-IP rate limit. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39597027886), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39597027879). Backlog commit `2cf07171` marks T73 complete; progress is now 12 confirmed complete and 68 open. The live production admin login remains to be smoke-tested after deployment.


2026-10-21 public catalogue security update: Commit `063a671a` filters hidden, pending/rejected and out-of-budget products from the public CSV endpoint, blanks seller ID and approval-status columns in public rows, and updates sitemap product IDs to include only approved/visible products at prices no greater than ₹500. Commit `73844422` adds regression tests covering hidden/pending product leakage through both public catalogue and sitemap IDs. [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39597409941); checkout regression run for `73844422` passed at https://github.com/jananisr2020/Threadly/actions/runs/39597409835. Backlog commit `6d8f4ea7` marks T12 complete; progress is 13 confirmed complete and 67 open. Real live Sheet data still needs production verification.


2026-10-21 coupon validation update: Commit `8574dd9d475ebca7916b85501ff70991e4992248` adds regression tests for case-insensitive coupon codes, minimum-spend boundaries, flat discounts, percentage discount caps, and invalid codes. Checkout tests, security/dependency audit, and historical secret scan passed: [Checkout](https://github.com/jananisr2020/Threadly/actions/runs/39597196162), [Security](https://github.com/jananisr2020/Threadly/actions/runs/39597196085), [Secret scan](https://github.com/jananisr2020/Threadly/actions/runs/39597196134). Backlog commit `06ca7288` marks T60 complete; count is now 14 confirmed complete and 66 open. The four existing coupon rules have no expiry dates configured, so expiration dates are not currently part of active business rules.


2026-10-21 online-only payment hardening: Commit `e3c2afe7` prevents admin API callers from manually editing payment status; payment status must come from verified Razorpay events. Commit `7d22bbaf` removes the COD payment-status selector from the admin UI and makes payment status read-only. Commit `ef415c97` adds a regression test that a caller cannot mark an order as COD or alter payment status manually. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39598093554), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39598093626), [Storefront validation passed](https://github.com/jananisr2020/Threadly/actions/runs/39598049909). Backlog commit `92ea3ba8` marks T28 complete; progress is 15 confirmed complete and 65 open.


2026-10-21 catalogue-fallback safety update: Commit `b5b3880a` distinguishes live Sheet-backed catalogue data from the bundled preview. When the API fails, the storefront now shows a persistent notice that live stock/checkout are unavailable and blocks checkout instead of allowing orders against stale bundled inventory. Commit `7e5485be` adds a security-configuration regression check for this guard; [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39598412652). This reduces the risk of stale-catalogue orders, but T10 remains open until the production Sheet/API path and live recovery are verified after deployment.


2026-10-21 price-truthfulness fix: Commit `b2a0e653` removes the automatic budget-pricing transformation that silently changed Google Sheet selling prices and MRP values. The server now uses source-sheet values, while public listings, sitemap IDs and checkout reject products above ₹500; admin and seller saves already enforce that limit. Commit `3f7f861c` updates regression tests to verify source prices remain unchanged and over-budget products cannot be purchased. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39598515422), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39598515499). Commit `9b5e759f` adds CI validation that all 604 bundled products have positive selling prices ≤₹500, MRP ≥ selling price and internally consistent discount percentages; workflow result is pending at last poll. Backlog commit `3815485a` marks T11 complete; progress is 16 confirmed complete and 64 open.


2026-10-21 seller operations update: Commit `b1152f24` adds admin seller account status changes; the admin load response now includes seller accounts. Commit `719df1ce` adds the Seller accounts table and clarifies that approval sends an activation link, product approval is separate, and payouts remain disabled. Commit `2786a1ed` adds regression tests that suspension revokes seller product/order API access; checkout and security workflows passed: [Checkout](https://github.com/jananisr2020/Threadly/actions/runs/39598773801), [Security](https://github.com/jananisr2020/Threadly/actions/runs/39598773800). This completes T75.

2026-10-21 mixed-cart test update: Commit `f63d2522` adds a regression test that a paid cart containing products from two sellers creates separate seller fulfilment and ledger rows and remains idempotent on retry. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39598773801). Backlog commit `10c2015d` marks T52 and T75 complete; progress is now 18 confirmed complete and 62 open. Seller payout settlement, shipping allocation policy, and refund allocation remain open and payouts stay disabled.


2026-10-21 seller onboarding test update: Commit `1822fc2a` adds seller application validation/consent and Requests-tab persistence tests. Commit `60b527e1` adds activation tests covering approved applications, hashed passwords, one-time activation and expired-link rejection. [Checkout regression tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39599038611), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39599038411). Backlog commit `bf3a1229` marks T46 and T47 complete; progress is 20 confirmed complete and 60 open. Actual activation email delivery still depends on configured Brevo/MAIL_FROM and must be smoke-tested after deployment.


2026-10-21 refund-webhook regression: Commit `ae03fc11cb2fdca1c2c699da631fad82976278e1` adds a signed `refund.processed` webhook test. It verifies the parent order becomes Refunded, seller ledger rows are flagged `REFUND_REVIEW`, and replay does not append duplicate records. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39598955352), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39598955118), [Historical secret scan passed](https://github.com/jananisr2020/Threadly/actions/runs/39598955256). T24/T40 remain open until the full captured-payment webhook and real Razorpay refund initiation/retry flow are covered and verified in test mode.


2026-10-21 customer authentication regression: Commit `15eff8ec9327b4a3277d23ef0d4853e5298601de` adds tests for weak-password rejection, successful signup with hashed password, duplicate-email rejection, invalid login rejection and successful login/token issuance with login-count updates. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39599210056) and [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39599210084). Backlog commit `ac4393e3` marks T31/T32 complete; progress is 22 confirmed complete and 58 open. Session expiry, reset-email delivery and live customer account flows remain open.


2026-10-21 account recovery and support updates: Commit `be0b3ab3` adds password-reset tests for password policy, expiry and one-time use; live reset-email delivery remains blocked on Brevo/MAIL_FROM setup. Commit `cba779e4` adds ticket validation/persistence and admin-reply tests; email delivery remains an external production check. Checkout tests passed for `be0b3ab3` at https://github.com/jananisr2020/Threadly/actions/runs/39599322650 and for `cba779e4` at https://github.com/jananisr2020/Threadly/actions/runs/39599410966.

2026-10-21 cancellation-state update: Commit `015abfd3` corrects the cancellation response so it no longer claims a refund has been processed when no refund has been initiated. Commit `9fd1d38b` adds tests for New/Packed/Shipped/Delivered cancellation and return eligibility. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39599486213) and [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39599486093). Backlog commit `af7599c0` marks T38 complete; progress is 23 confirmed complete and 57 open. Actual refund initiation/settlement remains separate and is not claimed complete.


2026-10-21 review workflow update: Commit `d4ca4e6e` adds regression coverage for invalid ratings, one-review-per-product enforcement, verified-purchase flagging from order history, and approved review persistence. Admin review controls already support hiding/showing reviews. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39599613214), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39599613208). Backlog commit `5edddd35` marks T42 complete; progress is 24 confirmed complete and 56 open.


2026-10-21 return/refund safety update: Commit `e365d6c6` changes admin request handling so return requests cannot be marked Refunded until the related order has a verified Razorpay Refunded payment status. It also checks Brevo/MAIL_FROM before changing a seller application to Approved, avoiding a stuck approval state when activation email configuration is missing; email failures attempt to roll the application status back. Commit `b341c45e` adds regression tests for the refund gate/customer-visible request status and for blocking seller approval without mail configuration. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39599784441), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39599784170), [Storefront validation passed](https://github.com/jananisr2020/Threadly/actions/runs/39599762608). Backlog commit `d461fa84` marks T39 complete and updates T47's evidence; progress is 25 confirmed complete and 55 open.


2026-10-21 server-side totals verification: Code review confirms `buildOrder` uses the server's `price` result and does not read client-supplied subtotal/discount/shipping/total fields. Regression tests verify source-sheet prices and recomputed totals; coupon boundary/cap tests also pass. Evidence: [Checkout tests for source-price integrity](https://github.com/jananisr2020/Threadly/actions/runs/39598515422) and [coupon tests](https://github.com/jananisr2020/Threadly/actions/runs/39597196162). Backlog commit `f7e83b21` marks T19 complete; progress is 26 confirmed complete and 54 open.


2026-10-21 checkout address and serviceability tests: Commit `3f84c6d2` exposes the order builder to the offline test harness; commit `7652aca9` adds tests proving the server ignores client-supplied totals, recomputes coupon/shipping totals, accepts a mocked Tamil Nadu pincode, rejects an out-of-state pincode, rejects invalid phone/address details, and rejects COD as a payment method. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39600046459), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39600046293). Backlog commit `f985c1f8` marks T20 and T21 complete; progress is 28 confirmed complete and 52 open. Live India Post serviceability and actual checkout still require production/test-mode smoke tests.


2026-10-21 Razorpay backend regression: Commit `edf2a11c` adds a test-only injectable Razorpay client to exercise the order/verification path offline. Commit `8622fbde` tests Razorpay order creation, server-calculated amount and Pending persistence, invalid signatures, and successful captured-payment recording/stock decrement. Commit `996039f4` extends this to prove an authorized-but-uncaptured payment is rejected without creating a paid order or decrementing stock. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39600311661), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39600311776). Backlog commit `8ad1c7b8` marks T23 complete and records T22's remaining external test-key/browser-checkout requirement; progress is 29 confirmed complete and 51 open. This is mocked SDK integration, not proof of a live Razorpay account configuration.


2026-10-21 webhook coverage update: Commit `4619a7e3` tests signed `payment.captured` webhook recording and replay idempotency; commit `4227e91e` adds signed `payment.failed` coverage and confirms failed events do not create orders or decrement stock. Combined with the earlier signed refund webhook test, the regression suite now covers captured, failed, refund-created/processed and replay paths. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39600494717), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39600494697), [Historical secret scan passed](https://github.com/jananisr2020/Threadly/actions/runs/39600494596). Backlog commit `b32c574b` marks T24 complete; progress is 30 confirmed complete and 50 open.


2026-10-21 partial inventory-write test: Commit `6a8eeb4c` adds a simulated Google Sheets stock-write failure test. It confirms the paid order is retained, stock is not silently changed, the order is flagged `STOCK_RECONCILIATION_REQUIRED`, and the API tells the customer not to pay again. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39600689047), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39600689054). T27 remains open because safe automated retry/reconciliation for partial multi-row writes is not yet implemented.


2026-10-21 admin product workflow: Commit `223680d6` adds regression coverage for admin product creation, updating an existing seller product without changing seller ownership/approval status, and hiding a listing. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39600820216), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39600820291). Backlog commit `59ab5ed4` marks T74 complete. Juno uses hide/soft-delete rather than permanent deletion so order-history references remain valid; progress is 31 confirmed complete and 49 open.


2026-10-21 refund/admin workflow tests: Commit `2e3275e9` tests Razorpay refund initiation with the exact amount, duplicate-retry prevention, and failed-gateway handling without falsely changing the order payment status. Combined with the signed refund webhook/ledger-review test and return-status gate, this covers the server-side refund workflow. [Checkout tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39600982022), [Security checks passed](https://github.com/jananisr2020/Threadly/actions/runs/39600981759). Backlog commit `5ad35a77` marks T40 and T76 complete; progress is 33 confirmed complete and 47 open. Live Razorpay test-mode refunds and configured email delivery remain release smoke tests.


2026-10-21 storefront browser testing: Added a Playwright Chromium smoke suite in `scripts/test-storefront-e2e.js` and GitHub workflow `Storefront browser tests`. The first successful run verifies the product grid, search suggestions, keyboard selection, and no-match state. [Browser tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39601848786). Commit `3160d81b` marks T13 complete. The suite is being expanded to cover category/price filtering, all sort modes, cart/wishlist persistence/removal, compare attributes, and mobile layouts.


2026-10-21 Playwright shopping interaction expansion: Commit `6ae64701` expands browser tests to cover category + price filters, all eight sort modes, wishlist add/remove/persistence, cart persistence and quantity/removal behavior, compare cap/attributes, and mobile home/seller pages. [Browser tests passed](https://github.com/jananisr2020/Threadly/actions/runs/39602029723). Backlog commit `7da38cef` marks T14, T15, T17, T18, T57 and T58 complete; progress is 40 confirmed complete and 40 open. A further mobile product/cart/checkout layout check is now added and its workflow run is pending.
