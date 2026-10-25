"""HM-25: Cảnh báo sớm (TD.warn): trang "CẢNH BÁO SỚM" + dải trên Dashboard.
 Đến hạn ≤7/8–15/16–30 ngày và quá hạn theo NGÀY DỮ LIỆU (HM-07); chuyển nhóm nợ so với mốc kỳ trước gần nhất; lãi suất bất thường; TSBĐ hết hạn thế chấp / định giá cũ (>36 tháng)
 của KH còn dư nợ; KH còn dư nợ chưa có TSBĐ. Mỗi mục mở danh sách (≤200 dòng) + xuất CSV.
Dùng: python3 apply_hm25.py <vao.html> <ra.html>   (áp SAU apply_hm19)"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_warn.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)
glue = r"""
/* ───────── HM-25: giao diện cảnh báo sớm ───────── */
function tdWarnCompute() {
  const parseD = x => parseVNDate(x);
  const today = todayMidnight();
  let prev = null, prevLabel = '';
  try { // mốc kỳ trước gần nhất (nhỏ hơn ngày dữ liệu)
    (_archiveReportList || []).forEach(x => {
      if (!x || !x.autoDaily || !x.dayKey || !Array.isArray(x.reportData)) return;
      const d = parseVNDate(x.dayKey); if (!d || d >= today) return;
      if (!prev || d > prev.d) prev = { d: d, rows: x.reportData, label: x.dayKey };
    });
  } catch (e) {}
  const inp = { rows: DATA.qltd || [], today: today, parse: parseD, prevRows: prev ? prev.rows : null, prevLabel: prev ? prev.label : '', tsbd: null };
  try {
    if (window.TSBD && TSBD.rows && TSBD.rows.length && window.TSBD_mdig) {
      const dn = {}, names = {}; (DATA.qltd || []).forEach(r => { const k = TSBD_mdig(r[0]); if (!k) return; dn[k] = (dn[k] || 0) + (Number(r[11]) || 0); if (!names[k]) names[k] = r[1]; });
      inp.tsbd = { rows: TSBD.rows, dnByKey: dn, keyFn: TSBD_mdig, names: names, cutoffMonths: 36 };
    }
  } catch (e) {}
  return { inp: inp, res: TD.warn.compute(inp) };
}
function tdWarnRun() {
  const el = document.getElementById('warn-body'); if (!el) return;
  const R = tdWarnCompute(); window._tdWarnLast = R;
  const f = v => Math.round(Number(v) || 0).toLocaleString('vi-VN');
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dd = TD.dataDate.get();
  const cols = { over: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'], d7: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'], d15: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'], d30: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'],
    nhom: ['ma', 'ten', 'tu', 'den', 'duno', 'cbtd'], ls: ['ma', 'ten', 'sohd', 'ls', 'duno', 'cbtd'], tsHet: ['ma', 'ten', 'soTS', 'loai', 'han', 'gt', 'duno'], tsCu: ['ma', 'ten', 'soTS', 'loai', 'dg', 'gt', 'duno'], tsKhong: ['ma', 'ten', 'duno'] };
  const head = { ma: 'MÃ KH', ten: 'TÊN KH', sohd: 'SỐ HĐ', due: 'ĐẾN HẠN', days: 'NGÀY', duno: 'DƯ NỢ', cbtd: 'CBTD', tu: 'TỪ', den: 'SANG', ls: 'LS %', soTS: 'SỐ TS', loai: 'LOẠI TS', han: 'HẾT HẠN', gt: 'GIÁ TRỊ TS', dg: 'ĐỊNH GIÁ' };
  const num = new Set(['duno', 'gt', 'days', 'ls']);
  el.innerHTML = '<div style="font-size:.85rem;color:#555;margin:4px 0 10px">Ngày dữ liệu: <b>' + (dd ? TD.dataDate.vn(dd) : '(không rõ — dùng hôm nay)') + '</b> · ' + (R.inp.prevLabel ? 'mốc kỳ trước: <b>' + esc(R.inp.prevLabel) + '</b>' : 'chưa có mốc kỳ trước') + ' · <b>' + R.res.total + '</b> mục cần xem</div>' +
    R.res.sections.map(sc => {
      const rows = sc.items.slice(0, 200), cl = cols[sc.id] || [];
      const tone = sc.skipped ? '#6b7280' : (sc.count ? (sc.id === 'over' || sc.id === 'tsHet' ? '#b91c1c' : '#b45309') : '#15803d');
      return '<details class="card" style="margin:8px 0;padding:0"><summary style="cursor:pointer;padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:1.25rem;font-weight:800;color:' + tone + ';min-width:48px">' + (sc.skipped ? '—' : sc.count.toLocaleString('vi-VN')) + '</span><span style="font-weight:700;flex:1">' + esc(sc.title) + '</span>' +
        (!sc.skipped ? '<span style="font-size:.8rem;color:#555">' + sc.kh.toLocaleString('vi-VN') + ' KH · dư nợ ' + f(sc.duno) + ' đ</span>' : '') + '</summary>' +
        (sc.count ? '<div style="padding:0 14px 10px"><button class="btn btn-ghost btn-sm" onclick="tdWarnCsv(\'' + sc.id + '\')">📄 Xuất CSV</button></div><div class="table-wrap" style="max-height:340px"><table class="data-table"><thead><tr>' + cl.map(c => '<th>' + head[c] + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map(it => '<tr>' + cl.map(c => '<td style="text-align:' + (num.has(c) ? 'right' : 'left') + '">' + (num.has(c) && c !== 'ls' && c !== 'days' ? f(it[c]) : esc(it[c])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + (sc.count > 200 ? '<div style="padding:6px 14px;font-size:.8rem">Hiển thị 200/' + sc.count + ' dòng đầu — xuất CSV để xem đủ.</div>' : '') : '<div style="padding:0 14px 10px;color:#555;font-size:.85rem">' + (sc.skipped ? 'Chưa đủ dữ liệu để cảnh báo mục này.' : '✅ Không có.') + '</div>') + '</details>';
    }).join('');
  tdWarnStrip(R);
}
function tdWarnCsv(id) {
  const R = window._tdWarnLast || tdWarnCompute(), sc = R.res.sections.find(x => x.id === id); if (!sc) return;
  const blob = new Blob(['﻿' + TD.warn.csv(sc)], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'CanhBao_' + id + '_' + (TD.dataDate.get() ? TD.dataDate.vn(TD.dataDate.get()).replace(/\//g, '-') : 'hom-nay') + '.csv'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function tdWarnStrip(R) { // dải trên Dashboard
  try {
    const pg = document.getElementById('page-dashboard'); if (!pg) return;
    let d = document.getElementById('td-warn-strip');
    if (!d) { d = document.createElement('div'); d.id = 'td-warn-strip'; d.style.cssText = 'margin:6px 0;padding:6px 12px;border-radius:6px;font:600 13px/1.4 system-ui;cursor:pointer;border:1px solid #fde68a;background:#fffbeb;color:#92400e'; d.onclick = () => showPage('canhbao'); d.title = 'Bấm để mở trang Cảnh báo sớm'; const ref = document.getElementById('td-doisoat-strip'); pg.insertBefore(d, ref ? ref.nextSibling : pg.firstChild); }
    R = R || tdWarnCompute();
    const S = Object.fromEntries(R.res.sections.map(s => [s.id, s]));
    d.textContent = '⚠️ Cảnh báo sớm: ' + R.res.total + ' mục — quá hạn ' + (S.over ? S.over.count : 0) + ' · đến hạn ≤7 ngày ' + (S.d7 ? S.d7.count : 0) + ' · lãi suất bất thường ' + (S.ls ? S.ls.count : 0) + (S.tsKhong ? ' · chưa có TSBĐ ' + S.tsKhong.count : '');
  } catch (e) { console.warn('[warn strip]', e); }
}
window.tdWarnRun = tdWarnRun; window.tdWarnCsv = tdWarnCsv;
"""
rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n" + glue + "\nfunction tdRenderDateChip() { // HM-07")
rep("  doisoat: ['ĐỐI SOÁT SỐ LIỆU', 'Tính lại độc lập từ dữ liệu và so với các màn hình'],", "  doisoat: ['ĐỐI SOÁT SỐ LIỆU', 'Tính lại độc lập từ dữ liệu và so với các màn hình'],\n  canhbao: ['CẢNH BÁO SỚM', 'Đến hạn · chuyển nhóm · lãi suất bất thường · TSBĐ — theo ngày dữ liệu'],")
rep("""    <span class="icon">🔎</span><span class="label">ĐỐI SOÁT SỐ LIỆU</span>
  </a>""", """    <span class="icon">🔎</span><span class="label">ĐỐI SOÁT SỐ LIỆU</span>
  </a>
  <a class="nav-item" data-page="canhbao" href="#/canh-bao" onclick="showPage('canhbao',this); return false;">
    <span class="icon">⚠️</span><span class="label">CẢNH BÁO SỚM</span>
  </a>""")
rep('<div class="page" id="page-doisoat">', """<div class="page" id="page-canhbao">
  <div class="card" style="padding:14px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-green" onclick="tdWarnRun()">🔄 Tính lại</button>
      <span style="font-size:.82rem;color:#555">Tính theo ngày dữ liệu của tệp (chip 📅 trên đầu trang); không sửa số liệu.</span>
    </div>
    <div id="warn-body" style="margin-top:10px">Đang tính…</div>
  </div>
</div>

<div class="page" id="page-doisoat">""")
rep("  if (name === 'doisoat') { try { tdDoiSoatRun(); } catch (e) { console.error('[doisoat]', e); } }", "  if (name === 'doisoat') { try { tdDoiSoatRun(); } catch (e) { console.error('[doisoat]', e); } }\n  if (name === 'canhbao') { try { tdWarnRun(); } catch (e) { console.error('[canhbao]', e); } }")
rep("  try { tdDoiSoatStrip(); } catch (e) {} // HM-12", "  try { tdDoiSoatStrip(); } catch (e) {} // HM-12\n  try { tdWarnStrip(); } catch (e) {} // HM-25")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
