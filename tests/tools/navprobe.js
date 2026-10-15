const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true})).newPage();
await p.route(/^https?:/,r=>r.abort()); await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(5000);
const vis=`el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>4&&r.height>4&&s.visibility!=='hidden'&&s.display!=='none'&&s.opacity!=='0'}`;
const info=await p.evaluate((vs)=>{const vis=eval(vs);const T=e=>(e.innerText||e.title||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,40);
 const btns=[...document.querySelectorAll('button,a,[role=tab],[role=button]')].filter(vis).map(e=>{const r=e.getBoundingClientRect();return {t:T(e),title:e.title||e.getAttribute('aria-label')||'',id:e.id,cls:String(e.className).slice(0,40),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
 const fixed=[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);return (s.position==='fixed'||s.position==='sticky')&&vis(e)}).map(e=>{const r=e.getBoundingClientRect();return {id:e.id,cls:String(e.className).slice(0,40),z:getComputedStyle(e).zIndex,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
 const tabs=[...document.querySelectorAll('.tab-btn,[data-tab],.tabs button')].map(e=>T(e)).filter(Boolean);
 const small=btns.filter(b=>b.w<44||b.h<44).length;
 return {nBtn:btns.length,small,btns:btns.slice(0,80),fixed,tabs};},vis);
console.log(JSON.stringify(info,null,0));
await p.screenshot({path:process.argv[3]+'/asis_home.png'});
// click dock items
for (const name of ['Bản Đồ','Tọa Độ','Cạnh S','Thêm']){
  try{ const el=p.locator('button, [role=tab], a').filter({hasText:name}).last(); await el.click({timeout:3000}); await p.waitForTimeout(1200);
   await p.screenshot({path:process.argv[3]+'/asis_'+name.replace(/\s/g,'')+'.png'});
   if(name==='Thêm'){const t=await p.evaluate((vs)=>{const vis=eval(vs);return [...document.querySelectorAll('button,a,[role=menuitem]')].filter(vis).map(e=>(e.innerText||e.title||'').replace(/\s+/g,' ').trim().slice(0,40)).filter(Boolean)},vis);console.log('THEM_MENU',JSON.stringify(t));}
  }catch(e){console.log('ERR',name,String(e).slice(0,100))}
}
await b.close();})();
