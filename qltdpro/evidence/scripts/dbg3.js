const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();p.on('dialog',d=>d.accept());await p.goto('file:///tmp/claude-0/work1/app_hm19.html',{waitUntil:'load'});await p.waitForTimeout(5000);
await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(2500);
console.log(JSON.stringify(await p.evaluate(()=>{const t=document.getElementById('table-qltd');const out=[];let e=t;while(e&&e.id!=='page-qltd'){const cs=getComputedStyle(e);out.push(e.tagName+'#'+e.id+'.'+e.className.toString().slice(0,25)+' w='+Math.round(e.getBoundingClientRect().width)+' sw='+e.scrollWidth+' disp='+cs.display+' minw='+cs.minWidth+' ow='+cs.overflowX);e=e.parentElement}return out})).replace(/","/g,'"\n"'));await b.close()})();
