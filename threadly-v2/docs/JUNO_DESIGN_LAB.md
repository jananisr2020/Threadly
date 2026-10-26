# Juno Design Lab — implementation notes

## Purpose

Add a customer-facing creative space to the Juno accessories marketplace with two paths:

1. **Design your own** — customers configure a jewellery/accessory concept and download a design brief.
2. **Explore handmade** — customers prepare a handmade/customisation request brief.

The first version is a frontend-only prototype at `public/design-lab.html`. It uses inline SVG for a lightweight preview, responsive CSS, no third-party libraries, and no paid AI service. It does not claim to create a production-ready 3D model.

## Current prototype behaviour

- Choose bracelet, necklace, earrings, thread bangle, or hair accessory.
- Choose a pastel colour, motif, design style, and target budget.
- See a simplified illustration update in the browser.
- Download a text design brief.
- Switch to a handmade request form and download a request brief.
- Review the proposed stock and artisan workflow.

## Important current limitations

- This is **not yet linked from the storefront navigation**.
- The prototype does not send a request to Juno, Google Sheets, an artisan, or a seller.
- It does not reserve stock, calculate a verified quote, accept payment, or create an order.
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

### Phase 1 — prototype
Current branch includes a standalone interactive UI and inventory template.

### Phase 2 — storefront discovery
Add a clearly labelled Juno Design Lab entry to the existing mobile/desktop navigation and test accessibility, responsive layout, and route handling.

### Phase 3 — request persistence
Add a Netlify Function with server-side validation and store requests in the existing Google Sheets integration (or chosen database). Keep credentials server-side. Add spam/rate-limit protections and a privacy notice.

### Phase 4 — artisan review
Create a restricted admin view to match a request to a verified artisan, check stock, and prepare a quote. The customer must approve the quote before the request becomes a paid order.

### Phase 5 — inventory and production
Connect material stock movements, reservations, artisan capacity, finished-product stock, order status, and dispatch/quality-check steps. Ensure failed/cancelled orders release reservations safely.

## Acceptance checks before production

- Test mobile layout and keyboard-only navigation.
- Test all product, colour, motif, style, and budget controls.
- Verify downloaded briefs contain the selected values.
- Confirm no design request is represented as a submitted order.
- Confirm no stock quantity or maker availability is invented.
- Add the navigation link only after route and deployment checks.
- Verify Netlify build and existing checkout/catalogue flows before merging.
