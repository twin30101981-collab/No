"""HM-12: trang "Đối soát số liệu" (TD.doisoat) + dải trạng thái trên Dashboard + xuất biên bản. Nguồn: td_doisoat.js.
 Tính lại độc lập bằng cộng trực tiếp DATA.qltd (không qua TD.metrics) rồi so với: Dashboard (đọc số đang hiển thị), mốc hàng ngày của ngày dữ liệu,
 TSBĐ (KH còn dư nợ), báo cáo theo CBTD (Σ trong bảng + chưa phân), tỷ lệ LS ≥18%.
Dùng: python3 apply_hm12.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_doisoat.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)

glue = r"""
/* ───────── HM-12: thu thập số + giao diện đối soát ───────── */
function tdDoiSoatGather() {
  const num = t => Number(String(t == null ? '' : t).replace(/[^\d-]/g, '')) || 0;
  const q = (DATA.qltd || []).filter(r => r && String((r[0] || '') + (r[1] || '')).trim() && (Number(r[11]) || 0) > 0);
  let duno = 0; const khm = new Map(); let high = 0;
  q.forEach(r => { // tính lại độc lập: cộng trực tiếp, không qua TD.metrics
    const v = Number(r[11]) || 0; duno += v;
    const ma = String(r[0] || '').trim(), k = ma ? 'M:' + ma : 'N:' + String(r[1] || '').trim().replace(/\s+/g, ' ').toUpperCase();
    khm.set(k, (khm.get(k) || 0) + v);
    if ((parseFloat(r[8]) || 0) >= 18) high++;
  });
  let kh = 0; khm.forEach(v => { if (v > 0) kh++; });
  const inp = { dataDate: (TD.dataDate.get() ? TD.dataDate.vn(TD.dataDate.get()) : ''), rows: { hs: q.length, duno: duno, kh: kh }, dash: null, snap: null, tsbd: null, bckh: null, ls: { high: high, total: q.length } };
  // Dashboard: đọc số đang hiển thị (bỏ qua nếu đang lọc)
  try {
    const filt = ['db-filter-cbtd', 'db-filter-pb', 'db-filter-lv', 'db-filter-search'].some(id => { const e = document.getElementById(id); return e && String(e.value || '').trim(); });
    const sumCol = (id, ci) => [...document.querySelectorAll('#' + id + ' tr')].reduce((a, tr) => a + num(tr.children[ci] && tr.children[ci].textContent), 0);
    const tf = document.querySelector('#tfoot-db-main');
    if (!filt && tf && tf.textContent.trim()) inp.dash = { duno: num(document.querySelector('#tfoot-db-main td:nth-child(4)').textContent), kh: num(document.querySelector('#tfoot-db-main td:nth-child(3)').textContent),
      sumLoai: sumCol('tbody-db-main', 3), sumNhom: sumCol('tbody-db-nhomno', 2), sumPB: sumCol('tbody-db-pb', 2) };
  } catch (e) { console.warn('[doisoat dash]', e); }
  try {
    const key = TD.dataDate.get() ? TD.dataDate.vn(TD.dataDate.get()) : null;
    const sn = key && (_archiveReportList || []).filter(x => x && x.autoDaily && x.dayKey === key)[0];
    if (sn) inp.snap = { duno: sn.totalBalance, kh: sn.customers, dayKey: key };
  } catch (e) {}
  try {
    if (window.TSBD && TSBD.rows && TSBD.rows.length && window.TSBD_mdig) {
      const dn = {}; (DATA.qltd || []).forEach(r => { const k = TSBD_mdig(r[0]); if (k) dn[k] = (dn[k] || 0) + (Number(r[11]) || 0); });
      inp.tsbd = { khCon: TD.tsbd.coverage(TSBD.rows, dn, TSBD_mdig).khCon, src: TSBD.src || '' };
    }
  } catch (e) {}
  try {
    if (typeof bckhAggregateData === 'function') {
      const a = bckhAggregateData(DATA.qltd || []); let m = 0;
      Object.keys(a).forEach(k => { if (k !== '__chuaphan') m += a[k].dnAll || 0; });
      inp.bckh = { mapped: m, unassigned: a.__chuaphan ? a.__chuaphan.duno : 0 };
    }
  } catch (e) {}
  return inp;
}
function tdDoiSoatCompute() { const inp = tdDoiSoatGather(), c = TD.doisoat.checks(inp); return { inp: inp, checks: c, summary: TD.doisoat.summary(c) }; }
function tdDoiSoatRun() { // trang Đối soát
  try { renderDashboard(); } catch (e) {}
  const R = tdDoiSoatCompute(); window._tdDoiSoatLast = R;
  const f = v => v == null ? '—' : Math.round(v).toLocaleString('vi-VN');
  const col = { khop: '#15803d', lech: '#dc2626', bo_qua: '#6b7280' }, lab = { khop: '✅ Khớp', lech: '⚠️ Lệch', bo_qua: '… Chưa có dữ liệu' };
  const el = document.getElementById('doisoat-body'); if (!el) return;
  el.innerHTML = '<div style="font-size:1.05rem;font-weight:700;margin:8px 0;color:' + (R.summary.lech ? '#dc2626' : '#166534') + '">' + R.summary.text + '</div>' +
    '<div style="font-size:.85rem;color:#555;margin-bottom:8px">Ngày dữ liệu: <b>' + (R.inp.dataDate || '(không rõ — dùng hôm nay)') + '</b> · ' + R.inp.rows.hs.toLocaleString('vi-VN') + ' hồ sơ · ' + R.inp.rows.kh.toLocaleString('vi-VN') + ' KH · tổng dư nợ ' + f(R.inp.rows.duno) + ' đ</div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>MÃ</th><th>CHỈ TIÊU</th><th style="text-align:right">TÍNH LẠI</th><th style="text-align:right">MÀN HÌNH / NGUỒN</th><th style="text-align:right">CHÊNH</th><th>KẾT QUẢ</th><th>GHI CHÚ</th></tr></thead><tbody>' +
    R.checks.map(c => '<tr><td>' + c.id + '</td><td style="text-align:left">' + c.name + '</td><td style="text-align:right">' + (c.expected == null ? '—' : f(c.expected)) + '</td><td style="text-align:right">' + (c.id === 'L1' ? (c.actual * 100).toFixed(1) + '%' : f(c.actual)) + '</td><td style="text-align:right">' + (c.expected != null && c.actual != null ? f(c.actual - c.expected) : '') + '</td><td style="color:' + col[c.status] + ';font-weight:700">' + lab[c.status] + '</td><td style="text-align:left;font-size:.8rem;color:#555">' + (c.note || '') + '</td></tr>').join('') + '</tbody></table></div>';
  tdDoiSoatStrip(R);
}
function tdDoiSoatExport() {
  const R = window._tdDoiSoatLast || tdDoiSoatCompute();
  const txt = TD.doisoat.report(R.inp, R.checks, { at: new Date().toLocaleString('vi-VN'), by: (localStorage.getItem('td_user') || '') });
  const blob = new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'BienBanDoiSoat_' + (R.inp.dataDate || '').replace(/\//g, '-') + '.txt'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function tdDoiSoatStrip(R) { // dải trạng thái trên Dashboard
  try {
    const pg = document.getElementById('page-dashboard'); if (!pg) return;
    let d = document.getElementById('td-doisoat-strip');
    if (!d) { d = document.createElement('div'); d.id = 'td-doisoat-strip'; d.style.cssText = 'margin:6px 0;padding:6px 12px;border-radius:6px;font:600 13px/1.4 system-ui;cursor:pointer;border:1px solid'; d.onclick = () => showPage('doisoat'); d.title = 'Bấm để mở trang Đối soát số liệu'; pg.insertBefore(d, pg.firstChild); }
    R = R || tdDoiSoatCompute();
    d.textContent = '🔎 Đối soát: ' + R.summary.text;
    d.style.background = R.summary.lech ? '#fef2f2' : '#f0fdf4'; d.style.color = R.summary.lech ? '#991b1b' : '#166534'; d.style.borderColor = R.summary.lech ? '#fecaca' : '#bbf7d0';
  } catch (e) { console.warn('[doisoat strip]', e); }
}
window.tdDoiSoatRun = tdDoiSoatRun; window.tdDoiSoatExport = tdDoiSoatExport;
"""
rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n" + glue + "\nfunction tdRenderDateChip() { // HM-07")
rep("  ctkh: ['CHỈ TIÊU KẾ HOẠCH',", "  doisoat: ['ĐỐI SOÁT SỐ LIỆU', 'Tính lại độc lập từ dữ liệu và so với các màn hình'],\n  ctkh: ['CHỈ TIÊU KẾ HOẠCH',")
rep("""  <div class="nav-item" data-page="archive" onclick="showPage('archive',this)">""", """  <div class="nav-item" data-page="doisoat" onclick="showPage('doisoat',this)">
    <span class="icon">🔎</span><span class="label">ĐỐI SOÁT SỐ LIỆU</span>
  </div>
  <div class="nav-item" data-page="archive" onclick="showPage('archive',this)">""")
rep('<div class="page" id="page-tsbd">', """<div class="page" id="page-doisoat">
  <div class="card" style="padding:14px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-green" onclick="tdDoiSoatRun()">🔄 Chạy đối soát</button>
      <button class="btn btn-ghost" onclick="tdDoiSoatExport()">📄 Xuất biên bản (.txt)</button>
      <span style="font-size:.82rem;color:#555">Tính lại độc lập từ dữ liệu đang nạp rồi so với Dashboard, mốc hàng ngày, TSBĐ, báo cáo theo CBTD. Không sửa số liệu.</span>
    </div>
    <div id="doisoat-body" style="margin-top:10px">Bấm “Chạy đối soát”.</div>
  </div>
</div>

<div class="page" id="page-tsbd">""")
rep("  if (name === 'dashboard') renderDashboard();\n  else if (name === 'bckh')", "  if (name === 'doisoat') { try { tdDoiSoatRun(); } catch (e) { console.error('[doisoat]', e); } }\n  if (name === 'dashboard') renderDashboard();\n  else if (name === 'bckh')")
rep('  if (typeof _attachDashboardNav === "function") setTimeout(_attachDashboardNav, 150);\n}', '  if (typeof _attachDashboardNav === "function") setTimeout(_attachDashboardNav, 150);\n  try { tdDoiSoatStrip(); } catch (e) {} // HM-12\n}')
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
