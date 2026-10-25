
// ══ TRA CỨU KH — Functions ══
function openKhSearchModal() {
  var mo = document.getElementById('modal-kh-search');
  mo.style.display = 'flex';
  document.getElementById('kh-search-results').innerHTML = '';
  document.getElementById('kh-search-input').value = '';
  document.getElementById('kh-search-hint').textContent = 'Nhập ít nhất 2 ký tự để tìm kiếm';
  // Debug: hiển thị số records đang có trong DATA.qltd
  var cnt = (typeof DATA !== 'undefined' && Array.isArray(DATA.qltd)) ? DATA.qltd.length : 0;
  var badge = document.getElementById('kh-search-record-badge');
  if (badge) badge.textContent = cnt ? ('● ' + cnt.toLocaleString('vi') + ' records') : '⚠️ Chưa có dữ liệu QLTD';
  setTimeout(function(){ document.getElementById('kh-search-input').focus(); }, 80);
}
function closeKhSearchModal() {
  document.getElementById('modal-kh-search').style.display = 'none';
}
function khSearchKey(e) {
  if (e.key === 'Escape') closeKhSearchModal();
}
function _khNorm(s) {
  return String(s||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/[^a-z0-9 ]/g,'');
}
function _khFmtMoney(v) {
  var n = parseFloat(String(v||'').replace(/[^0-9.]/g,''));
  if (!n || isNaN(n)) return '—';
  if (n >= 1e9) return (n/1e9).toFixed(2).replace(/\.?0+$/,'') + ' tỷ';
  if (n >= 1e6) return Math.round(n/1e6) + ' tr';
  return n.toLocaleString('vi');
}
function _khLoaiChip(loai) {
  if (!loai) return '';
  var l = loai.toLowerCase();
  var c = /hạn mức|han muc/.test(l) ? '#0D7377' : /tiêu dùng|tieu dung/.test(l) ? '#7C3AED' : /trung hạn|dài hạn/.test(l) ? '#B45309' : '#374151';
  return '<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:'+c+'22;color:'+c+';font-size:10px;font-weight:700;border:1px solid '+c+'44">'+loai+'</span>';
}
function khSearchFilter() {
  var q = (document.getElementById('kh-search-input').value || '').trim();
  var hint = document.getElementById('kh-search-hint');
  var results = document.getElementById('kh-search-results');
  if (q.length < 2) {
    hint.textContent = 'Nhập ít nhất 2 ký tự để tìm kiếm';
    results.innerHTML = '';
    return;
  }
  var data = (typeof DATA !== 'undefined' && Array.isArray(DATA.qltd)) ? DATA.qltd : [];
  var qn = _khNorm(q);
  var grouped = {};
  data.forEach(function(r) {
    if (!r || !r[1]) return;
    var ma  = String(r[0]||'').trim();
    var ten = String(r[1]||'').trim();
    if (!_khNorm(ten).includes(qn) && !_khNorm(ma).includes(qn)) return;
    var key = ma || ten;
    if (!grouped[key]) grouped[key] = { ma:ma, ten:ten, diaChi:String(r[14]||'').trim(), rows:[] };
    grouped[key].rows.push(r);
  });
  var keys = Object.keys(grouped);
  hint.textContent = keys.length ? keys.length + ' khách hàng tìm thấy' : 'Không tìm thấy kết quả';
  if (!keys.length) {
    results.innerHTML = '<div style="text-align:center;padding:32px;color:#9CA3AF;font-size:13px">😕 Không có kết quả phù hợp</div>';
    return;
  }
  var html = '';
  keys.slice(0,50).forEach(function(key) {
    var g = grouped[key];
    var hdList = g.rows.map(function(r) {
      return { soHD:String(r[2]||''), ngayHD:String(r[3]||''), loai:String(r[13]||''), hmtd:r[5], soTienGN:r[9], duNo:r[11], laiSuat:r[8] };
    });
    var rep = hdList.reduce(function(a,b){ return parseFloat(b.duNo||0)>parseFloat(a.duNo||0)?b:a }, hdList[0]);
    var isHMRep = /hạn mức|han muc/i.test(rep.loai);
    var hdRows = hdList.map(function(h) {
      var isHM = /hạn mức|han muc/i.test(h.loai);
      return '<tr style="font-size:11px;border-top:1px solid #F1F5F9">'
        +'<td style="padding:3px 6px;color:#374151;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis">'+h.soHD+'</td>'
        +'<td style="padding:3px 6px">'+_khLoaiChip(h.loai)+'</td>'
        +'<td style="padding:3px 6px;color:#059669;font-weight:600;text-align:right;white-space:nowrap">'+(isHM?'HMTD: '+_khFmtMoney(h.hmtd):'GN: '+_khFmtMoney(h.soTienGN))+'</td>'
        +'<td style="padding:3px 6px;color:#6B7280;text-align:right;white-space:nowrap">Dư nợ: '+_khFmtMoney(h.duNo)+'</td>'
        +'</tr>';
    }).join('');
    var esc = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); };  // P2-3 FIX: escapeHtml đầy đủ
    html += '<div onclick="khSearchFill(this)" '
      +'data-ma="'+esc(g.ma)+'" data-ten="'+esc(g.ten)+'" data-diachi="'+esc(g.diaChi)+'" '
      +'data-hmtd="'+esc(isHMRep?String(rep.hmtd||''):'')+ '" '
      +'data-sotien="'+esc(!isHMRep?String(rep.soTienGN||''): '')+ '" '
      +'data-laisuat="'+esc(String(rep.laiSuat||''))+'" data-loaivay="'+esc(rep.loai)+'" '
      +'data-sohd="'+esc(rep.soHD)+'" data-ngayhd="'+esc(rep.ngayHD)+'" '
      +'style="border:1.5px solid #E5EAF0;border-radius:9px;padding:10px 12px;margin:6px 0;cursor:pointer;transition:.12s;background:#fff" '
      +'onmouseover="this.style.borderColor=\'#0369A1\';this.style.background=\'#EFF6FF\'" '
      +'onmouseout="this.style.borderColor=\'#E5EAF0\';this.style.background=\'#fff\'">'
      +'<div style="display:flex;align-items:flex-start;gap:10px">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:#0D2137;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">'+(g.ten[0]||'?')+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-weight:700;font-size:13px;color:#1A2B3C">'+(typeof escapeHtml==='function'?escapeHtml(g.ten):g.ten)+' <span style="font-size:10px;color:#9CA3AF;font-weight:400">('+(typeof escapeHtml==='function'?escapeHtml(g.ma):g.ma)+')</span></div>'  // P2-3 FIX: XSS escape
          +(g.diaChi?'<div style="font-size:11px;color:#6B7280;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📍 '+(typeof escapeHtml==="function"?escapeHtml(g.diaChi):g.diaChi)+'</div>':'')  // P2-3 FIX
          +'<table style="border-collapse:collapse;width:100%;margin-top:5px"><tbody>'+hdRows+'</tbody></table>'
        +'</div>'
        +'<div style="font-size:10px;color:#0369A1;font-weight:700;white-space:nowrap;flex-shrink:0;padding-top:2px">→ Điền form</div>'
      +'</div>'
      +'</div>';
  });
  results.innerHTML = html;
}
function khSearchFill(el) {
  var ma     = el.dataset.ma     || '';
  var ten    = el.dataset.ten    || '';
  var dc     = el.dataset.diachi || '';
  var hmtd   = el.dataset.hmtd   || '';
  var soTien = el.dataset.sotien || '';
  var soHD    = el.dataset.sohd    || '';
  var ngayHD  = el.dataset.ngayhd  || '';
  var laiSuat = el.dataset.laisuat || '';
  var loaiVay = el.dataset.loaivay || '';
  function setF(id, val) {
    var e2 = document.getElementById(id);
    if (!e2 || !val) return;
    e2.value = val;
    e2.dispatchEvent(new Event('input',  {bubbles:true}));
    e2.dispatchEvent(new Event('change', {bubbles:true}));
  }
  setF('maKH',  ma);
  setF('tenKH', ten);
  if (dc)    setF('diaChi',    dc);
  if (soHD)  setF('soHDTD',   soHD);
  if (hmtd)  setF('hmtdDuyet', hmtd);
  if (soTien) setF('soTienVay', soTien);
  // Ngày HĐ: dd/mm/yyyy → yyyy-mm-dd
  if (ngayHD) {
    var p = ngayHD.split('/');
    if (p.length === 3) {
      var e2 = document.getElementById('ngayHDTD');
      if (e2) { e2.value = p[2]+'-'+p[1]+'-'+p[0]; e2.dispatchEvent(new Event('change',{bubbles:true})); }
    }
  }
  // ✅ PATCH v18+v20: điền lãi suất từ QLTD (r[8] đã là % như 8.5)
  if (laiSuat) setF('laiSuat', laiSuat);
  // Map lntpcd (r[13]) → option value của theLoaiVay select
  // Options: "Hạn mức" | "Từng lần" | "Trả góp" | "Luân chuyển"
  if (loaiVay) {
    var lv = String(loaiVay).toLowerCase();
    var mappedLV = '';
    if (/h[aạ]n\s*m[uứ]c|han\s*muc|hmtd/i.test(loaiVay)) mappedLV = 'Hạn mức';
    else if (/t[uư]ng\s*l[aầ]n|tung\s*lan|tlq/i.test(loaiVay)) mappedLV = 'Từng lần';
    else if (/tr[aả]\s*g[oó]p|trag[oó]p/i.test(loaiVay)) mappedLV = 'Trả góp';
    else if (/lu[aâ]n\s*chuy[eể]n|luan\s*chuyen/i.test(loaiVay)) mappedLV = 'Luân chuyển';
    if (mappedLV) setF('theLoaiVay', mappedLV);
  }
  if (typeof updateBenVay   === 'function') updateBenVay();
  if (typeof calcFinance    === 'function') calcFinance();
  if (typeof calcNgayDenHan === 'function') calcNgayDenHan();
  if (typeof updateChecklist === 'function') updateChecklist();
  closeKhSearchModal();
  if (typeof showToast === 'function') showToast('✅ Đã điền thông tin KH: ' + ten, 'green');
}
// Escape key closes modal globally
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') {
    var mo = document.getElementById('modal-kh-search');
    if (mo && mo.style.display !== 'none') closeKhSearchModal();
  }
});
