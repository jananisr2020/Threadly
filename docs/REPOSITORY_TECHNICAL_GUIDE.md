# Juno / Threadly — Repository Technical Reference

> Generated file. Do not hand-edit. Run node scripts/generate_repository_docs.js at repository root. Main-branch GitHub Actions refreshes it after changes. File descriptions are curated; file inventory, sizes, line counts, environment names and package scripts are derived from the checkout.

This describes source code at a revision; it is not proof that production services or credentials have been tested.

## 1. Repository overview

- Main app: threadly-v2/; browser files: threadly-v2/public/.
- Backend: Netlify Functions in threadly-v2/netlify/functions/.
- Shared business logic: threadly-v2/netlify/lib/core.js.
- Persistence: Google Sheets through threadly-v2/netlify/lib/sheets.js.
- Payments: Razorpay; email depends on provider configuration.
- Android wrapper: threadly-android/. CI: .github/workflows/.
- Tracked files: **119**.

### Directory map

| Directory | Purpose |
|---|---|
| `.github/` | Contains tracked files; see file catalogue. |
| `docs/` | Architecture diagrams and technical reference. |
| `scripts/` | Repository maintenance scripts. |
| `threadly-android/` | Android wrapper. |
| `threadly-v2/` | Main Juno application. |
| `.github/workflows/` | CI validation, tests, security scans and Android build. |
| `threadly-v2/netlify/` | Contains tracked files; see file catalogue. |
| `threadly-v2/public/` | Storefront, admin/seller pages, policies, PWA and public data. |
| `threadly-v2/scripts/` | Tests, validation and image workflows. |
| `threadly-v2/netlify/functions/` | Serverless API entry points. |
| `threadly-v2/netlify/lib/` | Shared backend logic and storage adapter. |
| `threadly-v2/public/images/` | Contains tracked files; see file catalogue. |
| `threadly-v2/public/images/categories/` | Contains tracked files; see file catalogue. |

## 2. Architecture and data flow

