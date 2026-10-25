"""HM-09 (phần đã làm): snapshot + báo cáo BCKH dùng TD.metrics.
 - 4 nơi tạo snapshot đếm KH theo TÊN (r[1]) ⇒ dùng TD.metrics.countCustomers (theo mã, dư nợ>0), thêm duNoKhongPhanCBTD.
 - bckhAggregateData bỏ im lặng mọi dòng có CBTD trống/không khớp ⇒ tổng báo cáo thấp hơn thực tế: nay gom vào result.__chuaphan và hiện dải cảnh báo "Chưa phân CBTD" trên trang báo cáo (số ô không đổi).
Dùng: python3 apply_hm09.py <vao.html> <ra.html>"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:80], s.count(old))
    s = s.replace(old, new)
rep("customers: new Set(finalRows.map(function(r){ return r[1]; })).size,", "customers: TD.metrics.countCustomers(finalRows), // HM-09: theo mã KH, dư nợ>0")
rep("customers: new Set(finalRows.map(r => r[1])).size,", "customers: TD.metrics.countCustomers(finalRows), // HM-09", 2)
rep("customers: new Set(currentData.map(r => r[1])).size,", "customers: TD.metrics.countCustomers(currentData), // HM-09")
# bckhAggregateData: gom dòng không khớp CBTD
rep("""    let rowId = cbtdMap[bckhNormName(cbtdName)];
    if (!rowId) {
      // DEBUG: lưu tên CBTD không khớp để dễ phát hiện alias còn thiếu
      // Mở Console gõ: [...window._bckhUnmapped] để xem danh sách
      if (cbtdName) (window._bckhUnmapped ||= new Set()).add(cbtdName);
      continue; // CBTD không khớp → bỏ qua
    }""", """    let rowId = cbtdMap[bckhNormName(cbtdName)];
    if (!rowId) {
      // DEBUG: lưu tên CBTD không khớp để dễ phát hiện alias còn thiếu
      // Mở Console gõ: [...window._bckhUnmapped] để xem danh sách
      if (cbtdName) (window._bckhUnmapped ||= new Set()).add(cbtdName);
      // HM-09: không bỏ im lặng — gom vào "Chưa phân CBTD" để báo cáo nêu rõ phần nằm ngoài bảng
      const u = (result.__chuaphan ||= { hs: 0, duno: 0, names: new Set(), khs: new Set() });
      u.hs++; u.duno += dn; u.names.add(cbtdName || '(trống)'); if (ck) u.khs.add(ck);
      continue; // CBTD không khớp → không nằm trong bảng theo CBTD
    }""")
# tránh Object.values(result)/Object.entries(result) xử lý __chuaphan như một CBTD
rep("  Object.values(result).forEach(a => {\n    let cAll=0, cNH=0, cTDH=0, cDN=0;", "  Object.values(result).forEach(a => {\n    if (!a.khMapAll) return; // HM-09: bỏ qua __chuaphan\n    let cAll=0, cNH=0, cTDH=0, cDN=0;")
rep("  for (const [rowId, data] of Object.entries(agg)) {\n    const value = (data[kind] || 0) * scale;", "  for (const [rowId, data] of Object.entries(agg)) {\n    if (rowId === '__chuaphan') continue; // HM-09\n    const value = (data[kind] || 0) * scale;")
rep("""  const agg = bckhAggregateData(snap.reportData);
  bckhFillColumn('duno_all',  col, agg, 'dnAll', 1e-6);""", """  const agg = bckhAggregateData(snap.reportData);
  tdBckhShowUnassigned(agg.__chuaphan, snap); // HM-09
  bckhFillColumn('duno_all',  col, agg, 'dnAll', 1e-6);""")
rep("/* Đổ 1 snapshot vào cột cụ thể của tất cả 4 bảng II-V */", """/* HM-09: dải cảnh báo phần dư nợ không thuộc CBTD nào trong bảng (CBTD trống/không khớp) */
function tdBckhShowUnassigned(u, snap) {
  try {
    const old = document.getElementById('td-bckh-unassigned'); if (old) old.remove();
    if (!u || !u.hs) return;
    const tbl = document.querySelector('table[data-bckh-key="duno_all"]') || document.querySelector('#page-baocao .card, #page-baocao > *'); if (!tbl || !tbl.parentNode) return;
    const d = document.createElement('div'); d.id = 'td-bckh-unassigned';
    d.style.cssText = 'margin:8px 0;padding:8px 12px;border:1px solid #f59e0b;background:#fffbeb;color:#78350f;border-radius:6px;font:600 13px/1.4 system-ui';
    d.textContent = '⚠️ Chưa phân CBTD / không khớp danh sách: ' + u.hs + ' khoản · ' + u.khs.size + ' KH · ' + Math.round(u.duno / 1e6).toLocaleString('vi-VN') + ' triệu đồng — KHÔNG nằm trong các bảng theo CBTD (' + Array.from(u.names).slice(0, 5).join(', ') + ').';
    tbl.parentNode.insertBefore(d, tbl);
  } catch (e) { console.warn('[HM-09]', e); }
}
window.tdBckhShowUnassigned = tdBckhShowUnassigned;

/* Đổ 1 snapshot vào cột cụ thể của tất cả 4 bảng II-V */""")
rep("Object.entries(a).forEach(([rid,v])=>{ out[rid] = { kh: v.khAll||0, dn: (v.dnAll||0) }; });", "Object.entries(a).forEach(([rid,v])=>{ if (rid === '__chuaphan') return; out[rid] = { kh: v.khAll||0, dn: (v.dnAll||0) }; }); // HM-09")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
