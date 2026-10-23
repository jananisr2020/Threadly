# Juno Function Reference

This reference explains the purpose and observable behavior of the shared backend functions and persistence/discount helpers. It is based on the current implementation in `threadly-v2/netlify/lib/core.js`, `sheets.js`, and `coupons.js`. Function names and signatures can change; check the linked source before changing a contract. “Throws” means the function rejects/throws an error that the API wrapper converts into an HTTP response.

## Backend entry point and shared helpers — `netlify/lib/core.js`

Source: [core.js](../threadly-v2/netlify/lib/core.js)

### HTTP, input and security helpers

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `E` | `message`, optional HTTP `code` (default 400) | Application error class; stores the intended HTTP status in `.code`. | No external side effects. Used to return controlled API errors. |
| `json` | `code`, response object, optional extra headers | Builds a Netlify function response with JSON content type, no-store cache policy, extra headers and serialized body. | No I/O. |
| `parse` | Netlify event `e` | Parses `e.body` as JSON; returns an empty object for missing/invalid JSON. | Invalid JSON is intentionally swallowed here; downstream validation must reject missing fields. |
| `clean` | Any value `t` | Converts nullish values to an empty string, removes angle brackets, trims, and limits text to 300 characters. | Basic input normalization, not a complete HTML-escaping or URL-validation function. |
| `noteMarker` | `note`, marker `key` | Finds a pipe-separated `key=value` marker and returns its trimmed value, or an empty string. | No I/O. |
| `setNoteMarker` | `note`, `key`, `value` | Replaces any existing marker with the same key, appends the new marker, and limits the note to 500 characters. | No I/O; may truncate other note text at the end. |
| `ip` | Event `e` | Reads the Netlify client IP or forwarded IP header and takes the first comma-separated address; falls back to `?`. | Used as a rate-limit key; trusts the hosting headers. |
| `limit` | Key, maximum count, window in milliseconds | Keeps an in-memory timestamp window and throws HTTP 429 when the key exceeds its allowance. | Process-local only: not shared across serverless instances and reset when the process restarts; map is cleared if it grows beyond 5,000 keys. |
| `sleep` | Milliseconds | Returns a promise that resolves after the requested delay. | Adds latency; used to allow webhook/order state to settle. |
| `now` | None | Returns a date/time string formatted for the Asia/Kolkata time zone. | No I/O. |
| `secret` | None | Returns `JWT_SECRET`. | Throws HTTP 500 if the environment variable is missing. |
| `sign` | JWT payload `p`, expiry `exp` | Signs a JWT using `secret()` and the supplied expiry. | Throws if JWT configuration is missing or signing fails. |
| `bearer` | Event `e` | Reads Authorization header, strips the Bearer prefix, verifies JWT, and returns claims. | Returns `null` for invalid/expired tokens rather than throwing. |
| `safeActivityDetails` | Request body `b` | Serializes only a small allowlist of short action/status/ID/type fields. | Deliberately excludes arbitrary request bodies and secrets. |
| `writeActivity` | Event, handler function, body, optional user, outcome, status | Best-effort appends a structured API event to the `ActivityLog` Sheet; derives actor/role/path and records safe details. | Skips when Sheet credentials are missing; logs failures but never blocks the main request. Creates/caches the tab readiness promise. |
| `wrap` | HTTP method, handler function, optional auth mode | Returns a Netlify handler that checks the method, parses body, optionally validates customer auth, calls the handler, standardizes response/errors and records activity. | Converts `E` errors to their status/message; unknown errors become generic 500s. User auth rejects admin/seller/special-purpose tokens. |
| `trackWebsiteActivity` | Event body `b`, Netlify event `e` | Requires explicit `consent === 'all'`, validates an allowlisted browser event/session ID, sanitizes page/product/control/referrer data and appends to `WebsiteActivity`. | Rate-limited by IP; creates the Sheet tab as needed; throws for missing consent, invalid IDs/events or Sheet failures. |
| `referrerOrigin` | Internal inline expression | Extracts only the origin from a supplied referrer URL; returns an empty string when parsing fails. | No I/O; prevents storing the full referrer path/query. |
| `sha` | Text `t` | Produces a SHA-256 hexadecimal digest using Node crypto. | No I/O; used for deterministic comparisons/identifiers where called. |

