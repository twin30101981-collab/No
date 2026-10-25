const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');const fs=require('fs');
const D=E.DATA+'/';const files=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
 p.on('dialog',d=>d.accept());await p.goto(E.APP_URL,{waitUntil:'load'});await p.waitForTimeout(6000);
 for(const f of files){await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});
  await p.setInputFiles('#import-file',D+f);
  for(let i=0;i<60;i++){await p.waitForTimeout(1000);const n=await p.evaluate(()=>{try{return pendingImportRows?pendingImportRows.length:0}catch(e){return 0}});if(n)break;}
  const rows=await p.evaluate(()=>pendingImportRows);fs.writeFileSync(E.ROWS+'/rows_'+f.replace(/\W/g,'_')+'.json',JSON.stringify(rows));console.log(f,rows&&rows.length);}
 await b.close();})();
