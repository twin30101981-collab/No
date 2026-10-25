/* HM-08: engine KPI duy nhất TD.metrics — hàm thuần (không đọc DOM/DATA), nhúng nguyên văn vào app và được Node nạp để kiểm thử.
   Cột dòng dư nợ: 0 mã KH · 1 tên · 2 số HĐ · 5 HMTD · 7 ngày đến hạn · 10 lãi · 11 dư nợ · 12 CBTD · 13 loại vay · 17 phòng ban · 18 nhóm nợ.
   Bất biến: Σ theo loại vay = Σ theo nhóm nợ = Σ theo phòng ban = tổng dư nợ (không bao giờ rơi khoản vào "khoảng trống"). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var M = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  var NHOM_LIST = ['Nhóm 1', 'Nhóm 2', 'Nhóm 3', 'Nhóm 4', 'Nhóm 5'];
  var NHOM_UNKNOWN = 'Không rõ nhóm';
  M.NHOM_LIST = NHOM_LIST; M.NHOM_UNKNOWN = NHOM_UNKNOWN;

  /* mã KH: theo mã nếu có, không thì theo tên chuẩn hoá */
  M.customerKey = function (r) {
    var ma = String(r && r[0] != null ? r[0] : '').trim();
    var ten = String(r && r[1] != null ? r[1] : '').trim().replace(/\s+/g, ' ').toUpperCase();
    return ma ? 'M:' + ma : (ten ? 'N:' + ten : '');
  };
  /* đếm KH có tổng dư nợ > 0 */
  M.countCustomers = function (rows) {
    var m = new Map();
    rows.forEach(function (r) { var k = M.customerKey(r); if (k) m.set(k, (m.get(k) || 0) + n(r[11])); });
    var c = 0; m.forEach(function (v) { if (v > 0) c++; }); return c;
  };
  /* loại vay: thấu chi > ngắn > trung > dài > khác. Mỗi dòng đúng MỘT loại (bản cũ đếm 2 lần "trung và dài hạn"). */
  M.classifyLoai = function (v) {
    v = String(v == null ? '' : v);
    if (/thấu\s*chi/i.test(v)) return 'thauchi';
    if (/ngắn\s*hạn/i.test(v)) return 'nganhan';
    if (/trung\s*hạn/i.test(v)) return 'trunghan';
    if (/dài\s*hạn/i.test(v)) return 'daihan';
    return 'khac';
  };
  M.LOAI = [
    { key: 'nganhan', name: 'Vay ngắn hạn (TK 211)' }, { key: 'trunghan', name: 'Vay trung hạn (TK 212)' },
    { key: 'daihan', name: 'Vay dài hạn (TK 213)' }, { key: 'thauchi', name: 'Thấu chi' }, { key: 'khac', name: 'Khác (chưa phân loại)' }];
  /* nhóm nợ: lấy chữ số 1–5 ("Nhóm 3", "3", "N3"); trống/lạ ⇒ "Không rõ nhóm" (bản cũ mặc định "Nhóm 1" và bỏ rơi nhóm lạ) */
  M.nhomRank = function (v) { var m = /\d+/.exec(String(v == null ? '' : v)); return m ? parseInt(m[0], 10) : 0; };
  M.normNhom = function (v) { var k = M.nhomRank(v); return (k >= 1 && k <= 5) ? 'Nhóm ' + k : NHOM_UNKNOWN; };

  function group(rows, keyFn, init) {
    var m = new Map();
    rows.forEach(function (r) {
      var k = keyFn(r), g = m.get(k);
      if (!g) { g = { key: k, rows: [], hs: 0, duno: 0, hmtd: 0, lai: 0, _kh: new Set() }; if (init) init(g, r); m.set(k, g); }
      g.rows.push(r); g.hs++; g.duno += n(r[11]); g.hmtd += n(r[5]); g.lai += n(r[10]);
      var ck = M.customerKey(r); if (ck) g._kh.add(ck);
    });
    return m;
  }
  function fin(g) { g.kh = g._kh.size; delete g._kh; return g; }

  /* summarize(rows, opt): rows = các dòng dư nợ thực tế (đã lọc); opt.today (Date 00:00), opt.pastDue (map key→{duNoQH,laiQH,cleared,...}),
     opt.pdKey(r), opt.parseDate(s). Trả: totals, byLoai (đủ 5 loại), byNhom (5 nhóm + Không rõ nhóm), byPB, byCBTD, duehan, overdue. */
  M.summarize = function (rows, opt) {
    opt = opt || {};
    var parse = opt.parseDate || (root.TD && root.TD.date && root.TD.date.parse) || function () { return null; };
    var today = opt.today || (function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
    var pd = opt.pastDue || {}, pdKey = opt.pdKey || function (r) { return String(r[0] || '').replace(/\D/g, '') + '|' + String(r[2] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(); };
    var out = { rows: rows };
    out.totals = { hs: rows.length, kh: M.countCustomers(rows), duno: 0, lai: 0, hmtd: 0 };
    rows.forEach(function (r) { out.totals.duno += n(r[11]); out.totals.lai += n(r[10]); out.totals.hmtd += n(r[5]); });

    var lm = group(rows, function (r) { return M.classifyLoai(r[13]); });
    out.byLoai = M.LOAI.map(function (d) { var g = lm.get(d.key) || { key: d.key, rows: [], hs: 0, duno: 0, hmtd: 0, lai: 0, _kh: new Set() }; g.name = d.name; return fin(g); });

    var nm = group(rows, function (r) { return M.normNhom(r[18]); });
    out.byNhom = NHOM_LIST.concat([NHOM_UNKNOWN]).map(function (k) { var g = nm.get(k) || { key: k, rows: [], hs: 0, duno: 0, hmtd: 0, lai: 0, _kh: new Set() }; return fin(g); });

    var pm = group(rows, function (r) { return r[17] || '(Chưa phân loại)'; });
    out.byPB = Array.from(pm.values()).map(fin);
    var cm = group(rows, function (r) { return r[12] || '(Chưa phân công)'; }, function (g, r) { g.pb = r[17] || ''; });
    out.byCBTD = Array.from(cm.values()).map(fin);

    /* đến hạn trong tháng của ngày tính + quá hạn (hợp nhất với past-due IPCAS, khử trùng theo HĐTD) */
    var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    out.duehan = rows.filter(function (r) { var d = parse(r[7]); return d && d >= monthStart && d <= today && n(r[11]) > 0; });
    var raw = rows.filter(function (r) {
      var p = pd[pdKey(r)];
      if (p) { if (p.cleared) return false; return n(p.duNoQH) > 0 || n(p.laiQH) > 0; }
      var d = parse(r[7]); return !!(d && d < today && n(r[11]) > 0);
    });
    var om = new Map();
    raw.forEach(function (r) {
      var k = pdKey(r);
      if (!om.has(k)) om.set(k, r.slice());
      else if (!pd[k]) { var a = om.get(k); a[11] = n(a[11]) + n(r[11]); a[10] = n(a[10]) + n(r[10]); }
    });
    out.overdue = Array.from(om.values());
    out.duehanDN = out.duehan.reduce(function (s, r) { return s + n(r[11]); }, 0);
    out.overdueDN = out.overdue.reduce(function (s, r) { var p = pd[pdKey(r)]; return s + (p && p.duNoQH != null ? n(p.duNoQH) : n(r[11])); }, 0);
    return out;
  };
  /* check(summary): bất biến cân đối; trả danh sách lỗi (rỗng = đạt) */
  M.check = function (S) {
    var e = [], t = S.totals.duno, sum = function (a) { return a.reduce(function (s, g) { return s + g.duno; }, 0); };
    ['byLoai', 'byNhom', 'byPB', 'byCBTD'].forEach(function (k) { if (Math.abs(sum(S[k]) - t) > 0.5) e.push(k + ': Σ=' + sum(S[k]) + ' ≠ tổng ' + t); });
    ['byLoai', 'byNhom', 'byPB'].forEach(function (k) { var h = S[k].reduce(function (s, g) { return s + g.hs; }, 0); if (h !== S.totals.hs) e.push(k + ': Σ hồ sơ ' + h + ' ≠ ' + S.totals.hs); });
    return e;
  };
  TD.metrics = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
