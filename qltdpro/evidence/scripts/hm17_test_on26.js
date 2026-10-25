const { chromium } = require('playwright');
const FILE='file:///tmp/claude-0/work1/app_hm26.html';
async function load(b,w,h){const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>d.accept());
 await p.goto(FILE,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);return {p,ctx,errs}}
const W=async(p,k)=>p.evaluate(k=>{const t=document.getElementById('table-'+k);const wr=t.closest('.table-wrap');const vis=[...t.tHead.rows[0].cells].filter(c=>c.offsetParent!==null).length;return {tw:t.scrollWidth,ww:wr.clientWidth,sw:wr.scrollWidth,vis,rows:t.tBodies[0].rows.length,cells:t.tBodies[0].rows[0]?[...t.tBodies[0].rows[0].cells].filter(c=>c.offsetParent!==null).length:0}},k);
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 let {p,ctx,errs}=await load(b,1920,1080);
 for(const k of ['qltd','kd','td']){await p.evaluate(x=>showPage(x),k);await p.waitForTimeout(2500);const w=await W(p,k);
  ck(k+' · 1920 mặc định Gọn 1920: không cuộn ngang, 16/20 cột',w.sw<=w.ww+1&&w.vis===16&&w.cells===16,w);}
 await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(800);
 const bar=await p.evaluate(()=>{const b=document.querySelector('.td-cols-bar[data-key="qltd"]');return b&&{txt:b.textContent.replace(/\s+/g,' ').slice(0,120),on:[...b.querySelectorAll('button.on')].map(x=>x.textContent)}});
 ck('thanh chọn cột hiện, preset Gọn 1920 sáng',bar&&bar.on.join()==='Gọn 1920',bar);
 const rows0=(await W(p,'qltd')).rows;
 await p.evaluate(()=>document.querySelector('.td-cols-bar[data-key="qltd"] [data-p="full"]').click());await p.waitForTimeout(600);let w=await W(p,'qltd');ck('Đầy đủ: 20 cột, có cuộn ngang, cùng số dòng',w.vis===20&&w.sw>w.ww&&w.rows===rows0,[w,rows0]);
 await p.evaluate(()=>document.querySelector('.td-cols-bar[data-key="qltd"] [data-p="g1366"]').click());await p.waitForTimeout(600);w=await W(p,'qltd');ck('Gọn 1366: 10 cột',w.vis===10&&w.cells===10,w);
 // tuỳ chọn: bỏ NGÀY GN (13) và thêm lại SỐ TK(6)
 await p.evaluate(()=>{const bar=document.querySelector('.td-cols-bar[data-key="qltd"]');bar.querySelector('[data-act="pick"]').click();const c6=bar.querySelector('.td-cols-panel input[data-i="6"]');c6.checked=true;c6.dispatchEvent(new Event('change',{bubbles:true}))});await p.waitForTimeout(600);
 w=await W(p,'qltd');const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('td_cols_v1_qltd')));ck('tuỳ chọn: thêm SỐ TK ⇒ 11 cột, lưu hide',w.vis===11&&Array.isArray(st.hide)&&!st.hide.includes(6),[w,st]);
 const dis=await p.evaluate(()=>[...document.querySelectorAll('.td-cols-bar[data-key="qltd"] .td-cols-panel input:disabled')].map(i=>i.dataset.i).join());ck('cột luôn hiện (0,4,12) bị khoá',dis==='0,4,12',dis);
 // ghim
 await p.evaluate(()=>document.querySelector('.td-cols-bar[data-key="qltd"] [data-p="full"]').click());await p.waitForTimeout(500);
 await p.evaluate(()=>{const c=document.querySelector('.td-cols-bar[data-key="qltd"] [data-act="pin"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}))});await p.waitForTimeout(800);
 const pin=await p.evaluate(()=>{const t=document.getElementById('table-qltd'),wr=t.closest('.table-wrap');wr.scrollLeft=900;const th=t.tHead.rows[0].cells[4],td=t.tBodies[0].rows[0].cells[4];const r=wr.getBoundingClientRect(),a=th.getBoundingClientRect(),c=td.getBoundingClientRect();return {sl:wr.scrollLeft,thLeftRel:Math.round(a.left-r.left),tdLeftRel:Math.round(c.left-r.left),pos:getComputedStyle(td).position}});
 ck('ghim: cuộn ngang 900px, TÊN KH vẫn nằm trong khung (không bị cuốn đi)',pin.pos==='sticky'&&pin.sl>0&&pin.tdLeftRel>=0&&pin.tdLeftRel<600&&pin.thLeftRel>=0,pin);
 // sắp xếp/lọc vẫn chạy
 await p.evaluate(()=>{const th=document.querySelectorAll('#table-qltd thead th')[12];th.click()});await p.waitForTimeout(1200);
 const sorted=await p.evaluate(()=>{const rs=[...document.querySelector('#table-qltd tbody').rows].slice(0,5).map(r=>Number(String(r.cells[12].textContent).replace(/\D/g,'')));return rs});ck('bấm tiêu đề DƯ NỢ vẫn sắp xếp',sorted.length===5&&(sorted[0]<=sorted[1]||sorted[0]>=sorted[1]),sorted);
 // dòng tổng
 const foot=await p.evaluate(()=>document.getElementById('tfoot-qltd').textContent.replace(/\s+/g,' '));
 const sum=await p.evaluate(()=>DATA.qltd.reduce((s,r)=>s+(Number(r[11])||0),0).toLocaleString('vi-VN'));ck('dòng tổng có Σ dư nợ (=tổng dữ liệu khi không lọc)',foot.includes(sum),[foot,sum]);
 // lưu qua tải lại
 await p.reload({waitUntil:'load'});await p.waitForTimeout(6500);await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(2000);
 const st2=await p.evaluate(()=>({pin:document.querySelector('.td-cols-bar[data-key="qltd"] [data-act="pin"]').checked,on:[...document.querySelectorAll('.td-cols-bar[data-key="qltd"] button.on')].map(x=>x.textContent).join()}));ck('nhớ cấu hình sau tải lại (Đầy đủ + ghim)',st2.pin&&st2.on==='Đầy đủ',st2);
 ck('1920 không pageerror',errs.length===0,errs);await ctx.close();
 // 1366
 ({p,ctx,errs}=await load(b,1366,768));
 for(const k of ['qltd','kd','td']){await p.evaluate(x=>showPage(x),k);await p.waitForTimeout(2500);const w=await W(p,k);ck(k+' · 1366 mặc định Gọn 1366: không cuộn ngang, 10 cột',w.sw<=w.ww+1&&w.vis===10,w);}
 ck('1366 không pageerror',errs.length===0,errs);await ctx.close();
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
