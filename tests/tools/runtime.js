const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
 await p.route(/^https?:/,r=>r.abort());
 await p.addInitScript(()=>{window.__st={iv:0,ivLive:new Set(),mo:0,to:0,lsSet:0,lsGet:0,fetchWraps:0};
  const si=setInterval, ci=clearInterval; window.setInterval=function(f,t,...a){const id=si(f,t,...a);__st.iv++;__st.ivLive.add(id);return id};
  window.clearInterval=function(id){__st.ivLive.delete(id);return ci(id)};
  const MO=MutationObserver; window.MutationObserver=class extends MO{constructor(c){super(c);__st.mo++}};
  const st=Storage.prototype.setItem, gt=Storage.prototype.getItem;
  Storage.prototype.setItem=function(){__st.lsSet++;return st.apply(this,arguments)}; Storage.prototype.getItem=function(){__st.lsGet++;return gt.apply(this,arguments)};
 });
 const t0=Date.now(); await p.goto('file://'+require('path').resolve(process.argv[2])); const tl=Date.now()-t0;
 await p.waitForTimeout(3000); const a=await p.evaluate(()=>({ivLive:__st.ivLive.size,iv:__st.iv,mo:__st.mo,ls:[__st.lsSet,__st.lsGet]}));
 // CPU idle activity: count DOM mutations for 10s
 const m=await p.evaluate(()=>new Promise(r=>{let n=0;const o=new MutationObserver(l=>n+=l.length);o.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});setTimeout(()=>{o.disconnect();r(n)},10000)}));
 const perf=await p.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd)}});
 const ls=await p.evaluate(()=>{const o={};for(const k of Object.keys(localStorage))o[k]=(localStorage.getItem(k)||"").length;return o});
 const longtasks=await p.evaluate(()=>window.LG_DIAG?Object.keys(window.LG_DIAG):null);
 console.log(JSON.stringify({gotoMs:tl,perf,a,idleMutations10s:m,ls},null,1)); await b.close();})();
