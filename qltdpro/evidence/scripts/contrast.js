const { chromium } = require('playwright');
const FILE=process.argv[2],MODE=process.argv[3]||'light';
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1920,height:1080},colorScheme:MODE==='dark'?'dark':'light'})).newPage();p.on('dialog',d=>d.accept());
 await p.goto('file://'+FILE,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 if(MODE==='dark')await p.evaluate(()=>{document.documentElement.setAttribute('data-tdup-theme','dark')});
 const out={};
 for(const pg of ['dashboard','qltd','tsbd','giadat','doisoat']){await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(1800);
  out[pg]=await p.evaluate(()=>{
   const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(',').map(x=>parseFloat(x));return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1}};
   const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
   const bgOf=el=>{let e=el;let acc=null;const layers=[];while(e&&e.nodeType===1){const c=parse(getComputedStyle(e).backgroundColor);if(c&&c.a>0){layers.push(c);if(c.a>=1)break}e=e.parentElement}
    let base={r:255,g:255,b:255};if(!layers.length||layers[layers.length-1].a<1){base=getComputedStyle(document.body).backgroundColor?parse(getComputedStyle(document.body).backgroundColor):base;if(!base||base.a===0)base={r:255,g:255,b:255}}else{base=layers.pop()}
    for(let i=layers.length-1;i>=0;i--){const l=layers[i];base={r:l.r*l.a+base.r*(1-l.a),g:l.g*l.a+base.g*(1-l.a),b:l.b*l.a+base.b*(1-l.a)}}return base};
   const act=document.querySelector('.page.active');const res={n:0,bad:0,worst:[]};
   const w=document.createTreeWalker(act,NodeFilter.SHOW_TEXT);let n;const seen=new Set();
   while(n=w.nextNode()){const t=n.textContent.trim();if(!t)continue;const el=n.parentElement;if(!el||seen.has(el))continue;seen.add(el);const r=el.getBoundingClientRect();if(r.width<2||r.height<2||el.offsetParent===null)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.opacity==='0')continue;
    const fg=parse(cs.color);const bg=bgOf(el);if(!fg)continue;const a=fg.a;const f2={r:fg.r*a+bg.r*(1-a),g:fg.g*a+bg.g*(1-a),b:fg.b*a+bg.b*(1-a)};const L1=lum(f2),L2=lum(bg);const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);res.n++;
    const large=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.66&&parseInt(cs.fontWeight)>=700);if(ratio<(large?3:4.5)){res.bad++;if(res.worst.length<6)res.worst.push([ratio.toFixed(2),(el.className||el.tagName).toString().slice(0,30),t.slice(0,18),cs.color,'on rgb('+Math.round(bg.r)+','+Math.round(bg.g)+','+Math.round(bg.b)+')'])}}
   return res});}
 console.log(MODE,JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,{n:v.n,bad:v.bad,pct:(100*v.bad/v.n).toFixed(1)+'%'}]))));
 if(process.argv[4])Object.entries(out).forEach(([k,v])=>console.log(' ',k,JSON.stringify(v.worst)));
 await b.close()})();
