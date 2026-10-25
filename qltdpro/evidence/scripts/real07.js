const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});await p.waitForTimeout(6000);
 for(const f of ['30.06.2026.XLS','20.10.2026.XLS','31.05.2026.xlsx']){
  await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});
  await p.setInputFiles('#import-file','/tmp/claude-0/real/data/'+f);
  for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
  await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(5000);
  const s=await p.evaluate(()=>({cfd:localStorage.getItem('_currentFileDate'),chip:document.getElementById('td-datechip').textContent,n:DATA.qltd.length,eff:TD.dataDate.key(),snaps:_archiveReportList.filter(x=>x.autoDaily).map(x=>x.dayKey+':'+x.customers+'KH')}));
  console.log(f,JSON.stringify(s));}
 const od=await p.evaluate(()=>{const o=scanNotifications(DATA.qltd,todayMidnight());const a=Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.length]));showPage('dashboard');renderDashboard();return a});
 console.log('quá hạn/đến hạn theo ngày dữ liệu 31/05:',JSON.stringify(od));
 await p.evaluate(()=>tdToggleDataDate());await p.waitForTimeout(1500);
 console.log('theo hôm nay:',JSON.stringify(await p.evaluate(()=>Object.fromEntries(Object.entries(scanNotifications(DATA.qltd,todayMidnight())).map(([k,v])=>[k,v.length])))));
 console.log('errs',JSON.stringify([...new Set(errs)]));await b.close()})();
