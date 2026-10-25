
// CSS cho column filter row (thêm vào sau khi DOM load)
(function() {
  const style = document.createElement('style');
  style.textContent = `
    thead tr.col-filter-row th { padding:2px 3px !important; background:var(--navy-mid) !important; position:sticky; z-index:2; }
    thead tr.col-filter-row th.col-filter-th { vertical-align:middle; }
    thead tr.col-filter-row th .col-filter-inp::placeholder { color:rgba(255,255,255,.45); }
    thead tr.col-filter-row th .col-filter-inp:focus { background:rgba(255,255,255,.22) !important; border-color:var(--green-accent) !important; }
  `;
  document.head.appendChild(style);
})();
