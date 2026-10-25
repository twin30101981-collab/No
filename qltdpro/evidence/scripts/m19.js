const { chromium } = require('playwright');
const FILE=process.argv[2];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const p=await ctx.newPage();p.on('dialog',d=>d.accept());
 await p.goto('file://'+FILE,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 const out={};
 for(const pg of ['dashboard','qltd','denhan','tsbd','giadat','doisoat','hsvv']){await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(1800);
  out[pg]=await p.evaluate(()=>{const tb=document.querySelector('.topbar');const small=[...document.querySelectorAll('.page.active button,.page.active a,.topbar button,.nav-item')].filter(e=>e.offsetParent!==null).map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&(r.height<32||r.width<32)).length;
   return {docW:document.documentElement.scrollWidth,vw:innerWidth,topbarH:Math.round(tb.getBoundingClientRect().height),smallTargets:small,tableOverflow:[...document.querySelectorAll('.page.active .table-wrap')].filter(w=>w.scrollWidth>w.clientWidth+2).length}});
  if(pg==='dashboard'||pg==='qltd'){await p.addStyleTag({content:'tbody td,.kh-name{filter:blur(5px)!important}'});await p.screenshot({path:'/tmp/claude-0/work1/m_'+pg+'.png'})}}
 console.log(JSON.stringify(out));await b.close()})();
