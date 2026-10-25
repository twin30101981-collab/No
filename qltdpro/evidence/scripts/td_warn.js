/* HM-25: cảnh báo sớm TD.warn — hàm thuần, nhúng nguyên văn vào app + Node test.
   Dòng dư nợ: 0 mã KH · 1 tên · 2 số HĐ · 7 ngày đến hạn · 8 lãi suất · 11 dư nợ · 12 CBTD · 18 nhóm nợ.
   inp = { rows, today(Date 00:00), parse(s)→Date|null, prevRows|null, prevLabel, tsbd:{rows, dnByKey, keyFn, cutoffMonths}|null, lsLow, lsHigh } */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var W = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  var DAY = 864e5;
  function ck(r) { var m = String(r[0] == null ? '' : r[0]).trim(); return m ? 'M:' + m : 'N:' + String(r[1] || '').trim().replace(/\s+/g, ' ').toUpperCase(); }
  function rank(v) { var m = /\d+/.exec(String(v == null ? '' : v)); return m ? parseInt(m[0], 10) : 0; }
  W.rank = rank;
  function lsOf(v) { var s = String(v == null ? '' : v).replace('%', '').replace(',', '.').trim(); var x = parseFloat(s); return isFinite(x) ? x : 0; }
  W.lsOf = lsOf;
  function isoOk(s) { var y = +String(s || '').slice(0, 4); return y >= 1990 && y <= 2100; }
  function sec(id, title, items, extra) {
    var kh = {}, duno = 0; items.forEach(function (x) { if (x.key) kh[x.key] = 1; duno += n(x.duno); });
    var o = { id: id, title: title, count: items.length, kh: Object.keys(kh).length, duno: duno, items: items }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return o;
  }
  W.compute = function (inp) {
    var rows = (inp.rows || []).filter(function (r) { return r && n(r[11]) > 0; }), today = inp.today, parse = inp.parse, S = [];
    var lo = inp.lsLow == null ? 4 : inp.lsLow, hi = inp.lsHigh == null ? 13 : inp.lsHigh;
    // 1) đến hạn / quá hạn theo ngày của dữ liệu
    var b = { over: [], d7: [], d15: [], d30: [] };
    rows.forEach(function (r) {
      var d = parse(r[7]); if (!d) return; var k = Math.round((d - today) / DAY);
      var it = { key: ck(r), ma: r[0], ten: r[1], sohd: r[2], due: r[7], days: k, duno: n(r[11]), cbtd: r[12] };
      if (k < 0) b.over.push(it); else if (k <= 7) b.d7.push(it); else if (k <= 15) b.d15.push(it); else if (k <= 30) b.d30.push(it);
    });
    S.push(sec('over', 'Quá hạn (ngày đến hạn < ngày dữ liệu)', b.over.sort(function (a, c) { return a.days - c.days; })));
    S.push(sec('d7', 'Đến hạn trong 7 ngày', b.d7.sort(function (a, c) { return a.days - c.days; })));
    S.push(sec('d15', 'Đến hạn 8–15 ngày', b.d15.sort(function (a, c) { return a.days - c.days; })));
    S.push(sec('d30', 'Đến hạn 16–30 ngày', b.d30.sort(function (a, c) { return a.days - c.days; })));
    // 2) chuyển nhóm nợ (cần mốc kỳ trước)
    if (inp.prevRows && inp.prevRows.length) {
      var pm = {}; inp.prevRows.forEach(function (r) { if (!r) return; var k = ck(r); pm[k] = Math.max(pm[k] || 0, rank(r[18])); });
      var cur = {}; rows.forEach(function (r) { var k = ck(r), o = cur[k] || (cur[k] = { key: k, ma: r[0], ten: r[1], rk: 0, duno: 0, cbtd: r[12] }); o.rk = Math.max(o.rk, rank(r[18])); o.duno += n(r[11]); });
      var mv = []; Object.keys(cur).forEach(function (k) { var c = cur[k]; if (c.rk >= 2 && pm[k] != null && pm[k] <= 1) mv.push({ key: k, ma: c.ma, ten: c.ten, tu: 'Nhóm ' + pm[k], den: 'Nhóm ' + c.rk, duno: c.duno, cbtd: c.cbtd }); });
      S.push(sec('nhom', 'Chuyển nhóm nợ xấu hơn so với ' + (inp.prevLabel || 'kỳ trước'), mv.sort(function (a, c) { return c.duno - a.duno; })));
    } else S.push(sec('nhom', 'Chuyển nhóm nợ — chưa có mốc kỳ trước để so (hãy nhập dư nợ kỳ trước)', [], { skipped: true }));
    // 3) lãi suất bất thường
    var ls = []; rows.forEach(function (r) { var v = lsOf(r[8]); if (!(v > 0) || v < lo || v >= hi) ls.push({ key: ck(r), ma: r[0], ten: r[1], sohd: r[2], ls: v, duno: n(r[11]), cbtd: r[12] }); });
    S.push(sec('ls', 'Lãi suất bất thường (< ' + lo + '% hoặc ≥ ' + hi + '% hoặc trống)', ls.sort(function (a, c) { return c.duno - a.duno; })));
    // 4) TSBĐ
    var T = inp.tsbd;
    if (T && T.rows && T.rows.length) {
      var kf = T.keyFn || function (x) { return x; }, dn = T.dnByKey || {}, cut = T.cutoffMonths == null ? 36 : T.cutoffMonths;
      var todayIso = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
      var cd = new Date(today.getFullYear(), today.getMonth() - cut, today.getDate()), cutIso = cd.getFullYear() + '-' + ('0' + (cd.getMonth() + 1)).slice(-2) + '-' + ('0' + cd.getDate()).slice(-2);
      var seen = {}, ex = [], old = [];
      T.rows.forEach(function (t) {
        var k = kf(t.maKH); if (!k || n(dn[k]) <= 0) return; var sk = String(t.soTS || '') + '|' + k; if (t.soTS && seen[sk]) return; seen[sk] = 1;
        var it = { key: k, ma: t.maKH, ten: t.tenKH, soTS: t.soTS, loai: t.loaiTS, gt: n(t.giaTriTS), duno: n(dn[k]) };
        if (t.ngayHetHan && isoOk(t.ngayHetHan) && t.ngayHetHan < todayIso) { var e = Object.assign({}, it, { han: t.ngayHetHan }); ex.push(e); }
        if (t.ngayDinhGia && isoOk(t.ngayDinhGia) && t.ngayDinhGia < cutIso) { var o = Object.assign({}, it, { dg: t.ngayDinhGia }); old.push(o); }
      });
      S.push(sec('tsHet', 'TSBĐ của KH còn dư nợ đã hết hạn thế chấp (< ngày dữ liệu)', ex.sort(function (a, c) { return c.gt - a.gt; })));
      S.push(sec('tsCu', 'TSBĐ của KH còn dư nợ có định giá cũ hơn ' + cut + ' tháng', old.sort(function (a, c) { return c.gt - a.gt; })));
      var keys = Object.keys(dn).filter(function (k) { return n(dn[k]) > 0; }), has = {}; T.rows.forEach(function (t) { var k = kf(t.maKH); if (k) has[k] = 1; });
      var names = T.names || {}, no = keys.filter(function (k) { return !has[k]; }).map(function (k) { return { key: k, ma: k, ten: names[k] || '', duno: n(dn[k]) }; });
      S.push(sec('tsKhong', 'KH còn dư nợ chưa có TSBĐ (theo mã KH)', no.sort(function (a, c) { return c.duno - a.duno; })));
    } else S.push(sec('ts', 'TSBĐ — chưa nạp sao kê tài sản để cảnh báo', [], { skipped: true }));
    var total = 0; S.forEach(function (s) { if (!s.skipped && s.id !== 'd15' && s.id !== 'd30' && s.id !== 'tsCu') total += s.count; });
    return { sections: S, total: total };
  };
  W.csv = function (s) {
    var cols = s.items.length ? Object.keys(s.items[0]).filter(function (k) { return k !== 'key'; }) : [], q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.join(',')].concat(s.items.map(function (it) { return cols.map(function (c) { return q(it[c]); }).join(','); })).join('\n');
  };
  TD.warn = W;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
