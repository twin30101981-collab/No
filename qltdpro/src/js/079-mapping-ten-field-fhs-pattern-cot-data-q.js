
/* ═══════════════════════════════════════════════════════════════
   FHS v27 — TÍNH NĂNG ĐẦY ĐỦ: TRA CỨU KH · IMPORT · SYNC · TEMPLATE
   ═══════════════════════════════════════════════════════════════ */

// ── Mapping tên field FHS (pattern) → cột DATA.qltd ────────────
// Layout: 0=MãKH 1=Tên 2=SốHĐ 3=NgàyHĐ 5=HMTD 8=LS% 9=SốTiềnGN 11=DưNợ 13=LoạiVay 14=ĐịaChỉ
var _FHS_QLTD_MAP = [
  [/mã\s*khách\s*hàng|mã\s*kh\b/i,                           0],
  [/^tên\s*khách\s*hàng(\s*(vay|in\s*hoa))?$/i,              1],
  [/^tên\s*kh\b|^tên\s*khách\s*hàng\s*vay\s*in\s*hoa$/i,    1],
  [/số\s*hđ\s*(tín\s*dụng)?|số\s*hợp\s*đồng/i,              2],
  [/ngày\s*hđ\s*(tín\s*dụng)?|ngày\s*hợp\s*đồng/i,          3],
  [/hmtd\s*duyệt(?!\s*bằng)/i,                                5],
  [/lãi\s*suất\s*(vay)?(?!\s*(tháng|ưu|thường|sổ))/i,       8],
  [/số\s*tiền\s*vay(?!\s*bằng)/i,                             9],
  [/dư\s*nợ(?!\s*bằng)/i,                                     11],
  [/địa\s*chỉ(?!\s*(theo\s*hộ|kinh|người|đất|chủ|hộ\s*khẩu|đăng\s*ký))/i, 14],
  [/thể\s*loại\s*vay|loại\s*vay/i,                            13],
];

// ── Format helpers ───────────────────────────────────────────────
function _fhsFmtVnd(v) {
  var n = parseFloat(String(v).replace(/[,\.]/g,''));
  if (!n || isNaN(n)) return '';
  return Math.round(n).toLocaleString('vi-VN');
}
function _fhsMapLoaiVay(raw) {
  if (!raw) return '';
  if (/h[aạ]n\s*m[uứ]c|hmtd/i.test(raw))      return 'Hạn mức';
  if (/t[uư]ng\s*l[aầ]n|tlq/i.test(raw))       return 'Từng lần';
  if (/tr[aả]\s*g[oó]p/i.test(raw))             return 'Trả góp';
  if (/lu[aâ]n\s*chuy[eể]n/i.test(raw))         return 'Luân chuyển';
  return raw;
}

/* ───────────────────────────────────────────────────────────────
   A. TRA CỨU KH — tái dùng modal-kh-search, route sang FHS
   ─────────────────────────────────────────────────────────────── */
function fhsOpenKhSearch() {
  if (!_fhsLoai) {
    if (window.showToast) showToast('⚠️ Vui lòng chọn loại hồ sơ trước', 'orange');
    return;
  }
  var mo = document.getElementById('modal-kh-search');
  if (!mo) return;
  mo._fhsMode = true;
  mo.style.display = 'flex';
  var inp = document.getElementById('kh-search-input');
  if (inp) { inp.value = ''; inp.focus(); }
  if (typeof khSearchFilter === 'function') khSearchFilter();
}

