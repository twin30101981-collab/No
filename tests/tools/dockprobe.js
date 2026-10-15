const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true})).newPage();
await p.route(/^https?:/,r=>r.abort()); await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(5000);
const hit=await p.evaluate(()=>[...document.querySelectorAll('.lg103-dbtn')].map(e=>{const r=e.getBoundingClientRect();const pts=[[r.x+r.width/2,r.y+r.height/2],[r.x+r.width/2,r.y+10]];return {t:e.innerText.replace(/\s+/g,' ').trim(),hits:pts.map(([x,y])=>{const h=document.elementFromPoint(x,y);return h===e||e.contains(h)?'OK':(h.id||h.className||h.tagName)})}}));
console.log('HIT',JSON.stringify(hit));
const names=['Bản Đồ','Tọa Độ','Cạnh S','Thêm'];
for(const n of names){ await p.evaluate(n=>{const e=[...document.querySelectorAll('.lg103-dbtn')].find(x=>x.innerText.includes(n)); e&&e.click()},n); await p.waitForTimeout(1500);
 await p.screenshot({path:process.argv[3]+'/asis_'+n.replace(/\s/g,'')+'.png'});
 if(n==='Thêm'){const t=await p.evaluate(()=>[...document.querySelectorAll('button,a,[role=menuitem]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>4&&r.height>4&&r.y<844&&r.y>0}).map(e=>(e.innerText||e.title||'').replace(/\s+/g,' ').trim().slice(0,40)).filter(Boolean));console.log('THEM',JSON.stringify(t));}
 if(n==='Bản Đồ'){const t=await p.evaluate(()=>[...document.querySelectorAll('button,a,.leaflet-control a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>4&&r.height>4&&r.y<844&&r.y>0}).map(e=>{const r=e.getBoundingClientRect();return (e.innerText||e.title||'').replace(/\s+/g,' ').trim().slice(0,30)+'@'+Math.round(r.x)+','+Math.round(r.y)+' '+Math.round(r.width)+'x'+Math.round(r.height)}));console.log('MAP',JSON.stringify(t));}
}
// tools sheet & settings sheet
for (const id of ['lg62-btn-set','lg62-btn-tool']){ await p.evaluate(id=>{const e=document.getElementById(id)||document.querySelector('.'+id); e&&e.click()},id); await p.waitForTimeout(1200);
 const t=await p.evaluate(()=>[...document.querySelectorAll('.lg62-sheet button, .lg62-sheet a, .lg62-sheet h3, .lg62-sheet h4')].filter(e=>{const r=e.getBoundingClientRect();return r.width>4&&r.height>4}).map(e=>(e.innerText||e.title||'').replace(/\s+/g,' ').trim().slice(0,40)).filter(Boolean));
 console.log(id,JSON.stringify(t)); await p.screenshot({path:process.argv[3]+'/asis_'+id+'.png'}); await p.keyboard.press('Escape'); await p.waitForTimeout(500);}
await b.close();})();
