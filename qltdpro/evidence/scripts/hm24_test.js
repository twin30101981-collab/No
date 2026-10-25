const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');const fs=require('fs');
const F=process.argv[2]||(E.APP?'file://'+E.APP:'file://'+E.WORK+'/app_hm24.html');
const files=['31.12.2025.xlsx','31.01.2026.xlsx','28.02.2026.xlsx','31.03.2026.xlsx','30.04.2026.xlsx','31.05.2026.xlsx','30.06.2026.XLS','31.07.2026.XLS','31.08.2026.XLS','30.09.2026.XLS','20.10.2026.XLS'];
const ind=JSON.parse(fs.readFileSync(E.WORK+'/trend_indep.json','utf8'));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:900},acceptDownloads:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 await p.goto(F,{waitUntil:'load'});await p.waitForTimeout(6000);
 await p.evaluate(()=>showPage('xuhuong'));await p.waitForTimeout(800);ck('chưa có mốc: thông báo cần ≥2 kỳ',/Cần ≥ 2 kỳ/.test(await p.evaluate(()=>document.getElementById('trend-body').innerText)));
 const t0=Date.now();
 for(const f of files){await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});await p.setInputFiles('#import-file',E.DATA+'/'+f);
  for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
  await p.evaluate(()=>doImport());await p.waitForTimeout(800);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(3500);console.log('đã nhập',f,Math.round((Date.now()-t0)/1000)+'s');}
 await p.evaluate(()=>showPage('xuhuong'));await p.waitForTimeout(3000);
 const P=await p.evaluate(()=>window._tdTrendLast.P.map(x=>({k:x.key,duno:Math.round(x.totals.duno),kh:x.totals.kh,hs:x.totals.hs})));
 ck('11 kỳ',P.length===11,P.map(x=>x.k));
 files.forEach(f=>{const d=f.replace(/\.(xlsx|XLS)$/i,'').replace(/\./g,'/');const m=P.find(x=>x.k===d);ck('kỳ '+d+': dư nợ/KH/khoản khớp tính độc lập (Python)',m&&m.duno===ind[f].duno&&m.kh===ind[f].kh&&m.hs===ind[f].hs,[m,ind[f]]);});
 const ch=await p.evaluate(()=>({poly:document.querySelectorAll('#trend-body svg polyline').length,pts:document.querySelectorAll('#trend-body svg circle').length,rows:document.querySelectorAll('#trend-body tbody tr').length,txt:document.getElementById('trend-body').innerText.slice(0,200).replace(/\s+/g,' ')}));
 ck('biểu đồ: 1 đường, 11 điểm, bảng 11 dòng',ch.poly===1&&ch.pts===11&&ch.rows===11,ch);
 for(const by of ['nhom','pb','cbtd','loai']){await p.evaluate(v=>{const s=document.getElementById('trend-by');s.value=v;s.dispatchEvent(new Event('change'))},by);await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{const L=window._tdTrendLast;const S=L.S;const sums=L.P.map((pp,i)=>S.series.reduce((a,s)=>a+s.values[i],0)-pp.totals.duno);return {n:S.series.length,maxDiff:Math.max(...sums.map(Math.abs)),poly:document.querySelectorAll('#trend-body svg polyline').length}});
  ck('chia theo '+by+': Σ các đường = tổng dư nợ mọi kỳ, số đường vẽ = số chuỗi',r.maxDiff<1&&r.poly===r.n&&r.n>=1,r);}
 await p.evaluate(()=>{const m=document.getElementById('trend-metric');m.value='kh';m.dispatchEvent(new Event('change'));const s=document.getElementById('trend-by');s.value='total';s.dispatchEvent(new Event('change'))});await p.waitForTimeout(900);
 const kh=await p.evaluate(()=>window._tdTrendLast.S.series[0].values.join());ck('chỉ tiêu Số KH khớp Python',kh===files.map(f=>ind[f].kh).join(),kh);
 const dl=p.waitForEvent('download');await p.evaluate(()=>tdTrendCsv());const d=await dl;const path=E.WORK+'/xh.csv';await d.saveAs(path);const lines=fs.readFileSync(path,'utf8').split('\n').filter(Boolean);ck('CSV: tiêu đề + 11 kỳ',lines.length===12&&/^﻿?Kỳ,Tổng/.test(lines[0]),[lines.length,lines[0]]);
 // sau tải lại, mốc còn
 await p.reload({waitUntil:'load'});await p.waitForTimeout(9000);await p.evaluate(()=>showPage('xuhuong'));await p.waitForTimeout(3000);
 const again=await p.evaluate(()=>window._tdTrendLast.P.length);ck('sau tải lại vẫn đủ 11 kỳ',again===11,again);
 ck('không pageerror',errs.length===0,errs);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
