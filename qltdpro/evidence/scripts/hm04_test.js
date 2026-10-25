const { chromium } = require('playwright');const fs=require('fs');const W=process.argv[2],PORT=process.argv[3],TAG=process.argv[4];
const TMP=`${W}/tmp04`;
const synth=n=>`Array.from({length:${n}},(_,i)=>['3201'+String(1000000000+i),'KH Mau '+i,'APPR'+i,'01/01/2026','01/01/2026',1e9,'01/01/2026','01/01/2027',9,1e9,1e6,1e9+i,'CBTD A','TK211','Dia chi',' ',0,'Hoi So','Nhóm 1','APPR'+i,'LDS'+i,'','','','01/01/2027','','' ])`;
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({acceptDownloads:true,viewport:{width:1400,height:800}});const p=await ctx.newPage();
 const dialogs=[];let dialogMode='accept';p.on('dialog',d=>{dialogs.push(d.message().slice(0,90));dialogMode==='dismiss'&&/checksum/i.test(d.message())?d.dismiss():d.accept()});
 const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
 const load=async()=>{await p.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await p.waitForTimeout(8000)};
 const idbInfo=()=>p.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('QLTDProDB');q.onsuccess=e=>r(e.target.result)});
   const st=db.transaction('chunks').objectStore('chunks');const keys=await new Promise(r=>{const q=st.getAllKeys();q.onsuccess=()=>r(q.result)});
   const meta=await new Promise(r=>{const q=st.get('qltd__meta');q.onsuccess=()=>r(q.result)});
   const c1=await new Promise(r=>{const q=st.get('qltd__1');q.onsuccess=()=>r(typeof q.result==='string'?q.result.slice(0,12):q.result)});
   return {qkeys:keys.filter(k=>/^qltd__/.test(k)).sort(),metaLen:meta&&meta.length,chunk1:c1}});
 const corrupt=()=>p.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('QLTDProDB');q.onsuccess=e=>r(e.target.result)});
   await new Promise(r=>{const tx=db.transaction('chunks','readwrite');tx.objectStore('chunks').put('@@garbage@@','qltd__1');tx.oncomplete=r})});
 const out={};
 await load();
 // T1 chunk thừa
 await p.evaluate(`(async()=>{DATA.qltd=${synth(5000)};await saveData(true)})()`);
 out.t1_after5000=await idbInfo();
 await p.evaluate(`(async()=>{DATA.qltd=${synth(1000)};await saveData(true)})()`);
 out.t1_after1000=await idbInfo();
 // T3 meta
 await p.evaluate(`(async()=>{DATA.qltd=${synth(5000)};DATA.hosovay={h1:{ten:'HS thu'}};DATA.chlmStatus={a:{s:1}};DATA.hdvCurrentPeriod='2026-10';await saveData(true)})()`);
 await load();
 out.t3=await p.evaluate(()=>({n:DATA.qltd.length,hosovay:JSON.stringify(DATA.hosovay||null),chlm:JSON.stringify(DATA.chlmStatus||null),per:DATA.hdvCurrentPeriod||''}));
 // sao lưu để thử khôi phục
 const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>exportBackup())]);await dl.saveAs(`${TMP}/bk_${TAG}.json`);
 const bk=JSON.parse(fs.readFileSync(`${TMP}/bk_${TAG}.json`,'utf8'));out.t4_backup_fields={schema:bk.schemaVersion||bk.v,hosovay:'hosovay' in bk,chk:!!bk.chk};
 // T2a: chunk hỏng, LocalStorage còn
 await corrupt();await load();await p.waitForTimeout(11000);
 out.t2a=await p.evaluate(()=>({n:DATA.qltd.length,flag:JSON.stringify(window.__storageCorrupt||null),banner:!!document.getElementById('storage-corrupt-banner')}));
 out.t2a_idb=await idbInfo();
 // T2b: chunk hỏng + mất bản LocalStorage
 await p.evaluate(`(async()=>{DATA.qltd=${synth(5000)};await saveData(true)})()`);
 await corrupt();await p.evaluate(()=>{Object.keys(localStorage).forEach(k=>{if(/qltd/i.test(k)&&k!=='ux_zoom')localStorage.removeItem(k)})});
 await load();await p.waitForTimeout(11000);
 out.t2b=await p.evaluate(()=>({n:DATA.qltd.length,flag:JSON.stringify(window.__storageCorrupt||null).slice(0,80),banner:!!document.getElementById('storage-corrupt-banner')}));
 out.t2b_idb=await idbInfo();
 // khôi phục từ sao lưu
 const fc=p.waitForEvent('filechooser');await p.evaluate(()=>importBackup());(await fc).setFiles(`${TMP}/bk_${TAG}.json`);await p.waitForTimeout(6000);
 await load();
 out.t4_restore=await p.evaluate(()=>({n:DATA.qltd.length,hosovay:JSON.stringify(DATA.hosovay||null),chlm:JSON.stringify(DATA.chlmStatus||null),flag:!!window.__storageCorrupt}));
 // T4b: sao lưu bị sửa
 if(bk.chk){const t=JSON.parse(JSON.stringify(bk));t.qltd[0][1]='SUA TRAI PHEP';fs.writeFileSync(`${TMP}/tamper_${TAG}.json`,JSON.stringify(t));
  dialogMode='dismiss';dialogs.length=0;const fc2=p.waitForEvent('filechooser');await p.evaluate(()=>importBackup());(await fc2).setFiles(`${TMP}/tamper_${TAG}.json`);await p.waitForTimeout(3000);
  out.t4_tamper={asked:dialogs.some(m=>/checksum/i.test(m)),name0:await p.evaluate(()=>DATA.qltd[0][1])};}
 out.errs=[...new Set(errs)];
 console.log(TAG,JSON.stringify(out,null,1));await b.close();})();
