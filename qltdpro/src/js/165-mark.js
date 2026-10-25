
(function () {
  function mark(n) { Array.prototype.forEach.call(document.querySelectorAll('#td-bottomnav a'), function (a) { a.classList.toggle('on', a.dataset.bn === n); }); }
  function cur() { var a = document.querySelector('.page.active'); return a ? a.id.slice(5) : ''; }
  setTimeout(function () { try { mark(cur()); if (window.TD && TD.router) TD.router.onPageEnter('*', mark); } catch (e) {} }, 2200);
  var nb = document.getElementById('notif-banner');
  if (nb) { var inner = nb.querySelector('.notif-inner'), lbl = inner && inner.querySelector('span'); if (lbl) { lbl.insertAdjacentHTML('beforeend', '<span class="notif-caret">▾</span>'); inner.addEventListener('click', function (e) { if (e.target.closest('#notif-pills a,#notif-pills button,[onclick*="dismiss"]')) return; if (window.innerWidth <= 600) nb.classList.toggle('open'); }); } }
})();
