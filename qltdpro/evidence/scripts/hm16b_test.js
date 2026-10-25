const { chromium } = require('playwright');const fs=require('fs');const OLD=process.argv[2],NEW=process.argv[3];
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,400)));
 async function run(file){const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
  await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(6000);
  const r=await p.evaluate(()=>{
   const probe=document.createElement('div');probe.style.cssText='position:fixed;display:none';document.body.appendChild(probe);
   const css=[];const walk=(rules)=>{for(const r of rules){if(r.cssRules&&!r.selectorText)walk(r.cssRules);if(r.style&&r.style.zIndex){probe.style.zIndex=r.style.zIndex;css.push([r.selectorText||'',getComputedStyle(probe).zIndex])}}};
   for(const sh of document.styleSheets){try{walk(sh.cssRules)}catch(e){}}
   probe.remove();
   const dom=[...document.querySelectorAll('body *')].map(e=>[e.id||e.className&&String(e.className).slice(0,30)||e.tagName,getComputedStyle(e).zIndex]).filter(x=>x[1]!=='auto');
   const lit=(document.documentElement.outerHTML.match(/z-index\s*:\s*\d{3,}/gi)||[]).length;
   return {css,dom,lit,root:getComputedStyle(document.documentElement).getPropertyValue('--z-8').trim()}});
  await p.close();return {r,errs};}
 const o=await run(OLD),n=await run(NEW);
 const sign=(a,b)=>Math.sign(a-b);
 const cmp=(A,B,label)=>{ if(A.length===B.length){const keep=A.map((x,i)=>x[1]!=='auto'&&B[i][1]!=='auto');A=A.filter((x,i)=>keep[i]);B=B.filter((x,i)=>keep[i]);} if(A.length!==B.length){ck(label+' cùng số quy tắc',false,[A.length,B.length]);return}
  let bad=0,pairs=0;const ex=[];const a=A.map(x=>+x[1]),c=B.map(x=>+x[1]);
  for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){pairs++;if(sign(a[i],a[j])!==sign(c[i],c[j])){bad++;if(ex.length<3)ex.push([A[i],A[j],B[i],B[j]])}}
  ck(label+': '+a.length+' mục, '+pairs+' cặp, thứ tự trên/dưới/bằng giữ nguyên',bad===0&&a.every(x=>!isNaN(x)),ex)};
 console.log('quy tắc CSS có z-index:',o.r.css.length,'; phần tử DOM có z-index số:',o.r.dom.length,'; còn literal ≥3 chữ số:',o.r.lit,'→',n.r.lit);
 cmp(o.r.css,n.r.css,'CSS');
 const sd=new Set(n.r.css.map(x=>x[1]).filter(v=>+v>=100));console.log('giá trị z-index ≥100 phân biệt sau:',sd.size);
 ck('DOM: phần tử có z-index số giữ thứ tự',(()=>{if(o.r.dom.length!==n.r.dom.length)return false;const a=o.r.dom.map(x=>+x[1]),c=n.r.dom.map(x=>+x[1]);for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(sign(a[i],a[j])!==sign(c[i],c[j]))return false;return true})(),[o.r.dom.length,n.r.dom.length]);
 ck('token --z-8 có trong :root',n.r.root==='100000'&&!o.r.root,n.r.root);
 ck('không còn literal z-index ≥100 trong DOM',n.r.lit===0,n.r.lit);
 ck('không pageerror',n.errs.length===0,n.errs);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
