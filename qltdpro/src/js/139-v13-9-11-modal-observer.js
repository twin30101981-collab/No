
(function(){
  if (window.__v13_9_11_modalObs) return; window.__v13_9_11_modalObs = 1;
  function isOpenModal(el){
    if (!el || !el.getClientRects().length) return false; // P09: offsetParent luôn null với position:fixed (lớp phủ hộp thoại) ⇒ trước đây KHÔNG BAO GIỜ phát hiện hộp thoại mở
    var rc = el.getBoundingClientRect(); // ngăn kéo đóng (tdup2-drawer) vẫn có hộp hình học nhưng nằm ngoài khung nhìn
    if (rc.right <= 0 || rc.left >= window.innerWidth || rc.bottom <= 0 || rc.top >= window.innerHeight) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    return true;
  }
  function anyModalOpen(){
    // Modal preview A4 trong cùng tab (nếu có)
    var sel = '.modal-overlay.open, .modal.open, .modal.show, .modal[style*="display: flex"], .modal[style*="display:flex"], .modal[style*="display: block"], .modal[style*="display:block"], #print-preview-modal, [data-modal-open="1"], [role="dialog"][aria-modal="true"]';
    var nodes = document.querySelectorAll(sel);
    for (var i=0;i<nodes.length;i++){ if (isOpenModal(nodes[i])) return true; }
    /* P09: đã gỡ vòng quét "lớp phủ position:fixed toàn màn hình": phần tử fixed luôn có offsetParent = null nên vòng cũ `continue` ngay ở mọi nút ⇒
       luôn trả false (không tác dụng) nhưng tốn ~0,5 s mỗi lần với ~150.000 nút (getComputedStyle trên mọi div/section/aside), chạy sau mỗi thay đổi DOM/bấm/phím. */
    return false;
  }
  function sync(){
    try {
      document.body.classList.toggle('modal-open', anyModalOpen());
    } catch(_) {}
  }
  var t = null;
  function schedule(){ if (t) return; t = setTimeout(function(){ t=null; sync(); }, 80); }
  var mo = new MutationObserver(schedule);
  function start(){
    mo.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class','hidden','aria-hidden','data-modal-open']});
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('click', schedule, true);
  window.addEventListener('keydown', schedule, true);
})();
