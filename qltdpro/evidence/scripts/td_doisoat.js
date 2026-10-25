/* HM-12: lõi đối soát số liệu TD.doisoat — hàm thuần (nhận số đã thu thập, trả kết quả + biên bản); nhúng nguyên văn và Node nạp để kiểm thử.
   inp: { dataDate, rows:{hs,duno,kh}, dash:{duno,kh,sumLoai,sumNhom,sumPB}|null, snap:{duno,kh,dayKey}|null, tsbd:{khCon,src}|null,
          bckh:{mapped,unassigned}|null, ls:{high,total}|null } */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var D = {};
  var f = function (v) { return Math.round(+v || 0).toLocaleString('vi-VN'); };
  D.checks = function (inp) {
    var out = [], R = inp.rows, TOL = 0.5;
    function add(id, name, exp, act, note, opt) {
      var skip = act == null || exp == null;
      out.push({ id: id, name: name, expected: exp, actual: act, status: skip ? 'bo_qua' : (Math.abs(exp - act) <= ((opt && opt.tol) || TOL) ? 'khop' : 'lech'), note: note || '' });
    }
    var d = inp.dash;
    add('D1', 'Dashboard · Tổng dư nợ (Bảng I) = tổng tính lại từ dữ liệu', R.duno, d ? d.duno : null, 'Tổng cộng Bảng I theo loại vay');
    add('D2', 'Dashboard · Σ dòng theo loại vay = tổng', R.duno, d ? d.sumLoai : null, 'Mỗi khoản phải rơi vào đúng một loại (kể cả "Khác")');
    add('D3', 'Dashboard · Σ theo nhóm nợ = tổng', R.duno, d ? d.sumNhom : null, 'Kể cả "Không rõ nhóm"');
    add('D4', 'Dashboard · Σ theo phòng ban = tổng', R.duno, d ? d.sumPB : null, '');
    add('D5', 'Dashboard · Số khách hàng (theo mã, dư nợ>0) = tính lại', R.kh, d ? d.kh : null, '');
    var s = inp.snap;
    add('S1', 'Mốc hàng ngày ' + (s ? s.dayKey : '(chưa có)') + ' · Σ dư nợ = dữ liệu hiện tại', R.duno, s ? s.duno : null, 'Lệch nếu đã sửa tay/nhập lại sau khi tạo mốc', { tol: 1 });
    add('S2', 'Mốc hàng ngày · Số KH = dữ liệu hiện tại', R.kh, s ? s.kh : null, '');
    add('T1', 'TSBĐ · KH còn dư nợ (theo hồ sơ vay) = số KH', R.kh, inp.tsbd ? inp.tsbd.khCon : null, inp.tsbd ? 'Nguồn TSBĐ: ' + inp.tsbd.src : 'Chưa nhập tệp TSBĐ');
    add('B1', 'Báo cáo theo CBTD · Σ trong bảng + chưa phân CBTD = tổng', R.duno, inp.bckh ? inp.bckh.mapped + inp.bckh.unassigned : null, inp.bckh && inp.bckh.unassigned ? 'Chưa phân CBTD: ' + f(inp.bckh.unassigned) + ' đ (không nằm trong bảng theo CBTD)' : '');
    if (inp.ls && inp.ls.total) out.push({ id: 'L1', name: 'Lãi suất · tỷ lệ khoản có LS ≥ 18%', expected: null, actual: inp.ls.high / inp.ls.total, status: inp.ls.high / inp.ls.total > 0.7 ? 'lech' : 'khop', note: '>70% cùng LS≥18% nghi lỗi đọc .xlsx cũ — nhập lại tệp' });
    return out;
  };
  D.summary = function (checks) {
    var s = { khop: 0, lech: 0, bo_qua: 0 }; checks.forEach(function (c) { s[c.status]++; });
    s.tong = checks.length; s.text = s.lech ? '⚠️ ' + s.lech + ' chỉ tiêu lệch / ' + (s.khop + s.lech) + ' đã đối soát' : '✅ ' + s.khop + '/' + (s.khop + s.lech) + ' chỉ tiêu khớp' + (s.bo_qua ? ' (' + s.bo_qua + ' chưa có dữ liệu để so)' : '');
    return s;
  };
  D.report = function (inp, checks, meta) {
    var S = D.summary(checks), L = [];
    L.push('BIÊN BẢN ĐỐI SOÁT SỐ LIỆU — QLTD PRO');
    L.push('Ngày dữ liệu: ' + (inp.dataDate || '(không rõ — dùng hôm nay)') + ' · Lập lúc: ' + ((meta && meta.at) || '') + ' · Người lập: ' + ((meta && meta.by) || '(chưa khai)'));
    L.push('Dữ liệu: ' + inp.rows.hs + ' hồ sơ dư nợ · ' + inp.rows.kh + ' khách hàng · tổng dư nợ ' + f(inp.rows.duno) + ' đ');
    L.push('Kết luận: ' + S.text); L.push('');
    checks.forEach(function (c) {
      var st = c.status === 'khop' ? 'KHỚP' : c.status === 'lech' ? 'LỆCH' : 'BỎ QUA';
      L.push('[' + st + '] ' + c.id + ' · ' + c.name);
      if (c.expected != null && c.actual != null) L.push('      tính lại: ' + f(c.expected) + ' | màn hình/nguồn: ' + f(c.actual) + (c.status === 'lech' ? ' | chênh: ' + f(c.actual - c.expected) : ''));
      else if (c.actual != null) L.push('      giá trị: ' + (c.actual * 100).toFixed(1) + '%');
      if (c.note) L.push('      ghi chú: ' + c.note);
    });
    L.push(''); L.push('Quy ước: "tính lại" = cộng trực tiếp từ DATA.qltd, không qua engine TD.metrics; "màn hình" = số đang hiển thị/lưu ở màn hình tương ứng.');
    return L.join('\n');
  };
  TD.doisoat = D;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
