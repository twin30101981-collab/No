
/* ── PAGE FULLSCREEN — toggle cho 6 menu được chỉ định ── */
const PAGE_FS_PAGES = ['dashboard','fhs','hsvv','hdv','giadat','tranop'];
let _pageFsActive = false;

function pageToggleFS() {
  _pageFsActive ? pageCloseFS() : pageOpenFS();
}
function pageOpenFS() {
  _pageFsActive = true;
  document.body.classList.add('page-fs');
  const btn = document.getElementById('btn-page-fs');
  if (btn) { btn.innerHTML = '⛶ Thu nhỏ'; btn.classList.add('active'); }
  window._pageFsScrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
}
function pageCloseFS() {
  _pageFsActive = false;
  document.body.classList.remove('page-fs');
  const btn = document.getElementById('btn-page-fs');
  if (btn) { btn.innerHTML = '⛶'; btn.classList.remove('active'); }
  document.body.style.overflow = '';
  if (window._pageFsScrollY !== undefined) window.scrollTo(0, window._pageFsScrollY);
}
// Hiện/ẩn nút fullscreen theo trang đang active
function pageFsUpdateBtn(pageName) {
  const btn = document.getElementById('btn-page-fs');
  if (!btn) return;
  if (PAGE_FS_PAGES.includes(pageName)) {
    btn.style.display = 'inline-flex';
    btn.title = 'Toàn màn hình: ' + pageName.toUpperCase() + ' (Esc để thoát)';
  } else {
    btn.style.display = 'none';
    if (_pageFsActive) pageCloseFS();
  }
}
// Esc thoát fullscreen
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _pageFsActive) pageCloseFS();
});
/* ── MOBILE SIDEBAR ── */
function mobToggleSidebar() {
  var sb  = document.getElementById('sidebar');
  var ov  = document.getElementById('mob-overlay');
  var btn = document.getElementById('btn-mob-menu');
  if (!sb) return;
  var open = sb.classList.toggle('mob-open');
  if (ov)  ov.classList.toggle('active', open);
  if (btn) btn.innerHTML = open ? '✕' : '☰';
}
function mobCloseSidebar() {
  var sb  = document.getElementById('sidebar');
  var ov  = document.getElementById('mob-overlay');
  var btn = document.getElementById('btn-mob-menu');
  if (sb)  sb.classList.remove('mob-open');
  if (ov)  ov.classList.remove('active');
  if (btn) btn.innerHTML = '☰';
}
// Auto-close sidebar on nav item click (khi menu bên là ngăn kéo: <1280px — P05)
document.addEventListener('click', function(e) {
  if (window.innerWidth >= 1280) return;
  var navItem = e.target.closest('.nav-item, .nav-child-item');
  if (navItem) mobCloseSidebar();
});

// Init: hiện nút nếu trang mặc định là dashboard
document.addEventListener('DOMContentLoaded', function() {
  pageFsUpdateBtn('dashboard');
  // HM-13b: showPage gốc đã gọi pageFsUpdateBtn(name) — bỏ lớp bọc gọi lặp
});

/* P05: menu bên — (1) tooltip cho dải biểu tượng 64px; (2) nhóm có thể thu/mở (nhớ trạng thái; nhóm chứa trang đang xem tự mở).
   Mặc định thu "NGHIỆP VỤ" và "HỆ THỐNG" để menu thấp xuống (~1.200 px thay vì 1.454 px). */
(function () {
  var KEY = 'td_sb_groups_v1', DEF = { 'NGHIỆP VỤ': 1, 'HỆ THỐNG': 1 };
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function groups() {
    var sb = document.getElementById('sidebar'); if (!sb) return [];
    var out = [], cur = null;
    Array.prototype.forEach.call(sb.children, function (e) {
      if (e.classList.contains('sidebar-section')) { cur = { head: e, name: e.textContent.trim(), items: [] }; out.push(cur); }
      else if (cur && !e.classList.contains('sidebar-footer')) cur.items.push(e);
    });
    return out;
  }
  function apply(g, collapsed) {
    g.head.classList.toggle('sb-collapsed', collapsed);
    g.head.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    g.items.forEach(function (e) { e.classList.toggle('sb-grp-hide', collapsed); });
  }
  function init() {
    var sb = document.getElementById('sidebar'); if (!sb) return;
    Array.prototype.forEach.call(sb.querySelectorAll('a.nav-item, a.nav-item-parent, a.nav-child-item, div.nav-item'), function (a) {
      if (!a.title) { var l = a.querySelector('.label') || a.querySelector('span:not(.icon):not(.badge)'); if (l) a.title = l.textContent.trim(); }
    });
    var st = load();
    groups().forEach(function (g) {
      g.head.tabIndex = 0; g.head.setAttribute('role', 'button');
      var col = g.name in st ? !!st[g.name] : !!DEF[g.name];
      apply(g, col);
      var toggle = function () { var c = !g.head.classList.contains('sb-collapsed'); apply(g, c); var o = load(); o[g.name] = c ? 1 : 0; save(o); };
      g.head.addEventListener('click', toggle);
      g.head.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }
  function reveal(name) { // trang đang xem nằm trong nhóm đang thu ⇒ mở nhóm đó (không ghi nhớ)
    groups().forEach(function (g) { if (g.head.classList.contains('sb-collapsed') && g.items.some(function (e) { return (e.matches && e.matches('[data-page="' + name + '"]')) || (e.querySelector && e.querySelector('[data-page="' + name + '"]')); })) apply(g, false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  try { if (window.TD && TD.onShowPage) TD.onShowPage(reveal); } catch (e) {}
})();
