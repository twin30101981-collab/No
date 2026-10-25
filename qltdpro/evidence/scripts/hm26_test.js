const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');const fs=require('fs');
const F=process.argv[2]||(E.APP?'file://'+E.APP:'file://'+E.WORK+'/app_hm26.html');
const I=JSON.parse(fs.readFileSync(E.WORK+'/kh360_indep.json','utf8'));
const files=['31.12.2025.xlsx','31.05.2026.xlsx','30.06.2026.XLS','30.09.2026.XLS','20.10.2026.XLS'];
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,150)));p.on('dialog',d=>d.accept());
 const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 await p.goto(F,{waitUntil:'load'});await p.waitForTimeout(6000);
 await p.evaluate(()=>showPage('khachhang'));await p.waitForTimeout(600);ck('trang mở khi chưa có dữ liệu, có ô tìm',await p.evaluate(()=>!!document.getElementById('kh360-q')&&document.querySelector('.page.active').id==='page-khachhang'));
 for(const f of files){await p.evaluate(()=>{try{pendingImportRows=null}catch(e){}});await p.setInputFiles('#import-file',E.DATA+'/'+f);for(let i=0;i<90;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return !!pendingImportRows}catch(e){return false}}))break;}await p.evaluate(()=>doImport());await p.waitForTimeout(800);await p.evaluate(()=>completeImportToDataArchive());await p.waitForTimeout(3500);}
 await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(800);await p.setInputFiles('#tsbd-file',E.DATA+'/Sao ke tai san bao dam 20.10.2026.XLS');
 for(let i=0;i<120;i++){await p.waitForTimeout(1000);if(await p.evaluate(()=>{try{return TSBD.rows.length}catch(e){return 0}}))break;}await p.waitForTimeout(3000);
 // mở bằng hàm
 await p.evaluate(ma=>tdKh360Open(ma),I.ma);await p.waitForTimeout(1500);
 const num=t=>Number(String(t).replace(/[^\d]/g,''));
 const H=await p.evaluate(()=>({cards:[...document.querySelectorAll('#kh360-view > div:nth-of-type(2) > div')].map(c=>c.innerText.replace(/\s+/g,' ')),title:document.querySelector('#kh360-view > div:first-child').innerText.replace(/\s+/g,' ').slice(0,200),hash:location.hash}));
 ck('mở từ tdKh360Open ⇒ #/khach-hang',H.hash==='#/khach-hang',H.hash);
 const tyd=v=>(v/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})+' tỷ';
 ck('thẻ Dư nợ = '+tyd(I.duno)+' · '+I.nKhoan+' khoản · '+I.nHDTD+' HĐTD',H.cards[0].includes(tyd(I.duno))&&H.cards[0].includes(I.nKhoan+' khoản')&&H.cards[0].includes(I.nHDTD+' HĐTD'),H.cards[0]);
 ck('thẻ Hạn mức = '+tyd(I.hmtd)+' (HĐTD tính 1 lần)',H.cards[1].includes(tyd(I.hmtd)),H.cards[1]);
 ck('thẻ TSBĐ = '+tyd(I.ts.gt)+' · '+I.ts.n+' TS',H.cards[2].includes(tyd(I.ts.gt))&&H.cards[2].includes(I.ts.n+' tài sản'),H.cards[2]);
 ck('thẻ Nhóm nợ = Nhóm '+I.nhom,H.cards[3].includes('Nhóm '+I.nhom),H.cards[3]);
 ck('tiêu đề có mã KH',H.title.includes(I.ma),H.title);
 // khoản vay
 const kv=await p.evaluate(()=>[...document.querySelectorAll('#kh360-body tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.trim())));
 ck('tab Khoản vay: '+I.nKhoan+' dòng, Σ dư nợ khớp',kv.length>=I.nKhoan&&Math.abs(kv.reduce((s,r)=>s+num(r[3]),0)-I.duno)<=1,[kv.length,kv.reduce((s,r)=>s+num(r[3]),0)]);
 // lịch sử
 await p.evaluate(()=>tdKh360Tab('ls'));await p.waitForTimeout(500);
 const hist=await p.evaluate(()=>[...document.querySelectorAll('#kh360-body svg rect title')].map(t=>t.textContent));
 ck('tab Lịch sử: 5 cột, đúng dư nợ từng kỳ',hist.length===5&&I.hist.every((h,i)=>hist[i].startsWith(h[0])&&num(hist[i].split(':')[1].split('đ')[0])===h[1]&&hist[i].includes(h[2]+' khoản')),hist);
 // TSBĐ
 await p.evaluate(()=>tdKh360Tab('ts'));await p.waitForTimeout(400);const tsr=await p.evaluate(()=>document.querySelectorAll('#kh360-body tbody tr').length);ck('tab TSBĐ: '+I.ts.n+' dòng',tsr===I.ts.n,tsr);
 await p.evaluate(()=>tdKh360Tab('hs'));await p.waitForTimeout(300);ck('tab Hồ sơ vay: báo chưa liên kết',/Chưa có hồ sơ vay vốn/.test(await p.evaluate(()=>document.getElementById('kh360-body').innerText)));
 // ghi chú
 await p.evaluate(()=>tdKh360Tab('gc'));await p.waitForTimeout(300);await p.fill('#kh360-note','Kiểm thử ghi chú HM-26');await p.waitForTimeout(900);
 ck('ghi chú tự lưu',/Đã lưu/.test(await p.evaluate(()=>document.getElementById('kh360-note-st').textContent)));
 // tìm bằng ô tìm kiếm
 const word=I.ten.split(' ').slice(-2).join(' ');
 await p.evaluate(()=>{window._kh360hits=[]});await p.fill('#kh360-q',word);await p.waitForTimeout(600);
 const hits=await p.evaluate(()=>[...document.querySelectorAll('#kh360-res .kh360-hit')].length);ck('ô tìm theo tên không dấu có kết quả',hits>=1,hits);
 await p.evaluate(()=>document.querySelector('#kh360-res .kh360-hit').click());await p.waitForTimeout(1200);
 ck('chọn kết quả ⇒ hiển thị 360°',(await p.evaluate(()=>document.getElementById('kh360-view').innerText)).length>100);
 // ghi chú giữ sau tải lại
 await p.reload({waitUntil:'load'});await p.waitForTimeout(9000);await p.evaluate(ma=>tdKh360Open(ma),I.ma);await p.waitForTimeout(1500);await p.evaluate(()=>tdKh360Tab('gc'));await p.waitForTimeout(400);
 ck('ghi chú còn sau tải lại',await p.evaluate(()=>document.getElementById('kh360-note').value)==='Kiểm thử ghi chú HM-26');
 // bảng lệnh Ctrl+K
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(800);await p.keyboard.press('Control+k');await p.waitForTimeout(500);await p.keyboard.type(I.ten.split(' ').slice(-2).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d'),{delay:15});await p.waitForTimeout(700);
 const cm=await p.evaluate(()=>[...document.querySelectorAll('#dp-cmd-results .dp-cmd-item')].map(e=>e.textContent.trim().slice(0,40)));
 ck('Ctrl+K gõ tên KH có kết quả nhóm Khách hàng',cm.length>=1,cm);
 await p.keyboard.press('Enter');await p.waitForTimeout(1500);
 ck('Enter ⇒ mở Khách hàng 360°',(await p.evaluate(()=>document.querySelector('.page.active').id))==='page-khachhang'&&(await p.evaluate(()=>document.getElementById('kh360-view').innerText)).includes(I.ma.slice(-6)));
 ck('không pageerror',errs.length===0,errs);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
