const { chromium } = require('/opt/node-tools/node_modules/playwright');
const B=`1 2259336.23 568027.14 2.06
2 2259334.17 568027.23 3.85
3 2259334.42 568031.07 17.58
4 2259316.85 568031.69 0.26
5 2259316.59 568031.70 4.50
6 2259316.99 568036.18 0.38
7 2259317.37 568036.15 19.32
8 2259336.65 568034.94 7.81
1 2259336.23 568027.14`;
const V={
 'chuan':B,
 'phay_thap_phan':B.replace(/(\d)\.(\d\d)\b/g,'$1,$2'),
 'cham_hang_nghin_VN':B.replace(/\b(\d{7})\.(\d\d)/g,(m,a,b)=>a.slice(0,1)+'.'+a.slice(1,4)+'.'+a.slice(4)+','+b).replace(/\b(\d{6})\.(\d\d)/g,(m,a,b)=>a.slice(0,3)+'.'+a.slice(3)+','+b),
 'khoang_trang_trong_so':B.replace(/\b(\d{4})(\d{3}\.\d\d)/g,'$1 $2'),
 'OCR_O_thay_0':B.replace('2259336.23 568027.14 2.06','2259336.23 568O27.14 2.06'),
 'OCR_l_thay_1':B.replace('2259334.17','225933l.17'),
 'cot_dao_YX':B.split('\n').map(l=>{const a=l.split(' ');return [a[0],a[2],a[1],a[3]].filter(Boolean).join(' ')}).join('\n'),
 'tab_va_dau_cham_phay':B.replace(/ /g,'\t;'),
 'thieu_cot_S':B.split('\n').map(l=>l.split(' ').slice(0,3).join(' ')).join('\n'),
};
(async()=>{const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const p=await ctx.newPage();
await p.route(/^https?:/,r=>r.abort()); await p.goto('file://'+require('path').resolve(process.argv[2])); await p.waitForTimeout(3500);
const out={};
out.parse=await p.evaluate(V=>{const r={};for(const k in V){try{const a=LG145.parseBookText(V[k]);const c=a.points.length>=3?LG145.checkBook({points:a.points,sides:a.sides,dien_tich_m2:89.9}):null;r[k]={n:a.points.length,sides:a.sides?a.sides.length:null,area:c?+c.area.toFixed(2):null,firstPt:a.points[0]?[a.points[0].x,a.points[0].y]:null}}catch(e){r[k]='ERR '+e.message}}return r},V);
// number formatting in UI
out.numfmt=await p.evaluate(()=>{const t=document.body.innerText;return {dotDec:(t.match(/\b\d+\.\d{1,2}\s?m²/g)||[]).length,commaDec:(t.match(/\b\d+,\d{1,2}\s?m²/g)||[]).length}});
// a11y scan
out.a11y=await p.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
 const btn=[...document.querySelectorAll('button,[role=button]')];const noName=btn.filter(e=>!(e.innerText||'').trim()&&!e.getAttribute('aria-label')&&!e.title);
 const inputs=[...document.querySelectorAll('input:not([type=hidden]),select,textarea')];const noLabel=inputs.filter(e=>!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')&&!e.placeholder&&!e.title);
 const small=btn.filter(vis).filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44});
 const imgs=[...document.querySelectorAll('img')].filter(i=>!i.hasAttribute('alt'));
 const heads=[...document.querySelectorAll('h1,h2,h3')].map(h=>h.tagName).slice(0,10);
 const vp=document.querySelector('meta[name=viewport]');
 return {buttons:btn.length,noName:noName.length,noNameEx:noName.slice(0,5).map(e=>e.id||e.className),inputs:inputs.length,noLabel:noLabel.length,smallVisible:small.length,smallEx:small.slice(0,6).map(e=>(e.innerText||e.id).trim().slice(0,12)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)),imgNoAlt:imgs.length,headings:heads,viewport:vp&&vp.content,inlineOnclick:document.querySelectorAll('[onclick]').length}});
