const { chromium } = require('playwright');const fs=require('fs');const W=process.argv[2];const PORT=process.argv[3];
(async()=>{const b=await chromium.launch();const out={};
 for(const [name,w,h] of [['1920',1920,1080],['1366',1366,768]]){
  const p=await (await b.newContext({viewport:{width:w,height:h}})).newPage();const errs=[];
  p.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,160)));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160))});
  p.on('dialog',d=>{errs.push('dialog: '+d.message().slice(0,140).replace(/\n/g,' | '));d.accept()});
  await p.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await p.waitForTimeout(7000);
  const r={xlsx:await p.evaluate(()=>typeof XLSX==='object'?XLSX.version:typeof XLSX)};
  // export roundtrip
  r.exportOK=await p.evaluate(()=>{try{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['a','b'],[1,'Việt']]),'S');const u=XLSX.write(wb,{type:'array',bookType:'xlsx'});const back=XLSX.read(u,{type:'array'});return back.Sheets.S.B2.v==='Việt'}catch(e){return 'ERR '+e.message}});
  if(name==='1920'){
   for(const f of ['20.10.2026.XLS','30.06.2026.XLS']){
    await p.setInputFiles('#import-file',`${W}/data_private/${f}`);await p.waitForTimeout(15000);
    r[f]=await p.evaluate(()=>{let rows=null;try{rows=pendingImportRows}catch(e){};if(!rows)return null;
      let sum=0;const rate={};const ks=new Set();rows.forEach(x=>{sum+=Number(x[11])||0;rate[x[8]]=(rate[x[8]]||0)+1;if(Number(x[11])>0)ks.add(x[0])});
      return {n:rows.length,sum,kh:ks.size,rateTop:Object.entries(rate).sort((a,b)=>b[1]-a[1]).slice(0,5),pairs:rows.map(x=>[x[20],x[8]])}});
   }
  }
  await p.screenshot({path:`${W}/evidence/hm01_${name}.png`});
  r.errs=[...new Set(errs)];out[name]=r;await p.context().close();
 }
 fs.writeFileSync(`${W}/data_private/hm01.json`,JSON.stringify(out));
 for(const k in out){for(const f of ['20.10.2026.XLS','30.06.2026.XLS'])if(out[k][f])delete out[k][f].pairs}
 console.log(JSON.stringify(out,null,1));await b.close();})();
