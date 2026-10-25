const { chromium } = require('playwright');const fs=require('fs');
const W=process.argv[2],PORT=process.argv[3];
const D=(d,m,y)=>`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
function csv(due){ // 30 dòng, ngày đến hạn lần lượt due[i%len] (ISO)
  const hdr=['brcd','custnm','apprseq','apprdt','apprmatdt','appramt','dsbsseq','dsbsdt','dsbsmatdt','sprd','dsbsamt','rpmtamt','intamt','dsbsbal','ofcnm','lntpcd','addr1'];
  const rows=[hdr.join(',')];
  for(let i=0;i<30;i++) rows.push(['3201'+(1000+i),'KH Mau '+i,'APPR'+i,'2026-01-01','2027-01-01',1e9,'DS'+i,'2026-01-01',due[i%due.length],9,1e9,0,1e6,1e9,'CBTD A','211','Dia chi'].join(','));
  return rows.join('\n');
}
(async()=>{
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:900}});const p=await ctx.newPage();
 const errs=[],res=[];const ck=(n,c,x)=>{res.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(x)]);};
 p.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,150)));p.on('dialog',d=>{errs.push('dialog: '+d.message().slice(0,100));d.accept()});
 await p.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await p.waitForTimeout(6000);
 let chip=await p.evaluate(()=>document.getElementById('td-datechip').textContent);
 ck('chip-empty-hôm nay',/hôm nay/i.test(chip),chip);
 // 6 mẫu tên tệp qua processImportFile thật
 const names=[['30.06.2026.csv','30/06/2026'],['30_06_2026.csv','30/06/2026'],['DUNO_18.08.2026.csv','18/08/2026'],['msit80_30_06_2026.csv','30/06/2026'],['msit80-2026-06-30.csv','30/06/2026'],['DUNO 20260630.csv','30/06/2026']];
 for(const [n,e] of names){
  fs.writeFileSync(`${W}/data/${n}`,csv(['2026-08-17','2026-08-18','2026-08-25']));
  await p.setInputFiles('#import-file',`${W}/data/${n}`);await p.waitForTimeout(1500);
  const got=await p.evaluate(()=>window._importSourceDate);
  ck('tên tệp '+n,got===e,got);
 }
 // nhập đầy đủ DUNO_18.08.2026
 async function doFull(n){await p.setInputFiles('#import-file',`${W}/data/${n}`);await p.waitForTimeout(2500);
   const np=await p.evaluate(()=>{try{return pendingImportRows&&pendingImportRows.length}catch(e){return -1}});
   await p.evaluate(()=>doImport());await p.waitForTimeout(800);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(2500);return np;}
 const n1=await doFull('DUNO_18.08.2026.csv'); ck('pending rows 30',n1===30,n1);
 let st=await p.evaluate(()=>({cfd:localStorage.getItem('_currentFileDate'),tm:todayMidnight().toISOString(),n:DATA.qltd.length,chip:document.getElementById('td-datechip').textContent,cls:document.getElementById('td-datechip').className}));
 ck('_currentFileDate=18/08/2026',st.cfd==='18/08/2026',st);
 ck('todayMidnight = ngày dữ liệu',new Date(st.tm).getTime()>0 && (()=>{const d=new Date(st.tm);return false})()||await p.evaluate(()=>{const d=todayMidnight();return d.getFullYear()===2026&&d.getMonth()===7&&d.getDate()===18}),st);
 ck('chip data + stale',/Dữ liệu 18\/08\/2026/.test(st.chip)&&/stale/.test(st.cls),st);
 // đến hạn/quá hạn theo ngày tệp: scanNotifications
 const cnt=async()=>p.evaluate(()=>{const o=scanNotifications(DATA.qltd||[],todayMidnight());return JSON.stringify(o).length+'|'+(Array.isArray(o)?o.length:Object.keys(o).map(k=>k+':'+(Array.isArray(o[k])?o[k].length:'')).join(','))});
 const cData=await cnt();
 let snaps=await p.evaluate(()=>_archiveReportList.filter(x=>x.autoDaily).map(x=>x.dayKey));
 ck('snapshot dayKey 18/08/2026',snaps.includes('18/08/2026'),snaps);
 // tệp thứ 2 khác ngày, nhập cùng 1 ngày thật
 const n2=await doFull('msit80_30_06_2026.csv');
 snaps=await p.evaluate(()=>_archiveReportList.filter(x=>x.autoDaily).map(x=>x.dayKey));
 ck('2 mốc riêng',snaps.includes('18/08/2026')&&snaps.includes('30/06/2026')&&snaps.length===2,snaps);
 // nhập lại tệp 18/08 ⇒ ghi đè, không nhân bản
 await doFull('DUNO_18.08.2026.csv');
 snaps=await p.evaluate(()=>_archiveReportList.filter(x=>x.autoDaily).map(x=>x.dayKey));
 ck('nhập lại cùng ngày dữ liệu = ghi đè (2 mốc)',snaps.length===2,snaps);
 // so sánh đến hạn: ngày dữ liệu 18/08 vs hôm nay
 const cData2=await cnt();
 await p.evaluate(()=>tdToggleDataDate());await p.waitForTimeout(1500);
 const cToday=await cnt();
 const st2=await p.evaluate(()=>({mode:TD.dataDate.mode(),chip:document.getElementById('td-datechip').textContent,cls:document.getElementById('td-datechip').className,real:todayMidnight().getTime()===realTodayMidnight().getTime()}));
 ck('toggle → hôm nay',st2.mode==='today'&&st2.real&&/Hôm nay/.test(st2.chip),st2);
 ck('quá hạn/đến hạn khác nhau theo chế độ',cData2!==cToday,[cData2,cToday]);
 // reload giữ chế độ
 await p.reload({waitUntil:'load'});await p.waitForTimeout(7000);
 const st3=await p.evaluate(()=>({mode:TD.dataDate.mode(),cfd:localStorage.getItem('_currentFileDate'),chip:document.getElementById('td-datechip').textContent}));
 ck('reload giữ chế độ + ngày',st3.mode==='today'&&st3.cfd==='18/08/2026',st3);
 await p.evaluate(()=>tdToggleDataDate());await p.waitForTimeout(800);
 const back=await p.evaluate(()=>{const d=todayMidnight();return d.getDate()===18&&d.getMonth()===7});
 ck('toggle về dữ liệu',back,back);
 // tệp không có ngày → xoá ngày cũ
 fs.writeFileSync(`${W}/data/bao cao.csv`,csv(['2026-08-17']));
 await doFull('bao cao.csv');
 const st4=await p.evaluate(()=>({cfd:localStorage.getItem('_currentFileDate'),chip:document.getElementById('td-datechip').textContent,real:todayMidnight().getTime()===realTodayMidnight().getTime()}));
 ck('tên không ngày → dùng hôm nay',st4.cfd===null&&st4.real&&/hôm nay/.test(st4.chip),st4);
 // vẽ các trang
 for(const pg of ['dashboard','qltd','kd','td','denhan','laidong','chlm','tranop','phidv','khmoi','baocao','tsbd']){try{await p.evaluate(x=>showPage(x),pg);await p.waitForTimeout(700)}catch(e){errs.push('page '+pg+': '+e.message.slice(0,80))}}
 // mobile chip
 const m=await b.newContext({viewport:{width:390,height:844}});const mp=await m.newPage();await mp.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});await mp.waitForTimeout(5000);
 const mw=await mp.evaluate(()=>({docW:document.documentElement.scrollWidth,vw:innerWidth,r:document.getElementById('td-datechip').getBoundingClientRect().right}));
 ck('mobile không tràn ngang',mw.docW<=mw.vw+1,mw);
 await p.screenshot({path:`${W}/hm07_1500.png`});
 res.forEach(r=>console.log(r.join(' ')));console.log('errs',JSON.stringify([...new Set(errs)]));
 console.log('PASS',res.filter(r=>r[0]==='PASS').length,'FAIL',res.filter(r=>r[0]==='FAIL').length);
 await b.close();
})();
