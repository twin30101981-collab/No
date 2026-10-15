const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1400,height:900},deviceScaleFactor:2})).newPage();
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(500);
for(const i of [7,8,9,10,11,12,13,14,15]) await p.locator('#t'+i).screenshot({path:process.argv[3]+'/mock_t'+i+'.png'});
await b.close();})();
