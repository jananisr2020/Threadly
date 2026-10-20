# Juno security operations

## What is implemented in code
- The backend hashes customer passwords with bcrypt and uses signed JWTs for sessions.
- Checkout calculates prices on the server and verifies Razorpay signatures, payment status, amount, currency, and order linkage.
- API wrappers write success/failure audit events to the Google Sheets `ActivityLog` tab when Sheets credentials are configured.
- Selected storefront interactions are sent to `WebsiteActivity` only when the browser's cookie preference is set to accept all.
- `GET /api/health` is a public liveness endpoint and must not expose configuration details.
- `GET /api/security-health` requires an admin JWT. It checks configured environment-variable presence, key formatting, key operational sheet tabs, and performs a test append to `ActivityLog`. A degraded result returns HTTP 503.

## Run a security health check
1. Sign in to the Juno admin page.
2. In browser developer tools, use the existing admin bearer token to call `GET /api/security-health` with an `Authorization: Bearer <admin-token>` header.
3. Confirm the response has `overall: "ok"`, `auditWrite: "ok"`, and `ok` for the required tabs.
4. Confirm a `security.health_check` row appears in `ActivityLog`.
5. If degraded, fix the named environment variable or sheet permission in Netlify/Google Cloud, redeploy, and repeat the check. Never paste secrets into Jira tickets or logs.

## Production release checks
- Run `npm ci`, `npm test`, `npm run check`, and `npm audit --omit=dev --audit-level=high` from `threadly-v2/`.
- Use Razorpay Test Mode to test successful capture, failed payment, invalid signature, duplicate webhook delivery, amount mismatch, and delayed webhook delivery.
- Verify a customer cannot read another customer's order and non-admin users cannot perform admin actions.
- Check that the activity logger receives failed login and admin-change events. The logger intentionally avoids blocking customer actions when logging fails, so a separate health check is required.
- Confirm Netlify environment variables are set without printing their values. Required settings include `SHEET_ID`, Google service-account credentials, `JWT_SECRET`, `ADMIN_PASSWORD`, Razorpay API keys and webhook secret.
- Restrict Google Sheet editor access to the service account and trusted operators. Do not treat a spreadsheet as tamper-resistant evidence.
- Configure a separate monitoring/alert destination before relying on automatic alerts. This repository change adds an authenticated diagnostic endpoint; it does not itself configure Netlify, email alerts, or a SIEM.

## Incident response
1. Disable/revoke affected credentials immediately; rotate any exposed Razorpay, Google service-account, JWT, admin, or email credentials.
2. Preserve relevant Netlify function logs, Razorpay event history, GitHub audit/secret-scanning alerts, and Google Sheets audit evidence.
3. Create a Jira security issue with timestamps, event IDs, impact, owner, and remediation. Never attach passwords, tokens, payment card details, or private keys.
4. Patch the issue, deploy, re-run the relevant tests, and document closure.
