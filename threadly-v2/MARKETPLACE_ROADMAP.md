# Juno multi-seller marketplace roadmap

This plan upgrades the existing Juno storefront in `threadly-v2/`; it does not create a second repository or replace the existing storefront.

## Launch decisions

- Marketplace niche: accessories only (hair accessories, jewellery, bags/purses, scarves/fashion accessories, belts/wallets and mixed accessories).
- Seller onboarding fee: free during the initial launch.
- Checkout: prepaid online payments only; cash on delivery remains disabled.
- Initial catalogue: current Juno catalogue is the first seller's inventory.
- Seller admission: application review and product moderation before public publishing.

## Phase 1 implemented on this branch: seller application intake

- Public application page: `public/sell-on-juno.html`.
- API endpoint: `POST /api/seller-apply`.
- Applications are written to the existing Google Sheets `Requests` tab using the existing 9-column format. The request type is `Seller application`; application details are stored as JSON in the Details cell.
- Rate limiting, field validation, duplicate active-application checks and explicit consent are included.
- Admin > Seller applications lists applications and lets an admin save a review status and internal note.
- **An approved application does not yet provision seller login, a seller dashboard, product ownership or seller payouts.** Those are subsequent phases. Do not describe this branch as a complete marketplace.

The existing spreadsheet must have a `Requests` tab with these headers: `Request ID, Date, Order ID, Email, Type, Reason, Details, Status, Admin Notes`. The project README describes this tab.

## Next implementation phases

### Phase 2 — Seller accounts and permissions
- Add a seller role separate from customer and admin roles.
- Create a seller record only after manual approval and secure identity/business verification.
- Implement seller login/session controls and ownership checks on every seller endpoint.
- Never trust a client-supplied seller ID; derive seller identity from the verified session.

### Phase 3 — Product ownership and moderation
- Add `seller_id`, `approval_status`, `created_at`, `updated_at` and stock fields to products.
- Assign existing catalogue products to the Juno-owned seller.
- Allow sellers to create/update only their own products.
- Keep seller-submitted products pending until approved by an admin.

### Phase 4 — Multi-seller orders and inventory
- Snapshot seller ID, product name, SKU, quantity and unit price into each order item.
- Split customer orders into seller-specific fulfilment orders.
- Add safe inventory reservation and rollback for failed/expired payments.
- Define shipping, cancellations, returns and refund allocation for mixed-seller carts.

### Phase 5 — Marketplace payments
- Keep Razorpay's current standard checkout for the single-seller flow until marketplace payment-provider approval is complete.
- Before enabling external seller sales, onboard and verify sellers through a marketplace-supported payment product such as Razorpay Route (subject to provider approval).
- Maintain a seller ledger for captured payments, shipping, fees, refunds, commission and amounts payable.
- Verify signed webhooks, make payment processing idempotent, and reconcile gateway records before settlement.
- Do not store card credentials or expose gateway secrets in the browser.
- Launch with a 0% Juno commission if desired, but still record seller payable and payment-provider fees accurately.

### Phase 6 — Growth and monetisation
- Give each seller a shareable store URL and track visits and orders by source.
- Recruit a small pilot cohort of accessory sellers before opening applications broadly.
- Track conversion, successful fulfilment, cancellations, refunds, repeat purchase and seller retention.
- Add commission or promoted listings only after communicating terms and validating buyer demand.

## Target data model

Recommended relational entities when moving critical transactions off Sheets:

- `users`, `sellers`, `seller_documents`
- `products`, `product_variants`, `inventory_movements`
- `carts`, `orders`, `order_items`, `seller_orders`
- `payments`, `refunds`, `seller_ledger`, `settlements`
- `addresses`, `reviews`, `audit_logs`

The current production code uses Google Sheets for products, users and orders. Do not introduce a database migration without choosing and provisioning the transactional database, writing a tested migration/import path, and validating rollback. Google Sheets can remain a reporting/export surface, but concurrent inventory, checkout and seller balances should ultimately use transactional storage.

## Verification checklist before production
- Test seller application validation, duplicate submissions, rate limits and failed Sheets writes.
- Verify application rows appear in Admin > Seller applications and status/note changes persist.
- Test the storefront and existing customer login/order/payment flows for regressions.
- Do not enable public seller product uploads or seller payouts until seller authorization, order splitting, refund logic and marketplace payment onboarding are implemented and tested.
