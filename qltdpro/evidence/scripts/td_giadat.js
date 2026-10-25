/* HM-11: lõi bảng giá đất TD.giadat — hàm thuần, nhúng nguyên văn vào app và được Node nạp để kiểm thử.
   W[ward] = [[stt, đường, từ, đến, VT1 cao/thấp/TB, VT2 …, VT3 …, VT4 …]]; UB[ward][từ|||đến] = [VT1..VT4] (giá NQ38).
   Bảng NQ38 chỉ khoá theo "từ|||đến" (không có tên đường) ⇒ cùng cặp (từ,đến) thuộc nhiều đường thì KHÔNG xác định được giá nào là của đường nào. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var G = {};
  var nk = function (s) { return s ? String(s).toLowerCase().trim().replace(/\s+/g, ' ') : ''; };
  G.key = function (tu, den) { return nk(tu) + '|||' + nk(den); };
  /* index(W): ward → Map(từ|||đến → [các dòng]) */
  G.index = function (W) {
    var idx = {};
    Object.keys(W).forEach(function (w) {
      var m = new Map();
      W[w].forEach(function (r) { var k = G.key(r[2], r[3]); var a = m.get(k); if (!a) m.set(k, a = []); a.push(r); });
      idx[w] = m;
    });
    return idx;
  };
  /* lookupUBND(idx, UB, ward, tu, den, duong): {price, ambiguous, n}. Khoá trùng (≥2 dòng khác tên đường) ⇒ ambiguous, price=null. */
  G.lookupUBND = function (idx, UB, ward, tu, den, duong) {
    var k = G.key(tu, den), m = idx && idx[ward], rows = m && m.get(k) || [];
    var roads = {}; rows.forEach(function (r) { roads[nk(r[1])] = 1; });
    var amb = Object.keys(roads).length > 1;
    var p = UB && UB[ward] && UB[ward][k] || null;
    return { price: amb ? null : p, ambiguous: amb && !!p, n: rows.length, raw: p };
  };
  G.coeff = function (area, loai) {
    area = +area || 0;
    if (area <= 0) return 1;
    var T = loai === 'nn' ? [[200, 1], [500, 0.95], [2000, 0.9], [5000, 0.8], [10000, 0.7]] : [[100, 1], [300, 0.9], [500, 0.8], [1000, 0.7]];
    for (var i = 0; i < T.length; i++) if (area < T[i][0]) return T[i][1];
    return 0.5;
  };
  /* compute: đơn giá × K1 × K2(diện tích) × K4 × K5 × H1 × H2 (PL01) */
  G.compute = function (o) {
    var k2 = G.coeff(o.area, o.loai), f = (+o.k1 || 1) * k2 * (+o.k4 || 1) * (+o.k5 || 1) * (+o.h1 || 1) * (+o.h2 || 1);
    return { k2: k2, heSo: f, gia: (+o.dongia || 0) * f };
  };
  /* audit(W, UB): các lỗi dữ liệu có thể phát hiện từ chính bảng */
  G.audit = function (W, UB) {
    var idx = G.index(W), out = { rows: 0, dupGroups: [], dupRows: 0, dupAffectedUBND: 0, tbLech: [], ubndCaoHonThap: [], khongCoUBND: 0, khongCoGia: 0 };
    Object.keys(W).forEach(function (w) {
      out.rows += W[w].length;
      idx[w].forEach(function (rows, k) {
        var roads = {}; rows.forEach(function (r) { roads[nk(r[1])] = 1; });
        if (Object.keys(roads).length > 1) {
          out.dupGroups.push({ ward: w, key: k, roads: Object.keys(roads), n: rows.length, ubnd: !!(UB && UB[w] && UB[w][k]) });
          out.dupRows += rows.length; if (UB && UB[w] && UB[w][k]) out.dupAffectedUBND += rows.length;
        }
      });
      W[w].forEach(function (r) {
        var u = UB && UB[w] && UB[w][G.key(r[2], r[3])];
        if (!u) out.khongCoUBND++;
        var anyP = false;
        for (var v = 0; v < 4; v++) {
          var c = +r[4 + 3 * v] || 0, t = +r[5 + 3 * v] || 0, tb = +r[6 + 3 * v] || 0;
          if (c || t || tb) anyP = true;
          if (c > 0 && t > 0 && tb > 0 && Math.abs(tb - (c + t) / 2) > 1) out.tbLech.push({ ward: w, stt: r[0], duong: r[1], tu: r[2], den: r[3], vt: v + 1, cao: c, thap: t, tb: tb, ky_vong: (c + t) / 2 });
          if (u && t > 0 && u[v] > t) out.ubndCaoHonThap.push({ ward: w, stt: r[0], duong: r[1], tu: r[2], den: r[3], vt: v + 1, ubnd: u[v], thap: t });
        }
        if (!anyP) out.khongCoGia++;
      });
    });
    return out;
  };
  TD.giadat = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
