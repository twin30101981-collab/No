"""HM-18: hiệu năng chuyển trang (đo trên 3.848 dòng dữ liệu thật).
 Gốc (CDP profiler): chuyển Dashboard 640–850 ms thì getBoundingClientRect trong updateTheadHeight chiếm 450–640 ms — MutationObserver toàn body (desktop-ux-patch-v10)
 chạy enhanceTotals() NGAY sau mỗi đợt thay đổi DOM và ép layout cho mọi bảng kể cả trang ẩn; markTotalRows đọc innerText từng dòng (ép layout) 112 ms;
 viCmp/localeCompare tạo bộ so sánh mới mỗi lần so (89 ms khi sắp 3.848 dòng); scanTables quét mọi dòng của mọi bảng mỗi 2,5 s.
 Sửa: (1) observer chỉ đặt lịch (300 ms), chỉ xử lý bảng của trang đang hiển thị, chạy khi vào trang; (2) textContent; (3) Intl.Collator dùng chung;
 (4) scanTables chỉ quét bảng trang đang hiển thị và chỉ khi DOM đã đổi (cờ window.__tdDirty do observer đặt) hoặc khi vừa đổi trang.
Dùng: python3 apply_hm18.py <vao.html> <ra.html>"""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)

# (1)+(2) desktop-ux-patch-v10
rep("      var txt = (first.innerText || first.textContent || '').replace(/\\s+/g,' ').trim();\n      if (TOTAL_RE.test(txt)) tr.classList.add('ux-total-row');",
    "      var txt = (first.textContent || '').replace(/\\s+/g,' ').trim(); // HM-18: textContent (innerText ép layout từng dòng)\n      if (TOTAL_RE.test(txt)) tr.classList.add('ux-total-row');")
rep("""  function enhanceTotals(){
    document.querySelectorAll('table.ux-sticky').forEach(function(tbl){
      markTotalRows(tbl);
      updateTheadHeight(tbl);
    });
  }""", """  function enhanceTotals(){
    document.querySelectorAll('table.ux-sticky').forEach(function(tbl){
      if (tbl.closest('.page:not(.active)')) return; // HM-18: bảng của trang ẩn không cần đo (đo sẽ ép layout)
      markTotalRows(tbl);
      updateTheadHeight(tbl);
    });
  }""")
rep("""    enhanceTotals();
    var mo = new MutationObserver(function(){ enhanceTotals(); });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });""", """    enhanceTotals();
    var _t = 0;
    function schedule(){ window.__tdDirty = 1; if (_t) return; _t = setTimeout(function(){ _t = 0; enhanceTotals(); }, 300); } // HM-18: gộp, không chạy ngay trong đợt vẽ
    var mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    try { if (window.TD && TD.router) TD.router.onPageEnter('*', schedule); } catch (e) {}""")
# (3) bộ so sánh dùng chung
rep("""  function viCmp(a, b) {
    return String(a == null ? '' : a).localeCompare(String(b == null ? '' : b), 'vi', { sensitivity: 'base', numeric: true });
  }""", """  var _viColl = new Intl.Collator('vi', { sensitivity: 'base', numeric: true }); // HM-18: tạo một lần
  function viCmp(a, b) {
    return _viColl.compare(String(a == null ? '' : a), String(b == null ? '' : b));
  }""")
rep("      return String(va || '').localeCompare(String(vb || ''), 'vi', { numeric: true });\n    });", "      return (window.__tdColl || (window.__tdColl = new Intl.Collator('vi', { numeric: true }))).compare(String(va || ''), String(vb || '')); // HM-18\n    });")
# (4) scanTables
rep("""  function scanTables(){
    if(!dpEnabled) return;
    patchScrolls();
    document.querySelectorAll('.desktop-mode table').forEach(function(tbl){
      var tbody=tbl.querySelector('tbody'); if(!tbody) return;""", """  function scanTables(force){
    if(!dpEnabled) return;
    if(force !== true && !window.__tdDirty) return; // HM-18: chỉ quét khi DOM đã đổi (cờ do MutationObserver đặt) hoặc vừa đổi trang
    window.__tdDirty = 0;
    patchScrolls();
    document.querySelectorAll('.desktop-mode table').forEach(function(tbl){
      if(tbl.closest('.page:not(.active)')) return; // HM-18: bảng của trang ẩn quét khi vào trang
      var tbody=tbl.querySelector('tbody'); if(!tbody) return;""")
rep("        setTimeout(scanTables,200);\n        return r;", "        setTimeout(function(){ scanTables(true); },200);\n        return r;")
# (5) updateTableTopScrollbars: xen kẽ ghi style ↔ đọc scrollWidth cho MỌI .table-wrap (kể cả trang ẩn) ⇒ ép layout lặp (433 ms khi vào Dashboard)
i = s.index('function updateTableTopScrollbars() {'); k = s.index('DD/MM/YYYY DATE INPUT HELPERS', i); j = s.rindex('/*', i, k)
s = s[:i] + '''function updateTableTopScrollbars() {
  // HM-18: chỉ trang đang hiển thị; 3 pha (tạo → đọc → ghi) để chỉ ép layout một lần; trang khác được cập nhật khi vào trang (TD.router)
  const wraps = Array.from(document.querySelectorAll('.table-wrap')).filter(w => !w.closest('.page:not(.active)'));
  wraps.forEach(wrap => {
    if (!wrap.previousElementSibling || !wrap.previousElementSibling.classList.contains('table-scroll-top')) {
      const top = document.createElement('div');
      const spacer = document.createElement('div');
      top.className = 'table-scroll-top';
      spacer.className = 'table-scroll-spacer';
      top.appendChild(spacer);
      wrap.parentNode.insertBefore(top, wrap);
      wrap.classList.add('with-top-scroll');
      let lock = false;
      top.addEventListener('scroll', () => {
        if (lock) return;
        lock = true;
        wrap.scrollLeft = top.scrollLeft;
        lock = false;
      });
      wrap.addEventListener('scroll', () => {
        if (lock) return;
        lock = true;
        top.scrollLeft = wrap.scrollLeft;
        lock = false;
      });
    }
  });
  const meas = [];
  wraps.forEach(wrap => { // pha đọc
    const top = wrap.previousElementSibling;
    const table = wrap.querySelector('table');
    const spacer = top && top.querySelector('.table-scroll-spacer');
    if (!top || !table || !spacer) return;
    meas.push({ top: top, spacer: spacer, width: Math.max(table.scrollWidth, wrap.scrollWidth), cw: wrap.clientWidth, sl: wrap.scrollLeft });
  });
  meas.forEach(m => { // pha ghi
    m.spacer.style.width = m.width + 'px';
    m.top.style.display = m.width > m.cw + 1 ? 'block' : 'none';
    m.top.scrollLeft = m.sl;
  });
}

''' + s[j:]
rep('try { TD.router.install(window); } catch (e) { console.error("[HM-13 router]", e); }', 'try { TD.router.install(window); TD.router.onPageEnter("*", function () { setTimeout(function () { try { updateTableTopScrollbars(); } catch (e) {} }, 50); }); } catch (e) { console.error("[HM-13 router]", e); }')
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
