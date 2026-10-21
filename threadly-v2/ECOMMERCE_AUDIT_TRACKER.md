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

2026-10-21: Repository metadata confirms default branch `main` and write access. `threadly-v2/package.json` exposes `check`, `check:security` and `test`. Commit `f84fa36e` adds a regression test asserting the server-side `placeCod` handler always rejects direct calls. The Checkout regression tests workflow passed on `f84fa36e` (https://github.com/jananisr2020/Threadly/actions/runs/39592281920); Security checks also passed (https://github.com/jananisr2020/Threadly/actions/runs/39592282165). Historical secret scan for the new commit was still running at the time of this update. No production test payment or Netlify deployment is claimed by this tracker.
