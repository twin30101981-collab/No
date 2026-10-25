/* HM-10: lõi đối soát tài sản bảo đảm TD.tsbd — hàm thuần, nhúng nguyên văn vào app và được Node nạp để kiểm thử.
   Dòng TS (đã chuẩn hoá): soTS (clno), maKH (plgcustno), giaTriTS (clamt), giaTriTC (plgamt), tienTe (clccycd), giuTS (clholdcd).
   Quy tắc: một TS (clno) chỉ tính MỘT lần (cùng TS được thế chấp qua nhiều hợp đồng ⇒ nhiều dòng); chỉ cộng VND vào tổng VND
   (USD/EUR tách riêng theo nguyên tệ, không cộng vào đồng); dư nợ của KH chỉ tính MỘT lần dù KH có nhiều TS. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var T = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  T.isVND = function (t) { var c = String(t && t.tienTe != null ? t.tienTe : 'VND').trim().toUpperCase(); return c === '' || c === 'VND'; };
  /* dedupe(rows): giữ dòng đầu của mỗi soTS; dòng không có soTS luôn giữ. Trả {unique, dupRows, dupKeys} */
  T.dedupe = function (rows) {
    var seen = Object.create(null), unique = [], dupRows = [], dupKeys = Object.create(null);
    rows.forEach(function (t) {
      var k = String(t.soTS || '').trim();
      if (!k) { unique.push(t); return; }
      if (seen[k]) { dupRows.push(t); dupKeys[k] = 1; } else { seen[k] = 1; unique.push(t); }
    });
    return { unique: unique, dupRows: dupRows, dupKeys: Object.keys(dupKeys) };
  };
  /* value(t): giá trị TSBĐ tính cho 1 TS = giá trị thế chấp (plgamt) nếu >0, ngược lại giá trị TS (clamt) */
  T.value = function (t) { var c = n(t.giaTriTC); return c > 0 ? c : n(t.giaTriTS); };
  /* summarize(rows): tổng đã khử trùng */
  T.summarize = function (rows) {
    var d = T.dedupe(rows), vnd = 0, vndTC = 0, fx = {}, byLoai = {};
    d.unique.forEach(function (t) {
      if (T.isVND(t)) {
        vnd += n(t.giaTriTS); vndTC += n(t.giaTriTC);
        var L = t.loaiTS || '(không rõ)'; var b = byLoai[L] || (byLoai[L] = [0, 0]); b[0]++; b[1] += n(t.giaTriTS);
      } else { var c = String(t.tienTe).trim().toUpperCase(); var f = fx[c] || (fx[c] = [0, 0]); f[0]++; f[1] += n(t.giaTriTS); }
    });
    var hold = {}; rows.forEach(function (t) { var h = String(t.giuTS == null ? '' : t.giuTS).trim() || '(trống)'; hold[h] = (hold[h] || 0) + 1; });
    return { rows: rows.length, unique: d.unique.length, dupRows: d.dupRows.length, dupKeys: d.dupKeys.length,
      giaTriTS_VND: vnd, giaTriTC_VND: vndTC, giaTriTS_raw: rows.reduce(function (s, t) { return s + n(t.giaTriTS); }, 0), fx: fx, byLoai: byLoai, hold: hold };
  };
  /* byKH(rows, keyFn): Map key → {n, value(VND, khử trùng theo clno), fx:{ccy:[n,sum]}} */
  T.byKH = function (rows, keyFn) {
    var d = T.dedupe(rows), m = new Map();
    d.unique.forEach(function (t) {
      var k = keyFn ? keyFn(t.maKH) : t.maKH; if (!k) return;
      var g = m.get(k); if (!g) { g = { n: 0, value: 0, giaTriTS: 0, fx: {} }; m.set(k, g); }
      g.n++;
      if (T.isVND(t)) { g.value += T.value(t); g.giaTriTS += n(t.giaTriTS); }
      else { var c = String(t.tienTe).trim().toUpperCase(); var f = g.fx[c] || (g.fx[c] = [0, 0]); f[0]++; f[1] += n(t.giaTriTS); }
    });
    return m;
  };
  /* coverage(rows, duNoByKey, keyFn): duNoByKey = Map/obj key → dư nợ (mỗi KH 1 lần). Trả tỷ lệ phủ chung + danh sách KH còn nợ chưa có TS. */
  T.coverage = function (rows, duNoByKey, keyFn) {
    var m = T.byKH(rows, keyFn), get = function (k) { return duNoByKey instanceof Map ? duNoByKey.get(k) : duNoByKey[k]; };
    var keys = duNoByKey instanceof Map ? Array.from(duNoByKey.keys()) : Object.keys(duNoByKey);
    var out = { khCon: 0, khCoTS: 0, khKhongTS: [], duNoCon: 0, duNoCoTS: 0, tsCuaKHCon: 0, duoi100: 0 };
    keys.forEach(function (k) {
      var dn = n(get(k)); if (dn <= 0) return;
      out.khCon++; out.duNoCon += dn;
      var g = m.get(k);
      if (!g || (g.value <= 0 && !Object.keys(g.fx).length)) { out.khKhongTS.push({ key: k, duNo: dn }); return; }
      out.khCoTS++; out.duNoCoTS += dn; out.tsCuaKHCon += g.value;
      if (g.value < dn) out.duoi100++;
    });
    out.tyLePhu = out.duNoCoTS > 0 ? out.tsCuaKHCon / out.duNoCoTS : 0;
    return out;
  };
  TD.tsbd = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
