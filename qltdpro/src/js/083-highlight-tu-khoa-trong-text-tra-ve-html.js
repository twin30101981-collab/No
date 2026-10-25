
/* ════════════════════════════════════════════════════════════════
   INLINE KH SEARCH — page-fhs (Phương án A)
   Tái dụng: _khNorm, _khFmtMoney, _khLoaiChip, fhsFillFromQltd
   ════════════════════════════════════════════════════════════════ */

var _fhsInlineTimer = null;
var _fhsInlineCursor = -1;

/* Highlight từ khóa trong text — trả về HTML string */
function _fhsHighlight(text, q) {
  if (!q || !text) return _fhsEscHtml(text);
  /* Chuẩn hóa q về không dấu để build regex, nhưng highlight trên text gốc */
  var qNorm = _khNorm(q);
  /* Tách thành từng token để hỗ trợ tìm nhiều từ */
  var tokens = qNorm.split(/\s+/).filter(Boolean);
  if (!tokens.length) return _fhsEscHtml(text);
  /* Duyệt từng ký tự text gốc, so sánh với chuỗi không dấu tương ứng */
  var norm  = _khNorm(text);
  var used  = new Uint8Array(text.length); /* 1 = nằm trong vùng match */
  tokens.forEach(function(tok) {
    var pos = 0;
    while ((pos = norm.indexOf(tok, pos)) !== -1) {
      for (var i = pos; i < pos + tok.length && i < used.length; i++) used[i] = 1;
      pos += tok.length;
    }
  });
  /* Reconstruct HTML với <mark> bao phần match */
  var out = ''; var inMark = false;
  for (var i = 0; i < text.length; i++) {
    var ch = _fhsEscHtml(text[i]);
    if (used[i] && !inMark) { out += '<mark style="background:#DBEAFE;color:#1D4ED8;border-radius:2px;padding:0 1px;font-weight:700">'; inMark = true; }
    if (!used[i] && inMark) { out += '</mark>'; inMark = false; }
    out += ch;
  }
  if (inMark) out += '</mark>';
  return out;
}
function _fhsEscHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fhsInlineSearchFocus(inp) {
  var data  = (typeof DATA !== 'undefined' && Array.isArray(DATA.qltd)) ? DATA.qltd : [];
  var count = document.getElementById('fhs-inline-search-count');
  var drop  = document.getElementById('fhs-inline-results');
  /* Hiện số records trong count span */
  if (count) {
    count.textContent = data.length
      ? '● ' + data.length.toLocaleString('vi') + ' KH'
      : '';
  }
  /* Nếu chưa có data → hiện card hướng dẫn ngay khi focus */
  if (!data.length) {
    drop.style.display = 'block';
    drop.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px">'
        +'<span style="font-size:20px;flex-shrink:0">⚠️</span>'
        +'<div>'
          +'<div style="font-weight:700;font-size:12.5px;color:#92400E;margin-bottom:3px">Chưa có dữ liệu QLTD</div>'
          +'<div style="font-size:11.5px;color:#78716C;line-height:1.5">'
            +'Vào trang <strong>QLTD</strong> → nhấn <strong>📥 Import</strong> để tải file Excel trước, '
            +'sau đó quay lại đây tra cứu khách hàng.'
          +'</div>'
        +'</div>'
      +'</div>';
    return;
  }
  /* Có data → chạy search bình thường nếu đã gõ gì đó */
  if (inp.value.trim().length >= 2) fhsInlineSearchDebounce(inp.value);
}

function fhsInlineSearchDebounce(q) {
  clearTimeout(_fhsInlineTimer);
  _fhsInlineTimer = setTimeout(function() { fhsInlineSearch(q); }, 250);
}

