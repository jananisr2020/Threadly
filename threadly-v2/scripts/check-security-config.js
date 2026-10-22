const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const headers = fs.readFileSync(path.join(root, 'public/_headers'), 'utf8');
const core = fs.readFileSync(path.join(root, 'netlify/lib/core.js'), 'utf8');
const storefront = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '../.github/workflows/security.yml'), 'utf8');
const healthFunction = fs.readFileSync(path.join(root, 'netlify/functions/health.js'), 'utf8');
const netlifyConfig = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const required = [
  ['content type sniffing protection', headers.includes('X-Content-Type-Options: nosniff')],
  ['clickjacking protection', headers.includes('X-Frame-Options: DENY')],
  ['referrer policy', headers.includes('Referrer-Policy: strict-origin-when-cross-origin')],
  ['browser permissions policy', headers.includes('Permissions-Policy: camera=(), microphone=(), geolocation=()')],
  ['HTTPS transport policy', headers.includes('Strict-Transport-Security: max-age=31536000; includeSubDomains')],
  ['minimal public health endpoint', core.includes("diagnostics: 'Admin authentication required for security diagnostics.'")],
  ['admin-only diagnostics', core.includes("if (!u || !u.admin) throw new E('Admin login required.', 401)")],
  ['environment values are not returned', core.includes("env[k] = process.env[k] ? 'set' : 'MISSING'")],
  ['non-2xx responses are audited as failures', core.includes("responseStatus >= 400 ? 'failure' : 'success'")],
  ['audit event details use an explicit safe-field allowlist', core.includes("for (const k of ['action', 'status', 'id', 'orderId', 'applicationId', 'productId', 'type'])")],
  ['website activity requires explicit consent', core.includes("if (b.consent !== 'all') throw new E('Activity tracking requires explicit consent.', 403)")],
  ['checkout is disabled when only the bundled catalogue is available', storefront.includes('if(LIVE&&(!catalogueReady||!catalogueLive))') && storefront.includes('setCatalogueNotice(true)')],
  ['external seller sales are disabled by default until marketplace settlement is ready', envExample.includes('MARKETPLACE_SELLER_SALES_ENABLED=false') && core.includes('marketplaceSellerSalesEnabled') && core.includes('Seller sales are disabled until marketplace payment settlement')],
  ['CI audits production dependencies', workflow.includes('npm audit --omit=dev --audit-level=high')],
  ['public health function is GET-only and delegates to the minimal health handler', healthFunction.includes("c.wrap('GET',c.health)")],
  ['public health function does not directly read environment variables or credentials', !/process\\.env|GOOGLE_PRIVATE_KEY|RAZORPAY_KEY_SECRET|JWT_SECRET|ADMIN_PASSWORD/.test(healthFunction)],
  ['API routes are mapped to Netlify functions', netlifyConfig.includes('from = "/api/*"') && netlifyConfig.includes('to = "/.netlify/functions/:splat"')]
];
const failed = required.filter(([, ok]) => !ok);
for (const [name, ok] of required) process.stdout.write((ok ? '✓ ' : '✗ ') + name + '\n');
if (failed.length) process.exitCode = 1;
else process.stdout.write('All ' + required.length + ' security configuration checks passed.\n');
