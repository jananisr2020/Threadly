const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const headers = fs.readFileSync(path.join(root, 'public/_headers'), 'utf8');
const core = fs.readFileSync(path.join(root, 'netlify/lib/core.js'), 'utf8');
const storefront = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '../.github/workflows/security.yml'), 'utf8');
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
  ['website activity requires explicit consent', core.includes("if (b.consent !== 'all') throw new E('Activity tracking requires explicit consent.', 403)")],
  ['checkout is disabled when only the bundled catalogue is available', storefront.includes('if(LIVE&&(!catalogueReady||!catalogueLive))') && storefront.includes('setCatalogueNotice(true)')],
  ['CI audits production dependencies', workflow.includes('npm audit --omit=dev --audit-level=high')]
];
const failed = required.filter(([, ok]) => !ok);
for (const [name, ok] of required) process.stdout.write((ok ? '✓ ' : '✗ ') + name + '\n');
if (failed.length) process.exitCode = 1;
else process.stdout.write('All ' + required.length + ' security configuration checks passed.\n');
