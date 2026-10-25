
/* ═══════════════════════════════════════════════════════════════
   GIAI ĐOẠN 3 — SMART FIELDS & AUTO-FUNCTIONS
   BAN_CHUAN v40_GD3 | 2026-05-05
   ═══════════════════════════════════════════════════════════════
   Mỗi input trong GD2 form khi focus → hiện toolbar nhỏ với:
     AA/Aa/aa  Viết HOA / Hoa đầu từ / thường
     ✂         Xóa khoảng trắng thừa
     📋        Copy từ trường khác (dropdown)
     📅        Điền ngày hôm nay / tháng-năm
     💰        Số → Chữ (500,000,000 → Năm trăm triệu đồng)
     ⌀         Làm tròn triệu đồng
     %         Tính tỷ lệ A/B
     ÷×        Máy tính đa phép inline
   ═══════════════════════════════════════════════════════════════ */

/* ── Số → Chữ (VND) ── */
(function() {
  const _units = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  const _dec   = ['','mười','hai mươi','ba mươi','bốn mươi','năm mươi',
                  'sáu mươi','bảy mươi','tám mươi','chín mươi'];
  const _big   = ['','nghìn','triệu','tỷ'];

  function _r3(n) {
    if (n === 0) return '';
    const h = Math.floor(n/100), t = Math.floor((n%100)/10), u = n%10;
    let s = '';
    if (h) s += _units[h] + ' trăm ';
    if (t > 1) { s += _dec[t] + ' '; if (u) s += (u === 1 ? 'mốt' : _units[u]) + ' '; }
    else if (t === 1) { s += 'mười '; if (u) s += (u === 1 ? 'một' : _units[u]) + ' '; }
    else if (h && u) { s += 'lẻ ' + _units[u] + ' '; }
    else if (!h && u) { s += _units[u] + ' '; }
    return s;
  }

  window.sfNum2Text = function(n) {
    n = Math.round(Math.abs(parseFloat(n) || 0));
    if (n === 0) return 'Không đồng';
    let parts = [], idx = 0;
    while (n > 0) {
      const r = n % 1000;
      if (r || idx === 0) parts.unshift({ v: r, suffix: _big[idx] });
      n = Math.floor(n / 1000); idx++;
    }
    let s = parts.map(p => (_r3(p.v) + (p.suffix ? p.suffix + ' ' : '')).trim()).join(' ').trim();
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return s + ' đồng';
  };
})();

/* ── Hoa đầu từ ── */
window.sfTitleCase = t => t.toLowerCase().replace(/(^|\s+)(\S)/g, (_,sp,c) => sp + c.toUpperCase());

/* ── Làm tròn triệu ── */
window.sfRoundMil = v => {
  const n = parseFloat(String(v).replace(/[^\d.]/g,''));
  if (isNaN(n)) return v;
  return String(Math.round(n / 1000000) * 1000000);
};

