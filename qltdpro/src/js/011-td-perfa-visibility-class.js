
(function(){
  function s(){ document.documentElement.classList.toggle('td-hidden-tab', document.hidden); }
  document.addEventListener('visibilitychange', s, false); s();
})();
