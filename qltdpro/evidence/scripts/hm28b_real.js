const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');const fs=require('fs');
const F=process.argv[2];const OUT=E.OUT;fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto('file://'+F,{waitUntil:'load'});await p.waitForTimeout(6000);
 // chưa có dữ liệu: báo lỗi gọn, không vỡ
 await p.evaluate(()=>tdReportDialog());await p.click('#td-rp-go');await p.waitForTimeout(800);
 console.log('khi chưa có dữ liệu:',await p.evaluate(()=>document.getElementById('td-rp-msg').textContent));await p.evaluate(()=>document.getElementById('td-report-dlg').remove());
 for(const f of ['30.09.2026.XLS','20.10.2026.XLS']){await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});await p.setInputFiles('#import-file',E.DATA+'/'+f);for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
  await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);}
 await p.evaluate(()=>showPage('doisoat'));await p.waitForTimeout(2500);
 const opts=await p.evaluate(()=>{tdReportDialog();return [...document.querySelectorAll('#td-rp-period option')].map(o=>o.value+'|'+o.textContent)});console.log('kỳ:',JSON.stringify(opts));
 const dash=await p.evaluate(()=>{renderDashboard();const tf=document.querySelector('#tfoot-db-main');return tf?tf.innerText.replace(/\s+/g,' '):''});console.log('Dashboard tổng:',dash.slice(0,120));
 async function exp(per,fmt,sign,name){await p.evaluate(()=>{const d=document.getElementById('td-report-dlg');if(!d)tdReportDialog()});
  await p.selectOption('#td-rp-period',per);await p.check('input[name=td-rp-fmt][value='+fmt+']');
  if(sign)await p.check('#td-rp-sign');else await p.uncheck('#td-rp-sign');
  const dl=p.waitForEvent('download');await p.click('#td-rp-go');const d=await dl;await d.saveAs(OUT+'/'+name);console.log(name,d.suggestedFilename(),fs.statSync(OUT+'/'+name).size,'bytes');await p.waitForTimeout(500);}
 await exp('','docx',true,'cur.docx');await exp('30/09/2026','docx',false,'p0930.docx');await exp('30/09/2026','xlsx',false,'p0930.xlsx');await exp('','xlsx',false,'cur.xlsx');
 console.log('thông báo:',await p.evaluate(()=>document.getElementById('td-rp-msg').textContent));
 console.log('errs',JSON.stringify([...new Set(errs)]));await b.close()})();
