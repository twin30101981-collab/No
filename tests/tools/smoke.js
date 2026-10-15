const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path=require('path').resolve(process.argv[2]), out=process.argv[3];
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}).catch(async()=>chromium.launch());
 const res={};
 for (const [name,vp] of [['mobile',{width:390,height:844}],['desktop',{width:1366,height:768}]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:1});
  const p=await ctx.newPage(); const r={pageerror:[],consoleError:[],consoleWarn:0,reqFail:[],t:0};
  p.on('pageerror',e=>r.pageerror.push(String(e.message).slice(0,200)));
  p.on('console',m=>{if(m.type()==='error')r.consoleError.push(m.text().slice(0,200)); if(m.type()==='warning')r.consoleWarn++;});
  p.on('requestfailed',q=>r.reqFail.push(q.url().slice(0,100)+' '+(q.failure()||{}).errorText));
  const t0=Date.now();
  await p.goto('file://'+path,{waitUntil:'load',timeout:60000}).catch(e=>r.gotoErr=String(e));
  r.t=Date.now()-t0;
  await p.waitForTimeout(6000);
  r.info=await p.evaluate(()=>({ver:window.LG_VERSION,title:document.title,L:!!window.L,proj4:!!window.proj4,
    map:!!document.querySelector('.leaflet-container'),lgc:Object.keys(window.LGCore||{}).length,
    globals:Object.keys(window).length,dom:document.querySelectorAll('*').length,
    hscroll:document.documentElement.scrollWidth>innerWidth,
    heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,
    ls:Object.keys(localStorage).length}));
  await p.screenshot({path:`${out}/baseline_${name}.png`});
  res[name]=r; await ctx.close();
 }
 await b.close(); console.log(JSON.stringify(res,null,1));
})();
