const { chromium } = require('playwright');const fs=require('fs');
const F=process.argv[2]||'file:///tmp/claude-0/work1/app_hm28.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto(F,{waitUntil:'load'});await p.waitForTimeout(6000);
 // chưa có dữ liệu: không vỡ
 await p.evaluate(()=>tdReportExport());await p.waitForTimeout(800);
 const files=['30.09.2026.XLS','20.10.2026.XLS'];
 for(const f of files){await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});await p.setInputFiles('#import-file','/tmp/claude-0/real/data/'+f);for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}await p.evaluate(()=>doImport());await p.waitForTimeout(800);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(3500);}
 await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(600);await p.setInputFiles('#tsbd-file','/tmp/claude-0/real/data/Sao ke tai san bao dam 20.10.2026.XLS');
 for(let i=0;i<120;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return TSBD.rows.length}catch(e){return 0}}))break;}await p.waitForTimeout(3000);
 await p.evaluate(()=>showPage('doisoat'));await p.waitForTimeout(2500);
 const dl=p.waitForEvent('download');await p.evaluate(()=>tdReportExport());const d=await dl;const path='/tmp/claude-0/work1/baocao.xlsx';await d.saveAs(path);
 console.log('file',d.suggestedFilename(),fs.statSync(path).size,'bytes');
 console.log('errs',JSON.stringify(errs));await b.close()})();