/* ── Ngày hôm nay dd/mm/yyyy ── */
window.sfToday = () => {
  const d = new Date();
  return [String(d.getDate()).padStart(2,'0'), String(d.getMonth()+1).padStart(2,'0'), d.getFullYear()].join('/');
};
window.sfMonthYear = () => {
  const d = new Date();
  return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

/* ── Tỷ lệ A/B ── */
window.sfRatioAB = (a, b) => {
  const fa = parseFloat(String(a).replace(/[^\d.]/g,'')), fb = parseFloat(String(b).replace(/[^\d.]/g,''));
  if (!fb) return '';
  return (fa/fb*100).toFixed(2);
};

/* ── Đánh giá biểu thức đơn giản (máy tính inline) ── */
window.sfCalcExpr = (expr) => {
  try {
    const clean = expr.replace(/[^0-9+\-*/(). ]/g,'').trim();
    if (!clean) return '';
    // eslint-disable-next-line no-new-func
    const r = Function('"use strict"; return (' + clean + ')')();
    if (!isFinite(r)) return 'Lỗi';
    return String(Math.round(r * 10000) / 10000);
  } catch { return 'Lỗi'; }
};

/* ── Lấy tất cả fields hiện tại của hồ sơ đang mở (dùng cho Copy từ trường khác) ── */
window._sfGetAllFields = function(loai) {
  const all = hsvGetAll();
  const loaiActual = loai || _hsvLoai || 'hmtd';
  const rec = all[loaiActual]?.[_hsvCurId];
  if (!rec) return {};
  return rec.fields || {};
};

/* ── Lấy label cho field id ── */
window._sfFieldLabel = function(loai, fid) {
  const secs = HSV_SECTIONS[loai || _hsvLoai || 'hmtd'] || [];
  for (const sec of secs) for (const f of sec.fields) if (f.id === fid) return f.label;
  return fid;
};

/* ══════════════════════════════
   TOOLBAR CORE
   ══════════════════════════════ */
let _sfActiveEl = null;   // input đang focus
let _sfCurLoai  = null;
let _sfTbTimer  = null;

function _sfGetLoaiFromEl(el) {
  /* leo lên DOM tìm page-xxx */
  let p = el.parentElement;
  while (p) {
    const id = p.id || '';
    if (id.startsWith('page-')) return id.replace('page-','');
    p = p.parentElement;
  }
  return _hsvLoai || 'hmtd';
}

function _sfGetFieldDef(loai, fid) {
  const secs = HSV_SECTIONS[loai] || [];
  for (const sec of secs) for (const f of sec.fields) if (f.id === fid) return f;
  return null;
}

/* Xây toolbar HTML một lần, tái dụng */
function _sfEnsureToolbar() {
  if (document.getElementById('sf-global-toolbar')) return;
  const tb = document.createElement('div');
  tb.id = 'sf-global-toolbar';
  tb.className = 'sf-toolbar';
  tb.innerHTML = `
    <button class="sf-btn" id="sf-btn-upper" title="Viết HOA tất cả" onclick="sfApply('upper')">AA</button>
    <button class="sf-btn" id="sf-btn-title" title="Hoa đầu từ"       onclick="sfApply('title')">Aa</button>
    <button class="sf-btn" id="sf-btn-lower" title="Tất cả thường"     onclick="sfApply('lower')">aa</button>
    <div class="sf-sep"></div>
    <button class="sf-btn" title="Xóa khoảng trắng thừa" onclick="sfApply('trim')">✂</button>
    <div class="sf-sep"></div>
    <button class="sf-btn" title="Copy từ trường khác" onclick="sfToggleCopyDD(event)">📋</button>
    <div class="sf-sep"></div>
    <button class="sf-btn" title="Điền ngày hôm nay" onclick="sfApply('today')">📅</button>
    <button class="sf-btn sf-btn-monyear" title="Điền tháng/năm hiện tại" onclick="sfApply('monyear')" style="font-size:9px">T/N</button>
    <div class="sf-sep"></div>
    <button class="sf-btn" title="Số → Chữ (click để copy chữ)" onclick="sfToggleNum2Text(event)">💰</button>
    <button class="sf-btn" title="Làm tròn triệu" onclick="sfApply('roundmil')">⌀</button>
    <div class="sf-sep"></div>
    <button class="sf-btn" title="Tính tỷ lệ A/B%" onclick="sfToggleRatio(event)">%</button>
    <button class="sf-btn" title="Máy tính inline (nhập biểu thức)" onclick="sfToggleCalc(event)">÷×</button>
    <div id="sf-copy-dd" class="sf-copy-dd"></div>
    <div id="sf-num2text-popup" class="sf-num2text-popup" title="Click để điền chữ vào ô" onclick="sfApplyNum2Text()"></div>
    <div id="sf-calc-popup" class="sf-calc-popup">
      <input id="sf-calc-expr" class="sf-calc-expr" placeholder="VD: 500*12 hoặc 1200/3.5" oninput="sfCalcLive()" onkeydown="if(event.key==='Enter')sfCalcApply()">
      <div id="sf-calc-result" class="sf-calc-result"></div>
      <div class="sf-calc-actions">
        <button class="sf-calc-apply" onclick="sfCalcApply()">✅ Áp dụng</button>
      </div>
    </div>
  `;
  document.body.appendChild(tb);
}

/* Gắn toolbar vào một input */
function _sfAttachToolbarToEl(el) {
  const tb = document.getElementById('sf-global-toolbar');
  if (!tb || !el) return;
  /* Di chuyển toolbar vào wrap của el */
  const wrap = el.closest('.sf-wrap') || el.parentElement;
  if (wrap && wrap !== tb.parentElement) {
    /* Đặt wrap thành position:relative nếu cần */
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    wrap.appendChild(tb);
  }
  tb.classList.add('sf-tb-visible');
  /* Ẩn / hiện nút case theo type */
  const fid = el.dataset?.fid;
  const loai = _sfGetLoaiFromEl(el);
  const fd  = _sfGetFieldDef(loai, fid);
  const isNum  = fd?.type === 'number' || el.dataset?.sftype === 'number';
  const isDate = fd?.type === 'date';
  ['sf-btn-upper','sf-btn-title','sf-btn-lower'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.style.display = isNum || isDate ? 'none' : '';
  });
  document.getElementById('sf-btn-monyear') && (document.getElementById('sf-btn-monyear').style.display = isDate ? '' : 'none');
}

