"""HM-28b: xuất báo cáo Word (.docx) + chọn kỳ bất kỳ trong các mốc đã lưu + định dạng (tiêu đề bảng nền navy, dòng LỆCH tô vàng/chữ đỏ, KHỚP xanh, tổng in đậm, khối chữ ký tuỳ chọn).
 Nguồn số duy nhất: TD.report.sheets (cùng nguồn Excel/màn hình); Word do TD.reportdocx dựng bằng docx 9.0.2 đã nhúng sẵn trong app. Excel giữ nguyên (SheetJS bản cộng đồng không có kiểu ô).
Dùng: python3 apply_hm28b.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, ('không đúng số lần', old[:80], s.count(old))
    s = s.replace(old, new)
mod = open(os.path.join(here, 'td_reportdocx.js'), encoding='utf-8').read().replace("if (typeof module !== 'undefined' && module.exports) module.exports = TD;\n", "")
rep("/* ───────── HM-28: xuất báo cáo chuẩn Excel ───────── */", mod + "\n/* ───────── HM-28: xuất báo cáo chuẩn Excel ───────── */")
ui = r'''
/* ───────── HM-28b: báo cáo chuẩn Word + chọn kỳ ───────── */
function tdReportSnaps() { // các mốc đã lưu, ngày tăng dần
  const a = []; try { (_archiveReportList || []).forEach(x => { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) a.push(x); }); } catch (e) {}
  const k = x => { const m = /^(\d+)\/(\d+)\/(\d+)$/.exec(x.dayKey); return m ? +m[3] * 1e4 + +m[2] * 100 + +m[1] : 0; };
  return a.sort((x, y) => k(x) - k(y));
}
function tdReportBuild(periodKey) { // periodKey '' = dữ liệu hiện hành; 'dd/mm/yyyy' = mốc đã lưu
  const snaps = tdReportSnaps(), by = (localStorage.getItem('td_audit_actor_v1') || ''), at = new Date().toLocaleString('vi-VN');
  const periods = TD.trend.build(snaps, TD.metrics.summarize);
  if (periodKey) {
    const sn = snaps.filter(x => x.dayKey === periodKey)[0]; if (!sn) throw new Error('Không có mốc ' + periodKey);
    const m = /^(\d+)\/(\d+)\/(\d+)$/.exec(periodKey), today = new Date(+m[3], +m[2] - 1, +m[1]);
    const rows = sn.reportData.filter(r => r && (Number(r[11]) || 0) > 0);
    return { dateStr: periodKey, label: 'Kỳ ' + periodKey + ' (mốc đã lưu)', sheets: TD.report.sheets({ dataDate: periodKey, summary: TD.metrics.summarize(rows, { today: today }), checks: null, periods: periods, warn: null, at: at, by: by }) };
  }
  const rows = (DATA.qltd || []).filter(isActualCreditRow); if (!rows.length) throw new Error('Chưa có dữ liệu dư nợ để lập báo cáo');
  try { renderDashboard(); } catch (e) {}
  const dd = TD.dataDate.get(); let checks = null, warn = null; try { checks = tdDoiSoatCompute().checks; } catch (e) {} try { warn = tdWarnCompute().res.sections; } catch (e) {}
  const ds = dd ? TD.dataDate.vn(dd) : '';
  return { dateStr: ds, label: 'Hiện hành' + (ds ? ' (ngày dữ liệu ' + ds + ')' : ''), sheets: TD.report.sheets({ dataDate: ds, summary: TD.metrics.summarize(rows, { today: todayMidnight() }), checks: checks, periods: periods, warn: warn, at: at, by: by }) };
}
async function tdReportExportWord(periodKey, signers) {
  for (let i = 0; i < 40 && !window.docx; i++) await new Promise(r => setTimeout(r, 250)); // thư viện nạp lúc rảnh
  if (!window.docx) throw new Error('Thư viện Word chưa sẵn sàng — thử lại sau vài giây');
  const B = tdReportBuild(periodKey);
  const doc = TD.reportdocx.build(window.docx, B.sheets, { dataDate: B.dateStr, periodLabel: B.label, signers: signers && signers.length ? signers : null, by: (localStorage.getItem('td_audit_actor_v1') || ''), title: 'Báo cáo QLTD PRO ' + B.dateStr });
  const blob = await window.docx.Packer.toBlob(doc), name = 'BaoCao_' + (B.dateStr ? B.dateStr.replace(/\//g, '-') : 'hom-nay') + '.docx';
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return { name: name, sheets: B.sheets.length };
}
async function tdReportExportPeriodXlsx(periodKey) {
  if (typeof _ensureXLSX === 'function') await _ensureXLSX(); if (!window.XLSX) throw new Error('Chưa nạp xong thư viện Excel');
  const B = tdReportBuild(periodKey), wb = XLSX.utils.book_new();
  B.sheets.forEach(sh => { const ws = XLSX.utils.aoa_to_sheet(sh.rows); ws['!cols'] = sh.widths.map(w => ({ wch: w }));
    Object.keys(ws).forEach(a => { if (a[0] === '!') return; const c = XLSX.utils.decode_cell(a), v = ws[a].v; if (typeof v !== 'number') return; ws[a].z = (sh.pct || []).indexOf(c.c) >= 0 ? '0.0%' : '#,##0'; });
    XLSX.utils.book_append_sheet(wb, ws, sh.name); });
  const name = 'BaoCao_' + (B.dateStr ? B.dateStr.replace(/\//g, '-') : 'hom-nay') + '.xlsx'; XLSX.writeFile(wb, name); return { name: name, sheets: B.sheets.length };
}
function tdReportDialog() {
  let d = document.getElementById('td-report-dlg'); if (d) d.remove();
  const snaps = tdReportSnaps().slice().reverse(), dd = TD.dataDate.get(), cur = 'Hiện hành' + (dd ? ' — ngày dữ liệu ' + TD.dataDate.vn(dd) : '');
  d = document.createElement('div'); d.id = 'td-report-dlg'; d.className = 'no-print';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:var(--z-3,2000);display:flex;align-items:center;justify-content:center';
  d.innerHTML = `<div style="background:#fff;color:#111;border-radius:10px;padding:18px 20px;width:min(460px,94vw);box-shadow:0 10px 40px rgba(0,0,0,.3);font:14px/1.5 system-ui">
    <div style="font-weight:800;font-size:1.05rem;margin-bottom:10px">📝 Xuất báo cáo chuẩn</div>
    <label style="display:block;font-weight:600">Kỳ báo cáo</label>
    <select id="td-rp-period" style="width:100%;padding:6px;margin:4px 0 10px"><option value="">${cur}</option>${snaps.map(x => `<option value="${x.dayKey}">Mốc đã lưu ${x.dayKey}</option>`).join('')}</select>
    <div style="font-weight:600">Định dạng</div>
    <label><input type="radio" name="td-rp-fmt" value="docx" checked> Word (.docx) — định dạng, in được</label><br>
    <label><input type="radio" name="td-rp-fmt" value="xlsx"> Excel (.xlsx)</label>
    <div style="margin:10px 0 4px"><label><input type="checkbox" id="td-rp-sign"> Thêm khối chữ ký (Word)</label></div>
    <input id="td-rp-signers" value="Người lập, Kiểm soát, Giám đốc" style="width:100%;padding:6px" title="Chức danh, cách nhau bằng dấu phẩy">
    <div style="font-size:.8rem;color:#555;margin-top:8px">Mốc đã lưu: chỉ có tổng hợp theo loại/nhóm/phòng/CBTD và xu hướng; biên bản đối soát và cảnh báo chỉ có ở kỳ hiện hành.</div>
    <div id="td-rp-msg" style="min-height:20px;margin-top:6px;font-weight:600"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn btn-ghost" onclick="document.getElementById('td-report-dlg').remove()">Đóng</button><button class="btn btn-green" id="td-rp-go">Xuất</button></div></div>`;
  document.body.appendChild(d);
  document.getElementById('td-rp-go').onclick = async () => {
    const msg = document.getElementById('td-rp-msg'), per = document.getElementById('td-rp-period').value, fmt = document.querySelector('input[name=td-rp-fmt]:checked').value;
    const sg = document.getElementById('td-rp-sign').checked ? document.getElementById('td-rp-signers').value.split(',').map(x => x.trim()).filter(Boolean) : null;
    msg.style.color = '#555'; msg.textContent = '⌛ Đang lập báo cáo…';
    try { const r = fmt === 'docx' ? await tdReportExportWord(per, sg) : await tdReportExportPeriodXlsx(per); msg.style.color = '#15803d'; msg.textContent = '✅ Đã xuất ' + r.name + ' (' + r.sheets + ' phần)'; }
    catch (e) { console.error('[HM-28b]', e); msg.style.color = '#dc2626'; msg.textContent = '⛔ ' + e.message; }
  };
}
window.tdReportDialog = tdReportDialog; window.tdReportExportWord = tdReportExportWord; window.tdReportBuild = tdReportBuild;
'''
rep("window.tdReportExport = tdReportExport;\n", "window.tdReportExport = tdReportExport;\n" + ui)
rep('<button class="util-item" onclick="utilRun(tdReportExport)"><span class="ue">📊</span> Báo cáo chuẩn (Excel .xlsx)</button>',
    '<button class="util-item" onclick="utilRun(tdReportExport)"><span class="ue">📊</span> Báo cáo chuẩn (Excel .xlsx)</button>\n        <button class="util-item" onclick="utilRun(tdReportDialog)"><span class="ue">📝</span> Báo cáo Word / chọn kỳ…</button>')
rep('<button class="btn btn-ghost" onclick="tdReportExport()">📊 Báo cáo chuẩn (Excel)</button>',
    '<button class="btn btn-ghost" onclick="tdReportExport()">📊 Báo cáo chuẩn (Excel)</button>\n      <button class="btn btn-ghost" onclick="tdReportDialog()">📝 Báo cáo Word / chọn kỳ…</button>')
open(dst, 'w', encoding='utf-8').write(s)
print('OK')
