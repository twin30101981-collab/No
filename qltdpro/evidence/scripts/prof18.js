const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1920,height:1080}});const p=await ctx.newPage();
 await p.addInitScript(()=>{window.__iv=[];const si=window.setInterval;window.setInterval=function(fn,ms,...a){window.__iv.push([ms,String(fn).replace(/\s+/g,' ').slice(0,110)]);return si.call(window,fn,ms,...a)}});
 p.on('dialog',d=>d.accept());await p.goto('file:///tmp/claude-0/work1/app_hm15.html',{waitUntil:'load'});await p.waitForTimeout(6000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(5000);
 console.log('INTERVALS',JSON.stringify(await p.evaluate(()=>window.__iv.filter(x=>x[0]<=5000))));
 // đếm lời gọi hàm render trong 1 lần showPage
 const r=await p.evaluate(async()=>{const names=['renderDashboard','renderTable','renderQltd','renderAll','rebuildAll','scanTables','updateBadges','renderDenHan','renderLaiDong','renderPhiDV','applyFilters','buildFilters'];const cnt={},ms={};
  names.forEach(n=>{if(typeof window[n]==='function'){const o=window[n];window[n]=function(){cnt[n]=(cnt[n]||0)+1;const t=performance.now();try{return o.apply(this,arguments)}finally{ms[n]=(ms[n]||0)+performance.now()-t}}}});
  const out={};for(const pg of ['dashboard','qltd','denhan']){for(const k in cnt)delete cnt[k];for(const k in ms)delete ms[k];const t0=performance.now();showPage(pg);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));out[pg]={total:Math.round(performance.now()-t0),cnt:{...cnt},ms:Object.fromEntries(Object.entries(ms).map(([k,v])=>[k,Math.round(v)]))};await new Promise(r=>setTimeout(r,1200))}
  return out});
 console.log(JSON.stringify(r,null,1));await b.close()})();