### Product catalogue and pricing

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `nk` | Header text `h` | Normalizes a Sheet header to lowercase, trims it, and removes a trailing parenthetical annotation. | No I/O. Used to map Sheet columns by name. |
| `productRows` | Optional `force` | Reads the Products Sheet and caches rows for 30 seconds unless forced or cache is empty. | Google Sheets read; errors propagate. |
| `invalidate` | None | Clears the in-memory product-row cache timestamp and rows. | No I/O. Call after catalogue/stock writes. |
| `csv` | Array of rows | Serializes rows as CSV, escaping embedded double quotes and quoting each cell. | No I/O. |
| `products` | None | Returns a raw CSV HTTP response containing the public product rows. | Reads Sheets through `publicProductRows`; returns cache headers for a short public cache. |
| `productObjs` | Sheet rows | Converts header-based row arrays into objects and adds the original 1-based Sheet row number as `row`. | No I/O; assumes first row is headers. |
| `num` | Value `v` | Extracts numeric characters and decimal points, then converts to a number; invalid/empty values become zero. | No I/O; intentionally permissive, so validate values before relying on it for money. |
| `marketplaceSellerSalesEnabled` | None | Returns true only when `MARKETPLACE_SELLER_SALES_ENABLED` is the string `true` (case-insensitive). | Reads environment configuration. |
| `publicProductRows` | Optional force flag | Filters Products Sheet rows for nonempty IDs, prices above zero and at most ₹500, visible rows, approved status where present, and seller listings only when marketplace sales are enabled. Removes seller ID and approval status values from the public rows. | Reads cached/fresh Sheet data; this is the main public visibility/price gate. |
| `catalogue` | Optional force flag | Builds an ID-keyed catalogue object with name, price, stock, row, seller, category and image for eligible products. Blank stock is represented as 999 for checkout validation. | Reads product rows; seller listings are gated by the marketplace feature flag. |
| `price` | Cart items array and coupon code | Validates nonempty cart, product availability, integer quantity (1–20 per item and aggregated product), and stock; calculates subtotal, coupon discount, ₹39 shipping when post-discount subtotal is below ₹299, total, item count, line summary, quantities and item details. | Forces fresh catalogue read; coupon rules come from `coupons.js`; throws for unavailable products, invalid quantities or insufficient tracked stock. Blank stock is treated as untracked. |

### Customer accounts and authentication

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `findUser` | Normalized email | Scans the Users Sheet and returns the matching row number and row values, or `null`. | Google Sheets read; exact column assumptions are embedded in the implementation. |
| `cred` | Request body `b` | Normalizes email, extracts password as a string, and cleans the display name; returns `{email,pw,name}`. | No I/O. |
| `passwordPolicyError` | Password `pw` | Checks password against the policy implemented in source and returns an explanatory error string or a falsey value. | No I/O; inspect source for the current exact policy before changing it. |
| `signup` | Body and event | Validates registration fields/password, prevents duplicate accounts, hashes password and stores the customer row; returns user/session information according to the handler implementation. | Rate limits attempts and writes to Users Sheet; validation and Sheet errors can fail signup. |
| `login` | Body and event | Validates credentials, checks the stored bcrypt hash, updates login metadata/count and returns a signed customer token plus public user data. | Rate limited; reads and may update Users Sheet. A login-metadata write failure is logged rather than necessarily blocking login. |
| `customerProfile` | Body, event, authenticated user | Reads and returns the authenticated customer's own profile, using the token email to scope the lookup. | Sheet read; rejects missing/invalid account state. |
| `updateCustomerProfile` | Body, event, authenticated user | Validates allowed profile fields and updates only the row belonging to the authenticated customer. | Sheet read/write; validation errors are returned as client errors. |
| `forgot` | Email body and event | Validates email, rate-limits by IP and email, and if the account exists sends a time-limited reset link; response is deliberately generic so account existence is not disclosed. | Uses Brevo mail and JWT; requires `BREVO_API_KEY`, `MAIL_FROM`, and `JWT_SECRET`. |
| `reset` | Reset token and new password | Verifies a reset-purpose JWT, checks a hash-derived token marker against the current stored password hash to enforce one-time use, hashes the new password and updates the Users row; returns a new login token. | Rate limited; token expires and becomes invalid after password changes. |
| `mail` | Recipient, subject, HTML body | Sends an email through Brevo's SMTP API. | Requires Brevo API key and sender address; throws a controlled error on missing configuration or unsuccessful provider response. |

