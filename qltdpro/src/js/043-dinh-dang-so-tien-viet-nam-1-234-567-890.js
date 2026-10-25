
/* ════════════════════════════════════════════════════════
   QLTD PRO v2 — EXPORT EXCEL FUNCTIONS
   Sử dụng SheetJS (XLSX) — tự động lazy-load nếu cần
   ════════════════════════════════════════════════════════ */

/* Định dạng số tiền Việt Nam (1.234.567.890) */
function fmtMoneyExport(v) {
  var n = parseFloat(String(v||'0').replace(/\./g,'').replace(',','.'));
  if (isNaN(n) || n === 0) return 0;
  return n;
}

/* Lazy-load SheetJS nếu chưa có */
function _ensureXLSX() {
  /* OFFLINE: XLSX bundled inline */
  if (typeof XLSX !== 'undefined') return Promise.resolve(XLSX);
  return Promise.reject(new Error('XLSX không có sẵn (bundle offline lỗi)'));
}

/* Tạo style cho cell header trong XLSX */
function _xlsxHeaderStyle() {
  return {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '1A2540' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'AAAAAA' } },
      bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
      left: { style: 'thin', color: { rgb: 'AAAAAA' } },
      right: { style: 'thin', color: { rgb: 'AAAAAA' } }
    }
  };
}

/*
 * exportQltdExcel() — Xuất bảng QLTD chính ra Excel
 * Gồm 3 sheet: Tất cả | KD (Ngắn hạn) | TD (Trung/Dài hạn)
 */
