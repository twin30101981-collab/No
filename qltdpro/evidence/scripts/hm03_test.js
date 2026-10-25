const { chromium } = require('playwright');const fs=require('fs');const W=process.argv[2],PORT=process.argv[3],TAG=process.argv[4];
const snap=p=>p.evaluate(()=>DATA.qltd.map(r=>[String(r[20]).trim(),r[8],!!r._rateManual]));
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1600,height:900}});const p=await ctx.newPage();const errs=[];
 p.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 const load=async()=>{await p.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await p.waitForTimeout(9000)};
 const imp=async f=>{await p.setInputFiles('#import-file',`${W}/data_private/${f}`);await p.waitForTimeout(14000);await p.evaluate(()=>doImport());await p.waitForTimeout(1500);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(7000)};
 const out={};
 await load();await imp('30.06.2026.XLS');await load();           // kỳ cũ đã lưu
 await imp('20.10.2026.XLS');out.inSession=await snap(p);        // kỳ mới
 await load();out.reload1=await snap(p);
 // sửa tay 5 khoản rồi lưu
 const edited=await p.evaluate(()=>{const ids=[];for(let i=0;i<5;i++){const r=DATA.qltd[i*300];r[8]=7.77;r._rateManual=true;ids.push(String(r[20]).trim())}return ids});
 await p.evaluate(()=>saveData(true));await p.waitForTimeout(3000);
 await load();out.reload2=await snap(p);await load();out.reload3=await snap(p);
 out.edited=edited;out.errs=[...new Set(errs)];
 fs.writeFileSync(`${W}/data_private/hm03_${TAG}.json`,JSON.stringify(out));console.log(TAG,'done',Object.keys(out).map(k=>k+':'+(out[k].length||0)).join(' '),JSON.stringify(out.errs));await b.close();})();