### Checkout, payment and order reconciliation

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `buildOrder` | Checkout body `b`, authenticated user `u` | Validates delivery name/phone/address/pincode, confirms the pincode is serviceable in Tamil Nadu, checks payment method and calculates fresh cart totals. Returns the internal order object with generated Juno order ID and address/cart/payment fields. | Calls pincode lookup and `price`; throws on invalid address, unsupported region or payment method. |
| `record` | Order object, payment status and payment ID | Appends the paid order to Orders first, then decrements tracked stock item-by-item and marks stock sync as complete. | Multiple non-transactional Sheet writes. On inventory mismatch/failure it flags the order for reconciliation and throws a 503 explaining not to pay again. |
| `placeCod` | None | Explicitly rejects cash-on-delivery with HTTP 410. | No I/O; COD is disabled by design. |
| `rz` | None | Returns a test override when configured, otherwise constructs a Razorpay client from server environment credentials. | Throws if Razorpay key ID/secret are missing. |
| `createOrder` | Checkout body, event and authenticated user | Rejects COD, rate-limits order creation, builds the validated order, creates a Razorpay INR order, stores the internal order in Pending, and returns Razorpay details plus a short-lived signed order token. | Razorpay API and Pending Sheet writes; if pending persistence fails, tells customer not to proceed with payment. |
| `markPending` | Razorpay order ID and status | Finds a Pending row and updates its status column. | Best-effort Sheet update; catches/logs failures instead of throwing. |
| `ensureSellerOrders` | Paid internal order and payment ID | Splits seller-owned line items from a mixed cart and creates one SellerOrders row per seller, deduplicating by parent order plus seller ID. | Reads/writes marketplace Sheets. Returns false when required tabs/headers/seller account are unavailable; does not send payouts. |
| `ensureSellerLedger` | Parent Juno order ID | Builds/rebuilds seller ledger calculations from seller orders and parent-order discount; computes allocated discount, commission and net amount only when the commission basis-points setting is valid. Preserves rows with payout references or refund-review status. | Sheet reads/writes; returns false if tabs are unavailable; validates commission from 0–5000 basis points. Values are calculations/review state, not payouts. |
| `recordPaid` | Internal order, payment ID, Razorpay order ID | Deduplicates payment/order records, records a new paid order when needed, reconciles seller orders/ledger and marks Pending as recorded or requiring seller reconciliation. | Coordinates multiple Sheet operations; detects previously flagged stock reconciliation and asks for manual support rather than duplicate payment. |
| `verifyPayment` | Razorpay order/payment/signature and signed order token, event, authenticated user | Validates required fields, checks Razorpay HMAC signature with timing-safe comparison, verifies token ownership/order ID, fetches payment from Razorpay and checks order, INR amount and captured status before calling `recordPaid`. | Razorpay API and Sheet writes; rejects mismatches, uncaptured payments and provider verification outages. |
| `webhook` | Parsed body and Netlify event | Verifies the raw-body Razorpay webhook HMAC; handles captured/paid events by fetching and validating payment before recording, refund events by updating order/ledger review state, and failed events by marking eligible Pending rows without downgrading already-paid orders. | Uses Razorpay and Sheets; invalid signatures are rejected. Retryable provider failures throw; seller refund ledger updates are best-effort and require manual reconciliation. |

