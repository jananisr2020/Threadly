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
