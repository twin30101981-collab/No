
  // ═════════════════════════════════════════════════════════════════════════════════
  // TEMPLATE DATA - Dữ liệu mẫu từ bộ hồ sơ Khách hàng mẫu
  // ═════════════════════════════════════════════════════════════════════════════════
  const APC_TEMPLATE_DATA = {
    'mau-cap-von': {
      name: 'Khách hàng mẫu - Cấp vốn 2024',
      type: 'cap-von',
      data: {
        '[Số HĐ tín dụng]': 'HD2024-000521',
        '[Ngày HĐ tín dụng]': '2024-06-07',
        '[Ngày giao-nhận HS]': '2024-06-07',
        '[Người QHKH/QLN]': 'Trần Văn A',
        '[Người thẩm định]': 'Nguyễn Thị B',
        '[Người duyệt]': 'Lê Văn C',
        '[Chức vụ người duyệt]': 'Trưởng phòng TD',
        '[Bên vay]': 'Cá nhân',
        '[Xưng hô]': 'Bà',
        '[Nam/nữ]': 'Nữ',
        '[Tên khách hàng vay]': 'Khách hàng mẫu',
        '[Loại CMND]': 'CMND',
        '[CMND]': '012345678901',
        '[Năm sinh người vay]': '1980',
        '[Địa chỉ]': '321 Hoàng Văn Thụ, Phường Ninh Khánh, TP. Nam Định',
        '[Số điện thoại]': '0912345678',
        '[Nghề nghiệp]': 'Kinh doanh buôn bán',
        '[Tài khoản thanh toán]': '0123456789',
        '[Mã khách hàng]': 'KH2024000521',
        '[Thể loại vay]': 'Hạn mức',
        '[Mục đích vay]': 'Vốn lưu động kinh doanh',
        '[Mục đích vay cụ thể]': 'Mua hàng hoá, nguyên liệu sản xuất',
        '[Số tiền vay]': 500000000,
        '[HMTD duyệt]': 500000000,
        '[Thời hạn vay]': 24,
        '[Lãi suất vay]': 6.5,
        '[Phương thức thanh toán]': 'Trích nợ quá hạn',
        '[Ngày đến hạn HMTD]': '2026-06-07',
        '[SĐ.Tên TSBĐ]': 'Đất và nhà số 321 Hoàng Văn Thụ',
        '[SĐ.Loại đất]': 'Đất ở',
        '[SĐ.Số bìa đỏ]': '123456',
        '[SĐ.Địa chỉ đất]': '321 Hoàng Văn Thụ, Phường Ninh Khánh, TP. Nam Định',
        '[SĐ.Diện tích đất]': 150,
        '[SĐ.Tổng giá trị TS]': 2000000000,
        '[SĐ.Nghĩa vụ bảo đảm]': 600000000,
        '[Xếp hạng]': 'A',
        '[Chấm điểm]': 85,
        '[Về phương diện kỹ thuật]': 'Kỹ thuật tốt, có kinh nghiệm',
        '[Thị trường đầu vào]': 'Ổn định',
        '[Thị trường đầu ra]': 'Tốt, nhu cầu cao'
      }
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════════
  // FUNCTIONS
  // ═════════════════════════════════════════════════════════════════════════════════

  function openTemplateModal() {
    const _m=document.getElementById('templateModal'); if(_m){_m.style.display='flex';_m.classList.add('open');}
  }

  function closeTemplateModal() {
    const _m2=document.getElementById('templateModal'); if(_m2){_m2.style.display='none';_m2.classList.remove('open');}
  }

  function loadSelectedTemplate() {
    const selected = document.querySelector('input[name="template"]:checked');
    if (!selected) {
      apcShowToast('⚠️ Vui lòng chọn template', '#D68910');
      return;
    }

    const templateId = selected.value;
    const template = APC_TEMPLATE_DATA[templateId];

    if (!template) {
      apcShowToast('❌ Template không tồn tại', '#C0392B');
      return;
    }

    document.getElementById('loaderProgress').classList.add('active');
    document.getElementById('loadBtn').disabled = true;

    setTimeout(() => {
      loadTemplateData(template);
      document.getElementById('loaderProgress').classList.remove('active');
      document.getElementById('loadBtn').disabled = false;
      closeTemplateModal();
      apcShowToast(`✅ Đã tải template: ${template.name}`);
    }, 800);
  }

  function loadTemplateData(template) {
    const mapping = {
      '[Số HĐ tín dụng]': 'soHDTD',
      '[Ngày HĐ tín dụng]': 'ngayHDTD',
      '[Ngày giao-nhận HS]': 'ngayGiaoNhan',
      '[Người QHKH/QLN]': 'nguoiQHKH',
      '[Người thẩm định]': 'nguoiThamDinh',
      '[Người duyệt]': 'nguoiDuyet',
      '[Chức vụ người duyệt]': 'chucVuDuyet',
      '[Tên khách hàng vay]': 'tenKH',
      '[Nam/nữ]': 'gioiTinh',
      '[Xưng hô]': 'xungHo',
      '[Loại CMND]': 'loaiCMND',
      '[CMND]': 'cmnd',
      '[Năm sinh người vay]': 'ngaySinh',
      '[Địa chỉ]': 'diaChi',
      '[Số điện thoại]': 'sdt',
      '[Nghề nghiệp]': 'ngheNghiep',
      '[Tài khoản thanh toán]': 'tkTT',
      '[Mã khách hàng]': 'maKH',
      '[Thể loại vay]': 'theLoaiVay',
      '[Mục đích vay]': 'mucDichVay',
      '[Mục đích vay cụ thể]': 'mucDichCuThe',
      '[Số tiền vay]': 'soTienVay',
      '[HMTD duyệt]': 'hmtdDuyet',
      '[Thời hạn vay]': 'thoiHan',
      '[Lãi suất vay]': 'laiSuat',
      '[Phương thức thanh toán]': 'phuongThucTT',
      '[Ngày đến hạn HMTD]': 'ngayDenHan',
      '[SĐ.Tên TSBĐ]': 'tenTSBD',
      '[SĐ.Loại đất]': 'loaiDat',
      '[SĐ.Số bìa đỏ]': 'soBiaDo',
      '[SĐ.Địa chỉ đất]': 'diaChiDat',
      '[SĐ.Diện tích đất]': 'dtDat',
      '[SĐ.Tổng giá trị TS]': 'giaTriTS',
      '[SĐ.Nghĩa vụ bảo đảm]': 'nghiaVuBD',
      '[Xếp hạng]': 'xepHangKH',
      '[Chấm điểm]': 'chamDiem',
      '[Về phương diện kỹ thuật]': 'ktThuat',
      '[Thị trường đầu vào]': 'ttDauVao',
      '[Thị trường đầu ra]': 'ttDauRa'
    };

    Object.entries(template.data).forEach(([key, value]) => {
      const elId = mapping[key];
      if (elId) {
        const el = document.getElementById(elId);
        if (el && !el.readOnly) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    // Trigger recalculations
    if (typeof calcFinance === 'function') calcFinance();
    if (typeof calcGiaDat === 'function') calcGiaDat();
    if (typeof updateBenVay === 'function') updateBenVay();
    if (typeof updateProgress === 'function') updateProgress();
    if (typeof updateChecklist === 'function') updateChecklist();
  }

  function apcShowToast(message, bgColor = '#1A7F4B') { // HM-16c: màu cũ → loại thông báo
    TD.toast(message, { type: bgColor === '#C0392B' ? 'error' : bgColor === '#D68910' ? 'warn' : 'success', duration: 3500 });
  }

  // Close modal on overlay click + ESC key (safe, after DOM ready)
  document.addEventListener('DOMContentLoaded', () => {
    const _tmOv = document.getElementById('templateModal');
    if (_tmOv) {
      _tmOv.addEventListener('click', (e) => {
        if (e.target === _tmOv) closeTemplateModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTemplateModal();
    });
  });

  (0)&&console.log('✅ Template Loader Plugin loaded successfully!');
  (0)&&console.log('📌 Click the 🎨 button at bottom-right to load template');

function apcShowSec(id, el) {
  var ids = ['s0','s1','s2','s3','s4','s5','s_td','s6','s7','s8','s9','s10'];
  for (var i = 0; i < ids.length; i++) {
    var s = document.getElementById(ids[i]);
    if (s) s.style.display = 'none';
  }
  var t = document.getElementById(id);
  if (t) t.style.display = 'block';
  document.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
  if (el) el.classList.add('active');
}


/* ===== PHƯƠNG ÁN SXKD - BẢNG TÍNH EXCEL A1:K54 ===== */

function xlN(id) {
  var el = document.getElementById(id);
  if (!el) return 0;
  if (el.tagName === 'INPUT') {
    var raw = el.value.replace(/\./g, '').replace(',', '.');
    return parseFloat(raw) || 0;
  }
  return parseFloat(el.getAttribute('data-val')) || 0;
}
function xlSet(id, val) {
  var el = document.getElementById(id);
  if (!el) return;
  if (isNaN(val) || !isFinite(val)) { el.textContent = '—'; el.setAttribute('data-val','0'); return; }
  el.setAttribute('data-val', val);
  el.textContent = val === 0 ? '0' : (function(v){ var r=Math.round(v); return Math.abs(r)<1000 ? String(r) : r.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.'); })(val);
}
function xlGet(id) {
  var el = document.getElementById(id);
  if (!el) return 0;
  if (el.tagName === 'TD') return parseFloat(el.getAttribute('data-val')) || 0;
  var raw = el.value.replace(/\./g, '').replace(',', '.');
  return parseFloat(raw) || 0;
}


/* ══ Thousand-separator helpers ══════════════════════════════ */
function xlFmtNum(n) {
  if (n === '' || n === null || n === undefined) return '';
  // Strip existing dot separators then parse
  var raw = String(n).replace(/\./g,'').replace(',','.');
  var num = parseFloat(raw);
  if (isNaN(num)) return String(n);
  // Always use integer display (no decimals)
  var rounded = Math.round(num);
  if (Math.abs(rounded) < 1000) return String(rounded);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function xlRawNum(el) {
  if (!el) return 0;
  return parseFloat(String(el.value||'').replace(/\./g,'').replace(',','.')) || 0;
}
function xlOnFocus(inp) {
  var raw = xlRawNum(inp);
  inp.value = raw !== 0 ? (raw % 1 === 0 ? Math.round(raw).toString() : String(raw)) : '';
  inp.select && inp.select();
}
function xlOnBlur(inp) {
  var raw = xlRawNum(inp);
  inp.value = xlFmtNum(raw);
  xlCalcAll();
}
function xlOnInput(inp) {
  xlCalcAll();
}
function xlFmtAllInputs() {
  document.querySelectorAll('#pa-sxkd-wrapper input.xl-num').forEach(function(inp) {
    if (document.activeElement !== inp) {
      var raw = xlRawNum(inp);
      inp.value = xlFmtNum(raw);
    }
  });
}


/* ══ Column wrap-toggle ══════════════════════════════════════════ */
var _xlColWrapState = {}; // {colIdx: true/false}

function xlToggleColWrap(colIdx, enable) {
  _xlColWrapState[colIdx] = enable;
  _xlApplyColWrap(colIdx, enable);
}

function _xlApplyColWrap(colIdx, enable) {
  var table = document.getElementById('hsvv-xl-main-table') ||
              document.getElementById('xl-main-table');
  if (!table) return;

  // colIdx 1-based → nth-child in <tr> is colIdx+1 (because rownum td is first)
  var nthChild = colIdx + 1;

  // Apply/remove xl-col-wrap class on every td in that column
  table.querySelectorAll('tbody tr').forEach(function(tr) {
    var tds = tr.children;
    var td = tds[colIdx]; // 0-based: rownum=0, colA=1, colB=2...
    if (!td) return;
    if (enable) {
      td.classList.add('xl-col-wrap');
      td.style.whiteSpace = 'normal';
      td.style.overflow = 'visible';
      td.style.height = 'auto';
      td.style.verticalAlign = 'top';
      // Also fix inputs inside
      td.querySelectorAll('input').forEach(function(inp) {
        inp.style.whiteSpace = 'normal';
        inp.style.overflow = 'visible';
        inp.style.height = 'auto';
        inp.style.wordBreak = 'break-word';
      });
    } else {
      td.classList.remove('xl-col-wrap');
      td.style.whiteSpace = '';
      td.style.overflow = '';
      td.style.height = '';
      td.style.verticalAlign = '';
      td.querySelectorAll('input').forEach(function(inp) {
        inp.style.whiteSpace = '';
        inp.style.overflow = '';
        inp.style.height = '';
        inp.style.wordBreak = '';
      });
    }
  });

  // Also update the th header style
  var th = document.getElementById('xl-th-' + colIdx);
  if (th) {
    th.style.background = enable ? 'rgba(200,168,75,.25)' : '';
    var chk = th.querySelector('input[type="checkbox"]');
    if (chk) chk.checked = enable;
  }
}

// Re-apply wrap states after any render (e.g. adding rows)
function xlRestoreColWrap() {
  Object.keys(_xlColWrapState).forEach(function(colIdx) {
    if (_xlColWrapState[colIdx]) _xlApplyColWrap(parseInt(colIdx), true);
  });
}


/* ══ SXKD FULLSCREEN ════════════════════════════════════════════ */
var _sxkdIsFS = false;
var _sxkdScrollY = 0;

function sxkdToggleFS() {
  _sxkdIsFS ? sxkdExitFS() : sxkdEnterFS();
}

function sxkdEnterFS() {
  _sxkdIsFS = true;
  _sxkdScrollY = window.scrollY;
  document.body.classList.add('sxkd-fullscreen');

  // Show backdrop
  var ov = document.getElementById('sxkd-fs-overlay');
  if (ov) ov.style.display = 'block';

  // Update button label
  var btn = document.getElementById('sxkd-fs-btn');
  if (btn) { btn.innerHTML = '⛶ Thu nhỏ'; btn.title = 'Thu nhỏ bảng tính (Esc)'; }

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Stretch the table wrap to fill height
  _sxkdFixHeight();

  // Recalculate / re-render if needed
  if (typeof xlCalcAll === 'function') setTimeout(xlCalcAll, 80);
  if (typeof xlFmtAllInputs === 'function') setTimeout(xlFmtAllInputs, 120);
}

function sxkdExitFS() {
  if (!_sxkdIsFS) return;
  _sxkdIsFS = false;
  document.body.classList.remove('sxkd-fullscreen');

  // Hide backdrop
  var ov = document.getElementById('sxkd-fs-overlay');
  if (ov) ov.style.display = 'none';

  // Restore button label
  var btn = document.getElementById('sxkd-fs-btn');
  if (btn) { btn.innerHTML = '⛶ Toàn màn hình'; btn.title = 'Bật/tắt chế độ toàn màn hình (Esc)'; }

  // Restore scroll
  document.body.style.overflow = '';
  window.scrollTo(0, _sxkdScrollY);

  // Clear fixed heights
  _sxkdClearHeight();
}

function _sxkdFixHeight() {
  // Find the scrollable table wrap inside pa-sxkd-wrapper
  var wrapper = document.getElementById('pa-sxkd-wrapper');
  if (!wrapper) return;
  // Find div with overflow:auto or the xl-table-wrap
  var wrap = wrapper.querySelector('#hsvv-xl-main-wrap, #xl-table-wrap, [id$="-wrap"]');
  if (wrap) {
    wrap.style.maxHeight = 'calc(100vh - 140px)';
    wrap.style.overflow = 'auto';
  }
}

function _sxkdClearHeight() {
  var wrapper = document.getElementById('pa-sxkd-wrapper');
  if (!wrapper) return;
  var wrap = wrapper.querySelector('#hsvv-xl-main-wrap, #xl-table-wrap, [id$="-wrap"]');
  if (wrap) {
    wrap.style.maxHeight = '';
  }
}

// Close panel (keeps sidebar intact)
function sxkdClosePanel() {
  // Exit fullscreen first if active
  if (_sxkdIsFS) sxkdExitFS();
  // Hide wrapper
  var wrapper = document.getElementById('pa-sxkd-wrapper');
  if (wrapper) wrapper.style.display = 'none';
  // Restore chip state
  var chip = document.querySelector('.chip-sxkd');
  if (chip) { chip.classList.remove('chip-open'); chip.title = 'Mở bảng tính Phương án SXKD'; }
}

// ESC key to exit fullscreen
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _sxkdIsFS) {
    sxkdExitFS();
  }
});

// Window resize: re-fix height
window.addEventListener('resize', function() {
  if (_sxkdIsFS) _sxkdFixHeight();
});

function xlCalcAll() {
  // ─── Inputs shorthand (col: A=1,B=2,C=3,D=4,E=5,F=6,G=7,H=8,I=9,J=10,K=11)
  // ── Compute D*E for all dynamic product rows first
  xlCalcProductRows();

  // F22 = SUM of all region 1 product TT cells (dynamic)
  var F22 = xlSumR1();
  xlSet('xl_22_6', F22);

  // F23 = D23*E23/100
  var F23 = xlN('xl_23_4') * xlN('xl_23_5') / 100;
  xlSet('xl_23_6', F23);

  // F24 is input (264000000)
  var F24 = xlN('xl_24_6');

  // F25 is input
  var F25 = xlN('xl_25_6');

  // F26 is input (khấu hao = 0)
  var F26 = xlN('xl_26_6');

  // F27 is input (thuế = 10000000)
  var F27 = xlN('xl_27_6');

  // F28 = F22+F23+F24+F25+F26+F27
  var F28 = F22 + F23 + F24 + F25 + F26 + F27;
  xlSet('xl_28_6', F28);

  // ── I column ───────────────────────────────────────────────────────────────
  var I3 = xlN('xl_3_9');
  var I4 = xlN('xl_4_9');
  var I5 = xlN('xl_5_10'); // J5 in Excel but logically I5 slot
  var I2 = I3 + I4 + I5;
  xlSet('xl_2_9', I2);
  xlSet('xl_2_10', I2 > 0 ? (I3/I2*100) : 0);

  // I13 = G13*H13*12
  var I13 = xlN('xl_13_7') * xlN('xl_13_8') * 12;
  xlSet('xl_13_9', I13);

  // I14 = G14*H14*12
  var I14 = xlN('xl_14_7') * xlN('xl_14_8') * 12;
  xlSet('xl_14_9', I14);

  // I15 = I13+I14
  xlSet('xl_15_9', I13 + I14);

  // I17 = I2*1.2
  var I17 = I2 * 1.2;
  xlSet('xl_17_9', I17);

  // I18 = F23
  xlSet('xl_18_9', F23);

  // I19 = F26
  xlSet('xl_19_9', F26);

  // I20 = F27
  xlSet('xl_20_9', F27);

  // I21 = I17+I18+I19+I20
  var I21 = I17 + F23 + F26 + F27;
  xlSet('xl_21_9', I21);

  // G23 = G21+G22
  var G21 = xlN('xl_21_7');
  var G22 = xlN('xl_22_7');
  xlSet('xl_23_7', G21 + G22);

  // G28 = I21
  xlSet('xl_28_7', I21);

  // G29 = G28 - F28
  xlSet('xl_29_7', I21 - F28);

  // I23 = F22
  xlSet('xl_23_9', F22);

  // I24 = F23+F24+F25+F26+F27
  var I24 = F23 + F24 + F25 + F26 + F27;
  xlSet('xl_24_9', I24);

  // J21 = I21 - I23 - I24
  xlSet('xl_21_10', I21 - F22 - I24);

  // ── Asset section I26-I33 ─────────────────────────────────────────────────
  var I27 = xlN('xl_27_9');
  var I28 = xlN('xl_28_9');
  var I29 = xlN('xl_29_9');
  var I30 = xlN('xl_30_9');
  var I31 = xlN('xl_31_9');
  var I33 = xlN('xl_33_9');
  var K30 = I3; // K30 = I3
  xlSet('xl_30_11', K30);

  // I32 = K30+I33-I28-I30-I31
  var I32 = K30 + I33 - I28 - I30 - I31;
  xlSet('xl_32_9', I32);

  // I26 = I27+I28+I29+I30+I31+I32 - I33
  var I26 = I27 + I28 + I29 + I30 + I31 + I32 - I33;
  xlSet('xl_26_9', I26);

  // J29 = J27+J28
  xlSet('xl_29_10', xlN('xl_27_10') + xlN('xl_28_10'));

  // ── Second asset section ──────────────────────────────────────────────────
  var I38 = xlN('xl_38_9');
  var I40 = xlN('xl_40_9');
  var I41 = xlN('xl_41_9');
  var I42 = xlN('xl_42_9');
  var I43 = xlN('xl_43_9');
  var I44_inp = xlN('xl_44_9'); // nợ phải trả
  // G44 = F16*1.5
  xlSet('xl_44_7', xlGet('xl_16_6') * 1.5);

  // I37 = I38+I40+I41+I42+I43 - I44
  var I37 = I38 + I40 + I41 + I42 + I43 - I44_inp;
  xlSet('xl_37_9', I37);

  // J44 = J33+J34
  xlSet('xl_44_10', xlN('xl_33_10') + xlN('xl_34_10'));

  // J45 = I37 - I44
  xlSet('xl_45_10', I37 - I44_inp);

  // G49 = F18*1.5
  xlSet('xl_49_7', xlGet('xl_18_6') * 1.5);

  // F51 = SUM of all region 2 product TT cells (dynamic)
  var F51 = xlSumR2();
  xlSet('xl_51_6', F51);

  // F52 = Doanh thu - Chi phí = Lợi nhuận
  xlSet('xl_52_6', F51 - F28);
}

function xlFmt(v) {
  return Number(v).toLocaleString('vi-VN');
}

// ── Drag and Drop + File Import ───────────────────────────────────────────────
function xlDragOver(e) {
  e.preventDefault();
  var dz = document.getElementById('hsvv-xl-drop-zone');
  if(dz) dz.style.display='flex';
}
function xlDragLeave(e) {
  var dz = document.getElementById('hsvv-xl-drop-zone');
  if(dz) dz.style.display='none';
}
function xlDrop(e) {
  e.preventDefault();
  var dz = document.getElementById('hsvv-xl-drop-zone');
  if(dz) dz.style.display='none';
  var files = e.dataTransfer.files;
  if(files && files.length > 0) xlReadExcel(files[0]);
}
function xlImportFile(e) {
  var file = e.target.files[0];
  if(file) xlReadExcel(file);
  e.target.value='';
}

function xlReadExcel(file) {
  if(typeof XLSX === 'undefined') { alert('Thư viện XLSX chưa được tải!'); return; }
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var wb = XLSX.read(ev.target.result, {type:'binary'});
      var ws = wb.Sheets[wb.SheetNames[0]];
      var data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      xlApplyImport(data);
    } catch(err) {
      alert('Lỗi đọc file Excel: ' + err.message);
    }
  };
  reader.readAsBinaryString(file);
}

function xlApplyImport(data) {
  // data[row-1][col-1] → xl_{row}_{col}
  var applied = 0;
  for (var row = 1; row <= 54; row++) {
    for (var col = 1; col <= 11; col++) {
      var el = document.getElementById('xl_' + row + '_' + col);
      if (!el || el.tagName !== 'INPUT') continue;
      var dataRow = data[row - 1];
      if (!dataRow) continue;
      var cellVal = dataRow[col - 1];
      if (cellVal === '' || cellVal === undefined || cellVal === null) continue;
      var n = parseFloat(cellVal);
      if (!isNaN(n)) {
        // Numeric: apply with dot-separator formatting
        el.value = xlFmtNum(n);
      } else {
        el.value = String(cellVal);
      }
      applied++;
    }
  }
  xlCalcAll();
  setTimeout(xlFmtAllInputs, 80);
  if (applied > 0) {
    var note = document.createElement('div');
    note.textContent = '✅ Đã import ' + applied + ' ô từ file Excel';
    note.style.cssText = 'position:fixed;top:70px;right:20px;background:#1A7F4B;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:calc(var(--z-5,9900) + 6);box-shadow:0 3px 10px rgba(0,0,0,.2);';
    document.body.appendChild(note);
    setTimeout(function() { document.body.removeChild(note); }, 3000);
  }
}


/* ══════════════════════════════════════════════════════════════════
   XL FEATURES: Column Resize, Auto-fit, Selection, Copy
══════════════════════════════════════════════════════════════════ */

// ── Column Resize ──────────────────────────────────────────────────
var xlResizeState = null;

function xlResizeStart(e, colIdx) {
  e.preventDefault();
  e.stopPropagation();
  var col = document.getElementById('xl-col-' + colIdx);
  if (!col) return;
  xlResizeState = {
    colIdx: colIdx,
    startX: e.clientX,
    startW: col.offsetWidth,
    handle: e.target
  };
  e.target.classList.add('dragging');
  var line = document.getElementById('hsvv-xl-resize-line');
  line.style.display = 'block';
  line.style.left = e.clientX + 'px';
  document.addEventListener('mousemove', xlResizeMove);
  document.addEventListener('mouseup', xlResizeEnd);
}

function xlResizeMove(e) {
  if (!xlResizeState) return;
  var dx = e.clientX - xlResizeState.startX;
  var newW = Math.max(30, xlResizeState.startW + dx);
  var col = document.getElementById('xl-col-' + xlResizeState.colIdx);
  if (col) col.style.width = newW + 'px';
  var line = document.getElementById('hsvv-xl-resize-line');
  line.style.left = e.clientX + 'px';
}

function xlResizeEnd(e) {
  if (!xlResizeState) return;
  xlResizeState.handle.classList.remove('dragging');
  var line = document.getElementById('hsvv-xl-resize-line');
  line.style.display = 'none';
  xlResizeState = null;
  document.removeEventListener('mousemove', xlResizeMove);
  document.removeEventListener('mouseup', xlResizeEnd);
}

// ── Auto-fit columns ───────────────────────────────────────────────
var XL_DEFAULT_WIDTHS = [28,200,60,100,90,120,120,210,120,115,115];

function xlAutoFitCol(colIdx) {
  var col = document.getElementById('xl-col-' + colIdx);
  if (!col) return;
  var table = document.getElementById('hsvv-xl-main-table');
  if (!table) return;
  var maxW = 40;
  var rows = table.querySelectorAll('tr');
  rows.forEach(function(tr) {
    var cells = tr.querySelectorAll('td, th');
    // cells[0] = rownum, cells[1..11] = cols A-K
    var cell = cells[colIdx]; // colIdx 1-based → index in cells
    if (!cell) return;
    // Create a hidden span to measure text
    var span = document.createElement('span');
    span.style.cssText = 'visibility:hidden;position:absolute;white-space:nowrap;font-size:11.5px;font-family:inherit;padding:0 10px;';
    var input = cell.querySelector('input');
    if (input) {
      span.textContent = input.value || input.placeholder || '';
    } else {
      span.textContent = cell.textContent || '';
    }
    document.body.appendChild(span);
    var w = span.offsetWidth + 12;
    document.body.removeChild(span);
    if (w > maxW) maxW = w;
  });
  col.style.width = Math.min(maxW, 400) + 'px';
}

function xlAutoFitAll() {
  for (var i = 1; i <= 11; i++) xlAutoFitCol(i);
  xlShowInfo('↔ Đã auto-fit tất cả ' + 11 + ' cột');
}

function xlResetColWidths() {
  var defaults = XL_DEFAULT_WIDTHS;
  for (var i = 0; i < defaults.length; i++) {
    var col = document.getElementById('xl-col-' + (i+1));
    if (col) col.style.width = defaults[i] + 'px';
  }
  xlShowInfo('↺ Đã reset độ rộng cột');
}

// ── Cell Selection ─────────────────────────────────────────────────
var xlSelMode = false;
var xlSelStart = null;
var xlSelEnd = null;
var xlSelecting = false;

function xlToggleSelectMode() {
  xlSelMode = !xlSelMode;
  var btn = document.getElementById('hsvv-xl-sel-btn');
  if (btn) btn.classList.toggle('active', xlSelMode);
  var table = document.getElementById('hsvv-xl-main-table');
  if (table) table.style.cursor = xlSelMode ? 'cell' : '';
  if (!xlSelMode) {
    xlClearSelection();
    xlShowInfo('Nhấn "Chọn vùng" rồi kéo để chọn ô');
  } else {
    xlShowInfo('Bấm và kéo trên bảng để chọn vùng, rồi bấm "Copy"');
  }
}

function xlGetCellPos(td) {
  // Returns {row, col} from td element's position in table
  var tr = td.parentElement;
  var table = document.getElementById('hsvv-xl-main-table');
  var rows = Array.from(table.querySelectorAll('tbody tr'));
  var row = rows.indexOf(tr);
  var cells = Array.from(tr.querySelectorAll('td'));
  var col = cells.indexOf(td);
  return {row: row, col: col}; // 0-indexed, col 0 = rownum
}

function xlSelectRange(r1, c1, r2, c2) {
  xlClearSelection();
  var table = document.getElementById('hsvv-xl-main-table');
  var rows = table.querySelectorAll('tbody tr');
  var rMin = Math.min(r1,r2), rMax = Math.max(r1,r2);
  var cMin = Math.min(c1,c2), cMax = Math.max(c1,c2);
  var count = 0;
  for (var r = rMin; r <= rMax; r++) {
    if (!rows[r]) continue;
    var cells = rows[r].querySelectorAll('td');
    for (var c = cMin; c <= cMax; c++) {
      if (cells[c]) { cells[c].classList.add('xl-selected'); count++; }
    }
  }
  var cols = cMax - cMin; var rowCount = rMax - rMin + 1;
  xlShowInfo('Đã chọn ' + count + ' ô (' + rowCount + ' dòng × ' + (cols+1) + ' cột)');
}

function xlClearSelection() {
  document.querySelectorAll('.xl-selected').forEach(function(el) {
    el.classList.remove('xl-selected');
  });
}

// Mouse events for selection
document.addEventListener('DOMContentLoaded', function() {
  var table = document.getElementById('hsvv-xl-main-table');
  if (!table) return;
  
  table.addEventListener('mousedown', function(e) {
    if (!xlSelMode) return;
    var td = e.target.closest('td');
    if (!td || td.classList.contains('xl-rownum')) return;
    xlSelecting = true;
    xlSelStart = xlGetCellPos(td);
    xlSelEnd = xlSelStart;
    xlClearSelection();
    td.classList.add('xl-selected');
    e.preventDefault();
  });
  
  table.addEventListener('mousemove', function(e) {
    if (!xlSelMode || !xlSelecting) return;
    var td = e.target.closest('td');
    if (!td || td.classList.contains('xl-rownum')) return;
    xlSelEnd = xlGetCellPos(td);
    xlSelectRange(xlSelStart.row, xlSelStart.col, xlSelEnd.row, xlSelEnd.col);
  });
  
  document.addEventListener('mouseup', function(e) {
    if (xlSelecting) {
      xlSelecting = false;
    }
  });
});

// ── Copy to Clipboard ──────────────────────────────────────────────
function xlGetCellValue(td) {
  var inp = td.querySelector('input');
  if (inp) {
    var v = parseFloat(inp.value);
    return isNaN(v) ? (inp.value || '') : inp.value;
  }
  return td.getAttribute('data-val') || td.textContent.trim();
}

function xlBuildTSV(selected) {
  // selected = array of td elements, need to reconstruct grid
  var table = document.getElementById('hsvv-xl-main-table');
  var rows = Array.from(table.querySelectorAll('tbody tr'));
  var selSet = new Set(selected.map(function(td){ return td; }));
  
  // Find bounding box
  var minR=999, maxR=0, minC=999, maxC=0;
  selected.forEach(function(td){
    var p = xlGetCellPos(td);
    if(p.row<minR) minR=p.row; if(p.row>maxR) maxR=p.row;
    if(p.col<minC) minC=p.col; if(p.col>maxC) maxC=p.col;
  });
  
  var lines = [];
  for (var r = minR; r <= maxR; r++) {
    if (!rows[r]) continue;
    var cells = rows[r].querySelectorAll('td');
    var row_vals = [];
    for (var c = minC; c <= maxC; c++) {
      if (cells[c]) {
        row_vals.push(xlGetCellValue(cells[c]));
      } else {
        row_vals.push('');
      }
    }
    lines.push(row_vals.join('\t'));
  }
  return lines.join('\n');
}

function xlCopySelection() {
  var selected = Array.from(document.querySelectorAll('.xl-selected'));
  if (selected.length === 0) {
    xlShowInfo('⚠️ Hãy chọn vùng dữ liệu trước!');
    return;
  }
  var tsv = xlBuildTSV(selected);
  navigator.clipboard.writeText(tsv).then(function() {
    xlFlash('✅ Đã copy ' + selected.length + ' ô — Paste (Ctrl+V) vào Excel/Word!');
  }).catch(function() {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = tsv;
    ta.style.cssText = 'position:fixed;top:-999px;left:-999px;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    xlFlash('✅ Đã copy — Paste (Ctrl+V) vào Excel/Word!');
  });
}

function xlCopyAll() {
  // Copy entire tbody as TSV
  var table = document.getElementById('hsvv-xl-main-table');
  var rows = table.querySelectorAll('tbody tr');
  var lines = [];
  rows.forEach(function(tr) {
    var cells = tr.querySelectorAll('td');
    var vals = [];
    for (var c = 1; c < cells.length; c++) { // skip rownum col
      vals.push(xlGetCellValue(cells[c]));
    }
    lines.push(vals.join('\t'));
  });
  var tsv = lines.join('\n');
  navigator.clipboard.writeText(tsv).then(function() {
    xlFlash('✅ Đã copy toàn bộ bảng (54 dòng × 11 cột)!');
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = tsv; ta.style.cssText='position:fixed;top:-999px;left:-999px;';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    xlFlash('✅ Đã copy toàn bộ bảng!');
  });
}

// Ctrl+C shortcut when cells are selected
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey||e.metaKey) && e.key==='c') {
    var selected = document.querySelectorAll('.xl-selected');
    if (selected.length > 0) {
      e.preventDefault();
      xlCopySelection();
    }
  }
  // Escape to clear selection
  if (e.key==='Escape') {
    xlClearSelection();
    if (xlSelMode) xlToggleSelectMode();
  }
});

