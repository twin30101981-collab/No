
      function toggleUtilMenu(e){
        if(e){ e.stopPropagation(); }
        var w = document.getElementById('util-wrap');
        if(w) w.classList.toggle('open');
      }
      function utilRun(fn){
        var w = document.getElementById('util-wrap');
        if(w) w.classList.remove('open');
        try { if(typeof fn === 'function') fn(); }
        catch(err){ console.error('[Tiện ích]', err); if(window.showToast) showToast('⚠️ Không chạy được thao tác này.', 'err'); }
      }
      document.addEventListener('click', function(ev){
        var w = document.getElementById('util-wrap');
        if(w && w.classList.contains('open') && !w.contains(ev.target)) w.classList.remove('open');
      });
      document.addEventListener('keydown', function(ev){
        if(ev.key === 'Escape'){ var w = document.getElementById('util-wrap'); if(w) w.classList.remove('open'); }
      });
    