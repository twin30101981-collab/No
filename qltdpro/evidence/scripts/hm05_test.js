const { chromium } = require('playwright');const fs=require('fs');const W=process.argv[2],PORT=process.argv[3],TAG=process.argv[4];
const PAGES=['dashboard','ctkh','qltd','kd','td','denhan','laidong','chlm','tranop','phidv','khmoi','baocao','tsbd','giadat','archive'];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1600,height:900}});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,140)));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,140))});p.on('dialog',d=>{errs.push('dialog: '+d.message().slice(0,100));d.accept()});
 const out={};
 const t0=Date.now();await p.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});out.loadMs=Date.now()-t0;await p.waitForTimeout(9000);
 const state=()=>p.evaluate(()=>({qltd:DATA.qltd.length,tsbdRows:(window.TSBD&&TSBD.rows||[]).length,pastDue:Object.keys((window.TD_PASTDUE||{}).map||{}).length,archive:(window._archiveReportList||[]).length,tkstt:typeof TKSTT_MAP==='object'?Object.keys(TKSTT_MAP).length:-1,denhanAmt:Object.keys(DENHAN_AMT).length}));
 out.fresh=await state();
 for(const pg of PAGES){try{await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(700)}catch(e){errs.push('showPage '+pg+' '+e.message.slice(0,60))}}
 await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(2500);
 out.tsbdText=(await p.evaluate(()=>document.querySelector('#page-tsbd').innerText.slice(0,200))).replace(/\s+/g,' ');
 await p.setInputFiles('#import-file',`${W}/data_private/20.10.2026.XLS`);await p.waitForTimeout(14000);await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(6000);
 out.afterImport=await state();
 for(const pg of PAGES){try{await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(700)}catch(e){errs.push('showPage '+pg+' '+e.message.slice(0,60))}}
 out.dash=await p.evaluate(()=>{showPage('dashboard');return (document.querySelector('#page-dashboard').innerText.match(/(\d[\d.]*) hồ sơ dư nợ thực tế · (\d[\d.]*) khách hàng thực tế/)||[]).slice(1,3)});
 await p.reload({waitUntil:'load'});await p.waitForTimeout(9000);out.afterReload=await state();
 out.errs=[...new Set(errs)];console.log(TAG,JSON.stringify(out,null,1));await b.close();})();
