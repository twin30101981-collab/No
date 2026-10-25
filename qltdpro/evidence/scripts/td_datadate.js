/* HM-07: "Ngày dữ liệu" là nguồn sự thật cho đến hạn / quá hạn / mốc snapshot.
   Nguồn duy nhất: vừa nhúng nguyên văn vào app, vừa được Node nạp để kiểm thử (lưu trữ truyền qua tham số store). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var KEY_DATE = '_currentFileDate', KEY_MODE = 'td_datemode';
  var dd = {};
  dd.store = function () { try { return dd._store || root.localStorage; } catch (e) { return null; } };
  function rd(k) { try { var s = dd.store(); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function wr(k, v) { try { var s = dd.store(); if (s) { if (v == null) s.removeItem(k); else s.setItem(k, v); } } catch (e) {} }
  function mk(y, m, d) {
    if (y < 2000 || y > 2100) return null;
    var x = new Date(y, m - 1, d);
    return (x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d) ? x : null;
  }
  function vn(x) { return ('0' + x.getDate()).slice(-2) + '/' + ('0' + (x.getMonth() + 1)).slice(-2) + '/' + x.getFullYear(); }
  /* fromFileName(tên): "dd/mm/yyyy" hoặc null. Nhận 30.06.2026 · 30_06_2026 · DUNO_18.08.2026 · msit80_30_06_2026 ·
     2026-06-30 · 20260630 · 30062026. Gạch dưới KHÔNG được coi là biên từ (\b cũ không nhận "DUNO_18.08.2026"). */
  dd.fromFileName = function (name) {
    var t = String(name == null ? '' : name).replace(/\.[A-Za-z0-9]{2,5}$/, ''), m, re, x;
    re = /(?<!\d)(\d{1,2})[._\-\/](\d{1,2})[._\-\/](\d{4})(?!\d)/g;
    while ((m = re.exec(t))) { x = mk(+m[3], +m[2], +m[1]); if (x) return vn(x); }
    re = /(?<!\d)(\d{4})[._\-\/](\d{1,2})[._\-\/](\d{1,2})(?!\d)/g;
    while ((m = re.exec(t))) { x = mk(+m[1], +m[2], +m[3]); if (x) return vn(x); }
    re = /(?<!\d)(\d{8})(?!\d)/g;
    while ((m = re.exec(t))) {
      var s = m[1];
      x = mk(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8)) || mk(+s.slice(4, 8), +s.slice(2, 4), +s.slice(0, 2));
      if (x) return vn(x);
    }
    return null;
  };
  /* get(): Date (00:00) của tệp đang dùng, hoặc null nếu chưa biết */
  dd.get = function () {
    var s = rd(KEY_DATE); if (!s) return null;
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s).trim());
    return m ? mk(+m[3], +m[2], +m[1]) : null;
  };
  dd.set = function (vnStr) { wr(KEY_DATE, vnStr || null); };
  dd.mode = function () { return rd(KEY_MODE) === 'today' ? 'today' : 'data'; };
  dd.setMode = function (m) { wr(KEY_MODE, m === 'today' ? 'today' : 'data'); };
  /* realToday(): hôm nay thật (00:00) */
  dd.realToday = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  /* effective(): ngày dùng để tính đến hạn/quá hạn: ngày dữ liệu nếu chế độ "data" và đã biết, ngược lại hôm nay */
  dd.effective = function () { var g = dd.mode() === 'data' ? dd.get() : null; return g || dd.realToday(); };
  dd.key = function () { return vn(dd.effective()); };
  dd.vn = vn;
  /* label(): nội dung chip */
  dd.label = function () {
    var g = dd.get(), real = dd.realToday(), m = dd.mode();
    if (!g) return { text: '📅 Ngày: hôm nay ' + vn(real), title: 'Chưa nhận được ngày từ tên tệp — đang dùng hôm nay', stale: false, mode: 'today' };
    var lag = Math.round((real - g) / 864e5);
    if (m === 'today') return { text: '📅 Hôm nay ' + vn(real), title: 'Đến hạn/quá hạn tính theo hôm nay. Ngày dữ liệu của tệp: ' + vn(g) + '. Bấm để dùng ngày dữ liệu.', stale: false, mode: 'today' };
    return { text: '📅 Dữ liệu ' + vn(g), title: 'Đến hạn/quá hạn tính theo ngày dữ liệu của tệp (' + vn(g) + ')' + (lag > 0 ? ', cũ ' + lag + ' ngày so với hôm nay' : '') + '. Bấm để chuyển sang hôm nay.', stale: lag > 1, mode: 'data' };
  };
  TD.dataDate = dd;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