// Điền row QLTD vào _fhsVals
function fhsFillFromQltd(r) {
  if (!_fhsLoai || !FHS_DATA[_fhsLoai]) return 0;
  var loaiData = FHS_DATA[_fhsLoai];
  var filled = [];

  Object.keys(loaiData.chips).forEach(function(chipKey) {
    var chipData = _fhsGetChipData(_fhsLoai, chipKey);
    var instances = _fhsGetInst(_fhsLoai, chipKey);
    chipData.fields.forEach(function(fn) {
      var colIdx = -1;
      for (var i = 0; i < _FHS_QLTD_MAP.length; i++) {
        if (_FHS_QLTD_MAP[i][0].test(fn)) { colIdx = _FHS_QLTD_MAP[i][1]; break; }
      }
      if (colIdx < 0) return;
      var raw = r[colIdx] != null ? String(r[colIdx]) : '';
      if (!raw || raw === '0') return;
      var val = raw;
      if (colIdx === 8) {
        var lsNum = parseFloat(raw);
        if (!isNaN(lsNum)) val = lsNum < 1 ? (lsNum * 100).toFixed(2).replace(/\.?0+$/, '') : lsNum.toString();
      } else if ([5, 9, 11].indexOf(colIdx) >= 0) {
        val = _fhsFmtVnd(raw);
      } else if (colIdx === 13) {
        val = _fhsMapLoaiVay(raw);
      }
      if (!val) return;
      instances[0][fn] = val;
      filled.push(fn);
    });
  });

  if (_fhsChip) _fhsRenderRows(_fhsLoai, _fhsChip);
  _fhsUpdateInfo();
  _fhsAutoSave();
  // Auto-link QLTD sync bar
  _fhsSyncAutoLink(r);
  var ten = r[1] || '';
  if (window.showToast) showToast('✅ Đã điền ' + filled.length + ' trường từ KH: ' + ten, 'green');
  return filled.length;
}

// Wrapper khSearchFill — detect FHS mode
var _fhsOrigKhSearchFill = window.khSearchFill;
window.khSearchFill = function(el) {
  var mo = document.getElementById('modal-kh-search');
  if (mo && mo._fhsMode) {
    mo._fhsMode = false;
    mo.style.display = 'none';
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
    fhsFillFromQltd(synth);
    return;
  }
  if (typeof _fhsOrigKhSearchFill === 'function') _fhsOrigKhSearchFill(el);
};

/* ───────────────────────────────────────────────────────────────
   B. SYNC BAR — đồng bộ 2 chiều FHS ↔ QLTD
   ─────────────────────────────────────────────────────────────── */
function _fhsSyncBar() {
  /* Fix #2: trả đúng sync bar theo mode — overlay dùng #fhs-sync-bar,
     page-fhs dùng #fhs-page-sync-bar */
  var id = (_fhsMode() === 'page') ? 'fhs-page-sync-bar' : 'fhs-sync-bar';
  return document.getElementById(id);
}

function _fhsSyncAutoLink(qltdRow) {
  var bar = _fhsSyncBar();
  if (!bar) return;
  if (qltdRow && qltdRow[0]) {
    bar.style.display = 'flex';
    var ten   = String(qltdRow[1] || '—').trim();
    var ma    = String(qltdRow[0] || '—').trim();
    var dn    = Number(qltdRow[11] || 0);
    var dnStr = dn > 0 ? dn.toLocaleString('vi-VN') + ' đ' : '—';
    var hd    = String(qltdRow[2] || '—').trim();
    bar.style.cssText = 'display:flex;padding:5px 16px;font-size:11px;align-items:center;gap:8px;background:#F0FFF4;border-bottom:1px solid #BBF7D0;min-height:32px';
    bar.innerHTML =
      '<span style="font-size:13px">🔗</span>' +
      '<span style="flex:1;color:#166534">' +
        '<strong>Đã liên kết QLTD:</strong> ' + (ten) + ' · Mã KH: ' + (ma) +
        ' · Số HĐ: ' + (hd) + ' · Dư nợ: ' + dnStr +
      '</span>' +
      '<button onclick="fhsGotoQltd(\'' + ma + '\',\'' + hd + '\')" ' +
        'style="background:#166534;color:#fff;border:none;border-radius:5px;padding:3px 10px;font-size:10.5px;cursor:pointer;white-space:nowrap">' +
        '🔍 Xem QLTD' +
      '</button>';
    // Lưu để dùng lại
    window._fhsLinkedQltdRow = qltdRow;
  } else {
    _fhsSyncBarNotFound();
  }
}

function _fhsSyncBarNotFound() {
  var bar = _fhsSyncBar();
  if (!bar) return;
  bar.style.cssText = 'display:flex;padding:5px 16px;font-size:11px;align-items:center;gap:8px;background:#FFFBEB;border-bottom:1px solid #FDE68A;min-height:32px';
  bar.innerHTML =
    '<span>⚠️</span>' +
    '<span style="flex:1;color:#92400E">Chưa tìm thấy trong QLTD — Kiểm tra Mã KH / Số HĐ hoặc cần import IPCAS mới nhất</span>';
}