### Seller marketplace

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `sellerApply` | Application body and event | Validates owner/store/email/Indian mobile/city/category/about/consent/social URL, prevents a duplicate active application and appends a seller-application request. | Rate limited; requires Sheet ID and service-account credentials; maps common Google permission/configuration errors to actionable 503 responses. |
| `ensureMarketplaceTabs` | None | Ensures the Sellers, SellerOrders and SellerLedger tabs exist with expected headers. | Creates empty tabs/headers via Sheets adapter; does not overwrite nonempty tabs. |
| `sellerRows` | None | Ensures the Sellers tab then returns its rows. | Google Sheets read/write during tab initialization. |
| `sellerByEmail` | Email | Finds a seller row by case-insensitive email and returns row number plus values, or null. | Reads Sellers Sheet. |
| `sellerPublic` | Seller row values | Maps the stored row into a safe public seller object (ID, store name, email, city, category), excluding password hash/status internals. | No I/O. |
| `sellerActivate` | Activation token/password and event | Validates activation password/token, checks the matching application is approved and email matches, rejects existing accounts, hashes password, creates seller row and returns seller JWT. | Rate limited; writes Sellers Sheet; activation tokens must carry seller-activate purpose and approved application ID. |
| `sellerLogin` | Email/password and event | Validates credentials, confirms seller is Active, bcrypt-compares password, updates last-login time and returns seller profile/JWT. | Rate limited; reads and updates Sellers Sheet. |
| `sellerOrders` | Action body and event | Requires a valid active seller token. `load` returns only that seller's orders; `update` validates allowed status transitions and tracking data for an order owned by that seller. | Reads/writes SellerOrders; rejects cross-seller order IDs and invalid status transitions. |
| `sellerProducts` | Action body and event | Requires active seller token. `profile` returns seller profile; `load` lists owned products; `save` creates a seller product; `update` edits an owned product. Product edits enforce category/price/stock/MRP/image/details rules and reset approval to Pending and visibility to Hidden. | Reads/writes Products Sheet and invalidates cache; newly saved/edited products are not made public automatically. |

### Reviews, requests, support and delivery

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `reviews` | Event query parameter `pid` | Loads approved reviews for one product, calculates average rating/count and returns at most 30 reviews. | Sheet read; a missing Reviews tab is logged and treated as an empty review list. |
| `addReview` | Review body, event and authenticated user | Validates product/rating/comment, prevents duplicate reviews by the same email/product, checks past orders for a verified-purchase marker, then appends the review. | Rate limited; reads Products/Reviews/Orders/Users and writes Reviews. Current implementation stores the review as Approved immediately. |
| `padOrder` | Order row | Normalizes an order row to 20 cells, filling missing values with empty strings. | No I/O. |
| `returnRequest` | Request body, event and authenticated user | Validates cancel/return reason and order ownership; prevents duplicate active requests. Cancels eligible New orders immediately; permits returns after delivery subject to time window, exception reason and hygiene-sensitive category checks. | Reads/writes Orders and Requests and may read Pending for item categories; some legacy orders are routed for manual eligibility review. |
| `myRequests` | Body, event and authenticated user | Returns request rows belonging to the current user's email, newest-first, with safe summary fields. | Reads Requests; missing tab is treated as no requests. |
| `why` | Error object | Converts common Google Sheets/auth/range errors into a safe setup diagnostic string. | Reads environment presence; does not expose secret values. |
| `health` | None | Public liveness response identifying the Juno API and stating diagnostics require admin auth. | No sensitive configuration returned. |
| `securityHealth` | Body and event | Requires an admin JWT and reports safe configuration/connectivity diagnostics for security/setup troubleshooting. | May probe Sheets/configuration; denies unauthenticated requests. |
| `pinApi` | API path | Helper for calling the pincode provider using the configured URL pattern. | External network request; provider errors propagate to the caller. |
| `tnPin` | Pincode | Checks whether the supplied pincode resolves to a serviceable Tamil Nadu location. | Calls the pincode lookup helper/provider; false or error means checkout cannot proceed. |
| `pincode` | Body and event | Validates/looks up a pincode for the storefront and returns delivery serviceability details. | External lookup; invalid/unserviceable codes return controlled errors. |
| `SUP` | Internal support-column mapping | Defines the expected support-ticket field/column indexes used by support handlers. | No I/O. |
| `tryMail` | Recipient, subject and HTML | Best-effort email sender for support notifications. | Provider/configuration failures are logged/handled without necessarily blocking ticket creation. |
| `ticket` | Ticket body and event | Validates and records a support ticket/request and sends notification where configured. | Writes support data to Sheets; email is best effort. |
| `myTickets` | Body, event and authenticated user | Returns support tickets belonging to the authenticated customer. | Reads support data and scopes results by customer email. |
| `orderTime` | Date/time text `t` | Parses/normalizes order time for sorting or display logic. | No I/O; invalid dates depend on the implementation's fallback behavior. |
| `signals` | None | Builds product/activity signal data used by storefront recommendations or analytics. | Reads relevant catalogue/activity data; failures depend on the underlying Sheet calls. |
| `rank` | Order/object `o` | Calculates the ranking score used to order candidate signal/recommendation objects. | No I/O. |
| `visibleIds` | None | Produces the set/list of currently visible eligible product IDs. | Reads product catalogue; respects visibility/approval/price/seller feature gates. |
| `myOrders` | Body, event and authenticated user | Returns order history scoped to the signed-in customer and maps Sheet rows into response objects. | Reads Orders and related data; must not be used to fetch another customer's orders. |

