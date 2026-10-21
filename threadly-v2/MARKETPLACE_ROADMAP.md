# Juno multi-seller marketplace roadmap

This roadmap upgrades the existing Juno storefront in `threadly-v2/`. It does not create a second repository or replace the storefront.

## Launch decisions

- Marketplace niche: accessories sellers at launch (hair accessories, jewellery, bags/purses, scarves/fashion accessories, belts/wallets and mixed accessories).
- Seller onboarding fee: free during the initial pilot.
- Checkout: prepaid online payments only; COD is disabled in the storefront, admin UI and server APIs.
- Selling prices: ₹1–₹500; source-sheet prices are not silently rewritten. Products outside the cap are not publicly listed or purchasable.
- Seller admission: application review, account activation and product moderation before public publishing.
- External seller sales and seller payouts: **disabled by default** via `MARKETPLACE_SELLER_SALES_ENABLED=false` until provider approval, seller KYC, commission/shipping/refund policy, inventory safeguards and reconciliation are complete. Seller applications/onboarding can be piloted while sales remain disabled.

## Phase 1 — Seller application intake (implemented)

- Public application page: `public/sell-on-juno.html`.
- API endpoint: `POST /api/seller-apply`.
- Applications are written to the existing Google Sheets `Requests` tab using the existing 9-column format. Request type is `Seller application`; application details are stored as JSON in the Details cell.
- Rate limiting, field validation, duplicate active-application checks and explicit consent are included.
- Admin > Seller applications lists applications and saves review status/internal notes.
- Approving an application sends an activation link when Brevo and `MAIL_FROM` are configured; the seller must activate an account before logging in.

The `Requests` tab headers are: `Request ID, Date, Order ID, Email, Type, Reason, Details, Status, Admin Notes`.

## Phase 2 — Seller accounts and permissions (implemented; CI-covered subset)

- Seller role is separate from customer and admin roles.
- Seller records are provisioned only after an approved application and activation link.
- Seller login uses a signed session; seller APIs validate the seller ID and email against an active seller record.
- Seller product and order reads/updates are scoped to the authenticated seller; regression tests cover cross-seller product/order access.
- Admin can set seller accounts to Active or Suspended. Suspended accounts are denied seller product and order API access.
- Remaining before launch: live activation-email test, production sheet permissions, seller-account suspension smoke test after deploy, and any additional legal/business verification policy Juno chooses to require.

## Phase 3 — Product ownership and moderation (implemented; CI-covered subset)

- Seller products include seller ID and approval status; new seller products are hidden and Pending until approved.
- Seller product creation and editing enforce allowed accessories categories, selling price cap, MRP, stock, description and image URL validation.
- Seller edit requests must match both product ID and authenticated seller ID; edits preserve ownership and return the listing to hidden/Pending moderation.
- Admin approval publishes seller listings; rejection/pending status keeps them hidden. Juno-owned products cannot be moderated through the seller-product moderation action.
- Remaining: inspect the real production catalogue/sheet headers and test public visibility with actual data.

## Phase 4 — Multi-seller orders and inventory (foundation implemented; launch blockers remain)

- Checkout snapshots carry product IDs, seller IDs, quantities and unit prices.
- Paid mixed-seller orders create seller-specific fulfilment records in `SellerOrders`; seller APIs restrict reads/updates to the owning seller.
- Admin > Seller orders provides oversight; fulfilment status transitions and tracking updates have regression coverage.
- Per-seller ledger foundation records gross subtotal, proportional discount estimate, configurable commission basis points, reconciliation status and refund-review flags. Automated transfers are not performed.
- **Still required before production marketplace orders:** concurrency-safe inventory reservation and rollback for failed/expired payments; reliable reconciliation for partial Google Sheets writes; mixed-seller shipping/discount allocation policy; cancellation, return and refund allocation; and tested handling for late/duplicate payment events.
- The current Sheets backend does not provide transactional row locking. Do not describe inventory reservation or seller balances as concurrency-safe until this is solved and tested.

## Phase 5 — Marketplace payments (not ready for external seller payouts)

- Keep the standard Razorpay checkout until marketplace payment-provider approval is complete.
- Before enabling seller payouts, onboard sellers through a marketplace-supported payment product such as Razorpay Route, subject to provider approval.
- Confirm Juno's commission and shipping policy; verify seller KYC/bank setup, transfer creation, idempotency, payout reconciliation, refunds/disputes and audit logs.
- Maintain seller ledger entries for captured payments, shipping, fees, refunds, commission and amounts payable.
- Verify signed webhooks and reconcile gateway records before settlement.
- Never store card credentials or expose gateway secrets in the browser.

## Phase 6 — Growth and monetisation (later)

- Add shareable seller-store URLs and source attribution.
- Recruit a small accessory-seller pilot before opening applications broadly.
- Track conversion, fulfilment, cancellations, refunds, repeat purchase and seller retention.
- Add commission or promoted listings only after communicating terms and validating buyer demand.

## Target data model

Recommended relational entities if/when critical transactions move off Sheets:

- `users`, `sellers`, `seller_documents`
- `products`, `product_variants`, `inventory_movements`
- `carts`, `orders`, `order_items`, `seller_orders`
- `payments`, `refunds`, `seller_ledger`, `settlements`
- `addresses`, `reviews`, `audit_logs`

The current code uses Google Sheets for products, users, orders and marketplace records. Do not migrate without choosing/provisioning a transactional database, writing a tested import path and validating rollback. Sheets can remain a reporting/export surface, but concurrent inventory and seller balances ultimately need transactional storage.

## Verification checklist before production

- [ ] Verify live `SHEET_ID`, service-account permissions, and required tab headers without exposing credentials.
- [ ] Test seller application, duplicate submissions, activation email, login, suspension and failed Sheets writes.
- [ ] Test the storefront/customer login/order/payment flow against the production Sheet and Razorpay test mode.
- [ ] Complete inventory reservation/rollback and mixed-seller refund/shipping allocation tests.
- [ ] Do not enable public seller uploads or seller payouts beyond the tested pilot scope until authorization, order splitting, refund handling and provider setup are verified.
- [ ] Run GitHub Actions, deploy the exact main commit on Netlify, then run production smoke tests before accepting real orders.