function _fhsSyncBarShow() {
  var bar = _fhsSyncBar();
  if (!bar) return;
  // Thử auto-link nếu đã có dữ liệu trong _fhsVals
  var maKH = '', soHD = '';
  if (_fhsLoai) {
    var loaiData = FHS_DATA[_fhsLoai];
    Object.keys(loaiData.chips).forEach(function(ck) {
      var inst = _fhsGetInst(_fhsLoai, ck);
      var vals = inst[0] || {};
      Object.keys(vals).forEach(function(fn) {
        if (/mã\s*kh/i.test(fn) && vals[fn]) maKH = vals[fn];
        if (/số\s*hđ/i.test(fn) && vals[fn]) soHD = vals[fn];
      });
    });
  }
  if (maKH || soHD) {
    var found = _fhsFindQltdRow(maKH, soHD);
    if (found) { _fhsSyncAutoLink(found); return; }
    else { _fhsSyncBarNotFound(); return; }
  }
  bar.style.cssText = 'display:flex;padding:5px 16px;font-size:11px;align-items:center;gap:8px;background:#F8FAFC;border-bottom:1px solid #E8EDF4;min-height:32px;color:#94a3b8';
  bar.innerHTML = '<span>○</span><span>Chưa liên kết QLTD — Tra cứu KH hoặc nhập Mã KH / Số HĐ vào form rồi lưu</span>';
}

function _fhsFindQltdRow(maKH, soHD) {
  if (!window.DATA || !Array.isArray(DATA.qltd)) return null;
  var ma = String(maKH || '').trim().toUpperCase();
  var hd = String(soHD || '').trim();
  if (ma && hd) {
    var r = DATA.qltd.find(function(row) {
      return String(row[0]||'').trim().toUpperCase() === ma && String(row[2]||'').trim() === hd;
    });
    if (r) return r;
  }
  if (ma) {
    var r = DATA.qltd.find(function(row) { return String(row[0]||'').trim().toUpperCase() === ma; });
    if (r) return r;
  }
  if (hd) {
    var r = DATA.qltd.find(function(row) { return String(row[2]||'').trim() === hd; });
    if (r) return r;
  }
  return null;
}

function fhsGotoQltd(maKH, soHD) {
  closeFhsForm();
  if (typeof showPage === 'function') showPage('qltd', document.querySelector('[data-page=qltd]'));
  if (typeof hsvvHighlightQltdRow === 'function') {
    setTimeout(function() { hsvvHighlightQltdRow(maKH, soHD); }, 250);
  }
}

// Patch fhsSelectLoai để hiện sync bar sau khi chọn loại
var _fhsOrigSelectLoai = window.fhsSelectLoai;
window.fhsSelectLoai = function(loai) {
  if (typeof _fhsOrigSelectLoai === 'function') _fhsOrigSelectLoai(loai);
  _fhsSyncBarShow();
};

/* ───────────────────────────────────────────────────────────────
   C. IMPORT FILE — tái dùng import-modal-ov, route sang FHS
   ─────────────────────────────────────────────────────────────── */
