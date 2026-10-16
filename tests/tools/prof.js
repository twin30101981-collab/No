const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage(); await p.route(/^https?:/,r=>r.abort());
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(2000);
const N=+process.argv[3];
await p.evaluate(N=>{const base=[[2259336.23,568027.14],[2259334.17,568027.23],[2259334.42,568031.07],[2259316.85,568031.69],[2259316.59,568031.70],[2259316.99,568036.18],[2259317.37,568036.15],[2259336.65,568034.94]];const arr=[];for(let i=0;i<N;i++)arr.push({id:'T'+i,points:base.map(a=>({x:a[0]+(i%20)*25,y:a[1]+Math.floor(i/20)*15})),lon0:105.5,zone:3,meta:{so_thua:String(i),to_ban_do:'10',dien_tich_m2:89.9}});localStorage.setItem('land_gis_v18_cache',JSON.stringify(arr))},N);
const cdp=await ctx.newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval',{interval:500}); await cdp.send('Profiler.start');
const t0=Date.now(); await p.reload({waitUntil:'load',timeout:240000}).catch(e=>console.log('reload err',e.message.slice(0,60))); const tl=Date.now()-t0;
const {profile}=await cdp.send('Profiler.stop'); const dclMs=Math.round(await p.evaluate(()=>performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd));
// self time per function
const self={};const dt=profile.timeDeltas;const idx={};profile.nodes.forEach(n=>idx[n.id]=n);
profile.samples.forEach((s,i)=>{const n=idx[s];const k=n.callFrame.functionName+'@'+(n.callFrame.lineNumber+1);self[k]=(self[k]||0)+(dt[i]||0)});
const top=Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>k+' '+Math.round(v/1000)+'ms');
// inclusive by app line: walk parents
const parent={};profile.nodes.forEach(n=>(n.children||[]).forEach(c=>parent[c]=n.id));
const incl={};profile.samples.forEach((s,i)=>{let id=s;const seen=new Set();while(id){const n=idx[id];const k=n.callFrame.functionName+'@'+(n.callFrame.lineNumber+1);if(!seen.has(k)){incl[k]=(incl[k]||0)+(dt[i]||0);seen.add(k)}id=parent[id]}});
const topI=Object.entries(incl).filter(([k])=>!k.startsWith('(')&&!k.startsWith('@')).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>k+' '+Math.round(v/1000)+'ms');
console.log(JSON.stringify({N,loadMs:tl,dclMs,topSelf:top,topInclusive:topI},null,1)); await b.close();})();