function xlFlash(msg) {
  var el = document.getElementById('hsvv-xl-copy-flash');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.animation = 'none';
  setTimeout(function(){ el.style.animation = 'fadeOut 2.5s forwards'; }, 10);
  setTimeout(function(){ el.style.display = 'none'; }, 2600);
}

function xlShowInfo(msg) {
  var el = document.getElementById('hsvv-xl-sel-info');
  if (el) el.textContent = msg;
}

// ── Apply yellow backgrounds on init ─────────────────────────────
function xlApplyStyles() {
  // Yellow for header rows (1, 30, 54) - already handled via CSS class xl-header-row
  // These formula cells get xl-yellow class via HTML
  // Additional: auto-fit on first load after a short delay for proper rendering
  setTimeout(function() {
    // Light auto-fit for col B and H which have long text
    xlAutoFitCol(2);
    xlAutoFitCol(8);
  }, 300);
}



/* ══════════════════════════════════════════════════════════
   LAYOUT + CUSTOM FIELDS + SXKD CHIP
══════════════════════════════════════════════════════════ */

// ── Layout toggle ──────────────────────────────────────────
var _layoutMode = 'multi';
function apcSetLayout(mode) {
  _layoutMode = mode;
  document.getElementById('page-hsvv')?.classList.toggle('layout-1col', mode === 'one');
  document.getElementById('hsvv-btn-multi-col').classList.toggle('active', mode === 'multi');
  document.getElementById('hsvv-btn-one-col').classList.toggle('active', mode === 'one');
}

