
/* v13.9.7 FIX: nút "?" trên dock mở bảng phím tắt ux-cheatsheet */
(function(){
  document.addEventListener('click', function(ev){
    var b = ev.target.closest('#tdup-dock button[data-tdup-act="help"]');
    if(!b) return;
    var cs = document.getElementById('ux-cheatsheet');
    if(cs){ ev.stopPropagation(); cs.classList.add('show'); }
  }, true);
})();
