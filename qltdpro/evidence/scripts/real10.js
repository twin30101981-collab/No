const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto(E.APP_URL,{waitUntil:'load'});await p.waitForTimeout(6000);
 await p.setInputFiles('#import-file',E.DATA+'/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(1500);
 const t0=Date.now();
 await p.setInputFiles('#tsbd-file',E.DATA+'/Sao ke tai san bao dam 20.10.2026.XLS');
 for(let i=0;i<120;i++){await p.waitForTimeout(1000);const n=await p.evaluate(()=>{try{return (TSBD.rows||[]).length}catch(e){return 0}});if(n)break;}
 await p.waitForTimeout(4000);console.log('import TSBĐ ms',Date.now()-t0);
 const r=await p.evaluate(()=>{const rows=TSBD.rows;const S=TD.tsbd.summarize(rows);const txt=document.getElementById('tsbd-sum').innerText.replace(/\s+/g,' ');
  const dn={};DATA.qltd.forEach(q=>{const k=TSBD_mdig(q[0]);dn[k]=(dn[k]||0)+(+q[11]||0)});const C=TD.tsbd.coverage(rows,dn,TSBD_mdig);
  return {rows:rows.length,unique:S.unique,dupRows:S.dupRows,vnd:Math.round(S.giaTriTS_VND),raw:Math.round(S.giaTriTS_raw),fx:S.fx,hold:S.hold,khCon:C.khCon,khKhongTS:C.khKhongTS.length,khCoTS:C.khCoTS,tyLePhu:C.tyLePhu,duoi100:C.duoi100,kpiText:txt.slice(0,700)}});
 console.log(JSON.stringify(r,null,1));
 // form: mở hồ sơ có giá trị TSBĐ thủ công khác menu ⇒ không ghi đè
 const f=await p.evaluate(async()=>{
  const i=DATA.qltd.findIndex(q=>{const m=TD.tsbd.byKH(TSBD.rows,TSBD_mdig).get(TSBD_mdig(q[0]));return m&&m.value>0});
  const menu=TD.tsbd.byKH(TSBD.rows,TSBD_mdig).get(TSBD_mdig(DATA.qltd[i][0])).value;
  DATA.qltd[i][27]=123456789;const before=JSON.stringify(DATA.qltd[i]);
  editRow(i);await new Promise(r=>setTimeout(r,1500));
  const form=document.getElementById('modal-form');const gt=form&&form.querySelector('[name="tsbdGiaTri"]');
  const out={i,menu:Math.round(menu),fieldAfterOpen:gt&&gt.value,note:(document.getElementById('tsbd-sync-note')||{}).textContent,dataSame:JSON.stringify(DATA.qltd[i])===before};
  DATA.qltd[i][27]=0;editRow(i);await new Promise(r=>setTimeout(r,1500));const g2=document.getElementById('modal-form').querySelector('[name="tsbdGiaTri"]');out.emptyThenFilled=g2&&g2.value;return out});
 console.log('form',JSON.stringify(f));
 console.log('errs',JSON.stringify([...new Set(errs)]));await b.close()})();