// ── SXKD chip shortcut ────────────────────────────────────
function showPhuongAnChip(el) {
  var wrapper = document.getElementById('pa-sxkd-wrapper');
  if (!wrapper) return;
  var isOpen = wrapper.style.display !== 'none' && wrapper.style.display !== '';
  // Toggle
  if (isOpen) {
    sxkdClosePanel();
  } else {
    // Show wrapper below chips bar
    wrapper.style.display = 'block';
    el.classList.add('chip-open');
    el.title = 'Đóng bảng tính Phương án SXKD';
    // Move wrapper to appear right after chips-bar if not already positioned
    var main = document.querySelector('.main');
    var chipsBar = document.querySelector('.chips-bar');
    if (main && chipsBar && wrapper.parentNode !== main) {
      chipsBar.insertAdjacentElement('afterend', wrapper);
    }
    setTimeout(function(){ xlCalcAll(); xlApplyStyles(); }, 120);
    wrapper.scrollIntoView({behavior:'smooth', block:'start'});
  }
}

// Close SXKD panel via X button inside it
(function(){
  var origClose = window._xlClose;
  document.addEventListener('DOMContentLoaded', function(){
    var closeBtn = document.querySelector('#pa-sxkd-wrapper button[onclick*="display"]');
    if (closeBtn) {
      closeBtn.onclick = function(){
        var w = document.getElementById('pa-sxkd-wrapper');
        if(w) w.style.display = 'none';
        var chip = document.querySelector('.chip-sxkd');
        if(chip) { chip.classList.remove('chip-open'); chip.title='Mở bảng tính Phương án SXKD'; }
      };
    }
  });
})();

// ── Custom Fields ──────────────────────────────────────────
var _cfData = {}; // {secId: [{id, label, type, value}]}
var _cfCounter = 0;

function cfAdd(secId, label, type, value) {
  if (!_cfData[secId]) _cfData[secId] = [];
  var id = 'cf_' + secId + '_' + (++_cfCounter);
  var item = {id: id, label: label || 'Trường mới', type: type || 'text', value: value || ''};
  _cfData[secId].push(item);
  cfRender(secId);
  // Focus the label editor of new item
  setTimeout(function(){
    var lbl = document.getElementById('cfl_' + id);
    if (lbl) { lbl.focus(); lbl.select ? lbl.select() : selectText(lbl); }
  }, 80);
}

