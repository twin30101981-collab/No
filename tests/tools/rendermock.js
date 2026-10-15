const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1400,height:900},deviceScaleFactor:2})).newPage();
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(500);
for(let i=0;i<=6;i++) await p.locator('#s'+i).screenshot({path:process.argv[3]+'/mock_s'+i+'.png'});
await b.close();})();
