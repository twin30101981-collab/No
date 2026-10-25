const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1920,height:1080}});const p=await ctx.newPage();
 p.on('dialog',d=>d.accept());await p.goto('file://'+process.argv[2],{waitUntil:'load'});await p.waitForTimeout(6000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(5000);
 const c=await ctx.newCDPSession(p);await c.send('Profiler.enable');await c.send('Profiler.setSamplingInterval',{interval:200});
 for(const pg of ['dashboard','qltd','dashboard']){
  await c.send('Profiler.start');
  const t=await p.evaluate(async(pg)=>{const t0=performance.now();showPage(pg);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Math.round(performance.now()-t0)},pg);
  const {profile}=await c.send('Profiler.stop');
  const self={};const dt=profile.timeDeltas;const idIdx={};profile.nodes.forEach(n=>idIdx[n.id]=n);
  profile.samples.forEach((id,i)=>{const n=idIdx[id];const k=(n.callFrame.functionName||'(anon)')+' '+n.callFrame.url.split('/').pop().slice(0,20)+':'+n.callFrame.lineNumber;self[k]=(self[k]||0)+(dt[i]||0)/1000});
  const par={};const parent={};profile.nodes.forEach(n=>(n.children||[]).forEach(ch=>parent[ch]=n.id));
  profile.samples.forEach((id,i)=>{const n=idIdx[id];if(n.callFrame.functionName==='getBoundingClientRect'){const pn=idIdx[parent[id]];const k=(pn.callFrame.functionName||'(anon)')+':'+pn.callFrame.lineNumber;par[k]=(par[k]||0)+(dt[i]||0)/1000}});
  console.log('  getBoundingClientRect callers',JSON.stringify(Object.entries(par).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>k+' '+Math.round(v)+'ms')));
  const top=Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>k+' '+Math.round(v)+'ms');
  console.log(pg,t+'ms',JSON.stringify(top));await p.waitForTimeout(1500);}
 await b.close()})();
