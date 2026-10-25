
/* HM-13: router hash cho các trang (#/du-no …) — lịch sử Back/Forward, F5, đường dẫn trực tiếp; sổ đăng ký onPageEnter.
   Không phụ thuộc thứ tự các lớp bọc showPage: theo dõi lớp .active của các .page (MutationObserver riêng từng trang) nên luôn đồng bộ. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var R = {};
  var SLUG = { dashboard: 'tong-quan', qltd: 'du-no', kd: 'han-muc', td: 'tieu-dung', qcamco: 'cam-co', denhan: 'lich-tra-no', laidong: 'lai-dong', chlm: 'chuyen-han-muc', tranop: 'tra-no',
    phidv: 'giai-ngan', khmoi: 'khach-hang-moi', hdv: 'huy-dong-von', baocao: 'bao-cao-ipcas', bckh: 'bao-cao-khkd', ctkh: 'chi-tieu', tsbd: 'tai-san', giadat: 'gia-dat', doisoat: 'doi-soat', canhbao: 'canh-bao', xuhuong: 'xu-huong', khachhang: 'khach-hang', nhap: 'nhap-du-lieu',
    archive: 'luu-tru', macb: 'can-bo', hsvv: 'ho-so-vay', hmtd: 'ho-so-hmtd', tieudung: 'ho-so-tieu-dung', camco: 'ho-so-cam-co', fhs: 'fhs' };
  var REV = {}; Object.keys(SLUG).forEach(function (k) { REV[SLUG[k]] = k; });
  R.slug = function (name) { return SLUG[name] || String(name); };
  /* parse('#/du-no') → 'qltd'; hash không hợp lệ → null */
  R.parse = function (hash) {
    var m = /^#\/([a-z0-9-]+)\/?$/.exec(String(hash || '')); if (!m) return null;
    return REV[m[1]] || m[1];
  };
  R.hash = function (name) { return '#/' + R.slug(name); };
  var hooks = {};
  R.onPageEnter = function (name, fn) { (hooks[name] = hooks[name] || []).push(fn); };
  R.fire = function (name) { (hooks[name] || []).concat(hooks['*'] || []).forEach(function (f) { try { f(name); } catch (e) { console.error('[router hook]', e); } }); };
  R.install = function (win) {
    var doc = win.document, cur = null, routing = false;
    function isPage(n) { return !!doc.getElementById('page-' + n); }
    function activeName() { var a = doc.querySelector('.page.active'); return a && a.id.indexOf('page-') === 0 ? a.id.slice(5) : null; }
    function sync() {
      var n = activeName(); if (!n || n === cur) return;
      cur = n;
      if (!routing) {
        var h = R.hash(n);
        try { if (win.location.hash !== h) win.history.pushState({ page: n }, '', h); } catch (e) { try { win.location.hash = h; } catch (e2) {} }
      }
      R.fire(n);
    }
    function go(name) {
      if (!name || !isPage(name) || name === activeName()) return false;
      routing = true; try { win.showPage(name, doc.querySelector('[data-page="' + name + '"]') || undefined); } finally { routing = false; }
      cur = activeName(); return true;
    }
    var mo = new win.MutationObserver(sync);
    Array.prototype.forEach.call(doc.querySelectorAll('.page[id^="page-"]'), function (p) { mo.observe(p, { attributes: true, attributeFilter: ['class'] }); });
    win.addEventListener('popstate', function () { var n = R.parse(win.location.hash); if (n) go(n); });
    win.addEventListener('hashchange', function () { var n = R.parse(win.location.hash); if (n && n !== activeName()) go(n); });
    R.go = go; R.current = function () { return cur || activeName(); };
    /* khởi động: mở trang theo hash (sau khi app khởi tạo xong), ghi trang hiện tại vào lịch sử */
    function boot() {
      var n = R.parse(win.location.hash);
      cur = activeName();
      if (n && isPage(n) && n !== cur) go(n);
      else { try { win.history.replaceState({ page: cur }, '', R.hash(cur || 'dashboard')); } catch (e) {} }
    }
    if (doc.readyState === 'complete') win.setTimeout(boot, 1800); else win.addEventListener('load', function () { win.setTimeout(boot, 1800); });
    return R;
  };
  TD.router = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
try { TD.router.install(window); TD.router.onPageEnter("*", function () { setTimeout(function () { try { updateTableTopScrollbars(); } catch (e) {} }, 50); }); } catch (e) { console.error("[HM-13 router]", e); }
