(() => {
 const events = (window.JUNO_SALES || []).map(e => ({...e,startAt:Date.parse(e.start),endAt:Date.parse(e.end)})).sort((a,b)=>a.startAt-b.startAt);
 const now = () => Date.now();
 const fmt = date => new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(date));
 const status = e => now()<e.startAt?'upcoming':now()<e.endAt?'live':'ended';
 const current = () => events.find(e=>status(e)==='live') || events.find(e=>status(e)==='upcoming') || events[events.length-1];
 const featured = document.getElementById('featured');
 const list = document.getElementById('sale-list');
 const filter = document.getElementById('sale-filter');
 const left = ms => {const t=Math.max(0,ms);return {d:Math.floor(t/86400000),h:Math.floor(t%86400000/3600000),m:Math.floor(t%3600000/60000),s:Math.floor(t%60000/1000)}};
 function renderFeatured(){const e=current();if(!e||!featured)return;const live=status(e)==='live',target=live?e.endAt:e.startAt;const clock=left(target-now());featured.innerHTML='<article class="feature-card '+e.theme+'"><div><span class="tag">'+e.tag+'</span><h3>'+e.headline+'</h3><p>'+e.sub+'</p><div class="offer">'+e.offer+'</div><p class="muted">'+(live?'Ends '+fmt(e.endAt):'Starts '+fmt(e.startAt))+' · India time</p></div><aside class="timerbox"><div class="timer-label">'+(live?'Time left in this edit':'Countdown to the next edit')+'</div><div class="timer"><span>'+String(clock.d).padStart(2,'0')+'<small>DAYS</small></span><span>'+String(clock.h).padStart(2,'0')+'<small>HRS</small></span><span>'+String(clock.m).padStart(2,'0')+'<small>MINS</small></span><span>'+String(clock.s).padStart(2,'0')+'<small>SECS</small></span></div><a class="button" href="/">'+e.cta+' →</a></aside></article>'}
 function renderList(){if(!list)return;const selected=filter?filter.value:'all';list.innerHTML=events.filter(e=>selected==='all'||e.kind===selected).map(e=>{const s=status(e);const date=fmt(e.startAt)+' – '+fmt(e.endAt-1);return '<article class="sale-card"><div class="date">'+date+'</div><h3>'+e.name+'</h3><p>'+e.sub+'</p><div class="bottom"><span class="status '+s+'">'+(s==='live'?'Live now':s==='upcoming'?'Coming up':'Planned')+'</span><span class="status">'+e.offer+'</span></div></article>'}).join('')}
 if(filter)filter.addEventListener('change',renderList);
 renderFeatured();renderList();window.setInterval(()=>{renderFeatured();renderList()},1000);
})();