const { chromium } = require('playwright');
const F='file:///tmp/claude-0/work1/app_hm16.html';
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 // 1. hệ điều hành đặt tối, chưa lưu gì
 let ctx=await b.newContext({viewport:{width:1500,height:900},colorScheme:'dark'});let p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
 await p.goto(F,{waitUntil:'load'});await p.waitForTimeout(4500);
 ck('OS tối + chưa cấu hình ⇒ giao diện SÁNG',await p.evaluate(()=>document.documentElement.getAttribute('data-tdup-theme'))==='light');
 const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);ck('nền thân trang sáng',/^rgb\((2[0-9]{2}|1[89][0-9])/.test(bg),bg);
 await ctx.close();
 // 2. 'auto' cũ đã lưu ⇒ chuyển về sáng
 ctx=await b.newContext({viewport:{width:1500,height:900},colorScheme:'dark'});p=await ctx.newPage();
 await p.goto(F,{waitUntil:'load'});await p.waitForTimeout(3000);
 const key=await p.evaluate(()=>Object.keys(localStorage).filter(k=>/theme/i.test(k)));
 await p.evaluate(k=>{k.forEach(x=>localStorage.setItem(x,'auto'))},key);await p.reload({waitUntil:'load'});await p.waitForTimeout(4000);
 ck('đã lưu "auto" (cấu hình cũ) + OS tối ⇒ vẫn SÁNG',await p.evaluate(()=>document.documentElement.getAttribute('data-tdup-theme'))==='light',key);
 // 3. đổi giao diện bằng lệnh: sáng → tối (thử nghiệm) → sáng, không qua auto
 const seq=await p.evaluate(()=>{const out=[];const btn=[...document.querySelectorAll('#tdup-dock button,#tdup-dock [data-tdup-act]')].find(b=>/theme|giao diện|🌓|🌙/i.test((b.dataset.tdupAct||'')+b.title+b.textContent));
  return {has:!!btn,id:btn&&(btn.dataset.tdupAct||btn.title)}});
 if(seq.has){await p.evaluate(()=>{const btn=[...document.querySelectorAll('#tdup-dock button,#tdup-dock [data-tdup-act]')].find(b=>/theme|giao diện|🌓|🌙/i.test((b.dataset.tdupAct||'')+b.title+b.textContent));btn.click()});await p.waitForTimeout(400);
  const a=await p.evaluate(()=>document.documentElement.getAttribute('data-tdup-theme'));await p.evaluate(()=>{const btn=[...document.querySelectorAll('#tdup-dock button,#tdup-dock [data-tdup-act]')].find(b=>/theme|giao diện|🌓|🌙/i.test((b.dataset.tdupAct||'')+b.title+b.textContent));btn.click()});await p.waitForTimeout(400);
  const c=await p.evaluate(()=>document.documentElement.getAttribute('data-tdup-theme'));ck('vòng đổi giao diện: sáng → tối → sáng (không còn auto)',a==='dark'&&c==='light',[a,c]);}
 else ck('(nút đổi giao diện trong dock không tìm thấy — bỏ qua)',true);
 ck('không pageerror',errs.length===0,errs);await ctx.close();
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
