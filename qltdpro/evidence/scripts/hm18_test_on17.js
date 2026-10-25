const { chromium } = require('playwright');const fs=require('fs');
const OLD='/tmp/claude-0/work1/app_hm18.html',NEW='/tmp/claude-0/work1/app_hm17.html';
async function run(b,file){const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>d.accept());
 await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.setInputFiles('#import-file','/tmp/claude-0/real/data/20.10.2026.XLS');
 for(let i=0;i<60;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}
 await p.evaluate(()=>doImport());await p.waitForTimeout(1000);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(4000);
 const out={};
 for(const pg of ['qltd','kd','td','denhan','laidong']){await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(1800);
  out[pg]=await p.evaluate(pg=>{const tb=document.querySelector('#page-'+pg+' tbody');const rows=tb?[...tb.rows]:[];const order=rows.slice(0,400).map(r=>(r.cells[1]?r.cells[1].textContent:'').trim().slice(0,30)+'|'+(r.cells[2]?r.cells[2].textContent:'').trim().slice(0,20));
   return {n:rows.length,orderHash:order.join('\n'),tabindex:rows.slice(0,50).filter(r=>r.getAttribute('tabindex')==='0').length,resize:document.querySelectorAll('#page-'+pg+' .dp-col-resize').length,totRows:document.querySelectorAll('#page-'+pg+' tr.ux-total-row').length,
    topScroll:[...document.querySelectorAll('#page-'+pg+' .table-scroll-top')].map(t=>t.style.display+':'+(t.firstChild&&t.firstChild.style.width||''))}},pg);}
 // lọc làm render lại, rồi kiểm tra quét
 await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(800);
 await p.evaluate(()=>{const s=document.querySelector('#page-qltd input[type=search],#page-qltd input[type=text]');if(s){s.value='nguyen';s.dispatchEvent(new Event('input',{bubbles:true}))}});await p.waitForTimeout(3500);
 out.filtered=await p.evaluate(()=>{const tb=document.querySelector('#page-qltd tbody');const rows=[...tb.rows];return {n:rows.length,tabindex:rows.slice(0,30).filter(r=>r.getAttribute('tabindex')==='0').length}});
 out.errs=errs;await p.close();return out;}
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 const o=await run(b,OLD),n=await run(b,NEW);
 for(const pg of ['qltd','kd','td','denhan','laidong']){
  ck(pg+' · cùng số dòng',o[pg].n===n[pg].n,[o[pg].n,n[pg].n]);
  ck(pg+' · thứ tự 400 dòng đầu y hệt bản cũ',o[pg].orderHash===n[pg].orderHash,[o[pg].orderHash.slice(0,80),n[pg].orderHash.slice(0,80)]);
  ck(pg+' · dòng có tabindex (quét bảng) như cũ',n[pg].tabindex===o[pg].tabindex,[o[pg].tabindex,n[pg].tabindex]);
  ck(pg+' · tay nắm đổi cột như cũ',n[pg].resize===o[pg].resize,[o[pg].resize,n[pg].resize]);
  ck(pg+' · dòng Tổng + thanh cuộn ngang trên (phần tử hiệu lực) như cũ',n[pg].totRows===o[pg].totRows&&JSON.stringify(n[pg].topScroll.slice(-1))===JSON.stringify(o[pg].topScroll.slice(-1)),[o[pg].totRows,n[pg].totRows,o[pg].topScroll,n[pg].topScroll]);}
 ck('lọc xong vẫn quét dòng mới (tabindex) như cũ',n.filtered.tabindex===o.filtered.tabindex&&n.filtered.n===o.filtered.n,[o.filtered,n.filtered]);
 ck('không pageerror',n.errs.length===0&&o.errs.length===0,[o.errs,n.errs]);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
