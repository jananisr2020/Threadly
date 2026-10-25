'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..','public');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const js=read('customer-experience.js');
const home=read('index.html');
const product=read('product.html');
const sw=read('sw.js');
for(const [label,ok] of [
 ['recommendation module is loaded on homepage',home.includes('<script src="/customer-experience.js" defer></script>')],
 ['recommendation module is loaded on product page',product.includes('<script src="/customer-experience.js" defer></script>')],
 ['service worker caches the module',sw.includes('"/customer-experience.js"')],
 ['personalized rail uses browsing signals',js.includes("Picked for your taste")&&js.includes("s.views")],
 ['search interests influence recommendation ranking',js.includes("s.searches")],
 ['personalization respects analytics consent',js.includes("localStorage.getItem('tl_cookie') === 'all'")],
 ['recently viewed and similar accessories are available',js.includes('Recently viewed')&&js.includes('Similar accessories')],
 ['budget shortcuts are available',js.includes('data-jrx-budget')],
 ['products are capped at ₹500',js.includes('p.price<=500')],
 ['history is not sent to an analytics endpoint by this module',!js.includes('fetch(\'/api/signals')&&!js.includes('fetch("/api/signals')]
]) if(!ok) throw new Error('Customer experience check failed: '+label);
console.log('Customer experience checks passed: personalization consent, search/view signals, recommendations, budget shortcuts, product cap, and PWA wiring.');
