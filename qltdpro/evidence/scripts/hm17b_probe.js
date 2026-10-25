const { chromium } = require('playwright');
const FILE='file://'+process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>d.accept());
 await p.goto(FILE,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 for(const k of ['qltd','kd','td']){
  const t0=Date.now();await p.evaluate(x=>showPage(x),k);await p.waitForTimeout(3000);
  const r=await p.evaluate(k=>{const t=document.getElementById('table-'+k);const rows=[...t.tBodies[0].rows];const hid=rows.filter(r=>r.style.display==='none').length;
   const bars=[...document.querySelectorAll('.dp-page-bar,[id^=dpbar-]')].length;const exp=!!document.querySelector('#page-'+k+' button[onclick*="__TDExpandRender"]');
   return {rows:rows.length,hidden:hid,dpBars:bars,expandBtn:exp,grid:t.classList.contains('tdup2-grid'),limit:(window.__TD_RENDER_LIMIT||{})[k],total:(DATA.qltd||[]).length}},k);
  console.log(k,JSON.stringify(r));}
 // đo lọc: gõ vào ô tìm
 console.log('errs',JSON.stringify([...new Set(errs)]));await b.close()})();