function selectText(el) {
  var range = document.createRange();
  range.selectNodeContents(el);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function cfDelLast(secId) {
  if (!_cfData[secId] || !_cfData[secId].length) return;
  _cfData[secId].pop();
  cfRender(secId);
}

function cfDelItem(secId, id) {
  if (!_cfData[secId]) return;
  _cfData[secId] = _cfData[secId].filter(function(x){ return x.id !== id; });
  cfRender(secId);
}

function cfClearAll(secId) {
  if (!_cfData[secId] || !_cfData[secId].length) return;
  if (!confirm('Xóa tất cả ' + _cfData[secId].length + ' trường tùy chỉnh của mục này?')) return;
  _cfData[secId] = [];
  cfRender(secId);
}

function cfRender(secId) {
  var list = document.getElementById('cf-list-' + secId);
  if (!list) return;
  var items = _cfData[secId] || [];
  if (!items.length) { list.innerHTML = ''; return; }

  var html = '';
  items.forEach(function(item, idx) {
    var num = idx + 1;
    var inputHtml = '';
    var sid = secId, iid = item.id;

    if (item.type === 'textarea') {
      inputHtml = cfEl('textarea', iid, sid, item.value, '');
    } else if (item.type === 'date') {
      inputHtml = cfEl('date', iid, sid, item.value, '');
    } else if (item.type === 'number') {
      inputHtml = cfEl('number', iid, sid, item.value, '0');
    } else {
      inputHtml = cfEl('text', iid, sid, item.value, 'Nhập nội dung...');
    }

    html += [
      '<div class="cf-item" id="cfi_' + iid + '">',
        '<span class="cf-num">' + num + '</span>',
        '<span contenteditable="true" class="cf-lbl-edit" id="cfl_' + iid + '"',
        '  onblur="cfSaveLbl(\'' + sid + '\',\'' + iid + '\',this.textContent.trim())"',
        '  onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}">' + escHtml(item.label) + '</span>',
        '<select class="cf-type-sel" onchange="cfChangeType(\'' + sid + '\',\'' + iid + '\',this.value)">',
          '<option value="text"'   + (item.type==='text'     ? ' selected' : '') + '>Văn bản</option>',
          '<option value="number"' + (item.type==='number'   ? ' selected' : '') + '>Số</option>',
          '<option value="date"'   + (item.type==='date'     ? ' selected' : '') + '>Ngày</option>',
          '<option value="textarea"'+(item.type==='textarea' ? ' selected' : '') + '>Đoạn văn</option>',
        '</select>',
        inputHtml,
        '<button class="cf-del-btn" onclick="cfDelItem(\'' + sid + '\',\'' + iid + '\')" title="Xóa trường này">✕</button>',
      '</div>'
    ].join('');
  });
  list.innerHTML = html;
}

function cfEl(type, iid, sid, val, ph) {
  var base = ' id="cfv_' + iid + '" oninput="cfSaveVal(\'' + sid + '\',\'' + iid + '\',this.value)"';
  if (type === 'textarea') {
    return '<textarea class="cf-inp" rows="2"' + base + ' placeholder="Nhập nội dung...">' + escHtml(val) + '</textarea>';
  }
  return '<input class="cf-inp" type="' + type + '"' + base + ' value="' + escHtml(val) + '" placeholder="' + ph + '">';
}


function cfSaveLbl(secId, id, val) {
  var items = _cfData[secId] || [];
  items.forEach(function(x){ if(x.id===id) x.label = val || 'Trường mới'; });
}

function cfSaveVal(secId, id, val) {
  var items = _cfData[secId] || [];
  items.forEach(function(x){ if(x.id===id) x.value = val; });
}

function cfChangeType(secId, id, newType) {
  var items = _cfData[secId] || [];
  items.forEach(function(x){ if(x.id===id){ x.type = newType; x.value = ''; } });
  cfRender(secId);
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Persist custom fields in JSON export
function cfGetAllData() {
  var result = {};
  Object.keys(_cfData).forEach(function(secId){
    result[secId] = (_cfData[secId]||[]).map(function(x){
      return {label:x.label, type:x.type, value:x.value};
    });
  });
  return result;
}
function cfRestoreData(data) {
  if (!data) return;
  Object.keys(data).forEach(function(secId){
    (data[secId]||[]).forEach(function(item){
      cfAdd(secId, item.label, item.type, item.value);
    });
  });
}


/* ══════════════════════════════════════════════════════════════
   DYNAMIC PRODUCT REGIONS - Thêm/Xóa dòng
══════════════════════════════════════════════════════════════ */

// ── Initial data arrays ────────────────────────────────────
var _xlR1Init = [{"ten": "Vang Đà Lạt (Dabeco)", "dv": "Chai", "sl": "15000", "dg": "50000", "direct_tt": ""}, {"ten": "Vang Đà Lạt (Vĩnh Tiến)", "dv": "Chai", "sl": "10000", "dg": "80000", "direct_tt": ""}, {"ten": "Vang Đà Lạt trắng", "dv": "Chai", "sl": "10000", "dg": "80000", "direct_tt": ""}, {"ten": "Vang Thăng Long", "dv": "Chai", "sl": "15000", "dg": "50000", "direct_tt": ""}, {"ten": "Bia Heneken", "dv": "Thùng", "sl": "2000", "dg": "360000", "direct_tt": ""}, {"ten": "Bia Sài Gòn", "dv": "Thùng", "sl": "2000", "dg": "270000", "direct_tt": ""}, {"ten": "Bia 333", "dv": "Thùng", "sl": "2000", "dg": "210000", "direct_tt": ""}, {"ten": "Bia Hà Nội", "dv": "Thùng", "sl": "3000", "dg": "210000", "direct_tt": ""}, {"ten": "Bia Trúc Bạch", "dv": "Thùng", "sl": "2000", "dg": "300000", "direct_tt": ""}, {"ten": "Bia Tiger", "dv": "Thùng", "sl": "1500", "dg": "305000", "direct_tt": ""}, {"ten": "Bia Đại Việt", "dv": "Thùng", "sl": "1500", "dg": "211000", "direct_tt": ""}, {"ten": "Bánh Cosy (Kinh đô)", "dv": "Thùng", "sl": "2000", "dg": "252000", "direct_tt": ""}, {"ten": "Bánh Begi (Tràng An)", "dv": "Thùng", "sl": "2000", "dg": "265000", "direct_tt": ""}, {"ten": "Bánh Hura (Bibica)", "dv": "Thùng", "sl": "2000", "dg": "150000", "direct_tt": ""}, {"ten": "Bánh Orito (Hải Hà)", "dv": "Thùng", "sl": "1500", "dg": "260000", "direct_tt": ""}, {"ten": "Bánh Chocopie", "dv": "Thùng", "sl": "1500", "dg": "230000", "direct_tt": ""}, {"ten": "Kẹo sâm Jinsen Candy", "dv": "Gói", "sl": "1800", "dg": "130000", "direct_tt": ""}, {"ten": "Các loại bia, bánh kẹo, nước ngọt khác", "dv": "", "sl": "", "dg": "", "direct_tt": "164000000"}, {"ten": "", "dv": "", "sl": "", "dg": "", "direct_tt": ""}, {"ten": "", "dv": "", "sl": "", "dg": "", "direct_tt": ""}];
var _xlR2Init = [{"ten": "Vang Đà Lạt (Dabeco)", "dv": "Chai", "sl": "15000", "dg": "65000", "direct_tt": ""}, {"ten": "Vang Đà Lạt (Vĩnh Tiến)", "dv": "Chai", "sl": "10000", "dg": "95000", "direct_tt": ""}, {"ten": "Vang Đà Lạt trắng", "dv": "Chai", "sl": "10000", "dg": "95000", "direct_tt": ""}, {"ten": "Vang Thăng Long", "dv": "Chai", "sl": "15000", "dg": "65000", "direct_tt": ""}, {"ten": "Bia Heneken", "dv": "Thùng", "sl": "2000", "dg": "390000", "direct_tt": ""}, {"ten": "Bia Sài Gòn", "dv": "Thùng", "sl": "2000", "dg": "300000", "direct_tt": ""}, {"ten": "Bia 333", "dv": "Thùng", "sl": "2000", "dg": "240000", "direct_tt": ""}, {"ten": "Bia Hà Nội", "dv": "Thùng", "sl": "3000", "dg": "240000", "direct_tt": ""}, {"ten": "Bia Trúc Bạch", "dv": "Thùng", "sl": "2000", "dg": "350000", "direct_tt": ""}, {"ten": "Bia Tiger", "dv": "Thùng", "sl": "1500", "dg": "330000", "direct_tt": ""}, {"ten": "Bia Đại Việt", "dv": "Thùng", "sl": "1500", "dg": "230000", "direct_tt": ""}, {"ten": "Bánh Cosy (Kinh đô)", "dv": "Thùng", "sl": "2000", "dg": "282000", "direct_tt": ""}, {"ten": "Bánh Begi (Tràng An)", "dv": "Thùng", "sl": "2000", "dg": "304000", "direct_tt": ""}, {"ten": "Bánh Hura (Bibica)", "dv": "Thùng", "sl": "2000", "dg": "182000", "direct_tt": ""}, {"ten": "Bánh Orito (Hải Hà)", "dv": "Thùng", "sl": "1500", "dg": "235000", "direct_tt": ""}, {"ten": "Bánh Chocopie", "dv": "Thùng", "sl": "1500", "dg": "275000", "direct_tt": ""}, {"ten": "Kẹo sâm Jinsen Candy", "dv": "Gói", "sl": "1700", "dg": "162000", "direct_tt": ""}, {"ten": "Các loại bia, bánh kẹo, nước ngọt khác", "dv": "", "sl": "", "dg": "", "direct_tt": "200000000"}, {"ten": "", "dv": "", "sl": "", "dg": "", "direct_tt": ""}, {"ten": "", "dv": "", "sl": "", "dg": "", "direct_tt": ""}];
var _xlR1Right = [`<td class="xl-label" style="text-align:center;">*</td><td class="xl-label" style="text-align:left;font-weight:700;">Tổng nhu cầu tham gia vào phương án</td><td class="xl-formula xl-yellow" id="xl_2_9" style="text-align:right;font-weight:700;" title="=I3+I4+I5"></td><td class="xl-formula" id="xl_2_10" style="text-align:right;" title="=I3/I2*100"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Vốn tự có tham gia</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_3_9" value="2000000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Vốn xin vay Ngân Hàng</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_4_9" value="6000000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Vốn vay các TCTD khác</td><td class="xl-empty"></td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_5_10" value="3000000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_13_7" value="2" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_13_8" value="7000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-formula" id="xl_13_9" style="text-align:right;" title="=G13*H13*12"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_14_7" value="2" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_14_8" value="4000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-formula" id="xl_14_9" style="text-align:right;" title="=G14*H14*12"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-formula" id="xl_15_9" style="text-align:right;" title="=I13+I14"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-label" style="text-align:center;">*</td><td class="xl-label" style="text-align:left;font-weight:700;">Tổng CP (chưa có lãi, thuế, khấu hao)</td><td class="xl-formula xl-yellow" id="xl_17_9" style="text-align:right;font-weight:700;" title="=I2*1.2"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_18_7" value="225000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-label" style="text-align:left;">Lãi</td><td class="xl-formula xl-yellow" id="xl_18_9" style="text-align:right;" title="=F23"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_19_7" value="212500000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-label" style="text-align:left;">Khấu hao</td><td class="xl-formula xl-yellow" id="xl_19_9" style="text-align:right;" title="=F26"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;">Thuế</td><td class="xl-formula xl-yellow" id="xl_20_9" style="text-align:right;" title="=F27"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_21_7" value="81000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-label" style="text-align:left;font-weight:700;">Tổng CP</td><td class="xl-formula xl-yellow" id="xl_21_9" style="text-align:right;font-weight:700;" title="=I17+I18+I19+I20"></td><td class="xl-formula" id="xl_21_10" style="text-align:right;" title="=I21-I23-I24"></td><td class="xl-empty"></td>`];
var _xlR2Right = [`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Tiền mặt</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_31_9" value="250000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-label" style="text-align:center;">*</td><td class="xl-label" style="text-align:left;"> + Nợ phải thu</td><td class="xl-formula xl-yellow" id="xl_32_9" style="text-align:right;" title="=K30+I33-I28-I30-I31"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Nợ phải trả</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_33_9" value="300000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_33_10" value="1060851000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;">Nợ NHNo TP Nam Định</td><td class="xl-empty"></td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_34_10" value="129000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;font-weight:700;">Tổng giá trị tài sản hiện có (ước tính)</td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;font-weight:700;">Tổng giá trị tài sản hiện có (ước tính)</td><td class="xl-formula xl-yellow" id="xl_37_9" style="text-align:right;font-weight:700;" title="=SUM_I38_I43_minus_I44"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Giá trị nhà đất</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_38_9" value="10785200000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Máy móc thiết bị</td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Tài sản khác (tủ quầy, xe máy, đồ dùng)</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_40_9" value="3000000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Hàng hoá các loại</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_41_9" value="1200000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Tiền mặt</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_42_9" value="250000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;"> + Nợ phải thu</td><td class="xl-input-wrap xl-yellow"><input class="xl-num" type="number" id="xl_43_9" value="710000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-formula" id="xl_44_7" style="text-align:right;" title="=F16*1.5"></td><td class="xl-label" style="text-align:left;"> + Nợ phải trả</td><td class="xl-input-wrap"><input class="xl-num" type="number" id="xl_44_9" value="300000000" oninput="xlCalcAll()" style="text-align:right;"></td><td class="xl-formula" id="xl_44_10" style="text-align:right;" title="=J33+J34"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-label" style="text-align:left;">Nợ NHNo TP Nam Định</td><td class="xl-empty"></td><td class="xl-formula" id="xl_45_10" style="text-align:right;" title="=I37-I44"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-formula" id="xl_49_7" style="text-align:right;" title="=F18*1.5"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`,`<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>`];
var xlR1 = JSON.parse(JSON.stringify(_xlR1Init));
var xlR2 = JSON.parse(JSON.stringify(_xlR2Init));

// ── Render helpers ─────────────────────────────────────────
function xlFmtV(v) {
  var n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function xlMakeProductTr(region, idx, item) {
  var stt = idx + 1;
  var rCls = 'xl-r' + region + '-prod';
  var rightHtml = '';
  var rightArr = region === 1 ? _xlR1Right : _xlR2Right;
  rightHtml = (idx < rightArr.length) ? rightArr[idx] : '<td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td><td class="xl-empty"></td>';

  // Determine if this is a "direct TT" row (no sl/dg, just a lump sum)
  var isDirect = item.direct_tt !== '' && item.direct_tt !== undefined;
  var slVal = item.sl || '';
  var dgVal = item.dg || '';
  var dtVal = item.direct_tt || '';

  var fmtSl = slVal ? xlFmtNum(parseFloat(slVal)||0) : '';
  var fmtDg = dgVal ? xlFmtNum(parseFloat(dgVal)||0) : '';
  var fmtTt = dtVal ? xlFmtNum(parseFloat(dtVal)||0) : '';
  var numAttr = 'type="text" inputmode="numeric" onfocus="xlOnFocus(this)" onblur="xlOnBlur(this)" oninput="xlOnInput(this)" autocomplete="off"';

  var slCell = isDirect
    ? '<td class="xl-empty"></td>'
    : '<td class="xl-input-wrap"><input class="xl-num" ' + numAttr + ' id="xl_dyn_r' + region + '_' + idx + '_sl" value="' + escHtmlAttr(fmtSl) + '" placeholder="0" style="text-align:right;"></td>';

  var dgCell = isDirect
    ? '<td class="xl-empty"></td>'
    : '<td class="xl-input-wrap"><input class="xl-num" ' + numAttr + ' id="xl_dyn_r' + region + '_' + idx + '_dg" value="' + escHtmlAttr(fmtDg) + '" placeholder="0" style="text-align:right;"></td>';

  var ttCell = isDirect
    ? '<td class="xl-input-wrap xl-dyn-tt-direct"><input class="xl-num" ' + numAttr + ' id="xl_dyn_r' + region + '_' + idx + '_tt" value="' + escHtmlAttr(fmtTt) + '" placeholder="0" style="text-align:right;font-weight:700;background:#fff8e1;"></td>'
    : '<td class="xl-formula xl-dyn-tt" id="xl_dyn_r' + region + '_' + idx + '_tt" style="text-align:right;font-weight:700;" title="=SL × Đơn giá"></td>';

  return '<tr class="' + rCls + '" data-region="' + region + '" data-idx="' + idx + '">'
    + '<td class="xl-rownum xl-dyn">'
    +   '<span class="xl-row-num-txt">' + (idx + 2) + '</span>'
    +   '<div class="xl-row-actions">'
    +     '<button class="xl-row-action-btn add" onclick="xlRAdd(' + region + ',' + idx + ')" title="Thêm dòng trước">+</button>'
    +     '<button class="xl-row-action-btn del" onclick="xlRDel(' + region + ',' + idx + ')" title="Xóa dòng này">✕</button>'
    +   '</div>'
    + '</td>'
    + '<td class="xl-label" style="text-align:center;color:#667;font-weight:600;">' + stt + '</td>'
    + '<td class="xl-input-wrap"><input class="xl-text" id="xl_dyn_r' + region + '_' + idx + '_ten" value="' + escHtmlAttr(item.ten) + '" oninput="xlCalcAll()" placeholder="Tên hàng hóa" style="text-align:left;"></td>'
    + '<td class="xl-input-wrap"><input class="xl-text" id="xl_dyn_r' + region + '_' + idx + '_dv" value="' + escHtmlAttr(item.dv) + '" oninput="xlCalcAll()" placeholder="ĐV" style="text-align:center;"></td>'
    + slCell
    + dgCell
    + ttCell
    + rightHtml
    + '</tr>';
}

function escHtmlAttr(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Render functions ───────────────────────────────────────
function xlRenderR1() {
  var tbody = document.getElementById('hsvv-xl-r1-body');
  if (!tbody) return;
  var html = '';
  xlR1.forEach(function(item, i) {
    html += xlMakeProductTr(1, i, item);
  });
  tbody.innerHTML = html;
  // Update row num display (actual table row position)
  var startRow = 2; // region 1 starts at Excel row 2
  tbody.querySelectorAll('tr').forEach(function(tr, i) {
    var num = tr.querySelector('.xl-row-num-txt');
    if(num) num.textContent = startRow + i;
  });
  var cnt = document.getElementById('hsvv-xl-r1-count');
  if(cnt) cnt.textContent = xlR1.length + ' dòng vật tư';
  xlCalcAll();
}

function xlRenderR2() {
  var tbody = document.getElementById('hsvv-xl-r2-body');
  if (!tbody) return;
  var html = '';
  xlR2.forEach(function(item, i) {
    html += xlMakeProductTr(2, i, item);
  });
  tbody.innerHTML = html;
  var startRow = 31;
  tbody.querySelectorAll('tr').forEach(function(tr, i) {
    var num = tr.querySelector('.xl-row-num-txt');
    if(num) num.textContent = startRow + i;
  });
  var cnt = document.getElementById('hsvv-xl-r2-count');
  if(cnt) cnt.textContent = xlR2.length + ' dòng vật tư';
  xlCalcAll();
}

// ── Save current input values back to data array ──────────
function xlR1SaveValues() {
  xlR1.forEach(function(item, i) {
    var tenEl = document.getElementById('xl_dyn_r1_' + i + '_ten');
    var dvEl = document.getElementById('xl_dyn_r1_' + i + '_dv');
    var slEl = document.getElementById('xl_dyn_r1_' + i + '_sl');
    var dgEl = document.getElementById('xl_dyn_r1_' + i + '_dg');
    var ttEl = document.getElementById('xl_dyn_r1_' + i + '_tt');
    if(tenEl) item.ten = tenEl.value;
    if(dvEl) item.dv = dvEl.value;
    if(slEl) item.sl = slEl.value;
    if(dgEl) item.dg = dgEl.value;
    if(ttEl && ttEl.tagName === 'INPUT') item.direct_tt = ttEl.value;
  });
}

function xlR2SaveValues() {
  xlR2.forEach(function(item, i) {
    var tenEl = document.getElementById('xl_dyn_r2_' + i + '_ten');
    var dvEl = document.getElementById('xl_dyn_r2_' + i + '_dv');
    var slEl = document.getElementById('xl_dyn_r2_' + i + '_sl');
    var dgEl = document.getElementById('xl_dyn_r2_' + i + '_dg');
    var ttEl = document.getElementById('xl_dyn_r2_' + i + '_tt');
    if(tenEl) item.ten = tenEl.value;
    if(dvEl) item.dv = dvEl.value;
    if(slEl) item.sl = slEl.value;
    if(dgEl) item.dg = dgEl.value;
    if(ttEl && ttEl.tagName === 'INPUT') item.direct_tt = ttEl.value;
  });
}

// ── Add row ────────────────────────────────────────────────
function xlRAdd(region, beforeIdx) {
  var newItem = {ten:'', dv:'', sl:'', dg:'', direct_tt:''};
  if (region === 1) {
    xlR1SaveValues();
    if(beforeIdx < 0 || beforeIdx >= xlR1.length) {
      xlR1.push(newItem);
    } else {
      xlR1.splice(beforeIdx, 0, newItem);
    }
    xlRenderR1();
    // Highlight and focus new row
    setTimeout(function() {
      var idx = beforeIdx < 0 ? xlR1.length-1 : beforeIdx;
      var inp = document.getElementById('xl_dyn_r1_' + idx + '_ten');
      if(inp) { inp.focus(); inp.closest('tr').classList.add('xl-new-row'); }
    }, 30);
  } else {
    xlR2SaveValues();
    if(beforeIdx < 0 || beforeIdx >= xlR2.length) {
      xlR2.push(newItem);
    } else {
      xlR2.splice(beforeIdx, 0, newItem);
    }
    xlRenderR2();
    setTimeout(function() {
      var idx = beforeIdx < 0 ? xlR2.length-1 : beforeIdx;
      var inp = document.getElementById('xl_dyn_r2_' + idx + '_ten');
      if(inp) { inp.focus(); inp.closest('tr').classList.add('xl-new-row'); }
    }, 30);
  }
}
function xlR1Add(idx) { xlRAdd(1, idx); }
function xlR2Add(idx) { xlRAdd(2, idx); }

// ── Delete row ─────────────────────────────────────────────
function xlRDel(region, idx) {
  var arr = region === 1 ? xlR1 : xlR2;
  if(arr.length <= 1) { alert('Phải có ít nhất 1 dòng trong bảng!'); return; }
  if(!confirm('Xóa dòng ' + (idx+1) + ' "' + (arr[idx].ten||'(trống)') + '"?')) return;
  if(region === 1) {
    xlR1SaveValues();
    xlR1.splice(idx, 1);
    xlRenderR1();
  } else {
    xlR2SaveValues();
    xlR2.splice(idx, 1);
    xlRenderR2();
  }
}

function xlR1DelLast() {
  if(xlR1.length <= 1) { alert('Phải có ít nhất 1 dòng!'); return; }
  xlR1SaveValues();
  xlR1.pop();
  xlRenderR1();
}

function xlR2DelLast() {
  if(xlR2.length <= 1) { alert('Phải có ít nhất 1 dòng!'); return; }
  xlR2SaveValues();
  xlR2.pop();
  xlRenderR2();
}

// ── Reset to initial data ─────────────────────────────────
function xlR1Reset() {
  if(!confirm('Phục hồi bảng Chi phí về dữ liệu gốc từ file Excel? Các thay đổi sẽ mất!')) return;
  xlR1 = JSON.parse(JSON.stringify(_xlR1Init));
  xlRenderR1();
}
function xlR2Reset() {
  if(!confirm('Phục hồi bảng Doanh thu về dữ liệu gốc? Các thay đổi sẽ mất!')) return;
  xlR2 = JSON.parse(JSON.stringify(_xlR2Init));
  xlRenderR2();
}

// ── Sum functions for xlCalcAll integration ───────────────
function xlSumR1() {
  var total = 0;
  xlR1.forEach(function(_, i) {
    var ttEl = document.getElementById('xl_dyn_r1_' + i + '_tt');
    if(!ttEl) return;
    if(ttEl.tagName === 'INPUT') {
      total += xlRawNum(ttEl);
    } else {
      total += parseFloat(ttEl.getAttribute('data-val')) || 0;
    }
  });
  return total;
}

function xlSumR2() {
  var total = 0;
  xlR2.forEach(function(_, i) {
    var ttEl = document.getElementById('xl_dyn_r2_' + i + '_tt');
    if(!ttEl) return;
    if(ttEl.tagName === 'INPUT') {
      total += xlRawNum(ttEl);
    } else {
      total += parseFloat(ttEl.getAttribute('data-val')) || 0;
    }
  });
  return total;
}

// ── Calc D*E for all product rows then sum ─────────────────
function xlCalcProductRows() {
  // Region 1
  xlR1.forEach(function(_, i) {
    var slEl = document.getElementById('xl_dyn_r1_' + i + '_sl');
    var dgEl = document.getElementById('xl_dyn_r1_' + i + '_dg');
    var ttEl = document.getElementById('xl_dyn_r1_' + i + '_tt');
    if(!ttEl || ttEl.tagName === 'INPUT') return; // direct input, skip
    if(slEl && dgEl) {
      var sl = xlRawNum(slEl);
      var dg = xlRawNum(dgEl);
      xlSet('xl_dyn_r1_' + i + '_tt', sl * dg);
    }
  });
  // Region 2
  xlR2.forEach(function(_, i) {
    var slEl = document.getElementById('xl_dyn_r2_' + i + '_sl');
    var dgEl = document.getElementById('xl_dyn_r2_' + i + '_dg');
    var ttEl = document.getElementById('xl_dyn_r2_' + i + '_tt');
    if(!ttEl || ttEl.tagName === 'INPUT') return;
    if(slEl && dgEl) {
      var sl = xlRawNum(slEl);
      var dg = xlRawNum(dgEl);
      xlSet('xl_dyn_r2_' + i + '_tt', sl * dg);
    }
  });
}

// ── Init on show ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  xlRenderR1();
  xlRenderR2();
});



/* ══════════════════════════════════════════════════════════════
   FORMULA BAR + HIDE/SHOW FEATURE
══════════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────
var _xlActiveCell = null;   // currently selected cell element
var _xlActiveCellId = '';   // its ID or key
var _xlCellFormulas = {};   // {cellId: formulaStr} – user-defined formulas
var _xlHiddenRows = {};     // {rowKey: true}
var _xlHiddenCols = {};     // {colIdx: true}  1-11

// ── Formula functions registry ─────────────────────────────────
var XL_FUNCS = {
  SUM:   { args:'(số1; số2; ...)',  desc:'Tổng các giá trị',      fn: function(args){ return args.reduce(function(a,b){return a+b;},0); } },
  AVG:   { args:'(số1; số2; ...)',  desc:'Giá trị trung bình',    fn: function(args){ return args.reduce(function(a,b){return a+b;},0)/args.length; } },
  MIN:   { args:'(số1; số2; ...)',  desc:'Giá trị nhỏ nhất',      fn: function(args){ return Math.min.apply(null,args); } },
  MAX:   { args:'(số1; số2; ...)',  desc:'Giá trị lớn nhất',      fn: function(args){ return Math.max.apply(null,args); } },
  COUNT: { args:'(số1; số2; ...)',  desc:'Đếm các giá trị số',    fn: function(args){ return args.filter(function(x){return !isNaN(x);}).length; } },
  ROUND: { args:'(số; chữ_số)',     desc:'Làm tròn số',           fn: function(args){ return Math.round(args[0]*Math.pow(10,args[1]||0))/Math.pow(10,args[1]||0); } },
  ABS:   { args:'(số)',             desc:'Giá trị tuyệt đối',     fn: function(args){ return Math.abs(args[0]); } },
  SQRT:  { args:'(số)',             desc:'Căn bậc hai',           fn: function(args){ return Math.sqrt(args[0]); } },
  IF:    { args:'(điều_kiện; đúng; sai)', desc:'Nếu…thì…',       fn: function(args){ return args[0] ? args[1] : args[2]; }, raw:true },
  MOD:   { args:'(số; chia)',       desc:'Số dư phép chia',       fn: function(args){ return args[0] % args[1]; } },
  INT:   { args:'(số)',             desc:'Phần nguyên',           fn: function(args){ return Math.floor(args[0]); } },
  POWER: { args:'(cơ_số; số_mũ)',   desc:'Lũy thừa',             fn: function(args){ return Math.pow(args[0],args[1]); } },
  LN:    { args:'(số)',             desc:'Logarithm tự nhiên',    fn: function(args){ return Math.log(args[0]); } },
  EXP:   { args:'(số)',             desc:'e mũ số',               fn: function(args){ return Math.exp(args[0]); } },
  PERCENT:{ args:'(số)',            desc:'Đổi sang %',            fn: function(args){ return args[0]/100; } },
};

// ── Cell reference resolver ────────────────────────────────────
// Supported: xl_R_C IDs, A1 notation, dynamic region IDs
function xlResolveCellVal(ref) {
  ref = ref.trim();
  // Already an xl_ id
  if (/^xl_/.test(ref)) {
    return xlGetById(ref);
  }
  // A1 notation: convert to xl_R_C
  var m = ref.match(/^([A-K])(\d+)$/i);
  if (m) {
    var col = 'ABCDEFGHIJK'.indexOf(m[1].toUpperCase()) + 1;
    var row = parseInt(m[2]);
    return xlGetById('xl_' + row + '_' + col);
  }
  // Pure number
  var n = parseFloat(ref);
  return isNaN(n) ? 0 : n;
}

function xlGetById(id) {
  var el = document.getElementById(id);
  if (!el) return 0;
  if (el.tagName === 'INPUT') return parseFloat(el.value) || 0;
  return parseFloat(el.getAttribute('data-val')) || 0;
}

// Expand range A2:A10 → array of values
function xlExpandRange(rangeStr) {
  rangeStr = rangeStr.trim();
  var m = rangeStr.match(/^([A-K])(\d+):([A-K])(\d+)$/i);
  if (!m) return [xlResolveCellVal(rangeStr)];
  var c1 = 'ABCDEFGHIJK'.indexOf(m[1].toUpperCase()) + 1;
  var r1 = parseInt(m[2]);
  var c2 = 'ABCDEFGHIJK'.indexOf(m[3].toUpperCase()) + 1;
  var r2 = parseInt(m[4]);
  var vals = [];
  for (var r = Math.min(r1,r2); r <= Math.max(r1,r2); r++) {
    for (var c = Math.min(c1,c2); c <= Math.max(c1,c2); c++) {
      vals.push(xlGetById('xl_' + r + '_' + c));
    }
  }
  return vals;
}

// ── Formula evaluator ──────────────────────────────────────────
function xlEvalFormula(formulaStr) {
  var s = formulaStr.trim();
  if (!s.startsWith('=')) {
    var n = parseFloat(s);
    return isNaN(n) ? s : n;
  }
  s = s.substring(1).trim();

  try {
    return xlEvalExpr(s);
  } catch(e) {
    return NaN;
  }
}

function xlEvalExpr(s) {
  s = s.trim();

  // Replace function calls from outermost
  s = xlReplaceFunctions(s);

  // Replace cell references A1:K99 and ranges
  s = s.replace(/([A-K]\d+:[A-K]\d+)/gi, function(m) {
    var vals = xlExpandRange(m);
    return '[' + vals.join(',') + ']';
  });
  s = s.replace(/\b([A-K])(\d+)\b/gi, function(m, col, row) {
    var c = 'ABCDEFGHIJK'.indexOf(col.toUpperCase()) + 1;
    return xlGetById('xl_' + row + '_' + c);
  });

  // Evaluate safely
  // P1-3 FIX: whitelist regex chặn XSS injection (chỉ chấp nhận ký tự số và toán tử)
    if (!/^[0-9+\-*/(). ,\[\]]+$/.test(s)) {
      console.warn('[xlEvalExpr] P1-3 FIX: Rejected unsafe expression:', s.substring(0, 50));
      return 'Lỗi';
    }
    var result = Function('"use strict"; return (' + s + ')')();
  return result;
}

