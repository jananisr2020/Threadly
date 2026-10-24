# Juno transactional inventory — Supabase setup plan

## Decision

Use **Supabase PostgreSQL** as the transactional inventory authority while retaining Google Sheets for the existing product, customer, order, review and seller workflow during this transition. Do not move every sheet/table into a new database as part of this release task.

Supabase provides PostgreSQL transactions and row locks needed to reserve stock safely. The SQL schema in `docs/supabase-inventory-reservations.sql` is the initial database-side primitive; it is not production-ready until the backend integration and the acceptance checks below pass.

## Important operating rules

1. **Do not enable seller sales**. Keep `MARKETPLACE_SELLER_SALES_ENABLED=false`.
2. Do not connect the browser directly to Supabase with a service-role key. Only Netlify server functions may access the database.
3. Keep `SHEET_ID` and existing Google service-account settings for the current application. Do not delete the Google Sheet or assume it is automatically synchronized.
4. Before cutover, export the authoritative stock quantities for all active products, import them into `public.juno_inventory`, and reconcile the count and stock for every product. Blank/untracked stock must not be silently converted to zero or unlimited stock.
5. At cutover, the transactional table must be the **single source of truth for stock**. If checkout reads inventory from PostgreSQL but admin/seller changes continue writing only to Google Sheets, the application can oversell or show stale stock. Update stock-management/admin workflows and stock display before enabling checkout reservations.
6. Payment confirmation must remain based on server-verified Razorpay status and signed webhook evidence. A browser redirect is not proof of payment.
7. A reservation should be created before starting a payment attempt. On verified capture, commit it idempotently; on verified failed/expired attempts, release it idempotently. Never release stock merely because the browser closed or the client reported failure.
8. Run a scheduled cleanup for expired reservations only after checking authoritative Razorpay status. A reservation TTL alone is not enough evidence that payment did not succeed.

## Supabase project setup

1. Create a Supabase project in a region appropriate for the business and record the project URL and server-side secret privately.
2. In Supabase SQL Editor, apply `docs/supabase-inventory-reservations.sql` in a development project first.
3. Add the server-side environment variables to Netlify when ready:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never use a publishable/anon key for this)
4. Never paste these values into GitHub, chat, logs, or a committed `.env` file.
5. Use a development/test project and synthetic orders for the initial test. Do not test with real payments.

## Required backend integration before T25 can be marked complete

- Add a small server-only adapter for calling the reservation, commit and release RPCs.
- Give each payment attempt a stable, unpredictable checkout/reservation ID and bind it to the Pending row/order attempt.
- Validate the normalized product IDs and quantities on the server; aggregate duplicate product IDs before reservation.
- Reserve stock transactionally before creating the Razorpay order. If payment-order creation fails, release the reservation safely.
- On verified captured payment, commit the same reservation exactly once. On signed failure/refund/reconciliation paths, follow explicit stock policy; a refund must not automatically restock goods already shipped.
- Make admin stock edits write to the same transactional inventory table, with an audit note and a controlled import/reconciliation process.
- Ensure product API availability/stock fields read from the inventory authority (or use a documented, tested read model).
- Fail closed when Supabase is not configured or the RPC fails. Do not silently fall back to Google Sheets inventory for checkout.
- Add tests for concurrent reservations of the last unit, duplicate request replay, same checkout ID with changed payload, missing product, invalid quantity, RPC outage, payment-create failure, captured-payment replay, verified payment failure, and release replay.
- Add operational monitoring for stale reservations and stock reconciliation mismatches.

## Acceptance checklist

- [ ] Development Supabase schema applied.
- [ ] Every active catalogue product's stock imported and reconciled.
- [ ] Admin stock editing writes to the same inventory authority.
- [ ] Netlify function adapter implemented; no secret sent to browser.
- [ ] Parallel test: two checkout attempts request the final unit; exactly one succeeds.
- [ ] Replay tests prove no double decrement/restore.
- [ ] Razorpay test-mode checkout and signed webhook tests pass.
- [ ] Missing database configuration blocks checkout safely.
- [ ] Backup/export and rollback procedure verified.
- [ ] Seller sales remain disabled until explicit owner sign-off.

## Scope and cost

The code and SQL preparation can be committed without credentials. Creating the hosted database, configuring secrets, importing stock, running hosted concurrency/payment tests, and any provider-specific billing/limits require access to the Supabase and Netlify accounts. Check current Supabase plan limits and region/pricing before selecting the project; do not assume a free tier is permanent or suitable for production.
