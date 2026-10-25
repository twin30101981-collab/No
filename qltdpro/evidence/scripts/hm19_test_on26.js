const { chromium } = require('playwright');
const F=process.argv[2]||'file:///tmp/claude-0/work1/app_hm26.html';
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>d.accept());
 await p.goto(F,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 const bn=await p.evaluate(()=>{const n=document.getElementById('td-bottomnav');const r=n.getBoundingClientRect();return {disp:getComputedStyle(n).display,items:n.children.length,h:Math.round(r.height),bottom:Math.round(r.bottom),vh:innerHeight}});
 ck('thanh dưới hiện, 5 mục, cao ≥56, sát đáy',bn.disp==='flex'&&bn.items===5&&bn.h>=56&&bn.bottom===bn.vh,bn);
 for(const [pg,sel] of [['qltd','du-no'],['denhan','lich-tra-no'],['tsbd','tai-san'],['dashboard','tong-quan']]){
  await p.evaluate(x=>document.querySelector('#td-bottomnav a[data-bn="'+x+'"]').click(),pg);await p.waitForTimeout(1200);
  const r=await p.evaluate(()=>({act:document.querySelector('.page.active').id,hash:location.hash,on:[...document.querySelectorAll('#td-bottomnav a.on')].map(a=>a.dataset.bn)}));
  ck('chạm "'+pg+'" ⇒ mở trang, hash #/'+sel+', mục sáng',r.act==='page-'+pg&&r.hash==='#/'+sel&&r.on.join()===pg,r);}
 // banner
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(800);
 const nb=await p.evaluate(()=>{const b=document.getElementById('notif-banner');return {shown:b.style.display!=='none',pillsVisible:document.getElementById('notif-pills').offsetParent!==null,h:Math.round(b.getBoundingClientRect().height)}});
 ck('thanh nhắc nợ gập một dòng (≤48px)',!nb.shown||(!nb.pillsVisible&&nb.h<=48),nb);
 if(nb.shown){await p.evaluate(()=>document.querySelector('#notif-banner .notif-inner span').click());await p.waitForTimeout(400);ck('chạm mở rộng các nhắc nợ',await p.evaluate(()=>document.getElementById('notif-pills').offsetParent!==null));}
 // bảng dư nợ
 await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(2500);
 const tb=await p.evaluate(()=>{const t=document.getElementById('table-qltd');const w=t.closest('.table-wrap');return {preset:[...document.querySelectorAll('.td-cols-bar[data-key="qltd"] button.on')].map(x=>x.textContent).join(),tw:t.scrollWidth,ww:w.clientWidth,vis:[...t.tHead.rows[0].cells].filter(c=>c.offsetParent!==null).length,rows:t.tBodies[0].rows.length}});
 ck('bảng Dư nợ: preset Điện thoại, 4 cột, không cuộn ngang trong khung',tb.preset==='Điện thoại'&&tb.vis===4&&tb.tw<=tb.ww+2&&tb.rows>100,tb);
 // không tràn ngang toàn trang ở các trang chính
 for(const pg of ['dashboard','qltd','kd','td','denhan','laidong','tsbd','giadat','doisoat','hsvv','archive','baocao']){await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(900);const w=await p.evaluate(()=>({dw:document.documentElement.scrollWidth,vw:innerWidth}));ck(pg+' · không tràn ngang trang',w.dw<=w.vw+1,w);}
 // topbar + nút chính
 const tp=await p.evaluate(()=>{const t=document.querySelector('.topbar');const btn=['btn-mob-menu','btn-import-ipcas-hdr','td-cmd-btn','util-trigger'].map(i=>{const e=document.getElementById(i);const r=e.getBoundingClientRect();return i+':'+Math.round(r.height)});return {h:Math.round(t.getBoundingClientRect().height),btn}});
 ck('topbar ≤150px, nút chính cao ≥36px',tp.h<=150&&tp.btn.every(x=>+x.split(':')[1]>=36),tp);
 // Menu từ thanh dưới
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(500);
 await p.evaluate(()=>document.querySelector('#td-bottomnav button').click());await p.waitForTimeout(700);
 ck('nút Menu mở thanh bên',await p.evaluate(()=>{const s=document.getElementById('sidebar');return s.getBoundingClientRect().left>-5&&s.getBoundingClientRect().width>100}));
 ck('không pageerror',errs.length===0,errs);await ctx.close();
 // desktop: thanh dưới ẩn
 const c2=await b.newContext({viewport:{width:1366,height:768}});const q=await c2.newPage();await q.goto(F,{waitUntil:'load'});await q.waitForTimeout(4500);
 ck('1366: thanh dưới ẩn, không đệm đáy',await q.evaluate(()=>getComputedStyle(document.getElementById('td-bottomnav')).display==='none'&&getComputedStyle(document.body).paddingBottom==='0px'));
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
