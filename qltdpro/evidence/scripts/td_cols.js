/* HM-17: lõi chọn cột bảng dữ liệu TD.cols — hàm thuần (preset, chuẩn hoá lưu trữ, CSS), nhúng nguyên văn vào app + Node test.
   Bảng Dư nợ/Ngắn hạn/Trung-dài có 20 cột cùng thứ tự (0 TẤT CẢ, 1 CBTD, 2 PHÒNG BAN, 3 SỐ HỒ SƠ, 4 TÊN KH, 5 MÃ KH, 6 SỐ TK, 7 SỐ HĐTD, 8 NGÀY HĐTD,
   9 ĐẾN HẠN HMTD, 10 HMTD/SỐ TIỀN VAY, 11 SỐ TIỀN GN, 12 DƯ NỢ, 13 NGÀY GN, 14 NGÀY T.NỢ, 15 SỐ GN, 16 L/S%, 17 MỤC ĐÍCH, 18 ĐỊA CHỈ, 19 NHÓM NỢ). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var C = {};
  C.NCOL = 20;
  C.ALWAYS = [0, 4, 12];                       // luôn hiện: chọn dòng, tên KH, dư nợ
  C.PRESETS = {
    full: { name: 'Đầy đủ', hide: [] },
    g1920: { name: 'Gọn 1920', hide: [6, 15, 17, 18] },
    g1600: { name: 'Gọn 1600', hide: [2, 3, 6, 13, 15, 17, 18] }, // P05: vùng bảng ≈1.590 px khi menu bên cố định (màn 1920)
    g1366: { name: 'Gọn 1366', hide: [2, 3, 6, 8, 10, 11, 13, 15, 17, 18] },
    dt: { name: 'Điện thoại', hide: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18] } // chỉ: chọn dòng, tên KH, dư nợ, nhóm nợ
  };
  C.FIT = ['g1920', 'g1600', 'g1366']; // P05: nếu mẫu mặc định vẫn tràn khung thì lùi dần theo chuỗi này (không áp cho mẫu người dùng đã chọn)
  C.defaultPreset = function (viewportW) { return viewportW >= 1800 ? 'g1920' : viewportW < 700 ? 'dt' : 'g1366'; };
  /* HM-17b: đặc tả các bảng khác (cột logic, đếm cả cột nằm dưới tiêu đề gộp ô). Mặc định 'full' = không tự ẩn cột nào.
     Mẫu "Gọn" chọn theo bề rộng đo trên dữ liệu thật ở 1366 px (vùng bảng ~1288 px). */
  C.SPECS = {
    // Chuyển HM: 0 chọn · 1 CBTD · 2 PHÒNG BAN · 3 ĐẾN HẠN HMTD · 4 TÊN KH · 5 MÃ KH · 6 SỐ HĐTD · 7 NGÀY BĐ HĐ · 8 HMTD · 9 LOẠI VAY · 10 DƯ NỢ · 11 GHI CHÚ
    chlm: { ncol: 12, always: [0, 4, 10], pinTo: 4, presets: { full: { name: 'Đầy đủ', hide: [] }, gon: { name: 'Gọn 1366', hide: [2, 7, 9] }, gon2: { name: 'Gọn 1280', hide: [2, 5, 7, 9, 11] } }, fit: ['gon', 'gon2'] },
    // TSBĐ: 0 # · 1 MÃ KH · 2 TÊN KH · 3 TÊN CHỦ TS · 4 MÃ KH CHỦ TS · 5 LOẠI TS · 6 ĐỊA CHỈ · 7 GIÁ TRỊ TS · 8 TỶ LỆ · 9 SỐ GCN · 10 NGÀY TC · 11 HẾT HẠN · 12 CBTD · 13 DƯ NỢ KH · 14 TRẠNG THÁI
    tsbd: { ncol: 15, always: [0, 2, 7], pinTo: 2, presets: { full: { name: 'Đầy đủ', hide: [] }, gon: { name: 'Gọn 1366', hide: [3, 4, 6, 9, 10, 12] }, gon2: { name: 'Gọn 1280', hide: [1, 3, 4, 6, 9, 10, 12] } }, fit: ['gon', 'gon2'] },
    // Giá đất: 0 STT · 1 Tên đường · 2 Từ · 3 Đến · 4–6 VT1 (cao, thấp, UBND) · 7–9 VT2 · 10–12 VT3 · 13–15 VT4
    giadat: { ncol: 16, always: [0, 1], presets: { full: { name: 'Đầy đủ', hide: [] }, ubnd: { name: 'Chỉ giá UBND (NQ38)', hide: [4, 5, 7, 8, 10, 11, 13, 14] }, vt1: { name: 'Chỉ VT1', hide: [7, 8, 9, 10, 11, 12, 13, 14, 15] } } }
  };
  function sp(spec) { return spec || { ncol: C.NCOL, always: C.ALWAYS, presets: C.PRESETS }; }
  /* sanitize(hide[, spec]): mảng chỉ số hợp lệ, không chứa cột luôn hiện, không trùng, tăng dần */
  C.sanitize = function (hide, spec) {
    var S = sp(spec), s = {}; (hide || []).forEach(function (i) { i = +i; if (i >= 0 && i < S.ncol && S.always.indexOf(i) < 0) s[i] = 1; });
    return Object.keys(s).map(Number).sort(function (a, b) { return a - b; });
  };
  /* resolve(saved, viewportW[, spec]): {preset, hide, pin}; saved = {preset?, hide?, pin?} hoặc null */
  C.resolve = function (saved, viewportW, spec) {
    saved = saved || {}; var S = sp(spec);
    var p = saved.preset && S.presets[saved.preset] ? saved.preset : (saved.hide ? 'custom' : (spec ? 'full' : C.defaultPreset(viewportW)));
    var hide = p === 'custom' ? C.sanitize(saved.hide, spec) : S.presets[p].hide.slice();
    /* P07: chưa chọn gì ⇒ ghim cột đến TÊN KH mặc định (màn ≥1280 px); đã chọn thì theo lựa chọn */
    return { preset: p, hide: hide, pin: spec ? (spec.pinTo != null && saved.pin === true) : (saved.pin === undefined ? viewportW >= 1280 : !!saved.pin) }; // P08: bảng khác chỉ ghim khi người dùng bật (mặc định tắt); Giá đất (tiêu đề 2 hàng) không có ghim
  };
  /* grid(rows): rows = [[{cs, rs}…]…] (các ô của thead/tfoot) ⇒ [[ [đầu, cuối) cột logic ]…] — tính cả rowspan/colspan */
  C.grid = function (rows) {
    var occ = [], out = [];
    rows.forEach(function (cells, r) {
      occ[r] = occ[r] || []; var col = 0, o = [];
      cells.forEach(function (c) {
        while (occ[r][col]) col++;
        var cs = Math.max(1, c.cs | 0), rs = Math.max(1, c.rs | 0);
        for (var y = r; y < r + rs; y++) { occ[y] = occ[y] || []; for (var x = col; x < col + cs; x++) occ[y][x] = 1; }
        o.push([col, col + cs]); col += cs;
      });
      out.push(o);
    });
    return out;
  };
  /* span(range, hide): số cột còn hiện trong [đầu, cuối) — 0 ⇒ ẩn ô */
  C.span = function (rg, hide) { var v = 0; for (var x = rg[0]; x < rg[1]; x++) if (hide.indexOf(x) < 0) v++; return v; };
  /* css(tableId, hide, pinLefts): quy tắc CSS ẩn cột (chỉ thead/tbody; tfoot có 1 ô colspan nên giữ) và ghim các cột đầu đến TÊN KH */
  C.css = function (tid, hide, pinLefts, bodyOnly) { // bodyOnly: tiêu đề gộp ô do C.grid/C.span xử lý
    var out = [];
    hide.forEach(function (i) { out.push((bodyOnly ? '' : '#' + tid + ' thead th:nth-child(' + (i + 1) + '),') + '#' + tid + ' tbody td:nth-child(' + (i + 1) + '){display:none!important}'); });
    if (pinLefts) pinLefts.forEach(function (o) { out.push('#' + tid + ' thead th:nth-child(' + (o.i + 1) + '),#' + tid + ' tbody td:nth-child(' + (o.i + 1) + '){position:sticky;left:' + o.left + 'px;z-index:' + (o.hdr ? 4 : 2) + ';background:var(--td-pin-bg,#fff)}'); });
    return out.join('\n');
  };
  /* pinLefts(widths, hide): các cột hiện từ 0 đến TÊN KH (4) ghim với left cộng dồn */
  C.pinLefts = function (widths, hide, upTo) {
    var left = 0, out = [];
    for (var i = 0; i <= (upTo == null ? 4 : upTo); i++) { if (hide.indexOf(i) >= 0) continue; out.push({ i: i, left: Math.round(left) }); left += widths[i] || 0; }
    return out;
  };
  TD.cols = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
