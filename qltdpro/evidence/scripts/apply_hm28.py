"""HM-28: mẫu báo cáo chuẩn xuất Excel (TD.report): một tệp .xlsx nhiều trang — Tổng hợp (loại vay, nhóm nợ), Theo phòng ban, Theo CBTD (ngắn hạn+thấu chi / trung-dài),
 Biên bản đối soát, Xu hướng các kỳ, Cảnh báo sớm — cùng một nguồn số TD.metrics với Dashboard/Đối soát. Mục menu Tiện ích + nút trên trang Đối soát. (Xuất Word: chưa làm — HM-28b.)
Dùng: python3 apply_hm28.py <vao.html> <ra.html>   (áp SAU apply_hm23)"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_report.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)
glue = r"""
/* ───────── HM-28: xuất báo cáo chuẩn Excel ───────── */
async function tdReportExport() {
  try {
    if (typeof _ensureXLSX === 'function') await _ensureXLSX();
    if (!window.XLSX) { showToast('⚠️ Chưa nạp xong thư viện Excel', 'red'); return; }
    const rows = (DATA.qltd || []).filter(isActualCreditRow);
    if (!rows.length) { showToast('⚠️ Chưa có dữ liệu dư nợ để lập báo cáo', 'red'); return; }
    try { renderDashboard(); } catch (e) {}
    const today = todayMidnight(), dd = TD.dataDate.get();
    const snaps = []; try { (_archiveReportList || []).forEach(x => { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) snaps.push(x); }); } catch (e) {}
    let checks = null, warn = null; try { checks = tdDoiSoatCompute().checks; } catch (e) {} try { warn = tdWarnCompute().res.sections; } catch (e) {}
    const sheets = TD.report.sheets({ dataDate: dd ? TD.dataDate.vn(dd) : '', summary: TD.metrics.summarize(rows, { today: today }), checks: checks, periods: TD.trend.build(snaps, TD.metrics.summarize), warn: warn, at: new Date().toLocaleString('vi-VN'), by: (localStorage.getItem('td_audit_actor_v1') || '') });
    const wb = XLSX.utils.book_new();
    sheets.forEach(sh => {
      const ws = XLSX.utils.aoa_to_sheet(sh.rows);
      ws['!cols'] = sh.widths.map(w => ({ wch: w }));
      Object.keys(ws).forEach(a => { if (a[0] === '!') return; const c = XLSX.utils.decode_cell(a), v = ws[a].v; if (typeof v !== 'number') return; const col = c.c; if ((sh.money || []).indexOf(col) >= 0) ws[a].z = '#,##0'; else if ((sh.pct || []).indexOf(col) >= 0) ws[a].z = '0.0%'; else ws[a].z = '#,##0'; });
      XLSX.utils.book_append_sheet(wb, ws, sh.name);
    });
    const name = 'BaoCao_' + (dd ? TD.dataDate.vn(dd).replace(/\//g, '-') : 'hom-nay') + '.xlsx';
    XLSX.writeFile(wb, name);
    showToast('✅ Đã xuất báo cáo: ' + name + ' (' + sheets.length + ' trang)', 'green');
  } catch (e) { console.error('[report]', e); showToast('❌ Không xuất được báo cáo: ' + e.message, 'red'); }
}
window.tdReportExport = tdReportExport;
"""
rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n" + glue + "\nfunction tdRenderDateChip() { // HM-07")
rep("""        <div class="util-head">Công cụ</div>""", """        <div class="util-head">Công cụ</div>
        <button class="util-item" onclick="utilRun(tdReportExport)"><span class="ue">📊</span> Báo cáo chuẩn (Excel .xlsx)</button>""")
rep("""      <button class="btn btn-ghost" onclick="tdDoiSoatExport()">📄 Xuất biên bản (.txt)</button>""", """      <button class="btn btn-ghost" onclick="tdDoiSoatExport()">📄 Xuất biên bản (.txt)</button>
      <button class="btn btn-ghost" onclick="tdReportExport()">📊 Báo cáo chuẩn (Excel)</button>""")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
