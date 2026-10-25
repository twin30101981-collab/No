/* v13.9.8 FIX: Desktop toggle in dock */
(function(){
  function syncLbl(){
    var b=document.querySelector('#tdup-dock button[data-tdup-act="desktop"]'); if(!b) return;
    var on=document.body.classList.contains('desktop-mode');
    b.textContent= on?'🖥️ Desktop ON':'🖥️ Desktop OFF';
    b.style.opacity= on?'1':'0.6';
  }
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('#tdup-dock button[data-tdup-act="desktop"]'); if(!b) return;
    ev.preventDefault(); ev.stopPropagation();
    var fb=document.getElementById('dp-toggle-btn');
    if(fb){ fb.click(); } else { document.body.classList.toggle('desktop-mode'); }
    setTimeout(syncLbl,50);
  },true);
  var t=setInterval(function(){ if(document.querySelector('#tdup-dock button[data-tdup-act="desktop"]')){ syncLbl(); clearInterval(t); } },200);
  new MutationObserver(syncLbl).observe(document.body,{attributes:true,attributeFilter:['class']});
})();
