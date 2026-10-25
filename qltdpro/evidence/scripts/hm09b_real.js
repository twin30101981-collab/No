const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto(E.APP_URL,{waitUntil:'load'});await p.waitForTimeout(6000);
 for(const f of ['30.06.2026.XLS','20.10.2026.XLS']){
  await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});
  await p.setInputFiles('#import-file',E.DATA+'/'+f);
  for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
  await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(5000);}
 const r=await p.evaluate(()=>{renderDashboard();const o={};const cap=TDCMP.captureToday();o.rows=DATA.qltd.length;o.cmpRows=cap.length;o.cmpSum=cap.reduce((s,r)=>s+r.duNo,0);
  const ind=DATA.qltd.filter(r=>r&&(+r[11]||0)>0).reduce((s,r)=>s+(+r[11]),0);o.indepSum=ind;o.dropped=DATA.qltd.filter(r=>r&&!String(r[0]||'').trim()&&!String(r[2]||'').trim()&&(+r[11]||0)>0).length;
  TDCMP.renderKpi();o.recon=(document.getElementById('tdcmp-recon')||{}).textContent;
  const a=TD_AUDIT.run({show:false});o.audit=a.checks.filter(c=>c.file!==undefined).map(c=>c.name.slice(0,30)+':'+c.app+'/'+c.file);o.issues=a.issues.map(i=>i.code);
  o.up5=TDUP5.scanInterestOverdue().length;o.kh=TD.metrics.countCustomers(DATA.qltd);o.pd=Object.keys((window.TD_PASTDUE||{}).map||{}).length;return o;});
 console.log(JSON.stringify(r,null,1));console.log('errs',JSON.stringify([...new Set(errs)]));await b.close()})();
