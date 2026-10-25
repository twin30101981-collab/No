const E = require('./_realenv.js'); // P10 (T8)
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const res=[];const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+String(JSON.stringify(x)).slice(0,300)));
 const ctx=await b.newContext({viewport:{width:1920,height:1080}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));p.on('dialog',d=>{errs.push('dialog:'+d.message().slice(0,40));d.accept()});
 await p.goto(process.argv[2]?'file://'+require('path').resolve(process.argv[2]):E.APP_URL,{waitUntil:'load'}); /* P10 (T8): nhận đường dẫn app, không cần máy chủ :8765 */await p.waitForTimeout(6000);
 const vis=await p.evaluate(()=>[...document.querySelectorAll('.topbar button')].filter(e=>e.offsetParent!==null&&e.getBoundingClientRect().width>0).map(e=>(e.id||e.textContent.trim().slice(0,16))));
 /* P10 (T7): tiêu chí cập nhật — P05 đưa ↶/↷ (hoàn tác/làm lại) vào topbar theo phê duyệt ⇒ 5 nút gốc (☰ ẩn ở ≥1440 px) + 2 = 7 */ ck('topbar ≤ 7 nút hiển thị (gồm ↶/↷)',vis.length<=7,vis);ck('có nút Lưu, Nhập IPCAS, Tiện ích, Ctrl K, ngày, ↶, ↷',['btn-import-ipcas-hdr','td-cmd-btn','util-trigger','td-datechip','dp-undo-btn','dp-redo-btn'].every(i=>vis.includes(i))&&vis.some(v=>/Lưu/.test(v)),vis);
 ck('không còn nút Reset ở topbar',!(await p.evaluate(()=>[...document.querySelectorAll('.topbar button')].some(e=>e.offsetParent!==null&&/Reset/.test(e.textContent)))));
 // menu Tiện ích có đủ mục
 await p.click('#util-trigger');await p.waitForTimeout(300);
 const items=await p.evaluate(()=>[...document.querySelectorAll('#util-menu .util-item')].filter(e=>e.offsetParent!==null).map(e=>e.textContent.trim()));
 ck('menu có Máy tính lãi/In A4/Nhật ký/Desktop/Mật độ/Reset',['Máy tính lãi','In bảng A4','Nhật ký chỉnh sửa','Chế độ Desktop','Mật độ: Compact','Mật độ: Comfortable','Reset dữ liệu phiên','Phím tắt'].every(k=>items.some(i=>i.includes(k))),items);
 await p.keyboard.press('Escape');
 // mật độ từ menu
 await p.evaluate(()=>{const w=document.getElementById('util-wrap');w&&w.classList.remove('open')});
 await p.evaluate(()=>[...document.querySelectorAll('#util-menu .util-item')].find(e=>/Mật độ: Compact/.test(e.textContent)).click());await p.waitForTimeout(300);
 ck('mật độ Compact áp dụng',await p.evaluate(()=>document.body.classList.contains('dp-density-compact')));
 await p.evaluate(()=>[...document.querySelectorAll('#util-menu .util-item')].find(e=>/Mật độ: Normal/.test(e.textContent)).click());
 // phím tắt: spy
 await p.evaluate(()=>{window.__c={save:0,hoso:0,exp:0,tbl:0,tsbd:0,hsilent:0,td15:0};
  const wrap=(n,k)=>{const o=window[n];window[n]=function(){window.__c[k]++;};};
  wrap('saveData','save');wrap('hosoSaveCurrent','hoso');wrap('exportQltdExcel','exp');wrap('exportTableExcel','tbl');wrap('tsbdExportExcel','tsbd');wrap('hosoSilentSave','hsilent');
  if(window.TD15)TD15.palette=function(){window.__c.td15++};});
 const press=async(k,o)=>{await p.evaluate(()=>{document.activeElement&&document.activeElement.blur&&document.activeElement.blur()});await p.keyboard.press(k,o);await p.waitForTimeout(300)};
 const C=()=>p.evaluate(()=>JSON.stringify(window.__c));
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(500);
 await p.keyboard.press('Control+s');await p.waitForTimeout(300);let c=JSON.parse(await C());ck('Ctrl+S (tổng quan) ⇒ saveData đúng 1 lần, không bộ xử lý cũ',c.save===1&&c.hsilent===0&&c.hoso===0,c);
 await p.evaluate(()=>showPage('hsvv'));await p.waitForTimeout(800);await p.keyboard.press('Control+s');await p.waitForTimeout(300);c=JSON.parse(await C());ck('Ctrl+S (HSVV) ⇒ hosoSaveCurrent 1 lần, không saveData thêm',c.hoso===1&&c.save===1&&c.hsilent===0,c);
 await p.evaluate(()=>showPage('qltd'));await p.waitForTimeout(600);await p.keyboard.press('Control+e');await p.waitForTimeout(300);c=JSON.parse(await C());ck('Ctrl+E (dư nợ) ⇒ exportQltdExcel 1 lần',c.exp===1,c);
 await p.evaluate(()=>showPage('denhan'));await p.waitForTimeout(600);await p.keyboard.press('Control+e');await p.waitForTimeout(300);c=JSON.parse(await C());ck('Ctrl+E (đến hạn) ⇒ exportTableExcel 1 lần',c.tbl===1,c);
 await p.evaluate(()=>showPage('tsbd'));await p.waitForTimeout(600);await p.keyboard.press('Control+e');await p.waitForTimeout(300);c=JSON.parse(await C());ck('Ctrl+E (TSBĐ) ⇒ tsbdExportExcel 1 lần',c.tsbd===1,c);
 await p.evaluate(()=>showPage('dashboard'));await p.waitForTimeout(500);
 const ov=()=>p.evaluate(()=>{const o=document.getElementById('dp-cmd-overlay');return !!o&&o.classList.contains('open')});
 await p.keyboard.press('Control+k');await p.waitForTimeout(400);ck('Ctrl+K mở bảng lệnh',await ov());
 await p.keyboard.press('Control+k');await p.waitForTimeout(400);ck('Ctrl+K lần 2 đóng',!(await ov()));
 await p.keyboard.press('Control+Shift+K');await p.waitForTimeout(400);ck('Ctrl+Shift+K mở cùng bảng lệnh (không mở bảng lệnh cũ)',(await ov())&&JSON.parse(await C()).td15===0);
 await p.keyboard.press('Escape');await p.waitForTimeout(300);
 const nOv=await p.evaluate(()=>[...document.querySelectorAll('[id*="pal"],[id*="cmd-overlay"]')].filter(e=>e.offsetParent!==null&&getComputedStyle(e).display!=='none').map(e=>e.id));ck('chỉ một lớp bảng lệnh hiển thị tại một thời điểm',nOv.length<=1,nOv);
 // gõ tìm trong bảng lệnh
 await p.keyboard.press('Control+k');await p.waitForTimeout(400);await p.keyboard.type('gia dat',{delay:20});await p.waitForTimeout(500);
 const hit=await p.evaluate(()=>[...document.querySelectorAll('#dp-cmd-results .dp-cmd-item')].map(e=>e.textContent.trim().slice(0,40)));ck('bảng lệnh tìm được "gia dat"',hit.some(h=>/GIÁ ĐẤT|Giá đất/i.test(h)),hit);
 await p.keyboard.press('Enter');await p.waitForTimeout(1000);ck('Enter mở trang Giá đất',(await p.evaluate(()=>document.querySelector('.page.active').id))==='page-giadat');
 // Ctrl+L còn hoạt động
 await p.keyboard.press('Control+l');await p.waitForTimeout(500);ck('Ctrl+L vẫn mở máy tính lãi',await p.evaluate(()=>[...document.querySelectorAll('.modal-overlay.open')].length>0));
 await p.keyboard.press('Escape');
 ck('không pageerror',errs.filter(e=>!/^dialog/.test(e)).length===0,errs);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
