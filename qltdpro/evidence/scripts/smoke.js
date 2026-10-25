const { chromium } = require('playwright');
const fs=require('fs');
const OUT=process.argv[2];
(async()=>{
  const b=await chromium.launch();
  const res={};
  const vps=[['1920',1920,1080],['1366',1366,768],['390',390,844]];
  for(const [n,w,h] of vps){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,colorScheme:'light'});
    const p=await ctx.newPage(); const errs=[];
    p.on('pageerror',e=>errs.push('pageerror: '+String(e.message).slice(0,200)));
    p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200))});
    p.on('requestfailed',r=>errs.push('reqfail: '+r.url().slice(0,120)));
    const t0=Date.now();
    await p.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load',timeout:120000});
    const tLoad=Date.now()-t0;
    await p.waitForTimeout(8000);
    await p.addStyleTag({content:'td,tbody,.kh-name,li{filter:blur(5px)!important}'});
    const info=await p.evaluate(()=>{
      const tb=document.querySelector('.topbar,#topbar,header');
      const r={XLSX:typeof window.XLSX, TD_BACKUP:typeof window.TD_BACKUP, docWidth:document.documentElement.scrollWidth, vw:innerWidth};
      if(tb){r.topbarScroll=tb.scrollWidth;r.topbarClient=tb.clientWidth;
        const btns=[...tb.querySelectorAll('button')].filter(x=>x.offsetParent);r.topbarBtns=btns.length;
        r.btnOutside=btns.filter(x=>x.getBoundingClientRect().right>innerWidth+1).length;}
      r.domNodes=document.getElementsByTagName('*').length;
      return r;});
    const pages={};
    for(const pg of ['dashboard','qltd','tsbd','giadat','baocao']){
      try{ await p.evaluate(x=>window.showPage(x),pg); await p.waitForTimeout(1500);
        const m=await p.evaluate(()=>{const a=document.querySelector('.page.active');const t=a&&a.querySelector('table');return {tableW:t?t.scrollWidth:0,docW:document.documentElement.scrollWidth,title:(document.querySelector('#page-title')||{}).textContent}});
        pages[pg]=m;
        await p.screenshot({path:`${OUT}/${n}_${pg}.png`});
      }catch(e){pages[pg]='ERR '+e.message.slice(0,100)}
    }
    // page switch timing
    const sw=await p.evaluate(async()=>{const t=performance.now();for(let i=0;i<5;i++){window.showPage('qltd');window.showPage('dashboard');}return performance.now()-t});
    res[n]={tLoad,info,pages,switch10ms:Math.round(sw),errs:[...new Set(errs)].slice(0,40)};
    await ctx.close();
  }
  // dark mode check
  const ctx=await b.newContext({viewport:{width:1920,height:1080},colorScheme:'dark'});const p=await ctx.newPage();
  await p.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});await p.waitForTimeout(6000);
  await p.addStyleTag({content:'td,tbody,li{filter:blur(5px)!important}'});
  await p.screenshot({path:`${OUT}/1920_dark_dashboard.png`});
  await b.close();
  fs.writeFileSync(`${OUT}/../smoke.json`,JSON.stringify(res,null,1));
  console.log(JSON.stringify(res,null,1));
})();
