"""HM-07: "Ngày dữ liệu" là nguồn sự thật (module nguồn: td_datadate.js cùng thư mục).
 - todayMidnight() trả ngày dữ liệu của tệp (chế độ mặc định) hoặc hôm nay; realTodayMidnight() = hôm nay thật (khoá việc-hôm-nay, tên tệp xuất).
 - Tên tệp nhận 30.06.2026 · 30_06_2026 · DUNO_18.08.2026 · msit80_30_06_2026 · 2026-06-30 · 20260630.
 - Mốc snapshot hàng ngày theo ngày dữ liệu (2 tệp khác ngày nhập cùng 1 ngày ⇒ 2 mốc riêng).
 - Chip "Ngày dữ liệu" trên topbar, bấm để chuyển Dữ liệu ⇄ Hôm nay.
Dùng: python3 apply_hm07.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'td_datadate.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:80], s.count(old))
    s = s.replace(old, new)

# 1. module + todayMidnight
rep("function todayMidnight() {\n  const d = new Date();\n  d.setHours(0, 0, 0, 0);\n  return d;\n}",
    mod.rstrip() + """

function realTodayMidnight() { // HM-07: hôm nay thật
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function todayMidnight() { // HM-07: "hôm nay" của nghiệp vụ = ngày dữ liệu của tệp (hoặc hôm nay nếu người dùng chọn)
  try { if (window.TD && TD.dataDate) return TD.dataDate.effective(); } catch (e) {}
  return realTodayMidnight();
}""")
# việc-hôm-nay và tên tệp xuất dùng hôm nay thật
rep("var dayKey = 'todo_done_' + todayMidnight().toISOString().slice(0, 10);", "var dayKey = 'todo_done_' + realTodayMidnight().toISOString().slice(0, 10);")
rep("const stamp = todayMidnight().toISOString().slice(0,10);\n  a.href = url;\n  a.download = `NhacNo_", "const stamp = realTodayMidnight().toISOString().slice(0,10);\n  a.href = url;\n  a.download = `NhacNo_")

# 2. nhận ngày từ tên tệp
rep("  const dateMatch = f.name.match(/\\b(\\d{1,2})[._](\\d{1,2})[._](\\d{4})\\b/);\n  window._importSourceDate = dateMatch\n    ? `${dateMatch[1].padStart(2,'0')}/${dateMatch[2].padStart(2,'0')}/${dateMatch[3]}`\n    : null;",
    "  // HM-07: TD.dataDate.fromFileName nhận cả \"DUNO_18.08.2026\" / \"msit80_30_06_2026\" (\\b cũ coi \"_\" là ký tự từ nên bỏ sót)\n  window._importSourceDate = TD.dataDate.fromFileName(f.name);")

# 3. ghi nhận ngày dữ liệu của tệp mới (xoá nếu tên tệp không có ngày — không để ngày cũ trôi sang tệp mới)
rep("    if (window._importSourceDate) {\n      localStorage.setItem('_currentFileDate', window._importSourceDate);\n    }",
    "    TD.dataDate.set(window._importSourceDate || null); // HM-07")

# 3b. nhánh dữ liệu trống (lần nhập đầu) cũng phải ghi ngày dữ liệu của tệp
rep("""  if (!DATA.qltd || !DATA.qltd.length) {
    window._prevDunoByMa = {};
    return;
  }
  const snap = {};""", """  if (!DATA.qltd || !DATA.qltd.length) {
    window._prevDunoByMa = {};
    try { window._prevFileDate = null; TD.dataDate.set(window._importSourceDate || null); } catch (e) {} // HM-07: lần nhập đầu vẫn ghi ngày dữ liệu
    return;
  }
  const snap = {};""")

# 4. mốc hàng ngày theo ngày dữ liệu
rep("""  var ts = new Date();
  var dd = String(ts.getDate()).padStart(2,'0');
  var mm = String(ts.getMonth()+1).padStart(2,'0');
  var yyyy = ts.getFullYear();
  var dayKey = dd+'/'+mm+'/'+yyyy;
  var snap = {
    type: 'report',
    name: 'Hàng ngày ' + dayKey + ' (IPCAS)',
    date: ts.toLocaleString('vi-VN'),
    timestamp: ts.getTime(),""", """  var ts = new Date();
  // HM-07: mốc theo NGÀY DỮ LIỆU của tệp (không phải ngày bấm nhập) — 2 tệp khác ngày nhập cùng 1 ngày ⇒ 2 mốc riêng
  var _dd = TD.dataDate.get();
  var dayKey = _dd ? TD.dataDate.vn(_dd) : TD.dataDate.vn(ts);
  var _snapTs = _dd ? new Date(_dd.getFullYear(), _dd.getMonth(), _dd.getDate(), ts.getHours(), ts.getMinutes(), ts.getSeconds()) : ts;
  var snap = {
    type: 'report',
    name: 'Hàng ngày ' + dayKey + ' (IPCAS)',
    date: _snapTs.toLocaleString('vi-VN'),
    timestamp: _snapTs.getTime(),
    importedAt: ts.getTime(),""")

# 5. CSS chip
rep(".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}",
    ".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n"
    "#td-datechip{border:1px solid #cbd5e1;background:#f1f5f9;color:#0f172a;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;max-width:190px;overflow:hidden;text-overflow:ellipsis}\n"
    "#td-datechip.stale{background:#fef3c7;border-color:#f59e0b;color:#7c2d12}\n"
    "#td-datechip.today{background:#e0f2fe;border-color:#38bdf8;color:#0c4a6e}\n"
    "@media (max-width:600px){#td-datechip{max-width:120px;padding:3px 7px;font-size:11px}}")

# 6. chip trên topbar + lắp ráp
rep("""  <div class="topbar-right">
    <!-- ═══ NÚT NHẬP IPCAS""", """  <div class="topbar-right">
    <button type="button" id="td-datechip" onclick="tdToggleDataDate()" aria-label="Ngày dữ liệu" title="Ngày dữ liệu">📅</button>
    <!-- ═══ NÚT NHẬP IPCAS""")
rep("function realTodayMidnight() {", """function tdRenderDateChip() { // HM-07
  try {
    var c = document.getElementById('td-datechip'); if (!c || !window.TD || !TD.dataDate) return;
    var l = TD.dataDate.label();
    c.textContent = l.text; c.title = l.title;
    c.className = l.mode === 'today' ? 'today' : (l.stale ? 'stale' : '');
  } catch (e) {}
}
function tdToggleDataDate() { // HM-07: chuyển Dữ liệu ⇄ Hôm nay rồi tính lại toàn app
  if (!TD.dataDate.get()) { try { showToast('Chưa có ngày dữ liệu (tên tệp không chứa ngày) — đang dùng hôm nay', 'warn'); } catch (e) {} tdRenderDateChip(); return; }
  TD.dataDate.setMode(TD.dataDate.mode() === 'data' ? 'today' : 'data');
  tdRenderDateChip();
  try { rebuildAll(); } catch (e) { console.warn('[HM-07] rebuildAll', e); }
}
window.tdToggleDataDate = tdToggleDataDate; window.tdRenderDateChip = tdRenderDateChip;
(function () {
  function hook() {
    try { if (typeof rebuildAll === 'function' && !rebuildAll.__tdDate) { var o = rebuildAll; window.rebuildAll = rebuildAll = function () { var r = o.apply(this, arguments); tdRenderDateChip(); return r; }; rebuildAll.__tdDate = 1; } } catch (e) {}
    tdRenderDateChip();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
  window.addEventListener('load', function () { setTimeout(hook, 1500); });
})();
function realTodayMidnight() {""")
open(dst, 'w', encoding='utf-8').write(s)
print('OK', len(s.encode('utf-8')))
