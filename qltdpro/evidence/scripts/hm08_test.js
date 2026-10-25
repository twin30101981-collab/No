const { chromium } = require('playwright');const fs=require('fs');
const W=process.argv[2];const OLD=process.argv[3],NEW=process.argv[4];
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};
const pick=a=>a[Math.floor(rnd()*a.length)];
function gen(edge){const rows=[];const loai=['Vay ngắn hạn (TK 211)','Vay trung hạn (TK 212)','Vay dài hạn (TK 213)','Thấu chi trên TK khách hàng'];
 for(let i=0;i<800;i++){const kh=1000+Math.floor(rnd()*300);const d=new Date(2026,7,1+Math.floor(rnd()*120));
  const due=`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  let L=pick(loai),N=pick(['Nhóm 1','Nhóm 1','Nhóm 1','Nhóm 2','Nhóm 3','Nhóm 4','Nhóm 5']);
  if(edge&&i%50===0)L='Cho vay khác';if(edge&&i%70===0)N='';if(edge&&i%90===0)N='Nhóm 9';if(edge&&i%110===0)L='Vay trung và dài hạn';
  rows.push(['3201'+kh,'KH '+kh,'APPR'+i,'01/01/2026','01/01/2026',2e9,'01/01/2026',due,9,1e9,Math.floor(rnd()*1e6),1e8+Math.floor(rnd()*9e8),pick(['CBTD A','CBTD B','']),L,'Dia chi',' ',0,pick(['Hội Sở','PGD Hai Bà Trưng','PGD Số 2']),N]);}
 return rows}
async function run(b,file,rows,dateStr){
 const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];
 p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.evaluate(([r,ds])=>{localStorage.setItem('_currentFileDate',ds);DATA.qltd=r;rebuildAll&&rebuildAll();showPage('dashboard');renderDashboard()},[rows,dateStr]);await p.waitForTimeout(1500);
 const t=await p.evaluate(()=>{const g=id=>{const e=document.getElementById(id);return e?e.innerText.replace(/\s+/g,' ').trim():null};
  return {main:g('tbody-db-main')+'|'+g('tfoot-db-main'),nhom:g('tbody-db-nhomno')+'|'+g('tfoot-db-nhomno'),pb:g('tbody-db-pb')+'|'+g('tfoot-db-pb'),cbtd:g('tbody-db-cbtd'),top:g('tbody-db-topkh'),due:g('tbody-db-duehan'),over:g('tbody-db-overdue'),lai:g('tbody-db-lai'),sub:g('db-bang1-sub-ctkh')||g('db-bang1-sub')}});
 await p.close();return {t,errs};}
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>{res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,400)))};
 const clean=gen(false),edge=gen(true);
 for(const ds of ['20/10/2026','30/08/2026']){
  const o=await run(b,OLD,clean,ds),n=await run(b,NEW,clean,ds);
  for(const k of Object.keys(o.t)) { ck(`sạch ${ds} · ${k} khớp cũ/mới`,o.t[k]===n.t[k],[o.t[k]&&o.t[k].slice(0,200),n.t[k]&&n.t[k].slice(0,200)]); }
  ck(`sạch ${ds} · không pageerror`,o.errs.length===0&&n.errs.length===0,[o.errs,n.errs]);
 }
 const o=await run(b,OLD,edge,'20/10/2026'),n=await run(b,NEW,edge,'20/10/2026');
 ck('biên · không pageerror',n.errs.length===0,n.errs);
 ck('biên · mới có dòng Khác',/Khác \(chưa phân loại\)/.test(n.t.main)&&!/Khác \(chưa phân loại\)/.test(o.t.main));
 ck('biên · mới có Không rõ nhóm',/Không rõ nhóm/.test(n.t.nhom)&&!/Không rõ nhóm/.test(o.t.nhom));
 // cân đối: Σ các dòng bảng I và bảng II = tổng (mới) — tính từ DOM
 const sums=async(file)=>{const p=await (await b.newContext()).newPage();await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(5000);
  const r=await p.evaluate(([rows])=>{localStorage.setItem('_currentFileDate','20/10/2026');DATA.qltd=rows;rebuildAll&&rebuildAll();renderDashboard();
   const num=s=>+String(s).replace(/[^\d]/g,'')||0;
   const col=(id,ci)=>[...document.querySelectorAll('#'+id+' tr')].map(tr=>num(tr.children[ci]&&tr.children[ci].textContent));
   const tot=num(document.querySelector('#tfoot-db-main td:nth-child(4)').innerText);
   const sm=a=>a.reduce((x,y)=>x+y,0);
   return {tot,loai:sm(col('tbody-db-main',3)),nhom:sm(col('tbody-db-nhomno',2)),pb:sm(col('tbody-db-pb',2))}},[edge]);await p.close();return r};
 const so=await sums(OLD),sn=await sums(NEW);
 ck('biên · MỚI Σloại=Σnhóm=Σpb=tổng',sn.loai===sn.tot&&sn.nhom===sn.tot&&sn.pb===sn.tot,sn);
 ck('biên · CŨ lệch (chứng minh lỗi gốc)',!(so.loai===so.tot&&so.nhom===so.tot),so);
 fs.writeFileSync(W+'/hm08_sums.json',JSON.stringify({old:so,new:sn}));
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x.startsWith('PASS')).length,'FAIL',res.filter(x=>x.startsWith('FAIL')).length);await b.close();})();
