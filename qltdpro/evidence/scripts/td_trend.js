/* HM-24: xu hướng nhiều kỳ TD.trend — hàm thuần, nhúng nguyên văn + Node test.
   snaps: [{dayKey:'dd/mm/yyyy', reportData:[dòng dư nợ]}]; summarize = TD.metrics.summarize. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var T = {};
  function pdate(k) { var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(k || '')); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
  /* P09: bộ nhớ đệm tóm tắt theo từng mốc — khoá = mảng dữ liệu gốc của mốc; tổng kiểm các cột mà summarize dùng (mã, tên, HĐ, HMTD, ngày, dư nợ, CBTD, loại, phòng, nhóm)
     nên sửa tại chỗ vẫn tính lại; đổi hàm summarize hoặc ngày cũng tính lại. */
  var memo = typeof WeakMap === 'function' ? new WeakMap() : null;
  var COLS = [0, 1, 2, 5, 7, 10, 11, 12, 13, 17, 18];
  function sigOf(a) {
    var h = a.length | 0;
    for (var i = 0; i < a.length; i++) { var r = a[i] || [], s = ''; for (var c = 0; c < COLS.length; c++) s += r[COLS[c]] + '|'; for (var j = 0; j < s.length; j++) h = (Math.imul(h, 31) + s.charCodeAt(j)) | 0; }
    return h;
  }
  function memoSummary(src, rows, summarize, date) {
    if (!memo || !src || typeof src !== 'object') return summarize(rows, { today: date });
    var sg = sigOf(src) + ':' + (+date), e = memo.get(src);
    if (e && e.fn === summarize && e.sg === sg) return e.S;
    var S = summarize(rows, { today: date }); memo.set(src, { fn: summarize, sg: sg, S: S }); return S;
  }
  /* build: một dòng cho mỗi NGÀY DỮ LIỆU (trùng ngày giữ bản cuối), sắp theo ngày tăng */
  T.build = function (snaps, summarize) {
    var byDay = {};
    (snaps || []).forEach(function (s) { var d = pdate(s && s.dayKey); if (d && Array.isArray(s.reportData) && s.reportData.length) byDay[s.dayKey] = { key: s.dayKey, date: d, rows: s.reportData }; });
    return Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a.date - b.date; }).map(function (p) {
      var rows = p.rows.filter(function (r) { return r && (+r[11] || 0) > 0 && String((r[0] || '') + (r[1] || '')).trim(); });
      var S = memoSummary(p.rows, rows, summarize, p.date); /* P09: mốc lưu trữ không đổi ⇒ không tóm tắt lại (Dashboard/Đối soát từng tính lại 11 mốc mỗi lần mở) */
      var pack = function (g) { return { duno: g.duno, kh: g.kh, hs: g.hs }; }, o = { key: p.key, date: p.date, totals: { duno: S.totals.duno, kh: S.totals.kh, hs: S.totals.hs }, nhom: {}, pb: {}, cbtd: {}, loai: {} };
      S.byNhom.forEach(function (g) { if (g.hs) o.nhom[g.key] = pack(g); }); S.byPB.forEach(function (g) { o.pb[g.key] = pack(g); }); S.byCBTD.forEach(function (g) { o.cbtd[g.key] = pack(g); }); S.byLoai.forEach(function (g) { if (g.hs) o.loai[g.key] = pack(g); });
      return o;
    });
  };
  /* seriesFor(periods, by, metric, topN): {labels, series:[{name, values}]}; by: total|nhom|pb|cbtd|loai */
  T.seriesFor = function (periods, by, metric, topN) {
    var labels = periods.map(function (p) { return p.key; });
    if (by === 'total') return { labels: labels, series: [{ name: 'Tổng', values: periods.map(function (p) { return p.totals[metric]; }) }] };
    var names = {}; periods.forEach(function (p) { Object.keys(p[by] || {}).forEach(function (k) { names[k] = (names[k] || 0) + (p[by][k].duno || 0); }); });
    var last = periods[periods.length - 1], order = Object.keys(names).sort(function (a, b) { var la = last && last[by][a] ? last[by][a].duno : 0, lb = last && last[by][b] ? last[by][b].duno : 0; return lb - la || names[b] - names[a]; });
    var keep = topN ? order.slice(0, topN) : order, rest = order.slice(keep.length);
    var series = keep.map(function (k) { return { name: k, values: periods.map(function (p) { return p[by][k] ? p[by][k][metric] : 0; }) }; });
    if (rest.length) series.push({ name: 'Khác (' + rest.length + ')', values: periods.map(function (p) { return rest.reduce(function (s, k) { return s + (p[by][k] ? p[by][k][metric] : 0); }, 0); }) });
    return { labels: labels, series: series };
  };
  T.delta = function (values) { return values.map(function (v, i) { return i ? v - values[i - 1] : null; }); };
  T.pct = function (values) { return values.map(function (v, i) { return i && values[i - 1] ? (v - values[i - 1]) / values[i - 1] : null; }); };
  T.csv = function (S) {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [['Kỳ'].concat(S.series.map(function (s) { return s.name; })).map(q).join(',')].concat(S.labels.map(function (l, i) { return [l].concat(S.series.map(function (s) { return s.values[i]; })).map(q).join(','); })).join('\n');
  };
  /* ticks: các mốc trục y "đẹp" */
  T.ticks = function (max, n) {
    n = n || 4; if (!(max > 0)) return [0]; var raw = max / n, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p, out = [];
    for (var v = 0; v <= max + step * 0.999; v += step) out.push(v); return out;
  };
  TD.trend = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
