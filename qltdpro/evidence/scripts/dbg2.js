const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();p.on('dialog',d=>d.accept());await p.goto('file:///tmp/claude-0/work1/app_hm18.html',{waitUntil:'load'});await p.waitForTimeout(5000);
await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
for(const pg of ['qltd','kd','td']){await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(2000);
console.log(pg,JSON.stringify(await p.evaluate(pg=>{const t=document.querySelector('#page-'+pg+' table');const tf=t.tFoot?[...t.tFoot.rows].map(r=>[...r.cells].map(c=>c.colSpan+':'+c.textContent.trim().slice(0,140)).join(' | ')):[];const r0=[...t.tBodies[0].rows].slice(0,2).map(r=>r.cells.length+'/'+[...r.cells].map(c=>c.colSpan).join(','));return {id:t.id,ths:[...t.tHead.rows[0].cells].length,tf,r0,w:t.scrollWidth,wrap:t.parentElement.clientWidth,hdr:[...t.tHead.rows[0].cells].map(c=>c.textContent.replace(/[↕★]/g,'').trim().slice(0,12)).join('|')}},pg)));}
await b.close()})();