// Mapping: tên field FHS (field name) → key trong imExtracted (IM_FIELD_MAP keys hoặc IM_LABELS keys)
// imExtracted dùng elementId như 'tenKH','cmnd','diaChi'...
// _FHS_IM_MAP: regex match tên field FHS → elementId của imExtracted
var _FHS_IM_MAP = [
  [/^tên\s*khách\s*hàng(\s*(vay))?$/i,               'tenKH'],
  [/tên\s*khách\s*hàng\s*in\s*hoa/i,                  'tenKHHoa'],
  [/mã\s*khách\s*hàng|mã\s*kh\b/i,                   'maKH'],
  [/tài\s*khoản\s*thanh\s*toán/i,                     'tkTT'],
  [/xưng\s*hô(?!\s*(người|thừa|chủ))/i,               'xungHo'],
  [/nam[\s\/]*nữ|giới\s*tính/i,                       'gioiTinh'],
  [/loại\s*cmnd|loại\s*cmnt/i,                        'loaiCMND'],
  [/^cmnd$|^cccd$|số\s*(cmnd|cccd)/i,                 'cmnd'],
  [/năm\s*sinh\s*người\s*vay|ngày\s*sinh/i,           'ngaySinh'],
  [/địa\s*chỉ\s*theo\s*hộ\s*khẩu/i,                  'diaChiHK'],
  [/địa\s*chỉ\s*(kinh\s*doanh)?$/i,                   'diaChi'],
  [/địa\s*chỉ\s*kinh\s*doanh/i,                       'diaChiKD'],
  [/số\s*điện\s*thoại|điện\s*thoại|sdt/i,             'sdt'],
  [/nghề\s*nghiệp/i,                                   'ngheNghiep'],
  [/đăng\s*ký\s*kinh\s*doanh|dkkd/i,                  'dkkd'],
  [/số\s*hđ\s*(tín\s*dụng)?|số\s*hợp\s*đồng/i,       'soHDTD'],
  [/ngày\s*hđ\s*(tín\s*dụng)?|ngày\s*hợp\s*đồng/i,   'ngayHDTD'],
  [/hmtd\s*duyệt(?!\s*bằng)/i,                         'hmtdDuyet'],
  [/số\s*tiền\s*vay(?!\s*bằng)/i,                      'soTienVay'],
  [/thể\s*loại\s*vay|loại\s*vay/i,                    'theLoaiVay'],
  [/thời\s*hạn\s*vay/i,                               'thoiHan'],
  [/lãi\s*suất\s*(vay)?(?!\s*(tháng|ưu|thường))/i,   'laiSuat'],
  [/mục\s*đích\s*vay\s*cụ\s*thể/i,                    'mucDichCuThe'],
  [/mục\s*đích\s*vay/i,                               'mucDichVay'],
  [/ngày\s*giao[\-\s]*nhận/i,                          'ngayGiaoNhan'],
  [/ngày\s*bìa/i,                                      'ngayBia'],
  [/ngày\s*cic/i,                                      'ngayCIC'],
  [/số\s*ủy\s*quyền/i,                                 'soUyQuyen'],
  [/người\s*qhkh|người\s*qln/i,                        'nguoiQHKH'],
  [/người\s*thẩm\s*định/i,                             'nguoiThamDinh'],
  [/người\s*duyệt/i,                                   'nguoiDuyet'],
  [/tổng\s*nhu\s*cầu\s*vốn/i,                         'ncv'],
  [/vốn\s*tự\s*có/i,                                   'vonTuCo'],
  [/dư\s*nợ(?!\s*bằng)/i,                              'duNo'],
  [/người\s*thừa\s*kế/i,                               'tenTK'],
  [/quan\s*hệ\s*người\s*thừa\s*kế/i,                  'quanHeTK'],
  [/cmt\s*người\s*thừa\s*kế/i,                         'cmndTK'],
  // TSBD fields
  [/chủ\s*tài\s*sản/i,                                 'chuTS'],
  [/tên\s*tsbđ/i,                                      'tenTSBD'],
  [/số\s*bìa\s*đỏ/i,                                   'soBiaDo'],
  [/địa\s*chỉ\s*đất/i,                                 'diaChiDat'],
  [/loại\s*đất/i,                                      'loaiDat'],
  [/diện\s*tích\s*đất/i,                               'dtDat'],
  [/số\s*thửa/i,                                       'soThua'],
  [/số\s*tờ\s*bản\s*đồ/i,                              'soToBanDo'],
  [/số\s*bbđg/i,                                       'soBBDG'],
  [/ngày\s*bbđg/i,                                     'ngayBBDG'],
  [/giá\s*đất\s*g0/i,                                  'giaDatG0'],
  [/số\s*hđ\s*thế\s*chấp/i,                            'soHDTC'],
  [/ngày\s*ký\s*hđtc/i,                                'ngayKyHDTC'],
];

window._imFhsMode = false; // flag: import modal đang phục vụ FHS

function fhsImportOpen() {
  if (!_fhsLoai) {
    if (window.showToast) showToast('⚠️ Vui lòng chọn loại hồ sơ trước', 'orange');
    return;
  }
  window._imFhsMode = true;
  if (typeof importModalOpen === 'function') importModalOpen();
}

