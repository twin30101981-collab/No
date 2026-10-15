const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
await p.route(/^https?:/,r=>r.abort());
const url='file://'+require('path').resolve(process.argv[2]);
await p.goto(url); await p.waitForTimeout(3000);
// 1) seed one saved plot (Mẫu B) in the app's own format, reload so app loads it
await p.evaluate(()=>{const pts=[[2259336.23,568027.14],[2259334.17,568027.23],[2259334.42,568031.07],[2259316.85,568031.69],[2259316.59,568031.70],[2259316.99,568036.18],[2259317.37,568036.15],[2259336.65,568034.94]].map(a=>({x:a[0],y:a[1]}));
 localStorage.setItem('land_gis_v18_cache',JSON.stringify([{id:'Thửa 131',points:pts,lon0:105.5,zone:3,meta:{so_thua:'131',to_ban_do:'10.1',dien_tich_m2:89.9}}]));});
await p.reload(); await p.waitForTimeout(4000);
const before=await p.evaluate(()=>({plotsInMem:(window.plots||[]).length,stored:!!localStorage.getItem('land_gis_v18_cache')}));
// 2) fill storage to the quota with filler keys (bypassing app wrapper via Storage.prototype)
const fill=await p.evaluate(()=>{const raw=Storage.prototype.setItem;let n=0;const chunk='x'.repeat(256*1024);
 try{for(;n<200;n++)raw.call(localStorage,'filler_'+n,chunk)}catch(e){}
 let small='y'.repeat(16*1024);try{for(let i=0;i<200;i++)raw.call(localStorage,'fs_'+i,small)}catch(e){}
 return n});
// 3) app writes an unrelated key (e.g., theme / diag log) that exceeds quota
const after=await p.evaluate(()=>{try{localStorage.setItem('landgis_v42_diag_log','z'.repeat(64*1024))}catch(e){return 'throw '+e.name}
 return {stored:!!Storage.prototype.getItem.call(localStorage,'land_gis_v18_cache'),plotsInMem:(window.plots||[]).length,stats:(window.lgStoreStats?lgStoreStats().notes.slice(-2):null)}});
// 4) simulate closing & reopening the app
await p.evaluate(()=>{for(let i=0;i<200;i++){localStorage.removeItem('filler_'+i);localStorage.removeItem('fs_'+i)}});
await p.reload(); await p.waitForTimeout(4000);
const reopen=await p.evaluate(()=>({plotsInMem:(window.plots||[]).length,stored:!!localStorage.getItem('land_gis_v18_cache')}));
console.log(JSON.stringify({before,fillerChunks:fill,afterUnrelatedWrite:after,afterReopen:reopen},null,1)); await b.close();})();
