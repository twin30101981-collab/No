
(function(){
  'use strict';
  var TOTAL_RE = /^\s*t[ổoóòỏõ]ng\b/i;
  function markTotalRows(tbl){
    if (!tbl || tbl.dataset.uxTotalMarked === '1') return;
    var body = tbl.tBodies.length ? tbl.tBodies[0] : tbl;
    var trs = body.rows || [];
    for (var i = 0; i < trs.length; i++){
      var tr = trs[i];
      var first = tr.cells && tr.cells[0];
      if (!first) continue;
      var txt = (first.textContent || '').replace(/\s+/g,' ').trim(); // HM-18: textContent (innerText ép layout từng dòng)
      if (TOTAL_RE.test(txt)) tr.classList.add('ux-total-row');
    }
    tbl.dataset.uxTotalMarked = '1';
  }
  function updateTheadHeight(tbl){
    var thead = tbl.tHead;
    if (!thead) return;
    var h = thead.getBoundingClientRect().height;
    if (h > 0) tbl.style.setProperty('--ux-thead-h', Math.round(h) + 'px');
  }
  function enhanceTotals(){
    document.querySelectorAll('table.ux-sticky').forEach(function(tbl){
      if (tbl.closest('.page:not(.active)')) return; // HM-18: bảng của trang ẩn không cần đo (đo sẽ ép layout)
      markTotalRows(tbl);
      updateTheadHeight(tbl);
    });
  }
  function init(){
    enhanceTotals();
    var _t = 0;
    function schedule(){ window.__tdDirty = 1; if (_t) return; _t = setTimeout(function(){ _t = 0; enhanceTotals(); }, 300); } // HM-18: gộp, không chạy ngay trong đợt vẽ
    var mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    try { if (window.TD && TD.router) TD.router.onPageEnter('*', schedule); } catch (e) {}
    window.addEventListener('resize', function(){
      document.querySelectorAll('table.ux-sticky').forEach(updateTheadHeight);
    });
    (0)&&console.log('%c[UX v10] Sticky "Tổng" rows active','color:#f59e0b;font-weight:bold');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);
})();
