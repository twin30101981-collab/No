"""HM-19: giao diện điện thoại (≤600 px).
 - Bảng Dư nợ/NH/TD: preset "Điện thoại" (TD.cols) — chỉ chọn dòng, TÊN KH, DƯ NỢ, NHÓM NỢ; đệm ô nhỏ lại ⇒ bảng gần như không cuộn ngang.
 - Thanh nhắc nợ: gập thành một dòng "🔔 NHẮC NỢ ▾", chạm để mở.
 - Thanh điều hướng dưới 5 mục (Tổng quan · Dư nợ · Nợ đến hạn · Tài sản · Menu) cao 56 px, đúng địa chỉ router; nút nổi dời lên trên thanh.
 - Nút topbar cao ≥ 38 px.
Dùng: python3 apply_hm19.py <vao.html> <ra.html>   (áp SAU apply_hm17; preset 'dt' nằm trong td_cols.js)"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)
css = """
/* HM-19: điện thoại */
#td-bottomnav{display:none}
@media (max-width:600px){
  body{padding-bottom:64px}
  #td-bottomnav{display:flex;position:fixed;left:0;right:0;bottom:0;height:56px;z-index:90;background:#0d2137;border-top:1px solid rgba(255,255,255,.15);box-shadow:0 -2px 10px rgba(0,0,0,.25)}
  #td-bottomnav a,#td-bottomnav button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:rgba(255,255,255,.75);text-decoration:none;font:600 10px system-ui;background:none;border:0;cursor:pointer;min-width:0;padding:0}
  #td-bottomnav .bn-ic{font-size:19px;line-height:1}
  #td-bottomnav a.on{color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 3px 0 #4ade80}
  .topbar button,.topbar .btn{min-height:36px}
  .topbar-right{gap:4px!important}
  .topbar-right button,.topbar-right .btn{padding:5px 8px!important;font-size:11px!important}
  #save-ts,#btn-export,#td-cmd-btn kbd{display:none!important}
  #td-datechip{max-width:96px}
  .topbar h1{font-size:15px!important}
  #table-qltd th:first-child,#table-qltd td:first-child,#table-kd th:first-child,#table-kd td:first-child,#table-td th:first-child,#table-td td:first-child{width:74px;min-width:74px}
  #table-qltd td:nth-child(5),#table-kd td:nth-child(5),#table-td td:nth-child(5){white-space:normal!important;min-width:100px!important;max-width:150px!important}
  #table-qltd,#table-kd,#table-td{min-width:0!important}
  #table-qltd th,#table-kd th,#table-td th{min-width:0!important;padding:6px 4px!important;font-size:10px!important;white-space:normal!important;letter-spacing:0!important}
  #table-qltd th .sort-icon,#table-kd th .sort-icon,#table-td th .sort-icon,#table-qltd th .dp-col-resize{display:none!important}
  #table-qltd td:nth-child(5) a,#table-kd td:nth-child(5) a,#table-td td:nth-child(5) a{display:block}
  #table-qltd td:nth-child(5) *,#table-kd td:nth-child(5) *,#table-td td:nth-child(5) *{white-space:normal!important}
  #table-qltd,#table-kd,#table-td{display:table!important;overflow:visible!important;table-layout:fixed!important;width:100%!important}
  #table-qltd th:nth-child(1),#table-kd th:nth-child(1),#table-td th:nth-child(1){width:18%!important}
  #table-qltd th:nth-child(13),#table-kd th:nth-child(13),#table-td th:nth-child(13){width:29%!important}
  #table-qltd th:nth-child(20),#table-kd th:nth-child(20),#table-td th:nth-child(20){width:15%!important}
  #table-qltd th:nth-child(5),#table-kd th:nth-child(5),#table-td th:nth-child(5){width:38%!important}
  #table-qltd td,#table-kd td,#table-td td{overflow-wrap:anywhere}
  #table-qltd td:nth-child(13),#table-kd td:nth-child(13),#table-td td:nth-child(13){min-width:78px}
  #notif-banner .notif-inner{padding:4px 10px!important;cursor:pointer}
  #notif-banner:not(.open) #notif-pills{display:none!important}
  #notif-banner .notif-caret{margin-left:4px}
  #table-qltd th,#table-qltd td,#table-kd th,#table-kd td,#table-td th,#table-td td{padding:6px 5px;font-size:12px}
  .toast,#dp-fab{bottom:72px!important}
}
"""
rep(".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}", ".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}" + css)
nav = '''<nav id="td-bottomnav" aria-label="Điều hướng nhanh">
  <a href="#/tong-quan" data-bn="dashboard" onclick="showPage('dashboard'); return false;"><span class="bn-ic">📊</span>Tổng quan</a>
  <a href="#/du-no" data-bn="qltd" onclick="showPage('qltd'); return false;"><span class="bn-ic">📋</span>Dư nợ</a>
  <a href="#/lich-tra-no" data-bn="denhan" onclick="showPage('denhan'); return false;"><span class="bn-ic">📅</span>Đến hạn</a>
  <a href="#/tai-san" data-bn="tsbd" onclick="showPage('tsbd'); if(typeof tsbdInit==='function') tsbdInit(); return false;"><span class="bn-ic">🏠</span>Tài sản</a>
  <button type="button" onclick="mobToggleSidebar()" aria-label="Mở menu"><span class="bn-ic">☰</span>Menu</button>
</nav>
<script>
(function () {
  function mark(n) { Array.prototype.forEach.call(document.querySelectorAll('#td-bottomnav a'), function (a) { a.classList.toggle('on', a.dataset.bn === n); }); }
  function cur() { var a = document.querySelector('.page.active'); return a ? a.id.slice(5) : ''; }
  setTimeout(function () { try { mark(cur()); if (window.TD && TD.router) TD.router.onPageEnter('*', mark); } catch (e) {} }, 2200);
  var nb = document.getElementById('notif-banner');
  if (nb) { var inner = nb.querySelector('.notif-inner'), lbl = inner && inner.querySelector('span'); if (lbl) { lbl.insertAdjacentHTML('beforeend', '<span class="notif-caret">▾</span>'); inner.addEventListener('click', function (e) { if (e.target.closest('#notif-pills a,#notif-pills button,[onclick*="dismiss"]')) return; if (window.innerWidth <= 600) nb.classList.toggle('open'); }); } }
})();
</script>
'''
i = s.rindex('<script id="td-router">'); s = s[:i] + nav + s[i:]
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
