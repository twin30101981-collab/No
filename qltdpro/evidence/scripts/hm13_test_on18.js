const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,250)));
 const run=async(url,label)=>{
  const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>d.accept());
  await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(4500);
  const H=()=>p.evaluate(()=>location.hash),A=()=>p.evaluate(()=>(document.querySelector('.page.active')||{}).id);
  ck(label+' · khởi động ghi #/tong-quan',(await H())==='#/tong-quan',await H());
  await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(500);ck(label+' · showPage(qltd) ⇒ #/du-no',(await H())==='#/du-no',await H());
  await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(500);ck(label+' · #/tai-san',(await H())==='#/tai-san',await H());
  await p.evaluate(()=>showPage('giadat'));await p.waitForTimeout(800);ck(label+' · #/gia-dat',(await H())==='#/gia-dat'&&(await A())==='page-giadat');
  await p.evaluate(()=>history.back());await p.waitForTimeout(1200);ck(label+' · Back ⇒ tsbd',(await A())==='page-tsbd'&&(await H())==='#/tai-san',[await A(),await H()]);
  await p.evaluate(()=>history.back());await p.waitForTimeout(1200);ck(label+' · Back ⇒ qltd',(await A())==='page-qltd',await A());
  await p.evaluate(()=>history.forward());await p.waitForTimeout(1200);ck(label+' · Forward ⇒ tsbd',(await A())==='page-tsbd',await A());
  const len0=await p.evaluate(()=>history.length);await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(400);ck(label+' · mở lại cùng trang không thêm lịch sử',(await p.evaluate(()=>history.length))===len0);
  await p.evaluate(()=>{location.hash='#/doi-soat'});await p.waitForTimeout(1500);ck(label+' · đổi hash ⇒ mở Đối soát',(await A())==='page-doisoat',await A());
  await p.evaluate(()=>{location.hash='#/khong-co-trang'});await p.waitForTimeout(800);ck(label+' · hash lạ bị bỏ qua',(await A())==='page-doisoat',await A());
  await p.evaluate(()=>{location.hash='#/doi-soat'});await p.waitForTimeout(300);
  await p.reload({waitUntil:'load'});await p.waitForTimeout(6500);ck(label+' · F5 giữ trang (Đối soát)',(await A())==='page-doisoat',[await A(),await H()]);
  // nhấp menu thật
  await p.evaluate(()=>document.querySelector('.nav-item[data-page="archive"]').click());await p.waitForTimeout(800);ck(label+' · nhấp menu Lưu trữ ⇒ #/luu-tru',(await H())==='#/luu-tru',await H());
  ck(label+' · không pageerror',errs.length===0,errs);await p.close();};
 await run('http://127.0.0.1:8765/index.html','http');
 // deep link
 const p2=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();await p2.goto('http://127.0.0.1:8765/index.html#/tai-san',{waitUntil:'load'});await p2.waitForTimeout(6500);
 ck('deep link #/tai-san mở TSBĐ',(await p2.evaluate(()=>document.querySelector('.page.active').id))==='page-tsbd');
 await run('file:///tmp/claude-0/work1/app_hm18.html','file');
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
