
(function () {
  'use strict';

  /* ─────────── (1) ĐỊNH DẠNG SỐ ─────────── */
  var MONEY_FIELDS = ['hmtd', 'sotien', 'duno', 'tienlai', 'tsbdGiaTri'];

  function groupDigits(s) { return window.TD.num.groupVND(s); } // HM-06: số thực không còn mất dấu thập phân (×100)
  function stripDots(s) { return window.TD.num.stripVND(s); }

  function enhanceMoneyInputs() {
    var form = document.getElementById('modal-form');
    if (!form) return;
    MONEY_FIELDS.forEach(function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      if (!el || el.dataset.moneyFmt === '1') return;
      el.dataset.moneyFmt = '1';
      el.type = 'text';
      el.setAttribute('inputmode', 'numeric');
      el.setAttribute('autocomplete', 'off');
      el.style.textAlign = 'right';
      el.value = groupDigits(el.value);
      el.addEventListener('input', function () {
        // giữ vị trí con trỏ theo số chữ số bên trái con trỏ
        var pos = el.selectionStart || 0;
        var digitsLeft = stripDots(el.value.slice(0, pos)).length;
        el.value = groupDigits(el.value);
        var i = 0, seen = 0;
        while (i < el.value.length && seen < digitsLeft) { if (/\d/.test(el.value[i])) seen++; i++; }
        try { el.setSelectionRange(i, i); } catch (e) {}
      });
      el.addEventListener('blur', function () { el.value = groupDigits(el.value); });
    });
  }
  window.TD_enhanceMoneyInputs = enhanceMoneyInputs;

  // Bọc buildEditForm: giữ nguyên hàm gốc, chỉ nâng cấp ô nhập sau khi dựng xong
  if (typeof window.buildEditForm === 'function') {
    var _origBuild = window.buildEditForm;
    window.buildEditForm = function () {
      var r = _origBuild.apply(this, arguments);
      try { enhanceMoneyInputs(); } catch (e) { console.error('[v6 money]', e); }
      return r;
    };
  }

  // Bọc saveRecord: bóc dấu "." về số thô TRƯỚC khi hàm gốc đọc form
  if (typeof window.saveRecord === 'function') {
    var _origSave = window.saveRecord;
    window.saveRecord = function () {
      try {
        var form = document.getElementById('modal-form');
        if (form) MONEY_FIELDS.forEach(function (name) {
          var el = form.querySelector('[name="' + name + '"]');
          if (el && el.dataset.moneyFmt === '1') el.value = stripDots(el.value);
        });
      } catch (e) { console.error('[v6 save]', e); }
      return _origSave.apply(this, arguments);
    };
  }

  /* ─────────── (2) ĐỒNG BỘ TSBĐ TỪ MENU TSBĐ ─────────── */
  function mdig(v) {
    if (typeof window.TSBD_mdig === 'function') { try { return window.TSBD_mdig(v); } catch (e) {} }
    var s = String(v == null ? '' : v).trim();
    if (/^[\d.]+e\+?\d+$/i.test(s)) { var n = Number(s); if (isFinite(n)) s = n.toFixed(0); }
    var d = s.replace(/[^0-9]/g, '');
    if (!d) return '';
    if (d.length > 13) d = d.slice(-13);
    if (d.length < 13) d = ('0000000000000' + d).slice(-13);
    return d;
  }
  function num(v) { var f = parseFloat(String(v == null ? '' : v).replace(/[^\d.-]/g, '')); return isFinite(f) ? f : 0; }
  function money(v) { try { return Math.round(num(v)).toLocaleString('vi-VN'); } catch (e) { return String(v); } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Lấy toàn bộ dòng TSBĐ; nếu kho chưa nạp (init trễ 1.2s) thì đọc seed ngay
  var _seedCache = null;
  function tsbdAllRows() {
    if (window.TSBD && Array.isArray(window.TSBD.rows) && window.TSBD.rows.length) return window.TSBD.rows;
    if (_seedCache) return _seedCache;
    var seed = document.getElementById('tsbd-seed-data');
    if (seed) { try { _seedCache = JSON.parse(seed.textContent) || []; } catch (e) { _seedCache = []; } }
    return _seedCache || [];
  }

  // Tra tài sản theo Mã KH: ưu tiên maKH (plgcustno), dự phòng maChuTS (clcustno)
  window.tsbdFromMenuTSBD = function (ma) {
    var maN = mdig(ma);
    if (!maN) return null;
    var rows = tsbdAllRows();
    if (!rows.length) return null;
    var list = rows.filter(function (t) { return mdig(t.maKH) === maN; });
    var via = 'maKH (plgcustno)';
    if (!list.length) {
      list = rows.filter(function (t) { return mdig(t.maChuTS) === maN; });
      via = 'maChuTS (clcustno)';
    }
    if (!list.length) return null;
    // HM-10: khử trùng clno (cùng TS thế chấp nhiều hợp đồng), chỉ cộng VND, giá trị thế chấp (plgamt) — nếu 0 dùng giá trị TS
    var _u = TD.tsbd.dedupe(list).unique;
    var tong = _u.reduce(function (s, t) { return s + (TD.tsbd.isVND(t) ? TD.tsbd.value(t) : 0); }, 0);
    return { list: _u, tong: tong, soLuong: _u.length, via: via, dupRemoved: list.length - _u.length, ngoaiTe: _u.filter(function (t) { return !TD.tsbd.isVND(t); }).length };
  };

  function renderTsbdDetail(res) {
    var host = document.getElementById('tsbd-sync-detail');
    if (!host) return;
    if (!res) { host.innerHTML = ''; host.style.display = 'none'; return; }
    var rowsHtml = res.list.map(function (t) {
      return '<tr>' +
        '<td>' + esc(t.soTS || '') + '</td>' +
        '<td>' + esc(t.soHDTC || '') + '</td>' +
        '<td>' + esc(t.tenChuTS || '') + '<div style="color:var(--gray-500);font-size:10px">' + esc(t.maChuTS || '') + '</div></td>' +
        '<td>' + esc(t.loaiTS || '') + '</td>' +
        '<td style="text-align:right">' + esc(t.dienTich || '') + (t.donVi ? ' ' + esc(t.donVi) : '') + '</td>' +
        '<td>' + esc(t.diaChiTS || '') + '</td>' +
        '<td style="text-align:right;font-weight:600">' + money(t.giaTriTC) + '</td>' +
        '</tr>';
    }).join('');
    host.style.display = '';
    host.innerHTML =
      '<div style="border:1px solid var(--gray-200,#e5e7eb);border-radius:8px;overflow:auto;max-height:230px;margin-top:6px">' +
      '<table style="width:100%;border-collapse:collapse;font-size:11px">' +
      '<thead><tr style="background:var(--gray-100,#f3f4f6);position:sticky;top:0">' +
      '<th style="text-align:left;padding:5px">Số TS (clno)</th>' +
      '<th style="text-align:left;padding:5px">Số HĐTC (plgno)</th>' +
      '<th style="text-align:left;padding:5px">Chủ TS (clcustnm)</th>' +
      '<th style="text-align:left;padding:5px">Loại TS (cltpcd)</th>' +
      '<th style="text-align:right;padding:5px">DT (clqtysz)</th>' +
      '<th style="text-align:left;padding:5px">Địa chỉ TS (clloc)</th>' +
      '<th style="text-align:right;padding:5px">Giá trị TC (plgamt)</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody>' +
      '<tfoot><tr style="background:#f3f4f6;font-weight:700;color:#111827">' +
      '<td colspan="6" style="padding:6px;text-align:right;color:#111827">TỔNG ' + res.soLuong + ' tài sản</td>' +
      '<td style="padding:6px;text-align:right;color:#065f46">' + money(res.tong) + ' đ</td>' +
      '</tr></tfoot></table></div>';
  }

  // Ghi đè hoàn toàn: chỉ dùng dữ liệu menu TSBĐ theo yêu cầu nghiệp vụ
  // silent=true: gọi tự động khi mở form (không hiện toast, chỉ cập nhật note + bảng chi tiết)
  window.syncTSBDFromHsvv = function (silent) {
    var form = document.getElementById('modal-form');
    if (!form) return;
    var ma = (form.querySelector('[name="makh"]') || {}).value || '';
    var note = document.getElementById('tsbd-sync-note');
    var res = window.tsbdFromMenuTSBD(ma);

    if (!res) {
      if (note) { note.style.color = 'var(--red-600,#dc2626)'; note.textContent = '⚠️ Menu TSBĐ không có tài sản nào cho Mã KH ' + (mdig(ma) || '(trống)'); }
      renderTsbdDetail(null);
      if (!silent && window.showToast) showToast('⚠️ Menu TSBĐ chưa có tài sản cho KH này', 'red');
      return;
    }

    var gt = form.querySelector('[name="tsbdGiaTri"]');
    var sl = form.querySelector('[name="tsbdSoLuong"]');
    // HM-10: mở form (silent) KHÔNG ghi đè giá trị TSBĐ đang có; chỉ khi bấm nút "Đồng bộ" mới thay
    var _cur = gt ? Number(String(gt.value || '').replace(/\D/g, '')) : 0;
    var _keep = !!(silent && gt && _cur > 0 && _cur !== Math.round(res.tong));
    if (gt && !_keep) { gt.value = (gt.dataset.moneyFmt === '1') ? groupDigits(Math.round(res.tong)) : Math.round(res.tong); }
    if (sl && !_keep) sl.value = res.soLuong;
    if (note) { note.style.color = 'var(--green-600,#16a34a)'; note.textContent = (silent ? '🔄 Tự động đồng bộ: đã lấy ' : '✅ Đã lấy ') + res.soLuong + ' tài sản từ menu TSBĐ · khớp theo ' + res.via; }
    if (_keep && note) { note.style.color = '#b45309'; note.textContent = 'ℹ️ Menu TSBĐ: ' + money(res.tong) + ' đ (' + res.soLuong + ' TS) khác giá trị đang lưu ' + money(_cur) + ' đ — bấm "Đồng bộ" để lấy, nếu không hồ sơ giữ nguyên.'; }
    renderTsbdDetail(res);
    if (!silent && window.showToast) showToast('✅ Đồng bộ ' + res.soLuong + ' tài sản (' + money(res.tong) + ' đ) từ menu TSBĐ', 'green');
  };

  // Thêm vùng hiển thị chi tiết + đổi nhãn nút cho đúng nguồn dữ liệu
  function ensureDetailHost() {
    var note = document.getElementById('tsbd-sync-note');
    if (!note) return;
    var btn = note.parentElement && note.parentElement.querySelector('button');
    if (btn) btn.textContent = '🔄 Đồng bộ TSBĐ từ menu Tài sản bảo đảm';
    if (!document.getElementById('tsbd-sync-detail')) {
      var d = document.createElement('div');
      d.id = 'tsbd-sync-detail';
      d.style.display = 'none';
      note.parentElement.appendChild(d);
    }
  }
  var _b2 = window.buildEditForm;
  window.buildEditForm = function () {
    var r = _b2.apply(this, arguments);
    try { ensureDetailHost(); } catch (e) { console.error('[v6 detail]', e); }
    // Tự động đồng bộ TSBĐ ngay khi mở form Sửa/Thêm hồ sơ — không cần bấm nút.
    // Chỉ chạy khi đã có Mã KH (hồ sơ Thêm mới trống Mã KH sẽ bỏ qua).
    try {
      var _form = document.getElementById('modal-form');
      var _ma = _form && (_form.querySelector('[name="makh"]') || {}).value;
      if (_ma && String(_ma).trim() && typeof window.syncTSBDFromHsvv === 'function') {
        window.syncTSBDFromHsvv(true);
      }
    } catch (e) { console.error('[v6 autosync]', e); }
    return r;
  };

  console.info('[ROOT-FIX v6] Money input formatting + TSBĐ sync from TSBĐ menu (plgamt) đã kích hoạt.');
})();
