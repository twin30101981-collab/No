/* HM-23: Trung tâm nhập dữ liệu TD.hub — hàm thuần: nhận dạng loại tệp, lập kế hoạch nhập nhiều tệp (theo ngày), kiểm tra quy tắc. Nhúng nguyên văn + Node test. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var H = {};
  /* kind(name): 'tsbd' nếu tên gợi ý sao kê tài sản bảo đảm, ngược lại 'duno' (dư nợ msit80). Phần mở rộng không hợp lệ ⇒ 'bo-qua'. */
  H.kind = function (name) {
    var n = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    if (!/\.(xls|xlsx|xlsm|csv)$/.test(n)) return 'bo-qua';
    if (/(tai san|taisan|tsbd|sao ke|saoke|collateral)/.test(n)) return 'tsbd';
    return 'duno';
  };
  /* sniffKind(hdrRow): nhận dạng theo TIÊU ĐỀ cột (hàng đầu): sao kê TSBĐ IPCAS có clno + clcustno/plgcustno ⇒ 'tsbd'; không nhận ra ⇒ null (giữ kết quả theo tên tệp). P07 */
  H.sniffKind = function (hdr) {
    var h = (hdr || []).map(function (x) { return String(x == null ? '' : x).trim().toLowerCase(); });
    return h.indexOf('clno') >= 0 && (h.indexOf('clcustno') >= 0 || h.indexOf('plgcustno') >= 0) ? 'tsbd' : null;
  };
  var parseVn = function (s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  /* plan(files, dateOf): dateOf(name) → 'dd/mm/yyyy'|null. Dư nợ nhập theo ngày TĂNG (tệp cuối = mới nhất sẽ là dữ liệu hiện hành);
     chỉ nhập tệp TSBĐ MỚI NHẤT; bỏ tệp trùng (cùng loại + cùng ngày); trả kèm cảnh báo. */
  H.plan = function (files, dateOf) {
    var items = (files || []).map(function (f, i) { var k0 = H.kind(f.name), k = k0 === 'bo-qua' ? k0 : (f.kind || k0), d = k === 'bo-qua' ? null : dateOf(f.name); return { idx: i, name: f.name, size: f.size, kind: k, date: d, warn: [], skip: null, exclude: !!f.exclude }; });
    var seen = {};
    items.forEach(function (it) {
      if (it.kind === 'bo-qua') { it.skip = 'Định dạng không hỗ trợ'; return; }
      if (it.exclude) { it.skip = 'Đã loại khỏi lần nhập (theo lựa chọn)'; return; } // P08: tệp bị loại không tham gia chống trùng / chọn TSBĐ mới nhất
      var key = it.kind + '|' + (it.date || it.name);
      if (seen[key]) { it.skip = 'Trùng loại + ngày với "' + seen[key] + '"'; return; } seen[key] = it.name;
      if (!it.date) it.warn.push('Tên tệp không có ngày ⇒ dùng hôm nay làm ngày dữ liệu');
    });
    var ts = items.filter(function (x) { return x.kind === 'tsbd' && !x.skip; }).sort(function (a, b) { return (parseVn(a.date) || 0) - (parseVn(b.date) || 0); });
    ts.slice(0, -1).forEach(function (x) { x.skip = 'Chỉ nhập sao kê TSBĐ mới nhất (' + ts[ts.length - 1].name + ')'; });
    var dn = items.filter(function (x) { return x.kind === 'duno' && !x.skip; }).sort(function (a, b) { var da = parseVn(a.date), db = parseVn(b.date); return (da ? +da : Infinity) - (db ? +db : Infinity); });
    var last = dn.length ? dn[dn.length - 1] : null, tsLast = ts.length ? ts[ts.length - 1] : null;
    if (last && tsLast && last.date && tsLast.date && parseVn(tsLast.date) < parseVn(last.date)) tsLast.warn.push('Sao kê TSBĐ (' + tsLast.date + ') cũ hơn dư nợ mới nhất (' + last.date + ')');
    var order = dn.concat(ts.filter(function (x) { return !x.skip; })); order.forEach(function (x, i) { x.order = i + 1; });
    return { items: items, order: order, nImport: order.length, nSkip: items.filter(function (x) { return x.skip; }).length };
  };
  H.fmtBytes = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  H.hex = function (buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2); return s; };
  TD.hub = H;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