function xlReplaceFunctions(s) {
  // Iteratively replace innermost function calls
  var limit = 20;
  while (limit-- > 0) {
    var changed = false;
    var m = s.match(/([A-Z]+)\(([^()]*)\)/);
    if (!m) break;
    var fname = m[1];
    var argsRaw = m[2];
    var fn = XL_FUNCS[fname];
    var result;

    if (fn) {
      // Split args by ; or ,
      var argParts = argsRaw.split(/[;,]/).map(function(a){ return a.trim(); });
      if (fn.raw) {
        // Pass raw for IF: evaluate each arg as expression
        var evArgs = argParts.map(function(a){ try{ return xlEvalExpr(a); } catch(e){ return 0; } });
        result = fn.fn(evArgs);
      } else {
        // Expand ranges
        var expandedArgs = [];
        argParts.forEach(function(a) {
          if (/[A-K]\d+:[A-K]\d+/i.test(a)) {
            expandedArgs = expandedArgs.concat(xlExpandRange(a));
          } else {
            try { expandedArgs.push(xlEvalExpr(a)); } catch(e){ expandedArgs.push(0); }
          }
        });
        result = fn.fn(expandedArgs);
      }
    } else {
      // Unknown function: try Math
      if (Math[fname.toLowerCase()] !== undefined) {
        var n = parseFloat(argsRaw);
        result = Math[fname.toLowerCase()](n);
      } else {
        result = 0;
      }
    }

    s = s.replace(m[0], isNaN(result) ? 0 : result);
    changed = true;
  }
  return s;
}

// ── Cell activation (click to select) ─────────────────────────
function xlActivateCell(el, cellId, curVal) {
  // Deactivate previous
  if (_xlActiveCell && _xlActiveCell !== el) {
    _xlActiveCell.classList.remove('xl-active-input','xl-active-formula');
  }
  _xlActiveCell = el;
  _xlActiveCellId = cellId;

  // Update formula bar
  var refEl = document.getElementById('hsvv-xl-cell-ref');
  if (refEl) refEl.textContent = xlCellLabel(cellId);

  var fxEl = document.getElementById('hsvv-xl-formula-input');
  if (fxEl) {
    var formula = _xlCellFormulas[cellId] || '';
    fxEl.value = formula || (curVal !== undefined ? String(curVal) : '');
    fxEl.classList.toggle('xl-formula-mode', formula.startsWith('='));
    fxEl.classList.remove('xl-formula-err');
  }

  var infoEl = document.getElementById('hsvv-xl-fx-info');
  if (infoEl) infoEl.textContent = cellId || '';
}

function xlCellLabel(cellId) {
  // xl_R_C → A1 notation
  var m = cellId.match(/^xl_(\d+)_(\d+)$/);
  if (m) {
    var col = 'ABCDEFGHIJK'[parseInt(m[2])-1] || '?';
    return col + m[1];
  }
  // Dynamic cell xl_dyn_r1_3_sl etc
  var m2 = cellId.match(/^xl_dyn_r(\d)_(\d+)_(\w+)$/);
  if (m2) return 'R' + m2[1] + '.' + (parseInt(m2[2])+2) + '.' + m2[3].toUpperCase();
  return cellId;
}

// ── Wire up click events on all cells ─────────────────────────
function xlWireCellClicks() {
  var table = document.getElementById('hsvv-xl-main-table');
  if (!table) return;

  // Formula cells (TD)
  table.querySelectorAll('td.xl-formula').forEach(function(td) {
    td.addEventListener('click', function(e) {
      e.stopPropagation();
      xlActivateCell(td, td.id, td.getAttribute('data-val'));
    });
  });

  // Input cells
  table.querySelectorAll('input.xl-num, input.xl-text').forEach(function(inp) {
    inp.addEventListener('focus', function() {
      var td = inp.closest('td');
      xlActivateCell(inp, inp.id, inp.value);
    });
  });
}

// ── Formula bar events ─────────────────────────────────────────
function xlFxFocus() {
  // Highlight active cell
  if (_xlActiveCell) {
    _xlActiveCell.classList.add(
      _xlActiveCell.tagName === 'INPUT' ? 'xl-active-input' : 'xl-active-formula'
    );
  }
}

function xlFxInput(val) {
  var fxEl = document.getElementById('hsvv-xl-formula-input');
  if (!fxEl) return;
  fxEl.classList.toggle('xl-formula-mode', val.startsWith('='));
  fxEl.classList.remove('xl-formula-err');

  // Show function hint
  xlShowFnHint(val, fxEl);

  // Live preview for formulas
  if (val.startsWith('=') && _xlActiveCellId) {
    try {
      var result = xlEvalFormula(val);
      var infoEl = document.getElementById('hsvv-xl-fx-info');
      if (infoEl && !isNaN(result)) {
        infoEl.textContent = '= ' + Number(result).toLocaleString('vi-VN');
      }
    } catch(e) {}
  }
}

function xlFxKeyDown(e) {
  if (e.key === 'Enter') { e.preventDefault(); xlFxCommit(); }
  if (e.key === 'Escape') { e.preventDefault(); xlFxCancel(); }
}

function xlFxCommit() {
  var fxEl = document.getElementById('hsvv-xl-formula-input');
  if (!fxEl || !_xlActiveCellId) return;
  var val = fxEl.value.trim();

  if (val.startsWith('=')) {
    // Evaluate and store formula
    try {
      var result = xlEvalFormula(val);
      if (isNaN(result) || !isFinite(result)) throw new Error('Invalid');
      _xlCellFormulas[_xlActiveCellId] = val;

      // Apply to cell
      var el = document.getElementById(_xlActiveCellId);
      if (el) {
        if (el.tagName === 'INPUT') {
          el.value = result;
          el.setAttribute('data-formula', val);
        } else {
          xlSet(_xlActiveCellId, result);
          el.setAttribute('data-formula', val);
          el.title = val;
        }
      }
      fxEl.classList.remove('xl-formula-err');
      fxEl.classList.add('xl-formula-mode');
      xlCalcAll();
      xlShowFnHint('', null);

      // Flash success
      var infoEl = document.getElementById('hsvv-xl-fx-info');
      if (infoEl) {
        infoEl.style.color = '#2e7d32';
        infoEl.textContent = '✓ ' + Number(result).toLocaleString('vi-VN');
        setTimeout(function(){ infoEl.style.color=''; infoEl.textContent=_xlActiveCellId; }, 1500);
      }
    } catch(err) {
      fxEl.classList.add('xl-formula-err');
      var infoEl = document.getElementById('hsvv-xl-fx-info');
      if (infoEl) { infoEl.style.color='#c0392b'; infoEl.textContent='Lỗi công thức!'; }
    }
  } else {
    // Plain value
    delete _xlCellFormulas[_xlActiveCellId];
    var el = document.getElementById(_xlActiveCellId);
    if (el) {
      if (el.tagName === 'INPUT') { el.value = val; }
      else {
        var n = parseFloat(val);
        if (!isNaN(n)) xlSet(_xlActiveCellId, n);
        else el.textContent = val;
      }
    }
    xlCalcAll();
    xlShowFnHint('', null);
  }
}

function xlFxCancel() {
  var fxEl = document.getElementById('hsvv-xl-formula-input');
  if (fxEl) {
    fxEl.value = _xlCellFormulas[_xlActiveCellId] || '';
    fxEl.classList.remove('xl-formula-err');
  }
  xlShowFnHint('', null);
  var infoEl = document.getElementById('hsvv-xl-fx-info');
  if (infoEl) { infoEl.style.color=''; infoEl.textContent = _xlActiveCellId || ''; }
}

