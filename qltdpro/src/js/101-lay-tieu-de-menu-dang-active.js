
(function(){
  // Lấy tiêu đề menu đang active
  function getActiveTitle(){
    var t = document.getElementById('page-title');
    var nav = document.querySelector('.nav-item.active, .nav-child-item.active');
    var navTxt = nav ? nav.textContent.trim().replace(/\s+/g,' ') : '';
    var pageTxt = t ? t.textContent.trim() : '';
    var _t = (navTxt || pageTxt || 'Bản in');
    if(window.TD_PRINT) _t = window.TD_PRINT.stripIcons(_t) || 'Bản in';
    return _t.substring(0,120);
  }
  // In menu đang active (Phương án A)
  window.printActivePage = function(){
    document.body.setAttribute('data-print-title', getActiveTitle());
    document.body.classList.remove('print-target-mode');
    document.querySelectorAll('.print-target').forEach(function(el){el.classList.remove('print-target')});
    setTimeout(function(){ window.print(); }, 50);
  };
  // In 1 phần tử / 1 card (Phương án C)
  window.printElement = function(elOrSel, title){
    var el = (typeof elOrSel === 'string') ? document.querySelector(elOrSel) : elOrSel;
    if(!el){ alert('Không tìm thấy mục để in'); return; }
    document.body.setAttribute('data-print-title', title || getActiveTitle());
    document.querySelectorAll('.print-target').forEach(function(e){e.classList.remove('print-target')});
    el.classList.add('print-target');
    // Đảm bảo các ancestor trong .page.active được hiển thị
    document.body.classList.add('print-target-mode');
    setTimeout(function(){
      window.print();
      setTimeout(function(){
        document.body.classList.remove('print-target-mode');
        el.classList.remove('print-target');
      }, 300);
    }, 50);
  };
  // Phím tắt: Ctrl+Shift+P = in menu hiện tại (Ctrl+P mặc định cũng OK do CSS)
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey||e.metaKey) && e.key === 'p'){
      document.body.setAttribute('data-print-title', getActiveTitle());
    }
  });
  // Tự động chèn nút "🖨️ In mục này" vào các card có tiêu đề h2/h3
  function injectPrintButtons(){
    document.querySelectorAll('.page .card').forEach(function(card){
      var h = card.querySelector(':scope > h2, :scope > h3, :scope > .card-header, :scope > .card-title');
      if(!h) return;
      // FIX: nút được gắn bên trong tiêu đề, không phải con trực tiếp của card.
      // Check cũ ':scope > .btn-print-section' luôn false nên MutationObserver tự kích hoạt vô tận.
      if(card.querySelector('.btn-print-section') || h.querySelector('.btn-print-section')) return;
      // Bỏ qua card quá nhỏ (KPI) — chỉ cần có nhiều con
      if(card.children.length < 2) return;
      var btn = document.createElement('button');
      btn.className = 'btn-print-section no-print';
      btn.type = 'button';
      btn.innerHTML = '🖨️ In mục này';
      btn.title = 'In riêng mục này (Phương án C)';
      btn.onclick = function(ev){
        ev.stopPropagation();
        var title = (h.textContent||'').trim().substring(0,80);
        printElement(card, getActiveTitle() + ' — ' + title);
      };
      h.appendChild(btn);
    });
  }
  // Chạy sau khi DOM ổn định + mỗi khi đổi trang
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectPrintButtons);
  } else {
    injectPrintButtons();
  }
  TD.onShowPage(function(){ setTimeout(injectPrintButtons, 80); }); // HM-13b
  // Quan sát DOM cho các card render động (HSVV, báo cáo...)
  var mo = new MutationObserver(function(muts){
    // Bỏ qua mutation do chính việc thêm nút in tạo ra để tránh vòng lặp render.
    var onlyPrintButtons = muts.length && Array.prototype.every.call(muts, function(m){
      return Array.prototype.every.call(m.addedNodes, function(n){
        return n.nodeType === 1 && n.classList && n.classList.contains('btn-print-section');
      }) && Array.prototype.every.call(m.removedNodes, function(n){
        return n.nodeType === 1 && n.classList && n.classList.contains('btn-print-section');
      });
    });
    if(onlyPrintButtons) return;
    clearTimeout(window.__pbT);
    window.__pbT = setTimeout(injectPrintButtons, 200);
  });
  setTimeout(function(){
    var main = document.getElementById('main') || document.body;
    mo.observe(main, {childList:true, subtree:true});
  }, 500);
})();