// scale: N plots save/load timing + size
out.scale=await p.evaluate(async()=>{const base=[[2259336.23,568027.14],[2259334.17,568027.23],[2259334.42,568031.07],[2259316.85,568031.69],[2259316.59,568031.70],[2259316.99,568036.18],[2259317.37,568036.15],[2259336.65,568034.94]];
 const res={};for(const N of [100,500]){const arr=[];for(let i=0;i<N;i++){arr.push({id:'Thửa '+i,points:base.map(a=>({x:a[0]+i*25,y:a[1]})),lon0:105.5,zone:3,meta:{so_thua:String(i),to_ban_do:'10',dien_tich_m2:89.9,chu_su_dung:'Nguyen Van A',dia_chi:'Xom B, Phuc Trong, My Xa, Nam Dinh',ghi_chu_trang_4:'x'.repeat(200)}})}
  const s=JSON.stringify(arr);res[N]={kb:Math.round(s.length/1024)};}
 return res});
// load 300 plots through app & time render + one save
await p.evaluate(()=>{const base=[[2259336.23,568027.14],[2259334.17,568027.23],[2259334.42,568031.07],[2259316.85,568031.69],[2259316.59,568031.70],[2259316.99,568036.18],[2259317.37,568036.15],[2259336.65,568034.94]];const arr=[];for(let i=0;i<5;i++)arr.push({id:'T'+i,points:base.map(a=>({x:a[0]+(i%20)*25,y:a[1]+Math.floor(i/20)*15})),lon0:105.5,zone:3,meta:{so_thua:String(i),to_ban_do:'10',dien_tich_m2:89.9}});localStorage.setItem('land_gis_v18_cache',JSON.stringify(arr))});
const t0=Date.now(); await p.reload({timeout:90000}); await p.waitForFunction(()=>(window.plots||[]).length>0,null,{timeout:60000}).catch(()=>{}); const tLoad=Date.now()-t0; await p.waitForTimeout(3000);
out.scale5=await p.evaluate(()=>{const n=(window.plots||[]).length;let t=performance.now();try{saveToLocalStorage()}catch(e){}const ts=performance.now()-t;t=performance.now();try{renderPlots&&renderPlots()}catch(e){}const tr=performance.now()-t;return {loaded:n,saveMs:Math.round(ts),renderMs:Math.round(tr),dom:document.querySelectorAll('*').length,heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null}});
out.scale5.reloadMs=tLoad;
// delete + undo persistence
out.undo=await p.evaluate(async()=>{const id=plots[0].id;let conf=0;const oc=window.confirm;window.confirm=()=>{conf++;return true};try{deletePlot(id)}catch(e){return 'ERR '+e.message}window.confirm=oc;
 return {confirmAsked:conf,after:plots.length,hasUndoVar:typeof lastDeletedPlot!=='undefined'&&!!lastDeletedPlot}});
await p.reload({timeout:90000}); await p.waitForTimeout(3500);
out.undoAfterReload=await p.evaluate(()=>({plots:(window.plots||[]).length,undoAvailable:typeof lastDeletedPlot!=='undefined'&&!!lastDeletedPlot}));
// leak: open/close plot panel 30x
out.leak=await p.evaluate(async()=>{const d0=document.querySelectorAll('*').length;const h0=performance.memory?performance.memory.usedJSHeapSize:0;
 for(let i=0;i<30;i++){try{openPlotPanel(plots[i%plots.length].id)}catch(e){}await new Promise(r=>setTimeout(r,60));try{closePlotPanel()}catch(e){}await new Promise(r=>setTimeout(r,60));}
 await new Promise(r=>setTimeout(r,1500));return {domBefore:d0,domAfter:document.querySelectorAll('*').length,heapDeltaMB:performance.memory?Math.round((performance.memory.usedJSHeapSize-h0)/1e5)/10:null}});
console.log(JSON.stringify(out,null,1)); await b.close();})();