// ── Function hint popup ────────────────────────────────────────
function xlShowFnHint(val, inputEl) {
  var hint = document.getElementById('hsvv-xl-fn-hint');
  if (!hint) return;

  var m = val.match(/([A-Z]+)\s*\(?\s*$/i);
  if (!m) { hint.style.display='none'; return; }
  var fn = XL_FUNCS[m[1].toUpperCase()];
  if (!fn) { hint.style.display='none'; return; }

  hint.innerHTML = '<span class="fn-name">' + m[1].toUpperCase() + '</span>'
    + '<span class="fn-args">' + fn.args + '</span>'
    + '<div class="fn-desc">' + fn.desc + '</div>';
  hint.style.display = 'block';

  if (inputEl) {
    var rect = inputEl.getBoundingClientRect();
    hint.style.left = rect.left + 'px';
    hint.style.top = (rect.bottom + 4) + 'px';
  }
}

// Hide hint on click outside
document.addEventListener('click', function(e) {
  var hint = document.getElementById('hsvv-xl-fn-hint');
  if (hint) hint.style.display = 'none';
});

// ── HIDE / SHOW ROWS & COLS ────────────────────────────────────

// Hide a row by its table-row index (0-based in tbody)
// We identify rows by a "row key" = the rownum text
function xlHideRow(rowKey) {
  _xlHiddenRows[rowKey] = true;
  _applyRowVisibility();
  xlBuildVisPanel();
}

function xlShowRow(rowKey) {
  delete _xlHiddenRows[rowKey];
  _applyRowVisibility();
  xlBuildVisPanel();
}

function _applyRowVisibility() {
  var table = document.getElementById('hsvv-xl-main-table');
  if (!table) return;
  var trs = table.querySelectorAll('tbody tr');
  trs.forEach(function(tr) {
    var rn = tr.querySelector('.xl-row-num-txt, .xl-rownum');
    if (!rn) return;
    var key = (rn.textContent || '').trim();
    if (!key || key === '') return;
    if (_xlHiddenRows[key]) {
      tr.classList.add('xl-row-hidden');
      // Ensure a marker exists before this row
      _ensureHiddenMarker(tr, key);
    } else {
      tr.classList.remove('xl-row-hidden');
      _removeHiddenMarker(key);
    }
  });
}

function _ensureHiddenMarker(tr, key) {
  var markerId = 'xl-hm-' + key;
  if (!document.getElementById(markerId)) {
    var marker = document.createElement('tr');
    marker.id = markerId;
    marker.className = 'xl-hidden-row-marker';
    marker.title = 'Dòng ' + key + ' đang ẩn — nhấn để hiện';
    marker.setAttribute('data-row-key', key);
    marker.innerHTML = '<td colspan="12" onclick="xlShowRow(\'' + key + '\')" style="cursor:pointer;height:4px;"></td>';
    tr.parentNode.insertBefore(marker, tr);
  }
}

function _removeHiddenMarker(key) {
  var m = document.getElementById('xl-hm-' + key);
  if (m) m.parentNode.removeChild(m);
}

// Hide a column (1-based, A=1..K=11)
function xlHideCol(colIdx) {
  _xlHiddenCols[colIdx] = true;
  _applyColVisibility();
  xlBuildVisPanel();
}

function xlShowCol(colIdx) {
  delete _xlHiddenCols[colIdx];
  _applyColVisibility();
  xlBuildVisPanel();
}

function _applyColVisibility() {
  for (var c = 1; c <= 11; c++) {
    var colEl = document.getElementById('xl-col-' + c);
    var thEl = document.getElementById('xl-th-' + c);
    var hidden = !!_xlHiddenCols[c];
    if (colEl) colEl.classList.toggle('xl-col-hidden', hidden);
    if (thEl) thEl.classList.toggle('xl-col-hidden', hidden);
    // Hide cells in that column (nth-child = c+1 since col 1=rownum)
    var table = document.getElementById('hsvv-xl-main-table');
    if (table) {
      table.querySelectorAll('tr').forEach(function(tr) {
        var tds = tr.children;
        // +1 for rownum col offset
        var idx = c; // col A=1 → tds[1], col B=2 → tds[2] etc
        if (tds[idx]) tds[idx].classList.toggle('xl-col-hidden', hidden);
      });
    }
  }
}

function xlShowAllRowsCols() {
  _xlHiddenRows = {};
  _xlHiddenCols = {};
  _applyRowVisibility();
  _applyColVisibility();
  // Remove all markers
  document.querySelectorAll('.xl-hidden-row-marker').forEach(function(m){ m.parentNode.removeChild(m); });
  xlBuildVisPanel();
  var info = document.getElementById('hsvv-xl-fx-info');
  if(info){ info.style.color='#2e7d32'; info.textContent='✓ Đã hiện tất cả'; setTimeout(function(){info.style.color='';info.textContent='';},1500); }
}

// ── Context menu on rownum: right-click to hide ───────────────
function xlRowRightClick(e, rowKey) {
  e.preventDefault();
  if (confirm('Ẩn dòng ' + rowKey + '?')) xlHideRow(rowKey);
}

// ── Visibility panel ──────────────────────────────────────────
function xlToggleVisPanel(e) {
  e.stopPropagation();
  var p = document.getElementById('hsvv-xl-vis-panel');
  if (!p) return;
  if (p.style.display === 'none' || !p.style.display) {
    xlBuildVisPanel();
    var rect = e.target.getBoundingClientRect();
    p.style.display = 'block';
    p.style.position = 'fixed';
    p.style.left = rect.left + 'px';
    p.style.top = (rect.bottom + 4) + 'px';
  } else {
    p.style.display = 'none';
  }
}

document.addEventListener('click', function(){ 
  var p = document.getElementById('hsvv-xl-vis-panel');
  if(p) p.style.display='none';
});

function xlBuildVisPanel() {
  var rowsDiv = document.getElementById('hsvv-xl-vis-rows');
  var colsDiv = document.getElementById('hsvv-xl-vis-cols');
  if (!rowsDiv || !colsDiv) return;

  // Rows
  var table = document.getElementById('hsvv-xl-main-table');
  var rowKeys = [];
  if (table) {
    table.querySelectorAll('tbody tr:not(.xl-hidden-row-marker)').forEach(function(tr){
      var rn = tr.querySelector('.xl-row-num-txt, .xl-rownum:not(.xl-dyn)');
      if(rn) { var k=(rn.textContent||'').trim(); if(k && rowKeys.indexOf(k)===-1) rowKeys.push(k); }
    });
  }

  rowsDiv.innerHTML = '<div style="font-size:10px;color:#aab;font-weight:700;margin-bottom:4px;">DÒNG</div>'
    + rowKeys.slice(0,20).map(function(k){
      var hidden = !!_xlHiddenRows[k];
      return '<label class="xl-vis-item"><input type="checkbox" '+(hidden?'':'checked')+' onchange="'+(hidden?'xlShowRow':'xlHideRow')+'(\''+k+'\')"> Dòng '+k+'</label>';
    }).join('');

  // Cols
  var colNames = 'ABCDEFGHIJK'.split('');
  colsDiv.innerHTML = '<div style="font-size:10px;color:#aab;font-weight:700;margin-bottom:4px;">CỘT</div>'
    + colNames.map(function(n, i){
      var c = i+1;
      var hidden = !!_xlHiddenCols[c];
      return '<label class="xl-vis-item"><input type="checkbox" '+(hidden?'':'checked')+' onchange="'+(hidden?'xlShowCol':'xlHideCol')+'('+c+')"> Cột '+n+'</label>';
    }).join('');
}

// ── Right-click on row numbers for hide ───────────────────────
function xlAddRowHideCtx() {
  var table = document.getElementById('hsvv-xl-main-table');
  if (!table) return;
  table.querySelectorAll('.xl-rownum').forEach(function(td) {
    if (td.dataset.hideCtx) return;
    td.dataset.hideCtx = '1';
    td.addEventListener('contextmenu', function(e) {
      var rn = td.querySelector('.xl-row-num-txt');
      var key = rn ? rn.textContent.trim() : td.textContent.trim();
      if(!key) return;
      e.preventDefault();
      if(confirm('Ẩn dòng ' + key + '?')) xlHideRow(key);
    });
  });
}

// ── Init ──────────────────────────────────────────────────────
function xlFormulaInit() {
  xlWireCellClicks();
  xlAddRowHideCtx();
  xlBuildVisPanel();
  // Deselect on table body click (non-cell)
  var wrap = document.getElementById('hsvv-xl-table-wrap');
  if (wrap) {
    wrap.addEventListener('click', function(e) {
      if (!e.target.closest('td') && !e.target.closest('input')) {
        var ref = document.getElementById('hsvv-xl-cell-ref');
        if(ref) ref.textContent = '—';
        _xlActiveCell = null;
        _xlActiveCellId = '';
        var fxEl = document.getElementById('hsvv-xl-formula-input');
        if(fxEl) { fxEl.value=''; fxEl.classList.remove('xl-formula-mode','xl-formula-err'); }
      }
    });
  }
}


function showPhuongAn() {
  var wrapper = document.getElementById('pa-sxkd-wrapper');
  if (!wrapper) return;
  wrapper.style.display = 'block';
  setTimeout(function(){
    if(!document.getElementById('hsvv-xl-r1-body').children.length) {
      xlRenderR1(); xlRenderR2();
    }
    xlCalcAll(); xlApplyStyles();
    xlFormulaInit();
    setTimeout(xlFmtAllInputs, 120);
    setTimeout(xlRestoreColWrap, 160);
  }, 150);
}


function togglePA(){
  var w=document.getElementById('pa-wrapper');
  var b=document.getElementById('pa-btn');
  if(!w) return;
  if(w.style.display==='none'){
    w.style.display='block';
    b.textContent='📊 Phương án SXKD ▲';
    if(typeof renderAll==='function' && !window._paInited){
      window._paInited=true;
      renderAll(); calc();
    }
  } else {
    w.style.display='none';
    b.textContent='📊 Phương án SXKD ▼';
  }
}


function fmt(n){
  if(n===null||n===undefined||n==='')return '';
  var num=parseFloat(n);
  if(isNaN(num))return n;
  return num.toLocaleString('vi-VN');
}
function inp(id,val,cls){
  cls=cls||'';
  return '<input type="number" id="'+id+'" value="'+(val||'')+'" onchange="calc()" style="'+cls+'">';
}
function formulaCell(id){return'<td class="fc" id="fc_'+id+'"></td>';}

// Dữ liệu hàng hoá - Bảng 1-2 (sữa, bánh, hàng FMCG)
var hang1=[
  ['1','Sữa bột Vinamilk','Hộp',4000,470000],
  ['2','Sữa bột Nutifood','Hộp',3000,645000],
  ['3','Sữa bột TH True milk','Hộp',5000,350000],
  ['4','Sữa bột Pediacare','Hộp',5000,325000],
  ['5','Sữa bột Nestle','Hộp',5000,385000],
  ['6','Sữa bột Dutch Lady','Hộp',6000,285000],
  ['7','Sữa bột Dalat milk','Hộp',5000,335000],
  ['8','Sữa tươi BaVi','Thùng',6000,280000],
  ['9','Sữa tươi Vinamilk','Thùng',5500,255000],
  ['10','Sữa tươi TH True milk','Thùng',5000,308000],
  ['11','Sữa tươi Dutch Lady','Thùng',6000,200000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',6000,212000],
  ['13','Bánh Begi (Tràng An)','Thùng',5000,225000],
  ['14','Bánh Hura (Bibica)','Thùng',7000,110000],
  ['15','Bánh Orito (Hải Hà)','Thùng',5000,185000],
  ['16','Bánh Chocopie','Thùng',5000,190000],
  ['17','Bánh Mochi','Thùng',7000,50000],
  ['18','Thạch rau câu Long Hải','Thùng',5000,170000],
  ['19','Kẹo Jinsen Candy','Gói',6000,162200],
  ['20','Các loại bia, bánh kẹo, nước ngọt khác','',0,0],
];
var hang2=[ // Năm 2 - giá khác
  ['1','Sữa bột Vinamilk','Hộp',4000,511000],
  ['2','Sữa bột Nutifood','Hộp',3000,715000],
  ['3','Sữa bột TH True milk','Hộp',5000,388000],
  ['4','Sữa bột Pediacare','Hộp',5000,365000],
  ['5','Sữa bột Nestle','Hộp',5000,415000],
  ['6','Sữa bột Dutch Lady','Hộp',6000,315000],
  ['7','Sữa bột Dalat milk','Hộp',5000,364000],
  ['8','Sữa tươi BaVi','Thùng',6000,306000],
  ['9','Sữa tươi Vinamilk','Thùng',5500,285000],
  ['10','Sữa tươi TH True milk','Thùng',5000,328000],
  ['11','Sữa tươi Dutch Lady','Thùng',6000,232000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',6000,255000],
  ['13','Bánh Begi (Tràng An)','Thùng',5000,245000],
  ['14','Bánh Hura (Bibica)','Thùng',7000,130000],
  ['15','Bánh Orito (Hải Hà)','Thùng',5000,225000],
  ['16','Bánh Chocopie','Thùng',5000,230000],
  ['17','Bánh Mochi','Thùng',7000,58000],
  ['18','Thạch rau câu Long Hải','Thùng',5000,185000],
  ['19','Kẹo Jinsen Candy','Gói',6000,175000],
  ['20','Các loại hàng hóa khác','',0,0],
];
var hang3=[ // Bảng 3 - nhỏ hơn
  ['1','Sữa bột Vinamilk','Hộp',60,470000],
  ['2','Sữa bột Nutifood','Hộp',50,645000],
  ['3','Sữa bột TH True milk','Hộp',80,350000],
  ['4','Sữa bột Pediacare','Hộp',50,325000],
  ['5','Sữa bột Nestle','Hộp',50,385000],
  ['6','Sữa bột Dutch Lady','Hộp',100,285000],
  ['7','Sữa bột Dalat milk','Hộp',80,335000],
  ['8','Sữa tươi BaVi','Thùng',100,280000],
  ['9','Sữa tươi Vinamilk','Thùng',100,255000],
  ['10','Sữa tươi TH True milk','Thùng',100,308000],
  ['11','Sữa tươi Dutch Lady','Thùng',100,200000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',0,212000],
  ['13','Bánh Begi (Tràng An)','Thùng',0,225000],
  ['14','Bánh Hura (Bibica)','Thùng',0,110000],
  ['15','Bánh Orito (Hải Hà)','Thùng',0,185000],
  ['16','Bánh Chocopie','Thùng',0,190000],
  ['17','Bánh Mochi','Thùng',0,50000],
  ['18','Thạch rau câu Long Hải','Thùng',0,170000],
  ['19','Kẹo Jinsen Candy','Gói',0,162200],
  ['20','Các loại bia, bánh kẹo, nước ngọt khác','',0,0],
];
var hang4=[ // Bảng 4
  ['1','Sữa bột Vinamilk','Hộp',300,470000],
  ['2','Sữa bột Nutifood','Hộp',100,645000],
  ['3','Sữa bột TH True milk','Hộp',200,350000],
  ['4','Sữa bột Pediacare','Hộp',300,325000],
  ['5','Sữa bột Nestle','Hộp',200,385000],
  ['6','Sữa bột Dutch Lady','Hộp',200,285000],
  ['7','Sữa bột Dalat milk','Hộp',200,335000],
  ['8','Sữa tươi BaVi','Thùng',300,280000],
  ['9','Sữa tươi Vinamilk','Thùng',300,255000],
  ['10','Sữa tươi TH True milk','Thùng',300,308000],
  ['11','Sữa tươi Dutch Lady','Thùng',400,200000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',250,212000],
  ['13','Bánh Begi (Tràng An)','Thùng',0,225000],
  ['14','Bánh Hura (Bibica)','Thùng',0,110000],
  ['15','Bánh Orito (Hải Hà)','Thùng',0,185000],
  ['16','Bánh Chocopie','Thùng',0,190000],
  ['17','Bánh Mochi','Thùng',0,50000],
  ['18','Thạch rau câu Long Hải','Thùng',0,170000],
  ['19','Kẹo Jinsen Candy','Gói',0,162200],
  ['20','Các loại bia, bánh kẹo, nước ngọt khác','',0,0],
];
var hang5=[ // Bảng 5 - lớn
  ['1','Sữa bột Vinamilk','Hộp',400,470000],
  ['2','Sữa bột Nutifood','Hộp',500,645000],
  ['3','Sữa bột TH True milk','Hộp',500,350000],
  ['4','Sữa bột Pediacare','Hộp',500,325000],
  ['5','Sữa bột Nestle','Hộp',500,385000],
  ['6','Sữa bột Dutch Lady','Hộp',600,285000],
  ['7','Sữa bột Dalat milk','Hộp',400,335000],
  ['8','Sữa tươi BaVi','Thùng',500,280000],
  ['9','Sữa tươi Vinamilk','Thùng',400,255000],
  ['10','Sữa tươi TH True milk','Thùng',550,308000],
  ['11','Sữa tươi Dutch Lady','Thùng',500,200000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',600,212000],
  ['13','Bánh Begi (Tràng An)','Thùng',800,225000],
  ['14','Bánh Hura (Bibica)','Thùng',660,110000],
  ['5','Bánh Orito (Hải Hà)','Thùng',600,185000],
  ['6','Bánh Chocopie','Thùng',600,190000],
  ['7','Bánh Mochi','Thùng',1000,50000],
  ['8','Thạch rau câu Long Hải','Thùng',1000,170000],
  ['9','Kẹo Jinsen Candy','Gói',600,162200],
  ['10','Các loại hàng hóa khác','',0,0],
];
var hang6=[ // Bảng 6 - Vang, Bia
  ['1','Vang Đà Lạt (Dabeco)','Chai',4000,50000],
  ['2','Vang Đà Lạt (Vĩnh Tiến)','Chai',4000,80000],
  ['3','Vang Đà Lạt trắng','Chai',4000,80000],
  ['4','Vang Thăng Long','Chai',4000,50000],
  ['5','Bia Heneken','Thùng',1000,360000],
  ['6','Bia Sài Gòn','Thùng',600,270000],
  ['7','Bia 333','Thùng',800,210000],
  ['8','Bia Hà Nội','Thùng',1000,210000],
  ['9','Bia Trúc Bạch','Thùng',1000,300000],
  ['10','Bia Tiger','Thùng',600,305000],
  ['11','Bia Đại Việt','Thùng',1000,211000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',1000,252000],
  ['13','Bánh Begi (Tràng An)','Thùng',1000,265000],
  ['14','Bánh Hura (Bibica)','Thùng',1600,150000],
  ['15','Bánh Orito (Hải Hà)','Thùng',1000,260000],
  ['16','Bánh Chocopie','Thùng',1000,230000],
  ['17','Kẹo sâm Jinsen Candy','Gói',500,130000],
  ['18','Các loại bia, bánh kẹo, nước ngọt khác','',0,0],
];
var hang7=[ // Bảng 7 - giá khác
  ['1','Vang Đà Lạt (Dabeco)','Chai',4000,65000],
  ['2','Vang Đà Lạt (Vĩnh Tiến)','Chai',4000,95000],
  ['3','Vang Đà Lạt trắng','Chai',4000,95000],
  ['4','Vang Thăng Long','Chai',4000,65000],
  ['5','Bia Heneken','Thùng',1000,390000],
  ['6','Bia Sài Gòn','Thùng',600,300000],
  ['7','Bia 333','Thùng',800,240000],
  ['8','Bia Hà Nội','Thùng',1000,240000],
  ['9','Bia Trúc Bạch','Thùng',1000,350000],
  ['10','Bia Tiger','Thùng',600,330000],
  ['11','Bia Đại Việt','Thùng',1000,230000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',1000,282000],
  ['13','Bánh Begi (Tràng An)','Thùng',1000,304000],
  ['14','Bánh Hura (Bibica)','Thùng',1600,182000],
  ['15','Bánh Orito (Hải Hà)','Thùng',1000,235000],
  ['16','Bánh Chocopie','Thùng',1000,275000],
  ['17','Kẹo sâm Jinsen Candy','Gói',500,162000],
  ['18','Các loại bia, bánh kẹo, nước ngọt khác','',0,0],
];
var hang8=[ // Bảng 8
  ['1','Vang Đà Lạt (Dabeco)','Chai',0,50000],
  ['2','Vang Đà Lạt (Vĩnh Tiến)','Chai',0,80000],
  ['3','Vang Đà Lạt trắng','Chai',0,80000],
  ['4','Vang Thăng Long','Chai',0,50000],
  ['5','Bia Heneken','Thùng',0,360000],
  ['6','Bia Sài Gòn','Thùng',0,270000],
  ['7','Bia 333','Thùng',0,210000],
  ['8','Bia Hà Nội','Thùng',0,210000],
  ['9','Bia Trúc Bạch','Thùng',0,300000],
  ['10','Bia Tiger','Thùng',0,305000],
  ['11','Bia Đại Việt','Thùng',0,211000],
  ['12','Bánh Cosy (Kinh đô)','Thùng',2000,252000],
  ['13','Bánh Begi (Tràng An)','Thùng',1500,265000],
  ['14','Bánh Hura (Bibica)','Thùng',2000,150000],
  ['15','Bánh Orito (Hải Hà)','Thùng',1800,260000],
  ['16','Bánh Chocopie','Thùng',2000,230000],
  ['17','Kẹo sâm Jinsen Candy','Gói',2000,130000],
  ['18','Các loại bia, bánh kẹo, nước ngọt khác','',0,0],
];

function buildTable(data, tblId, rightData){
  var rows='';
  // Header
  rows+='<tr class="sec-title-row"><td colspan="11"><b>'+rightData.title+'</b></td></tr>';
  rows+='<tr style="background:#c5cfe8;font-weight:700;text-align:center;font-size:11px;">'
       +'<td>STT</td><td>Loại</td><td>Đơn vị</td>'
       +'<td>Số lượng</td><td>Đơn giá (đ)</td><td style="background:#7f1d1d;color:#fff;">Thành tiền (đ)</td>'
       +'<td></td><td style="background:#2d4a8a;color:#fff;">Chỉ tiêu</td>'
       +'<td style="background:#2d4a8a;color:#fff;">Giá trị (đ)</td>'
       +'<td colspan="2" style="background:#2d4a8a;color:#fff;">Ghi chú</td></tr>';
  
  // Items
  data.forEach(function(item,i){
    var stt=item[0],ten=item[1],dv=item[2],sl=item[3],dg=item[4];
    var right = (i < rightData.rows.length) ? rightData.rows[i] : {h:'',iv:'',jv:'',kv:''};
    
    var tdF = '<td class="fc" id="tt_'+tblId+'_'+i+'"></td>';
    var tdG = right.gv ? '<td class="nc">'+fmt(right.gv)+'</td>' : '<td></td>';
    var tdH = right.h ? '<td class="lc">'+right.h+'</td>' : '<td></td>';
    var tdI, tdJ='<td></td>', tdK='<td></td>';
    
    if(right.iFormula){
      tdI = '<td class="fc" id="ri_'+tblId+'_'+i+'">'+fmt(right.iv)+'</td>';
    } else if(right.iv!==undefined && right.iv!==''){
      tdI = '<td class="ic"><input type="number" id="ri_'+tblId+'_'+i+'" value="'+right.iv+'" onchange="calcRightSide()"></td>';
    } else {
      tdI = '<td></td>';
    }
    if(right.jv!==undefined && right.jv!=='') tdJ='<td class="nc">'+fmt(right.jv)+'</td>';
    if(right.kv!==undefined && right.kv!=='') tdK='<td class="nc">'+fmt(right.kv)+'</td>';
    
    rows+='<tr>'
         +'<td style="text-align:center;">'+stt+'</td>'
         +'<td class="tc">'+ten+'</td>'
         +'<td style="text-align:center;">'+dv+'</td>'
         +'<td class="ic"><input type="number" id="sl_'+tblId+'_'+i+'" value="'+sl+'" onchange="calc()"></td>'
         +'<td class="ic"><input type="number" id="dg_'+tblId+'_'+i+'" value="'+dg+'" onchange="calc()"></td>'
         +tdF+tdG+tdH+tdI+tdJ+tdK
         +'</tr>';
  });
  
  // SUM rows
  rightData.sumRows.forEach(function(sr){
    rows+='<tr class="sum-row">'
         +'<td colspan="5" style="text-align:right;padding-right:8px;font-weight:700;">'+sr.label+'</td>'
         +'<td class="fc" id="sum_'+tblId+'_'+sr.id+'"></td>'
         +'<td colspan="5">'+( sr.note||'')+'</td></tr>';
  });
  
  // Extra rows (ngoài bảng)
  if(rightData.extraRows){
    rightData.extraRows.forEach(function(er){
      rows+='<tr>'
           +'<td></td>'
           +'<td class="tc" style="font-style:italic;">'+er.label+'</td>'
           +'<td></td>'
           +'<td class="ic">'+(er.sl!==undefined?'<input type="number" id="ex_sl_'+tblId+'_'+er.id+'" value="'+er.sl+'" onchange="calc()">':'')+'</td>'
           +'<td class="ic">'+(er.dg!==undefined?'<input type="number" id="ex_dg_'+tblId+'_'+er.id+'" value="'+er.dg+'" onchange="calc()">':'')+'</td>'
           +'<td class="fc" id="ex_tt_'+tblId+'_'+er.id+'"></td>'
           +'<td colspan="5"></td></tr>';
    });
  }
  
  rows+='<tr><td colspan="11" style="height:10px;background:#eee;"></td></tr>';
  return rows;
}

// Cấu hình right-side data cho từng bảng
var right1={
  title:'BẢNG 1: KẾ HOẠCH NĂM 1 — Hàng hóa sữa, bánh kẹo, FMCG',
  rows:[
    {h:'* Tổng nhu cầu tham gia vào phương án', iv:13000000000, iFormula:true, jv:38.46},
    {h:' + Vốn tự có tham gia', iv:5000000000},
    {h:' + Vốn xin vay Ngân Hàng', iv:8000000000},
    {h:' + Vốn vay các TCTD khác', iv:0, jv:3000000000},
    {},{},{},{},{},{},{},{},
    {gv:2,   h:'Số NV (người)', iv:7000000, jv:168000000},
    {gv:2,   h:'Lương/tháng/NV', iv:4000000, jv:96000000},
    {h:'Tổng lương năm', iv:264000000, iFormula:true},
    {},{},
    {h:'* Tổng CP (chưa có lãi, thuế, khấu hao)', iv:26000000000, iFormula:true},
    {gv:225000000, h:'Lãi', iv:480000000, iFormula:true},
    {gv:212500000, h:'Khấu hao', iv:0},
    {h:'Thuế', iv:10000000},
    {gv:81000000, h:'Tổng CP', iv:26490000000, iFormula:true},
  ],
  sumRows:[
    {id:'tongHH',label:'Tổng hàng hóa'},
  ],
  extraRows:[
    {id:'lai',   label:'Lãi',       sl:8000000000, dg:6},
    {id:'luong', label:'Lương',     sl:2,          dg:4000000},
    {id:'khac',  label:'Chi phí khác'},
    {id:'khh',   label:'Khấu hao'},
    {id:'thue',  label:'Thuế'},
  ]
};
// Right side bảng 1 thêm chi tiết bên ngoài
var rightSummary1=[
  {label:'Chi phí vật tư', id:'cpVT1', formula:true},
  {label:'Chi phí khác',   id:'cpKhac1', formula:true},
];

var right2={
  title:'BẢNG 2: KẾ HOẠCH NĂM 2 — Hàng hóa sữa, bánh kẹo, FMCG (giá cập nhật)',
  rows:[
    {},{},{},{},{},{},{},{},{},{},{},{},{},
    {gv:1387500000},
    {},{},{},{},
    {gv:525000000},
  ],
  sumRows:[{id:'tongHH',label:'Tổng hàng hóa'}],
  extraRows:[]
};
// Right side bảng 2: Tổng TS hiện có
var rightTS2=[
  {label:'* Tổng giá trị tài sản hiện có (I)', id:'tsHC', iv:46080000000},
  {label:' + Giá trị nhà đất',  id:'tsND',  iv:26080000000, jv:1395000000, kv:6840000000},
  {label:' + Giá trị lao động', id:'tsLD',  iv:48000000,    jv:2978720000},
  {label:' + Tài sản khác (tủ quầy, xe máy...)', id:'tsTK', iv:15000000000, jv:4373720000},
  {label:' + Hàng hoá các loại', id:'tsHH', iv:2800000000,  jv:5000000000},
  {label:' + Tiền mặt',          id:'tsTM', iv:300000000},
  {label:' * + Nợ phải thu',     id:'tsNPT', iv:2152000000, iFormula:true},
  {label:' + Nợ phải trả',       id:'tsNPTra', iv:300000000, jv:1060851000},
  {label:'Nợ NHNo TP Nam Định',  id:'tsNoNH', jv:129000000},
];

var right3={
  title:'BẢNG 3: KẾ HOẠCH THÁNG — Hàng hóa sữa, bánh kẹo (đầu kỳ)',
  rows:[
    {},{iv:120000000},{iv:167000000},{iv:195000000},
    {},{},{},{},{},{},{},
    {},{},{},{},
    {iv:250000000},{iv:55000000},{iv:162000000},
    {iv:1169000000,iFormula:true, jv:1294000000},
    {jv:-125000000},
  ],
  sumRows:[{id:'tongHH',label:'Tổng hàng hóa'}],
  extraRows:[]
};
var right4={
  title:'BẢNG 4: KẾ HOẠCH THÁNG — Hàng hóa sữa, bánh kẹo (giữa kỳ)',
  rows:[{},{},{},{},{},{gv:1400000000},{},{},{},{},{},{},{},{},{},{},{gv:'#REF!'},{},{},{},],
  sumRows:[{id:'tongHH',label:'Tổng hàng hóa'}],
  extraRows:[]
};
var right5={
  title:'BẢNG 5: KẾ HOẠCH NĂM — Hàng hóa sữa, bánh kẹo (quy mô lớn)',
  rows:[
    {},{},{},{},{},{},{},{},{},{},{},{},
    {h:'Doanh thu (xấp xỉ)',iv:240000000},{iv:198000000},{iv:220000000},
    {iv:170000000},{iv:250000000},{iv:225000000},{iv:230000000},
    {h:'Tổng DT',iv:195000000},{iv:195000000},
  ],
  sumRows:[{id:'tongHH',label:'Tổng hàng hóa'}],
  extraRows:[]
};
var right5b=[
  {label:'Doanh thu dự kiến',id:'dt5',iv:2146000000},
  {label:'Chênh lệch (LN)',  id:'ln5',formula:true},
];

var right6={
  title:'BẢNG 6: KẾ HOẠCH NĂM 1 — Vang, Bia, Bánh kẹo (cao cấp)',
  rows:[
    {h:'Doanh thu tháng hiện tại', iv:2146000000, iFormula:true},
    {iv:0,iFormula:true},
    {},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},
  ],
  sumRows:[{id:'tongHH',label:'Tổng hàng hóa'}],
  extraRows:[]
};
var right7={
  title:'BẢNG 7: KẾ HOẠCH NĂM 2 — Vang, Bia, Bánh kẹo (giá cập nhật)',
  rows:[{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},],
  sumRows:[{id:'tongHH',label:'Tổng hàng hóa'}],
  extraRows:[]
};
var right8={
  title:'BẢNG 8: KẾ HOẠCH THÁNG — Vang, Bia, Bánh kẹo (cuối kỳ)',
  rows:[{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},],
  sumRows:[{id:'tongHH',label:'Tổng hàng hóa'}],
  extraRows:[]
};

function renderAll(){
  var html='';
  
  // Bảng 1
  html+=buildTable(hang1,'b1',right1);
  
  // Bảng bên phải Tổng TS (dưới bảng 1, liên quan bảng 2)
  html+='<tr class="sec-title-row"><td colspan="11">BẢNG TỔNG HỢP BÊN PHẢI — Tài sản & Vốn (liên quan Bảng 1 & 2)</td></tr>';
  
  // Bảng 2
  html+=buildTable(hang2,'b2',right2);
  
  // Bảng tài sản
  html+='<tr class="sub-title-row"><td colspan="6"></td><td></td>'
       +'<td class="lc" style="font-weight:700;">Tổng giá trị TS hiện có</td>'
       +'<td class="ic"><input type="number" id="ts_tongTS" value="46080000000" onchange="calcRightSide()"></td>'
       +'<td colspan="2"></td></tr>';
  rightTS2.forEach(function(ts,i){
    html+='<tr><td colspan="6"></td><td></td>'
         +'<td class="lc">'+ts.label+'</td>'
         +'<td class="ic"><input type="number" id="ts_'+ts.id+'" value="'+(ts.iv||'')+'" onchange="calcRightSide()"></td>'
         +'<td class="nc">'+(ts.jv?fmt(ts.jv):'')+'</td>'
         +'<td class="nc">'+(ts.kv?fmt(ts.kv):'')+'</td>'
         +'</tr>';
  });
  html+='<tr><td colspan="11" style="height:6px;background:#eee;"></td></tr>';
  
  // Bảng 3
  html+=buildTable(hang3,'b3',right3);
  // Bảng 4
  html+=buildTable(hang4,'b4',right4);
  // Bảng 5
  html+=buildTable(hang5,'b5',right5);
  
  html+='<tr><td colspan="6"></td><td></td>'
       +'<td class="lc">Doanh thu dự kiến năm</td>'
       +'<td class="ic"><input type="number" id="dt_b5" value="2146000000" onchange="calcRightSide()"></td>'
       +'<td colspan="2"></td></tr>';
  html+='<tr><td colspan="6"></td><td></td>'
       +'<td class="lc">Chênh lệch (LN ước tính)</td>'
       +'<td class="fc" id="ln_b5">0</td>'
       +'<td colspan="2"></td></tr>';
  html+='<tr><td colspan="11" style="height:6px;background:#eee;"></td></tr>';
  
  // Bảng 6
  html+=buildTable(hang6,'b6',right6);
  // Bảng 7
  html+=buildTable(hang7,'b7',right7);
  // Bảng 8
  html+=buildTable(hang8,'b8',right8);
  
  /* PATCH v13.8.1: guard null để không ngắt vòng render khi không ở trang có #tableBody */
  var _tb = document.getElementById('tableBody');
  if (_tb) _tb.innerHTML = html;
  else if (window.console) console.debug('[renderAll] #tableBody chưa có — skip.');
}

function calc(){
  /* PATCH v13.8.1 (đồng bộ với renderAll): guard null để không ngắt vòng render khi không ở trang có #tableBody */
  if (!document.getElementById('tableBody')) { if (window.console) console.debug('[calc] #tableBody chưa có — skip.'); return; }
  var tbls=[
    {id:'b1',data:hang1},
    {id:'b2',data:hang2},
    {id:'b3',data:hang3},
    {id:'b4',data:hang4},
    {id:'b5',data:hang5},
    {id:'b6',data:hang6},
    {id:'b7',data:hang7},
    {id:'b8',data:hang8},
  ];
  tbls.forEach(function(t){
    var total=0;
    t.data.forEach(function(item,i){
      var slEl=document.getElementById('sl_'+t.id+'_'+i);
      var dgEl=document.getElementById('dg_'+t.id+'_'+i);
      if(!slEl||!dgEl) return;
      var sl=parseFloat(slEl.value)||0;
      var dg=parseFloat(dgEl.value)||0;
      var tt=sl*dg;
      total+=tt;
      var fc=document.getElementById('tt_'+t.id+'_'+i);
      if(fc) fc.textContent=fmt(tt);
    });
    // Extra rows
    var exLai_sl=document.getElementById('ex_sl_'+t.id+'_lai');
    var exLai_dg=document.getElementById('ex_dg_'+t.id+'_lai');
    if(exLai_sl&&exLai_dg){
      var sl=parseFloat(exLai_sl.value)||0;
      var dg=parseFloat(exLai_dg.value)||0;
      var fc=document.getElementById('ex_tt_'+t.id+'_lai');
      if(fc) fc.textContent=fmt(sl*(dg/100));
    }
    var exLuong_sl=document.getElementById('ex_sl_'+t.id+'_luong');
    var exLuong_dg=document.getElementById('ex_dg_'+t.id+'_luong');
    if(exLuong_sl&&exLuong_dg){
      var sl=parseFloat(exLuong_sl.value)||0;
      var dg=parseFloat(exLuong_dg.value)||0;
      var fc=document.getElementById('ex_tt_'+t.id+'_luong');
      if(fc) fc.textContent=fmt(sl*dg*12);
    }
    var sumEl=document.getElementById('sum_'+t.id+'_tongHH');
    if(sumEl) sumEl.textContent=fmt(total);
  });
  calcRightSide();
}

function calcRightSide(){
  // Bảng 1 right side: Tổng nhu cầu = Vốn TC + Vốn NH + TCTD
  var vtc=parseFloat((document.getElementById('ri_b1_1')||{}).value)||5000000000;
  var vnh=parseFloat((document.getElementById('ri_b1_2')||{}).value)||8000000000;
  var vtctd=parseFloat((document.getElementById('ri_b1_3')||{}).value)||0;
  var tongNC=vtc+vnh+vtctd;
  var el0=document.getElementById('ri_b1_0');
  if(el0) el0.textContent=fmt(tongNC);
  
  // Tổng CP = Tổng HH + Lãi + Lương + Khác + KH + Thuế
  var sumB1El=document.getElementById('sum_b1_tongHH');
  var tongHH1=sumB1El?parseFloat(sumB1El.textContent.replace(/\./g,'').replace(',','.'))||0:0;
  var laiTT=parseFloat((document.getElementById('ex_tt_b1_lai')||{}).textContent.replace(/\./g,''))||480000000;
  var luongTT=parseFloat((document.getElementById('ex_tt_b1_luong')||{}).textContent.replace(/\./g,''))||96000000;
  var khacEl=document.getElementById('ex_sl_b1_khac');
  var khac=khacEl?parseFloat(khacEl.value)||66300000:66300000;
  var thueEl=document.getElementById('ex_sl_b1_thue');
  var thue=thueEl?parseFloat(thueEl.value)||10000000:10000000;
  var tongCP1=tongHH1+laiTT+luongTT+khac+thue;
  var tcpEl=document.getElementById('ri_b1_20');
  if(tcpEl) tcpEl.textContent=fmt(tongCP1);
  
  // LN bảng 5
  var dt5El=document.getElementById('dt_b5');
  var sum5El=document.getElementById('sum_b5_tongHH');
  if(dt5El&&sum5El){
    var dt5=parseFloat(dt5El.value)||0;
    var hh5=parseFloat(sum5El.textContent.replace(/\./g,''))||0;
    var ln5=dt5-hh5;
    var lnEl=document.getElementById('ln_b5');
    if(lnEl) lnEl.textContent=fmt(ln5);
  }
}

renderAll();
calc();


/* ══ BORDER TOOL ════════════════════════════════════════════════ */

var s4BorderState = {
  preset: 'all',
  style: 'solid',
  thick: '2',
  color: '#1a2540'
};

// ── Open / Close panel ─────────────────────────────────────────
function s4BorderOpen(e) {
  e.stopPropagation();
  var btn = document.getElementById('s4-border-btn');
  var panel = document.getElementById('s4-border-panel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    var rect = btn.getBoundingClientRect();
    panel.style.display = 'block';
    // Position: below the button
    var left = Math.min(rect.left, window.innerWidth - 295);
    panel.style.left = left + 'px';
    panel.style.top = (rect.bottom + 6) + 'px';
    if (btn) btn.classList.add('active');
    s4BorderUpdatePreview();
  } else {
    s4BorderClose();
  }
}

function s4BorderClose() {
  var panel = document.getElementById('s4-border-panel');
  if (panel) panel.style.display = 'none';
  var btn = document.getElementById('s4-border-btn');
  if (btn) btn.classList.remove('active');
}

document.addEventListener('click', function() { s4BorderClose(); });

// ── Preset selection ───────────────────────────────────────────
function s4BorderPreset(preset, btnEl) {
  s4BorderState.preset = preset;
  document.querySelectorAll('.s4-bpbtn').forEach(function(b) { b.classList.remove('active'); });
  if (btnEl) btnEl.classList.add('active');
  s4BorderUpdatePreview();
}

// ── Get current settings ───────────────────────────────────────
function s4BorderGetSettings() {
  var styleEl = document.getElementById('s4-border-style');
  var thickEl = document.getElementById('s4-border-thick');
  var colorEl = document.getElementById('s4-border-color-inp');
  return {
    preset: s4BorderState.preset,
    style: styleEl ? styleEl.value : 'solid',
    thick: thickEl ? parseInt(thickEl.value) : 2,
    color: colorEl ? colorEl.value : '#1a2540'
  };
}

// ── Update preview table ───────────────────────────────────────
function s4BorderUpdatePreview() {
  var cfg = s4BorderGetSettings();
  var borderStr = cfg.thick + 'px ' + cfg.style + ' ' + cfg.color;
  var none = '1px solid #e8edf3';

  var ids = ['tl','tm','tr','ml','mm','mr','bl','bm','br'];
  ids.forEach(function(id) {
    var td = document.getElementById('pv-' + id);
    if (!td) return;
    td.style.borderTop = none;
    td.style.borderBottom = none;
    td.style.borderLeft = none;
    td.style.borderRight = none;
  });

  var set = function(ids2, sides, val) {
    ids2.forEach(function(id) {
      var td = document.getElementById('pv-' + id);
      if (!td) return;
      sides.forEach(function(side) { td.style['border'+side[0].toUpperCase()+side.slice(1)] = val; });
    });
  };

  var p = cfg.preset;
  if (p === 'none') return;

  if (p === 'all') {
    ids.forEach(function(id) {
      var td = document.getElementById('pv-' + id);
      if (td) td.style.border = borderStr;
    });
  } else if (p === 'outer' || p === 'thick_outer') {
    var b = p === 'thick_outer' ? (cfg.thick + 2) + 'px ' + cfg.style + ' ' + cfg.color : borderStr;
    set(['tl','tm','tr'], ['Top'], b);
    set(['bl','bm','br'], ['Bottom'], b);
    set(['tl','ml','bl'], ['Left'], b);
    set(['tr','mr','br'], ['Right'], b);
  } else if (p === 'inner') {
    set(['tl','tm'], ['Right'], borderStr);
    set(['ml','mm'], ['Right'], borderStr);
    set(['bl','bm'], ['Right'], borderStr);
    set(['tl','tm','tr'], ['Bottom'], borderStr);
    set(['ml','mm','mr'], ['Bottom'], borderStr);
  } else if (p === 'top') {
    set(['tl','tm','tr'], ['Top'], borderStr);
  } else if (p === 'bottom' || p === 'thick_bottom') {
    var b2 = p === 'thick_bottom' ? (cfg.thick + 2) + 'px ' + cfg.style + ' ' + cfg.color : borderStr;
    set(['bl','bm','br'], ['Bottom'], b2);
  } else if (p === 'left') {
    set(['tl','ml','bl'], ['Left'], borderStr);
  } else if (p === 'right') {
    set(['tr','mr','br'], ['Right'], borderStr);
  } else if (p === 'double') {
    ids.forEach(function(id) {
      var td = document.getElementById('pv-' + id);
      if (td) td.style.border = borderStr;
    });
    var inner = document.getElementById('pv-mm');
    if (inner) { inner.style.outline = '2px solid ' + cfg.color; inner.style.outlineOffset = '-2px'; }
  } else if (p === 'dashed') {
    ids.forEach(function(id) {
      var td = document.getElementById('pv-' + id);
      if (td) td.style.border = cfg.thick + 'px dashed ' + cfg.color;
    });
  }
}

// ── Apply borders to selected cells ───────────────────────────
function s4BorderApply() {
  var sel = Array.from(document.querySelectorAll('#s4-tbody td.s4-sel'));
  if (!sel.length) {
    // Try active cell
    var active = document.querySelector('#s4-tbody td.s4-active');
    if (active) sel = [active];
    else { s4FlashMsg('⚠ Chọn vùng ô trước rồi áp dụng!', false); return; }
  }

  var cfg = s4BorderGetSettings();
  var borderStr = cfg.thick + 'px ' + cfg.style + ' ' + cfg.color;

  // Build a 2D map of selected cells
  var selMap = {};
  var minR=999, maxR=0, minC=999, maxC=0;
  sel.forEach(function(td) {
    var r = parseInt(td.getAttribute('data-r'));
    var c = parseInt(td.getAttribute('data-c'));
    selMap[r+','+c] = td;
    if (r<minR) minR=r; if (r>maxR) maxR=r;
    if (c<minC) minC=c; if (c>maxC) maxC=c;
  });

  var isSelected = function(r, c) { return !!selMap[r+','+c]; };
  var p = cfg.preset;

  sel.forEach(function(td) {
    var r = parseInt(td.getAttribute('data-r'));
    var c = parseInt(td.getAttribute('data-c'));

    if (p === 'none') {
      td.style.borderTop = '';
      td.style.borderBottom = '';
      td.style.borderLeft = '';
      td.style.borderRight = '';
      return;
    }

    var applyTop=false, applyBottom=false, applyLeft=false, applyRight=false;

    if (p === 'all') {
      applyTop=applyBottom=applyLeft=applyRight=true;
    } else if (p === 'outer' || p === 'thick_outer') {
      applyTop    = (r === minR);
      applyBottom = (r === maxR);
      applyLeft   = (c === minC);
      applyRight  = (c === maxC);
    } else if (p === 'inner') {
      applyRight  = (c < maxC);
      applyBottom = (r < maxR);
    } else if (p === 'top') {
      applyTop = (r === minR);
    } else if (p === 'bottom' || p === 'thick_bottom') {
      applyBottom = (r === maxR);
    } else if (p === 'left') {
      applyLeft = (c === minC);
    } else if (p === 'right') {
      applyRight = (c === maxC);
    } else if (p === 'dashed') {
      applyTop=applyBottom=applyLeft=applyRight=true;
      borderStr = cfg.thick + 'px dashed ' + cfg.color;
    } else if (p === 'double') {
      applyTop=applyBottom=applyLeft=applyRight=true;
    }

    var b = borderStr;
    var bThick = (cfg.thick + 2) + 'px ' + cfg.style + ' ' + cfg.color;

    if (applyTop)    td.style.borderTop    = (p==='thick_outer' && r===minR) ? bThick : b;
    if (applyBottom) td.style.borderBottom = (p==='thick_outer' && r===maxR) ? bThick :
                                              (p==='thick_bottom' && r===maxR) ? bThick : b;
    if (applyLeft)   td.style.borderLeft   = (p==='thick_outer' && c===minC) ? bThick : b;
    if (applyRight)  td.style.borderRight  = (p==='thick_outer' && c===maxC) ? bThick : b;

    // Store in cell data for persistence
    var cid = td.getAttribute('data-cid');
    if (cid) {
      if (!window.s4CellBorders) window.s4CellBorders = {};
      if (!window.s4CellBorders[cid]) window.s4CellBorders[cid] = {};
      if (applyTop)    s4CellBorders[cid].top    = (p==='thick_outer' && r===minR) ? bThick : b;
      if (applyBottom) s4CellBorders[cid].bottom = (p==='thick_outer' && r===maxR) ? bThick : b;
      if (applyLeft)   s4CellBorders[cid].left   = (p==='thick_outer' && c===minC) ? bThick : b;
      if (applyRight)  s4CellBorders[cid].right  = (p==='thick_outer' && c===maxC) ? bThick : b;
    }
  });

  var count = sel.length;
  s4FlashMsg('✓ Đã kẻ viền ' + count + ' ô (' + s4BorderPresetName(p) + ')');
  s4BorderClose();
}

function s4BorderClear() {
  var sel = Array.from(document.querySelectorAll('#s4-tbody td.s4-sel'));
  if (!sel.length) {
    var active = document.querySelector('#s4-tbody td.s4-active');
    if (active) sel = [active];
  }
  sel.forEach(function(td) {
    td.style.borderTop = '';
    td.style.borderBottom = '';
    td.style.borderLeft = '';
    td.style.borderRight = '';
    var cid = td.getAttribute('data-cid');
    if (cid && window.s4CellBorders) delete s4CellBorders[cid];
  });
  s4FlashMsg('✓ Đã xóa viền ' + sel.length + ' ô');
  s4BorderClose();
}

function s4BorderPresetName(p) {
  var names = {
    all:'Tất cả',outer:'Viền ngoài',inner:'Viền trong',none:'Xóa',
    top:'Trên',bottom:'Dưới',left:'Trái',right:'Phải',
    thick_outer:'Ngoài dày',thick_bottom:'Dưới dày',dashed:'Đứt nét',double:'Đôi'
  };
  return names[p] || p;
}

// Restore borders after re-render
function s4RestoreBorders() {
  if (!window.s4CellBorders) return;
  Object.keys(s4CellBorders).forEach(function(cid) {
    var td = document.querySelector('#s4-tbody td[data-cid="'+cid+'"]');
    if (!td) return;
    var b = s4CellBorders[cid];
    if (b.top)    td.style.borderTop    = b.top;
    if (b.bottom) td.style.borderBottom = b.bottom;
    if (b.left)   td.style.borderLeft   = b.left;
    if (b.right)  td.style.borderRight  = b.right;
  });
}



/* ══ UNIVERSAL TABLE FULLSCREEN ═════════════════════════════════ */

var _ufsActiveCard = null;
var _ufsScrollY = 0;
var _ufsCardBtn = null;  // The button inside the card

function ufsInit() {
  // Inject fullscreen button into every .card-header
  document.querySelectorAll('.card').forEach(function(card, idx) {
    // Skip the pa-sxkd-wrapper (has its own fullscreen)
    if (card.closest('#pa-sxkd-wrapper')) return;
    // Skip cards without a table-wrap
    if (!card.querySelector('.table-wrap, table')) return;

    var header = card.querySelector('.card-header');
    if (!header) return;

    // Give card a unique ID if it doesn't have one
    if (!card.id) card.id = 'ufs-card-' + idx;

    // Inject hint strip before header (hidden until fullscreen)
    if (!card.querySelector('.ufs-hint')) {
      var hint = document.createElement('div');
      hint.className = 'ufs-hint';
      hint.title = 'Nhấn để thoát toàn màn hình (hoặc Esc)';
      hint.onclick = ufsClose;
      hint.textContent = '⛶ Đang xem toàn màn hình — Nhấn vào đây hoặc nhấn Esc để thu nhỏ';
      card.insertBefore(hint, card.firstChild);
    }

    // Inject optional search + print mini-toolbar
    if (!card.querySelector('.ufs-toolbar')) {
      var tb = document.createElement('div');
      tb.className = 'ufs-toolbar';
      tb.innerHTML =
        '<span style="font-size:11px;color:#556;font-weight:700;">🔍 Toàn màn hình</span>' +
        '<input type="text" placeholder="Tìm nhanh trong bảng..." oninput="ufsSearch(this)" ' +
        '  style="padding:4px 9px;border:1.5px solid #c8d8e8;border-radius:5px;font-size:12px;min-width:180px;">' +
        '<button onclick="ufsPrint()" style="padding:4px 10px;border-radius:5px;border:1px solid #c8d8e8;background:#fff;cursor:pointer;font-size:11.5px;font-weight:600;">🖨 In</button>' +
        '<button onclick="ufsCopy()" style="padding:4px 10px;border-radius:5px;border:1px solid #c8d8e8;background:#fff;cursor:pointer;font-size:11.5px;font-weight:600;">📋 Copy</button>' +
        '<span class="ufs-row-count" style="font-size:10.5px;color:#889;font-style:italic;margin-left:auto;"></span>';
      // Insert after card-header
      header.insertAdjacentElement('afterend', tb);
    }

    // Inject fullscreen button into header
    if (!header.querySelector('.tbl-fs-btn')) {
      // Make header flex if not already
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '8px';
      header.style.flexWrap = 'wrap';

      var btn = document.createElement('button');
      btn.className = 'tbl-fs-btn';
      btn.title = 'Xem toàn màn hình (phím tắt F hoặc double-click tiêu đề)';
      btn.innerHTML = '⛶ Toàn màn hình';
      btn.onclick = function(e) { e.stopPropagation(); ufsToggle(card); };
      header.appendChild(btn);

      // Double-click on h3 to also toggle
      var h3 = header.querySelector('h3');
      if (h3) {
        h3.style.cursor = 'pointer';
        h3.title = 'Double-click để xem toàn màn hình';
        h3.ondblclick = function() { ufsToggle(card); };
      }
    }
  });
}

function ufsToggle(card) {
  if (_ufsActiveCard && _ufsActiveCard === card) {
    ufsClose();
  } else if (_ufsActiveCard) {
    // Switch to another card
    ufsClose();
    setTimeout(function(){ ufsOpen(card); }, 50);
  } else {
    ufsOpen(card);
  }
}

function ufsOpen(card) {
  _ufsActiveCard = card;
  _ufsScrollY = window.scrollY;

  // Add fullscreen class
  card.classList.add('ufs-active');
  document.body.classList.add('ufs-open');
  document.body.style.overflow = 'hidden';

  // Show backdrop
  var bd = document.getElementById('ufs-backdrop');
  if (bd) bd.style.display = 'block';

  // Update button
  _ufsCardBtn = card.querySelector('.tbl-fs-btn');
  if (_ufsCardBtn) { _ufsCardBtn.innerHTML = '⛶ Thu nhỏ'; _ufsCardBtn.classList.add('active'); }

  // Count rows
  var rows = card.querySelectorAll('tbody tr');
  var countEl = card.querySelector('.ufs-row-count');
  if (countEl) countEl.textContent = rows.length + ' dòng';

  // Scroll card to top
  var wrap = card.querySelector('.table-wrap');
  if (wrap) wrap.scrollTop = 0;
}

function ufsClose() {
  if (!_ufsActiveCard) return;
  var card = _ufsActiveCard;
  _ufsActiveCard = null;

  card.classList.remove('ufs-active');
  document.body.classList.remove('ufs-open');
  document.body.style.overflow = '';

  // Hide backdrop
  var bd = document.getElementById('ufs-backdrop');
  if (bd) bd.style.display = 'none';

  // Restore button
  if (_ufsCardBtn) { _ufsCardBtn.innerHTML = '⛶ Toàn màn hình'; _ufsCardBtn.classList.remove('active'); }
  _ufsCardBtn = null;

  // Restore scroll position
  window.scrollTo(0, _ufsScrollY);

  // Clear search highlight
  ufsSearch({value:''});
}

// Quick search inside fullscreen table
function ufsSearch(inp) {
  if (!_ufsActiveCard) return;
  var q = inp.value.toLowerCase().trim();
  var rows = _ufsActiveCard.querySelectorAll('tbody tr');
  var vis = 0;
  rows.forEach(function(tr) {
    var text = tr.textContent.toLowerCase();
    var show = !q || text.includes(q);
    tr.style.display = show ? '' : 'none';
    if (show) vis++;
  });
  var countEl = _ufsActiveCard.querySelector('.ufs-row-count');
  if (countEl) countEl.textContent = (q ? vis + '/' : '') + rows.length + ' dòng';
}

function ufsPrint() {
  if (!_ufsActiveCard) return;
  var table = _ufsActiveCard.querySelector('table');
  if (!table) return;
  var win = window.open('', '_blank');
  // FIX GỐC RỄ (17/08/2026): dùng chung header chuẩn + bảng đã chuẩn hoá
  // (không icon, không cột checkbox/nút) => giống 2 đường in còn lại.
  var _title = (window.TD_PRINT && document.getElementById('page-title'))
    ? window.TD_PRINT.stripIcons(document.getElementById('page-title').textContent) : 'Bản in';
  var _tblHTML = (window.TD_PRINT ? window.TD_PRINT.sanitizeTable(table).outerHTML : table.outerHTML);
  var _hdr = window.ufsBuildPrintHeaderHTML ? window.ufsBuildPrintHeaderHTML(_title) : '';
  var _html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>In bảng</title><style>'
    + 'body{font-family:Arial,sans-serif;font-size:12px}'
    + 'table{border-collapse:collapse;width:100%}'
    + 'th,td{border:1px solid #888;padding:4px 8px;}'
    + 'thead th{background:#1a2540;color:#fff;}'
    + '.print-header{border-bottom:2px solid #000;padding:2px 0 8px;margin-bottom:10px}'
    + '.print-header .ph-branch{font-size:11pt;font-weight:700}'
    + '.print-header .ph-title{font-size:16pt;font-weight:800;text-align:center;text-transform:uppercase}'
    + '.print-header .ph-date{font-size:10.5pt;font-style:italic;text-align:center}'
    + '.qltd-preview-bar{position:sticky;top:0;background:#1a2540;padding:8px 14px;text-align:right;z-index:9}'
    + '.qltd-preview-bar button{background:#2e7d32;color:#fff;border:0;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}'
    + '.qltd-preview-bar button:hover{background:#1b5e20}'
    + '@media print{.qltd-preview-bar{display:none}}'
    + '</style></head><body>'
    + '<div class="qltd-preview-bar">🔎 Xem trước bản in — kiểm tra nội dung trước khi in &nbsp; <button onclick="window.print()">🖨️ In ngay</button></div>'
    + _hdr + _tblHTML + '</body></html>';
  win.document.open(); win.document.write(_html); win.document.close();
  // FIX (07/09/2026): không tự động gọi win.print() nữa — mở cửa sổ xem trước
  // để người dùng kiểm tra nội dung/bố cục trước, chỉ in khi bấm nút "🖨️ In ngay".
  try { win.focus(); } catch(e) {}
}

function ufsCopy() {
  if (!_ufsActiveCard) return;
  var rows = _ufsActiveCard.querySelectorAll('table tr:not([style*="display: none"])');
  var tsv = Array.from(rows).map(function(tr) {
    return Array.from(tr.querySelectorAll('th,td')).map(function(td) {
      return td.textContent.trim().replace(/\t/g,' ');
    }).join('\t');
  }).join('\n');
  navigator.clipboard.writeText(tsv).then(function(){
    var btn = _ufsActiveCard.querySelector('.ufs-toolbar button:last-of-type');
    if(btn){ var o=btn.innerHTML; btn.innerHTML='✅ Đã copy!'; setTimeout(function(){btn.innerHTML=o;},1500); }
  }).catch(function(){
    var ta=document.createElement('textarea'); ta.value=tsv;
    ta.style.cssText='position:fixed;top:-999px;'; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  });
}

// ESC key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _ufsActiveCard) ufsClose();
  // F key shortcut to toggle fullscreen on hovered card
  if (e.key === 'f' || e.key === 'F') {
    if (_ufsActiveCard) { ufsClose(); return; }
    var hovered = document.querySelector('.card:hover');
    if (hovered && !hovered.closest('#pa-sxkd-wrapper') && !e.target.matches('input,textarea,select')) {
      ufsToggle(hovered);
    }
  }
});

// Resize: keep table wrap height correct
window.addEventListener('resize', function() {
  // Nothing needed — CSS handles 100vh naturally
});

// Init after DOM ready (or after other inits)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ufsInit);
} else {
  setTimeout(ufsInit, 600);  // P1-4 FIX: 300→600ms đồng bộ với chain recalc
}
// Re-init when pages switch (showPage call) — HM-13b: qua TD.onShowPage
TD.onShowPage(function () { setTimeout(ufsInit, 200); });

