const { chromium } = require('/opt/node-tools/node_modules/playwright');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64');
const TILE=/(google\.com\/vt|arcgisonline\.com|cartocdn\.com|tile\.openstreetmap|opentopomap|virtualearth|maptiler|wayback)/;
(async()=>{const out={};
for (const sc of ['ok','google_blocked','offline']){
 const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}); const p=await ctx.newPage();
 const hosts={};let tileReq=0;
 await p.route(/^https?:/,r=>{const u=r.request().url();if(TILE.test(u)){tileReq++;const h=new URL(u).hostname.replace(/^mt\d|^[a-d]\./,'*');hosts[h]=(hosts[h]||0)+1;
   if(sc==='offline')return r.abort(); if(sc==='google_blocked'&&/google\.com/.test(u))return r.abort(); return r.fulfill({status:200,contentType:'image/png',body:PNG});}
   return r.abort();});
 await p.addInitScript(()=>{window.__toasts=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType===1){const t=(n.innerText||'').trim();if(t&&/lớp|nền|tải|bản đồ|ảnh/i.test(t)&&t.length<200)window.__toasts.push(Math.round(performance.now())+'ms '+t.replace(/\s+/g,' ').slice(0,90))}}}).observe(document.documentElement,{childList:true,subtree:true})});
 await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(8000);
 const snap=async(tag)=>p.evaluate(tag=>{const m=window.map;const names=[];m&&m.eachLayer(l=>{if(l._url)names.push((l.options&&l.options.attribution||'').replace(/<[^>]+>/g,'').slice(0,18)+'|'+l._url.replace(/https?:\/\//,'').slice(0,28)+'|nz'+(l.options.maxNativeZoom||'-')+'|r'+(l.options.detectRetina?1:0))});return {tag,zoom:m&&m.getZoom(),tileLayers:names}},tag);
 const s1=await snap('t8s');
 for(let i=0;i<6;i++){await p.evaluate(i=>{map.panBy([i%2?250:-250,i%3?180:-180],{animate:false})},i);await p.waitForTimeout(1500)}
 await p.evaluate(()=>map.setZoom(Math.min(map.getMaxZoom(),20)));await p.waitForTimeout(4000);
 const s2=await snap('after_pan_zoom20');
 const misc=await p.evaluate(()=>({retina:window.LG_RETINA,dpr:devicePixelRatio,failTried:[...(window.__lgFailoverTried||[])],toasts:window.__toasts.slice(0,14),nToasts:window.__toasts.length}));
 out[sc]={tileReq,hosts,s1,s2,...misc}; await b.close();}
console.log(JSON.stringify(out,null,1));})();
