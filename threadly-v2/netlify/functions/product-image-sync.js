// Scheduled Juno product-image worker. One missing gallery slot per run.
// Required env: SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
// OPENAI_API_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
const sheets = require('../lib/sheets');
const crypto = require('crypto');
const VIEWS = [
 {key:'image',label:'front/product hero',prompt:'Clean ecommerce hero photograph, front/primary view.'},
 {key:'image 2',label:'side view',prompt:'Distinct ecommerce photograph from the side or useful alternate angle.'},
 {key:'image 3',label:'back view',prompt:'Distinct ecommerce photograph showing the reverse or another meaningful angle.'},
 {key:'image 4',label:'detail view',prompt:'Close-up highlighting material, finish, clasp, stitching, texture or key detail.'},
 {key:'image 5',label:'lifestyle view',prompt:'Tasteful lifestyle photograph showing the product in realistic use; for wearable items show a model wearing it.'}
];
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s*\(.*\)\s*$/,'').replace(/[_-]+/g,' ');
const find=(h,ns)=>h.findIndex(x=>ns.includes(norm(x)));
const cell=(r,i)=>i>=0?String(r[i]==null?'':r[i]).trim():'';
function requireEnv(){const miss=['OPENAI_API_KEY','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].filter(n=>!process.env[n]);if(miss.length)throw Error('Missing environment variables: '+miss.join(', '))}
function sign(params,secret){return crypto.createHash('sha1').update(Object.keys(params).sort().map(k=>k+'='+params[k]).join('&')+secret).digest('hex')}
async function upload(bytes,id){
 const cloud=process.env.CLOUDINARY_CLOUD_NAME,ts=String(Math.floor(Date.now()/1000)),p={folder:'juno/products',overwrite:'true',public_id:id,timestamp:ts},f=new FormData();
 f.append('file',new Blob([bytes],{type:'image/png'}),id+'.png');Object.entries(p).forEach(([k,v])=>f.append(k,v));f.append('api_key',process.env.CLOUDINARY_API_KEY);f.append('signature',sign(p,process.env.CLOUDINARY_API_SECRET));
 const r=await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(cloud)+'/image/upload',{method:'POST',body:f});const d=await r.json().catch(()=>({}));
 if(!r.ok||!d.secure_url)throw Error('Cloudinary upload failed: '+(d.error&&d.error.message||r.status));return d.secure_url
}
async function source(url){
 if(!url||/loremflickr\.com/i.test(url))return null;
 try{const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok||!(r.headers.get('content-type')||'').startsWith('image/'))return null;const bytes=Buffer.from(await r.arrayBuffer());if(!bytes.length||bytes.length>20*1024*1024)return null;const type=r.headers.get('content-type')||'';return{bytes,type:type.includes('jpeg')?'image/jpeg':type.includes('webp')?'image/webp':'image/png'}}catch(e){return null}
}
async function generate(p,v,src){
 const prompt='Photorealistic ecommerce product photograph for Juno. Product: '+p.name+'. Category: '+p.category+'. Details: '+p.details+'. Variant: '+p.variants+'. View: '+v.prompt+' Preserve the named item plausibly. No text, logos, watermarks, collages or extra products. Portrait 2:3, clean soft studio lighting, pale neutral background, crisp focus. '+(src?'Use the supplied photo as identity reference; preserve exact visible design, shape, colour, material and distinctive details.':'No trustworthy SKU source photo is available; create an illustrative image based on the product name and category, not a verified supplier photo.');
 const f=new FormData();f.append('model',process.env.OPENAI_IMAGE_MODEL||'gpt-image-1');f.append('prompt',prompt);f.append('size','1024x1536');f.append('quality','medium');
 if(src)f.append('image',new Blob([src.bytes],{type:src.type}),'source.'+(src.type==='image/jpeg'?'jpg':src.type==='image/webp'?'webp':'png'));
 const r=await fetch('https://api.openai.com/v1/images/'+(src?'edits':'generations'),{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:f,signal:AbortSignal.timeout(110000)});
 const d=await r.json().catch(()=>({}));if(!r.ok||!d.data||!d.data[0]||!d.data[0].b64_json)throw Error(d.error&&d.error.message||'OpenAI image API HTTP '+r.status);return Buffer.from(d.data[0].b64_json,'base64')
}
async function run(){
 requireEnv();const rows=await sheets.read('Products');if(!rows||rows.length<2)return{ok:true,processed:0,message:'No product rows found'};
 let h=(rows[0]||[]).map(x=>String(x||'').trim());const idI=find(h,['product id','id','sku']),nameI=find(h,['product name','name','title']),catI=find(h,['category','cat']),detailI=find(h,['details','description','product details']),variantI=find(h,['sizes/colours','sizes','colours','color','colour','variant']),showI=find(h,['show on site','published','active']);
 if(idI<0||nameI<0)throw Error('Products tab needs Product ID and Product Name columns.');
 let altered=false;for(const x of ['Image','Image 2','Image 3','Image 4','Image 5','Image Status','Image Updated'])if(find(h,[norm(x)])<0 && !(x==='Image' && find(h,['image url','image 1','product image','primary image'])>=0)){h.push(x);altered=true}
 if(altered)await sheets.update('Products',1,h);
 const ii=VIEWS.map((v,i)=>find(h,i===0?['image','image url','image 1','product image','primary image']:[v.key])),si=find(h,['image status']),ui=find(h,['image updated']);
 for(let ri=1;ri<rows.length;ri++){
  const row=[...(rows[ri]||[])];while(row.length<h.length)row.push('');
  const id=cell(row,idI),name=cell(row,nameI);if(!id||!name||(showI>=0&&/^(no|false|0)$/i.test(cell(row,showI))))continue;
  const primary=cell(row,ii[0]);const badPreview=/loremflickr\\.com/i.test(primary);const slot=badPreview?0:ii.findIndex(i=>!cell(row,i));if(slot<0)continue;
  const p={id,name,category:cell(row,catI)||'Fashion accessories',details:cell(row,detailI)||'No additional details supplied',variants:cell(row,variantI)||'Default variant'};
  try{
   const src=await source(cell(row,ii[0]));const png=await generate(p,VIEWS[slot],src);
   const slug=(id+'-'+VIEWS[slot].key.replace(/\s+/g,'-')).toLowerCase().replace(/[^a-z0-9_-]/g,'-');
   row[ii[slot]]=await upload(png,slug);
   row[si]=ii.every((idx,j)=>j===slot?true:!!cell(row,idx))?'Complete':'In progress';row[ui]=new Date().toISOString();
   await sheets.update('Products',ri+1,row);return{ok:true,productId:id,productName:name,view:VIEWS[slot].label,imageUrl:row[ii[slot]]}
  }catch(e){row[si]='Retry: '+String(e.message||e).slice(0,180);row[ui]=new Date().toISOString();await sheets.update('Products',ri+1,row).catch(()=>{});console.error('Image generation failed for '+id,e);return{ok:false,productId:id,view:VIEWS[slot].label,error:String(e.message||e).slice(0,240)}}
 }
 return{ok:true,processed:0,message:'All published products already have five gallery images'}
}
exports.handler=async event=>{
 if(event&&event.httpMethod){const token=process.env.JUNO_IMAGE_SYNC_TOKEN,auth=String(event.headers&&(event.headers.authorization||event.headers.Authorization)||'').replace(/^Bearer\s+/i,'');if(!token||auth!==token)return{statusCode:401,body:'Unauthorized'}}
 try{const result=await run();return{statusCode:result.ok?200:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(result)}}catch(e){console.error('Juno image sync failed',e);return{statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:false,error:String(e.message||e).slice(0,300)})}}
};
exports.config={schedule:'*/5 * * * *'};
