/* P10 (T3/T4): TD.xlsrows — đọc Excel thành mảng dòng (đọc dense, nhánh cứu lãi suất theo mảng) + nén LZ, chạy được trong Web Worker tạo từ blob
   (mở bằng file:// vẫn chạy). Hàm thuần; người gọi tự chạy lại trên luồng chính khi worker lỗi. Nhúng nguyên văn + Node test. */
(function tdXlsRowsModule(root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var X = {};
  X.iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  X.DATE_MIN = 32874; // serial Excel của 01/01/1990: ô định dạng ngày nhỏ hơn ⇒ chắc chắn là số (lãi suất, tỉ lệ) bị định dạng ngày
  /* dateCell(v, SSF): ô SỐ mang định dạng ngày. Ngày thật ⇒ ISO (YYYY-MM-DD, tách từ serial — không phụ thuộc múi giờ; không mơ hồ ngày/tháng khi
     transformIPCAS chuẩn hoá lần 2). serial < 1990 ⇒ trả NGUYÊN số gốc (HM-03 / v13.7.7-LS#1: 8,5 hiện "08/01/1900" vẫn là 8.5 — bản cũ đọc qua
     cellDates trả "8", 0,1 trả "31"). */
  X.dateCell = function (v, SSF) {
    if (!isFinite(v) || v < X.DATE_MIN) return String(v);
    var p = SSF.parse_date_code(v);
    return p.y + '-' + ('0' + p.m).slice(-2) + '-' + ('0' + p.d).slice(-2);
  };
  /* ipcasRows(XLSX, buf, dense): tệp dư nợ IPCAS → mảng dòng chuỗi (mọi dòng của vùng dữ liệu, đủ cột, ô trống = ''). Tự dựng dòng từ ô
     (sheet_to_json luôn đổi ô số-định-dạng-ngày thành Date nên mất số gốc). dense=true: ô ở ws['!data'][r][c] — nhanh hơn, đầu ra y hệt. */
  X.ipcasRows = function (XLSX, buf, dense) {
    var wb = XLSX.read(buf, { type: 'array', cellDates: false, cellNF: true, cellText: false, raw: true, dense: !!dense });
    var sn = wb.SheetNames[0];
    if (!sn) throw new Error('File .xls không có sheet nào');
    var ws = wb.Sheets[sn], SSF = XLSX.SSF, D = ws['!data'];
    if (!ws['!ref']) return [];
    var rg = XLSX.utils.decode_range(ws['!ref']), out = [], cols = [];
    for (var C = rg.s.c; C <= rg.e.c; ++C) cols.push(XLSX.utils.encode_col(C));
    for (var R = rg.s.r; R <= rg.e.r; ++R) {
      var row = [], dr = D ? (D[R] || []) : null, rn = String(R + 1);
      for (var j = 0; j < cols.length; ++j) {
        var c = dr ? dr[rg.s.c + j] : ws[cols[j] + rn], v = c ? c.v : null;
        if (!c || c.t === undefined || c.t === 'z' || c.t === 'e' || v == null) row.push('');
        else if (c.t === 'n' && c.z && SSF.is_date(c.z)) row.push(X.dateCell(v, SSF));
        else if (v instanceof Date) row.push(isNaN(v) ? String(v) : v.getFullYear() < 1990 ? String(v.getDate()) : X.iso(v));
        else row.push(String(v).trim());
      }
      out.push(row);
    }
    return out;
  };
  /* aoa(XLSX, buf): trang đầu → mảng dòng giá trị thô (sao kê TSBĐ; ngày là Date) */
  X.aoa = function (XLSX, buf) {
    var wb = XLSX.read(buf, { type: 'array', cellDates: true, dense: true, cellText: false });
    var sh = wb.Sheets[wb.SheetNames[0]];
    if (!sh) throw new Error('Tệp không có sheet nào');
    return XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: '' });
  };
  /* head(XLSX, buf, o): chỉ đọc o.rows dòng đầu của trang đầu (nhận dạng loại tệp theo tiêu đề, xem trước). o.raw (mặc định true), o.defval. Trả { sheet, rows } */
  X.head = function (XLSX, buf, o) {
    o = o || {};
    var wb = XLSX.read(buf, { type: 'array', sheetRows: o.rows || 2, dense: true, cellText: false }), sn = wb.SheetNames[0], ws = wb.Sheets[sn];
    var opt = { header: 1, raw: o.raw !== false }; if (o.defval !== undefined) opt.defval = o.defval;
    return { sheet: sn || '', rows: ws ? XLSX.utils.sheet_to_json(ws, opt) : [] };
  };
  /* serve(self, XLSX, LZS): vòng nhận việc trong worker. Thư: {id, op:'ipcas'|'aoa'|'lz', buf|strs} ⇒ {id, ok, out|err} */
  X.serve = function (self, XLSX, LZS) {
    self.onmessage = function (e) {
      var m = e.data || {}, out;
      try {
        if (m.op === 'ipcas') out = X.ipcasRows(XLSX, m.buf, true);
        else if (m.op === 'aoa') out = X.aoa(XLSX, m.buf);
        else if (m.op === 'head') out = X.head(XLSX, m.buf, m.o);
        else if (m.op === 'lz') out = m.strs.map(function (s) { return LZS.compressToBase64(s); });
        else if (m.op === 'ping') out = !!XLSX && !!LZS;
        else throw new Error('op lạ: ' + m.op);
        self.postMessage({ id: m.id, ok: true, out: out });
      } catch (err) { self.postMessage({ id: m.id, ok: false, err: String(err && err.message || err) }); }
    };
  };
  /* workerSource(mã SheetJS, mã hàm tạo LZS): toàn bộ mã của worker (một blob, không tải gì từ mạng/đĩa) */
  X.workerSource = function (xlsxSrc, lzsFactorySrc) {
    return xlsxSrc + '\n;var LZS = (' + lzsFactorySrc + ')();\n(' + tdXlsRowsModule.toString() + ')(self);\nself.TD.xlsrows.serve(self, self.XLSX, LZS);\n';
  };
  /* client(makeWorker): gửi việc tới MỘT worker (tạo lần đầu dùng). Không tạo được / worker chết ⇒ mọi lời gọi bị từ chối (người gọi chạy luồng chính). */
  X.client = function (makeWorker) {
    var w = null, dead = false, seq = 0, wait = {}, C = { calls: 0, done: 0 };
    function failAll(msg) { dead = true; var ids = Object.keys(wait); ids.forEach(function (id) { var p = wait[id]; delete wait[id]; p.rej(new Error(msg)); }); try { if (w) w.terminate(); } catch (e) {} w = null; }
    function get() {
      if (w || dead) return w;
      try {
        w = makeWorker();
        w.onmessage = function (e) { var d = e.data || {}, p = wait[d.id]; if (!p) return; delete wait[d.id]; C.done++; if (d.ok) p.res(d.out); else p.rej(new Error(d.err)); };
        w.onerror = function (e) { try { e.preventDefault(); } catch (x) {} failAll('worker lỗi: ' + (e && e.message || '')); };
      } catch (e) { dead = true; w = null; }
      return w;
    }
    C.call = function (op, data, transfer) {
      var ww = get();
      if (!ww) return Promise.reject(new Error('no-worker'));
      return new Promise(function (res, rej) { var id = ++seq; wait[id] = { res: res, rej: rej }; data = data || {}; data.op = op; data.id = id; C.calls++; ww.postMessage(data, transfer || []); });
    };
    C.alive = function () { return !dead; };
    return C;
  };
  TD.xlsrows = X;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));