/* Ẩn toolbar sau 200ms (trừ khi focus vào toolbar) */
function _sfHideToolbar() {
  clearTimeout(_sfTbTimer);
  _sfTbTimer = setTimeout(() => {
    const tb = document.getElementById('sf-global-toolbar');
    if (!tb) return;
    tb.classList.remove('sf-tb-visible');
    _sfCloseAllPopups();
    _sfActiveEl = null;
  }, 220);
}

function _sfCloseAllPopups() {
  ['sf-copy-dd','sf-num2text-popup','sf-calc-popup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
}

/* ── Apply actions ── */
window.sfApply = function(action) {
  if (!_sfActiveEl || !document.contains(_sfActiveEl)) { _sfActiveEl = null; return; }  // TOOL FIX
  let v = _sfActiveEl.value;
  switch(action) {
    case 'upper':   v = v.toUpperCase(); break;
    case 'title':   v = sfTitleCase(v); break;
    case 'lower':   v = v.toLowerCase(); break;
    case 'trim':    v = v.replace(/\s+/g,' ').trim(); break;
    case 'today':   v = sfToday(); break;
    case 'monyear': v = sfMonthYear(); break;
    case 'roundmil': v = sfRoundMil(v); break;
  }
  _sfActiveEl.value = v;
  _sfActiveEl.dispatchEvent(new Event('input', {bubbles:true}));
  _sfActiveEl.dispatchEvent(new Event('change', {bubbles:true}));
};

/* ── Copy từ trường khác ── */
window.sfToggleCopyDD = function(e) {
  e.stopPropagation();
  _sfCloseAllPopups();
  const dd = document.getElementById('sf-copy-dd');
  if (!dd || !_sfActiveEl) return;
  const loai = _sfGetLoaiFromEl(_sfActiveEl);
  const fields = _sfGetAllFields(loai);
  const items = Object.entries(fields).filter(([fid, val]) => val && fid !== _sfActiveEl.dataset?.fid);
  if (!items.length) { dd.innerHTML='<div class="sf-copy-dd-item" style="color:#6b7280">Chưa có trường nào có dữ liệu</div>'; }
  else {
    dd.innerHTML = items.map(([fid, val]) => {
      const lbl = _sfFieldLabel(loai, fid);
      const display = String(val).length > 30 ? String(val).slice(0,30)+'…' : String(val);
      return `<div class="sf-copy-dd-item" onclick="sfCopyFromField('${fid}')">
        <span class="sf-copy-dd-lbl">${lbl}</span>
        <span class="sf-copy-dd-val">${display}</span>
      </div>`;
    }).join('');
  }
  dd.classList.add('open');
};

window.sfCopyFromField = function(fid) {
  if (!_sfActiveEl) return;
  const loai = _sfGetLoaiFromEl(_sfActiveEl);
  const fields = _sfGetAllFields(loai);
  if (fields[fid] != null) {
    _sfActiveEl.value = fields[fid];
    _sfActiveEl.dispatchEvent(new Event('input', {bubbles:true}));
  }
  _sfCloseAllPopups();
};

/* ── Số → Chữ popup ── */
window.sfToggleNum2Text = function(e) {
  e.stopPropagation();
  _sfCloseAllPopups();
  if (!_sfActiveEl) return;
  const v = _sfActiveEl.value.replace(/[^\d.]/g,'');
  const popup = document.getElementById('sf-num2text-popup');
  if (!popup) return;
  if (!v) { popup.textContent = '(Ô trống — nhập số trước)'; popup.classList.add('open'); return; }
  popup.textContent = sfNum2Text(parseFloat(v));
  popup.classList.add('open');
};

window.sfApplyNum2Text = function() {
  const popup = document.getElementById('sf-num2text-popup');
  if (!popup || !_sfActiveEl) return;
  const txt = popup.textContent;
  if (txt.startsWith('(')) return;
  _sfActiveEl.value = txt;
  _sfActiveEl.dispatchEvent(new Event('input', {bubbles:true}));
  _sfCloseAllPopups();
};

/* ── Tỷ lệ A/B popup ── */
window.sfToggleRatio = function(e) {
  e.stopPropagation();
  _sfCloseAllPopups();
  if (!_sfActiveEl) return;
  const loai = _sfGetLoaiFromEl(_sfActiveEl);
  const fields = _sfGetAllFields(loai);
  /* Tìm 2 field số gần nhất */
  const nums = Object.entries(fields).filter(([,v]) => v !== '' && !isNaN(parseFloat(v)));
  if (nums.length < 2) {
    _sfActiveEl.value = '';
    return;
  }
  /* Mặc định A = soTienVay, B = giaTriTS / soTienSTK */
  const a = parseFloat(fields['soTienVay'] || nums[0][1] || 0);
  const b = parseFloat(fields['giaTriTS'] || fields['soTienSTK'] || fields['hanMuc'] || nums[1][1] || 0);
  const ratio = sfRatioAB(a, b);
  if (ratio !== '') {
    _sfActiveEl.value = ratio;
    _sfActiveEl.dispatchEvent(new Event('input', {bubbles:true}));
  }
};

/* ── Máy tính inline ── */
window.sfToggleCalc = function(e) {
  e.stopPropagation();
  _sfCloseAllPopups();
  const pop = document.getElementById('sf-calc-popup');
  if (!pop) return;
  const expr = document.getElementById('sf-calc-expr');
  if (expr && _sfActiveEl) expr.value = _sfActiveEl.value.replace(/[^\d+\-*/(). ]/g,'');
  document.getElementById('sf-calc-result').textContent = '';
  pop.classList.add('open');
  setTimeout(() => expr?.focus(), 50);
};

window.sfCalcLive = function() {
  const expr = document.getElementById('sf-calc-expr')?.value;
  const res  = sfCalcExpr(expr || '');
  const el   = document.getElementById('sf-calc-result');
  if (!el) return;
  if (!res || res === 'Lỗi') { el.textContent = res === 'Lỗi' ? '⚠ Biểu thức không hợp lệ' : ''; el.style.color = '#C0392B'; }
  else { el.textContent = '= ' + Number(res).toLocaleString('vi-VN'); el.style.color = '#1A6A3A'; }
};

window.sfCalcApply = function() {
  if (!_sfActiveEl) return;
  const expr = document.getElementById('sf-calc-expr')?.value;
  const res  = sfCalcExpr(expr || '');
  if (res && res !== 'Lỗi') {
    _sfActiveEl.value = res;
    _sfActiveEl.dispatchEvent(new Event('input', {bubbles:true}));
  }
  _sfCloseAllPopups();
};

/* ══════════════════════════════
   PATCH _hsvFieldHtml — bọc input trong .sf-wrap + gắn sự kiện toolbar
   ══════════════════════════════ */
(function() {
  const _origFieldHtml = window._hsvFieldHtml;
  if (typeof _origFieldHtml !== 'function') return; /* safety */

  window._hsvFieldHtml = function(f, fields, loai) {
    const orig = _origFieldHtml(f, fields, loai);
    /* Chỉ wrap các field không phải select, không readonly/computed */
    if (f.readonly || f.computed) return orig;
    /* Bọc div.hsv-f thêm data-sfloai để toolbar biết loại */
    return orig.replace('<div class="hsv-f">', `<div class="hsv-f" data-sfloai="${loai}" data-sfid="${f.id}">`);
  };
})();

/* ── Gắn focus/blur handlers sau khi hsvRenderForm render xong ── */
(function() {
  const _origRenderForm = window.hsvRenderForm;
  if (typeof _origRenderForm !== 'function') return;

  window.hsvRenderForm = function(loai) {
    _origRenderForm(loai);
    _sfEnsureToolbar();
    setTimeout(() => _sfBindToolbarEvents(loai), 60);
  };
})();

function _sfBindToolbarEvents(loai) {
  const page = document.getElementById('page-' + loai);
  if (!page) return;
  page.querySelectorAll('.hsv-f [data-fid]:not([readonly])').forEach(el => {
    if (el._sfBound) return;
    el._sfBound = true;
    el.addEventListener('focus', () => {
      clearTimeout(_sfTbTimer);
      _sfActiveEl = el;
      _sfCurLoai  = loai;
      _sfAttachToolbarToEl(el);
    });
    el.addEventListener('blur', () => _sfHideToolbar());
  });
  /* Toolbar giữ focus khi click vào nó */
  const tb = document.getElementById('sf-global-toolbar');
  if (tb && !tb._sfBound) {
    tb._sfBound = true;
    tb.addEventListener('mousedown', e => { e.preventDefault(); clearTimeout(_sfTbTimer); });
    tb.addEventListener('focusin',   () => clearTimeout(_sfTbTimer));
    tb.addEventListener('focusout',  () => _sfHideToolbar());
  }
}

/* ── Click ngoài → đóng tất cả popup ── */
document.addEventListener('mousedown', function(e) {
  const tb = document.getElementById('sf-global-toolbar');
  if (tb && !tb.contains(e.target) && e.target !== _sfActiveEl) {
    _sfCloseAllPopups();
  }
}, true);

/* ── ESC: đóng form hồ sơ đang mở ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  /* Nếu có popup toolbar mở → đóng popup trước */
  const anyOpen = ['sf-copy-dd','sf-num2text-popup','sf-calc-popup']
    .some(id => document.getElementById(id)?.classList.contains('open'));
  if (anyOpen) { _sfCloseAllPopups(); return; }
  /* Đóng form hồ sơ nếu đang mở */
  if (_hsvCurId && _hsvLoai) hsvCloseForm(_hsvLoai);
});

console.info('[GD3] Smart Field Toolbar loaded ✅');
