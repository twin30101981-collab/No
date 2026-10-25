"""HM-10: đối soát TSBĐ dùng lõi TD.tsbd (nguồn: td_tsbd.js).
 - Chuẩn hoá thêm clccycd (tiền tệ) và clholdcd; tổng giá trị khử trùng theo clno, chỉ cộng VND (USD/EUR tách riêng);
 - Tóm tắt: số TS trùng đã loại, TS ngoại tệ, KH còn dư nợ chưa có TS, tỷ lệ phủ (dư nợ mỗi KH 1 lần); phân bố clholdcd để rà soát;
 - Giá trị TSBĐ đưa sang form hồ sơ vay khử trùng clno; mở form sửa KHÔNG tự ghi đè giá trị TSBĐ đang có.
Dùng: python3 apply_hm10.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'td_tsbd.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)

rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n\nfunction tdRenderDateChip() { // HM-07")
rep("plgcustnm: 'tenKH', ntydt: 'ngayDinhGia',", "plgcustnm: 'tenKH', clccycd: 'tienTe', clholdcd: 'giuTS', ntydt: 'ngayDinhGia',")
rep("        kieuTheChap: clean(g('kieuTheChap')),\n        coBenThu3:", "        kieuTheChap: clean(g('kieuTheChap')),\n        tienTe: tr(g('tienTe')) || 'VND', giuTS: tr(g('giuTS')), // HM-10\n        coBenThu3:")

# tóm tắt
rep("""    var byLoai = {}, byTT = { con: [0, 0], tt: [0, 0], kct: [0, 0] }, byCB = {}, kh = {}, khCon = {};
    S.rows.forEach(function (t) {
      byLoai[t.loaiTS] = byLoai[t.loaiTS] || [0, 0]; byLoai[t.loaiTS][0]++; byLoai[t.loaiTS][1] += t.giaTriTS;
      var s = byTT[t.trangThai] || byTT.kct; s[0]++; s[1] += t.giaTriTS;
      byCB[t.cbtd || '(không rõ)'] = byCB[t.cbtd || '(không rõ)'] || [0, 0]; byCB[t.cbtd || '(không rõ)'][0]++; byCB[t.cbtd || '(không rõ)'][1] += t.giaTriTS;
      kh[t.maKH] = 1; if (t.trangThai === 'con') khCon[t.maKH] = 1;
    });""", """    var byLoai = {}, byTT = { con: [0, 0], tt: [0, 0], kct: [0, 0] }, byCB = {}, kh = {}, khCon = {};
    // HM-10: mỗi TS (clno) tính một lần; chỉ cộng VND vào giá trị
    var _dd = TD.tsbd.dedupe(S.rows), _dupSet = new Set(_dd.dupRows), _TS = TD.tsbd.summarize(S.rows);
    S.rows.forEach(function (t) {
      kh[t.maKH] = 1; if (t.trangThai === 'con') khCon[t.maKH] = 1;
      if (_dupSet.has(t)) return;
      var gv = TD.tsbd.isVND(t) ? t.giaTriTS : 0;
      byLoai[t.loaiTS] = byLoai[t.loaiTS] || [0, 0]; byLoai[t.loaiTS][0]++; byLoai[t.loaiTS][1] += gv;
      var s = byTT[t.trangThai] || byTT.kct; s[0]++; s[1] += gv;
      byCB[t.cbtd || '(không rõ)'] = byCB[t.cbtd || '(không rõ)'] || [0, 0]; byCB[t.cbtd || '(không rõ)'][0]++; byCB[t.cbtd || '(không rõ)'][1] += gv;
    });
    var _m = duNoMap(), _dn = {}; Object.keys(_m.byMa).forEach(function (k) { _dn[k] = _m.byMa[k].dn; });
    var _cov = TD.tsbd.coverage(S.rows, _dn, mdig), _fxN = 0; Object.keys(_TS.fx).forEach(function (c) { _fxN += _TS.fx[c][0]; });
    var _fxTxt = Object.keys(_TS.fx).map(function (c) { return c + ': ' + _TS.fx[c][0] + ' TS · ' + Math.round(_TS.fx[c][1]).toLocaleString('vi-VN'); }).join(' | ');
    var _holdTxt = Object.keys(_TS.hold).map(function (h) { return h + ': ' + _TS.hold[h].toLocaleString('vi-VN'); }).join(' · ');""")
rep("      '<div class=\"tsbd-kpis\">' + kpi('Tổng tài sản', S.rows.length.toLocaleString('vi-VN'), '') +", "      '<div class=\"tsbd-kpis\">' + kpi('Tổng tài sản (khử trùng clno)', _TS.unique.toLocaleString('vi-VN'), '') +")
rep("      kpi('Tổng giá trị TS (tỷ đ)', money(S.rows.reduce(function (a, t) { return a + t.giaTriTS; }, 0) / 1e9), 'amber') + '</div>' +",
    """      kpi('Tổng giá trị TS VND (tỷ đ)', money(_TS.giaTriTS_VND / 1e9), 'amber') +
      kpi('Dòng trùng clno đã loại', _TS.dupRows.toLocaleString('vi-VN'), 'slate') + kpi('TS ngoại tệ (tách riêng)', _fxN.toLocaleString('vi-VN'), 'slate') +
      kpi('KH còn dư nợ chưa có TS', _cov.khKhongTS.length.toLocaleString('vi-VN'), 'red') + kpi('Tỷ lệ phủ TS/dư nợ (KH có TS)', (_cov.tyLePhu * 100).toFixed(1) + '%', 'green') + '</div>' +
      '<div class="tsbd-note">Quy tắc: mỗi TS (clno) tính 1 lần (' + _TS.dupKeys + ' clno xuất hiện nhiều dòng vì thế chấp nhiều hợp đồng); giá trị chỉ cộng VND; ' + (_fxTxt ? 'ngoại tệ theo nguyên tệ — ' + esc(_fxTxt) + '; ' : '') + 'dư nợ mỗi KH tính 1 lần. Cột clholdcd: ' + esc(_holdTxt) + ' (chưa xác định ý nghĩa — không dùng để lọc).</div>' +""")
rep("kpi('KH còn dư nợ', Object.keys(khCon).length.toLocaleString('vi-VN'), 'green') +", "kpi('KH còn dư nợ (theo hồ sơ vay)', _cov.khCon.toLocaleString('vi-VN'), 'green') + kpi('…trong đó có TS theo mã KH', _cov.khCoTS.toLocaleString('vi-VN'), 'green') + // HM-10: bản cũ đếm khoá phía TS (mã chủ TS/tên) nên lớn hơn số KH thật\n      ")
rep("kpi('KH còn dư nợ chưa có TS', _cov.khKhongTS", "kpi('KH còn dư nợ chưa có TS theo mã KH', _cov.khKhongTS")
# snapshot
rep("""    var st = { count: rows.length, gt: 0, con: 0, tt: 0, kct: 0, b3: 0 };
    rows.forEach(function (t) { st.gt += t.giaTriTS; st[t.trangThai] = (st[t.trangThai] || 0) + 1; if (t.coBenThu3) st.b3++; });""", """    var _d = TD.tsbd.dedupe(rows); rows = _d.unique; // HM-10: khử trùng clno, chỉ cộng VND
    var st = { count: rows.length, gt: 0, con: 0, tt: 0, kct: 0, b3: 0 };
    rows.forEach(function (t) { if (TD.tsbd.isVND(t)) st.gt += t.giaTriTS; st[t.trangThai] = (st[t.trangThai] || 0) + 1; if (t.coBenThu3) st.b3++; });""")
# đưa sang form
rep("""    var tong = list.reduce(function (s, t) { return s + num(t.giaTriTC); }, 0); // plgamt
    return { list: list, tong: tong, soLuong: list.length, via: via };""", """    // HM-10: khử trùng clno (cùng TS thế chấp nhiều hợp đồng), chỉ cộng VND, giá trị thế chấp (plgamt) — nếu 0 dùng giá trị TS
    var _u = TD.tsbd.dedupe(list).unique;
    var tong = _u.reduce(function (s, t) { return s + (TD.tsbd.isVND(t) ? TD.tsbd.value(t) : 0); }, 0);
    return { list: _u, tong: tong, soLuong: _u.length, via: via, dupRemoved: list.length - _u.length, ngoaiTe: _u.filter(function (t) { return !TD.tsbd.isVND(t); }).length };""")
rep("""    if (gt) { gt.value = (gt.dataset.moneyFmt === '1') ? groupDigits(Math.round(res.tong)) : Math.round(res.tong); }
    if (sl) sl.value = res.soLuong;""", """    // HM-10: mở form (silent) KHÔNG ghi đè giá trị TSBĐ đang có; chỉ khi bấm nút "Đồng bộ" mới thay
    var _cur = gt ? Number(String(gt.value || '').replace(/\\D/g, '')) : 0;
    var _keep = !!(silent && gt && _cur > 0 && _cur !== Math.round(res.tong));
    if (gt && !_keep) { gt.value = (gt.dataset.moneyFmt === '1') ? groupDigits(Math.round(res.tong)) : Math.round(res.tong); }
    if (sl && !_keep) sl.value = res.soLuong;""")
rep("""    renderTsbdDetail(res);
    if (!silent && window.showToast) showToast('✅ Đồng bộ ' + res.soLuong""", """    if (_keep && note) { note.style.color = '#b45309'; note.textContent = 'ℹ️ Menu TSBĐ: ' + money(res.tong) + ' đ (' + res.soLuong + ' TS) khác giá trị đang lưu ' + money(_cur) + ' đ — bấm "Đồng bộ" để lấy, nếu không hồ sơ giữ nguyên.'; }
    renderTsbdDetail(res);
    if (!silent && window.showToast) showToast('✅ Đồng bộ ' + res.soLuong""")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
