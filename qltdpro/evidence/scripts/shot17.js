const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();p.on('dialog',d=>d.accept());await p.goto('file:///tmp/claude-0/work1/app_hm17.html',{waitUntil:'load'});await p.waitForTimeout(5000);
await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(2500);await p.addStyleTag({content:'tbody td,.kh-name{filter:blur(5px)!important}'});await p.waitForTimeout(300);
await p.screenshot({path:'/tmp/claude-0/work1/hm17_1920.png'});await b.close()})();
