#!/usr/bin/env node
// Run this in the SAME folder you deploy from:  node scripts/check-links.js
// It confirms the right files are here and that every link on every page leads to a real page.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), pub = path.join(root, 'public');
const isFile = p => fs.existsSync(p) && fs.statSync(p).isFile();
let problems = 0; const bad = m => { problems++; console.log('  ✗ ' + m) }, good = m => console.log('  ✓ ' + m);
console.log('Project folder: ' + root + '\n');
// 1. required files
const need = ['index.html', 'product.html', 'admin.html', 'privacy-policy.html', 'terms.html', 'refund-policy.html', 'shipping-policy.html', 'cookie-policy.html', 'contact.html', 'site-config.js', 'favicon.svg', 'products.csv'];
console.log('1. Required files in public/');
need.forEach(f => isFile(path.join(pub, f)) ? good(f) : bad(f + ' is MISSING. This is not the latest project, or files were not copied over.'));
if (isFile(path.join(pub, '404.html'))) bad('404.html exists (the custom 404 page was removed; delete this old file)');
// 2. latest version?
console.log('\n2. Is this the latest version?');
const idx = isFile(path.join(pub, 'index.html')) ? fs.readFileSync(path.join(pub, 'index.html'), 'utf8') : '';
const stamp = (idx.match(/data-build="([^"]+)"/) || [])[1];
stamp ? good('home page build stamp: ' + stamp + '  (the same stamp appears at the bottom of your live site once it is deployed)') : bad('home page has no build stamp: this is an OLD copy of index.html');
/Deals end in/.test(idx) ? bad('home page still contains the old fake countdown timer') : good('no old countdown timer');
for (const f of need.filter(x => /policy|terms|contact/.test(x))) { const t = isFile(path.join(pub, f)) ? fs.readFileSync(path.join(pub, f), 'utf8') : ''; if (/<mark|replace every highlighted|\[your /i.test(t)) bad(f + ' still has the old placeholder note'); }
// 3. routing
const toml = fs.existsSync(path.join(root, 'netlify.toml')) ? fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8') : '';
const redirects = [...toml.matchAll(/\[\[redirects\]\]\s*from = "([^"]+)"\s*to = "([^"]+)"/g)].map(m => ({ from: m[1], to: m[2] }));
const funcDir = path.join(root, 'netlify', 'functions'), funcs = new Set(fs.existsSync(funcDir) ? fs.readdirSync(funcDir).map(f => f.replace(/\.js$/, '')) : []);
console.log('\n3. Backend: ' + funcs.size + ' functions found, ' + redirects.length + ' redirects in netlify.toml');
funcs.size >= 20 ? good('functions folder looks complete') : bad('only ' + funcs.size + ' functions: expected 21');
const route = u => { let p = u.split('#')[0].split('?')[0]; if (p === '' || p === '/') return isFile(path.join(pub, 'index.html')); if (isFile(path.join(pub, p)) || isFile(path.join(pub, p + '.html'))) return true;
  for (const r of redirects) { if (r.from === p) { const to = r.to.split('?')[0]; return to.startsWith('/.netlify/functions/') ? funcs.has(to.split('/').pop()) : isFile(path.join(pub, to)) } if (r.from.endsWith('/*') && p.startsWith(r.from.slice(0, -1))) return funcs.has(p.slice(r.from.length - 1).split('/')[0]) } return false };
// 4. links
console.log('\n4. Links on every page');
let total = 0;
for (const f of fs.readdirSync(pub).filter(x => x.endsWith('.html'))) {
  const t = fs.readFileSync(path.join(pub, f), 'utf8'), links = new Set([...t.matchAll(/(?:href|src)=\\?["'](\/[^"'\\#\s>]*)/g)].map(m => m[1]));
  let n = 0, b = 0; for (const l of links) { if (/^\/\//.test(l) || /\$\{/.test(l)) continue; n++; total++; if (!route(l)) { b++; bad(f + ' → ' + l + ' leads to Not Found') } }
  if (!b) good(f + ': ' + n + ' links all lead to real pages');
}
console.log('\n' + (problems ? '✗ ' + problems + ' problem(s) found. Fix these BEFORE deploying.' : '✓ All good: ' + total + ' links checked. Safe to deploy.'));
process.exit(problems ? 1 : 0);
