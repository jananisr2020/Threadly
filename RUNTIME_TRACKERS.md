# Juno Runtime Trackers

- Generated: 2026-10-20 15:43:17 IST
- Repository: [jananisr2020/Threadly](https://github.com/jananisr2020/Threadly)
- Excel workbook: [Juno_Runtime_Trackers.xlsx](./Juno_Runtime_Trackers.xlsx)
- Live operational records stay in private Google Sheets; this public repository contains definitions/templates, not customer-level records.

## How this works

Website events are written to the WebsiteActivity Google Sheet tab after optional consent. ActivityLog is a general server/API audit stream and is not guaranteed to be a complete login-only tracker unless login success/failure events are explicitly emitted. Orders remains the order source of truth.

GitHub Actions regenerates this guide and workbook on pushes to main and on manual workflow runs. The workbook has headers, field guidance and formula-driven row counts for data entered into the workbook; it does not claim to contain live Sheet rows.

**Privacy boundary:** this repository is public. Do not copy raw login, session, customer or order rows into it. Live records remain in Google Sheets.

## Tracker definitions

### Login & API Audit

- Live tab: ActivityLog
- Purpose: Audit server/API activity. This is not a dedicated login-only stream; the login handler must explicitly emit success/failure events for complete login tracking.
- Privacy: Keep account identifiers and IP addresses in the private Google Sheet only. Never publish raw audit rows in this public repository.

| Field | Meaning |
|---|---|
| Event ID | Unique event identifier |
| Timestamp (IST) | Event time in India Standard Time |
| Event | Allowlisted action name |
| Account/User ID | Internal account reference |
| Role | Customer, seller, admin or service role |
| Result | Success/failure or outcome |
| IP/Request ID | Operational diagnostic identifier; keep private |
| Details | Sanitized metadata only |

### Website Activity

- Live tab: WebsiteActivity
- Purpose: Consent-based website events: page_view, product_click, add_to_cart, buy_now, wishlist_toggle, compare_toggle, search_submit, checkout_start, account_action, seller_action and cart_action.
- Privacy: Only enabled after Accept all. Raw search terms, passwords, form contents and payment details are not sent. Do not commit session-level data to this public repo.

| Field | Meaning |
|---|---|
| Event ID | Unique event identifier |
| Timestamp (IST) | Event time in India Standard Time |
| Session ID | Pseudonymous browser session identifier |
| Event | Allowlisted action name |
| Page | Page path only |
| Product ID | Product/catalogue identifier |
| Control | UI control/action label |
| Referrer Origin | Referring website origin, not full URL |
| Details | Sanitized metadata only |

### Orders

- Live tab: Orders
- Purpose: Order source of truth for checkout, payment and fulfilment. This workbook provides a structured template, not a live customer-data export.
- Privacy: Customer names, phone numbers, addresses, payment identifiers and order-level personal data must remain in the private Google Sheet. A status timeline needs a separate append-only OrderEvents tab.

| Field | Meaning |
|---|---|
| Order ID | Order reference |
| Created At (IST) | Order creation time |
| Customer Ref | Internal customer reference; avoid personal details |
| Items / SKU | Products/SKUs on order |
| Quantity | Units ordered |
| Order Value (INR) | Order total in INR |
| Payment Status | Pending, paid, failed, refunded, etc. |
| Fulfilment Status | Processing, shipped, delivered, cancelled, etc. |
| Seller Ref | Seller reference |
| Updated At (IST) | Last update time |
| Notes | Non-sensitive operational notes |

## Current limitations

- Website activity is consent-gated and writes to WebsiteActivity when backend and Google Sheets credentials are configured.
- ActivityLog is a general server/API audit stream, not a guaranteed complete login tracker yet.
- Orders contains current order records; a full order-status timeline needs an append-only OrderEvents tab and explicit status-change writes.
- The workbook is regenerated from tracker definitions. Live records stay in Google Sheets to avoid publishing personal or session data.
