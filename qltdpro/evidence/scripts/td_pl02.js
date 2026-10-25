/* HM-11b: bộ đọc PL02 .docx (bảng giá đất) TD.pl02 — hàm thuần trên chuỗi word/document.xml, không cần DOM; nhúng nguyên văn vào app + Node test.
   parse(xml) → [{ward, stt, duong, tu, den, cells:[12 chuỗi VT1..VT4 × cao/thấp/TB]}] ; issues(rows, W) → {errCells, missingRows, rows} (cùng khuôn BGD_DOCX_ISSUES). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var P = {};
  var nk = function (s) { return s ? String(s).toLowerCase().replace(/\s+/g, '') : ''; }; // bỏ mọi khoảng trắng: docx dính/tách chữ giữa các run ("TâyĐông" ≡ "Tây Đông")
  var unesc = function (s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); };
  var text = function (frag) {
    var t = '', re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<\/w:p>/g, m;
    while ((m = re.exec(frag))) t += m[1] != null ? m[1] : ' ';
    return unesc(t).replace(/\s+/g, ' ').trim();
  };
  P.COLS = ['VT1 cao nhất', 'VT1 thấp nhất', 'VT1 trung bình', 'VT2 cao nhất', 'VT2 thấp nhất', 'VT2 trung bình', 'VT3 cao nhất', 'VT3 thấp nhất', 'VT3 trung bình', 'VT4 cao nhất', 'VT4 thấp nhất', 'VT4 trung bình'];
  P.isNum = function (s) { return /^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(String(s).trim()); };
  /* parse: ward lấy từ đoạn văn gần nhất trước mỗi bảng có dạng "Phường/Xã/Thị trấn …"; 2 dòng đầu mỗi bảng là tiêu đề */
  P.parse = function (xml) {
    var body = xml.slice(Math.max(0, xml.indexOf('<w:body>'))), out = [], pos = 0, m, reT = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
    while ((m = reT.exec(body))) {
      var pre = body.slice(pos, m.index), ward = '', ps = pre.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
      for (var i = ps.length - 1; i >= 0; i--) { var t = text(ps[i]); if (/^(Phường|Xã|Thị trấn)\s/i.test(t)) { ward = t; break; } }
      pos = m.index + m[0].length;
      var trs = m[0].match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [], stt = '', duong = '', vprev = [];
      for (var r = 2; r < trs.length; r++) {
        var cs = []; (trs[r].match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).forEach(function (tc) {
          var g = /<w:gridSpan w:val="(\d+)"/.exec(tc), t = text(tc), vc = /<w:vMerge\s*\/>|<w:vMerge w:val="continue"/.test(tc);
          for (var k = 0, n = g ? +g[1] : 1; k < n; k++) { var col = cs.length; cs.push(vc ? (vprev[col] || '') : t); } // ô gộp cột: lặp theo từng cột; gộp dòng: kế thừa ô dòng trên
        });
        vprev = cs.slice();
        if (cs.length < 16) continue;
        if (cs[0]) stt = cs[0]; if (cs[1]) duong = cs[1];
        out.push({ ward: ward, stt: stt, duong: duong, tu: cs[2], den: cs[3], cells: cs.slice(4, 16) });
      }
    }
    return out;
  };
  /* issues: ô không phải số (vd "#DIV/0!", "chưa hoàn thiện") + dòng PL02 không có trong bảng đang nạp (khoá ward|đường|từ|đến) */
  P.issues = function (rows, W) {
    var have = {};
    Object.keys(W || {}).forEach(function (w) { W[w].forEach(function (r) { have[nk(w) + '|' + nk(r[1]) + '|' + nk(r[2]) + '|' + nk(r[3])] = 1; }); });
    var err = [], miss = [];
    rows.forEach(function (r) {
      var bad = false;
      r.cells.forEach(function (c, i) { if (c !== '' && !P.isNum(c)) { bad = true; err.push([r.ward, r.stt, r.duong, r.tu, r.den, P.COLS[i], c]); } });
      if (!have[nk(r.ward) + '|' + nk(r.duong) + '|' + nk(r.tu) + '|' + nk(r.den)]) miss.push([r.ward, r.stt, r.duong, r.tu, r.den, bad]);
    });
    return { errCells: err, missingRows: miss, rows: rows.length };
  };
  TD.pl02 = P;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