function fhsInlineSearch(q) {
  q = (q || '').trim();
  var drop  = document.getElementById('fhs-inline-results');
  var count = document.getElementById('fhs-inline-search-count');
  var clear = document.getElementById('fhs-inline-search-clear');
  _fhsInlineCursor = -1;
  if (clear) clear.style.display = q ? 'block' : 'none';
  if (q.length < 2) {
    drop.style.display = 'none';
    if (count) count.textContent = '';
    return;
  }
  var data = (typeof DATA !== 'undefined' && Array.isArray(DATA.qltd)) ? DATA.qltd : [];
  if (!data.length) {
    drop.style.display = 'block';
    drop.innerHTML = '<div style="text-align:center;padding:24px;color:#9CA3AF;font-size:12px">⚠️ Chưa có dữ liệu QLTD</div>';
    if (count) count.textContent = '';
    return;
  }
  var qn = _khNorm(q);
  var grouped = {};
  data.forEach(function(r) {
    if (!r || !r[1]) return;
    var ma  = String(r[0] || '').trim();
    var ten = String(r[1] || '').trim();
    if (!_khNorm(ten).includes(qn) && !_khNorm(ma).includes(qn)) return;
    var key = ma || ten;
    if (!grouped[key]) grouped[key] = { ma:ma, ten:ten, diaChi:String(r[14]||'').trim(), rows:[] };
    grouped[key].rows.push(r);
  });
  var keys = Object.keys(grouped);
  if (count) count.textContent = keys.length ? keys.length + ' KH' : '';
  if (!keys.length) {
    drop.style.display = 'block';
    drop.innerHTML = '<div style="text-align:center;padding:24px;color:#9CA3AF;font-size:13px">😕 Không tìm thấy kết quả</div>';
    return;
  }
  var esc = function(s){ return String(s||'').replace(/"/g,'&quot;'); };
  var html = '';
  keys.slice(0, 40).forEach(function(key, idx) {
    var g   = grouped[key];
    var rep = g.rows.reduce(function(a,b){ return parseFloat(b[11]||0)>parseFloat(a[11]||0)?b:a }, g.rows[0]);
    var isHM = /hạn mức|han muc/i.test(String(rep[13]||''));
    /* Tổng dư nợ tất cả HĐ của KH */
    var tongDuNo = g.rows.reduce(function(s,r){ return s + (parseFloat(r[11]||0)||0); }, 0);
    var tongDuNoStr = tongDuNo > 0
      ? '<span style="font-size:10.5px;font-weight:700;color:#DC2626;white-space:nowrap;flex-shrink:0">Dư nợ: '+_khFmtMoney(tongDuNo)+'</span>'
      : '<span style="font-size:10.5px;color:#D1D5DB;white-space:nowrap;flex-shrink:0">Dư nợ: —</span>';
    var hdBadges = g.rows.map(function(r){
      return _khLoaiChip(String(r[13]||'')) +
        '<span style="font-size:10px;color:#059669;margin-left:4px">' +
          (/hạn mức|han muc/i.test(String(r[13]||'')) ? _khFmtMoney(r[5]) : _khFmtMoney(r[9])) +
        '</span>';
    }).join('<span style="color:#D1D5DB;margin:0 4px">·</span>');
    html += '<div class="fhs-isr-item" data-idx="'+idx+'" '
      +'data-ma="'+esc(g.ma)+'" data-ten="'+esc(g.ten)+'" data-diachi="'+esc(g.diaChi)+'" '
      +'data-hmtd="'+esc(isHM?String(rep[5]||''):'')+'" '
      +'data-sotien="'+esc(!isHM?String(rep[9]||''):'')+'" '
      +'data-laisuat="'+esc(String(rep[8]||''))+'" data-loaivay="'+esc(String(rep[13]||''))+'" '
      +'data-sohd="'+esc(String(rep[2]||''))+'" data-ngayhd="'+esc(String(rep[3]||''))+'" '
      +'onclick="fhsInlineSelect(this)" '
      +'style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;border-bottom:1px solid #F1F5F9;transition:.1s" '
      +'onmouseover="this.style.background=\'#EFF6FF\';_fhsInlineCursor=parseInt(this.dataset.idx)" '
      +'onmouseout="if(parseInt(this.dataset.idx)!==_fhsInlineCursor)this.style.background=\'\'">'
        +'<div style="width:30px;height:30px;border-radius:50%;background:#0D2137;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+(g.ten[0]||'?')+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-weight:700;font-size:12.5px;color:#1A2B3C">'+_fhsHighlight(g.ten,q)+' <span style="font-size:10px;color:#9CA3AF;font-weight:400">('+_fhsHighlight(g.ma,q)+')</span></div>'
          +'<div style="font-size:11px;color:#6B7280;margin-top:2px;display:flex;align-items:center;justify-content:space-between;gap:8px">'
            +'<span style="flex:1;min-width:0;overflow:hidden">'+hdBadges+'</span>'
            +tongDuNoStr
          +'</div>'
        +'</div>'
        +'<span style="font-size:10px;color:#0369A1;font-weight:700;white-space:nowrap;flex-shrink:0;margin-left:6px">→ Điền</span>'
      +'</div>';
  });
  drop.innerHTML = html;
  drop.style.display = 'block';
}

function fhsInlineSelect(el) {
  var synth = new Array(23).fill('');
  synth[0]  = el.dataset.ma      || '';
  synth[1]  = el.dataset.ten     || '';
  synth[2]  = el.dataset.sohd    || '';
  synth[3]  = el.dataset.ngayhd  || '';
  synth[5]  = el.dataset.hmtd    || '';
  synth[8]  = el.dataset.laisuat || '';
  synth[9]  = el.dataset.sotien  || '';
  synth[13] = el.dataset.loaivay || '';
  synth[14] = el.dataset.diachi  || '';
  if (!_fhsLoai) {
    if (window.showToast) showToast('⚠️ Vui lòng chọn loại hồ sơ trước', 'orange');
    fhsInlineSearchClose();
    return;
  }
  fhsFillFromQltd(synth);
  var inp = document.getElementById('fhs-inline-search-input');
  if (inp) inp.value = (synth[1]||'') + (synth[0] ? ' ('+synth[0]+')' : '');
  fhsInlineSearchClose();
}

function fhsInlineSearchClose() {
  var drop = document.getElementById('fhs-inline-results');
  if (drop) drop.style.display = 'none';
  _fhsInlineCursor = -1;
}

/* ── Step navigation (Tiếp theo / Quay lại) ── */
function fhsStepGetChips() {
  if (!_fhsLoai || !FHS_DATA[_fhsLoai]) return [];
  return Object.keys(FHS_DATA[_fhsLoai].chips);
}
function fhsStepCurrentIdx() {
  var chips = fhsStepGetChips();
  return chips.indexOf(_fhsChip);
}
function fhsStepNavUpdate() {
  var nav  = document.getElementById('fhs-step-nav');
  var prev = document.getElementById('fhs-btn-prev');
  var next = document.getElementById('fhs-btn-next');
  var ind  = document.getElementById('fhs-step-indicator');
  if (!nav) return;
  var chips = fhsStepGetChips();
  if (!chips.length || !_fhsLoai) { nav.classList.remove('visible'); return; }
  nav.classList.add('visible');
  var idx = fhsStepCurrentIdx();
  // Buttons
  prev.disabled = (idx <= 0);
  next.disabled = (idx >= chips.length - 1);
  next.textContent = (idx >= chips.length - 1) ? '✅ Xong' : 'Tiếp theo →';
  // Dots indicator
  ind.innerHTML = chips.map(function(k, i) {
    var loaiData = FHS_DATA[_fhsLoai];
    var chipD = loaiData.chips[k];
    var cls = 'fhs-step-dot' + (i === idx ? ' active' : '');
    // Mark done if has any filled value
    var inst = _fhsVals[_fhsLoai + ':' + k];
    var hasFill = inst && inst[0] && Object.values(inst[0]).some(function(v){ return v && v.trim(); });
    if (i !== idx && hasFill) cls += ' done';
    return '<span class="' + cls + '" title="' + chipD.label + '" onclick="fhsStepGoTo(' + i + ')"></span>';
  }).join('') + '<span style="font-size:10px;color:#9CA3AF;margin-left:6px">' + (idx+1) + '/' + chips.length + ' — ' + (FHS_DATA[_fhsLoai].chips[chips[idx]]||{}).label + '</span>';
}
function fhsStepGoTo(idx) {
  var chips = fhsStepGetChips();
  if (idx < 0 || idx >= chips.length) return;
  var chipKey = chips[idx];
  _fhsChip = chipKey;
  // Highlight sub-chip
  document.querySelectorAll('#fhs-page-sub-chips .fhs-sub-chip, #fhs-sub-chips .fhs-sub-chip').forEach(function(el) {
    el.classList.toggle('active', el.dataset.chip === chipKey);
  });
  _fhsRenderRows(_fhsLoai, _fhsChip);
  _fhsUpdateInfo();
  fhsStepNavUpdate();
  // Scroll body to top
  var body = document.getElementById('fhs-page-body') || document.getElementById('fhs-body');
  if (body) body.scrollTop = 0;
}
function fhsStepNav(dir) {
  var idx = fhsStepCurrentIdx();
  fhsStepGoTo(idx + dir);
}

function fhsInlineSearchClear() {
  var inp   = document.getElementById('fhs-inline-search-input');
  var count = document.getElementById('fhs-inline-search-count');
  var clear = document.getElementById('fhs-inline-search-clear');
  if (inp)   inp.value = '';
  if (clear) clear.style.display = 'none';
  /* Restore record count thay vì để trống */
  if (count) {
    var data = (typeof DATA !== 'undefined' && Array.isArray(DATA.qltd)) ? DATA.qltd : [];
    count.textContent = data.length ? '● ' + data.length.toLocaleString('vi') + ' KH' : '';
  }
  fhsInlineSearchClose();
  if (inp) inp.focus();
}

function fhsInlineSearchKey(e) {
  var drop  = document.getElementById('fhs-inline-results');
  if (!drop || drop.style.display === 'none') return;
  var items = drop.querySelectorAll('.fhs-isr-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _fhsInlineCursor = Math.min(_fhsInlineCursor + 1, items.length - 1);
    _fhsInlineHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _fhsInlineCursor = Math.max(_fhsInlineCursor - 1, 0);
    _fhsInlineHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (_fhsInlineCursor >= 0 && items[_fhsInlineCursor]) fhsInlineSelect(items[_fhsInlineCursor]);
  } else if (e.key === 'Escape') {
    fhsInlineSearchClose();
    var inp = document.getElementById('fhs-inline-search-input');
    if (inp) inp.blur();
  }
}

function _fhsInlineHighlight(items) {
  items.forEach(function(el, i) { el.style.background = (i === _fhsInlineCursor) ? '#EFF6FF' : ''; });
  if (items[_fhsInlineCursor]) items[_fhsInlineCursor].scrollIntoView({ block:'nearest' });
}

document.addEventListener('click', function(e) {
  // Đóng FHS inline dropdown khi click ra ngoài
  var wrap = document.getElementById('fhs-inline-search-wrap');
  if (wrap && !wrap.contains(e.target)) fhsInlineSearchClose();
  // Đóng modal-kh-search khi click ra ngoài (fallback nếu showPage không bắt được)
  var mo = document.getElementById('modal-kh-search');
  if (mo && mo.style.display !== 'none' && e.target === mo) mo.style.display = 'none';
});
