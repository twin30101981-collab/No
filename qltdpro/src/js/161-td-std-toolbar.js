
/* v14.11 — Chuẩn hoá thanh lọc theo mẫu menu KHÁCH HÀNG MỚI cho mọi bảng có 2 cột CBTD + PHÒNG BAN:
   🔍 Tìm kiếm → [Tất cả CBTD] → [Tất cả phòng ban] → (bộ lọc khác) → ↺ Bỏ lọc → badge đếm (đẩy sang phải) */
(function () {
  var KEYS = ['qltd', 'kd', 'td', 'denhan', 'chlm'];
  function $(id) { return document.getElementById(id); }
  window.tdClearFilters = function (key) {
    var tb = window.__tdStdToolbar && window.__tdStdToolbar[key];
    if (!tb) return;
    tb.querySelectorAll('input[type=text],input[type=search]').forEach(function (i) { i.value = ''; });
    tb.querySelectorAll('select').forEach(function (s) { s.value = ''; if (s.selectedIndex < 0) s.selectedIndex = 0; });
    if (typeof filterTable === 'function') filterTable(key);
    if (typeof showToast === 'function') showToast('↺ Đã bỏ mọi điều kiện lọc', 'blue');
  };
  function std(key) {
    var search = $('search-' + key);
    var cb = $('filter-' + key + '-cbtd');
    var pb = $('filter-' + key + '-phongban');
    if (!search || !cb || !pb) return;
    var tb = search.closest('.table-toolbar');
    if (!tb || tb.dataset.tdStd) return;
    tb.dataset.tdStd = '1';
    tb.classList.add('td-std-toolbar');
    tb.style.flexWrap = 'wrap'; tb.style.gap = tb.style.gap || '8px';
    window.__tdStdToolbar = window.__tdStdToolbar || {};
    window.__tdStdToolbar[key] = tb;
    var wrap = search.closest('.search-wrap') || search;
    if (!/^🔍/.test(search.placeholder || '')) search.placeholder = '🔍 ' + (search.placeholder || 'Tìm kiếm...');
    var group = cb.closest('.filter-group') || cb.parentElement;
    // 1. search-wrap đứng đầu
    tb.insertBefore(wrap, tb.firstChild);
    // 2. filter-group ngay sau search, CBTD rồi PHÒNG BAN đứng đầu group
    tb.insertBefore(group, wrap.nextSibling);
    group.insertBefore(pb, group.firstChild);
    group.insertBefore(cb, group.firstChild);
    cb.style.minWidth = cb.style.minWidth || '170px';
    pb.style.minWidth = pb.style.minWidth || '170px';
    // 3. nút Bỏ lọc ngay sau filter-group
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline btn-sm';
    btn.title = 'Bỏ mọi điều kiện lọc';
    btn.textContent = '↺ Bỏ lọc';
    btn.setAttribute('onclick', "tdClearFilters('" + key + "')");
    tb.insertBefore(btn, group.nextSibling);
    // 4. badge đếm cuối cùng, đẩy sang phải
    var badge = tb.querySelector('.count-badge');
    if (badge) { badge.style.marginLeft = 'auto'; tb.appendChild(badge); }
  }
  function run() { KEYS.forEach(function (k) { try { std(k); } catch (e) { console.warn('td-std-toolbar', k, e); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  /* P05: "⬇️ Xuất CSV" và "➕ Thêm mới" chỉ có nghĩa với bảng — đặt vào thanh công cụ của trang (nếu có), nếu không thì ở topbar như cũ,
     để topbar giữ 6 nút ở mọi trang (HM-15). */
  function place(name) {
    var ex = $('btn-export'), ad = $('btn-add'), pg = $('page-' + name), tb = pg && pg.querySelector('.td-std-toolbar');
    if (!ex || !ad) return;
    if (tb) { var badge = tb.querySelector('.count-badge'); [ex, ad].forEach(function (b) { tb.insertBefore(b, badge || null); }); }
    else { var tr = document.querySelector('.topbar-right'), anchor = tr && tr.querySelector('[data-tipkey="lai-calc"]'); if (tr) [ex, ad].forEach(function (b) { if (b.parentNode !== tr) tr.insertBefore(b, anchor || null); }); }
  }
  try { if (window.TD && TD.onShowPage) TD.onShowPage(place); } catch (e) {}
})();

/* P06: NGĂN CHI TIẾT bên phải (đề án 8.1, mockup H.11/H.17) — bấm vào một dòng ở Dư nợ / Ngắn hạn / Trung-dài hạn / Nợ đến hạn / Lãi đọng
   để xem đủ các cột của dòng đó (kể cả cột đang ẩn bởi mẫu cột), mở Khách hàng 360° hoặc sửa. Esc / ✕ để đóng. Không bắt sự kiện trên liên kết/nút/ô nhập. */
(function () {
  var TB = { 'tbody-qltd': 'qltd', 'tbody-kd': 'kd', 'tbody-td': 'td', 'tbody-denhan': 'denhan', 'tbody-laidong': 'laidong', 'tbody-chlm': 'chlm', 'tbody-phidv': 'phidv', 'tbody-giam-duno': 'tranop', 'tbody-het-duno': 'tranop' };
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var cur = null;
  function el() {
    var d = document.getElementById('td-drawer'); if (d) return d;
    d = document.createElement('aside'); d.id = 'td-drawer'; d.setAttribute('role', 'complementary'); d.setAttribute('aria-label', 'Chi tiết dòng đang chọn'); d.hidden = true;
    document.body.appendChild(d); return d;
  }
  function labels(tbl) { var hr = tbl.tHead && tbl.tHead.rows[tbl.tHead.rows.length - 1]; return hr ? Array.prototype.map.call(hr.cells, function (c) { return c.textContent.replace(/[↕★]/g, '').trim(); }) : []; }
  function close() { var d = document.getElementById('td-drawer'); if (d) d.hidden = true; if (cur) cur.classList.remove('td-row-sel'); cur = null; }
  function open(tr) {
    var tbl = tr.closest('table'), L = labels(tbl), cells = Array.prototype.slice.call(tr.cells), ck = tr.querySelector('input[data-row]'), idx = ck ? +ck.dataset.row : -1;
    var row = idx >= 0 && window.DATA && DATA.qltd ? DATA.qltd[idx] : null;
    var name = '', ma = '';
    cells.forEach(function (c, i) { if (/^TÊN KH/i.test(L[i] || '')) name = c.textContent.trim(); if (/^MÃ KH$/i.test(L[i] || '')) ma = c.textContent.trim(); });
    if (row) { ma = ma || String(row[0] || ''); name = name || String(row[1] || ''); }
    var rowsHtml = cells.map(function (c, i) { var l = L[i]; var v = c.textContent.trim().replace(/\s+/g, ' '); return l && v ? '<div class="td-dr-r"><span>' + esc(l) + '</span><b>' + esc(v) + '</b></div>' : ''; }).join('');
    var d = el();
    d.innerHTML = '<div class="td-dr-h"><div><div class="td-dr-t">' + esc(name || 'Chi tiết') + '</div><div class="td-dr-s">' + esc(ma) + '</div></div><button type="button" class="td-dr-x" aria-label="Đóng">✕</button></div>' +
      '<div class="td-dr-b">' + rowsHtml + '</div>' +
      '<div class="td-dr-f">' + (ma ? '<button type="button" class="btn btn-green btn-sm" data-act="kh">👤 Khách hàng 360°</button>' : '') + (idx >= 0 && typeof editRow === 'function' ? '<button type="button" class="btn btn-outline btn-sm" data-act="edit">✏️ Sửa</button>' : '') + '</div>';
    d.querySelector('.td-dr-x').onclick = close;
    var kh = d.querySelector('[data-act="kh"]'); if (kh) kh.onclick = function () { close(); try { tdKh360Open(ma, name); } catch (e) {} };
    var ed = d.querySelector('[data-act="edit"]'); if (ed) ed.onclick = function () { close(); try { editRow(idx); } catch (e) {} };
    if (cur) cur.classList.remove('td-row-sel'); cur = tr; tr.classList.add('td-row-sel');
    d.hidden = false; d.querySelector('.td-dr-x').focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var tr = e.target.closest && e.target.closest('tbody tr'); if (!tr || !tr.parentNode || !TB[tr.parentNode.id]) return;
    if (e.target.closest('a, button, input, select, textarea, label, [onclick], [contenteditable]')) return;
    if (window.getSelection && String(window.getSelection()).length) return; // đang bôi đen chữ để sao chép
    open(tr);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var d = document.getElementById('td-drawer'); if (d && !d.hidden) { close(); e.stopPropagation(); } } }, true);
  try { if (window.TD && TD.onShowPage) TD.onShowPage(close); } catch (e) {}
})();

/* P06: BẪY BÀN PHÍM cho hộp thoại (.modal-overlay đang mở): Tab/Shift+Tab xoay vòng trong hộp thoại, không "chui" ra menu phía sau
   (trước đây Tab từ hộp thoại nhảy ngay vào menu bên). Esc đóng đã có sẵn từ các bộ xử lý cũ. */
(function () {
  var SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function topModal() {
    var l = Array.prototype.filter.call(document.querySelectorAll('.modal-overlay'), function (m) { var c = getComputedStyle(m); return c.display !== 'none' && c.visibility !== 'hidden' && m.getBoundingClientRect().width > 0; });
    return l.length ? l[l.length - 1] : null;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
    var m = topModal(); if (!m) return;
    var f = Array.prototype.filter.call(m.querySelectorAll(SEL), function (x) { return x.offsetParent !== null || getComputedStyle(x).position === 'fixed'; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!m.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
  }, true);
})();
