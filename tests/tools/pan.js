const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const res={};for (const f of process.argv.slice(2)){const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
await p.route(/^https?:\/\/(?!.*supabase).*\.(png|jpg|jpeg)(\?.*)?$|mt\d\.google|arcgisonline|tile\./,r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64')}));
await p.route(/^https?:/,r=>r.abort());
await p.goto('file://'+require('path').resolve(f)); await p.waitForTimeout(4000);
const r=await p.evaluate(async()=>{const m=window.map||window.LG_MAP||(window.LG&&LG.map);if(!m||!m.panBy)return 'nomap';const t=[];
 for(let i=0;i<12;i++){const t0=performance.now();m.panBy([i%2?300:-300,i%3?200:-200],{animate:false});await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));t.push(performance.now()-t0);await new Promise(r=>setTimeout(r,250))}
 t.sort((a,b)=>a-b);return {medianMs:Math.round(t[6]),maxMs:Math.round(t[11])}});
res[f.split('/').pop()]=r; await b.close();}
console.log(JSON.stringify(res));})();
