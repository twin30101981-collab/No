const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');const fs=require('fs');
const F=process.argv[2]||(E.APP?'file://'+E.APP:'file://'+E.WORK+'/app_hm25.html');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 await p.goto(F,{waitUntil:'load'});await p.waitForTimeout(6000);
 const imp=async f=>{await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});await p.setInputFiles('#import-file',E.DATA+'/'+f);for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
  await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);};
 // chưa có dữ liệu: trang vẫn mở
 await p.evaluate(()=>showPage('canhbao'));await p.waitForTimeout(800);ck('trang mở khi chưa có dữ liệu',(await p.evaluate(()=>document.querySelector('.page.active').id))==='page-canhbao');
 await imp('30.09.2026.XLS');
 let s0=await p.evaluate(()=>{showPage('canhbao');return window._tdWarnLast.res.sections.find(s=>s.id==='nhom').skipped});ck('chỉ 1 kỳ ⇒ chuyển nhóm "chưa có mốc kỳ trước"',s0===true);
 await imp('20.10.2026.XLS');
 await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(800);await p.setInputFiles('#tsbd-file',E.DATA+'/Sao ke tai san bao dam 20.10.2026.XLS');
 for(let i=0;i<120;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return TSBD.rows.length}catch(e){return 0}}))break;}await p.waitForTimeout(3000);
 await p.evaluate(()=>showPage('canhbao'));await p.waitForTimeout(2500);
 const S=await p.evaluate(()=>Object.fromEntries(window._tdWarnLast.res.sections.map(s=>[s.id,{c:s.count,kh:s.kh,sk:!!s.skipped}])));
 const exp={over:1,d7:50,d15:47,d30:164,ls:11,nhom:1,tsHet:1261,tsCu:2249,tsKhong:7};
 Object.keys(exp).forEach(k=>ck('khớp tính độc lập (Python) · '+k+' = '+exp[k],S[k]&&S[k].c===exp[k],[k,S[k]]));
 const mark=await p.evaluate(()=>({prev:window._tdWarnLast.inp.prevLabel,strip:document.getElementById('td-warn-strip')?document.getElementById('td-warn-strip').textContent:'(chưa vẽ Dashboard)'}));
 ck('mốc kỳ trước = 30/09/2026',mark.prev==='30/09/2026',mark);
 const ui=await p.evaluate(()=>({cards:document.querySelectorAll('#warn-body details').length,head:document.getElementById('warn-body').innerText.slice(0,140).replace(/\s+/g,' ')}));ck('trang có 9 mục (details)',ui.cards===9,ui);
 // dải Dashboard
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(1500);const st=await p.evaluate(()=>document.getElementById('td-warn-strip').textContent);ck('dải Dashboard hiện tổng + quá hạn/đến hạn/LS/TSBĐ',/Cảnh báo sớm: \d+ mục/.test(st)&&/quá hạn 1/.test(st)&&/≤7 ngày 50/.test(st),st);
 // quá hạn khác nhau khi chuyển "hôm nay"
 await p.evaluate(()=>tdToggleDataDate());await p.waitForTimeout(1200);await p.evaluate(()=>showPage('canhbao'));await p.waitForTimeout(1500);
 const over=await p.evaluate(()=>window._tdWarnLast.res.sections.find(s=>s.id==='over').count);ck('chuyển "hôm nay" 22/10 ⇒ quá hạn nhiều hơn theo ngày dữ liệu',over>1,over);
 await p.evaluate(()=>tdToggleDataDate());await p.waitForTimeout(800);
 // CSV
 await p.evaluate(()=>showPage('canhbao'));await p.waitForTimeout(1500);
 const dl=p.waitForEvent('download');await p.evaluate(()=>tdWarnCsv('d7'));const d=await dl;const path=E.WORK+'/cb_d7.csv';await d.saveAs(path);const lines=fs.readFileSync(path,'utf8').split('\n').filter(Boolean);
 ck('CSV đến hạn ≤7 ngày: 50 dòng + tiêu đề',lines.length===51&&/ma,ten,sohd,due,days,duno,cbtd/.test(lines[0].replace('﻿','')),[lines.length,lines[0]]);
 ck('không pageerror',errs.length===0,errs);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