### Administrator handlers

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `adminLogin` | Admin login body and event | Validates admin credentials against server configuration and issues an admin JWT. | Rate limited by implementation; requires configured admin credentials and JWT secret. |
| `admin` | Admin action body and event | Admin-authenticated dispatcher for management actions such as orders, products, requests, reviews, sellers, seller products/orders/ledger, tickets and users. | Reads/writes multiple Sheets; action-specific validation/errors apply. Never expose this handler without admin auth. |

## Google Sheets adapter — `netlify/lib/sheets.js`

Source: [sheets.js](../threadly-v2/netlify/lib/sheets.js)

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `c` | None | Lazily constructs and caches a Google Auth Library JWT service-account client with Sheets scope; normalizes escaped newlines in the private key. | Requires service-account email/private key; Google auth/API errors propagate. |
| `base` | None | Builds the Google Sheets REST API base URL from `SHEET_ID`. | Does not validate the ID itself. |
| `enc` | Tab/range text | URL-encodes a tab/range for the REST URL. | No I/O. |
| `read` | Tab name | Reads the tab's values and returns the values array or an empty array. | Google Sheets API read; auth, permission and missing-sheet errors propagate. |
| `append` | Tab name, row array | Appends one row using RAW input and INSERT_ROWS. | Google Sheets API write; errors propagate. |
| `update` | Tab name, 1-based row number, row array | Replaces values starting at column A of the specified row using RAW input. | Google Sheets API write; no transactional compare-and-swap. |
| `ensureTab` | Tab name, header array | Checks spreadsheet tab metadata, creates a missing tab, reads it, and writes headers only if the tab is empty. Handles a concurrent create race by rechecking whether the tab now exists. | Multiple Sheets API calls; preserves nonempty tabs and existing data. Requires `SHEET_ID` and adequate edit permissions. |

## Coupons — `netlify/lib/coupons.js`

Source: [coupons.js](../threadly-v2/netlify/lib/coupons.js)

| Function | Inputs | What it does / result | Side effects and failure behavior |
|---|---|---|---|
| `active` | Coupon rule | Checks whether a rule is currently enabled according to its configuration. | No I/O. |
| `discount` | Coupon code, subtotal | Looks up a valid rule and calculates the eligible fixed or percentage discount subject to its minimum subtotal/cap rules. Returns a monetary discount (zero when no valid rule applies, according to the implementation). | No I/O; this is the server-side calculation used by checkout. Keep UI coupon display consistent with this function. |
| `publicList` | None | Returns the public-safe coupon list for storefront display, excluding internal configuration fields as implemented. | No I/O. |

## Function-reference scope and cautions

- This file documents the principal server-side business functions and persistence/coupon helpers. The generated [repository guide](REPOSITORY_TECHNICAL_GUIDE.md) inventories symbols across the rest of the repository, including browser UI and scripts.
- Some API wrappers expose the same core handler under different routes. Follow the corresponding file in `threadly-v2/netlify/functions/` to see the public endpoint name, HTTP method and auth mode.
- Descriptions are grounded in the current implementation; the source remains authoritative. In particular, Google Sheets does not provide transactions or uniqueness constraints, in-memory rate limiting is per process, and payment/stock/seller reconciliation can require operational review.
- This reference is an engineering aid, not a claim that every workflow is production-ready or independently security-audited.