// Patch imApplyFields để route sang FHS khi _imFhsMode = true
var _fhsOrigImApply = window.imApplyFields;
window.imApplyFields = function() {
  if (!window._imFhsMode) {
    if (typeof _fhsOrigImApply === 'function') _fhsOrigImApply();
    return;
  }
  // FHS mode: điền vào _fhsVals thay vì getElementById
  window._imFhsMode = false;
  var checked = Array.from(document.querySelectorAll('.im-row-chk:checked')).map(function(c){ return c.dataset.id; });
  if (!window.imExtracted) { if (typeof importModalClose==='function') importModalClose(); return; }
  var filled = 0;
  var loaiData = FHS_DATA[_fhsLoai];
  if (!loaiData) { if (typeof importModalClose==='function') importModalClose(); return; }

  // Build lookup: elementId → value (từ imExtracted đã được check)
  var idToVal = {};
  checked.forEach(function(id) {
    var v = window.imExtracted[id];
    if (v) idToVal[id] = String(v);
  });

  Object.keys(loaiData.chips).forEach(function(chipKey) {
    var chipData = _fhsGetChipData(_fhsLoai, chipKey);
    var instances = _fhsGetInst(_fhsLoai, chipKey);
    chipData.fields.forEach(function(fn) {
      // Tìm elementId mapping
      var targetId = null;
      for (var i = 0; i < _FHS_IM_MAP.length; i++) {
        if (_FHS_IM_MAP[i][0].test(fn)) { targetId = _FHS_IM_MAP[i][1]; break; }
      }
      if (!targetId || !idToVal[targetId]) return;
      var val = idToVal[targetId];
      instances[0][fn] = val;
      filled++;
    });
  });

  _fhsAutoSave();
  if (_fhsChip) _fhsRenderRows(_fhsLoai, _fhsChip);
  _fhsUpdateInfo();
  _fhsSyncBarShow();
  if (typeof importModalClose === 'function') importModalClose();
  /* Fix #3: đảm bảo page-fhs body được cập nhật sau khi điền xong */
  if (_fhsMode() === 'page') setTimeout(_fhsPageSyncFromOverlay, 120);
  if (window.showToast) showToast('✅ Đã điền ' + filled + ' trường từ file vào Form Hồ Sơ', 'green');
};

/* ───────────────────────────────────────────────────────────────
   D. XUẤT TEMPLATE — cầu nối FHS → Export Center (PizZip + Docxtemplater)
   ─────────────────────────────────────────────────────────────── */
function collectFhsData() {
  // Thu thập tất cả _fhsVals của loại đang mở thành object key→value
  var out = {};
  if (!_fhsLoai || !FHS_DATA[_fhsLoai]) return out;
  var loaiData = FHS_DATA[_fhsLoai];
  Object.keys(loaiData.chips).forEach(function(ck) {
    var chipData = _fhsGetChipData(_fhsLoai, ck);
    var instances = _fhsGetInst(_fhsLoai, ck);
    instances.forEach(function(iVals, idx) {
      var sfx = chipData.loop && instances.length > 1 ? '_' + (idx + 1) : '';
      chipData.fields.forEach(function(fn) {
        var ph = fn + sfx;
        var val = iVals[fn] || '';
        // Thêm cả dạng key chuẩn để tương thích collectDocxData format
        out[ph] = val;
        // Tên viết hoa cho một số trường
        if (/tên\s*khách\s*hàng\s*in\s*hoa|tên\s*kh\s*hoa/i.test(fn)) {
          out[ph] = String(val).toUpperCase();
        }
      });
    });
  });
  return out;
}

function fhsExportViaEC() {
  if (!_fhsLoai) {
    if (window.showToast) showToast('⚠️ Vui lòng chọn loại hồ sơ trước', 'orange');
    return;
  }
  if (typeof exportCenterOpen !== 'function') {
    if (window.showToast) showToast('⚠️ Export Center chưa sẵn sàng', 'orange');
    return;
  }
  // Patch collectDocxData tạm thời để Export Center lấy dữ liệu từ FHS
  var _origCollect = window.collectDocxData;
  window.collectDocxData = function() {
    // Merge: HSVV data (gốc) + FHS data (ưu tiên FHS nếu có)
    var hsvvData = (typeof _origCollect === 'function') ? _origCollect() : {};
    var fhsData  = collectFhsData();
    // FHS override HSVV cho các key trùng
    return Object.assign({}, hsvvData, fhsData);
  };
  // Mở Export Center
  exportCenterOpen();
  // Restore collectDocxData sau khi export center đóng (watch for close)
  var _checkClose = setInterval(function() {
    var ov = document.getElementById('export-center-ov');
    if (ov && !ov.classList.contains('open')) {
      window.collectDocxData = _origCollect;
      clearInterval(_checkClose);
    }
  }, 800);
}
