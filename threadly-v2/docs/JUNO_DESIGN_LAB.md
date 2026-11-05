# Juno Design Lab — implementation notes

## Purpose

Add a customer-facing creative space to the Juno accessories marketplace with two paths:

1. **Design your own** — customers configure a jewellery/accessory concept and download a design brief.
2. **Explore handmade** — customers prepare a handmade/customisation request brief.

The first version is a frontend-only prototype at `public/design-lab.html`. It uses inline SVG for a lightweight preview, responsive CSS, no third-party libraries, and no paid AI service. It does not claim to create a production-ready 3D model.

## Current branch implementation

- Choose bracelet, necklace, earrings, thread bangle, or hair accessory.
- Choose a pastel colour, motif, design style, and target budget.
- See a simplified illustration update in the browser.
- Download a text design brief.
- Switch to a handmade request form and download a request brief.
- Review the proposed stock and artisan workflow.

## Important current limitations

- The storefront has a Design Lab entry point; confirm the deployed build before expecting it to appear live.
- Request submission depends on Netlify environment variables and Google Sheets permissions. The live spreadsheet connection has not been verified here.
- Requests do not yet reserve stock, calculate a verified quote, match an artisan, accept payment, or create an order.
- Basic honeypot filtering is present; production still needs robust rate limiting, monitoring, data-retention rules and a privacy notice.
- No material quantities, supplier relationships, or artisan availability are asserted.
- The design illustration is conceptual and is not a manufacturing specification.
- It is not deployed until the branch is reviewed, merged, and the configured Netlify deployment succeeds.

## Recommended operating model: asset-light pilot

Do not purchase bulk beads, crystals, threads, tools, or hire employees before validating demand.

1. Recruit a small number of existing jewellery makers / artisans as independent seller-partners.
2. Collect sample photographs, supported techniques, minimum order quantity, capacity, turnaround time, pricing, and quality expectations.
3. Ask each maker to declare which supplies they own and which components they need Juno/customer to provide.
4. Begin with made-to-order items using maker-owned supplies, where possible.
5. Confirm a written quote, lead time, material availability, customisation limits, and cancellation/refund terms before taking payment.
6. Juno can later hold a small shared supply stock only when real order data demonstrates repeat demand.

Avoid calling a maker an employee unless an employment arrangement is actually intended. Start with a partner/contractor model subject to appropriate local business and legal review.

## Inventory workbook / Google Sheet structure

Use separate tabs for **MaterialsStock**, **FinishedProducts**, **Artisans**, **CustomRequests**, and **StockMovements**. Do not mix supply stock with finished product stock.

### MaterialsStock

Template CSV: `docs/juno-material-stock-template.csv`.

Required operational fields:
- material_id (stable unique identifier)
- category, material_name, variant, unit
- qty_on_hand, qty_reserved, reorder_level
- unit_cost_inr, supplier, supplier_sku
- last_counted_at, storage_location, quality_status, notes

The sample rows are labels only. Quantity and cost cells are intentionally blank. Count and verify stock before populating values or displaying availability.

### Artisans

Suggested fields:
- artisan_id, display_name, contact (restricted access), location
- techniques, supported_products, materials_provided
- capacity_per_week, typical_lead_days, labour_rate
- sample_work_links, quality_check_status, active_status
- agreed_terms_date, last_verified_at

### CustomRequests

Suggested fields:
- request_id, created_at, customer_id (avoid exposing it publicly)
- product_type, design_brief_json_or_text, target_budget_inr
- customer_notes, status, matched_artisan_id
- confirmed_materials, quoted_price_inr, quoted_lead_days
- customer_approval_at, order_id, status_updated_at

Suggested states: draft → submitted → review_needed → waiting_for_quote → quote_sent → customer_approved → payment_pending → in_production → quality_check → dispatched → completed. Also support declined, cancelled, and refund_review where applicable.

### StockMovements

Track every adjustment with movement_id, timestamp, material_id, movement_type (receive/reserve/release/consume/adjust), quantity, related_request_or_order, actor, and notes. Avoid silently overwriting stock counts. Reconcile physical counts regularly.

## Costing approach

Estimated retail price must not be presented as a confirmed quote. For a made-to-order product, quote calculation should account for:
- actual material usage × verified unit costs
- artisan labour
- packaging
- shipping / fulfilment
- platform/payment fees
- applicable tax and a documented margin

Do not accept payment or promise delivery until a maker, required components, final quote, and lead time are confirmed.

## Suggested implementation phases

### Phase 1 — prototype and request intake
Current branch includes the interactive UI, storefront entry point, server-side request validation, Google Sheets persistence, inventory status endpoint and inventory template. It remains unmerged and needs automated checks.

### Phase 2 — verify spreadsheet connection
Configure `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY` in Netlify; share the spreadsheet with the service account; test tab creation, request writes and safe inventory reads without exposing secrets.

### Phase 3 — operational protection
Add edge/server rate limiting, abuse monitoring, data retention and privacy wording. Restrict access to customer contact details.

### Phase 4 — artisan review
Create a restricted admin view to match a request to a verified artisan, check stock, and prepare a quote. The customer must approve the quote before the request becomes a paid order.

### Phase 5 — inventory and production
Connect material stock movements, reservations, artisan capacity, finished-product stock, order status, and dispatch/quality-check steps. Ensure failed/cancelled orders release reservations safely.

## Acceptance checks before production

- Test mobile layout and keyboard-only navigation.
- Test all product, colour, motif, style, and budget controls.
- Verify downloaded briefs contain the selected values.
- Confirm request submission writes one row to `CustomRequests` and returns a request reference.
- Confirm no design request is represented as a confirmed order.
- Confirm blank/unverified quantities return `confirmation_required`, never `available`.
- Confirm the public inventory endpoint never returns quantities, costs or supplier contact details.
- Add the navigation link only after route and deployment checks.
- Verify Netlify build and existing checkout/catalogue flows before merging.
