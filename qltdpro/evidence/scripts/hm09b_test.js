const { chromium } = require('playwright');const OLD=process.argv[2],NEW=process.argv[3];
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,400)));
 async function run(file){const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
  await p.goto('file://'+file,{waitUntil:'load'});await p.waitForTimeout(5000);
  const r=await p.evaluate(async()=>{
   const mk=(ma,ten,hd,dn,nh)=>[ma,ten,hd,'','',2e9,'','01/12/2027',9,0,0,dn,'CB A','Vay ngắn hạn (TK 211)','',' ',0,'Hội Sở',nh||'Nhóm 1'];
   DATA.qltd=[mk('1','A','H1',1e9),mk('2','B','H2',2e9),mk('','C','',3e9),mk('3','D','H4',4e9,'Nhóm 1')];
   const cap=TDCMP.captureToday();
   const o={capRows:cap.length,capSum:cap.reduce((s,r)=>s+r.duNo,0)};
   TD_PASTDUE.map={'3|H4':{duNoQH:0,laiQH:5e5,cleared:false},'1|H1':{duNoQH:1e8,laiQH:0,cleared:false},'2|H2':{duNoQH:1e8,laiQH:0,cleared:true}};
   o.up5=TDUP5.scanInterestOverdue().map(x=>x.soHD);
   try{TDCMP.renderKpi();}catch(e){o.kpiErr=e.message}
   o.recon=(document.getElementById('tdcmp-recon')||{}).textContent||null;
   o.reconBg=(document.getElementById('tdcmp-recon')||{style:{}}).style.background;
   try{renderDashboard()}catch(e){o.dashErr=e.message}
   try{TDCMP.renderRecon(10e9+5e6,true);o.reconSkew=document.getElementById('tdcmp-recon').textContent;o.reconSkewBg=document.getElementById('tdcmp-recon').style.background;}catch(e){}
   let a=TD_AUDIT.run({show:false}); o.audit=a.checks.filter(c=>/Đối soát/.test(c.name)).length; o.auditIssues=a.issues.map(i=>i.code);
   // cố ý làm lệch: Dashboard hiển thị khác tệp
   const tf=document.querySelector('#tfoot-db-main td:nth-child(4)'); o.hasTf=!!tf;
   if(tf){tf.textContent='123';a=TD_AUDIT.run({show:false});o.issuesSkew=a.issues.map(i=>i.code);}
   return o;});
  await p.close();return {r,errs};}
 const o=await run(OLD),n=await run(NEW);console.log(JSON.stringify(o.r),'\n',JSON.stringify(n.r));
 ck('CŨ bỏ dòng thiếu mã/HĐ (3 dòng)',o.r.capRows===3,o.r);
 ck('MỚI giữ đủ 4 dòng, tổng 10 tỷ',n.r.capRows===4&&n.r.capSum===10e9,n.r);
 ck('MỚI dải app/tệp/chênh lệch khớp (xanh)',/Khớp/.test(n.r.recon||'')&&/chênh lệch 0/.test(n.r.recon),n.r);
 ck('MỚI TDUP5 đọc dữ liệu: HĐ H4 (lãi QH) + H1 (gốc QH), bỏ H2 đã thu',JSON.stringify(n.r.up5.sort())==='["H1","H4"]',n.r.up5);
 ck('MỚI TD_AUDIT có chỉ tiêu đối soát với tệp',n.r.audit>=5,n.r.audit);
 ck('MỚI sau khi dựng Dashboard: TD_AUDIT không còn lệch',(n.r.auditIssues||[]).length===0,n.r.auditIssues);
 ck('Cố ý lệch 5 triệu ⇒ dải chuyển vàng + hiện chênh lệch',/Lệch/.test(n.r.reconSkew)&&/5\.000\.000/.test(n.r.reconSkew)&&/255, 251, 235/.test(n.r.reconSkewBg),[n.r.reconSkew,n.r.reconSkewBg]);
 ck('MỚI không pageerror',n.errs.length===0&&!n.r.kpiErr,[n.errs,n.r.kpiErr]);
 if(n.r.hasTf) ck('Cố ý làm lệch Dashboard ⇒ TD_AUDIT báo DOISOAT_D1',(n.r.issuesSkew||[]).includes('DOISOAT_D1')&&!(n.r.issuesSkew||[]).includes('DOISOAT_D5'),n.r.issuesSkew);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
