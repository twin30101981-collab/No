const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,300)));
 const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>d.accept());
 await p.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});await p.waitForTimeout(5000);
 const info=await p.evaluate(()=>{const nav=[...document.querySelectorAll('#sidebar a[data-page],nav a[data-page]')].map(a=>({page:a.dataset.page,href:a.getAttribute('href'),label:a.querySelector('.label,span:nth-child(2)').textContent.trim()}));
  const pages=[...document.querySelectorAll('.page[id^="page-"]')].map(e=>e.id.slice(5));return {nav,pages,groups:[...document.querySelectorAll('.sidebar-section')].map(e=>e.textContent.trim())}});
 ck('6+ nhóm menu',info.groups.length===6,info.groups);
 ck('không trùng lối vào',new Set(info.nav.map(x=>x.page)).size===info.nav.length,info.nav.map(x=>x.page));
 const missing=info.pages.filter(pg=>!info.nav.some(n=>n.page===pg));ck('mọi trang đều có lối vào menu',missing.length===0,missing);
 ck('mọi mục là <a href="#/…">',info.nav.every(n=>/^#\/[a-z0-9-]+$/.test(n.href)),info.nav.filter(n=>!/^#\/[a-z0-9-]+$/.test(n.href)));
 const hrefOk=await p.evaluate(n=>n.every(x=>TD.router.parse(x.href)===x.page),info.nav);ck('href khớp router',hrefOk);
 for(const n of info.nav){
  await p.evaluate(pg=>{document.querySelector('a[data-page="'+pg+'"]').click()},n.page);await p.waitForTimeout(900);
  const r=await p.evaluate(()=>({act:(document.querySelector('.page.active')||{}).id,title:document.getElementById('page-title').textContent.replace(/[^\p{L}\p{N}&,\- ()\/]/gu,'').replace(/\s+/g,' ').trim().toUpperCase(),hash:location.hash,activeNav:[...document.querySelectorAll('.nav-item.active,.nav-item-parent.active,.nav-child-item.active')].map(e=>e.dataset.page)}));
  const lab=n.label.replace(/[^\p{L}\p{N}&,\- ()\/]/gu,'').replace(/\s+/g,' ').trim().toUpperCase();
  ck(n.page+' · mở đúng trang + hash',r.act==='page-'+n.page&&r.hash===n.href,r);
  ck(n.page+' · nhãn menu = tiêu đề trang',r.title===lab,[lab,r.title]);
 }
 const ch=await p.evaluate(()=>document.getElementById('nav-qltd-children').offsetHeight);ck('nhánh con của DƯ NỢ hiển thị (3 mục)',ch>=90,ch);
 // bàn phím: focus + Enter
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(500);
 await p.focus('a[data-page="tsbd"]');await p.keyboard.press('Enter');await p.waitForTimeout(900);
 ck('bàn phím: Enter trên liên kết mở TSBĐ',(await p.evaluate(()=>document.querySelector('.page.active').id))==='page-tsbd');
 // badge ids còn
 const bd=await p.evaluate(()=>['badge-qltd','badge-kd','badge-td','badge-denhan','badge-laidong','badge-chlm','badge-tsbd','badge-autosync','badge-notif'].filter(i=>!document.getElementById(i)));ck('badge id còn đủ',bd.length===0,bd);
 // dữ liệu: nhập CSV tổng hợp để badge cập nhật không lỗi
 for(const [w,h] of [[1366,768],[390,844]]){const q=await (await b.newContext({viewport:{width:w,height:h}})).newPage();await q.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});await q.waitForTimeout(4500);
  const m=await q.evaluate(()=>({docW:document.documentElement.scrollWidth,vw:innerWidth,sbItems:document.querySelectorAll('#sidebar a[data-page]').length}));ck(w+'px không tràn ngang',m.docW<=m.vw+1,m);await q.close();}
 ck('không pageerror',errs.length===0,errs);
 console.log(res.filter(x=>x[0]==='F'||/mọi|nhóm|trùng|href|bàn phím|badge|px|pageerror|nhánh con/.test(x)).join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);
 require('fs').writeFileSync('/tmp/claude-0/work1/hm14_full.txt',res.join('\n'));await b.close()})();