1. Browser pages under threadly-v2/public provide storefront, admin, seller, policy and PWA experiences.
2. threadly-v2/netlify.toml routes /api/* to Netlify Functions and configures SEO/admin routes.
3. Function files are API entry points; most delegate shared behavior to netlify/lib/core.js.
4. netlify/lib/sheets.js centralizes Google Sheets reads/writes. These are not atomic database transactions.
5. Razorpay order creation, payment verification and webhooks must be tested together; never trust browser totals or payment status.
6. manifest.webmanifest defines PWA install metadata; sw.js handles shell/offline caching.
7. CI success does not prove production credentials, deployment, email or payment integrations.

### Invariants

- Cash on delivery stays disabled.
- Selling prices are capped at ₹500.
- Payment status is controlled by verified gateway events, not manual admin edits.
- Keep MARKETPLACE_SELLER_SALES_ENABLED=false until inventory and seller settlement are verified.
- Never commit secrets or private customer data.
- Google Sheets read-modify-write does not guarantee concurrent inventory safety or idempotent restocking.

## 3. Developer commands

Run from threadly-v2/: npm ci; npm test; npm run check; npm run check:security.
At repository root: node scripts/generate_repository_docs.js regenerates this guide; add --check to verify freshness.

### Package scripts

| Package | Script | Command |
|---|---|---|
| `threadly-android/package.json` | `npm run android:sync` | `cap sync android` |
| `threadly-android/package.json` | `npm run android:open` | `cap open android` |
| `threadly-v2/package.json` | `npm run check` | `node scripts/check-links.js && node scripts/check-netlify-config.js && node scripts/test-image-qa.js` |
| `threadly-v2/package.json` | `npm run check:security` | `node scripts/check-security-config.js` |
| `threadly-v2/package.json` | `npm run test` | `node scripts/test-checkout.js` |
| `threadly-v2/package.json` | `npm run build` | `node scripts/build-catalog.js` |
| `threadly-v2/package.json` | `npm run images:qa` | `node scripts/export-image-qa.js` |
| `threadly-v2/package.json` | `npm run test:images-qa` | `node scripts/test-image-qa.js` |

## 4. Environment configuration inventory

Only names are documented. Actual values belong in private local/Netlify settings, never Git.

| Variable | Guidance |
|---|---|
| `ADMIN_PASSWORD` | Sensitive credential; keep private and never log it. |
| `BREVO_API_KEY` | Sensitive credential; keep private and never log it. |
| `GOOGLE_PRIVATE_KEY` | Sensitive credential; keep private and never log it. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Review .env.example and source before setting. |
| `JUNO_AI_STUDIO_TOKEN` | Review .env.example and source before setting. |
| `JUNO_IMAGE_WORKER_TOKEN` | Review .env.example and source before setting. |
| `JUNO_MARKETPLACE_COMMISSION_BPS` | Review .env.example and source before setting. |
| `JWT_SECRET` | Sensitive credential; keep private and never log it. |
| `MAIL_FROM` | Verified outbound email sender. |
| `MARKETPLACE_SELLER_SALES_ENABLED` | Keep false until seller safeguards are verified. |
| `OPENAI_API_KEY` | Sensitive credential; keep private and never log it. |
| `OPENAI_IMAGE_MODEL` | Review .env.example and source before setting. |
| `RAZORPAY_KEY_ID` | Review .env.example and source before setting. |
| `RAZORPAY_KEY_SECRET` | Sensitive credential; keep private and never log it. |
| `RAZORPAY_WEBHOOK_SECRET` | Sensitive credential; keep private and never log it. |
| `SHEET_ID` | Target Google spreadsheet. |
| `SUPPORT_EMAIL` | Customer support contact. |
| `SUPPORT_PHONE` | Customer support contact. |
| `URL` | Review .env.example and source before setting. |
| `WEBHOOK_DELAY_MS` | Review .env.example and source before setting. |

## 5. Serverless endpoint index

Route names follow Netlify function naming. Check handlers for exact method, auth and request/response schemas.

| Handler | Function route | Handler clues |
|---|---|---|
- `threadly-v2/netlify/functions/add-review.js` -> `/.netlify/functions/add-review` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/admin.js` -> `/.netlify/functions/admin` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/ai-product-views.js` -> `/.netlify/functions/ai-product-views` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/coupons.js` -> `/.netlify/functions/coupons` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/create-order.js` -> `/.netlify/functions/create-order` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/customer-profile-update.js` -> `/.netlify/functions/customer-profile-update` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/customer-profile.js` -> `/.netlify/functions/customer-profile` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/forgot.js` -> `/.netlify/functions/forgot` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/health.js` -> `/.netlify/functions/health` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/login.js` -> `/.netlify/functions/login` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/my-orders.js` -> `/.netlify/functions/my-orders` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/my-requests.js` -> `/.netlify/functions/my-requests` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/my-tickets.js` -> `/.netlify/functions/my-tickets` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/pincode.js` -> `/.netlify/functions/pincode` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/place-cod.js` -> `/.netlify/functions/place-cod` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/product-image-scheduler.js` -> `/.netlify/functions/product-image-scheduler` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/product-image-worker-background.js` -> `/.netlify/functions/product-image-worker-background` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/product-image.js` -> `/.netlify/functions/product-image` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/products.js` -> `/.netlify/functions/products` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/razorpay-webhook.js` -> `/.netlify/functions/razorpay-webhook` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/reset.js` -> `/.netlify/functions/reset` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/return-request.js` -> `/.netlify/functions/return-request` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/reviews.js` -> `/.netlify/functions/reviews` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/security-health.js` -> `/.netlify/functions/security-health` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/seller-activate.js` -> `/.netlify/functions/seller-activate` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/seller-apply.js` -> `/.netlify/functions/seller-apply` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/seller-login.js` -> `/.netlify/functions/seller-login` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/seller-orders.js` -> `/.netlify/functions/seller-orders` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/seller-products.js` -> `/.netlify/functions/seller-products` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/seo.js` -> `/.netlify/functions/seo` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/signals.js` -> `/.netlify/functions/signals` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/signup.js` -> `/.netlify/functions/signup` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/ticket.js` -> `/.netlify/functions/ticket` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/verify-payment.js` -> `/.netlify/functions/verify-payment` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- `threadly-v2/netlify/functions/website-activity.js` -> `/.netlify/functions/website-activity` — Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.

## 6. Complete tracked-file catalogue

Every tracked file is listed below except package lockfiles and this generated guide. Code files include statically detected function/class/method names, import dependencies and export hints. Detection is heuristic (not a full AST); dynamic dispatch and browser inline code need manual tracing.

### `.github/workflows/build-threadly-android.yml`

- **Purpose:** Android wrapper build workflow.
- **Type:** yml; **size:** 2,195 bytes; **lines:** 73.

### `.github/workflows/checkout-tests.yml`

- **Purpose:** Checkout regression test workflow.
- **Type:** yml; **size:** 1,103 bytes; **lines:** 43.

### `.github/workflows/historical-secret-scan.yml`

- **Purpose:** Historical secret scanning.
- **Type:** yml; **size:** 3,247 bytes; **lines:** 87.

### `.github/workflows/repository-technical-docs.yml`

- **Purpose:** GitHub Actions automation; inspect triggers, permissions and steps.
- **Type:** yml; **size:** 1,624 bytes; **lines:** 50.

### `.github/workflows/security.yml`

- **Purpose:** CI tests, static/security checks and dependency audit.
- **Type:** yml; **size:** 1,014 bytes; **lines:** 42.

### `.github/workflows/storefront-e2e.yml`

- **Purpose:** Browser-based storefront/seller tests.
- **Type:** yml; **size:** 1,213 bytes; **lines:** 41.

### `.github/workflows/validate-juno.yml`

- **Purpose:** Storefront syntax, branding, catalogue and policy validation.
- **Type:** yml; **size:** 9,257 bytes; **lines:** 161.

### `.gitignore`

- **Purpose:** Files Git should ignore.
- **Type:** special file; **size:** 152 bytes; **lines:** 4.

### `.gitleaks.toml`

- **Purpose:** Secret scanner configuration.
- **Type:** toml; **size:** 368 bytes; **lines:** 8.

### `README.md`

- **Purpose:** Project documentation; verify instructions against code.
- **Type:** md; **size:** 15,876 bytes; **lines:** 260.

### `SECURITY.md`

- **Purpose:** Project documentation; verify instructions against code.
- **Type:** md; **size:** 3,149 bytes; **lines:** 32.

### `docs/FUNCTION_REFERENCE.md`

- **Purpose:** Architecture diagram or technical documentation.
- **Type:** md; **size:** 26,401 bytes; **lines:** 168.

### `docs/juno-architecture.svg`

- **Purpose:** Architecture diagram or technical documentation.
- **Type:** svg; **size:** 4,308 bytes; **lines:** 18.

### `netlify.toml`

- **Purpose:** Tracked file; inspect source and references for exact behavior.
- **Type:** toml; **size:** 499 bytes; **lines:** 29.

### `scripts/generate_repository_docs.js`

- **Purpose:** Repository maintenance automation.
- **Type:** js; **size:** 18,171 bytes; **lines:** 98.
- **Imports/dependencies:** `node:fs`, `node:path`, `node:child_process`.
- **Detected symbols (8):**
  - `function files`
  - `function read(p)`
  - `function role(p)`
  - `function table(rows)`
  - `function symbolInventory(p, source)`
  - `function commentFor(source, symbol)`
  - `function main`
  - `function add(kind,name,sig)`

### `scripts/update_product_tracker.py`

- **Purpose:** Repository maintenance automation.
- **Type:** py; **size:** 11,502 bytes; **lines:** 196.
- **Imports/dependencies:** `csv, datetime as dt, json, os, subprocess`, `pathlib`.
- **Detected symbols (7):**
  - `function git(*args)`
  - `function parse_date(value)`
  - `function load_catalog_at(sha)`
  - `function stock(product)`
  - `function val(product, key)`
  - `function main`
  - `function event(kind, pid, old, new)`

### `scripts/update_project_tracker.py`

- **Purpose:** Repository maintenance automation.
- **Type:** py; **size:** 9,369 bytes; **lines:** 161.
- **Imports/dependencies:** `csv, datetime as dt, os, re, subprocess`, `pathlib`.
- **Detected symbols (7):**
  - `function git(*args)`
  - `function clean(s)`
  - `function summary(subject, body, paths)`
  - `function date(value)`
  - `function md_escape(s)`
  - `function commits_from_git`
  - `function main`

### `scripts/update_runtime_trackers.py`

- **Purpose:** Repository maintenance automation.
- **Type:** py; **size:** 7,398 bytes; **lines:** 51.
- **Imports/dependencies:** `pathlib`, `datetime`, `openpyxl`, `openpyxl.styles`, `openpyxl.utils`.
- **Detected symbols (2):**
  - `function build_doc`
  - `function build_workbook`

### `threadly-android/README.md`

- **Purpose:** Android wrapper setup notes.
- **Type:** md; **size:** 1,977 bytes; **lines:** 29.

### `threadly-android/capacitor.config.json`

- **Purpose:** Capacitor Android wrapper configuration.
- **Type:** json; **size:** 251 bytes; **lines:** 14.

### `threadly-android/package.json`

- **Purpose:** Android wrapper package scripts/dependencies.
- **Type:** json; **size:** 397 bytes; **lines:** 18.

### `threadly-v2/.env.example`

- **Purpose:** Environment variable names/examples; never put real secrets here.
- **Type:** example; **size:** 883 bytes; **lines:** 18.

### `threadly-v2/.gitignore`

- **Purpose:** Tracked file; inspect source and references for exact behavior.
- **Type:** special file; **size:** 40 bytes; **lines:** 6.

### `threadly-v2/AI_PRODUCT_STUDIO.md`

- **Purpose:** Project documentation; verify instructions against code.
- **Type:** md; **size:** 4,466 bytes; **lines:** 88.

### `threadly-v2/AI_PRODUCT_VIEW_BATCH.md`

- **Purpose:** Project documentation; verify instructions against code.
- **Type:** md; **size:** 5,197 bytes; **lines:** 98.

### `threadly-v2/AUTOMATIC_PRODUCT_IMAGES.md`

- **Purpose:** Project documentation; verify instructions against code.
- **Type:** md; **size:** 2,659 bytes; **lines:** 33.

### `threadly-v2/ECOMMERCE_AUDIT_TRACKER.md`

- **Purpose:** Ecommerce feature audit and benchmark tracker.
- **Type:** md; **size:** 40,266 bytes; **lines:** 223.

### `threadly-v2/JUNO_RELEASE_RUNBOOK.md`

- **Purpose:** Production checks, launch blockers and rollback instructions.
- **Type:** md; **size:** 8,374 bytes; **lines:** 103.

### `threadly-v2/JUNO_V1_BACKLOG.md`

- **Purpose:** V1 backlog with completion evidence and release risks.
- **Type:** md; **size:** 41,511 bytes; **lines:** 175.

### `threadly-v2/LOCAL_IMAGE_GENERATION.md`

- **Purpose:** Project documentation; verify instructions against code.
- **Type:** md; **size:** 4,638 bytes; **lines:** 75.

### `threadly-v2/MARKETPLACE_ROADMAP.md`

- **Purpose:** Marketplace rollout plan and seller constraints.
- **Type:** md; **size:** 7,314 bytes; **lines:** 87.

### `threadly-v2/README.md`

- **Purpose:** Project documentation; verify instructions against code.
- **Type:** md; **size:** 24,081 bytes; **lines:** 195.

### `threadly-v2/netlify.toml`

- **Purpose:** Tracked file; inspect source and references for exact behavior.
- **Type:** toml; **size:** 448 bytes; **lines:** 27.

### `threadly-v2/netlify/functions/add-review.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 83 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/admin.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 72 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/ai-product-views.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 5,478 bytes; **lines:** 91.
- **Exports:** `handler`.
- **Detected symbols (2):**
  - `function json(statusCode, payload)`
  - `export handler`

### `threadly-v2/netlify/functions/coupons.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 272 bytes; **lines:** 11.
- **Imports/dependencies:** `../lib/coupons`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/create-order.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 85 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/customer-profile-update.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 101 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/customer-profile.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 94 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/forgot.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 73 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/health.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 72 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/login.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 72 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/my-orders.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 81 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/my-requests.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 83 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/my-tickets.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 82 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/pincode.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 73 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/place-cod.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 82 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/product-image-scheduler.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 5,627 bytes; **lines:** 117.
- **Imports/dependencies:** `../lib/sheets`.
- **Exports:** `config`, `handler`.
- **Detected symbols (6):**
  - `function norm(value)`
  - `function response(statusCode, body)`
  - `function col(name)`
  - `function hasAllImages(row)`
  - `export config`
  - `export handler`

### `threadly-v2/netlify/functions/product-image-worker-background.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 8,255 bytes; **lines:** 157.
- **Imports/dependencies:** `@netlify/blobs`, `../lib/sheets`.
- **Exports:** `handler`.
- **Detected symbols (8):**
  - `function openAiEdit({ apiKey, sourceBytes, contentType, productName, category, view })`
  - `function getProductRow(productId)`
  - `function norm(value)`
  - `function json(statusCode, body)`
  - `function safe(value)`
  - `function normalizeImageUrl(value)`
  - `function ensure(name)`
  - `export handler`

### `threadly-v2/netlify/functions/product-image.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 1,453 bytes; **lines:** 37.
- **Imports/dependencies:** `@netlify/blobs`.
- **Exports:** `handler`.
- **Detected symbols (2):**
  - `function json(statusCode, body)`
  - `export handler`

### `threadly-v2/netlify/functions/products.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 74 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/razorpay-webhook.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 74 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/reset.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 72 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/return-request.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 87 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/reviews.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 73 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/security-health.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 85 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/seller-activate.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 86 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/seller-apply.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 83 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/seller-login.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 83 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/seller-orders.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 84 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/seller-products.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 86 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/seo.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 1,124 bytes; **lines:** 10.
- **Core delegate:** `core.visibleIds`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (2):**
  - `function esc(t)`
  - `export handler`

### `threadly-v2/netlify/functions/signals.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 73 bytes; **lines:** 3.
- **Wrapper hint:** `GET`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/signup.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 73 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/ticket.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 73 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/verify-payment.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 87 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/functions/website-activity.js`

- **Purpose:** Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.
- **Type:** js; **size:** 87 bytes; **lines:** 3.
- **Wrapper hint:** `POST`.
- **Imports/dependencies:** `../lib/core`.
- **Exports:** `handler`.
- **Detected symbols (1):**
  - `export handler`

### `threadly-v2/netlify/lib/core.js`

- **Purpose:** Shared server business rules: auth, validation, customer accounts, checkout, Razorpay verification, orders, inventory sync, support, sellers and admin.
- **Type:** js; **size:** 91,838 bytes; **lines:** 1022.
- **Imports/dependencies:** `./sheets`, `bcryptjs`, `jsonwebtoken`, `crypto`, `razorpay`, `./coupons`.
- **Detected symbols (84):**
  - `class E`
  - `function publicProductRows(force = false)`
  - `function catalogue(force = false)`
  - `function price(items, coupon)`
  - `function buildOrder(b, u)`
  - `function record(o, payStatus, payId)`
  - `function appendInventoryMovement(orderId, type, productId, delta, status, notes)`
  - `function restoreInventoryForOrder(orderId, movementType, orderRow)`
  - `function markPending(id, status)`
  - `function ensureSellerOrders(o, payId)`
  - `function ensureSellerLedger(parentOrderId)`
  - `function recordPaid(o, payId, rzpId)`
  - `function pinApi(path)`
  - `function tnPin(pin)`
  - `function json(code, obj, extra = {})`
  - `function parse(e)`
  - `function clean(t)`
  - `function noteMarker(note, key)`
  - `function setNoteMarker(note, key, value)`
  - `function ip(e)`
  - `function limit(key, max, ms)`
  - `function sleep(ms)`
  - `function now`
  - `function secret`
  - `function sign(p, exp)`
  - `function bearer(e)`
  - `function safeActivityDetails(b)`
  - `function writeActivity(e, fn, b, user, outcome, status)`
  - `function wrap(method, fn, auth)`
  - `function trackWebsiteActivity(b, e)`
  - `function referrerOrigin(()`
  - `function nk(h)` — ---------- products ----------
  - `function productRows(force)`
  - `function invalidate`
  - `function csv(rows)`
  - `function products`
  - `function productObjs(rows)`
  - `function num(v)`
  - `function marketplaceSellerSalesEnabled`
  - `function findUser(email)` — ---------- users ----------
  - `function cred(b)`
  - `function sellerApply(b, e)` — ---------- marketplace: seller applications ----------
  - `function ensureMarketplaceTabs`
  - `function sellerRows`
  - `function sellerByEmail(email)`
  - `function sellerPublic(v)`
  - `function sellerActivate(b, e)`
  - `function sellerLogin(b, e)`
  - `function sellerOrders(b, e)`
  - `function sellerProducts(b, e)`
  - `function passwordPolicyError(pw)`
  - `function signup(b, e)`
  - `function customerProfile(b, e, u)`
  - `function updateCustomerProfile(b, e, u)`
  - `function login(b, e)`
  - `function placeCod`
  - `function rz`
  - `function createOrder(b, e, u)`
  - `function verifyPayment(b, e, u)`
  - `function webhook(b, e)` — Razorpay webhook: records paid orders even if the customer closed the page, and marks refunds
  - `function mail(to, subject, html)` — Password reset by email (Brevo)
  - `function forgot(b, e)`
  - `function reset(b, e)`
  - `function reviews(b, e)` — ---------- reviews ----------
  - `function addReview(b, e, u)`
  - `function padOrder(r)` — ---------- return / cancellation requests ----------
  - `function returnRequest(b, e, u)`
  - `function myRequests(b, e, u)`
  - `function why(x)` — Setup checker: shows which settings and sheet tabs are working. Never returns secrets.
  - `function health` — Public liveness endpoint: do not disclose environment/configuration details anonymously.
  - `function securityHealth(b, e)`
  - `function pincode(b, e)`
  - `function SUP`
  - `function tryMail(to, sub, html)`
  - `function ticket(b, e)`
  - `function myTickets(b, e, u)`
  - `function orderTime(t)`
  - `function signals`
  - `function rank(o)`
  - `function visibleIds`
  - `function myOrders(b, e, u)`
  - `function sha(t)` — ---------- admin ----------
  - `function adminLogin(b, e)`
  - `function admin(b, e)`
- **Module role map:** API handlers and business rules for customer auth/profile/password reset; product visibility/pricing and stock validation; Razorpay order creation, signature/webhook processing and refunds; customer order history/returns; seller applications/accounts/catalogue/orders; admin order/product/review/ticket/request operations; consent-based activity logging; pincode lookup and support tickets. Confirm each handler body and the exported API below in source.

### `threadly-v2/netlify/lib/coupons.js`

- **Purpose:** Central coupon definitions and discount calculations.
- **Type:** js; **size:** 1,108 bytes; **lines:** 26.
- **Detected symbols (3):**
  - `function discount(code, subtotal)`
  - `function active(rule)`
  - `function publicList`

### `threadly-v2/netlify/lib/sheets.js`

- **Purpose:** Google Sheets persistence adapter used by backend handlers.
- **Type:** js; **size:** 2,185 bytes; **lines:** 46.
- **Imports/dependencies:** `google-auth-library`.
- **Exports:** `read`, `append`, `update`, `ensureTab`.
- **Detected symbols (7):**
  - `function c`
  - `function base`
  - `function meta`
  - `export read`
  - `export append`
  - `export update`
  - `export ensureTab`

### `threadly-v2/package.json`

- **Purpose:** Node requirements, dependencies and npm commands.
- **Type:** json; **size:** 649 bytes; **lines:** 23.

### `threadly-v2/public/_headers`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** special file; **size:** 240 bytes; **lines:** 7.

### `threadly-v2/public/admin-product-studio.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 9,227 bytes; **lines:** 34.
- **Detected symbols (3):**
  - `function renderResults(items)`
  - `function slug(s)`
  - `function $(id)`
- **Embedded JavaScript:** 1 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/admin.html`

- **Purpose:** Admin dashboard for catalogue, orders, customers, reviews, support and marketplace operations.
- **Type:** html; **size:** 32,969 bytes; **lines:** 139.
- **Detected symbols (20):**
  - `function api(b)`
  - `function out`
  - `function load`
  - `function draw`
  - `function dash`
  - `function orders`
  - `function prods`
  - `function reqs`
  - `function revs`
  - `function sellers`
  - `function sellerproducts`
  - `function sellerorders`
  - `function sellerledger`
  - `function inventory`
  - `function tix`
  - `function users`
  - `function edit(p)`
  - `function $(s)`
  - `function toast(t)`
  - `function csvCell(value)`
- **Embedded JavaScript:** 1 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/apple-touch-icon.png`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** png; **size:** 6,533 bytes; **lines:** binary.

### `threadly-v2/public/catalog.json`

- **Purpose:** Bundled fallback catalogue for live catalogue outages.
- **Type:** json; **size:** 1,244,072 bytes; **lines:** 32246.

### `threadly-v2/public/contact.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 4,897 bytes; **lines:** 6.
- **Embedded JavaScript:** 2 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/cookie-policy.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 7,302 bytes; **lines:** 19.
- **Embedded JavaScript:** 2 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/favicon.ico`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** ico; **size:** 5,294 bytes; **lines:** binary.

### `threadly-v2/public/favicon.svg`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** svg; **size:** 683 bytes; **lines:** 1.

### `threadly-v2/public/icon-192.png`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** png; **size:** 7,227 bytes; **lines:** binary.

### `threadly-v2/public/icon-512.png`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** png; **size:** 27,629 bytes; **lines:** binary.

### `threadly-v2/public/images/categories/drinkware.svg`

- **Purpose:** Static image asset.
- **Type:** svg; **size:** 1,042 bytes; **lines:** 1.

### `threadly-v2/public/images/categories/home-kitchen.svg`

- **Purpose:** Static image asset.
- **Type:** svg; **size:** 863 bytes; **lines:** 1.

### `threadly-v2/public/images/categories/plush-toys.svg`

- **Purpose:** Static image asset.
- **Type:** svg; **size:** 1,146 bytes; **lines:** 1.

### `threadly-v2/public/images/categories/stationery.svg`

- **Purpose:** Static image asset.
- **Type:** svg; **size:** 823 bytes; **lines:** 1.

### `threadly-v2/public/images/categories/tech-accessories.svg`

- **Purpose:** Static image asset.
- **Type:** svg; **size:** 935 bytes; **lines:** 1.

### `threadly-v2/public/index.html`

- **Purpose:** Customer storefront: catalogue, search, filters, sorting, product detail, wishlist, cart and checkout.
- **Type:** html; **size:** 144,342 bytes; **lines:** 842.
- **Detected symbols (127):**
  - `function toast(t)`
  - `function parseCSV(t)` — ---- Google Sheet / products.csv loader ----
  - `function setCatalogueNotice(fallback)`
  - `function getBundledProducts`
  - `function loadSheet`
  - `function eta(p)`
  - `function card(p)`
  - `function chips`
  - `function list`
  - `function render`
  - `function onCard(e)`
  - `function sugg`
  - `function pick(i)`
  - `function nl(t)`
  - `function query(t)`
  - `function fOK(p)`
  - `function renderExtras(r)`
  - `function applySig`
  - `function loadSignals`
  - `function popular`
  - `function megaHTML(g)`
  - `function renderNav`
  - `function megaToggle(li,on)`
  - `function goTo(grp,cat)`
  - `function crumbUpdate(br)`
  - `function seoInit`
  - `function productLD(p)`
  - `function homeSecs`
  - `function openFilters`
  - `function quickAdd(id)`
  - `function shareP(id)`
  - `function railsFor(p)`
  - `function botAsk(q)`
  - `function botRules(q)`
  - `function demoReviews(p)`
  - `function loadReviews(pid)`
  - `function submitReview(pid)`
  - `function reqHTML(o)`
  - `function reqUI(type,oid)`
  - `function sendReq`
  - `function pinLookup(v)`
  - `function pinShow(inp,html)`
  - `function pinInput(t)`
  - `function pdpPin(v)`
  - `function openTicket(type)`
  - `function sendTicket`
  - `function showCookie` — ---- cookie consent ----
  - `function cookieChoice(c)`
  - `function loadRzp` — ---- payment window: loaded only when someone pays ----
  - `function productMeta(p)`
  - `function listingDetails(p)`
  - `function openP(id)` — Product cards, search results and related-product links use a dedicated URL instead of a modal.
  - `function invoice(id)`
  - `function cmpBar`
  - `function cmpOpen`
  - `function cpDisc(c,sub)`
  - `function totals`
  - `function drawCart`
  - `function authUI(m)`
  - `function forgotUI`
  - `function doForgot`
  - `function resetUI`
  - `function passwordIssue(pw)`
  - `function doReset`
  - `function doAuth(m)`
  - `function acct`
  - `function checkoutStart` — ---- checkout & payment ----
  - `function addressKey`
  - `function addressBook`
  - `function writeAddressBook(a)`
  - `function addressFormValues`
  - `function addressCards(selected)`
  - `function fillAddress(a)`
  - `function openPay(addressId)`
  - `function resetAddressForm`
  - `function saveAddressFromForm`
  - `function editSavedAddress(id)`
  - `function removeSavedAddress(id)`
  - `function payNow`
  - `function $(s)`
  - `function esc(t)`
  - `function show(id,on=true)`
  - `function imgUrl(u)`
  - `function catalogueFetch(url,options={})`
  - `function normProductText(v)`
  - `function productImageUrls(p)`
  - `function pin` — ---- delivery estimate ----
  - `function arr(k)` — ---- store UI ----
  - `function img(p,eager)`
  - `function bg(p)`
  - `function productGallery(p)`
  - `function deb(fn,ms)`
  - `function hay(p)`
  - `function hasW(h,w)`
  - `function words(t)`
  - `function rec`
  - `function addRec(t)`
  - `function hl(t,q)`
  - `function sgClose`
  - `function hasCol(p,c)`
  - `function lev(a,b)`
  - `function fm(p,w)`
  - `function facetValue(p,k)`
  - `function filtersActive`
  - `function clsOf(c)`
  - `function grpMeta(id)`
  - `function present(c)`
  - `function menuGroup(g)`
  - `function mobileGroup(g)`
  - `function megaClose`
  - `function rep(g)`
  - `function rail(t,l,sub)`
  - `function categoryAttrs(cat)`
  - `function facetOptions(key)`
  - `function chart(p)`
  - `function botAdd(h,me)` — assistant (rule-based, runs in the browser)
  - `function laterHTML` — ---- saved for later (cart) ----
  - `function pinClose`
  - `function tkHTML`
  - `function set(selector,attr,value)`
  - `function escText(v)`
  - `function sha(t)`
  - `function ubtn`
  - `function done(id)`
  - `function consented`
  - `function getSessionId`
  - `function send(event, extra = {})`
- **Embedded JavaScript:** 4 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/manifest.webmanifest`

- **Purpose:** PWA installation metadata and icons.
- **Type:** webmanifest; **size:** 743 bytes; **lines:** 36.

### `threadly-v2/public/offline.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 1,052 bytes; **lines:** 16.

### `threadly-v2/public/privacy-policy.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 9,779 bytes; **lines:** 28.
- **Embedded JavaScript:** 2 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/product.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 34,946 bytes; **lines:** 81.
- **Detected symbols (27):**
  - `function toast(msg)`
  - `function productUrls(p)`
  - `function normalizeProduct(p)`
  - `function stockMarkup(p)`
  - `function optionMarkup(p)`
  - `function highlights(p)`
  - `function renderProduct(p)`
  - `function updateProductSchema`
  - `function renderWishlistButton`
  - `function productCategory(p)`
  - `function productTerms(p)`
  - `function recommendationScore(candidate,current)`
  - `function recommendationCard(p)`
  - `function renderRecommendationRail(host,items,emptyText)`
  - `function renderRelated(current)`
  - `function cartCount`
  - `function etaForPin(pin)`
  - `function checkDelivery`
  - `function addToCart(buy)`
  - `function showPhoto(i)`
  - `function renderRatings(data)`
  - `function loadReviews`
  - `function parseCsv(text)`
  - `function fromCsv`
  - `function loadProduct`
  - `function $(s)`
  - `function stored(k)`
- **Embedded JavaScript:** 1 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/products.csv`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** csv; **size:** 27,965 bytes; **lines:** 302.

### `threadly-v2/public/recommendations.js`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** js; **size:** 2,607 bytes; **lines:** 54.
- **Detected symbols (3):**
  - `function rankRelatedProducts(current, products, limit = 4)` — @param {object[]} products - Public catalogue products. @param {number} limit - Maximum recommendations to return. @returns {object[]} A new array of ranked products, excluding the current item. 
  - `function clean(value)`
  - `function score(item)`

### `threadly-v2/public/refund-policy.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 6,777 bytes; **lines:** 9.
- **Embedded JavaScript:** 2 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/sell-on-juno.html`

- **Purpose:** Seller acquisition and onboarding page.
- **Type:** html; **size:** 9,380 bytes; **lines:** 85.
- **Detected symbols (1):**
  - `function status(message,kind)`
- **Embedded JavaScript:** 1 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/seller-studio.html`

- **Purpose:** Seller portal and seller workflows.
- **Type:** html; **size:** 12,254 bytes; **lines:** 26.
- **Detected symbols (9):**
  - `function msg(el,text,kind)`
  - `function esc(s)`
  - `function call(url,data,t=token)`
  - `function showStudio(d)`
  - `function loadProducts`
  - `function startProductEdit(id)`
  - `function resetProductEdit`
  - `function loadSellerOrders`
  - `function $(s)`
- **Embedded JavaScript:** 1 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/shipping-policy.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 6,192 bytes; **lines:** 9.
- **Embedded JavaScript:** 2 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/public/site-config.js`

- **Purpose:** Public static asset/configuration; never include secrets or private data.
- **Type:** js; **size:** 289 bytes; **lines:** 4.

### `threadly-v2/public/sw.js`

- **Purpose:** PWA service worker for shell caching, offline behavior and cache management.
- **Type:** js; **size:** 2,873 bytes; **lines:** 93.

### `threadly-v2/public/terms.html`

- **Purpose:** Static storefront/admin/seller page or policy; browser logic may be embedded.
- **Type:** html; **size:** 8,269 bytes; **lines:** 17.
- **Embedded JavaScript:** 2 inline script block(s). Inspect the HTML for complete UI behavior.

### `threadly-v2/requirements-ai-product-studio.txt`

- **Purpose:** Optional workflow dependency list.
- **Type:** txt; **size:** 24 bytes; **lines:** 2.

### `threadly-v2/requirements-image-generation.txt`

- **Purpose:** Optional workflow dependency list.
- **Type:** txt; **size:** 54 bytes; **lines:** 4.

### `threadly-v2/requirements-local-image-generation.txt`

- **Purpose:** Optional workflow dependency list.
- **Type:** txt; **size:** 190 bytes; **lines:** 10.

### `threadly-v2/scripts/auto_product_images.py`

- **Purpose:** Product image generation/preparation workflow; check dependencies before running.
- **Type:** py; **size:** 9,982 bytes; **lines:** 214.
- **Imports/dependencies:** `__future__`, `argparse, base64, io, json, os, re, subprocess, time`, `pathlib`, `urllib.parse`, `requests`, `PIL`, `torch`, `diffusers`, `openpyxl`.
- **Detected symbols (13):**
  - `function safe(value)`
  - `function prompt_for(product, view)`
  - `class Pollinations`
  - `function __init__(self, delay=3)`
  - `function __call__(self, prompt, seed)`
  - `class OpenAIImages`
  - `class Local`
  - `class Mock`
  - `function update_workbook(path, products)`
  - `function ensure(name)`
  - `function run(args, backend)`
  - `function git_push`
  - `function main`

### `threadly-v2/scripts/build-catalog.js`

- **Purpose:** Juno test, validation or optional image workflow; inspect source/dependencies before running.
- **Type:** js; **size:** 1,948 bytes; **lines:** 34.
- **Imports/dependencies:** `node:fs`, `node:path`.

### `threadly-v2/scripts/check-links.js`

- **Purpose:** Static repository, route, catalogue and policy consistency checks.
- **Type:** js; **size:** 3,879 bytes; **lines:** 39.
- **Imports/dependencies:** `fs`, `path`.
- **Detected symbols (2):**
  - `function isFile(p)`
  - `function route(u)`

### `threadly-v2/scripts/check-netlify-config.js`

- **Purpose:** Juno test, validation or optional image workflow; inspect source/dependencies before running.
- **Type:** js; **size:** 2,442 bytes; **lines:** 42.
- **Imports/dependencies:** `node:fs`, `node:path`.
- **Detected symbols (3):**
  - `function fail(message)`
  - `function read(file)`
  - `function section(source, header)`

### `threadly-v2/scripts/check-security-config.js`

- **Purpose:** Static checks for security configuration and headers.
- **Type:** js; **size:** 3,346 bytes; **lines:** 34.
- **Imports/dependencies:** `node:fs`, `node:path`.

### `threadly-v2/scripts/export-image-qa.js`

- **Purpose:** Juno test, validation or optional image workflow; inspect source/dependencies before running.
- **Type:** js; **size:** 2,724 bytes; **lines:** 52.
- **Imports/dependencies:** `node:fs`, `node:path`.
- **Detected symbols (3):**
  - `function cell(value)`
  - `function get(product, keys)`
  - `function main`

### `threadly-v2/scripts/generate_product_views.py`

- **Purpose:** Product-view image generation workflow.
- **Type:** py; **size:** 17,038 bytes; **lines:** 329.
- **Imports/dependencies:** `__future__`, `argparse`, `base64`, `json`, `os`, `re`, `sys`, `time`, `pathlib`, `typing`, `urllib.parse`, `requests`, `dotenv`, `openpyxl`.
- **Detected symbols (8):**
  - `function safe_name(value: Any)`
  - `function load_catalog(path: Path)`
  - `function source_url(product: dict[str, Any])`
  - `function download_source(url: str, timeout: int = 45)`
  - `function generate_image(api_key: str, image_bytes: bytes, extension: str, product: dict[str, Any], view: str, model: str, timeout: int)`
  - `function generate_image_from_prompt(api_key: str, product: dict[str, Any], view: str, model: str, timeout: int)`
  - `function update_workbook(path: Path, catalog_products: list[dict[str, Any]], output: Path)`
  - `function main`

### `threadly-v2/scripts/generate_product_views_local.py`

- **Purpose:** Local product-view generation workflow.
- **Type:** py; **size:** 8,979 bytes; **lines:** 176.
- **Imports/dependencies:** `__future__`, `argparse, io, json, re, sys`, `pathlib`, `requests`, `torch`, `PIL`, `diffusers`.
- **Detected symbols (6):**
  - `function safe(value)`
  - `function read_catalog(path)`
  - `function write_catalog(path, data)`
  - `function get_source(product)`
  - `function load_pipeline(cls, model, dtype)`
  - `function main`

### `threadly-v2/scripts/sync_sheet_product_images.py`

- **Purpose:** Synchronizes image references with catalogue/Sheet data.
- **Type:** py; **size:** 11,492 bytes; **lines:** 242.
- **Imports/dependencies:** `__future__`, `json, os, re, subprocess, sys, time`, `pathlib`, `urllib.parse`, `requests`, `google.oauth2.service_account`, `google.auth.transport.requests`, `argparse`.
- **Detected symbols (13):**
  - `function norm(value)`
  - `function col(headers, key)`
  - `function value(row, index)`
  - `function safe_id(value)`
  - `function load_auth`
  - `function sheets_request(session, url, method="GET", payload=None)`
  - `function read_sheet(session, sheet_id, tab)`
  - `function update_row(session, sheet_id, tab, row_number, row)`
  - `function ensure_headers(session, sheet_id, tab, rows)`
  - `function upsert_catalog_product(data, row, headers)`
  - `function git_publish(product_ids)`
  - `function run_once(session, sheet_id, tab, site_url)`
  - `function main`

### `threadly-v2/scripts/test-checkout.js`

- **Purpose:** Backend/checkout regression suite.
- **Type:** js; **size:** 116,568 bytes; **lines:** 1659.
- **Imports/dependencies:** `node:assert/strict`, `node:crypto`, `../netlify/lib/sheets`, `jsonwebtoken`, `bcryptjs`, `../netlify/lib/coupons`, `../netlify/lib/core`.
- **Detected symbols (6):**
  - `function check(name, fn)`
  - `function rejectsWith(items, pattern)`
  - `function orderRow(id, status)`
  - `function delivered(ageDays)`
  - `function order(id, note)`
  - `function saved(id)`

### `threadly-v2/scripts/test-image-qa.js`

- **Purpose:** Juno test, validation or optional image workflow; inspect source/dependencies before running.
- **Type:** js; **size:** 714 bytes; **lines:** 15.
- **Imports/dependencies:** `node:assert/strict`, `./export-image-qa`.

### `threadly-v2/scripts/test-recommendations.js`

- **Purpose:** Juno test, validation or optional image workflow; inspect source/dependencies before running.
- **Type:** js; **size:** 1,514 bytes; **lines:** 28.
- **Imports/dependencies:** `node:assert/strict`, `../public/recommendations`.

### `threadly-v2/scripts/test-storefront-e2e.js`

- **Purpose:** Browser tests for storefront and seller flows.
- **Type:** js; **size:** 32,650 bytes; **lines:** 463.
- **Imports/dependencies:** `node:assert/strict`, `node:fs`, `node:http`, `node:path`, `playwright`, `@axe-core/playwright`.

## 7. GitHub Actions index

| Workflow | Name |
|---|---|
| `.github/workflows/build-threadly-android.yml` | Build Juno Android APK |
| `.github/workflows/checkout-tests.yml` | Checkout regression tests |
| `.github/workflows/historical-secret-scan.yml` | Historical secret scan |
| `.github/workflows/repository-technical-docs.yml` | Repository technical documentation |
| `.github/workflows/security.yml` | Security checks |
| `.github/workflows/storefront-e2e.yml` | Storefront browser tests |
| `.github/workflows/validate-juno.yml` | Validate Juno storefront |

## 8. Function-level documentation: how to read the inventory

- **Detected symbols** are static name/signature hints, not authoritative semantic contracts. Read the implementation and call sites before changing behavior.
- A nearby comment is shown only when a clear adjacent comment can be associated with the symbol. Missing descriptions mean the source has no nearby comment or static matching could not safely identify one.
- **Imports/dependencies** show direct CommonJS requires or Python imports; runtime-loaded modules and browser CDN dependencies may not be captured.
- **Exports** are static CommonJS export assignments; object-literal export maps may require reading the final module.exports statement.
- Inline JavaScript in HTML is extracted for the same heuristic symbol inventory where recognizable.

## 9. Safe change workflow

1. Trace the browser page, API handler, shared core function and persistence adapter.
2. Add regression coverage in threadly-v2/scripts/test-checkout.js or threadly-v2/scripts/test-storefront-e2e.js.
3. Run npm test, npm run check and npm run check:security from threadly-v2; inspect CI for the exact commit.
4. Regenerate this guide after changes. Main-branch automation commits refreshed docs; PRs should include the generated guide.
5. Test real Sheets, Razorpay, email, deployed Netlify behavior and Android separately.

## 10. Known limitations

- Symbol extraction uses regular expressions, not a language parser; signatures and nested methods may be missed or misidentified.
- The inventory gives function names/signatures, direct dependency hints and adjacent comments; it does not automatically prove complete function semantics, call graphs, data contracts or side effects.
- Google Sheets reads/writes are not transactions or unique constraints.
- Inventory reservation/restock and partial-failure recovery require concurrency-safe/idempotent design.
- Payment verification/webhooks require replay and late-event tests.
- Seller transfers must remain disabled until provider approval and reconciliation.
- Image workflows may require optional packages, models, compute or external services.
- This is a detailed generated technical reference, not a formal security audit or production-readiness certificate.

_Generated automatically by scripts/generate_repository_docs.js from the current checkout._

