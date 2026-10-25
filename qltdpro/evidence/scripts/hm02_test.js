const { chromium } = require('playwright');const fs=require('fs');const W=process.argv[2];const PORT=process.argv[3];const TAG=process.argv[4];
const FILES=['synthetic.xlsx','31.05.2026.xlsx','31.12.2025.xlsx','20.10.2026.XLS'];
(async()=>{const b=await chromium.launch();const out={};
 for(const mode of ['sheetjs','fallback']){
  if(mode==='fallback'&&/\.XLS$/i.test('x')){}
  const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();const errs=[];
  p.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,160)));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160))});
  p.on('dialog',d=>{errs.push('dialog: '+d.message().slice(0,120).replace(/\n/g,' | '));d.accept()});
  await p.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await p.waitForTimeout(7000);
  if(mode==='fallback') await p.evaluate(()=>{window.XLSX=undefined;window.TD_ensureVendors=undefined});
  out[mode]={};
  for(const f of FILES){
    if(mode==='fallback'&&/\.XLS$/i.test(f))continue;
    await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});
    const before=errs.length;
    await p.setInputFiles('#import-file',`${W}/data_private/${f}`);await p.waitForTimeout(f==='synthetic.xlsx'?3000:14000);
    out[mode][f]=await p.evaluate(()=>{let rows=null;try{rows=pendingImportRows}catch(e){};if(!rows)return null;
      return rows.map(x=>[x[20],x[8],x[11],x[18],x[6],x[7],x[3],x[0]])});
    out[mode][f+'_errs']=errs.slice(before);
  }
  out[mode].errs=[...new Set(errs)];await p.context().close();
 }
 fs.writeFileSync(`${W}/data_private/hm02_${TAG}.json`,JSON.stringify(out));
 for(const m in out)for(const f of FILES)if(out[m][f])console.log(TAG,m,f,'rows',out[m][f].length,'errs',JSON.stringify(out[m][f+'_errs']));
 await b.close();})();
