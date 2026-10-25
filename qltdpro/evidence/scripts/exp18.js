const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
 for(const [label,css] of [['base',''],['cv-visible','*{content-visibility:visible!important;contain:none!important}'],['page-display-none','.page:not(.active){display:none!important}'],['both','*{content-visibility:visible!important;contain:none!important}.page:not(.active){display:none!important}']]){
 const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();p.on('dialog',d=>d.accept());
 await p.goto('file:///tmp/claude-0/work1/app_hm18.html',{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 if(css)await p.addStyleTag({content:css});
 const r=[];for(const pg of ['qltd','dashboard','kd','dashboard','qltd','denhan','dashboard']){r.push(pg+':'+await p.evaluate(async(pg)=>{const t0=performance.now();showPage(pg);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return Math.round(performance.now()-t0)},pg));await p.waitForTimeout(800)}
 console.log(label,r.join(' '));await p.close()}
 await b.close()})();
