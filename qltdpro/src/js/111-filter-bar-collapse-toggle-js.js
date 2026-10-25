

// /* Filter-bar collapse toggle JS */
(function() {
  'use strict';
  function attachFilterBarToggle() {
    document.querySelectorAll('.filter-bar').forEach(function(fb) {
      if (fb._toggleAttached) return;
      fb._toggleAttached = true;
      // Tạo nút toggle
      var btn = document.createElement('button');
      btn.className = 'fb-toggle-btn';
      btn.innerHTML = '⚙';
      btn.title = 'Thu gọn / Mở rộng bộ lọc';
      btn.style.cssText = [
        'flex-shrink:0', 'margin-left:auto', 'background:transparent',
        'border:1px solid var(--gray-300)', 'border-radius:4px',
        'width:22px', 'height:22px', 'cursor:pointer', 'font-size:11px',
        'display:flex', 'align-items:center', 'justify-content:center',
        'color:var(--gray-500)', 'transition:all .15s', 'padding:0'
      ].join(';');
      // Không thêm nếu filter-bar chỉ có 1-2 phần tử
      if (fb.children.length < 3) return;
      // Collect elements để ẩn/hiện (không ẩn title và nút đầu)
      var title = fb.querySelector('.filter-bar-title');
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        fb.classList.toggle('fb-collapsed');
        btn.innerHTML = fb.classList.contains('fb-collapsed') ? '⊞' : '⚙';
        btn.title = fb.classList.contains('fb-collapsed')
          ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc';
      });
      fb.appendChild(btn);
    });
  }
  // Chạy sau khi DOM load và sau mỗi lần render trang
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachFilterBarToggle);
  } else {
    setTimeout(attachFilterBarToggle, 300);
  }
  TD.onShowPage(function () { setTimeout(attachFilterBarToggle, 200); }); // HM-13b
})();

