"""HM-17 (phần 1): chọn cột bảng Dư nợ/Ngắn hạn/Trung-dài (TD.cols): preset Gọn 1920 / Gọn 1366 / Đầy đủ / tuỳ chọn, nhớ theo bảng, ghim cột đến TÊN KH,
 mặc định theo độ rộng màn hình (≥1800 ⇒ Gọn 1920: bảng không cuộn ngang ở 1920); dòng tổng dưới bảng thêm Σ dư nợ theo bộ lọc.
 CHƯA gỡ 3 cơ chế phân trang (HM-17b).  Dùng: python3 apply_hm17.py <vao.html> <ra.html>"""
import sys, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
mod = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'td_cols.js'), encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, ('không duy nhất/không thấy', old[:90], s.count(old))
    s = s.replace(old, new)

glue = r"""
/* ───────── HM-17: giao diện chọn cột ───────── */
(function () {
  var KEYS = ['qltd', 'kd', 'td'], LS = 'td_cols_v1_', timer = 0;
  function load(k) { try { return JSON.parse(localStorage.getItem(LS + k) || 'null'); } catch (e) { return null; } }
  function save(k, o) { try { localStorage.setItem(LS + k, JSON.stringify(o)); } catch (e) {} }
  function tbl(k) { return document.getElementById('table-' + k); }
  function names(k) { var t = tbl(k); return t ? Array.prototype.map.call(t.tHead.rows[0].cells, function (c) { return c.textContent.replace(/[↕★]/g, '').replace(/\s+/g, ' ').trim(); }) : []; }
  function styleEl() { var e = document.getElementById('td-cols-style'); if (!e) { e = document.createElement('style'); e.id = 'td-cols-style'; document.head.appendChild(e); } return e; }
  function visible(k) { var t = tbl(k); return !!t && t.offsetParent !== null; }
  function build() {
    var css = [];
    KEYS.forEach(function (k) {
      var t = tbl(k); if (!t) return;
      var r = TD.cols.resolve(load(k), window.innerWidth), pins = null;
      if (r.pin && visible(k)) { // đo bề rộng khi cột đã ẩn đúng
        var tmp = styleEl(); tmp.textContent = TD.cols.css(t.id, r.hide, null);
        var w = Array.prototype.map.call(t.tHead.rows[0].cells, function (c) { return c.getBoundingClientRect().width; });
        pins = TD.cols.pinLefts(w, r.hide).map(function (o) { o.hdr = false; return o; });
      }
      css.push(TD.cols.css(t.id, r.hide, pins));
      var bar = document.querySelector('.td-cols-bar[data-key="' + k + '"]');
      if (bar) {
        Array.prototype.forEach.call(bar.querySelectorAll('[data-p]'), function (b) { b.classList.toggle('on', b.dataset.p === r.preset); });
        bar.querySelector('[data-act="pin"]').checked = r.pin;
        bar.querySelector('.td-cols-info').textContent = 'Hiện ' + (TD.cols.NCOL - r.hide.length) + '/' + TD.cols.NCOL + ' cột';
        Array.prototype.forEach.call(bar.querySelectorAll('.td-cols-panel input'), function (c) { c.checked = r.hide.indexOf(+c.dataset.i) < 0; });
      }
    });
    styleEl().textContent = css.join('\n');
    try { updateTableTopScrollbars(); } catch (e) {}
  }
  function mkBar(k) {
    var t = tbl(k); if (!t || document.querySelector('.td-cols-bar[data-key="' + k + '"]')) return;
    var host = t.closest('.card,.table-card') || t.parentElement.parentElement || t.parentElement;
    var bar = document.createElement('div'); bar.className = 'td-cols-bar'; bar.dataset.key = k;
    var nm = names(k);
    bar.innerHTML = '<span class="td-cols-lbl">Cột:</span>' + Object.keys(TD.cols.PRESETS).map(function (p) { return '<button type="button" data-p="' + p + '">' + TD.cols.PRESETS[p].name + '</button>'; }).join('') +
      '<button type="button" data-act="pick">⚙ Chọn cột</button><label class="td-cols-pin"><input type="checkbox" data-act="pin"> 📌 Ghim đến Tên KH</label><span class="td-cols-info"></span>' +
      '<div class="td-cols-panel" hidden>' + nm.map(function (n, i) { return '<label><input type="checkbox" data-i="' + i + '"' + (TD.cols.ALWAYS.indexOf(i) >= 0 ? ' disabled' : '') + '> ' + (n || ('Cột ' + (i + 1))) + '</label>'; }).join('') + '</div>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.p) { var o = load(k) || {}; save(k, { preset: b.dataset.p, pin: !!o.pin }); build(); }
      else if (b.dataset.act === 'pick') { var pn = bar.querySelector('.td-cols-panel'); pn.hidden = !pn.hidden; }
    });
    bar.addEventListener('change', function (e) {
      var c = e.target; if (!(c instanceof HTMLInputElement)) return;
      var o = load(k) || {}, r = TD.cols.resolve(o, window.innerWidth);
      if (c.dataset.act === 'pin') { save(k, { preset: o.preset, hide: o.hide, pin: c.checked }); }
      else if (c.dataset.i != null) { var h = r.hide.slice(), i = +c.dataset.i, ix = h.indexOf(i); if (c.checked) { if (ix >= 0) h.splice(ix, 1); } else if (ix < 0) h.push(i); save(k, { hide: TD.cols.sanitize(h), pin: r.pin }); }
      build();
    });
    host.insertBefore(bar, host.firstChild);
  }
  function init() { KEYS.forEach(mkBar); build(); }
  function later() { clearTimeout(timer); timer = setTimeout(build, 120); }
  window.addEventListener('resize', later);
  window.addEventListener('load', function () { setTimeout(init, 900); });
  if (document.readyState === 'complete') setTimeout(init, 900);
  window.tdColsBuild = build;
  setTimeout(function () { try { if (window.TD && TD.router) TD.router.onPageEnter('*', function (n) { if (KEYS.indexOf(n) >= 0) { mkBar(n); later(); } }); } catch (e) {} }, 2500);
})();
"""
rep("function tdRenderDateChip() { // HM-07", mod.rstrip() + "\n" + glue + "\nfunction tdRenderDateChip() { // HM-07")
rep(".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}", ".topbar-right{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n"
 ".td-cols-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 10px;font-size:12px;position:relative}\n"
 ".td-cols-bar .td-cols-lbl{font-weight:700;color:#475569}\n"
 ".td-cols-bar button{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:6px;padding:3px 9px;font-size:12px;cursor:pointer}\n"
 ".td-cols-bar button.on{background:#0d5c1e;border-color:#0d5c1e;color:#fff}\n"
 ".td-cols-bar .td-cols-info{color:#64748b;margin-left:auto}\n"
 ".td-cols-panel{flex-basis:100%;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px 12px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc}\n"
 ".td-cols-panel[hidden]{display:none}\n"
 ".td-cols-panel label{display:flex;align-items:center;gap:5px;font-size:12px}")
# dòng tổng theo bộ lọc: thêm Σ dư nợ
rep("""        · <span style="color:rgba(255,255,255,.6);font-style:italic">Dư nợ xem từng dòng (không cộng gộp)</span>""",
    """        · Dư nợ <strong style="color:var(--gold-light)">${fmtMoney(sum(11))}</strong> <span style="color:rgba(255,255,255,.6);font-style:italic">(theo bộ lọc đang áp dụng)</span>""")
open(dst, 'w', encoding='utf-8').write(s); print('OK', len(s.encode('utf-8')))
