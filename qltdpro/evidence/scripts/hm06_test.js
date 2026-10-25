const { chromium } = require('playwright');const fs=require('fs');const W=process.argv[2],PORT=process.argv[3],TAG=process.argv[4];
const FILES=['31.05.2026.xlsx','31.12.2025.xlsx','20.10.2026.XLS','30.06.2026.XLS'];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,140)));p.on('dialog',d=>d.accept());
 await p.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await p.waitForTimeout(8000);
 const out={};
 for(const f of FILES){
  await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});
  await p.setInputFiles('#import-file',`${W}/data_private/${f}`);await p.waitForTimeout(14000);
  out[f]=await p.evaluate(()=>pendingImportRows.map(r=>[r[20],r[3],r[6],r[7],r[23],r[24],r[25],r[26],r[8],r[11],r[18]]));
 }
 // nhập 20.10 đầy đủ rồi vẽ các trang có dùng ngày/số, kể cả khi có ngày sai/lạ
 await p.setInputFiles('#import-file',`${W}/data_private/20.10.2026.XLS`);await p.waitForTimeout(14000);await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(6000);
 await p.evaluate(()=>{DATA.qltd[0][7]='31/02/2026';DATA.qltd[1][7]='2026-02-31';DATA.qltd[2][7]='';DATA.qltd[3][7]='abc';DATA.qltd[4][7]='2026-05-31'});
 for(const pg of ['dashboard','qltd','kd','td','denhan','laidong','chlm','tranop','phidv','khmoi','baocao','tsbd']){try{await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(900)}catch(e){errs.push('showPage '+pg+': '+e.message.slice(0,80))}}
 out.dash=await p.evaluate(()=>{showPage('dashboard');return (document.querySelector('#page-dashboard').innerText.match(/(\d[\d.]*) hồ sơ dư nợ thực tế · (\d[\d.]*) khách hàng thực tế/)||[]).slice(1,3)});
 out.denhanRows=await p.evaluate(()=>{showPage('denhan');return document.querySelectorAll('#page-denhan tbody tr').length});
 out.errs=[...new Set(errs)];fs.writeFileSync(`${W}/data_private/hm06_${TAG}.json`,JSON.stringify(out));console.log(TAG,'errs',JSON.stringify(out.errs),'dash',out.dash,'denhanRows',out.denhanRows);await b.close();})();
