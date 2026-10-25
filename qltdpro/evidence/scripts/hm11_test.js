const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();const errs=[],res=[];
 const ck=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x).slice(0,300)));
 p.on('pageerror',e=>errs.push(e.message.slice(0,160)));p.on('dialog',d=>{errs.push('dialog '+d.message().slice(0,80));d.accept()});
 await p.goto('http://127.0.0.1:8765/index.html',{waitUntil:'load'});await p.waitForTimeout(5000);
 await p.evaluate(()=>showPage('giadat'));await p.waitForTimeout(3000);
 const t=await p.evaluate(()=>({loaded:typeof bgd_renderTable==='function',rows:bgd_filteredRows&&bgd_filteredRows.length,
   amb:[...document.querySelectorAll('#table-body td')].filter(td=>/trùng khoá/.test(td.textContent)).length}));
 ck('trang giá đất nạp (Phường Nam Định 373 dòng)',t.loaded&&t.rows===373,t);
 // duyệt toàn bộ dòng: đếm ô ambiguous theo lookup
 const L=await p.evaluate(()=>{let amb=0,withP=0,hidden=0,none=0;bgd_WARDS.forEach(w=>W[w].forEach(r=>{const k=bgd_lookup(w,r[2],r[3],r[1]);if(k.ambiguous){amb++;if(k.raw)hidden++}else if(k.price)withP++;else none++}));return {amb,withP,hidden,none}});
 ck('143 dòng khoá trùng có giá NQ38 bị ẩn (không gán nhầm)',L.amb>=143&&L.hidden===143,L);
 await p.evaluate(()=>bgd_showSection('loi-du-lieu',document.querySelectorAll('.bgd-snav-btn')[6]));await p.waitForTimeout(800);
 const A=await p.evaluate(()=>{const t=document.getElementById('bgd-audit-body').innerText.replace(/\s+/g,' ');return {len:t.length,kpi:t.slice(0,420),active:document.getElementById('loi-du-lieu').classList.contains('active')}});
 ck('trang Lỗi dữ liệu hiển thị',A.active&&/54/.test(A.kpi)&&/40/.test(A.kpi)&&/28/.test(A.kpi),A);
 const rowsN=await p.evaluate(()=>[...document.querySelectorAll('#bgd-audit-body .card-head span')].map(e=>e.textContent));
 ck('bảng khoá trùng 54, ô lỗi 40, dòng thiếu 28',rowsN.some(x=>/Khoá.*54 dòng/.test(x))&&rowsN.some(x=>/Ô lỗi.*40 dòng/.test(x))&&rowsN.some(x=>/không có trong bảng.*28 dòng/.test(x)),rowsN);
 // tính tay
 await p.evaluate(()=>bgd_showSection('tinh-gia',document.querySelectorAll('.bgd-snav-btn')[4]));
 const calc=await p.evaluate(()=>{const set=(id,v)=>{document.getElementById(id).value=v};set('inp-dongia',15000000);set('inp-dientich',250);set('inp-loaidat','o');
   const sel=(id,val)=>{const e=document.getElementById(id);[...e.options].forEach((o,i)=>{if(o.value==val)e.selectedIndex=i})};sel('inp-k1','1.2');sel('inp-k4','1.1');sel('inp-k5','1.02');sel('inp-h1','1.2');sel('inp-h2','0.85');
   bgd_tinhGia();return {app:document.getElementById('result-value').textContent,hand:Math.round(15000000*1.2*0.9*1.1*1.02*1.2*0.85).toLocaleString('vi-VN'),btn:!!document.querySelector('#result-breakdown button')}});
 ck('ví dụ tính tay khớp app',calc.app===calc.hand&&calc.btn,calc);
 // K2 nhất quán
 const K=await p.evaluate(()=>{let bad=0;[1,50,99,100,250,300,499,500,999,1000,3000,200,2000,5000,10000,20000].forEach(a=>['o','nn'].forEach(l=>{if(kh_getCoeff(a,l).val!==bgd_getK2(a,l))bad++}));return bad});
 ck('kh_getCoeff ≡ bgd_getK2',K===0,K);
 // đưa sang hồ sơ vay
 const H=await p.evaluate(()=>{const el=document.getElementById('giaDatG0');if(!el)return {noEl:true};bgd_toHoSo();return {g0:el.value,expect:Math.round(window._bgdLastResult)}});
 ck('đưa G0 sang hồ sơ vay',H.noEl||H.g0==String(H.expect),H);
 // vẽ các trang, 3 viewport
 for(const pg of ['dashboard','qltd','tsbd','baocao'])await p.evaluate(x=>showPage(x),pg).catch(()=>{});
 ck('không pageerror',errs.filter(e=>!/^dialog/.test(e)).length===0,errs);
 console.log(res.join('\n'));console.log('PASS',res.filter(x=>x[0]==='P').length,'FAIL',res.filter(x=>x[0]==='F').length);await b.close()})();
