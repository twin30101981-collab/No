
/* ── Mobile tab switch ── */
function hsvMobTab(loai, tab, btn) {
  const page = document.getElementById('page-' + loai);
  if (!page) return;
  page.querySelectorAll('.hsv-mob-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const list = page.querySelector('.hsv-col-list');
  const form = page.querySelector('.hsv-col-form');
  const prev = page.querySelector('.hsv-col-preview');
  [list, form, prev].forEach(c => { if(c) c.classList.remove('mob-active'); });
  if (tab === 'list' && list) list.classList.add('mob-active');
  if (tab === 'form' && form) form.classList.add('mob-active');
  if (tab === 'prev' && prev) prev.classList.add('mob-active');
}

/* Hook vào showPage để init GD2 khi chuyển sang các page HS */
TD.onShowPage(function (name) { if (['hmtd', 'tieudung', 'camco'].includes(name)) setTimeout(() => hsvInitPage(name), 60); }); // HM-13b
