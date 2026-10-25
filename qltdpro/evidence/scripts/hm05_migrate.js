const { chromium } = require('playwright');const fs=require('fs');const W=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();p.on('dialog',d=>d.accept());const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
 await p.goto('http://127.0.0.1:8792/index.html',{waitUntil:'load'});await p.waitForTimeout(8000);
 // người dùng cũ: có 8 khoản seed + 1 khoản tự dán
 await p.evaluate(()=>{TD_PASTDUE.map['USER|X']={ten:'KH tu dan',source:'paste',soNgayQH:4};TD_PASTDUE.save()});
 const before=await p.evaluate(()=>Object.keys(TD_PASTDUE.map).length);
 fs.copyFileSync(`${W}/work/index.html`,`${W}/site_before/index.html`);
 await p.goto('http://127.0.0.1:8792/index.html',{waitUntil:'load'});await p.waitForTimeout(8000);
 const after=await p.evaluate(()=>({n:Object.keys(TD_PASTDUE.map).length,keys:Object.keys(TD_PASTDUE.map),srcs:Object.values(TD_PASTDUE.map).map(x=>x.source)}));
 console.log(JSON.stringify({before,after,errs}));await b.close();})();