async function exportQltdExcel() {
  var btn = document.querySelector('.btn-excel[onclick*="exportQltdExcel"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xuất...'; }
  try {
    await _ensureXLSX();
  } catch(e) {
    alert('❌ Không tải được thư viện XLSX.\nCần kết nối internet để xuất Excel.');
    if (btn) { btn.disabled = false; btn.textContent = '📊 Xuất Excel'; }
    return;
  }

  var COLS_QLTD = [
    {label:'STT',       w:5},
    {label:'Mã KH',     w:16},
    {label:'Tên khách hàng', w:28},
    {label:'Số HĐTD',   w:22},
    {label:'Ngày HĐ',   w:13},
    {label:'Ngày ĐH',   w:13},
    {label:'HMTD (đ)',  w:18},
    {label:'Ngày GN',   w:13},
    {label:'Ngày trả nợ', w:13},
    {label:'L/S %',     w:8},
    {label:'Số tiền GN (đ)', w:18},
    {label:'Tiền lãi (đ)',   w:18},
    {label:'Dư nợ (đ)',      w:18},
    {label:'CBTD',      w:18},
    {label:'Loại vay',  w:16},
    {label:'Địa chỉ',  w:30},
    {label:'Mục đích',  w:25},
    {label:'Gốc trả (đ)', w:16},
    {label:'Phòng ban', w:14},
    {label:'Nhóm nợ',  w:10},
    {label:'Số HS',    w:10},
    {label:'Số TK',    w:18},
    {label:'Số tập',   w:8}
  ];

  var allData = (window.DATA && DATA.qltd) ? DATA.qltd : [];
  var today = new Date();
  var dateStr = ('0'+today.getDate()).slice(-2) + '/'
             + ('0'+(today.getMonth()+1)).slice(-2) + '/'
             + today.getFullYear();

  function buildSheet(rows, title) {
    var headerRow = COLS_QLTD.map(function(c){ return c.label; });
    var dataRows = rows.map(function(r, i) {
      return [
        i+1,
        r[0]||'',   // Mã KH
        r[1]||'',   // Tên KH
        r[2]||'',   // Số HĐTD
        r[3]||'',   // Ngày HĐ
        r[4]||'',   // Ngày ĐH
        fmtMoneyExport(r[5]),  // HMTD
        r[6]||'',   // Ngày GN
        r[7]||'',   // Ngày trả nợ
        parseFloat(r[8])||0,   // L/S %
        fmtMoneyExport(r[9]),  // Số tiền GN
        fmtMoneyExport(r[10]), // Tiền lãi
        fmtMoneyExport(r[11]), // Dư nợ
        r[12]||'',  // CBTD
        r[13]||'',  // Loại vay
        r[14]||'',  // Địa chỉ
        r[15]||'',  // Mục đích
        fmtMoneyExport(r[16]), // Gốc trả
        r[17]||'',  // Phòng ban
        r[18]||'',  // Nhóm nợ
        r[19]||'',  // Số HS
        r[21]||'',  // Số TK
        r[22]||''   // Số tập
      ];
    });

    // Tính dòng tổng cộng
    var totalDuNo    = rows.reduce(function(s,r){ return s+fmtMoneyExport(r[11]); }, 0);
    var totalGN      = rows.reduce(function(s,r){ return s+fmtMoneyExport(r[9]);  }, 0);
    var totalLai     = rows.reduce(function(s,r){ return s+fmtMoneyExport(r[10]); }, 0);
    var totalGocTra  = rows.reduce(function(s,r){ return s+fmtMoneyExport(r[16]); }, 0);

    var sumRow = new Array(COLS_QLTD.length).fill('');
    sumRow[0]  = 'TỔNG CỘNG';
    sumRow[2]  = rows.length + ' khách hàng';
    sumRow[6]  = '';
    sumRow[10] = totalGN;
    sumRow[11] = totalLai;
    sumRow[12] = totalDuNo;
    sumRow[17] = totalGocTra;

    var aoa = [
      ['AGRIBANK NAM ĐỊNH — PHÒNG KHKD'],
      [title],
      ['Ngày xuất: ' + dateStr, '', '', '', 'Tổng KH: ' + rows.length, '', '', '', '', '', '', '', 'Tổng dư nợ: ' + totalDuNo.toLocaleString('vi-VN') + ' đ'],
      [],
      headerRow
    ].concat(dataRows).concat([sumRow]);

    var ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set column widths
    ws['!cols'] = COLS_QLTD.map(function(c){ return { wch: c.w }; });

    // Merge title cells
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:COLS_QLTD.length-1} },
      { s:{r:1,c:0}, e:{r:1,c:COLS_QLTD.length-1} }
    ];

    // Freeze panes (row 5 = header, col 3 = Tên KH)
    ws['!freeze'] = { xSplit:3, ySplit:5 };

    return ws;
  }

  var wb = XLSX.utils.book_new();

  // Sheet 1: Tất cả
  XLSX.utils.book_append_sheet(wb, buildSheet(allData, 'BẢNG THEO DÕI TÍN DỤNG — TẤT CẢ'), 'Tất cả');

  // Sheet 2: Ngắn hạn (KD)
  var kdRows = allData.filter(function(r){
    var lv = String(r[13]||'').toLowerCase();
    return lv.includes('ngắn') || lv.includes('thấu chi');
  });
  XLSX.utils.book_append_sheet(wb, buildSheet(kdRows, 'NGẮN HẠN & THẤU CHI (TK 211)'), 'Ngắn hạn - TK211');

  // Sheet 3: Trung/Dài hạn (TD)
  var tdRows = allData.filter(function(r){
    var lv = String(r[13]||'').toLowerCase();
    return lv.includes('trung') || lv.includes('dài');
  });
  XLSX.utils.book_append_sheet(wb, buildSheet(tdRows, 'TRUNG HẠN & DÀI HẠN (TK 212-213)'), 'Trung-Dài hạn');

  // Sheet 4: Thống kê theo CBTD
  var cbtdMap = {};
  allData.forEach(function(r) {
    var cbtd = r[12]||'Không rõ';
    if (!cbtdMap[cbtd]) cbtdMap[cbtd] = { hs:0, duNo:0, gn:0, lai:0 };
    cbtdMap[cbtd].hs++;
    cbtdMap[cbtd].duNo += fmtMoneyExport(r[11]);
    cbtdMap[cbtd].gn   += fmtMoneyExport(r[9]);
    cbtdMap[cbtd].lai  += fmtMoneyExport(r[10]);
  });
  var cbtdAoa = [
    ['THỐNG KÊ THEO CÁN BỘ TÍN DỤNG'],
    ['Ngày xuất: '+dateStr],
    [],
    ['CBTD','Số hồ sơ','Dư nợ (đ)','Số tiền GN (đ)','Tiền lãi (đ)']
  ];
  Object.entries(cbtdMap).sort(function(a,b){ return b[1].duNo - a[1].duNo; }).forEach(function(e) {
    cbtdAoa.push([e[0], e[1].hs, e[1].duNo, e[1].gn, e[1].lai]);
  });
  var wsCbtd = XLSX.utils.aoa_to_sheet(cbtdAoa);
  wsCbtd['!cols'] = [{wch:22},{wch:10},{wch:20},{wch:20},{wch:18}];
  XLSX.utils.book_append_sheet(wb, wsCbtd, 'Thống kê CBTD');

  // Xuất file
  var filename = 'QLTD_' + dateStr.replace(/\//g,'-') + '.xlsx';
  XLSX.writeFile(wb, filename);

  if (btn) { btn.disabled = false; btn.textContent = '📊 Xuất Excel'; }
  showToast('✅ Đã xuất Excel: ' + filename, 'success');
}
/* HM-13b: đã gỡ bộ phím Ctrl+E cũ — Ctrl+E do TD.keys (HM-15) xử lý theo trang */


/*
 * exportTableExcel(key, title) — Xuất các bảng phụ (Đến hạn, Lãi đọng, Phí GN)
 */
