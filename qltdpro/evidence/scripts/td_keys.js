/* HM-15: MỘT bộ phím tắt trung tâm (Ctrl+S, Ctrl+E, Ctrl+K / Ctrl+Shift+K). Đăng ký ở pha capture trên window, chạy đầu tiên, chặn các
   bộ xử lý cũ (4 Ctrl+S, 3 Ctrl+E, 3 bảng lệnh) bằng stopImmediatePropagation. Các phím khác (Ctrl+L, /, F1, Esc, Alt+số…) không bị đụng. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var K = {};
  /* route(ev): tên hành động hoặc null */
  K.route = function (e) {
    if (!e || e.altKey) return null;
    var mod = e.ctrlKey || e.metaKey, k = String(e.key || '').toLowerCase();
    if (!mod) return null;
    if (k === 's' && !e.shiftKey) return 'save';
    if (k === 'e' && !e.shiftKey) return 'export';
    if (k === 'k') return 'palette';
    return null;
  };
  /* exportPlan(page): [hàm, đối số...] cần gọi; null nếu trang không có xuất */
  K.exportPlan = function (page) {
    switch (page) {
      case 'qltd': case 'kd': case 'td': return ['exportQltdExcel'];
      case 'denhan': return ['exportTableExcel', 'denhan', 'Đến hạn'];
      case 'laidong': return ['exportTableExcel', 'laidong', 'Lãi đọng'];
      case 'phidv': return ['exportTableExcel', 'phidv', 'Phí giải ngân'];
      case 'tsbd': return ['tsbdExportExcel'];
      default: return null;
    }
  };
  K.install = function (win) {
    var doc = win.document;
    function page() { var a = doc.querySelector('.page.active'); return a && a.id.indexOf('page-') === 0 ? a.id.slice(5) : ''; }
    function toast(m, t) { try { win.showToast(m, t || 'orange'); } catch (e) {} }
    var A = {
      save: function () {
        var p = page();
        if (p === 'hsvv' && typeof win.hosoSaveCurrent === 'function') { win.hosoSaveCurrent(); return; }
        if ((p === 'hmtd' || p === 'tieudung' || p === 'camco') && typeof win.hsvSaveCurrent === 'function') {
          try { var lt = doc.querySelector('.lt-tab.active'); win.hsvSaveCurrent(lt ? lt.dataset.lt : null); } catch (e) {}
        }
        if (typeof win.saveData === 'function') win.saveData();
      },
      export: function () {
        var plan = K.exportPlan(page());
        if (plan && typeof win[plan[0]] === 'function') { win[plan[0]].apply(win, plan.slice(1)); return; }
        var b = doc.querySelector('.page.active [data-export],.page.active button[onclick*="xuat" i],.page.active button[onclick*="export" i]');
        if (b) b.click(); else toast('ℹ️ Trang này chưa có chức năng xuất', 'orange');
      },
      palette: function () {
        var ov = doc.getElementById('dp-cmd-overlay');
        if (ov && ov.classList.contains('open')) { ov.classList.remove('open'); return; }
        if (typeof win.dpOpenCmd === 'function') win.dpOpenCmd(); else toast('Bảng lệnh chưa sẵn sàng', 'orange');
      }
    };
    K.run = function (name) { try { A[name](); } catch (e) { console.error('[TD.keys]', name, e); } };
    win.addEventListener('keydown', function (e) {
      var a = K.route(e); if (!a) return;
      e.preventDefault(); e.stopImmediatePropagation();
      K.run(a);
    }, true);
    return K;
  };
  TD.keys = K;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);
