#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const OUT='docs/REPOSITORY_TECHNICAL_GUIDE.md', T=String.fromCharCode(96), SKIP=new Set([OUT,'package-lock.json','threadly-v2/package-lock.json']);
const PURPOSE={
'threadly-v2/netlify/lib/core.js':'Shared server business rules: auth, validation, customer accounts, checkout, Razorpay verification, orders, inventory sync, support, sellers and admin.',
'threadly-v2/netlify/lib/sheets.js':'Google Sheets persistence adapter used by backend handlers.',
'threadly-v2/netlify/lib/coupons.js':'Central coupon definitions and discount calculations.',
'threadly-v2/public/index.html':'Customer storefront: catalogue, search, filters, sorting, product detail, wishlist, cart and checkout.',
'threadly-v2/public/admin.html':'Admin dashboard for catalogue, orders, customers, reviews, support and marketplace operations.',
'threadly-v2/public/seller-studio.html':'Seller portal and seller workflows.',
'threadly-v2/public/sell-on-juno.html':'Seller acquisition and onboarding page.',
'threadly-v2/public/sw.js':'PWA service worker for shell caching, offline behavior and cache management.',
'threadly-v2/public/manifest.webmanifest':'PWA installation metadata and icons.',
'threadly-v2/public/catalog.json':'Bundled fallback catalogue for live catalogue outages.',
'threadly-v2/scripts/check-links.js':'Static repository, route, catalogue and policy consistency checks.',
'threadly-v2/scripts/check-security-config.js':'Static checks for security configuration and headers.',
'threadly-v2/scripts/test-checkout.js':'Backend/checkout regression suite.',
'threadly-v2/scripts/test-storefront-e2e.js':'Browser tests for storefront and seller flows.',
'threadly-v2/scripts/auto_product_images.py':'Product image generation/preparation workflow; check dependencies before running.',
'threadly-v2/scripts/generate_product_views.py':'Product-view image generation workflow.',
'threadly-v2/scripts/generate_product_views_local.py':'Local product-view generation workflow.',
'threadly-v2/scripts/sync_sheet_product_images.py':'Synchronizes image references with catalogue/Sheet data.',
'threadly-v2/JUNO_V1_BACKLOG.md':'V1 backlog with completion evidence and release risks.',
'threadly-v2/ECOMMERCE_AUDIT_TRACKER.md':'Ecommerce feature audit and benchmark tracker.',
'threadly-v2/MARKETPLACE_ROADMAP.md':'Marketplace rollout plan and seller constraints.',
'threadly-v2/JUNO_RELEASE_RUNBOOK.md':'Production checks, launch blockers and rollback instructions.',
'threadly-v2/.env.example':'Environment variable names/examples; never put real secrets here.',
'threadly-v2/package.json':'Node requirements, dependencies and npm commands.',
'threadly-android/README.md':'Android wrapper setup notes.',
'threadly-android/capacitor.config.json':'Capacitor Android wrapper configuration.',
'threadly-android/package.json':'Android wrapper package scripts/dependencies.',
'.github/workflows/security.yml':'CI tests, static/security checks and dependency audit.',
'.github/workflows/checkout-tests.yml':'Checkout regression test workflow.',
'.github/workflows/storefront-e2e.yml':'Browser-based storefront/seller tests.',
'.github/workflows/validate-juno.yml':'Storefront syntax, branding, catalogue and policy validation.',
'.github/workflows/historical-secret-scan.yml':'Historical secret scanning.',
'.github/workflows/build-threadly-android.yml':'Android wrapper build workflow.',
'.gitleaks.toml':'Secret scanner configuration.',
'.gitignore':'Files Git should ignore.'
};
function files(){return execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean).sort()}
function read(p){try{return fs.readFileSync(path.join(process.cwd(),p),'utf8')}catch{return ''}}
function role(p){if(PURPOSE[p])return PURPOSE[p];if(p.startsWith('threadly-v2/netlify/functions/'))return 'Netlify serverless API entry point; inspect this handler and delegated core function for method, auth and payload contract.';if(p.startsWith('.github/workflows/'))return 'GitHub Actions automation; inspect triggers, permissions and steps.';if(p.startsWith('threadly-v2/public/images/'))return 'Static image asset.';if(p.startsWith('threadly-v2/public/'))return p.endsWith('.html')?'Static storefront/admin/seller page or policy; browser logic may be embedded.':'Public static asset/configuration; never include secrets or private data.';if(p.startsWith('threadly-v2/scripts/'))return 'Juno test, validation or optional image workflow; inspect source/dependencies before running.';if(p.startsWith('scripts/'))return 'Repository maintenance automation.';if(p.startsWith('threadly-android/'))return 'Android/Capacitor wrapper file.';if(p.startsWith('docs/'))return 'Architecture diagram or technical documentation.';if(p.endsWith('.md'))return 'Project documentation; verify instructions against code.';if(p.endsWith('.json'))return 'Structured configuration or data.';if(p.endsWith('.txt'))return 'Optional workflow dependency list.';return 'Tracked file; inspect source and references for exact behavior.'}
function table(rows){return rows.map(r=>'| '+r.map(x=>String(x??'').replace(/\|/g,'\\|').replace(/\r?\n/g,' ')).join(' | ')+' |').join('\n')}
function symbolInventory(p, source){
 const out=[], seen=new Set();
 const add=(kind,name,sig)=>{const k=kind+':'+name;if(!seen.has(k)){seen.add(k);out.push({kind,name,sig:String(sig||'').replace(/\s+/g,' ').trim().slice(0,180)})}};
 const ext=path.extname(p);
 const jsSource=ext==='.html'?[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/application\/ld\+json/i.test(m[1])).map(m=>m[2]).join('\n'):source;
 if(['.js','.cjs','.mjs','.html'].includes(ext)){
  const patterns=[
   ['class',/^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)\s*(?:extends\s+[^{]+)?/gm],
   ['function',/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/gm],
   ['function',/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/gm],
   ['function',/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\(([^)]*)\)/gm],
   ['method',/^\s{2,}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/gm],
   ['export',/^\s*(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/gm]
  ];
  for(const [kind,re] of patterns){let m;while((m=re.exec(jsSource))){const name=m[1];if(['if','for','while','switch','catch'].includes(name))continue;add(kind,name,m[2]||m[3]||'')}}
  const deps=[...source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m=>m[1]);
  return {symbols:out,dependencies:[...new Set(deps)],exports:[...new Set([...source.matchAll(/(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g)].map(m=>m[1]))]};
 }
 if(ext==='.py'){
  let m;const re=/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)|^\s*class\s+([A-Za-z_]\w*)\b/gm;
  while((m=re.exec(source)))add(m[3]?'class':'function',m[3]||m[1],m[2]||'');
  const deps=[...source.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w., ]+))/gm)].map(m=>(m[1]||m[2]).trim());
  return {symbols:out,dependencies:[...new Set(deps)],exports:[]};
 }
 return {symbols:[],dependencies:[],exports:[]};
}
function commentFor(source, symbol){
 const lines=source.split(/\r?\n/); const re=symbol.kind==='class'?new RegExp('^\\s*class\\s+'+symbol.name+'\\b'):new RegExp('^\\s*(?:(?:async\\s+)?function\\s+|(?:const|let|var)\\s+|(?:async\\s+)?)'+symbol.name+'\\b');
 let idx=-1;for(let i=0;i<lines.length;i++)if(re.test(lines[i])){idx=i;break}if(idx<0)return '';
 const comments=[];for(let i=idx-1;i>=0&&i>=idx-4;i--){const t=lines[i].trim();if(!t)break;if(t.startsWith('//')||t.startsWith('*')||t.startsWith('/*'))comments.unshift(t.replace(/^\/\*+|\*\/$|^\/\//g,'').replace(/^\*\s?/,'').trim());else break}return comments.join(' ').slice(0,220);
}
function main(){
 const all=files().filter(p=>p!==OUT),o=[],add=(...a)=>o.push(...a);
 add('# Juno / Threadly — Repository Technical Reference','','> Generated file. Do not hand-edit. Run node scripts/generate_repository_docs.js at repository root. Main-branch GitHub Actions refreshes it after changes. File descriptions are curated; file inventory, sizes, line counts, environment names and package scripts are derived from the checkout.','','This describes source code at a revision; it is not proof that production services or credentials have been tested.','','## 1. Repository overview','','- Main app: threadly-v2/; browser files: threadly-v2/public/.','- Backend: Netlify Functions in threadly-v2/netlify/functions/.','- Shared business logic: threadly-v2/netlify/lib/core.js.','- Persistence: Google Sheets through threadly-v2/netlify/lib/sheets.js.','- Payments: Razorpay; email depends on provider configuration.','- Android wrapper: threadly-android/. CI: .github/workflows/.','- Tracked files: **'+all.length+'**.','','### Directory map','','| Directory | Purpose |','|---|---|');
 const dirs=new Set();for(const p of all){const a=p.split('/');for(let i=1;i<a.length;i++)dirs.add(a.slice(0,i).join('/'))}
 add(table([...dirs].sort((a,b)=>a.split('/').length-b.split('/').length||a.localeCompare(b)).map(d=>[T+d+'/'+T,d==='.github/workflows'?'CI validation, tests, security scans and Android build.':d==='docs'?'Architecture diagrams and technical reference.':d==='scripts'?'Repository maintenance scripts.':d==='threadly-android'?'Android wrapper.':d==='threadly-v2'?'Main Juno application.':d==='threadly-v2/netlify/functions'?'Serverless API entry points.':d==='threadly-v2/netlify/lib'?'Shared backend logic and storage adapter.':d==='threadly-v2/public'?'Storefront, admin/seller pages, policies, PWA and public data.':d==='threadly-v2/scripts'?'Tests, validation and image workflows.':'Contains tracked files; see file catalogue.'])),'');
 add('## 2. Architecture and data flow','','1. Browser pages under threadly-v2/public provide storefront, admin, seller, policy and PWA experiences.','2. threadly-v2/netlify.toml routes /api/* to Netlify Functions and configures SEO/admin routes.','3. Function files are API entry points; most delegate shared behavior to netlify/lib/core.js.','4. netlify/lib/sheets.js centralizes Google Sheets reads/writes. These are not atomic database transactions.','5. Razorpay order creation, payment verification and webhooks must be tested together; never trust browser totals or payment status.','6. manifest.webmanifest defines PWA install metadata; sw.js handles shell/offline caching.','7. CI success does not prove production credentials, deployment, email or payment integrations.','','### Invariants','','- Cash on delivery stays disabled.','- Selling prices are capped at ₹500.','- Payment status is controlled by verified gateway events, not manual admin edits.','- Keep MARKETPLACE_SELLER_SALES_ENABLED=false until inventory and seller settlement are verified.','- Never commit secrets or private customer data.','- Google Sheets read-modify-write does not guarantee concurrent inventory safety or idempotent restocking.','','## 3. Developer commands','','Run from threadly-v2/: npm ci; npm test; npm run check; npm run check:security.','At repository root: node scripts/generate_repository_docs.js regenerates this guide; add --check to verify freshness.','','### Package scripts','','| Package | Script | Command |','|---|---|---|');
 for(const p of all.filter(p=>p.endsWith('package.json'))){try{const j=JSON.parse(read(p));for(const [k,v] of Object.entries(j.scripts||{}))add(table([[T+p+T,T+'npm run '+k+T,T+v+T]]))}catch{}}
 add('','## 4. Environment configuration inventory','','Only names are documented. Actual values belong in private local/Netlify settings, never Git.','','| Variable | Guidance |','|---|---|');
 const env=new Set();for(const p of all){const s=read(p);for(const m of s.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g))env.add(m[1]);if(p.endsWith('.env.example'))for(const l of s.split(/\r?\n/)){const m=l.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);if(m)env.add(m[1])}}
 add(table([...env].sort().map(n=>[T+n+T,/PRIVATE_KEY|_SECRET|PASSWORD|API_KEY/.test(n)?'Sensitive credential; keep private and never log it.':/SHEET_ID/.test(n)?'Target Google spreadsheet.':/MARKETPLACE_SELLER_SALES_ENABLED/.test(n)?'Keep false until seller safeguards are verified.':/MAIL_FROM/.test(n)?'Verified outbound email sender.':/SUPPORT_/.test(n)?'Customer support contact.':'Review .env.example and source before setting.'])),'');
 add('## 5. Serverless endpoint index','','Route names follow Netlify function naming. Check handlers for exact method, auth and request/response schemas.','','| Handler | Function route | Handler clues |','|---|---|---|');
 for(const p of all.filter(p=>p.startsWith('threadly-v2/netlify/functions/')&&p.endsWith('.js'))){add('- '+T+p+T+' -> '+T+'/.netlify/functions/'+path.basename(p,'.js')+T+' — '+role(p));}
 add('','## 6. Complete tracked-file catalogue','','Every tracked file is listed below except package lockfiles and this generated guide. Code files include statically detected function/class/method names, import dependencies and export hints. Detection is heuristic (not a full AST); dynamic dispatch and browser inline code need manual tracing.','');
 for(const p of all.filter(p=>!SKIP.has(p))){const s=read(p),bin=/\.(png|ico)$/i.test(p),size=(()=>{try{return fs.statSync(path.join(process.cwd(),p)).size}catch{return 0}})(),lines=bin?'binary':s?s.split(/\r?\n/).length:'not readable';add('### '+T+p+T,'','- **Purpose:** '+role(p),'- **Type:** '+(path.extname(p).slice(1)||'special file')+'; **size:** '+size.toLocaleString('en-US')+' bytes; **lines:** '+lines+'.');if(p.startsWith('threadly-v2/netlify/functions/')){const m=s.match(/wrap\(\s*['"]([^'"]+)/),c=s.match(/core\.([A-Za-z_$][\w$]*)/);if(m)add('- **Wrapper hint:** '+T+m[1]+T+'.');if(c)add('- **Core delegate:** '+T+'core.'+c[1]+T+'.')}const inv=symbolInventory(p,s);if(inv.dependencies.length)add('- **Imports/dependencies:** '+inv.dependencies.map(x=>T+x+T).join(', ')+'.');if(inv.exports.length)add('- **Exports:** '+inv.exports.map(x=>T+x+T).join(', ')+'.');if(inv.symbols.length){add('- **Detected symbols ('+inv.symbols.length+'):**');for(const sym of inv.symbols){const doc=commentFor(s,sym);add('  - '+T+sym.kind+' '+sym.name+(sym.sig?'('+sym.sig+')':'')+T+(doc?' — '+doc:''))}if(inv.symbols.length>60)add('  - … '+(inv.symbols.length-60)+' additional symbols omitted from this file entry; use the linked source.')}if(p==='threadly-v2/netlify/lib/core.js')add('- **Module role map:** API handlers and business rules for customer auth/profile/password reset; product visibility/pricing and stock validation; Razorpay order creation, signature/webhook processing and refunds; customer order history/returns; seller applications/accounts/catalogue/orders; admin order/product/review/ticket/request operations; consent-based activity logging; pincode lookup and support tickets. Confirm each handler body and the exported API below in source.');if(p.endsWith('.html')){const n=[...s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!/application\/ld\+json/i.test(m[1])).length;if(n)add('- **Embedded JavaScript:** '+n+' inline script block(s). Inspect the HTML for complete UI behavior.')}add('')}
 add('## 7. GitHub Actions index','','| Workflow | Name |','|---|---|');for(const p of all.filter(p=>p.startsWith('.github/workflows/')&&/\.ya?ml$/.test(p)))add(table([[T+p+T,(read(p).match(/^name:\s*(.+)$/m)||[])[1]||path.basename(p)]]));
 add('','## 8. Function-level documentation: how to read the inventory','','- **Detected symbols** are static name/signature hints, not authoritative semantic contracts. Read the implementation and call sites before changing behavior.','- A nearby comment is shown only when a clear adjacent comment can be associated with the symbol. Missing descriptions mean the source has no nearby comment or static matching could not safely identify one.','- **Imports/dependencies** show direct CommonJS requires or Python imports; runtime-loaded modules and browser CDN dependencies may not be captured.','- **Exports** are static CommonJS export assignments; object-literal export maps may require reading the final module.exports statement.','- Inline JavaScript in HTML is extracted for the same heuristic symbol inventory where recognizable.','', '## 9. Safe change workflow','','1. Trace the browser page, API handler, shared core function and persistence adapter.','2. Add regression coverage in threadly-v2/scripts/test-checkout.js or threadly-v2/scripts/test-storefront-e2e.js.','3. Run npm test, npm run check and npm run check:security from threadly-v2; inspect CI for the exact commit.','4. Regenerate this guide after changes. Main-branch automation commits refreshed docs; PRs should include the generated guide.','5. Test real Sheets, Razorpay, email, deployed Netlify behavior and Android separately.','','## 10. Known limitations','','- Symbol extraction uses regular expressions, not a language parser; signatures and nested methods may be missed or misidentified.','- The inventory gives function names/signatures, direct dependency hints and adjacent comments; it does not automatically prove complete function semantics, call graphs, data contracts or side effects.','- Google Sheets reads/writes are not transactions or unique constraints.','- Inventory reservation/restock and partial-failure recovery require concurrency-safe/idempotent design.','- Payment verification/webhooks require replay and late-event tests.','- Seller transfers must remain disabled until provider approval and reconciliation.','- Image workflows may require optional packages, models, compute or external services.','- This is a detailed generated technical reference, not a formal security audit or production-readiness certificate.','','_Generated automatically by scripts/generate_repository_docs.js from the current checkout._','');
 return o.join('\n');
}
const text=main(),dest=path.join(process.cwd(),OUT);
if(process.argv.includes('--check')){if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==text){console.error(OUT+' is stale. Run node scripts/generate_repository_docs.js');process.exit(1)}console.log(OUT+' is current.')}
else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text+'\n');console.log('Generated '+OUT)}
