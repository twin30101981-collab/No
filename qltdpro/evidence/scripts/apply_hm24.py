"""HM-24: xu hướng nhiều kỳ (TD.trend): trang "XU HƯỚNG NHIỀU KỲ" — dư nợ / số KH / số khoản của các mốc đã nhập (Lưu trữ hàng ngày, theo NGÀY DỮ LIỆU),
 theo Tổng / Nhóm nợ / Phòng ban / CBTD (top 8) / Loại vay; biểu đồ đường SVG (không thư viện) + bảng Δ so kỳ trước + xuất CSV.
Dùng: python3 apply_hm24.py <vao.html> <ra.html>   (áp SAU apply_hm25)"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(here, 'td_trend.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)
glue = r"""
/* ───────── HM-24: giao diện xu hướng ───────── */
(function () {
  var PAL = ['#0d5c1e', '#2563eb', '#b45309', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#9a3412', '#475569'];
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (v, metric) { v = Number(v) || 0; return metric === 'duno' ? (Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ' : Math.round(v / 1e6).toLocaleString('vi-VN') + ' tr') : Math.round(v).toLocaleString('vi-VN'); };
  function periods() {
    var snaps = []; try { (_archiveReportList || []).forEach(function (x) { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) snaps.push(x); }); } catch (e) {}
    return TD.trend.build(snaps, TD.metrics.summarize);
  }
  function chart(S, metric) {
    var W = 860, H = 300, L = 74, R = 30, T = 14, B = 46, n = S.labels.length, mx = 0;
    S.series.forEach(function (s) { s.values.forEach(function (v) { if (v > mx) mx = v; }); });
    var mn = Infinity; S.series.forEach(function (s) { s.values.forEach(function (v) { if (v < mn) mn = v; }); });
    var lo = 0, top, tk;
    if (S.series.length === 1 && mx > mn) { var pad = (mx - mn) * 0.25; lo = Math.max(0, mn - pad); top = mx + pad; tk = [0, 1, 2, 3, 4].map(function (i) { return lo + (top - lo) * i / 4; }); } // một đường: phóng trục để thấy biến động
    else { tk = TD.trend.ticks(mx, 4); top = tk[tk.length - 1] || 1; }
    var x = function (i) { return n > 1 ? L + (W - L - R) * i / (n - 1) : (L + W - R) / 2; }, y = function (v) { return T + (H - T - B) * (1 - (v - lo) / ((top - lo) || 1)); };
    var g = tk.map(function (t) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="#e2e8f0"/><text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="#475569">' + fmt(t, metric) + '</text>'; }).join('');
    var xl = S.labels.map(function (l, i) { return '<text x="' + x(i) + '" y="' + (H - 24) + '" text-anchor="middle" font-size="10.5" fill="#475569" transform="rotate(-25 ' + x(i) + ' ' + (H - 24) + ')">' + esc(l.slice(0, 5) + '/' + l.slice(8)) + '</text>'; }).join('');
    var ls = S.series.map(function (s, k) { var c = PAL[k % PAL.length], pts = s.values.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ');
      return '<polyline fill="none" stroke="' + c + '" stroke-width="2.2" points="' + pts + '"/>' + s.values.map(function (v, i) { return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.2" fill="' + c + '"><title>' + esc(s.name) + ' · ' + esc(S.labels[i]) + ': ' + fmt(v, metric) + '</title></circle>'; }).join(''); }).join('');
    var lg = S.series.map(function (s, k) { return '<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0;font-size:.8rem"><i style="width:12px;height:3px;background:' + PAL[k % PAL.length] + ';display:inline-block"></i>' + esc(s.name) + '</span>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Biểu đồ xu hướng" style="max-width:' + W + 'px">' + g + xl + ls + '</svg><div>' + lg + '</div>';
  }
  window.tdTrendRun = function () {
    var el = document.getElementById('trend-body'); if (!el) return;
    var metric = (document.getElementById('trend-metric') || {}).value || 'duno', by = (document.getElementById('trend-by') || {}).value || 'total';
    var P = periods(); window._tdTrendLast = { P: P, metric: metric, by: by };
    if (P.length < 2) { el.innerHTML = '<div style="padding:14px;color:#555">Mới có <b>' + P.length + '</b> mốc. Cần ≥ 2 kỳ để vẽ xu hướng — nhập thêm tệp dư nợ các kỳ khác (tên tệp có ngày, vd 31.05.2026.xlsx); mỗi tệp tạo một mốc theo ngày dữ liệu.</div>'; return; }
    var S = TD.trend.seriesFor(P, by, metric, 8); window._tdTrendLast.S = S;
    var tot = S.series.length === 1 ? S.series[0] : null, rows = S.labels.map(function (l, i) {
      return '<tr><td style="text-align:left">' + esc(l) + '</td>' + S.series.map(function (s) { return '<td style="text-align:right">' + fmt(s.values[i], metric) + '</td>'; }).join('') + (tot ? '<td style="text-align:right;color:' + (i && tot.values[i] < tot.values[i - 1] ? '#b91c1c' : '#15803d') + '">' + (i ? (tot.values[i] - tot.values[i - 1] >= 0 ? '+' : '') + fmt(tot.values[i] - tot.values[i - 1], metric) + ' (' + (tot.values[i - 1] ? ((tot.values[i] / tot.values[i - 1] - 1) * 100).toFixed(1) + '%' : '—') + ')' : '—') + '</td>' : '') + '</tr>'; }).join('');
    el.innerHTML = '<div style="font-size:.85rem;color:#555;margin:2px 0 8px"><b>' + P.length + '</b> kỳ: ' + esc(P[0].key) + ' → ' + esc(P[P.length - 1].key) + '</div>' + chart(S, metric) +
      '<div class="table-wrap" style="margin-top:10px;max-height:360px"><table class="data-table"><thead><tr><th>KỲ</th>' + S.series.map(function (s) { return '<th>' + esc(s.name) + '</th>'; }).join('') + (tot ? '<th>THAY ĐỔI SO KỲ TRƯỚC</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  };
  window.tdTrendCsv = function () {
    var L = window._tdTrendLast; if (!L || !L.S) return; var blob = new Blob(['﻿' + TD.trend.csv(L.S)], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'XuHuong_' + L.by + '_' + L.metric + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
})();
"""
rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n" + glue + "\nfunction tdRenderDateChip() { // HM-07")
rep("  canhbao: ['CẢNH BÁO SỚM',", "  xuhuong: ['XU HƯỚNG NHIỀU KỲ', 'Dư nợ · khách hàng · khoản của các mốc đã nhập'],\n  canhbao: ['CẢNH BÁO SỚM',")
rep("""    <span class="icon">⚠️</span><span class="label">CẢNH BÁO SỚM</span>
  </a>""", """    <span class="icon">⚠️</span><span class="label">CẢNH BÁO SỚM</span>
  </a>
  <a class="nav-item" data-page="xuhuong" href="#/xu-huong" onclick="showPage('xuhuong',this); return false;">
    <span class="icon">📈</span><span class="label">XU HƯỚNG NHIỀU KỲ</span>
  </a>""")
rep('<div class="page" id="page-canhbao">', """<div class="page" id="page-xuhuong">
  <div class="card" style="padding:14px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <label style="font-size:.85rem">Chỉ tiêu <select id="trend-metric" onchange="tdTrendRun()"><option value="duno">Dư nợ</option><option value="kh">Số khách hàng</option><option value="hs">Số khoản (hồ sơ)</option></select></label>
      <label style="font-size:.85rem">Chia theo <select id="trend-by" onchange="tdTrendRun()"><option value="total">Tổng</option><option value="nhom">Nhóm nợ</option><option value="pb">Phòng ban</option><option value="cbtd">CBTD (top 8)</option><option value="loai">Loại vay</option></select></label>
      <button class="btn btn-green btn-sm" onclick="tdTrendRun()">🔄 Vẽ lại</button>
      <button class="btn btn-ghost btn-sm" onclick="tdTrendCsv()">📄 Xuất CSV</button>
    </div>
    <div id="trend-body" style="margin-top:10px">Đang tính…</div>
  </div>
</div>

<div class="page" id="page-canhbao">""")
rep("  if (name === 'canhbao') { try { tdWarnRun(); } catch (e) { console.error('[canhbao]', e); } }", "  if (name === 'canhbao') { try { tdWarnRun(); } catch (e) { console.error('[canhbao]', e); } }\n  if (name === 'xuhuong') { try { tdTrendRun(); } catch (e) { console.error('[xuhuong]', e); } }")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
