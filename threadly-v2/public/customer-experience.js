/* Juno customer-experience recommendations.
 * Personalization is local-first and only records browsing when analytics consent is "all".
 * No browsing history is sent to a server by this module.
 */
(() => {
  'use strict';
  const STORE = 'juno_reco_v1';
  const $ = (s, root=document) => root.querySelector(s);
  const safe = (fn, fallback) => { try { return fn(); } catch (_) { return fallback; } };
  const consented = () => safe(() => localStorage.getItem('tl_cookie') === 'all', false);
  const read = key => safe(() => JSON.parse(localStorage.getItem(key)), null);
  const write = (key, value) => safe(() => localStorage.setItem(key, JSON.stringify(value)), null);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => '₹' + Math.round(Number(n)||0).toLocaleString('en-IN');
  const productUrl = p => '/product.html?p=' + encodeURIComponent(p.id);
  const imageUrl = p => String(p.img || p.image || p.imageUrl || '').trim();
  const styles = `
  .jrx{max-width:1400px;margin:22px auto;padding:0 16px;color:var(--ink,#24202a)}
  .jrx-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}
  .jrx h2{font-size:clamp(18px,2.4vw,23px);margin:0;letter-spacing:-.03em}
  .jrx p{margin:4px 0 0;color:var(--mut,#716b78);font-size:13px}
  .jrx-rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(145px,190px);gap:12px;overflow-x:auto;padding:2px 2px 12px;scroll-snap-type:x proximity}
  .jrx-card{display:block;min-width:0;border:1px solid var(--line,#ece7ef);border-radius:13px;overflow:hidden;background:var(--card,#fff);color:inherit;text-decoration:none;scroll-snap-align:start}
  .jrx-img{aspect-ratio:1/1;background:linear-gradient(145deg,#fff5f9,#f3edfa);display:grid;place-items:center;overflow:hidden;color:#7d4a6a;font-size:12px;text-align:center;padding:8px}
  .jrx-img img{width:100%;height:100%;object-fit:cover}
  .jrx-copy{padding:9px}.jrx-name{font-size:13px;line-height:1.35;min-height:2.6em;overflow:hidden}
  .jrx-price{font-weight:850;margin-top:5px}.jrx-meta{font-size:11px;color:var(--mut,#716b78);margin-top:3px}
  .jrx-tags{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px}
  .jrx-tag{border:1px solid var(--line,#ece7ef);border-radius:99px;padding:7px 11px;background:var(--card,#fff);color:inherit;text-decoration:none;font-size:12px}
  @media(max-width:520px){.jrx{margin:16px auto;padding:0 12px}.jrx-rail{grid-auto-columns:minmax(42vw,1fr);gap:8px}}
  `;
  if (!$('#juno-reco-styles')) { const st=document.createElement('style'); st.id='juno-reco-styles'; st.textContent=styles; document.head.append(st); }

  function parseCsv(text) {
    const rows=[]; let row=[], cell='', quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];
      if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
      else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}
      else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
      else if(c!=='\r')cell+=c;
    }
    if(cell.length||row.length){row.push(cell);rows.push(row);}
    if(rows.length<2)return [];
    const headers=rows[0].map(x=>x.trim().toLowerCase());
    const col=(r,...names)=>{for(const name of names){const i=headers.indexOf(name);if(i>=0)return String(r[i]||'').trim();}return '';};
    return rows.slice(1).map(r=>{
      const price=Number(col(r,'selling price','selling_price').replace(/[^\d.]/g,''))||0;
      const mrp=Number(col(r,'mrp').replace(/[^\d.]/g,''))||price;
      const show=col(r,'show on site').toLowerCase();
      return {id:col(r,'product id','id'),name:col(r,'product name','name'),category:col(r,'category'),details:col(r,'details','material'),price,mrp,
        stock:col(r,'stock')===''?null:Number(col(r,'stock')),img:col(r,'image','image url','product image'),
        rating:Number(col(r,'rating'))||0,show:!show||/^(yes|true|1)$/i.test(show)};
    }).filter(p=>p.id&&p.name&&p.price>0&&p.price<=500&&p.show);
  }
  function getSignals(){const x=read(STORE);return x&&typeof x==='object'?x:{views:[],searches:[],categories:[],dismissed:[]};}
  function saveSignal(type,value){
    if(!consented()||!value)return;
    const s=getSignals(),arr=Array.isArray(s[type])?s[type]:[];
    s[type]=[String(value),...arr.filter(x=>String(x)!==String(value))].slice(0,30);
    s.updatedAt=Date.now();write(STORE,s);
  }
  function recordView(id){if(!id||!consented())return;saveSignal('views',id);}
  function productCard(p, label='') {
    const img=imageUrl(p);
    return '<a class="jrx-card" href="'+productUrl(p)+'" data-jrx-product="'+esc(p.id)+'"><div class="jrx-img">'+(img?'<img loading="lazy" src="'+esc(img)+'" alt="'+esc(p.name)+'" onerror="this.remove();this.parentElement.textContent=\'Photo not available yet\'">':'Photo not available yet')+'</div><div class="jrx-copy"><div class="jrx-name">'+esc(p.name)+'</div><div class="jrx-price">'+money(p.price)+'</div><div class="jrx-meta">'+esc(label||p.category||'Juno find')+'</div></div></a>';
  }
  function section(title, subtitle, products, label) {
    const unique=products.filter((p,i,a)=>p&&a.findIndex(x=>x.id===p.id)===i).slice(0,10);
    if(!unique.length)return null;
    const el=document.createElement('section');el.className='jrx';
    el.innerHTML='<div class="jrx-head"><div><h2>'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div></div><div class="jrx-rail">'+unique.map(p=>productCard(p,label)).join('')+'</div>';
    return el;
  }
  function rank(products,currentId){
    const s=getSignals(), viewed=new Set((s.views||[]).map(String)),cats=new Map(),terms=new Map();
    (s.searches||[]).forEach(q=>String(q).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2).forEach(w=>terms.set(w,(terms.get(w)||0)+2)));
    products.filter(p=>viewed.has(p.id)).forEach(p=>{
      cats.set(p.category,(cats.get(p.category)||0)+4);
      String(p.name+' '+p.details).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>3).forEach(w=>terms.set(w,(terms.get(w)||0)+1));
    });
    const wish=read('tl_wl');const wishlist=new Set(Array.isArray(wish)?wish.map(String):[]);
    return products.filter(p=>p.id!==String(currentId)&&p.stock!==0).map(p=>{
      let score=(cats.get(p.category)||0)+(wishlist.has(p.id)?3:0);
      String(p.name+' '+p.details).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>3).forEach(w=>score+=terms.get(w)||0);
      if((s.views||[]).includes(p.id))score-=8;
      return {...p,_score:score};
    }).sort((a,b)=>b._score-a._score||b.rating-a.rating||a.price-b.price);
  }
  async function loadProducts(){
    for(const url of ['/api/products','/products.csv']){
      try{const r=await fetch(url,{cache:'no-store'});if(r.ok){const p=parseCsv(await r.text());if(p.length)return p;}}catch(_){}
    }
    return [];
  }
  function renderHome(products){
    const main=$('#main')||$('main');if(!main)return;
    const s=getSignals(),viewed=new Set((s.views||[]).map(String)),seen=products.filter(p=>viewed.has(p.id));
    const sections=[];
    if(consented()&&seen.length){
      const rec=section('Picked for your taste','Based on accessories you’ve explored on this device.',rank(products).slice(0,10),'Recommended for you');
      if(rec)sections.push(rec);
      const recent=section('Recently viewed','Pick up where you left off.',(s.views||[]).map(id=>products.find(p=>p.id===String(id))).filter(Boolean),'Viewed recently');
      if(recent)sections.push(recent);
    }else{
      const popular=products.slice().sort((a,b)=>b.rating-a.rating||a.price-b.price).slice(0,8);
      const fallback=section('Popular budget finds','A few well-rated picks to start exploring.',popular,'Popular pick');
      if(fallback)sections.push(fallback);
    }
    const bands=document.createElement('section');bands.className='jrx';bands.innerHTML='<div class="jrx-head"><div><h2>Shop your budget</h2><p>Quick shortcuts to accessories under ₹500.</p></div></div><div class="jrx-tags"><button type="button" class="jrx-tag" data-jrx-budget="99">Under ₹99</button><button type="button" class="jrx-tag" data-jrx-budget="199">Under ₹199</button><button type="button" class="jrx-tag" data-jrx-budget="299">Under ₹299</button><button type="button" class="jrx-tag" data-jrx-budget="500">Under ₹500</button><button type="button" class="jrx-tag" data-jrx-budget="0">Clear price shortcut</button></div><p class="jrx-budget-status" aria-live="polite"></p>';
    sections.push(bands);
    const marker=$('.home-play',main)||$('.home-sale',main)||$('#home',main)||main.lastElementChild;
    sections.forEach(el=>{if(marker&&marker.parentNode)marker.parentNode.insertBefore(el,marker.nextSibling);else main.append(el);});
  }
  function renderProductRecommendations(products){
    const id=new URLSearchParams(location.search).get('p')||new URLSearchParams(location.search).get('id')||'';
    const current=products.find(p=>p.id===id);const host=$('#product')||$('main');if(!host)return;
    const similar=products.filter(p=>p.id!==id&&current&&p.category===current.category).sort((a,b)=>Math.abs(a.price-current.price)-Math.abs(b.price-current.price)).slice(0,10);
    const sections=[];
    const sim=section('Similar accessories','More from '+(current?.category||'this collection')+'.',similar,'Similar find');if(sim)sections.push(sim);
    const viewed=getSignals().views||[];
    const recently=section('Recently viewed','Your browsing history on this device.',viewed.map(v=>products.find(p=>p.id===String(v))).filter(Boolean).filter(p=>p.id!==id),'Viewed recently');if(recently)sections.push(recently);
    const personalized=section('Picked for your taste','Suggestions based on your browsing, when you’ve allowed personalization.',rank(products,id).slice(0,8),'Recommended for you');if(personalized)sections.push(personalized);
    sections.forEach(el=>host.insertAdjacentElement('afterend',el));
  }
  function initConsentNotice(){
    if(consented()||read('tl_cookie'))return;
    const banner=document.createElement('div');banner.className='jrx';banner.style.cssText='font-size:12px;color:var(--mut,#716b78);margin-top:8px';
    banner.innerHTML='Personalized picks use browsing history stored on this device only when analytics consent is enabled. <a href="/cookie-policy.html" style="text-decoration:underline">Cookie choices</a>.';
    const host=$('#main')||$('main');if(host)host.append(banner);
  }
  document.addEventListener('click',e=>{
    const budget=e.target.closest('[data-jrx-budget]');
    if(budget){
      const max=Number(budget.getAttribute('data-jrx-budget'))||0;
      const cards=[...document.querySelectorAll('article.p[data-id]')];
      let shown=0;
      cards.forEach(card=>{
        const priceText=card.querySelector('.pr b')?.textContent||'';
        const price=Number(priceText.replace(/[^\\d]/g,''))||0;
        const visible=!max||(price>0&&price<=max);
        card.hidden=!visible;if(visible)shown++;
      });
      const status=$('.jrx-budget-status');
      if(status)status.textContent=max?(shown+' products shown at ₹'+max+' or less. Clear the site filters to reset any other filters.'):'Price shortcut cleared.';
      document.querySelectorAll('[data-jrx-budget]').forEach(b=>b.setAttribute('aria-pressed',String(b===budget)));
      return;
    }
    const a=e.target.closest('[data-jrx-product]');if(a)recordView(a.getAttribute('data-jrx-product'));
  },true);
  document.addEventListener('submit',e=>{
    const form=e.target;if(!(form instanceof HTMLFormElement))return;
    const input=form.querySelector('input[type="search"],input[placeholder*="search" i]');
    if(input&&input.value.trim())saveSignal('searches',input.value.trim().toLowerCase().slice(0,80));
  },true);
  window.addEventListener('juno-cookie-consent',e=>{if(e.detail==='all')init();});
  async function init(){
    if(document.documentElement.dataset.junoRecoLoaded==='1')return;
    document.documentElement.dataset.junoRecoLoaded='1';
    const products=await loadProducts();if(!products.length)return;
    const id=new URLSearchParams(location.search).get('p')||new URLSearchParams(location.search).get('id')||'';
    if(id)recordView(id);
    if(location.pathname.endsWith('/product.html'))renderProductRecommendations(products);else renderHome(products);
    initConsentNotice();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
