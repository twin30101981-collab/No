
(function(){
  'use strict';
  if (window.__UX_PATCH_V9__) return; window.__UX_PATCH_V9__ = true;

  // ---- Toast helper ----
  function toast(msg){ TD.toast(msg, { duration: 1400 }); } // HM-16c: dùng chung TD.toast

  // ---- Auto-tag large tables for sticky header + horizontal scroll ----
  function enhanceTables(){
    document.querySelectorAll('table').forEach(function(tbl){
      if (tbl.dataset.uxEnhanced) return;
      var rows = tbl.rows ? tbl.rows.length : 0;
      // Only enhance reasonably-sized tables (avoid layout tables)
      if (rows < 5) return;
      tbl.classList.add('ux-sticky');
      tbl.dataset.uxEnhanced = '1';
      // Wrap in scroll container if not already inside one with overflow
      var parent = tbl.parentElement;
      if (parent && !parent.classList.contains('ux-table-wrap')){
        var cs = getComputedStyle(parent);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible'){
          var wrap = document.createElement('div');
          wrap.className = 'ux-table-wrap';
          parent.insertBefore(wrap, tbl);
          wrap.appendChild(tbl);
        }
      }
    });
  }

  // ---- Shift+Wheel = horizontal scroll on any scrollable element ----
  document.addEventListener('wheel', function(e){
    if (!e.shiftKey || e.deltaY === 0) return;
    var el = e.target;
    while (el && el !== document.body){
      var cs = getComputedStyle(el);
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth){
        el.scrollLeft += e.deltaY;
        e.preventDefault();
        return;
      }
      el = el.parentElement;
    }
  }, { passive: false });

  // FIX GỐC RỄ (08/09/2026): BỎ HẲN zoom ẩn Ctrl+Lăn chuột — nguyên nhân gây
  // chữ mờ/nhòe (CSS zoom tỷ lệ lẻ + chồng lên Windows Display Scaling) và
  // chữ to/nhỏ không đồng bộ (zoom chỉ áp vào main/#app, không áp vào
  // sidebar/topbar/popup). Chủ động dọn sạch mọi giá trị zoom lệch đã lưu
  // trên máy người dùng từ trước, ép cố định về đúng 100% vĩnh viễn.
  try { localStorage.removeItem('ux_zoom'); } catch(_){}
  document.body.style.setProperty('--ux-zoom', '1');

  // ---- Keyboard shortcuts ----
  function isTyping(){
    var a = document.activeElement;
    if (!a) return false;
    var tag = (a.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || a.isContentEditable;
  }
  function findSearch(){
    return document.querySelector('input[type="search"], input[placeholder*="ìm" i], input[placeholder*="earch" i], input[name*="search" i], #search, .search-input');
  }
  function clickFirst(selectors, label){
    for (var i=0;i<selectors.length;i++){
      var el = document.querySelector(selectors[i]);
      if (el){ el.click(); toast(label || 'OK'); return true; }
    }
    return false;
  }

  document.addEventListener('keydown', function(e){
    // HM-13b: Ctrl/Cmd + K, Ctrl/Cmd + S do TD.keys (HM-15) xử lý — đã gỡ
    // Slash — focus search (when not typing)
    if (e.key === '/' && !isTyping()){
      var s2 = findSearch();
      if (s2){ e.preventDefault(); s2.focus(); }
      return;
    }
    // Escape — blur / close modal
    if (e.key === 'Escape'){
      if (document.getElementById('ux-cheatsheet').classList.contains('show')){
        document.getElementById('ux-cheatsheet').classList.remove('show');
        return;
      }
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
    // Ctrl + ArrowLeft / ArrowRight — Prev / Next step
    if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')){
      if (isTyping()) return;
      var sel = e.key === 'ArrowLeft'
        ? ['button[data-action="prev"]','.btn-prev','#btnPrev','button[onclick*="prev" i]']
        : ['button[data-action="next"]','.btn-next','#btnNext','button[onclick*="next" i]'];
      if (clickFirst(sel, e.key === 'ArrowLeft' ? '◀ Trước' : 'Sau ▶')) e.preventDefault();
      return;
    }
    // ? — show cheatsheet
    if (e.key === '?' && !isTyping()){
      e.preventDefault();
      document.getElementById('ux-cheatsheet').classList.add('show');
    }
  });

  // ---- Cheatsheet overlay ----
  function buildCheatsheet(){
    if (document.getElementById('ux-cheatsheet')) return;
    var el = document.createElement('div');
    el.id = 'ux-cheatsheet';
    el.innerHTML = ''+
      '<div class="panel" role="dialog" aria-label="Phím tắt">'+
      '<span class="close" title="Đóng (Esc)">✕</span>'+
      '<h3>⌨️ Phím tắt Desktop</h3>'+
      '<table>'+
      '<tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>Tìm kiếm nhanh</td></tr>'+
      '<tr><td><kbd>/</kbd></td><td>Focus ô tìm kiếm</td></tr>'+
      '<tr><td><kbd>Ctrl</kbd> + <kbd>S</kbd></td><td>Lưu hồ sơ</td></tr>'+
      '<tr><td><kbd>Ctrl</kbd> + <kbd>←</kbd> / <kbd>→</kbd></td><td>Chuyển bước Prev / Next</td></tr>'+
      '<tr><td><kbd>Shift</kbd> + Lăn chuột</td><td>Cuộn ngang bảng dữ liệu</td></tr>'+
      '<tr><td><kbd>Ctrl</kbd> + Lăn chuột</td><td>Phóng to / thu nhỏ (90 %–140 %)</td></tr>'+
      '<tr><td><kbd>Esc</kbd></td><td>Đóng popup / bỏ focus</td></tr>'+
      '<tr><td><kbd>?</kbd></td><td>Hiện bảng phím tắt này</td></tr>'+
      '</table>'+
      '<p style="margin:14px 0 0;color:#64748b;font-size:12px">'+
      '✅ Sticky header + cột đầu tiên cho mọi bảng &nbsp;·&nbsp; '+
      '✅ Cuộn độc lập từng vùng &nbsp;·&nbsp; '+
      '✅ Scroll-shadow tự động'+
      '</p></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function(ev){
      if (ev.target === el || ev.target.classList.contains('close')) el.classList.remove('show');
    });
  }

  // ---- Floating "?" help button ----
  function buildHelpFab(){
    if (document.getElementById('ux-help-fab')) return;
    var b = document.createElement('button');
    b.id = 'ux-help-fab';
    b.textContent = '⌨ Phím tắt';
    b.title = 'Phím tắt desktop (?)';
    b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:calc(var(--z-7,99990) + 2);'+
      'background:#0f172a;color:#fff;border:0;border-radius:999px;'+
      'padding:8px 14px;font:12px/1 -apple-system,"Segoe UI",sans-serif;'+
      'cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25);opacity:.85';
    b.onmouseenter = function(){ b.style.opacity='1'; };
    b.onmouseleave = function(){ b.style.opacity='.85'; };
    b.onclick = function(){ document.getElementById('ux-cheatsheet').classList.add('show'); };
    document.body.appendChild(b);
  }

  // ---- Init ----
  function init(){
    buildCheatsheet();
    /* v13.9.7 FIX: bỏ FAB "⌨ Phím tắt" floating — đã có nút "?" trong #tdup-dock taskbar */
    /* buildHelpFab(); */
    enhanceTables();
    // Observe DOM for new tables (dynamic UI)
    var mo = new MutationObserver(function(muts){
      var has = muts.some(function(m){ return m.addedNodes && m.addedNodes.length; });
      if (has) enhanceTables();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    (0)&&console.log('%c[UX v9] Desktop optimization patch active','color:#0ea5e9;font-weight:bold');
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
