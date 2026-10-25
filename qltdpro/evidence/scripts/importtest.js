const { chromium } = require('playwright');
const fs=require('fs');const W=process.argv[2];
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1920,height:1080}});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));
 p.on('dialog',d=>{errs.push('dialog: '+d.message().slice(0,160).replace(/\n/g,' | '));d.accept()});
 await p.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});await p.waitForTimeout(6000);
 const out={};
 for(const f of ['31.05.2026.xlsx','20.10.2026.XLS']){
  await p.setInputFiles('#import-file',`${W}/data_private/${f}`);
  await p.waitForTimeout(12000);
  out[f]=await p.evaluate(()=>{
   let rows=null;try{rows=pendingImportRows}catch(e){}
   if(!rows) return {pending:null};
   const rate={};let sum=0,zero=0;const nh={};
   rows.forEach(r=>{const k=String(r[8]);rate[k]=(rate[k]||0)+1;sum+=Number(r[11])||0;if(!(Number(r[11])>0))zero++;nh[r[18]]=(nh[r[18]]||0)+1});
   const top=Object.entries(rate).sort((a,b)=>b[1]-a[1]).slice(0,6);
   return {n:rows.length,sum,zero,rateTop:top,nhom:nh,sample8:rows.slice(0,3).map(r=>[r[8],typeof r[8]])};
  });
 }
 // import the xlsx fully and read dashboard
 await p.setInputFiles('#import-file',`${W}/data_private/31.05.2026.xlsx`);await p.waitForTimeout(10000);
 try{await p.evaluate(()=>doImport());await p.waitForTimeout(1500);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(6000);}catch(e){errs.push('imp '+e.message.slice(0,120))}
 const after=async()=>p.evaluate(()=>{const d=DATA.qltd;const rate={};let s=0;d.forEach(r=>{rate[r[8]]=(rate[r[8]]||0)+1;s+=Number(r[11])||0});return {n:d.length,sum:s,rateTop:Object.entries(rate).sort((a,b)=>b[1]-a[1]).slice(0,5)}});
 out.afterImport=await after();
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(2000);
 out.dashText=(await p.evaluate(()=>{const t=document.querySelector('#page-dashboard');return t.innerText.slice(0,600)})).replace(/\n+/g,' | ');
 await p.reload({waitUntil:'load'});await p.waitForTimeout(9000);
 out.afterReload=await after();
 out.errs=[...new Set(errs)];
 fs.writeFileSync(`${W}/data_private/importtest.json`,JSON.stringify(out,null,1));
 // print without dashText (may contain names) 
 const {dashText,...rest}=out;console.log(JSON.stringify(rest,null,1));
 await b.close();
})();
