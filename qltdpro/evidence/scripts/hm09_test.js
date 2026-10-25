const { chromium } = require('playwright');const fs=require('fs');const OLD=process.argv[2],NEW=process.argv[3];
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,300)));
 async function run(file){const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
  await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(5000);
  await p.evaluate(()=>showPage('baocao'));await p.waitForTimeout(3000);
  const r=await p.evaluate(()=>{
   const mk=(ma,ten,cb,dn,i)=>[ma,ten,'H'+i,'','',2e9,'','01/12/2027',9,0,0,dn,cb,'Vay ngắn hạn (TK 211)','',' ',0,'Hội Sở','Nhóm 1'];
   const known=(typeof bckhBuildCBTDMap==='function')?Object.keys(bckhBuildCBTDMap())[0]:null;
   const rows=[mk('1','Anh A',known||'X',1e9,1),mk('1','Anh A',known||'X',2e9,2),mk('2','Anh B','',3e9,3),mk('3','Anh B','CB Lạ',4e9,4),mk('4','Anh C','CB Lạ',5e9,5)];
   const agg=bckhAggregateData(rows);
   const snap={reportData:rows,name:'t'};try{bckhFillAllTables(snap,1)}catch(e){return {err:e.message}}
   const old=typeof tdBckhShowUnassigned==='function';
   const snapCust=(()=>{try{return TD.metrics.countCustomers(rows)}catch(e){return -1}})();
   return {known,keys:Object.keys(agg).length,chua:agg.__chuaphan?{hs:agg.__chuaphan.hs,duno:agg.__chuaphan.duno,kh:agg.__chuaphan.khs.size}:null,banner:!!document.getElementById('td-bckh-unassigned'),bannerText:(document.getElementById('td-bckh-unassigned')||{}).textContent,fn:old,snapCust}});
  await p.close();return {r,errs};}
 const o=await run(OLD),n=await run(NEW);
 ck('CŨ không có dải/ __chuaphan',!o.r.chua&&!o.r.banner,o.r);
 ck('MỚI gom Chưa phân: 3 khoản, 12 tỷ, 3 KH',n.r.chua&&n.r.chua.hs===3&&n.r.chua.duno===12e9&&n.r.chua.kh===3,n.r);
 ck('MỚI có dải cảnh báo',n.r.banner&&/Chưa phân CBTD/.test(n.r.bannerText||''),n.r);
 ck('MỚI không pageerror',n.errs.length===0&&!n.r.err,[n.errs,n.r.err]);
 ck('KH snapshot theo mã (A 2 dòng, B 2 dòng ⇒ 4 KH; trước: theo tên = 3)',n.r.snapCust===4,n.r.snapCust);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
