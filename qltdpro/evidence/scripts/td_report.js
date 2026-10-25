/* HM-28: mẫu báo cáo chuẩn TD.report — dựng các trang tính (mảng-của-mảng) từ TD.metrics + đối soát + xu hướng + cảnh báo; nhúng nguyên văn + Node test.
   inp: { dataDate:'dd/mm/yyyy'|'', summary: TD.metrics.summarize(...), checks: TD.doisoat.checks(...)|null, periods: TD.trend.build(...)|[], warn: TD.warn.compute(...).sections|null, by:'' , at:'' } */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var R = {};
  var pct = function (a, b) { return b ? a / b : 0; };
  var LOAI_NH = { nganhan: 1, thauchi: 1 }, LOAI_TDH = { trunghan: 1, daihan: 1 };
  R.sheets = function (inp) {
    var S = inp.summary, T = S.totals, out = [];
    out.push({ name: 'Tổng hợp', widths: [34, 16, 14, 24, 10], money: [3], pct: [4], rows: [
      ['BÁO CÁO TỔNG HỢP DƯ NỢ'], ['Ngày dữ liệu', inp.dataDate || '(không rõ)'], ['Lập lúc', inp.at || ''], ['Người lập', inp.by || ''], [],
      ['Chỉ tiêu', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%'], ['TỔNG CỘNG', T.kh, T.hs, T.duno, 1], [],
      ['THEO LOẠI VAY'], ['Loại vay', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%']].concat(S.byLoai.filter(function (g) { return g.hs || g.key !== 'khac'; }).map(function (g) { return [g.name, g.kh, g.hs, g.duno, pct(g.duno, T.duno)]; })).concat([[],
      ['THEO NHÓM NỢ'], ['Nhóm nợ', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%']]).concat(S.byNhom.filter(function (g) { return g.hs || g.key !== 'Không rõ nhóm'; }).map(function (g) { return [g.key, g.kh, g.hs, g.duno, pct(g.duno, T.duno)]; })) });
    var pb = S.byPB.slice().sort(function (a, b) { return b.duno - a.duno; });
    out.push({ name: 'Theo phòng ban', widths: [28, 16, 14, 24, 10], money: [3], pct: [4], rows: [['DƯ NỢ THEO PHÒNG BAN'], [], ['Phòng ban', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%']].concat(pb.map(function (g) { return [g.key, g.kh, g.hs, g.duno, pct(g.duno, T.duno)]; })).concat([['TỔNG CỘNG', T.kh, T.hs, T.duno, 1]]) });
    var cb = S.byCBTD.map(function (g) { var nh = 0, td = 0; g.rows.forEach(function (r) { var k = TD.metrics.classifyLoai(r[13]); if (LOAI_NH[k]) nh += +r[11] || 0; else if (LOAI_TDH[k]) td += +r[11] || 0; }); return { g: g, nh: nh, td: td }; }).sort(function (a, b) { return b.g.duno - a.g.duno; });
    out.push({ name: 'Theo CBTD', widths: [28, 22, 14, 12, 22, 22, 24, 10], money: [4, 5, 6], pct: [7], rows: [['DƯ NỢ THEO CÁN BỘ TÍN DỤNG'], [], ['CBTD', 'Phòng ban', 'Số khách hàng', 'Số khoản', 'Ngắn hạn + thấu chi', 'Trung-dài hạn', 'Dư nợ (đồng)', '%']].concat(cb.map(function (x) { return [x.g.key, x.g.pb, x.g.kh, x.g.hs, x.nh, x.td, x.g.duno, pct(x.g.duno, T.duno)]; })).concat([['TỔNG CỘNG', '', T.kh, T.hs, cb.reduce(function (s, x) { return s + x.nh; }, 0), cb.reduce(function (s, x) { return s + x.td; }, 0), T.duno, 1]]) });
    if (inp.checks) {
      var lab = { khop: 'KHỚP', lech: 'LỆCH', bo_qua: 'CHƯA CÓ DỮ LIỆU' };
      out.push({ name: 'Biên bản đối soát', widths: [8, 62, 24, 24, 20, 18, 46], money: [2, 3, 4], rows: [['BIÊN BẢN ĐỐI SOÁT SỐ LIỆU'], ['Ngày dữ liệu', inp.dataDate || ''], [], ['Mã', 'Chỉ tiêu', 'Tính lại', 'Màn hình / nguồn', 'Chênh', 'Kết quả', 'Ghi chú']].concat(inp.checks.map(function (c) { return [c.id, c.name, c.expected == null ? '' : c.expected, c.actual == null ? '' : c.actual, c.expected != null && c.actual != null ? c.actual - c.expected : '', lab[c.status], c.note || '']; })) });
    }
    if (inp.periods && inp.periods.length >= 2) out.push({ name: 'Xu hướng các kỳ', widths: [14, 24, 16, 14, 24], money: [1, 4], rows: [['XU HƯỚNG DƯ NỢ CÁC KỲ ĐÃ NHẬP'], [], ['Kỳ (ngày dữ liệu)', 'Dư nợ (đồng)', 'Số khách hàng', 'Số khoản', 'Thay đổi so kỳ trước (đồng)']].concat(inp.periods.map(function (p, i) { return [p.key, p.totals.duno, p.totals.kh, p.totals.hs, i ? p.totals.duno - inp.periods[i - 1].totals.duno : '']; })) });
    if (inp.warn) out.push({ name: 'Cảnh báo sớm', widths: [64, 14, 14, 24], money: [3], rows: [['CẢNH BÁO SỚM'], ['Ngày dữ liệu', inp.dataDate || ''], [], ['Mục', 'Số dòng', 'Số KH', 'Dư nợ liên quan (đồng)']].concat(inp.warn.map(function (s) { return [s.title, s.skipped ? 'chưa đủ dữ liệu' : s.count, s.skipped ? '' : s.kh, s.skipped ? '' : s.duno]; })) });
    return out;
  };
  TD.report = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
