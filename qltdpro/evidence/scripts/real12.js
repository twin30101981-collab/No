const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto(E.APP_URL,{waitUntil:'load'});await p.waitForTimeout(6000);
 await p.setInputFiles('#import-file',E.DATA+'/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 const strip0=await p.evaluate(()=>{showPage('dashboard');return document.getElementById('td-doisoat-strip').textContent});console.log('dải (chưa TSBĐ):',strip0);
 await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(1000);
 await p.setInputFiles('#tsbd-file',E.DATA+'/Sao ke tai san bao dam 20.10.2026.XLS');
 for(let i=0;i<120;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return TSBD.rows.length}catch(e){return 0}}))break;}await p.waitForTimeout(3000);
 await p.evaluate(()=>showPage('doisoat'));await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>({sum:window._tdDoiSoatLast.summary.text,rows:[...document.querySelectorAll('#doisoat-body tbody tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim()).slice(0,6).join(' | '))}));
 console.log(r.sum);r.rows.forEach(x=>console.log(' ',x.slice(0,200)));
 const dl=p.waitForEvent('download');await p.evaluate(()=>tdDoiSoatExport());const d=await dl;const path=E.WORK+'/bienban.txt';await d.saveAs(path);console.log('biên bản',d.suggestedFilename(),fs.readFileSync(path,'utf8').split('\n').slice(0,4).join(' / ').slice(0,300));
 // cố ý làm lệch: sửa 1 khoản sau khi có mốc
 const bad=await p.evaluate(()=>{DATA.qltd[5][11]=(+DATA.qltd[5][11]||0)+1000000;renderDashboard();return tdDoiSoatCompute().summary.text});
 console.log('sau khi sửa 1 khoản +1tr (chưa vẽ lại mốc):',bad);
 console.log('errs',JSON.stringify([...new Set(errs)]));await b.close()})();
