const { chromium } = require('playwright');const fs=require('fs');
const OLD='/tmp/claude-0/work1/app_hm07.html',NEW='/tmp/claude-0/work1/app_hm09.html';
const sets=[['20.10.2026.XLS','20/10/2026'],['30.06.2026.XLS','30/06/2026'],['31.05.2026.xlsx','31/05/2026'],['31.12.2025.xlsx','31/12/2025'],['30.09.2026.XLS','30/09/2026']];
async function run(b,file,rows,ds){const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(5000);
 const t=await p.evaluate(([r,ds])=>{localStorage.setItem('_currentFileDate',ds);DATA.qltd=r;showPage('dashboard');renderDashboard();
  const g=id=>{const e=document.getElementById(id);return e?e.textContent.replace(/\s+/g,' ').trim():''};
  const num=s=>+String(s).replace(/[^\d]/g,'')||0;
  const col=(id,ci)=>[...document.querySelectorAll('#'+id+' tr')].reduce((a,tr)=>a+num(tr.children[ci]&&tr.children[ci].textContent),0);
  return {main:g('tbody-db-main')+g('tfoot-db-main'),nhom:g('tbody-db-nhomno')+g('tfoot-db-nhomno'),pb:g('tbody-db-pb'),cbtd:g('tbody-db-cbtd'),top:g('tbody-db-topkh'),due:g('tbody-db-duehan'),over:g('tbody-db-overdue'),lai:g('tbody-db-lai'),
   tot:num(document.querySelector('#tfoot-db-main td:nth-child(4)').textContent),sLoai:col('tbody-db-main',3),sNhom:col('tbody-db-nhomno',2),sPb:col('tbody-db-pb',2)}},[rows,ds]);
 await p.close();return {t,errs}}
(async()=>{const b=await chromium.launch();
 for(const [f,ds] of sets){const rows=JSON.parse(fs.readFileSync('/tmp/claude-0/real/rows_'+f.replace(/\W/g,'_')+'.json'));
  const o=await run(b,OLD,rows,ds),n=await run(b,NEW,rows,ds);
  const diff=Object.keys(o.t).filter(k=>o.t[k]!==n.t[k]);
  console.log(f,'rows',rows.length,'| khác cũ/mới:',diff.join(',')||'KHÔNG','| cũ Σloại/Σnhóm/tổng',o.t.sLoai,o.t.sNhom,o.t.tot,'| mới',n.t.sLoai,n.t.sNhom,n.t.sPb,n.t.tot,'| err',o.errs.length,n.errs.length);
  if(diff.length&&process.argv[2]==='v')diff.forEach(k=>console.log('  ',k,'\n   O:',o.t[k].slice(0,300),'\n   N:',n.t[k].slice(0,300)));}
 await b.close()})();
