const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 await p.route(/^https?:/,r=>r.abort()); await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(4000);
 const r=await p.evaluate(()=>new Promise(res=>{const c={};const o=new MutationObserver(l=>{for(const m of l){let t=m.target.nodeType===1?m.target:m.target.parentElement;let k=(t&&(t.id||t.className&&String(t.className).slice(0,40)||t.tagName))+'|'+m.type+(m.attributeName?':'+m.attributeName:'');c[k]=(c[k]||0)+1}});
 o.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});setTimeout(()=>{o.disconnect();res(Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,15))},10000)}));
 console.log(JSON.stringify(r)); await b.close();})();
