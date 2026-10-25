
// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let curLT = 'han_muc';

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  const today = new Date().toISOString().slice(0,10);
  ['ngayHDTD','ngayGiaoNhan','ngayBia','ngayCIC'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.value=today;
  });
  apcSwitchLT(document.querySelector('.lt-tab'));
  updateChecklist();
  document.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input',updateProgress);
    el.addEventListener('change',updateProgress);
  });
  window.addEventListener('scroll',updateScrollSpy);
  updateProgress();
});

// ═══════════════════════════════════════════════
// LOAN TYPE SWITCH
// ═══════════════════════════════════════════════
function apcSwitchLT(btn){
  document.querySelectorAll('.lt-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  curLT = btn.dataset.lt;

  // Show/hide sections
  document.querySelectorAll('.lt-section').forEach(sec=>{
    const lt = sec.dataset.lt;
    const show = !lt || lt === curLT || lt.split(',').includes(curLT);
    sec.classList.toggle('show', show);
  });

  // Show/hide SXKD nav items
  document.querySelectorAll('.lt-nav-sxkd').forEach(n=>n.style.display=curLT==='han_muc'?'':'none');
  document.querySelectorAll('.lt-nav-td').forEach(n=>n.style.display=curLT==='tieu_dung'?'':'none');
  document.querySelectorAll('.lt-nav-nn').forEach(n=>n.style.display=curLT==='han_muc'?'':'none');

  // Always show s_td for tieu_dung
  const std = document.getElementById('s_td');
  if(std) std.classList.toggle('show', curLT==='tieu_dung');

  updateChecklist();
}

// ═══════════════════════════════════════════════
// AUTO UPPER
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// FORMULA ENGINE v2 — TỰ ĐỘNG HÓA TOÀN BỘ FORM HSVV
// ═══════════════════════════════════════════════════════════════════════════
// Kiến trúc 3 lớp:
//   Lớp 1 – oninput/onchange: phản hồi tức thì khi user gõ
//   Lớp 2 – calcFinance() master: tính lại toàn bộ khi cần
//   Lớp 3 – collectDocxData(): derived values chỉ khi xuất Word
// ═══════════════════════════════════════════════════════════════════════════

// ── UTILS ────────────────────────────────────────────────────────────────────
function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v !== null && v !== undefined) el.value = v;
}
function getNum(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
function getStr(id) { return (document.getElementById(id)?.value || '').trim(); }
function getInt(id) { return parseInt(document.getElementById(id)?.value,10)  || 0; }

// ── UPPERCASE & COMPOSITE ─────────────────────────────────────────────────
function autoUpper(targetId, val){
  const el = document.getElementById(targetId);
  if(el) el.value = val.toUpperCase().normalize('NFC');
}
function updateBenVay(){
  const kh = getStr('tenKH');
  const tk = getStr('tenTK');
  setVal('benVay', [kh,tk].filter(Boolean).map(s=>s.toUpperCase().normalize('NFC')).join(' - '));
}
function updateBenTheChap(){
  const chuTS = getStr('chuTSHoa');
  const tkTS  = getStr('tkChuTSHoa');
  setVal('benTheChap', [chuTS,tkTS].filter(Boolean).join(' - '));
}
document.addEventListener('input', e => {
  if (['tenKH','tenTK'].includes(e.target.id))       updateBenVay();
  if (['chuTSHoa','tkChuTSHoa'].includes(e.target.id)) updateBenTheChap();
});

// ── NUMBER → WORDS (Vietnamese) ──────────────────────────────────────────
const UNITS = ['','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
const TENS  = ['','mười','hai mươi','ba mươi','bốn mươi','năm mươi','sáu mươi','bảy mươi','tám mươi','chín mươi'];
function readHundreds(n){
  const h=Math.floor(n/100), t=Math.floor((n%100)/10), u=n%10;
  let s='';
  if(h>0){ s+=UNITS[h]+' trăm'; if(t>0||u>0) s+=' '; }
  if(t>1){ s+=TENS[t]; if(u>0) s+=' '+(u===5&&t>0?'lăm':UNITS[u]); }
  else if(t===1){ s+='mười'; if(u>0) s+=(u===5?' lăm':' '+UNITS[u]); }
  else if(u>0&&h>0){ s+='linh '+UNITS[u]; }
  else if(u>0){ s+=UNITS[u]; }
  return s.trim();
}
function numToWords(n){
  n = Math.round(n);
  if(!n || n===0) return 'Không đồng';
  const ty=Math.floor(n/1e9), tr=Math.floor((n%1e9)/1e6), ng=Math.floor((n%1e6)/1e3), le=n%1e3;
  const parts=[];
  if(ty>0)  parts.push(readHundreds(ty)+' tỷ');
  if(tr>0)  parts.push(readHundreds(tr)+' triệu');
  if(ng>0)  parts.push(readHundreds(ng)+' nghìn');
  if(le>0)  parts.push(readHundreds(le));
  return parts.join(' ').trim().replace(/^\w/,c=>c.toUpperCase())+' đồng';
}

// Chuyển số thập phân diện tích → chữ (VD: 71.7 → "Bảy mươi mốt phẩy bảy mét vuông")
function numToWordsArea(val){
  const s = parseFloat(val);
  if(!s || isNaN(s)) return '';
  const [intPart, decPart] = s.toFixed(1).split('.');
  const FRAC_NAMES = ['không','mốt','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  let words = readHundreds(parseInt(intPart)) || 'không';
  words = words.charAt(0).toUpperCase() + words.slice(1);
  if(decPart && decPart !== '0'){
    words += ' phẩy ' + FRAC_NAMES[parseInt(decPart)];
  }
  return words + ' mét vuông';
}

function autoWords(targetId, val){
  const n = parseFloat(String(val).replace(/[.,]/g,''));
  setVal(targetId, (!isNaN(n)&&n>0) ? numToWords(n) : '');
}
function apcFmtMoney(n){
  if(!n&&n!==0) return '—';
  if(Math.abs(n)>=1e9) return (n/1e9).toFixed(2).replace(/\.?0+$/,'')+' tỷ';
  if(Math.abs(n)>=1e6) return (n/1e6).toFixed(1).replace(/\.?0+$/,'')+' tr';
  return n.toLocaleString('vi-VN');
}

// ── DATE HELPERS ──────────────────────────────────────────────────────────
// Cộng thêm N tháng vào ISO date string (YYYY-MM-DD), trả về ISO string
function addMonths(isoStr, n){
  if(!isoStr || !n) return '';
  const d = new Date(isoStr + 'T00:00:00');
  if(isNaN(d)) return '';
  d.setMonth(d.getMonth() + n);
  return d.toISOString().split('T')[0];
}
function isoToDisplay(iso){ // YYYY-MM-DD → DD/MM/YYYY
  if(!iso) return '';
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function isoToChu(iso){ // YYYY-MM-DD → "ngày DD tháng MM năm YYYY"
  if(!iso) return '';
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `ngày ${m[3]} tháng ${m[2]} năm ${m[1]}` : iso;
}

// ── AUTO-CALC DATES ───────────────────────────────────────────────────────
// Ngày đến hạn HMTD = ngayHDTD + thoiHan (tháng) — chỉ ghi nếu trống
function calcNgayDenHan(force=false){
  const ngay = getStr('ngayHDTD');
  const n    = getInt('thoiHan');
  const el   = document.getElementById('ngayDenHan');
  if(!el || !ngay || !n) return;
  if(!force && el.value) return; // không ghi đè nếu đã điền tay
  const result = addMonths(ngay, n);
  if(result){ el.value = result; el.classList.add('auto-gen'); }
}
// Thời hạn trả nợ cuối = ngayNhanNo + thoiHan (tháng)
function calcNgayTraNoCuoi(force=false){
  const ngay = getStr('ngayNhanNo');
  const n    = getInt('thoiHan');
  const el   = document.getElementById('thoiHanTraNoCuoi');
  if(!el || !ngay || !n) return;
  if(!force && el.value) return;
  const result = addMonths(ngay, n);
  if(result){ el.value = result; el.classList.add('auto-gen'); }
}
// Ngày trả nợ cuối cùng (HMTD) = ngayDenHan (alias)
function syncNgayTraNoCuongHan(){
  const dh = getStr('ngayDenHan');
  const el = document.getElementById('ngayTraNoCuoi');
  if(el && dh && !el.value) { el.value = dh; el.classList.add('auto-gen'); }
}
// Ghi chú auto-gen: tooltip nhỏ + có thể xóa để nhập tay
document.addEventListener('focus', e => {
  if(e.target.classList.contains('auto-gen')){
    e.target.title = '⚡ Tự động tính — có thể sửa tay';
  }
}, true);
document.addEventListener('input', e => {
  if(e.target.classList.contains('auto-gen')){
    e.target.classList.remove('auto-gen'); // user đã sửa → bỏ tự động
  }
});

// ── FINANCE CALCULATIONS ──────────────────────────────────────────────────
function calcFinance(){
  const P = getNum('soTienVay');
  const r = getNum('laiSuat') / 100 / 12;
  const n = getInt('thoiHan');

  // Gốc + lãi tháng đầu (dư nợ giảm dần)
  let m1=0, totalInt=0;
  if(P>0 && n>0){
    const goc=P/n, lai1=P*r;
    m1 = goc+lai1;
    for(let i=0;i<n;i++) totalInt += (P-i*goc)*r;
  }

  // KPI
  const setKPI=(id,val,cls)=>{
    const el=document.getElementById(id);
    if(el){el.textContent=val; el.closest?.('.kpi')&&(el.closest('.kpi').className='kpi'+(cls?' '+cls:''));}
  };
  setKPI('v-monthly', P>0&&n>0 ? apcFmtMoney(Math.round(m1)) : '—');
  setKPI('v-ti',      P>0&&n>0 ? apcFmtMoney(Math.round(totalInt)) : '—');

  // DSR (tỷ lệ trả nợ / thu nhập)
  const tongTN = getNum('thuNhapChinh')+getNum('thuNhapKhac')+getNum('thuNhapTK')
               + getNum('soTienTN1')+getNum('soTienTN2')+getNum('nguonThuChinh');
  const traNoCu = getNum('traNoCu');
  const totalObl = m1 + traNoCu;
  const dsr = tongTN>0 ? totalObl/tongTN*100 : 0;
  setVal('tongThuNhap', tongTN||'');

  const dsrEl    = document.getElementById('v-dsr');
  const dsrAlert = document.getElementById('hsvv-dsr-alert');
  const dsrAlert7= document.getElementById('hsvv-dsr-alert-s7');
  const dsrFill  = document.getElementById('dsrFill');
  if(tongTN>0 && P>0){
    const dsrStr = dsr.toFixed(1)+'%';
    if(dsrEl) dsrEl.textContent = dsrStr;
    if(dsrFill){ dsrFill.style.width=Math.min(dsr,100)+'%'; dsrFill.style.background=dsr<40?'var(--green-light)':dsr<50?'#b45309':'var(--red)'; }
    const cls = dsr<40?'good':dsr<50?'warn':'danger';
    setKPI('v-dsr', dsrStr, cls);
    const alertShow = dsr>=50;
    if(dsrAlert)  dsrAlert.style.display  = alertShow?'flex':'none';
    if(dsrAlert7) dsrAlert7.style.display = alertShow?'flex':'none';
  } else {
    if(dsrEl) dsrEl.textContent='—';
    if(dsrAlert)  dsrAlert.style.display='none';
    if(dsrAlert7) dsrAlert7.style.display='none';
  }

  // Auto-calc dates (chỉ khi trống)
  calcNgayDenHan();
  calcNgayTraNoCuoi();
  syncNgayTraNoCuongHan();

  calcLTV();
  calcTV();
  calcPA();
  if(P>0 && n>0) buildAmort(P,r,n);
  calcPA();
  // ✅ PATCH v18: trigger calcTDIncome nếu có dữ liệu section TD (tránh vòng lặp vô hạn)
  if(!calcFinance._inTDRecalc && (getNum('soTienTN1')||getNum('soTienTN2')||getInt('soKy'))){
    calcFinance._inTDRecalc = true;
    try{ calcTDIncome._skipFinance = true; calcTDIncome(); } finally{ calcTDIncome._skipFinance = false; calcFinance._inTDRecalc = false; }
  }
  updateProgress();
}

function calcLTV(){
  const P    = getNum('soTienVay');
  const vts  = getNum('tongGTTS_sd');
  const nvbd = getNum('nghiaVuBD');
  const tsRef= vts || nvbd;
  const ltv  = tsRef>0 && P>0 ? P/tsRef*100 : 0;
  const ltvEl   = document.getElementById('v-ltv');
  const ltv_sd  = document.getElementById('ltv_sd');
  const tyLeVayEl = document.getElementById('tyLeVay');
  if(tsRef>0 && P>0){
    const s = ltv.toFixed(2)+'%';
    if(ltvEl) ltvEl.textContent=s;
    if(ltv_sd) ltv_sd.value=s;
    if(tyLeVayEl) tyLeVayEl.value=s;
    ltvEl?.closest('.kpi') && (ltvEl.closest('.kpi').className='kpi '+(ltv<=70?'good':ltv<=80?'warn':'danger'));
  } else {
    if(ltvEl)  ltvEl.textContent='—';
    if(ltv_sd) ltv_sd.value='';
    if(tyLeVayEl) tyLeVayEl.value='';
  }
}

function calcTV(){
  const ncv = getNum('ncv');
  const vtc = getNum('vonTuCo');
  const el  = document.getElementById('tyLeVTC');
  if(el && ncv>0) el.value = (vtc/ncv*100).toFixed(2)+'%';
  else if(el) el.value='';
}

function calcPA(){
  const nld  = getInt('soLaoDong');
  const luong= getNum('luongNhanCong');
  const cp   = nld*luong*12;
  setVal('cpNhanCong', cp||'');
  setVal('vonSLD', cp||'');
  const P = getNum('soTienVay'), r = getNum('laiSuat');
  const lvc = document.getElementById('laiVayCuThe');
  if(lvc && P>0 && r>0) lvc.value=`${P.toLocaleString('vi-VN')}đ × ${r}%/năm`;
  const dt = getNum('doanhThu'), cpTong = getNum('tongCP');
  const ln = document.getElementById('loiNhuan');
  if(ln && dt>0) ln.value = dt-cpTong;
}

function calcTSHH(){
  const hh  = getNum('hangHoa');
  const tm  = getNum('tienMat');
  const npt = getNum('noPT');
  setVal('tongGTTS', hh+tm+npt || '');
}

// Tính giá đất + giá nhà + tổng giá trị TS
function calcGiaDat(){
  const g0   = getNum('giaDatG0');
  const dt   = getNum('dtDat');
  const m2   = getNum('giaTriM2Nha');
  const dtSD = getNum('dtSD');

  const gdat  = g0  * dt;
  const gnha  = m2  * dtSD;
  const tong  = gdat + gnha;
  const gnhaR = Math.round(gnha / 1e6) * 1e6; // làm tròn đến triệu

  setVal('giaTriDat',   gdat || '');
  setVal('giaTriNha',   gnha || '');
  setVal('tongGTTS_sd', tong || '');

  // Bằng chữ tổng giá trị
  const bcEl = document.getElementById('tongGTTSBC');
  if(bcEl) bcEl.value = tong>0 ? numToWords(Math.round(tong)) : '';

  // Diện tích đất bằng chữ (decimal)
  const dtBCel = document.getElementById('dtDatBC');
  if(dtBCel && dt>0) dtBCel.value = numToWordsArea(dt);
  else if(dtBCel) dtBCel.value='';

  // Giá trị nhà làm tròn (lưu hidden để collectDocxData lấy)
  const gnhaREl = document.getElementById('giaTriNha_round');
  if(gnhaREl) gnhaREl.value = gnhaR || '';

  calcLTV();
}

// Nghĩa vụ bảo đảm bằng chữ → 2 IDs (nghiaVuBDBC ẩn + nvbdBC hiển thị)
function calcNghiaVuBD(val){
  const n = parseFloat(String(val).replace(/[.,]/g,''));
  const s = (!isNaN(n)&&n>0) ? numToWords(n) : '';
  setVal('nghiaVuBDBC', s);
  setVal('nvbdBC', s);
}

// Nhận nợ: tính Số tiền sau khi NN = HMTD duyệt − Số tiền NN
function calcSauNN(){
  const hmtd = getNum('hmtdDuyet');
  const nn   = getNum('soTienNN');
  if(hmtd>0 && nn>0){
    const sau = hmtd - nn;
    setVal('soTienSauNN', sau>0 ? sau : 0);
    autoWords('soTienSauNNBC', sau>0 ? sau : 0);
  }
}

// Lãi ước của nhận nợ = soTienNN × laiSuat/100 × thoiHan/12
function calcLaiUocNN(){
  const nn = getNum('soTienNN');
  const ls = getNum('laiSuat') / 100;
  const th = getInt('thoiHan');
  if(nn>0 && ls>0 && th>0){
    const lai = Math.round(nn * ls * th / 12);
    setVal('laiUocNN', lai || '');
  }
}

// Tính lịch trả nợ TD (thu nhập KH)
function calcTDIncome(){
  const n1 = getNum('soTienTN1');
  const n2 = getNum('soTienTN2');
  const tong= n1+n2;
  const dk  = getInt('soThangDK') || 3;
  setVal('tongTN_TD', tong||'');
  setVal('tongTNDK',  tong*dk||'');
  const P = getNum('soTienVay');
  const ky= getInt('soKy');
  const r = getNum('laiSuat')/100/12;
  if(P>0 && ky>0){
    const gocThang   = P/ky;
    const laiThang   = P*r;
    const gocLaiThang= gocThang+laiThang;
    setVal('gocThang',    Math.round(gocThang));
    setVal('laiThang',    Math.round(laiThang));
    setVal('gocLaiThang', Math.round(gocLaiThang));
    setVal('gocDK',       Math.round(gocThang*dk));
    setVal('laiDK',       Math.round(laiThang*dk));
    setVal('chiSinhHoat', Math.round(tong-gocLaiThang));
  }
  // Guard: nếu đang được gọi từ calcFinance (via _inTDRecalc) thì skip gọi lại để tránh vòng lặp
  if(!calcTDIncome._skipFinance) calcFinance();
}

// Lịch phân kỳ trả nợ (amortization table)
function buildAmort(P,r,n){
  const rows=Math.min(n,12);
  let html='',totG=0,totL=0,totP=0,bal=P;
  for(let i=1;i<=rows;i++){
    const goc=P/n, lai=bal*r, total=goc+lai;
    totG+=goc; totL+=lai; totP+=total;
    const end=bal-goc;
    html+=`<tr><td>T${i}</td><td>${apcFmtMoney(Math.round(bal))}</td><td>${apcFmtMoney(Math.round(goc))}</td><td>${apcFmtMoney(Math.round(lai))}</td><td>${apcFmtMoney(Math.round(total))}</td><td>${apcFmtMoney(Math.round(end))}</td></tr>`;
    bal=end;
  }
  document.getElementById('amort-rows').innerHTML=html;
  document.getElementById('amort-foot').innerHTML=`<tr><td>Tổng${n>12?' (12 kỳ đầu)':''}</td><td>—</td><td>${apcFmtMoney(Math.round(totG))}</td><td>${apcFmtMoney(Math.round(totL))}</td><td>${apcFmtMoney(Math.round(totP))}</td><td>—</td></tr>`;
}
function toggleAmort(){
  const w=document.getElementById('hsvv-amort-wrap'), a=document.getElementById('amort-arrow');
  const v=w.style.display==='block';
  w.style.display=v?'none':'block';
  a.textContent=v?'▼':'▲';
}

// ── HÀM CHẠY LẠI TẤT CẢ KHI LOAD DỮ LIỆU ─────────────────────────────
// Gọi sau khi fillData() hoặc import để cập nhật mọi trường derived
function hsvvRecalcAll(){
  // Cập nhật chữ hoa
  const tenKH = getStr('tenKH');
  if(tenKH){ autoUpper('tenKHHoa',tenKH); updateBenVay(); }
  const tenTK = getStr('tenTK');
  if(tenTK){ autoUpper('tenTKHoa',tenTK); }
  const chuTS = getStr('chuTS');
  if(chuTS){ autoUpper('chuTSHoa',chuTS); }
  const tkChuTS = getStr('tkChuTS');
  if(tkChuTS){ autoUpper('tkChuTSHoa',tkChuTS); updateBenTheChap(); }

  // Cập nhật bằng chữ các trường tiền
  const moneyPairs = [
    ['soTienVay','soTienVayBC'],['hmtdDuyet','hmtdDuyetBC'],['duNo','duNoBC'],
    ['ncv','ncvBC'],['hangHoa','hangHoaBC'],['noPT','noPTBC'],['noPTra','noPTraBC'],
    ['duNoAGR','duNoAGRBC'],['soTienNN','soTienNNBC'],['soTienSauNN','soTienSauNNBC'],
    ['giaTriXe','giaTriXeBC'],['pvBDDS','pvBDDSBC'],['tongCP','tongCPBC'],
  ];
  moneyPairs.forEach(([src,tgt])=>{ const v=getNum(src); if(v) autoWords(tgt,v); });

  // Nghĩa vụ bảo đảm
  const nvbd = getNum('nghiaVuBD');
  if(nvbd) calcNghiaVuBD(nvbd);

  // Diện tích đất BC
  const dt = getStr('dtDat');
  if(dt){ const dtBCel=document.getElementById('dtDatBC'); if(dtBCel) dtBCel.value=numToWordsArea(dt); }

  // Tính giá đất (nếu đủ dữ liệu)
  if(getNum('giaDatG0') || getNum('giaTriM2Nha')) calcGiaDat();

  // Finance master (bao gồm date calc, DSR, LTV, amort)
  calcFinance();

  // Nhận nợ
  calcSauNN();
  calcLaiUocNN();

  (0)&&console.log('✅ hsvvRecalcAll() complete');
}

// ── VALIDATION ────────────────────────────────────────────────────────────
function validateCMND(el){
  const v=el.value;
  el.closest('.f').classList.toggle('has-err', v.length>0 && v.length<10);
}
function validateSdt(el){
  const v=el.value.replace(/\D/g,'');
  el.value=v;
  const ok=v.length===0||(v.length>=9&&v.length<=11);
  el.closest('.f').classList.toggle('has-err',!ok&&v.length>0);
}

function updateCICAlert(){
  const v=document.getElementById('nhomNoCIC').value;
  const el=document.getElementById('hsvv-cic-alert');
  const msgs={
    '2':{cls:'warn',msg:'⚠️ KH có nợ nhóm 2. Cần làm rõ nguyên nhân và tình trạng hiện tại.'},
    '3':{cls:'danger',msg:'🔴 KH có nợ nhóm 3 (Dưới tiêu chuẩn). Cần thẩm định chặt chẽ.'},
    '4':{cls:'danger',msg:'🔴 KH có nợ nhóm 4 (Nghi ngờ). Khuyến nghị từ chối.'},
    '5':{cls:'danger',msg:'🔴 KH có nợ nhóm 5 (Mất vốn). Từ chối theo quy định.'},
  };
  if(msgs[v]){el.style.display='flex';el.className='alert '+msgs[v].cls;el.innerHTML=msgs[v].msg;}
  else el.style.display='none';
}

// ═══════════════════════════════════════════════
// RATING & RISK
// ═══════════════════════════════════════════════
function selRating(btn,val){
  document.querySelectorAll('.rbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ratingVal').value=val;
}
function toggleRisk(tag){tag.classList.toggle('active')}

// ═══════════════════════════════════════════════
// CHECKLIST DYNAMIC
// ═══════════════════════════════════════════════
const CLData={
  common:{title:'📋 Hồ sơ pháp lý chung (Bắt buộc)',items:[
    {l:'CCCD/CMND còn hiệu lực (photo công chứng)',r:true},
    {l:'Hộ khẩu / Xác nhận cư trú (photo công chứng)',r:true},
    {l:'Đăng ký kết hôn / Xác nhận độc thân',r:true},
    {l:'Đơn đề nghị vay vốn (mẫu Agribank)',r:true},
    {l:'Giấy xác nhận tình trạng HKTT (nếu khác quê)',r:false},
  ]},
  han_muc:{title:'🏭 Hồ sơ SXKD / Hạn mức tín dụng',items:[
    {l:'Giấy đăng ký kinh doanh / HKD còn hiệu lực',r:true},
    {l:'Phương án SXKD / Kế hoạch sử dụng vốn',r:true},
    {l:'Hợp đồng mua bán hàng hóa / Đơn đặt hàng',r:false},
    {l:'Bảng kê xuất nhập tồn hàng hóa 3 tháng',r:false},
    {l:'Báo cáo tài chính / Sổ sách kế toán năm trước',r:true},
    {l:'Sao kê TK ngân hàng 6 tháng',r:false},
  ]},
  tieu_dung:{title:'👤 Hồ sơ vay tiêu dùng',items:[
    {l:'Hợp đồng lao động / Quyết định tuyển dụng',r:true},
    {l:'Sao kê lương 3-6 tháng gần nhất',r:true},
    {l:'Xác nhận thu nhập của cơ quan (nếu cần)',r:false},
    {l:'Hóa đơn / HĐ mua sắm mục đích vay (nếu có)',r:false},
    {l:'Báo giá tài sản mua sắm',r:false},
  ]},
  the_chap:{title:'🏠 Hồ sơ mua nhà / BĐS',items:[
    {l:'Hợp đồng mua bán nhà / BĐS (bản chính)',r:true},
    {l:'Sổ đỏ/Sổ hồng BĐS mua (nếu đã có)',r:false},
    {l:'Giấy phép xây dựng (nếu xây mới)',r:false},
    {l:'Bảng vẽ thiết kế nhà',r:false},
    {l:'Giấy xác nhận không tranh chấp tài sản',r:false},
  ]},
  cam_co:{title:'🏦 Hồ sơ cầm cố STK',items:[
    {l:'Sổ tiết kiệm / Giấy tờ cầm cố gốc',r:true},
    {l:'Xác nhận sổ còn hiệu lực từ TCTD phát hành',r:true},
    {l:'Hợp đồng cầm cố (mẫu Agribank)',r:true},
  ]},
  tsdb:{title:'🏠 Hồ sơ tài sản đảm bảo (TSĐB)',items:[
    {l:'Giấy CN quyền sử dụng đất (Sổ đỏ/Hồng)',r:true},
    {l:'Trích lục địa chính / Bản vẽ thửa đất',r:false},
    {l:'Biên bản định giá TSĐB của Agribank',r:true},
    {l:'Giấy xác nhận không tranh chấp TSĐB',r:false},
    {l:'Hợp đồng bảo hiểm tài sản',r:false},
    {l:'Hợp đồng thế chấp (bản chính)',r:true},
    {l:'Chứng thư công chứng HĐ thế chấp',r:true},
  ]},
};

function updateChecklist(){
  const body=document.getElementById('cl-body');
  const secs=['common',curLT,'tsdb'];
  let totalItems=0,checkedItems=0,html='';
  secs.forEach(key=>{
    const sec=CLData[key]; if(!sec)return;
    html+=`<div class="cl-sec"><div class="cl-title">${sec.title}</div><div class="cl-grid">`;
    sec.items.forEach((item,idx)=>{
      totalItems++;
      const id=`cl_${key}_${idx}`;
      html+=`<label class="cl-item" id="cli_${key}_${idx}">
        <input type="checkbox" id="${id}" onchange="updateClItem('cli_${key}_${idx}',this)">
        <span class="cl-label">${item.l}</span>
        <span class="cl-badge ${item.r?'req':'opt'}">${item.r?'Bắt buộc':'Tùy chọn'}</span>
      </label>`;
    });
    html+='</div></div>';
  });
  body.innerHTML=html;
  updateClProgress();
}
function updateClItem(id,cb){
  const el=document.getElementById(id);
  if(el)el.classList.toggle('checked',cb.checked);
  updateClProgress();
}
function updateClProgress(){
  const all=document.querySelectorAll('#cl-body input[type=checkbox]').length;
  const chk=document.querySelectorAll('#cl-body input[type=checkbox]:checked').length;
  const sub=document.getElementById('cl-sub');
  if(sub)sub.textContent=`Document Checklist — ${chk}/${all} tài liệu`;
  const nb=document.getElementById('nb10');
  if(nb)nb.textContent=all>0?`${chk}/${all}`:'—';
}

// FIX ⑦: In checklist A4 ─────────────────────────────────────────────────
function printChecklist() {
  const tenKH   = (document.getElementById('tenKH')?.value   || '').trim() || '(Chưa có tên)';
  const soHDTD  = (document.getElementById('soHDTD')?.value  || '').trim() || '—';
  const maKH    = (document.getElementById('maKH')?.value    || '').trim() || '—';
  const ngayIn  = new Date().toLocaleDateString('vi-VN');

  // Thu thập trạng thái checkbox hiện tại
  const body    = document.getElementById('cl-body');
  const items   = [...body.querySelectorAll('label.cl-item')].map(lbl => ({
    checked : lbl.querySelector('input[type=checkbox]')?.checked || false,
    label   : lbl.querySelector('.cl-label')?.textContent?.trim() || '',
    req     : lbl.querySelector('.cl-badge')?.classList.contains('req') || false,
    section : lbl.closest('.cl-sec')?.querySelector('.cl-title')?.textContent?.trim() || '',
  }));

  // Group by section
  const sections = [];
  items.forEach(it => {
    let sec = sections.find(s => s.title === it.section);
    if (!sec) { sec = { title: it.section, items: [] }; sections.push(sec); }
    sec.items.push(it);
  });

  const rowsHtml = sections.map(sec => `
    <tr><td colspan="3" style="background:#1a2540;color:#fff;font-weight:700;padding:5px 8px;font-size:11px">${sec.title}</td></tr>
    ${sec.items.map((it, i) => `
      <tr style="background:${i%2===0?'#fff':'#f8f9fb'}">
        <td style="width:26px;text-align:center;font-size:14px">${it.checked ? '☑' : '☐'}</td>
        <td style="padding:4px 8px;font-size:11px">${it.label}</td>
        <td style="width:70px;text-align:center">
          <span style="font-size:9.5px;padding:1px 5px;border-radius:3px;background:${it.req?'#fee2e2':'#f0fdf4'};color:${it.req?'#991b1b':'#166534'};font-weight:600">${it.req?'Bắt buộc':'Tùy chọn'}</span>
        </td>
      </tr>`).join('')}
  `).join('');

  const total   = items.length;
  const checked = items.filter(i => i.checked).length;

  const win = window.open('', '_blank', 'width=794,height=1123');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Checklist — ${tenKH}</title>
  <style>
    @page { size:A4; margin:18mm 16mm; }
    @media print { body{margin:0} .no-print{display:none} }
    body{font-family:'Times New Roman',serif;font-size:12px;color:#111;margin:0;padding:16px}
    h2{font-size:14px;text-align:center;margin:0 0 2px;text-transform:uppercase;letter-spacing:.5px}
    .meta{text-align:center;font-size:11px;color:#444;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin-bottom:12px}
    td,th{border:1px solid #bbb;vertical-align:middle}
    .progress{background:#f0f4ff;border:1px solid #c5d0e8;border-radius:4px;padding:6px 12px;font-size:11px;margin-bottom:8px;display:flex;gap:16px;align-items:center}
    .sign{margin-top:18px;display:flex;justify-content:space-between}
    .sign-box{text-align:center;width:42%;font-size:11px}
    .sign-box .title{font-weight:700;margin-bottom:40px}
    .sign-box .name{border-top:1px solid #666;padding-top:3px}
    .btn{padding:6px 18px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;margin:0 4px}
  </style></head><body>
  <div class="no-print" style="text-align:center;margin-bottom:12px">
    <button class="btn" style="background:#1a2540;color:#fff" onclick="window.print()">🖨️ In ngay</button>
    <button class="btn" style="background:#eee;color:#333" onclick="window.close()">✕ Đóng</button>
  </div>
  <h2>AGRIBANK CHI NHÁNH NAM ĐỊNH</h2>
  <h2 style="margin-bottom:6px">CHECKLIST HỒ SƠ GIẤY TỜ</h2>
  <div class="meta">Khách hàng: <strong>${tenKH}</strong> &nbsp;|&nbsp; Mã KH: <strong>${maKH}</strong> &nbsp;|&nbsp; Số HĐTD: <strong>${soHDTD}</strong></div>
  <div class="meta">Ngày in: ${ngayIn}</div>
  <div class="progress">
    <span>Tiến độ: <strong>${checked}/${total}</strong> tài liệu đã thu thập</span>
    <span style="flex:1;background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
      <span style="display:block;height:100%;width:${Math.round(checked/total*100)||0}%;background:#16a34a;border-radius:4px"></span>
    </span>
    <span><strong>${Math.round(checked/total*100)||0}%</strong></span>
  </div>
  <table>${rowsHtml}</table>
  <div class="sign">
    <div class="sign-box"><div class="title">CÁN BỘ THU HỒ SƠ</div><div class="name">(Ký, ghi rõ họ tên)</div></div>
    <div class="sign-box"><div class="title">KHÁCH HÀNG</div><div class="name">(Ký, ghi rõ họ tên)</div></div>
  </div>
  </body></html>`);
  win.document.close();
}

// ═══════════════════════════════════════════════
// PROGRESS & SCROLL SPY
// ═══════════════════════════════════════════════
const requiredIds=['nguoiQHKH','nguoiThamDinh','nguoiDuyet','tenKH','cmnd','sdt','mucDichVay','soTienVay','thoiHan','laiSuat'];
function updateProgress(){
  // FIX ②: Scope trong #page-hsvv — tránh đếm nhầm input sidebar/modal/QLTD
  const _hsvv=document.getElementById('page-hsvv');
  if(!_hsvv)return;
  const SEL='input:not([readonly]):not([type=checkbox]):not([type=hidden]),select,textarea';
  const all=_hsvv.querySelectorAll(SEL);
  let f=0;
  all.forEach(el=>{if(el.value&&el.value.trim())f++;});
  const pct=all.length>0?Math.round(f/all.length*100):0;
  document.getElementById('hsvv-pgFill').style.width=pct+'%';
  document.getElementById('hsvv-pgPct').textContent=pct+'%';
  const sIds=['s0','s1','s2','s3','s4','s5','s_td','s6','s7','s8','s9'];
  sIds.forEach((sid,i)=>{
    const sec=document.getElementById(sid); if(!sec)return;
    const ins=sec.querySelectorAll(SEL);
    let ff=0; ins.forEach(el=>{if(el.value&&el.value.trim())ff++;});
    const nb=document.getElementById(`nb${i}`);
    if(nb)nb.textContent=ins.length>0?`${ff}/${ins.length}`:'—';
  });
}
function gotoSec(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
function updateScrollSpy(){
  const ids=['s0','s1','s2','s3','s4','s5','s_td','s6','s7','s8','s9','s10'];
  let cur='s0';
  ids.forEach(id=>{const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=110)cur=id;});
  document.querySelectorAll('.nav').forEach((nav,i)=>{
    nav.classList.toggle('active',ids[i]===cur);
  });
}

// ═══════════════════════════════════════════════
// COLLECT DATA — maps to APC field names
// ═══════════════════════════════════════════════
function collectData(){
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const gn=id=>parseFloat(document.getElementById(id)?.value)||0;
  return {
    // Hành chính
    '[Số HĐ tín dụng]':g('soHDTD'),
    '[Ngày HĐ tín dụng]':g('ngayHDTD'),
    '[Số HĐ tín dụng cũ]':g('soHDTDCu'),
    '[Ngày HĐ tín dụng cũ]':g('ngayHDTDCu'),
    '[Ngày giao-nhận]':g('ngayGiaoNhan'),
    '[Ngày bìa HS]':g('ngayBia'),
    '[Ngày CIC]':g('ngayCIC'),
    '[Số ủy quyền TD]':g('soUyQuyen'),
    '[Người QHKH/QLN]':g('nguoiQHKH'),
    '[Người thẩm định]':g('nguoiThamDinh'),
    '[Người duyệt]':g('nguoiDuyet'),
    '[Chức vụ người duyệt]':g('chucVuDuyet'),
    '[Thể loại vay]':g('theLoaiVay'),
    // KH
    '[Mã khách hàng]':g('maKH'),
    '[Tài khoản thanh toán]':g('tkTT'),
    '[Xưng hô]':g('xungHo'),
    '[Nam/nữ]':g('gioiTinh'),
    '[Tên khách hàng vay]':g('tenKH'),
    '[Tên khách hàng in hoa]':g('tenKHHoa'),
    '[Loại CMND]':g('loaiCMND'),
    '[CMND]':g('cmnd'),
    '[Năm sinh người vay]':g('ngaySinh'),
    '[Địa chỉ]':g('diaChi'),
    '[Địa chỉ theo hộ khẩu]':g('diaChiHK'),
    '[Số điện thoại]':g('sdt'),
    '[Nghề nghiệp]':g('ngheNghiep'),
    '[Địa chỉ kinh doanh]':g('diaChiKD'),
    '[Đăng ký kinh doanh số]':g('dkkd'),
    '[Bên vay]':g('benVay'),
    // Người thừa kế
    '[Người thừa kế]':g('tenTK'),
    '[Người thừa kế viết hoa]':g('tenTKHoa'),
    '[Xưng hô người thừa kế]':g('xungHoTK'),
    '[Quan hệ người thừa kế]':g('quanHeTK'),
    '[Loại CMT người thừa kế]':g('loaiCMNDTK'),
    '[Năm sinh người thừa kế]':g('ngaySinhTK'),
    '[CMT người thừa kế]':g('cmndTK'),
    '[Địa chỉ người thừa kế]':g('diaChiTK'),
    '[Hộ khẩu người thừa kế]':g('hoKhauTK'),
    // Khoản vay
    '[Mục đích vay]':g('mucDichVay'),
    '[Mục đích vay cụ thể]':g('mucDichCuThe'),
    '[Phương thức thanh toán]':g('phuongThucTT'),
    '[Số tiền vay]':gn('soTienVay'),
    '[Số tiền vay bằng chữ]':g('soTienVayBC'),
    '[HMTD duyệt]':gn('hmtdDuyet'),
    '[HMTD duyệt bằng chữ]':g('hmtdDuyetBC'),
    '[Thời hạn vay]':g('thoiHan'),
    '[Lãi suất vay]':g('laiSuat'),
    '[Ngày đến hạn HMTD]':g('ngayDenHan'),
    '[Ngày trả nợ cuối cùng]':g('ngayTraNoCuoi'),
    '[Dư nợ]':gn('duNo'),
    '[Dư nợ bằng chữ]':g('duNoBC'),
    '[Tổng nhu cầu vốn]':gn('ncv'),
    '[Vốn tự có]':gn('vonTuCo'),
    '[Tỷ lệ vốn tự có]':g('tyLeVTC'),
    '[Thu nhập năm trước]':gn('thuNhapNamTruoc'),
    '[Chấm điểm]':g('chamDiem'),
    '[Xếp hạng]':g('xepHangKH'),
    // Phương án
    '[Về phương diện kỹ thuật]':g('ktThuat'),
    '[Thị trường đầu vào]':g('ttDauVao'),
    '[Thị trường đầu ra]':g('ttDauRa'),
    '[Tổng doanh thu từ kinh doanh]':gn('doanhThu'),
    '[Lợi nhuận]':gn('loiNhuan'),
    '[Số tiền lãi vay]':gn('laiVay'),
    '[Số tiền lãi vay cụ thể]':g('laiVayCuThe'),
    '[Thuế nộp nhà nước]':gn('thueNN'),
    // CĐ XGN
    '[Hàng hoá các loại]':gn('hangHoa'),
    '[Hàng hoá các loại bằng chữ]':g('hangHoaBC'),
    '[Tiền mặt]':gn('tienMat'),
    '[Nợ phải thu]':gn('noPT'),
    '[Nợ phải thu bằng chữ]':g('noPTBC'),
    '[Nợ người bán]':gn('noNguoiBan'),
    '[Nợ phải trả]':gn('noPTra'),
    '[Nợ phải trả bằng chữ]':g('noPTraBC'),
    '[Nguồn thu từ hoạt động kinh doanh chính]':gn('nguonThuChinh'),
    // TSĐB
    '[SĐ.Chủ tài sản]':g('chuTS'),
    '[SĐ.Chủ tài sản viết hoa]':g('chuTSHoa'),
    '[SĐ.Xưng hô chủ tài sản]':g('xhChuTS'),
    '[SĐ.CMT chủ tài sản]':g('cmndChuTS'),
    '[SĐ.Loại CMT chủ tài sản]':g('loaiCMTChuTS'),
    '[SĐ.Địa chỉ chủ tài sản]':g('diaChiChuTS'),
    '[SĐ.Địa chỉ hộ khẩu chủ tài sản]':g('hkChuTS'),
    '[SĐ.Người thừa kế chủ tài sản]':g('tkChuTS'),
    '[SĐ.Người thừa kế chủ tài sản viết hoa]':g('tkChuTSHoa'),
    '[SĐ.Quan hệ thừa kế chủ tài sản]':g('qhTKChuTS'),
    '[SĐ.CMT thừa kế chủ tài sản]':g('cmtTKChuTS'),
    '[SĐ.Bên thế chấp]':g('benTheChap'),
    '[SĐ.Tên TSBĐ]':g('tenTSBD'),
    '[SĐ.Loại đất]':g('loaiDat'),
    '[SĐ.Số bìa đỏ]':g('soBiaDo'),
    '[SĐ.Địa chỉ đất]':g('diaChiDat'),
    '[SĐ.Diện tích đất]':g('dtDat'),
    '[SĐ.DTĐ bằng chữ]':g('dtDatBC'),
    '[SĐ.Số thửa]':g('soThua'),
    '[SĐ.Số tờ bản đồ]':g('soToBanDo'),
    '[SĐ.Thời hạn sử dụng]':g('thoiHanSD'),
    '[SĐ.Nguồn gốc]':g('nguonGoc'),
    '[SĐ.Đặc điểm nhà]':g('dacDiemNha'),
    '[SĐ.Kết cấu nhà]':g('ketCauNha'),
    '[SĐ.Số tầng]':g('soTang'),
    '[SĐ.Số BBĐG]':g('soBBDG'),
    '[SĐ.Ngày BBĐG]':g('ngayBBDG'),
    '[SĐ.Giá đất G0]':gn('giaDatG0'),
    '[SĐ.Giá trị m2 nhà]':gn('giaTriM2Nha'),
    '[SĐ.Diện tích XD]':g('dtXD'),
    '[SĐ.Diện tích SD]':g('dtSD'),
    '[SĐ.Giá trị đất]':gn('giaTriDat'),
    '[SĐ.Giá trị nhà]':gn('giaTriNha'),
    '[SĐ.Tổng giá trị TS]':gn('tongGTTS_sd'),
    '[SĐ.TGTTS bằng chữ]':g('tongGTTSBC'),
    '[SĐ.Nghĩa vụ bảo đảm]':gn('nghiaVuBD'),
    '[SĐ.GTCV / GTTS]':g('ltv_sd'),
    '[SĐ.Số HĐ thế chấp]':g('soHDTC'),
    '[SĐ.Ngày ký HĐTC]':g('ngayKyHDTC'),
    '[SĐ.Giá trị xe ôtô]':gn('giaTriXe'),
    '[SĐ.Giá trị xe ôtô bằng chữ]':g('giaTriXeBC'),
    // Nhận nợ
    '[Ngày nhận nợ]':g('ngayNhanNo'),
    '[Thời hạn trả nợ cuối]':g('thoiHanTraNoCuoi'),
    '[Số tiền nhận nợ NN]':gn('soTienNN'),
    '[Số tiền nhận nợ NN bằng chữ]':g('soTienNNBC'),
    '[Người thụ hưởng]':g('nthNN'),
    '[CCCD/Căn cước]':g('cmndNthNN'),
    '[Địa chỉ người thụ hưởng]':g('diaChiNthNN'),
    '[TK người thụ hưởng]':g('tkNthNN'),
    '[Mở tại ngân hàng]':g('moTaiNH'),
    // Meta
    '_loanType':curLT,
    '_rating':document.getElementById('ratingVal')?.value||'',
    '_risks':Array.from(document.querySelectorAll('.rtag.active')).map(t=>t.textContent.trim()),
    '_savedAt':new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════
// COPY APC (tab-delimited for Excel paste)
// ═══════════════════════════════════════════════
function copyAPC(){
  const d=collectData();
  const lines=Object.entries(d)
    .filter(([k])=>k.startsWith('['))
    .map(([k,v])=>`${k}\t${v}`)
    .join('\n');
  navigator.clipboard.writeText(lines).then(()=>showModal('📋 Đã copy APC','Dữ liệu APC đã được copy vào clipboard theo format 2 cột (Trường | Giá trị). Bạn có thể paste thẳng vào Excel hoặc file template APC.'));
}

// ═══════════════════════════════════════════════
// EXPORT APC EXCEL (2 cột giống file mẫu)
// ═══════════════════════════════════════════════
async function exportAPC(){
  if(typeof XLSX==='undefined'){ try{await loadSheetJS();}catch(e){alert('Không tải được thư viện XLSX.\nCần kết nối internet.');return;} }
  const d=collectData();
  const rows=[['TRƯỜNG APC','GIÁ TRỊ']];
  Object.entries(d).filter(([k])=>k.startsWith('[')).forEach(([k,v])=>rows.push([k,v]));
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:42},{wch:60}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'APC');
  XLSX.writeFile(wb,`APC_${d['[Số HĐ tín dụng]']||'Draft'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ═══════════════════════════════════════════════
// EXPORT FULL EXCEL (multi-sheet)
// ═══════════════════════════════════════════════
async function exportExcel(){
  if(typeof XLSX==='undefined'){ try{await loadSheetJS();}catch(e){alert('Không tải được thư viện XLSX.\nCần kết nối internet.');return;} }
  const d=collectData();
  const wb=XLSX.utils.book_new();
  // Sheet 1: Tóm tắt
  const s1=[
    ['BÁO CÁO ĐỀ XUẤT TÍN DỤNG — AGRIBANK'],[''],
    ['Số HĐ TD:',d['[Số HĐ tín dụng]'],'Ngày:',d['[Ngày HĐ tín dụng]']],
    ['CBTD:',d['[Người QHKH/QLN]'],'Thẩm định:',d['[Người thẩm định]']],
    ['Người duyệt:',d['[Người duyệt]'],'Chức vụ:',d['[Chức vụ người duyệt]']],
    [''],
    ['A. KHÁCH HÀNG'],
    ['Họ tên:',d['[Tên khách hàng vay]'],'CCCD:',d['[CMND]']],
    ['Ngày sinh:',d['[Năm sinh người vay]'],'SĐT:',d['[Số điện thoại]']],
    ['Địa chỉ:',d['[Địa chỉ]']],
    ['Nghề nghiệp:',d['[Nghề nghiệp]'],'Mã KH:',d['[Mã khách hàng]']],
    [''],
    ['B. KHOẢN VAY'],
    ['Mục đích:',d['[Mục đích vay]']],
    ['Số tiền:',d['[Số tiền vay]'],'Bằng chữ:',d['[Số tiền vay bằng chữ]']],
    ['Kỳ hạn:',d['[Thời hạn vay]']+' tháng','Lãi suất:',d['[Lãi suất vay]']+'%/năm'],
    ['Thể loại:',d['[Thể loại vay]'],'Đến hạn:',d['[Ngày đến hạn HMTD]']],
    [''],
    ['C. TÀI SẢN ĐẢM BẢO'],
    ['Chủ TS:',d['[SĐ.Chủ tài sản viết hoa]'],'Số GCN:',d['[SĐ.Số bìa đỏ]']],
    ['Tên TSBĐ:',d['[SĐ.Tên TSBĐ]']],
    ['Diện tích đất:',d['[SĐ.Diện tích đất]']+' m²','Tổng GT TS:',d['[SĐ.Tổng giá trị TS]']],
    ['GTCV/GTTS:',d['[SĐ.GTCV / GTTS]'],'Nghĩa vụ BĐ:',d['[SĐ.Nghĩa vụ bảo đảm]']],
    [''],
    ['D. ĐỀ XUẤT'],
    ['Xếp hạng:',d['[Xếp hạng]'],'Quyết định:',document.getElementById('quyetDinh')?.value||'—'],
    ['Nhận xét CBTD:',document.getElementById('nhanXetCBTD')?.value||'—'],
  ];
  const ws1=XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols']=[{wch:22},{wch:35},{wch:18},{wch:35}];
  XLSX.utils.book_append_sheet(wb,ws1,'Tóm tắt hồ sơ');

  // Sheet 2: APC fields
  const s2=[['TRƯỜNG APC','GIÁ TRỊ']];
  Object.entries(d).filter(([k])=>k.startsWith('[')).forEach(([k,v])=>s2.push([k,v]));
  const ws2=XLSX.utils.aoa_to_sheet(s2);
  ws2['!cols']=[{wch:44},{wch:65}];
  XLSX.utils.book_append_sheet(wb,ws2,'APC Fields');

  // Sheet 3: Lịch trả nợ
  const P=parseFloat(document.getElementById('soTienVay')?.value)||0;
  const r=(parseFloat(document.getElementById('laiSuat')?.value)||0)/100/12;
  const n=parseInt(document.getElementById('thoiHan')?.value,10)||0;
  if(P>0&&n>0){
    const rows3=[['Kỳ','Dư nợ đầu kỳ','Gốc','Lãi','Tổng phải trả','Dư nợ cuối kỳ']];
    let bal=P;
    for(let i=1;i<=n;i++){
      const goc=P/n,lai=bal*r;
      rows3.push([i,Math.round(bal),Math.round(goc),Math.round(lai),Math.round(goc+lai),Math.round(bal-goc)]);
      bal-=goc;
    }
    const ws3=XLSX.utils.aoa_to_sheet(rows3);
    ws3['!cols']=[{wch:5},{wch:20},{wch:18},{wch:18},{wch:20},{wch:20}];
    XLSX.utils.book_append_sheet(wb,ws3,'Lịch trả nợ');
  }

  XLSX.writeFile(wb,`HoSoVay_${d['[Số HĐ tín dụng]']||'Draft'}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════
// DOCXTEMPLATER — XUẤT HỒ SƠ VAY VỐN RA FILE .DOCX CHUẨN
// ═══════════════════════════════════════════════════════════════════════
// Yêu cầu: PizZip + Docxtemplater đã load qua CDN ở <head>
//          File template: HoSoVayVon_Template.docx cùng thư mục HTML
// ═══════════════════════════════════════════════════════════════════════

// ── 1. QUẢN LÝ DANH SÁCH TÀI SẢN BẢO ĐẢM ──────────────────────────────────
// Mảng lưu trữ các tài sản, mỗi phần tử là object:
// { tenTS, soBiaDo, diaChiTS, giaTS }
let _tsbdData = [];

function tsbdRender() {
  const wrap = document.getElementById('tsbd-rows');
  const badge = document.getElementById('tsbd-count');
  if (!wrap) return;
  if (_tsbdData.length === 0) {
    wrap.innerHTML = '<p style="font-size:11px;color:#9AACBE;padding:6px 0">Chưa có tài sản nào. Nhấn "＋ Thêm tài sản" hoặc "🔄 Lấy từ form".</p>';
    badge.textContent = '0 TS';
    return;
  }
  badge.textContent = _tsbdData.length + ' TS';
  wrap.innerHTML = _tsbdData.map((ts, i) => `
    <div class="ts-row" id="ts-row-${i}">
      <input type="text"   value="${escHtml(ts.tenTS)}"   placeholder="Tên / mô tả tài sản"
             oninput="_tsbdData[${i}].tenTS=this.value;tsbdBadge()" />
      <input type="text"   value="${escHtml(ts.soBiaDo)}" placeholder="Số bìa đỏ / GCN"
             oninput="_tsbdData[${i}].soBiaDo=this.value" />
      <input type="text"   value="${escHtml(ts.diaChiTS)}" placeholder="Địa chỉ tài sản"
             oninput="_tsbdData[${i}].diaChiTS=this.value" />
      <input type="text"   value="${escHtml(ts.giaTS)}"   placeholder="VD: 2,500,000,000"
             oninput="_tsbdData[${i}].giaTS=this.value" />
      <button class="ts-del" onclick="tsbdDelRow(${i})" title="Xóa tài sản này">✕</button>
    </div>`).join('');
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function tsbdBadge() {
  const badge = document.getElementById('tsbd-count');
  if (badge) badge.textContent = _tsbdData.length + ' TS';
}

function tsbdAddRow() {
  _tsbdData.push({ tenTS:'', soBiaDo:'', diaChiTS:'', giaTS:'' });
  tsbdRender();
  // Focus vào input đầu tiên của dòng mới
  setTimeout(() => {
    const rows = document.querySelectorAll('.ts-row');
    if (rows.length) rows[rows.length-1].querySelector('input')?.focus();
  }, 50);
}

function tsbdDelRow(i) {
  _tsbdData.splice(i, 1);
  tsbdRender();
}

function tsbdFillFromForm() {
  // Tự động lấy thông tin từ các field TSBĐ đơn lẻ trong form
  const g = id => (document.getElementById(id)?.value || '').trim();
  const tenTS    = g('tenTSBD');
  const soBiaDo  = g('soBiaDo');
  const diaChiTS = g('diaChiDat');
  const giaTS    = fmtSoTien(document.getElementById('tongGTTS_sd')?.value);

  if (!tenTS && !soBiaDo && !diaChiTS) {
    showToast('⚠️ Chưa có thông tin TSBĐ trong form để lấy', 'red'); return;
  }
  // Nếu tài sản này chưa có trong danh sách thì thêm
  const exists = _tsbdData.some(ts => ts.tenTS === tenTS && ts.soBiaDo === soBiaDo);
  if (exists) {
    showToast('⚠️ Tài sản này đã có trong danh sách', 'red'); return;
  }
  _tsbdData.push({ tenTS, soBiaDo, diaChiTS, giaTS });
  tsbdRender();
  showToast('✅ Đã thêm tài sản từ form vào danh sách!', 'green');
}

// Khởi tạo panel khi page load
document.addEventListener('DOMContentLoaded', () => { tsbdRender(); });

// ── 2. HELPER FORMAT ────────────────────────────────────────────────────────
function fmtSoTien(v) {
  const n = parseFloat(v);
  if (!n) return '';
  return n.toLocaleString('vi-VN');
}

function fmtDate(isoStr) {
  // Chuyển YYYY-MM-DD → DD/MM/YYYY
  if (!isoStr) return '';
  const m = isoStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoStr;
}

// ── 3. THU THẬP DỮ LIỆU DOCX ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
// collectDocxData() — ĐẦY ĐỦ v2 — 146 main fields + 82 ts.* fields
// Khớp 100% README_HUONG_DAN.md + 41 file docx template
// Delimiter {{ }} — cấu hình trong xuatHoSoDocx()
// ═══════════════════════════════════════════════════════════════════════
function collectDocxData() {
  const g   = id => (document.getElementById(id)?.value || '').trim();
  const gn  = id => parseFloat(document.getElementById(id)?.value) || 0;
  const fmt = v  => v ? Number(v).toLocaleString('vi-VN') : '';
  const fmtMoney = id => fmt(document.getElementById(id)?.value);
  const fmtRound = v  => v ? Math.round(Number(v) / 1e6) * 1e6 : 0;

  // ── Helpers (dùng functions đã khai báo trong engine) ──
  const fmtDate = iso => isoToDisplay(iso);   // DD/MM/YYYY
  const fmtChu  = iso => isoToChu(iso);        // ngày DD tháng MM năm YYYY

  // ── Tài sản bảo đảm ──────────────────────────────────────────────────
  const _raw = (typeof _tsbdData !== 'undefined' && _tsbdData.length > 0)
    ? _tsbdData : [{ _fromForm: true }];

  const tai_san = _raw.map((ts, i) => ({
    'loop.index':                       String(i + 1),
    // Chủ tài sản
    'Mã khách hàng chủ tài sản':        ts._fromForm ? g('maKH')         : (ts.maKH         || g('maKH')),
    'Chủ tài sản':                      ts._fromForm ? g('chuTS')        : (ts.chuTS        || g('chuTS')),
    'Chủ tài sản viết hoa':             ts._fromForm ? g('chuTSHoa')     : (ts.chuTSHoa     || g('chuTSHoa')),
    'Xưng hô chủ tài sản':              ts._fromForm ? g('xhChuTS')      : (ts.xhChuTS      || g('xhChuTS')),
    'Năm sinh chủ tài sản':              ts._fromForm ? isoToDisplay(g('ngaySinhChuTS')) : isoToDisplay(ts.ngaySinhChuTS || g('ngaySinhChuTS')),
    'CMT chủ tài sản':                  ts._fromForm ? g('cmndChuTS')    : (ts.cmndChuTS    || g('cmndChuTS')),
    'Loại CMT chủ tài sản':             ts._fromForm ? g('loaiCMTChuTS') : (ts.loaiCMTChuTS || g('loaiCMTChuTS')),
    'Địa chỉ chủ tài sản':              ts._fromForm ? g('diaChiChuTS')  : (ts.diaChiChuTS  || g('diaChiChuTS')),
    'Địa chỉ hộ khẩu chủ tài sản':     ts._fromForm ? g('hkChuTS')      : (ts.hkChuTS      || g('hkChuTS')),
    'Người thừa kế chủ tài sản':        ts._fromForm ? g('tkChuTS')      : (ts.tkChuTS      || g('tkChuTS')),
    'Người thừa kế chủ tài sản viết hoa':ts._fromForm ? g('tkChuTSHoa') : (ts.tkChuTSHoa   || g('tkChuTSHoa')),
    'Xưng hô thừa kế chủ tài sản':      ts._fromForm ? g('xhTKChuTS')   : (ts.xhTKChuTS    || g('xhTKChuTS')),
    'Quan hệ thừa kế chủ tài sản':      ts._fromForm ? g('qhTKChuTS')   : (ts.qhTKChuTS    || g('qhTKChuTS')),
    'Loại CMT thừa kế chủ tài sản':     ts._fromForm ? g('loaiCMTTKChuTS') : (ts.loaiCMTTKChuTS || g('loaiCMTTKChuTS')),
    'Năm sinh thừa kế chủ tài sản':     ts._fromForm ? isoToDisplay(g('ngaySinhTKChuTS')) : isoToDisplay(ts.ngaySinhTKChuTS || g('ngaySinhTKChuTS')),
    'Địa chỉ thừa kế chủ tài sản':      ts._fromForm ? g('diaChiTKChuTS') : (ts.diaChiTKChuTS || g('diaChiTKChuTS')),
    'Hộ khẩu thừa kế chủ tài sản':      ts._fromForm ? g('hkTKChuTS')     : (ts.hkTKChuTS     || g('hkTKChuTS')),
    'CMT thừa kế chủ tài sản':          ts._fromForm ? g('cmtTKChuTS')  : (ts.cmtTKChuTS   || g('cmtTKChuTS')),
    'Bên thế chấp':                     ts._fromForm ? g('benTheChap')   : (ts.benTheChap   || g('benTheChap')),
    // Tài sản
    'Tên TSBĐ':                         ts._fromForm ? g('tenTSBD')      : (ts.tenTSBD      || g('tenTSBD')),
    'Số bìa đỏ':                        ts._fromForm ? g('soBiaDo')      : (ts.soBiaDo      || g('soBiaDo')),
    'Địa chỉ đất':                      ts._fromForm ? g('diaChiDat')    : (ts.diaChiDat    || g('diaChiDat')),
    'Đặc điểm nhà':                     ts._fromForm ? g('dacDiemNha')   : (ts.dacDiemNha   || g('dacDiemNha')),
    'Đặc điểm nhà trên bìa':            ts._fromForm ? g('dacDiemNha')   : (ts.dacDiemNha   || g('dacDiemNha')),
    'Diện tích đất':                    ts._fromForm ? g('dtDat')        : (ts.dtDat        || g('dtDat')),
    'DTĐ bằng chữ':                     ts._fromForm ? g('dtDatBC')      : (ts.dtDatBC      || g('dtDatBC')),
    'Số thửa':                          ts._fromForm ? g('soThua')       : (ts.soThua       || g('soThua')),
    'Số tờ bản đồ':                     ts._fromForm ? g('soToBanDo')    : (ts.soToBanDo    || g('soToBanDo')),
    'Loại đất':                         ts._fromForm ? g('loaiDat')      : (ts.loaiDat      || g('loaiDat')),
    'Thời hạn sử dụng':                 ts._fromForm ? g('thoiHanSD')    : (ts.thoiHanSD    || g('thoiHanSD')),
    'Nguồn gốc':                        ts._fromForm ? g('nguonGoc')     : (ts.nguonGoc     || g('nguonGoc')),
    'Diện tích XD':                     ts._fromForm ? g('dtXD')         : (ts.dtXD         || g('dtXD')),
    'Diện tích sàn':                    ts._fromForm ? g('dtSD')         : (ts.dtSD         || g('dtSD')),
    'Diện tích SD':                     ts._fromForm ? g('dtSD')         : (ts.dtSD         || g('dtSD')),
    'Kết cấu nhà':                      ts._fromForm ? g('ketCauNha')    : (ts.ketCauNha    || g('ketCauNha')),
    'Số tầng':                          ts._fromForm ? g('soTang')       : (ts.soTang       || g('soTang')),
    'Vị trí theo bảng giá đất':         ts._fromForm ? g('viTriBGD')     : (ts.viTriBGD     || g('viTriBGD')),
    'Số BBĐG':                          ts._fromForm ? g('soBBDG')       : (ts.soBBDG       || g('soBBDG')),
    'Ngày cấp sổ bìa đỏ':               ts._fromForm ? fmtDate(g('ngayBiaDo')) : fmtDate(ts.ngayBiaDo || g('ngayBiaDo')),
    'Ngày BBĐG':                        ts._fromForm ? fmtDate(g('ngayBBDG')) : fmtDate(ts.ngayBBDG || g('ngayBBDG')),
    'Giá đất G0':                       ts._fromForm ? fmtMoney('giaDatG0')   : fmt(ts.giaDatG0    || gn('giaDatG0')),
    'Giá trị m2 nhà':                   ts._fromForm ? fmtMoney('giaTriM2Nha'): fmt(ts.giaTriM2Nha || gn('giaTriM2Nha')),
    'Giá trị nhà':                      ts._fromForm ? fmtMoney('giaTriNha')  : fmt(ts.giaTriNha   || gn('giaTriNha')),
    'Giá trị nhà làm tròn số':          ts._fromForm ? fmt(fmtRound(gn('giaTriNha'))) : fmt(fmtRound(ts.giaTriNha || gn('giaTriNha'))),
    'Giá trị đất':                      ts._fromForm ? fmtMoney('giaTriDat')  : fmt(ts.giaTriDat   || gn('giaTriDat')),
    'Tổng giá trị TS':                  ts._fromForm ? fmtMoney('tongGTTS_sd'): fmt(ts.tongGTTS_sd  || gn('tongGTTS_sd')),
    'Tổng Tổng giá trị TS':             ts._fromForm ? fmtMoney('tongGTTS_sd'): fmt(ts.tongGTTS_sd  || gn('tongGTTS_sd')),
    'TGTTS bằng chữ':                   ts._fromForm ? g('tongGTTSBC')    : (ts.tongGTTSBC   || g('tongGTTSBC')),
    'Nghĩa vụ bảo đảm':                 ts._fromForm ? fmtMoney('nghiaVuBD')  : fmt(ts.nghiaVuBD   || gn('nghiaVuBD')),
    'NVBĐ bằng chữ':                    ts._fromForm ? g('nvbdBC')        : (ts.nvbdBC       || g('nvbdBC') || (gn('nghiaVuBD')>0 ? numToWords(gn('nghiaVuBD')) : '')),
    'NVĐB cho KV':                       ts._fromForm ? fmtMoney('nghiaVuBD')  : fmt(ts.nghiaVuBD   || gn('nghiaVuBD')),
    'NVĐB cho KV bằng chữ':             ts._fromForm ? g('nvbdBC')        : (ts.nvbdBC       || g('nvbdBC')),
    'GTCV / GTTS':                      ts._fromForm ? g('ltv_sd')        : (ts.ltv_sd       || g('ltv_sd')),
    'Giá trị cho vay / Giá trị TS':     ts._fromForm ? g('ltv_sd')        : (ts.ltv_sd       || g('ltv_sd')),
    'Số HĐ thế chấp':                   ts._fromForm ? g('soHDTC')        : (ts.soHDTC       || g('soHDTC')),
    'Ngày ký HĐTC':                     ts._fromForm ? g('ngayKyHDTC')    : (ts.ngayKyHDTC   || g('ngayKyHDTC')),
    'Loại HĐTC':                        ts._fromForm ? g('loaiHDTC')      : (ts.loaiHDTC     || g('loaiHDTC')),
  }));

  const ngayIn = new Date().toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });

  return {
    // ── Meta & derived (chỉ khi xuất, không cần trong form) ──
    'Ngày in': ngayIn,
    'Xưng hô Người duyệt': g('xungHoDuyet') || 'Ông/Bà',
    'Xưng hô người duyệt': g('xungHoDuyet') || 'Ông/Bà',

    // ── Ngày tháng ──
    'Ngày giao-nhận':       fmtDate(g('ngayGiaoNhan')),
    'Ngày tháng năm':       fmtChu(g('ngayHDTD')),
    'Ngày tháng năm NN':    fmtChu(g('ngayNhanNo')),
    'Ngày tháng năm nhận nợ':fmtChu(g('ngayNhanNo')),
    'Ngày bìa HS':          fmtDate(g('ngayBia')),
    'Ngày CIC':             fmtDate(g('ngayCIC')),
    'Ngày HĐ tín dụng':    fmtDate(g('ngayHDTD')),
    'Ngày HĐ tín dụng cũ': fmtDate(g('ngayHDTDCu')),
    'Ngày đến hạn HMTD':   fmtDate(g('ngayDenHan')),
    'Ngày nhận nợ':         fmtDate(g('ngayNhanNo')),
    'Ngày trả nợ cuối cùng':fmtDate(g('ngayTraNoCuoi')),
    'Thời hạn trả nợ cuối': fmtDate(g('thoiHanTraNoCuoi')),

    // ── Nhân sự ──
    'Người QHKH/QLN':          g('nguoiQHKH'),
    'Người QHKH/QLN viết hoa': g('nguoiQHKH').toUpperCase(),
    'Người thẩm định':         g('nguoiThamDinh'),
    'Người TĐ/KS':             g('nguoiThamDinh'),
    'Người TĐ/KS viết hoa':    g('nguoiThamDinh').toUpperCase(),
    'Người duyệt':             g('nguoiDuyet'),
    'Người kiểm soát':         g('nguoiThamDinh'),
    'Chức vụ người duyệt':     g('chucVuDuyet'),
    'Chức vụ':                 g('chucVuDuyet'),
    'Số ủy quyền TD':          g('soUyQuyen'),

    // ── Khách hàng ──
    'Tên khách hàng vay':      g('tenKH'),
    'Tên khách hàng':          g('tenKH'),
    'Tên khách hàng in hoa':   g('tenKHHoa'),
    'Tên khách hàng vay viết hoa':g('tenKHHoa'),
    'Mã khách hàng':           g('maKH'),
    'Tài khoản thanh toán':    g('tkTT'),
    'Xưng hô':                 g('xungHo'),
    'Loại CMND':               g('loaiCMND'),
    'CMND':                    g('cmnd'),
    'CCCD/Căn cước':           g('cmnd'),
    'Nam/nữ':                  g('gioiTinh'),
    'Năm sinh người vay':      fmtDate(g('ngaySinh')),
    'Địa chỉ':                 g('diaChi'),
    'Địa chỉ theo hộ khẩu':   g('diaChiHK') || g('diaChi'),
    'Số điện thoại':           g('sdt'),
    'Nghề nghiệp':             g('ngheNghiep'),
    'Đăng ký kinh doanh số':   g('dkkd'),
    'Địa chỉ kinh doanh':      g('diaChiKD'),
    'Bên vay':                 g('benVay'),

    // ── Người thừa kế ──
    'Người thừa kế':           g('tenTK'),
    'Người thừa kế viết hoa':  g('tenTKHoa'),
    'Xưng hô người thừa kế':   g('xungHoTK'),
    'Quan hệ người thừa kế':   g('quanHeTK'),
    'CMT người thừa kế':       g('cmndTK'),
    'Loại CMT người thừa kế':  g('loaiCMNDTK'),
    'Năm sinh người thừa kế':  fmtDate(g('ngaySinhTK')),
    'Địa chỉ người thừa kế':   g('diaChiTK'),
    'Hộ khẩu người thừa kế':   g('hoKhauTK'),

    // ── Khoản vay ──
    'Số HĐ tín dụng':          g('soHDTD'),
    'Số HĐ tín dụng cũ':       g('soHDTDCu'),
    'Thể loại vay':             g('theLoaiVay'),
    'Số tiền vay':              fmtMoney('soTienVay'),
    'Số tiền vay bằng chữ':    g('soTienVayBC'),
    'HMTD duyệt':              fmtMoney('hmtdDuyet'),
    'HMTD duyệt bằng chữ':     g('hmtdDuyetBC'),
    'Hạn mức tín dụng tối đa': fmtMoney('hmtdMax'),
    'Thời hạn vay':             g('thoiHan'),
    'Lãi suất vay':             g('laiSuat'),
    'Mục đích vay':             g('mucDichVay'),
    'Mục đích vay cụ thể':     g('mucDichCuThe'),
    'Dư nợ':                   fmtMoney('duNo'),
    'Dư nợ bằng chữ':          g('duNoBC'),
    'Dư nợ Agribank':          fmtMoney('duNoAGR'),
    'Dư nợ Agribank bằng chữ': g('duNoAGRBC'),
    'Kỳ hạn trả nợ gốc':       g('soKy'),

    // ── Tài chính / phương án ──
    'Tổng nhu cầu vốn':        fmtMoney('ncv'),
    'Vốn tự có':               fmtMoney('vonTuCo'),
    'Tỷ lệ vốn tự có':         g('tyLeVTC'),
    'Vốn bằng tiền':           fmtMoney('vonTien'),
    'Vốn bằng sức lao động':    fmtMoney('vonSLD'),
    'Vốn bằng sức lao động/1.2':fmt(gn('vonSLD')/1.2),
    'Thu nhập năm trước':      fmtMoney('thuNhapNamTruoc'),
    'Doanh thu năm trước':     fmtMoney('dtNamTruoc'),
    'Lợi nhuận năm trước':     fmtMoney('lnNamTruoc'),
    'Chi phí năm trước':       fmtMoney('cpNamTruoc'),
    'Tổng doanh thu từ kinh doanh':fmtMoney('doanhThu'),
    'Lợi nhuận':               fmtMoney('loiNhuan'),
    'Số tiền lãi vay':         fmtMoney('laiVay'),
    'Số tiền lãi vay cụ thể':  g('laiVayCuThe'),
    'Thuế nộp nhà nước':       fmtMoney('thueNN'),
    'Nguồn thu từ HĐKD chính': fmtMoney('nguonThuChinh'),
    'Hàng hoá các loại':       fmtMoney('hangHoa'),
    'Hàng hoá các loại bằng chữ':g('hangHoaBC'),
    'Tiền mặt':                fmtMoney('tienMat'),
    'Nợ phải thu':             fmtMoney('noPT'),
    'Nợ phải thu bằng chữ':    g('noPTBC'),
    'Nợ người bán':            fmtMoney('noNguoiBan'),
    'Nợ phải trả':             fmtMoney('noPTra'),
    'Nợ phải trả bằng chữ':    g('noPTraBC'),
    'Chấm điểm':               g('chamDiem'),
    'Xếp hạng':                g('xepHangKH'),
    'Về phương diện kỹ thuật': g('ktThuat'),
    'Thị trường đầu vào':      g('ttDauVao'),
    'Thị trường đầu ra':       g('ttDauRa'),
    'Vòng quay':               g('ncvVongQuay'),

    // ── Nhận nợ ──
    'Số tiền nhận nợ NN':      fmtMoney('soTienNN'),
    'Số tiền nhận nợ NN bằng chữ':g('soTienNNBC'),
    'Số tiền nhận nợ bằng chữ':g('soTienNNBC'),
    'Số tiền sau khi NN':      fmtMoney('soTienSauNN'),
    'Số tiền sau khi NN bằng chữ':g('soTienSauNNBC'),
    'Người thụ hưởng':         g('nthNN'),
    'TK người thụ hưởng':      g('tkNthNN'),
    'Mở tại ngân hàng':        g('moTaiNH'),
    'Địa chỉ người thụ hưởng': g('diaChiNthNN'),

    // ── Tài sản bảo đảm (mảng loop) ──
    tai_san,

    // Legacy alias (cho template cũ dùng {taiSanList})
    taiSanList: tai_san,
  };
}


// ── 4. HÀM CHÍNH: XUẤT FILE .DOCX ──────────────────────────────────────────
async function xuatHoSoDocx() {
  // Kiểm tra thư viện đã load chưa
  if (typeof PizZip === 'undefined' || typeof window.docxtemplater === 'undefined') {
    showToast('⚠️ Thư viện Docxtemplater chưa tải — kiểm tra kết nối internet', 'red');
    return;
  }

  const toast = TD.toast('⏳ Đang tạo file Word...', { type: 'info', duration: 0 }); // HM-16c

  try {
    // 4a. Tải file template .docx về
    const templateName = 'HoSoVayVon_Template.docx';
    let arrayBuffer;
    try {
      const resp = await fetch(templateName);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      arrayBuffer = await resp.arrayBuffer();
    } catch(e) {
      if (toast) toast.close();
      showToast('❌ Không tìm thấy file template "' + templateName + '".\n Đặt file đó cùng thư mục với BAN_CHUAN.html', 'red');
      console.error('[xuatHoSoDocx] fetch template failed:', e);
      return;
    }

    // 4b. Đọc dữ liệu từ form
    const data = collectDocxData();

    // 4c. Mở template bằng PizZip
    const zip = new PizZip(arrayBuffer);

    // 4d. Khởi tạo Docxtemplater
    const Docxtemplater = window.docxtemplater;
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,   // Vòng lặp không thêm dòng trống thừa
      linebreaks:    true,   // \n trong dữ liệu → xuống dòng trong Word
      delimiters:    { start: '{{', end: '}}' }, // Khớp cú pháp README {{ }}
    });

    // 4e. Điền dữ liệu vào template
    doc.render(data);

    // 4f. Xuất blob và tải về
    const blob = doc.getZip().generate({
      type:     'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });

    const tenKH   = data.tenKH || 'KhachHang';
    const soHD    = data.soHDTD || 'Draft';
    const ngayStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const fileName = `HoSo_${tenKH}_${soHD}_${ngayStr}.docx`;

    // Dùng FileSaver nếu có, fallback nếu không
    if (typeof saveAs === 'function') {
      saveAs(blob, fileName);
    } else {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    }

    if (toast) toast.close();
    showToast(`📄 Xuất thành công: ${fileName}`, 'green');

  } catch (err) {
    if (toast) toast.close();
    // Docxtemplater ném lỗi có cấu trúc khi template sai
    if (err.properties && err.properties.errors) {
      const msgs = err.properties.errors.map(e => e.message).join('\n');
      showToast('❌ Lỗi template: ' + msgs, 'red');
      console.error('[xuatHoSoDocx] template error:', err.properties.errors);
    } else {
      showToast('❌ Lỗi khi tạo file: ' + err.message, 'red');
      console.error('[xuatHoSoDocx]', err);
    }
  }
}

// ── 5. CHỌN TEMPLATE THEO LOẠI HỒ SƠ ───────────────────────────────────────
// Bổ sung sau này: gọi xuatHoSoDocxByType('hdtd') để chọn template khác
const DOCX_TEMPLATES = {
  'hsvv': 'HoSoVayVon_Template.docx',
  // 'hdtd': 'HopDongTinDung_Template.docx',   // ← thêm template khác tại đây
  // 'plu':  'PhuLuc_Template.docx',
};

async function xuatHoSoDocxByType(type = 'hsvv') {
  const tpl = DOCX_TEMPLATES[type];
  if (!tpl) { showToast('❌ Không tìm thấy template: ' + type, 'red'); return; }
  // Tạm thời gọi hàm chính (có thể mở rộng để truyền templateName vào)
  await xuatHoSoDocx();
}

// ═══════════════════════════════════════════════
// EXPORT WORD
// ═══════════════════════════════════════════════
function exportWord(){
  if(typeof docx==='undefined'){alert('Thư viện docx chưa tải');return;}
  const d=collectData();
  const{Document,Packer,Paragraph,Table,TableRow,TableCell,TextRun,HeadingLevel,AlignmentType,WidthType}=docx;
  const h1=t=>new Paragraph({text:t,heading:HeadingLevel.HEADING_1,spacing:{before:300,after:150}});
  const h2=t=>new Paragraph({text:t,heading:HeadingLevel.HEADING_2,spacing:{before:200,after:100}});
  const p=t=>new Paragraph({text:t||'—',spacing:{before:60,after:60}});
  const trow=(lbl,val)=>new TableRow({children:[
    new TableCell({width:{size:38,type:WidthType.PERCENTAGE},children:[new Paragraph({children:[new TextRun({text:lbl,bold:true})],spacing:{before:50,after:50}})]}),
    new TableCell({width:{size:62,type:WidthType.PERCENTAGE},children:[new Paragraph({text:String(val||'—'),spacing:{before:50,after:50}})]})
  ]});
  const mkTable=rows=>new Table({rows,width:{size:100,type:WidthType.PERCENTAGE}});

  const doc=new Document({sections:[{children:[
    new Paragraph({children:[new TextRun({text:'BÁO CÁO ĐỀ XUẤT CẤP TÍN DỤNG',bold:true,size:28})],alignment:AlignmentType.CENTER,spacing:{after:200}}),
    new Paragraph({children:[new TextRun({text:`Số HĐ: ${d['[Số HĐ tín dụng]']} | Ngày: ${d['[Ngày HĐ tín dụng]']}`,size:20})],alignment:AlignmentType.CENTER,spacing:{after:300}}),
    h1('I. THÔNG TIN HÀNH CHÍNH'),
    mkTable([trow('Người QHKH/QLN',d['[Người QHKH/QLN]']),trow('Người thẩm định',d['[Người thẩm định]']),trow('Người duyệt',d['[Người duyệt]']),trow('Chức vụ người duyệt',d['[Chức vụ người duyệt]']),trow('Số ủy quyền TD',d['[Số ủy quyền TD]'])]),
    h1('II. THÔNG TIN KHÁCH HÀNG'),
    mkTable([trow('Họ và tên',d['[Tên khách hàng vay]']),trow('CCCD/CMND',d['[CMND]']),trow('Ngày sinh',d['[Năm sinh người vay]']),trow('Địa chỉ',d['[Địa chỉ]']),trow('Số điện thoại',d['[Số điện thoại]']),trow('Nghề nghiệp',d['[Nghề nghiệp]']),trow('ĐKKD số',d['[Đăng ký kinh doanh số]']),trow('Bên vay',d['[Bên vay]'])]),
    h1('III. THÔNG TIN KHOẢN VAY'),
    mkTable([trow('Thể loại vay',d['[Thể loại vay]']),trow('Mục đích vay',d['[Mục đích vay]']),trow('Số tiền vay',String(d['[Số tiền vay]'])?.replace(/\B(?=(\d{3})+(?!\d))/g,',')+' VNĐ'),trow('Bằng chữ',d['[Số tiền vay bằng chữ]']),trow('HMTD duyệt',String(d['[HMTD duyệt]'])?.replace(/\B(?=(\d{3})+(?!\d))/g,',')+' VNĐ'),trow('Thời hạn',d['[Thời hạn vay]']+' tháng'),trow('Lãi suất',d['[Lãi suất vay]']+'%/năm'),trow('Phương thức TT',d['[Phương thức thanh toán]']),trow('Ngày đến hạn',d['[Ngày đến hạn HMTD]'])]),
    h1('IV. TÀI SẢN ĐẢM BẢO'),
    mkTable([trow('Chủ tài sản',d['[SĐ.Chủ tài sản viết hoa]']),trow('CMT chủ TS',d['[SĐ.CMT chủ tài sản]']),trow('Bên thế chấp',d['[SĐ.Bên thế chấp]']),trow('Tên TSBĐ',d['[SĐ.Tên TSBĐ]']),trow('Số GCN/Bìa đỏ',d['[SĐ.Số bìa đỏ]']),trow('Địa chỉ đất',d['[SĐ.Địa chỉ đất]']),trow('Diện tích đất',d['[SĐ.Diện tích đất]']+' m²'),trow('Tổng giá trị TS',String(d['[SĐ.Tổng giá trị TS]'])?.replace(/\B(?=(\d{3})+(?!\d))/g,',')+' VNĐ'),trow('Nghĩa vụ bảo đảm',String(d['[SĐ.Nghĩa vụ bảo đảm]'])?.replace(/\B(?=(\d{3})+(?!\d))/g,',')+' VNĐ'),trow('GTCV/GTTS',d['[SĐ.GTCV / GTTS]'])]),
    h1('V. ĐÁNH GIÁ TÍN DỤNG & ĐỀ XUẤT'),
    mkTable([trow('Xếp hạng KH',d['[Xếp hạng]']),trow('Chấm điểm',d['[Chấm điểm]']),trow('Quyết định',document.getElementById('quyetDinh')?.value||'—'),trow('Điều kiện kèm theo',document.getElementById('dieuKien')?.value||'—')]),
    h2('Nhận xét CBTD:'),
    p(document.getElementById('nhanXetCBTD')?.value),
    new Paragraph({text:'',spacing:{before:600}}),
    new Paragraph({children:[new TextRun({text:`Ninh Bình, ngày ${new Date().toLocaleDateString('vi-VN')}`,italics:true})],alignment:AlignmentType.RIGHT}),
    new Paragraph({children:[new TextRun({text:'Cán bộ Quan hệ Khách hàng',bold:true})],alignment:AlignmentType.RIGHT}),
    new Paragraph({text:d['[Người QHKH/QLN]']||'__________________',alignment:AlignmentType.RIGHT}),
  ]}]});
  Packer.toBlob(doc).then(blob=>{
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`TorTrinh_${d['[Số HĐ tín dụng]']||'Draft'}.docx`;
    a.click();URL.revokeObjectURL(url);
  });
}

// ═══════════════════════════════════════════════
// SAVE / LOAD JSON
// ═══════════════════════════════════════════════
function saveJSON(){
  const d=collectData();
  const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`HoSo_${d['[Số HĐ tín dụng]']||'Draft'}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();URL.revokeObjectURL(url);
  showModal('💾 Đã lưu','Hồ sơ đã được lưu dưới dạng JSON với đầy đủ trường APC.');
}
function loadJSON(){document.getElementById('hsvv-fi').click();}
function handleLoad(e){
  const f=e.target.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      Object.entries(d).forEach(([k,v])=>{
        if(k.startsWith('_'))return;
        // Find the input by mapping APC key back to element id
        const mapping={'[Số HĐ tín dụng]':'soHDTD','[Ngày HĐ tín dụng]':'ngayHDTD','[Người QHKH/QLN]':'nguoiQHKH','[Người thẩm định]':'nguoiThamDinh','[Người duyệt]':'nguoiDuyet','[Chức vụ người duyệt]':'chucVuDuyet','[Thể loại vay]':'theLoaiVay','[Mã khách hàng]':'maKH','[Tài khoản thanh toán]':'tkTT','[Xưng hô]':'xungHo','[Nam/nữ]':'gioiTinh','[Tên khách hàng vay]':'tenKH','[Loại CMND]':'loaiCMND','[CMND]':'cmnd','[Năm sinh người vay]':'ngaySinh','[Địa chỉ]':'diaChi','[Địa chỉ theo hộ khẩu]':'diaChiHK','[Số điện thoại]':'sdt','[Nghề nghiệp]':'ngheNghiep','[Địa chỉ kinh doanh]':'diaChiKD','[Đăng ký kinh doanh số]':'dkkd','[Người thừa kế]':'tenTK','[Xưng hô người thừa kế]':'xungHoTK','[Quan hệ người thừa kế]':'quanHeTK','[Loại CMT người thừa kế]':'loaiCMNDTK','[Năm sinh người thừa kế]':'ngaySinhTK','[CMT người thừa kế]':'cmndTK','[Địa chỉ người thừa kế]':'diaChiTK','[Hộ khẩu người thừa kế]':'hoKhauTK','[Mục đích vay]':'mucDichVay','[Mục đích vay cụ thể]':'mucDichCuThe','[Phương thức thanh toán]':'phuongThucTT','[Số tiền vay]':'soTienVay','[HMTD duyệt]':'hmtdDuyet','[Thời hạn vay]':'thoiHan','[Lãi suất vay]':'laiSuat','[Ngày đến hạn HMTD]':'ngayDenHan','[Ngày trả nợ cuối cùng]':'ngayTraNoCuoi','[Dư nợ]':'duNo','[Tổng nhu cầu vốn]':'ncv','[Vốn tự có]':'vonTuCo','[Chấm điểm]':'chamDiem','[Xếp hạng]':'xepHangKH','[Về phương diện kỹ thuật]':'ktThuat','[Thị trường đầu vào]':'ttDauVao','[Thị trường đầu ra]':'ttDauRa','[Hàng hoá các loại]':'hangHoa','[Tiền mặt]':'tienMat','[Nợ phải thu]':'noPT','[Nợ người bán]':'noNguoiBan','[Nợ phải trả]':'noPTra','[Nguồn thu từ hoạt động kinh doanh chính]':'nguonThuChinh','[SĐ.Chủ tài sản]':'chuTS','[SĐ.Xưng hô chủ tài sản]':'xhChuTS','[SĐ.CMT chủ tài sản]':'cmndChuTS','[SĐ.Loại CMT chủ tài sản]':'loaiCMTChuTS','[SĐ.Địa chỉ chủ tài sản]':'diaChiChuTS','[SĐ.Địa chỉ hộ khẩu chủ tài sản]':'hkChuTS','[SĐ.Người thừa kế chủ tài sản]':'tkChuTS','[SĐ.Quan hệ thừa kế chủ tài sản]':'qhTKChuTS','[SĐ.CMT thừa kế chủ tài sản]':'cmtTKChuTS','[SĐ.Tên TSBĐ]':'tenTSBD','[SĐ.Loại đất]':'loaiDat','[SĐ.Số bìa đỏ]':'soBiaDo','[SĐ.Địa chỉ đất]':'diaChiDat','[SĐ.Diện tích đất]':'dtDat','[SĐ.Số thửa]':'soThua','[SĐ.Số tờ bản đồ]':'soToBanDo','[SĐ.Thời hạn sử dụng]':'thoiHanSD','[SĐ.Nguồn gốc]':'nguonGoc','[SĐ.Đặc điểm nhà]':'dacDiemNha','[SĐ.Kết cấu nhà]':'ketCauNha','[SĐ.Số tầng]':'soTang','[SĐ.Số BBĐG]':'soBBDG','[SĐ.Ngày BBĐG]':'ngayBBDG','[SĐ.Giá đất G0]':'giaDatG0','[SĐ.Giá trị m2 nhà]':'giaTriM2Nha','[SĐ.Diện tích XD]':'dtXD','[SĐ.Diện tích SD]':'dtSD','[SĐ.Nghĩa vụ bảo đảm]':'nghiaVuBD','[SĐ.Số HĐ thế chấp]':'soHDTC','[SĐ.Ngày ký HĐTC]':'ngayKyHDTC','[SĐ.Giá trị xe ôtô]':'giaTriXe','[SĐ.Phạm vi đảm bảo động sản]':'pvBDDS','[Ngày nhận nợ]':'ngayNhanNo','[Thời hạn trả nợ cuối]':'thoiHanTraNoCuoi','[Số tiền nhận nợ NN]':'soTienNN','[Người thụ hưởng]':'nthNN','[CCCD/Căn cước]':'cmndNthNN','[Địa chỉ người thụ hưởng]':'diaChiNthNN','[TK người thụ hưởng]':'tkNthNN','[Mở tại ngân hàng]':'moTaiNH'};
        const elId=mapping[k];
        if(elId){const el=document.getElementById(elId);if(el&&!el.readOnly)el.value=v;}
      });
      if(d._loanType){const btn=document.querySelector(`.lt-tab[data-lt="${d._loanType}"]`);if(btn)apcSwitchLT(btn);}
      setTimeout(()=>{calcFinance();calcGiaDat();updateBenVay();updateChecklist();updateProgress();},200);
      showModal('📂 Tải thành công',`Đã tải hồ sơ số HĐ: <strong>${d['[Số HĐ tín dụng]']||'—'}</strong><br>Lưu lúc: ${d._savedAt?new Date(d._savedAt).toLocaleString('vi-VN'):'—'}`);
    }catch(err){showModal('❌ Lỗi','File JSON không hợp lệ. Kiểm tra lại.');}
  };
  reader.readAsText(f);
  e.target.value='';
}

// ═══════════════════════════════════════════════
// CLEAR / VALIDATE / MODAL / MISC
// ═══════════════════════════════════════════════
function clearForm(){
  if(!confirm('Xác nhận xóa toàn bộ dữ liệu form?'))return;
  document.querySelectorAll('input:not([readonly]):not([type=checkbox]):not([type=hidden]),select,textarea').forEach(el=>el.value='');
  document.querySelectorAll('.rtag').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.rbtn').forEach(b=>b.classList.remove('active'));
  apcSwitchLT(document.querySelector('.lt-tab'));
  calcFinance();updateProgress();
}
function validateSubmit(){
  const req={'nguoiQHKH':'Người QHKH/QLN','nguoiThamDinh':'Người thẩm định','nguoiDuyet':'Người duyệt','tenKH':'Tên KH vay','cmnd':'Số CCCD/CMND','sdt':'Số điện thoại','mucDichVay':'Mục đích vay','soTienVay':'Số tiền vay','thoiHan':'Thời hạn vay','laiSuat':'Lãi suất'};
  const miss=Object.entries(req).filter(([id])=>!document.getElementById(id)?.value?.trim()).map(([,lbl])=>lbl);
  if(miss.length>0){showModal('⚠️ Thiếu thông tin',`Vui lòng điền đủ: <br><strong>${miss.join(', ')}</strong>`);return;}
  showModal('✅ Hồ sơ sẵn sàng',`Hồ sơ <strong>${document.getElementById('soHDTD')?.value||'—'}</strong> đã hoàn chỉnh.<br>Bạn có thể xuất Excel / Word / APC.`);
}
function showModal(title,body){
  document.getElementById('mTitle').innerHTML=title;
  document.getElementById('mBody').innerHTML=body;
  document.getElementById('hsvv-modalOv').classList.add('open');
}
function apcCloseModal(){document.getElementById('hsvv-modalOv').classList.remove('open');}
document.getElementById('hsvv-modalOv')?.addEventListener('click',e=>{if(e.target===e.currentTarget)apcCloseModal();});
