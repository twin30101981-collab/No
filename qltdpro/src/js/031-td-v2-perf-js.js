
(function(){
  // 1) Bus idle helper (nếu chưa có TD_idle)
  if(typeof window.TD_idle!=='function'){
    window.TD_idle = function(fn,timeout){
      if('requestIdleCallback' in window) return requestIdleCallback(fn,{timeout:timeout||1500});
      return setTimeout(fn, 0);
    };
  }
  // 2) Click delegation cho menu tiện ích để click nhanh hơn (không thay inline handler cũ)
  document.addEventListener('click', function(ev){
    var t = ev.target.closest && ev.target.closest('[data-act]');
    if(!t) return;
    var act = t.getAttribute('data-act');
    if(typeof window[act]==='function'){ try{ window[act](ev); }catch(e){ console.warn('[data-act]',act,e); } }
  }, {passive:true});
  // 3) (HM-13b: đã gỡ lớp bọc showPage hoãn 1 rAF — khối này chạy trước khi showPage tồn tại nên chưa bao giờ được cài)
  // 4) Đo boot
  try{ performance.mark && performance.mark('TD-boot-end-v2'); }catch(e){}
})();
