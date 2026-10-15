const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1700,height:1000},deviceScaleFactor:2})).newPage();
await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(500);
for(const i of ['h23','h24','h25']) await p.locator('#'+i).screenshot({path:process.argv[3]+'/mock_'+i+'.png'});
await b.close();})();
