# Juno V1 release acceptance runbook

This runbook is a checklist, not evidence that production is already verified. Do not mark T79/T80 complete until the checks below are run against the exact deployed commit.

## 1. Local / CI gates

Run from `threadly-v2/`. The build validates the 604-item bundled catalogue and compacts its JSON before Netlify publishes the static site:

```sh
npm ci
npm run build
npm test
npm run check
npm run check:security
```

Also confirm the GitHub Actions runs for Checkout regression tests, Security checks, Historical secret scan, Validate Juno storefront, and Storefront browser tests are green for the same commit.

## 2. Private configuration checks

In Netlify site settings, verify privately (never paste secret values into an issue, chat, or log):

- `SHEET_ID` points to the intended production spreadsheet.
- The Google service account has the required access and the Products, Users, Orders, Pending, Requests, Reviews, Tickets, Sellers, SellerOrders and SellerLedger tabs have the expected headers.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` belong to the intended environment and webhook URL is correct.
- `JWT_SECRET` and `ADMIN_PASSWORD` are strong, private, and set.
- `BREVO_API_KEY`, `MAIL_FROM`, `SUPPORT_EMAIL`, and `SUPPORT_PHONE` are configured and the sender is verified.
- `MARKETPLACE_SELLER_SALES_ENABLED` remains `false` until inventory and seller settlement safeguards have been accepted.

Record only pass/fail and the tested commit. Do not record credential values.

## 3. Deployed smoke-test matrix

Use Razorpay test mode first. Do not create a real charge without explicit business approval.

| Check | Expected result | Evidence |
|---|---|---|
| `GET /api/health` | Minimal healthy response; no environment values or credentials | HTTP status and redacted response |
| `GET /api/products` | Live Sheet-backed catalogue loads and respects visibility, approval and ₹500 ceiling | HTTP status, product count, redacted sample |
| Catalogue outage | Clearly labelled saved catalogue; checkout blocked; retry recovers when API returns | Browser result |
| Customer signup/login/profile | Correct account scope; no credential/contact fields leak | Redacted test account result |
| Password reset | One-time, expiring link delivered by verified sender; reuse rejected | Test inbox result |
| Prepaid checkout | Server-calculated amount matches Razorpay; Pending row exists before user pays | Test order/payment IDs |
| Captured payment | Exactly one paid order; stock sync completes or explicit reconciliation flag appears | Sheet row and payment status |
| Webhook replay | No duplicate order, stock decrement, refund or ledger row | Before/after row counts |
| Cancel/return/refund | Status changes only through allowed transitions; refund status waits for verified webhook | Test order history |
| Support ticket/reply | Ticket persists and both customer/support emails deliver without sensitive fields in customer notices | Test inbox result |
| Seller onboarding | Application, consent, activation email and seller access work; seller sales remain disabled | Test account result |
| Mobile/PWA | No horizontal overflow; manifest/icons load; install prompt checked on real Android | Device/browser and result |

Never use real customer data for smoke tests. Use synthetic accounts and test payments.

## 4. Inventory and payment launch blockers

Do not enable seller sales or advertise checkout as production-ready until:

- A concurrency-safe inventory reservation/transaction mechanism prevents overselling across simultaneous checkouts.
- Partial stock updates can be reconciled without double-decrementing or double-restocking.
- Expired/abandoned payment attempts and late gateway events have a tested safe reconciliation policy.
- Cancellation and return restocking is idempotent and auditable.
- Seller ledger, refunds, commission rules and settlement provider approval are verified. Automated seller transfers remain disabled until approved.

Google Sheets read/update operations are not an atomic inventory transaction. A green unit test does not remove that limitation.

## 5. Rollback and recovery

1. Stop new sales or set the site into a maintenance/checkout-disabled state if payment, inventory, or catalogue integrity is uncertain.
2. Keep seller sales disabled. Never manually edit payment status to make an order appear paid/refunded.
3. In Netlify, redeploy the last known-good deployment for the same site; confirm the deployed commit hash before reopening traffic.
4. Preserve the Orders, Pending, Products, SellerOrders and SellerLedger rows for affected test/real transactions. Do not delete rows to hide a mismatch.
5. Reconcile each affected payment against Razorpay's authoritative status, then reconcile inventory and seller ledger records with an audit trail.
6. Re-run health, catalogue, checkout, webhook replay and customer order-history smoke tests before restoring checkout.
7. Record the incident, affected order IDs, action taken and owner. Never place secrets or full customer addresses/phone numbers in the incident note.

## 6. Release sign-off record

Fill this in only after running the checks:

- Tested commit:
- Netlify deploy URL / deployment ID:
- Health + catalogue: PASS / FAIL
- Sheet schema/access: PASS / FAIL
- Razorpay test checkout + webhook replay: PASS / FAIL
- Email delivery: PASS / FAIL
- Mobile/PWA install check: PASS / FAIL
- Inventory reservation/restock/reconciliation: PASS / FAIL
- Known issues and owner:
- Rollback deployment identified:
- Accepted by / date:

Any failed P0 gate means **do not launch**. A release must not be called complete while concurrency-safe inventory and payment reconciliation remain unresolved.
