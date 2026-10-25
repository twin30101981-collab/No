/* HM-26: Khách hàng 360° TD.kh360 — hàm thuần, nhúng nguyên văn + Node test.
   Dòng dư nợ: 0 mã KH · 1 tên · 2 số HĐTD · 5 HMTD · 7 đến hạn · 8 lãi suất · 11 dư nợ · 12 CBTD · 13 loại vay · 17 phòng ban · 18 nhóm nợ. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var K = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  function fold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(); }
  K.fold = fold;
  K.key = function (r) { var m = String(r && r[0] != null ? r[0] : '').trim(); return m ? 'M:' + m : 'N:' + String(r && r[1] || '').trim().replace(/\s+/g, ' ').toUpperCase(); };
  function rank(v) { var m = /\d+/.exec(String(v == null ? '' : v)); return m ? parseInt(m[0], 10) : 0; }
  /* find(rows, q, limit): KH khớp mã (chuỗi số) hoặc tên (không dấu); chỉ KH có dư nợ > 0 trước */
  K.find = function (rows, q, limit) {
    var f = fold(q), d = String(q || '').replace(/\D/g, ''), m = new Map();
    if (!f) return [];
    (rows || []).forEach(function (r) {
      if (!r) return; var k = K.key(r), hit = (d.length >= 3 && String(r[0] || '').indexOf(d) >= 0) || fold(r[1]).indexOf(f) >= 0 || fold(r[2]).indexOf(f) >= 0;
      if (!hit) return; var o = m.get(k); if (!o) m.set(k, o = { key: k, ma: r[0], ten: r[1], duno: 0, hs: 0 }); o.duno += n(r[11]); o.hs++;
    });
    return Array.from(m.values()).sort(function (a, b) { return (b.duno > 0) - (a.duno > 0) || b.duno - a.duno; }).slice(0, limit || 12);
  };
  /* history(snaps, key): [{key: dayKey, date, duno, nhom, hs}] theo ngày tăng; snaps đã lọc autoDaily */
  K.history = function (snaps, key, parse) {
    var byDay = {};
    (snaps || []).forEach(function (s) {
      if (!s || !s.dayKey || !Array.isArray(s.reportData)) return; var d = parse(s.dayKey); if (!d) return;
      var o = { key: s.dayKey, date: d, duno: 0, nhom: 0, hs: 0 };
      s.reportData.forEach(function (r) { if (r && K.key(r) === key && n(r[11]) > 0) { o.duno += n(r[11]); o.hs++; o.nhom = Math.max(o.nhom, rank(r[18])); } });
      byDay[s.dayKey] = o;
    });
    return Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a.date - b.date; });
  };
  /* build(ctx): ctx = {key, rows, tsbd:{rows,keyFn,dedupe,value,isVND}|null, snaps, parse, today, hoso:[{id,ten,loai,ngay}]} */
  K.build = function (ctx) {
    var mine = (ctx.rows || []).filter(function (r) { return r && K.key(r) === ctx.key; });
    var act = mine.filter(function (r) { return n(r[11]) > 0; });
    var h = { key: ctx.key, ma: mine[0] ? mine[0][0] : '', ten: mine[0] ? mine[0][1] : '', cbtd: mine[0] ? mine[0][12] : '', pb: mine[0] ? mine[0][17] : '', duno: 0, hmtd: 0, nhom: 0, nKhoan: act.length, nHDTD: 0 };
    var hd = {}; mine.forEach(function (r) { h.hmtd += n(r[5]); });
    act.forEach(function (r) { h.duno += n(r[11]); h.nhom = Math.max(h.nhom, rank(r[18])); hd[String(r[2] || '')] = 1; }); h.nHDTD = Object.keys(hd).length;
    // HMTD: cộng một lần cho mỗi HĐTD (hồ sơ có nhiều khế ước cùng HMTD)
    var seen = {}, hm = 0; mine.forEach(function (r) { var k = String(r[2] || ''); if (k && !seen[k]) { seen[k] = 1; hm += n(r[5]); } }); h.hmtd = hm;
    var khoan = mine.slice().sort(function (a, b) { return n(b[11]) - n(a[11]); }).map(function (r) {
      var d = ctx.parse ? ctx.parse(r[7]) : null, days = d && ctx.today ? Math.round((d - ctx.today) / 864e5) : null;
      return { sohd: r[2], loai: r[13], hmtd: n(r[5]), duno: n(r[11]), ls: r[8], den: r[7], days: days, nhom: r[18] };
    });
    var ts = null;
    if (ctx.tsbd && ctx.tsbd.rows) {
      var list = ctx.tsbd.rows.filter(function (t) { return ctx.tsbd.keyFn(t.maKH) === ctx.tsbd.mdig; });
      var u = ctx.tsbd.dedupe(list).unique, gt = 0, fx = 0;
      u.forEach(function (t) { if (ctx.tsbd.isVND(t)) gt += ctx.tsbd.value(t); else fx++; });
      ts = { n: u.length, gt: gt, fx: fx, ratio: h.duno > 0 ? gt / h.duno : null, list: u.slice(0, 50).map(function (t) { return { soTS: t.soTS, loai: t.loaiTS, gt: ctx.tsbd.isVND(t) ? ctx.tsbd.value(t) : 0, tienTe: t.tienTe, han: t.ngayHetHan, dg: t.ngayDinhGia, dc: t.diaChiTS }; }) };
    }
    return { header: h, khoan: khoan, ts: ts, history: K.history(ctx.snaps, ctx.key, ctx.parse), hoso: ctx.hoso || [] };
  };
  TD.kh360 = K;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