async function exportTableExcel(key, title) {
  try {
    await _ensureXLSX();
  } catch(e) {
    alert('❌ Không tải được thư viện XLSX.\nCần kết nối internet.');
    return;
  }

  var tbody = document.getElementById('tbody-' + key);
  if (!tbody) {
    alert('Không tìm thấy bảng dữ liệu!');
    return;
  }

  var today = new Date();
  var dateStr = ('0'+today.getDate()).slice(-2) + '/'
             + ('0'+(today.getMonth()+1)).slice(-2) + '/'
             + today.getFullYear();

  // Lấy header từ thead
  var thead = tbody.closest('table') && tbody.closest('table').querySelector('thead');
  var headers = [];
  if (thead) {
    var ths = thead.querySelectorAll('th');
    ths.forEach(function(th) { headers.push(th.textContent.trim()); });
  }

  /* P10: bảng đã phân trang (HM-17b/P09) ⇒ trước đây chỉ xuất trang đang xem + dòng thanh trang. Dựng tạm đủ mọi dòng, đọc, rồi trả lại trang cũ */
  var __pgSt = window.__TD_PG && window.__TD_PG[key], __pgOld = null;
  if (__pgSt && __pgSt.size > 0 && tbody.querySelector('tr.td-pg-bar')) {
    __pgOld = { size: __pgSt.size, page: __pgSt.page };
    __pgSt.size = 0; window.__TD_NODEFER = true;
    try { renderTable(key); } catch (e) {} finally { window.__TD_NODEFER = false; }
    tbody = document.getElementById('tbody-' + key) || tbody;
  }
  // Lấy data từ tbody (bỏ qua các dòng tổng cộng)
  var dataRows = [];
  tbody.querySelectorAll('tr').forEach(function(tr) {
    if (tr.classList.contains('tfoot-row') || tr.classList.contains('total-row') || tr.classList.contains('td-pg-bar')) return;
    var cells = [];
    tr.querySelectorAll('td').forEach(function(td) {
      var input = td.querySelector('input');
      var txt = input ? input.value : td.textContent.trim();
      // Cố gắng parse số tiền
      var num = parseFloat(txt.replace(/\./g,'').replace(',','.'));
      cells.push(isNaN(num) ? txt : num);
    });
    if (cells.some(function(c){ return c !== ''; })) dataRows.push(cells);
  });
  if (__pgOld) { __pgSt.size = __pgOld.size; __pgSt.page = __pgOld.page; try { renderTable(key); } catch (e) {} }

  var aoa = [
    ['AGRIBANK NAM ĐỊNH — PHÒNG KHKD'],
    ['BẢNG ' + title.toUpperCase()],
    ['Ngày xuất: ' + dateStr, '', '', 'Số dòng: ' + dataRows.length],
    [],
    headers
  ].concat(dataRows);

  var ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto column widths
  var colWidths = [];
  aoa.forEach(function(row) {
    row.forEach(function(cell, i) {
      var len = String(cell||'').length;
      if (!colWidths[i] || colWidths[i] < len) colWidths[i] = len;
    });
  });
  ws['!cols'] = colWidths.map(function(w){ return { wch: Math.min(Math.max(w, 8), 40) }; });

  if (headers.length > 1) {
    ws['!merges'] = [
      { s:{r:0,c:0}, e:{r:0,c:headers.length-1} },
      { s:{r:1,c:0}, e:{r:1,c:headers.length-1} }
    ];
  }

  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));

  var filename = title.replace(/\s+/g,'_') + '_' + dateStr.replace(/\//g,'-') + '.xlsx';
  XLSX.writeFile(wb, filename);
  showToast('✅ Đã xuất Excel: ' + filename, 'success');
}

/* ── Toast notification helper ── */
/* HM-16c: MỘT hệ thông báo (toast). Mọi nơi gọi showToast(msg, loại) / TDUP.toast(msg, {action}) / toast phím tắt đều đi qua TD.toast.
   loại: success|green · error|red · warn|orange|gold · info|blue|'' ; opt: {type, duration(ms; 0 = giữ đến khi close()), action:{label,onClick}} ; trả {el, close()} */
(function () {
  var TD = window.TD = window.TD || {};
  var TYPES = { success: 'success', green: 'success', ok: 'success', error: 'error', red: 'error', danger: 'error', warn: 'warn', warning: 'warn', orange: 'warn', gold: 'warn', yellow: 'warn', info: 'info', blue: 'info', '': 'info' };
  function stack() {
    var c = document.getElementById('td-toasts');
    if (!c) { c = document.createElement('div'); c.id = 'td-toasts'; c.className = 'no-print'; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite'); (document.body || document.documentElement).appendChild(c); }
    return c;
  }
  TD.toast = function (msg, opt) {
    if (opt == null || typeof opt === 'string') opt = { type: opt };
    var t = TYPES[String(opt.type || '').toLowerCase()] || 'info', el = document.createElement('div'), done = false, timer;
    el.className = 'td-toast td-toast-' + t; el.appendChild(document.createTextNode(String(msg == null ? '' : msg)));
    function close() { if (done) return; done = true; clearTimeout(timer); el.classList.add('td-toast-out'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220); }
    if (opt.action) { var b = document.createElement('button'); b.type = 'button'; b.textContent = opt.action.label || 'Hoàn tác'; b.onclick = function () { try { opt.action.onClick && opt.action.onClick(); } finally { close(); } }; el.appendChild(b); }
    var st = stack(); st.appendChild(el); while (st.children.length > 5) st.removeChild(st.firstChild);
    var ms = opt.duration != null ? opt.duration : (opt.action ? 6000 : (t === 'error' ? 5000 : 3200));
    if (ms > 0) timer = setTimeout(close, ms);
    return { el: el, close: close };
  };
})();
function showToast(msg, type) { return TD.toast(msg, type); }
