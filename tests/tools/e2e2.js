const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const [,,HTML,IMG,OUT,MOCK,LIBS0]=process.argv;const LIBS=require('path').resolve(LIBS0);
const mock=fs.readFileSync(MOCK,'utf8');
const LIB={jspdf:LIBS+'/node_modules/jspdf/dist/jspdf.umd.min.js',html2canvas:LIBS+'/node_modules/html2canvas/dist/html2canvas.min.js',xlsx:LIBS+'/node_modules/xlsx/dist/xlsx.full.min.js',jsQR:LIBS+'/node_modules/jsqr/dist/jsQR.js'};
(async()=>{const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await ctx.newPage();
const log=[];let aiCalls=0,aiBytes=0;
p.on('pageerror',e=>log.push('PAGEERROR '+e.message.slice(0,150)));
p.on('dialog',d=>{log.push('DIALOG '+d.type()+': '+d.message().slice(0,120));d.accept()});
await p.route(/^https?:/,async r=>{const u=r.request().url();
 for(const k in LIB){if(u.toLowerCase().includes(k.toLowerCase())&&/\.js/.test(u)){log.push('LIB '+k+' <- '+u.slice(0,70));return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(LIB[k])})}}
 if(/generativelanguage/.test(u)){ if(/:generateContent/.test(u)){aiCalls++;const body=r.request().postData()||'';aiBytes+=body.length;
     const j=JSON.parse(body);const prompt=j.contents[0].parts[0].text||'';log.push('AI CALL '+aiCalls+' promptChars='+prompt.length+' imgB64KB='+Math.round((j.contents[0].parts[1].inlineData.data||'').length/1024)+' cfg='+JSON.stringify(j.generationConfig).slice(0,80));
     return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:mock}]},finishReason:'STOP'}]})})}
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({models:[{name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']}]})})}
 return r.abort();});
await p.goto('file://'+require('path').resolve(HTML)); await p.waitForTimeout(3500);
await p.evaluate(()=>{try{lgKeyCacheInit()}catch(e){}lgKeySet('gemini_api_key','AIzaSyTEST_KEY_0000000000000000000000');});
await p.waitForTimeout(500);
await p.setInputFiles('#sodo-file-upload',IMG);
await p.waitForTimeout(2500);
await p.screenshot({path:OUT+'/roi.png'});
await p.evaluate(()=>document.getElementById('btn-process-scan-locate').click());
log.push('CLICKED scan');
const t0=Date.now();
for(let i=0;i<40;i++){await p.waitForTimeout(1000);
  const st=await p.evaluate(()=>({plots:(window.plots||[]).length,modal:[...document.querySelectorAll('.modal,.lg-modal,[role=dialog],.lg62-sheet')].filter(e=>{const r=e.getBoundingClientRect();return r.width>50&&r.height>50&&r.top<innerHeight-40&&r.bottom>40&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'}).map(e=>(e.id||e.className)+':'+(e.innerText||'').replace(/\s+/g,' ').slice(0,140))}));
  st.toast=await p.evaluate(()=>{const h=document.getElementById('lgv42-toast-host');const t2=[...document.querySelectorAll('[class*=toast]')].map(e=>e.innerText).join(' | ');return ((h&&h.innerText)||'')+' '+t2}).catch(()=>'');
  st.res=await p.evaluate(()=>{const r=document.getElementById('sodo-result');return r&&r.style.display!=='none'?(r.innerText||'').replace(/\s+/g,' ').slice(0,400):null});
  if(i%3===0||st.modal.length) log.push('TOAST '+String(st.toast).replace(/\s+/g,' ').slice(0,250)+' || RESULT '+st.res);
  if(i%5===0||st.modal.length) log.push('t+'+i+'s plots='+st.plots+' modal='+JSON.stringify(st.modal).slice(0,300));
  if(st.modal.length){await p.screenshot({path:OUT+'/modal_'+i+'.png'});
    const clicked=await p.evaluate(()=>{const btns=[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0});const want=btns.find(b=>/xác nhận|đồng ý|giữ nguyên|đúng|tiếp tục|dùng|ok/i.test(b.innerText||''));if(want){want.click();return want.innerText.trim().slice(0,40)}return null});
    log.push('CLICK '+clicked);}
  if(st.plots>0&&!st.modal.length&&i>3)break;}
const res=await p.evaluate(()=>{const pl=(window.plots||[])[0];if(!pl)return null;const m=pl.meta||{};return {id:pl.id,n:pl.points.length,area:+pl.area.toFixed(3),lon0:pl.lon0,zone:pl.zone,first:pl.points[0],metaKeys:Object.keys(m).length,dien_tich_m2:m.dien_tich_m2,khong_cap:m.dien_tich_khong_cap_gcn,giap:[m.giap_ranh_tay,m.giap_ranh_dong,m.giap_ranh_nam]}});
log.push('RESULT '+JSON.stringify(res));
const badge=await p.evaluate(()=>{const t=document.body.innerText;const m=t.match(/Đối chiếu GCN[^\n]{0,160}/);return m&&m[0]});log.push('BADGE '+badge);
await p.screenshot({path:OUT+'/after_scan.png'});
fs.writeFileSync(OUT+'/e2e_log.txt',log.join('\n'));console.log(log.join('\n'));

const adj=await p.evaluate(()=>{const A=window.LG145&&LG145.lastAdjust;const sc=(typeof sodoCoords!=='undefined')?sodoCoords.map(q=>[q.ten,+q.x.toFixed(3),+q.y.toFixed(3)]):null;
 let maxShift=0,shifts=[];if(A&&A.before&&A.after){A.after.forEach((q,i)=>{const b=A.before[i];const d=Math.hypot(q.x-b.x,q.y-b.y);shifts.push(+d.toFixed(3));maxShift=Math.max(maxShift,d)})}
 const pl=plots[0];return {applied:A&&A.applied,areaBefore:A&&A.areaBefore,areaAfter:A&&A.areaAfter,maxShift_m:+maxShift.toFixed(3),shifts,edgesAfter:A&&A.edgesAfter&&A.edgesAfter.map(v=>+v.toFixed(2)),sodoCoords:sc,plotPts:pl.points.map(q=>[+q.x.toFixed(3),+q.y.toFixed(3)])}});
log.push('ADJUST '+JSON.stringify(adj));
// mở hồ sơ kỹ thuật + bắt tệp tải xuống
const dlP=p.waitForEvent('download',{timeout:60000}).catch(e=>null);
const r=await p.evaluate(async()=>{try{const pl=plots[0];window.LG57.openHSKT(pl);return 'opened'}catch(e){return 'ERR '+e.message}});
log.push('HSKT '+r);await p.waitForTimeout(4000);
await p.screenshot({path:OUT+'/hskt.png',fullPage:false});
const btns=await p.evaluate(()=>[...document.querySelectorAll('button,a')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&/pdf|tải|xuất|in/i.test(b.innerText||'')}).map(b=>(b.id||'')+':'+b.innerText.trim().slice(0,30)));
log.push('BTNS '+JSON.stringify(btns));
const clicked=await p.evaluate(()=>{const b=[...document.querySelectorAll('button,a')].find(b=>{const r=b.getBoundingClientRect();return r.width>0&&/tải pdf|xuất pdf|pdf/i.test(b.innerText||'')});if(b){b.click();return b.innerText.trim()}return null});
log.push('CLICK PDF '+clicked);
const dl=await dlP; if(dl){const fp=OUT+'/'+(dl.suggestedFilename()||'out.pdf');await dl.saveAs(fp);log.push('DOWNLOADED '+fp)} else log.push('NO DOWNLOAD');
const htmlDoc=await p.evaluate(()=>{const e=document.querySelector('#lg57-hskt,#lg60-doc,.lg60-doc,[id*=hskt]');return e?e.innerText.slice(0,6000):document.body.innerText.slice(0,200)});
require('fs').writeFileSync(OUT+'/hskt_text.txt',htmlDoc);
require('fs').writeFileSync(OUT+'/e2e_log.txt',log.join('\n'));

await b.close();})();
