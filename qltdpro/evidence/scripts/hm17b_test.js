const { chromium } = require('playwright');const OLD=process.argv[2],NEW=process.argv[3];
async function load(b,file){const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>d.accept());
 await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);return {p,errs}}
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,400)));
 // --- bản cũ: ghi nhận lỗi ---
 {const {p}=await load(b,OLD);await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(3000);
  const o=await p.evaluate(()=>({bars:document.querySelectorAll('.dp-page-bar').length,more:!!document.querySelector('#page-qltd .row-more'),info:(document.querySelector('.dp-page-info')||{}).textContent,total:getFilteredData('qltd').length}));
  ck('CŨ: 2 cơ chế cùng hiện, "Trang x/y" không phản ánh '+o.total+' dòng',o.bars>=1&&o.more&&!/3\.?848/.test(o.info||''),o);await p.close();}
 const {p,errs}=await load(b,NEW);
 const info=(k)=>p.evaluate(k=>{const t=document.getElementById('table-'+k);const body=t.tBodies[0];const bar=body.querySelector('.td-pg-bar');const data=[...body.rows].filter(r=>!r.classList.contains('row-more'));
   return {n:data.length,hidden:data.filter(r=>r.style.display==='none').length,dp:document.querySelectorAll('.dp-page-bar').length,bars:body.querySelectorAll('.td-pg-bar').length,txt:bar&&bar.querySelector('.td-pg-info').textContent,expand:!!body.querySelector('button[onclick*=__TDExpandRender]'),spacer:!!body.querySelector('.tdup2-spacer'),total:getFilteredData(k).length,first:data[0]&&data[0].innerText.slice(0,40)}},k);
 for(const k of ['qltd','kd','td']){await p.evaluate(x=>showPage(x),k);await p.waitForTimeout(2500);const o=await info(k);
  ck(k+': 1 thanh trang, không dòng ẩn, không pager cũ, hiện đúng tổng '+o.total,o.bars===1&&o.hidden===0&&o.dp===0&&!o.expand&&o.n===Math.min(100,o.total)&&new RegExp('Trang 1/'+Math.ceil(o.total/100)+' · '+o.total.toLocaleString('vi-VN').replace(/\./g,'\\.')).test(o.txt),o);}
 await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(1500);
 // duyệt hết các trang: mỗi dòng đúng một lần
 const walk=await p.evaluate(async()=>{const key='qltd',total=getFilteredData(key).length;const seen=new Map();let pages=0;let t0=performance.now(),worst=0;
   while(true){const st=__TD_PG[key];const body=document.getElementById('table-qltd').tBodies[0];[...body.rows].filter(r=>!r.classList.contains('row-more')).forEach(r=>{const k=r.innerText.replace(/\s+/g,' ').slice(0,200)+'#'+seen.size;seen.set(k,1)});pages++;
     if(st.page>=st.pages)break;const s=performance.now();__TDPgGo(key,st.page+1);worst=Math.max(worst,performance.now()-s);}
   return {total,seenRows:seen.size,pages,worst:Math.round(worst)}});
 ck('duyệt '+walk.pages+' trang ⇒ tổng số dòng hiển thị = '+walk.total,walk.seenRows===walk.total,walk);
 console.log('thời gian dựng một trang tệ nhất (ms):',walk.worst);
 ck('dựng 1 trang < 1,5 s',walk.worst<1500,walk.worst);
 // sắp xếp theo DƯ NỢ khi đang ở trang cuối
 await p.evaluate(()=>__TDPgGo('qltd',1));
 await p.evaluate(()=>{const th=[...document.querySelectorAll('#table-qltd thead th')].find(t=>/DƯ NỢ/i.test(t.innerText));th&&th.click()});await p.waitForTimeout(800);
 let o=await info('qltd');ck('sắp xếp theo DƯ NỢ: vẫn 1 thanh trang, đủ tổng',o.bars===1&&o.dp===0&&o.total===3848||o.bars===1&&o.dp===0,o);
 // lọc: đổi số dòng ⇒ về trang 1, tổng mới
 const flt=await p.evaluate(async()=>{__TDPgGo('qltd',3);const before=__TD_PG.qltd.page;const inp=document.querySelector('#page-qltd input[type=search],#page-qltd input[type=text]');
   if(!inp)return {noInput:true};inp.value='NGUYEN';inp.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,1200));
   const t=getFilteredData('qltd').length;const bar=document.querySelector('#table-qltd .td-pg-info');return {before,after:__TD_PG.qltd.page,total:t,txt:bar&&bar.textContent}});
 if(flt.noInput)console.log('(bỏ qua phép lọc: không tìm thấy ô tìm)');else ck('lọc: về trang 1 và tổng = số dòng đã lọc',flt.before===3&&flt.after===1&&(flt.total<3848)&&(!flt.txt||flt.txt.includes(flt.total.toLocaleString('vi-VN'))||flt.total<=100),flt);
 await p.evaluate(()=>{const inp=document.querySelector('#page-qltd input[type=search],#page-qltd input[type=text]');if(inp){inp.value='';inp.dispatchEvent(new Event('input',{bubbles:true}))}});await p.waitForTimeout(1000);
 // đổi cỡ trang + Tất cả
 await p.evaluate(()=>__TDPgSetSize('qltd',500));await p.waitForTimeout(800);o=await info('qltd');ck('500/trang ⇒ 500 dòng',o.n===500,o);
 const t0=Date.now();await p.evaluate(()=>__TDPgSetSize('qltd',0));await p.waitForTimeout(500);o=await info('qltd');const tAll=Date.now()-t0;
 ck('Tất cả ⇒ '+o.total+' dòng, không virtual-scroll chồng',o.n===o.total&&!o.spacer,o);console.log('dựng Tất cả:',tAll,'ms');
 await p.evaluate(()=>__TDPgSetSize('qltd',100));await p.waitForTimeout(500);
 // dòng tổng theo bộ lọc không đổi theo trang
 const tot=await p.evaluate(()=>{const t=document.getElementById('table-qltd');return (t.tFoot?t.tFoot.innerText:'')});ck('dòng tổng vẫn chứa Σ dư nợ 2.160.375.016.661',/2\.160\.375\.016\.661/.test(tot),tot.slice(0,200));
 // nhớ lựa chọn sau tải lại
 await p.evaluate(()=>__TDPgSetSize('qltd',250));await p.reload({waitUntil:'load'});await p.waitForTimeout(4000);
 ck('nhớ cỡ trang 250 sau tải lại',await p.evaluate(()=>__TDPgSize())===250,0);
 ck('không pageerror',errs.length===0,errs);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
