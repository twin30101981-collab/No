const { chromium } = require('playwright');const fs=require('fs');
const FILE=process.argv[2],LABEL=process.argv[3];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1920,height:1080}});const p=await ctx.newPage();
 await p.addInitScript(()=>{window.__perf={ivFires:{},moCalls:0,moMs:0,long:[]};
  const si=window.setInterval;window.setInterval=function(fn,ms,...a){const id=new Error().stack.split('\n')[2]||'';const key=ms+'ms@'+id.replace(/.*:(\d+):\d+\)?$/,'L$1');const w=function(...x){window.__perf.ivFires[key]=(window.__perf.ivFires[key]||0)+1;const t=performance.now();try{return fn.apply(this,x)}finally{window.__perf.ivMs=(window.__perf.ivMs||0)+performance.now()-t}};return si.call(window,w,ms,...a)};
  const MO=window.MutationObserver;window.MutationObserver=function(cb){const w=function(m,o){window.__perf.moCalls++;const t=performance.now();try{return cb.call(this,m,o)}finally{window.__perf.moMs+=performance.now()-t}};return new MO(w)};window.MutationObserver.prototype=MO.prototype;
  try{new PerformanceObserver(l=>{l.getEntries().forEach(e=>window.__perf.long.push(Math.round(e.duration)))}).observe({entryTypes:['longtask']})}catch(e){}});
 p.on('dialog',d=>d.accept());
 await p.goto('file://'+FILE,{waitUntil:'load'});await p.waitForTimeout(6000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(5000);
 const times={};
 for(const pg of ['dashboard','qltd','kd','td','denhan','laidong','tsbd','giadat','baocao','dashboard','qltd']){
  const t=await p.evaluate(async(pg)=>{const t0=performance.now();showPage(pg);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Math.round(performance.now()-t0)},pg);(times[pg]=times[pg]||[]).push(t);await p.waitForTimeout(700);}
 await p.evaluate(()=>{showPage('qltd');window.__perf.ivFires={};window.__perf.moCalls=0;window.__perf.moMs=0;window.__perf.ivMs=0;window.__perf.long=[]});
 await p.waitForTimeout(12000);
 const idle=await p.evaluate(()=>JSON.stringify({iv:window.__perf.ivFires,ivMs:Math.round(window.__perf.ivMs||0),moCalls:window.__perf.moCalls,moMs:Math.round(window.__perf.moMs),long:window.__perf.long}));
 const heap=await p.evaluate(()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null);
 const scroll=await p.evaluate(async()=>{showPage('qltd');await new Promise(r=>setTimeout(r,800));const sc=document.querySelector('#page-qltd .table-wrap')||document.scrollingElement;let frames=0,worst=0,last=performance.now();const t0=last;
  await new Promise(res=>{let i=0;function step(){const n=performance.now();worst=Math.max(worst,n-last);last=n;frames++;sc.scrollTop+=120;if(++i<60)requestAnimationFrame(step);else res()}requestAnimationFrame(step)});return {frames,worstFrameMs:Math.round(worst),totalMs:Math.round(performance.now()-t0)}});
 console.log(LABEL,JSON.stringify({pageSwitchMs:Object.fromEntries(Object.entries(times).map(([k,v])=>[k,v.join('/')])),idle12s:JSON.parse(idle),heapMB:heap,scroll}));
 await b.close()})();
