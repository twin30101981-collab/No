const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const ctx=await b.newContext(); const p=await ctx.newPage(); await p.route(/^https?:/,r=>r.abort());
const url='file://'+require('path').resolve(process.argv[2]);
await p.goto(url); await p.waitForTimeout(3500);
await p.evaluate(()=>{lgKeyCacheInit&&lgKeyCacheInit(); lgKeySet('claude_api_key','sk-ant-CU-LUU-LAU-DAI');});
await p.waitForTimeout(800);
await p.evaluate(()=>{sessionStorage.setItem('landgis_key_session_only','1'); lgKeySet('claude_api_key','sk-ant-MOI-CHI-TRONG-PHIEN');});
await p.waitForTimeout(800);
const idb=await p.evaluate(()=>LGCore.DataStore.get('settings','apikey:claude_api_key').then(r=>r&&r.value));
// "close tab": new page in same context (sessionStorage is per-tab)
const p2=await ctx.newPage(); await p2.route(/^https?:/,r=>r.abort()); await p2.goto(url); await p2.waitForTimeout(4000);
const after=await p2.evaluate(()=>({sessionFlag:sessionStorage.getItem('landgis_key_session_only'),keyUsed:lgKeyGet('claude_api_key')}));
console.log(JSON.stringify({idbAfterSwitchToSessionMode:idb,newTab:after})); await b.close();})();
