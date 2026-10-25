
(function () {
  'use strict';

  // ─── Helpers ──────────────────────────────────────────────────────
  // Archive lưu date dạng vi-VN "dd/mm/yyyy, HH:mm:ss" hoặc tag.{kind,year,quarter,month}
  // TDCMP dùng ymd "yyyy-mm-dd"
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function lastDayOfMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

  // Suy ra ngày YYYY-MM-DD đại diện của 1 snapshot Archive
  function archiveSnapDate(snap) {
    if (!snap) return null;
    // Ưu tiên tag (chuẩn nhất)
    var t = snap.tag;
    if (t && t.kind && t.year) {
      if (t.kind === 'year_end') return t.year + '-12-31';
      if (t.kind === 'quarter' && t.quarter >= 1 && t.quarter <= 4) {
        var qm = t.quarter * 3; // 3,6,9,12
        return t.year + '-' + pad(qm) + '-' + pad(lastDayOfMonth(t.year, qm - 1));
      }
      if (t.kind === 'month' && t.month >= 1 && t.month <= 12) {
        return t.year + '-' + pad(t.month) + '-' + pad(lastDayOfMonth(t.year, t.month - 1));
      }
    }
    // Fallback: parse vi-VN "dd/mm/yyyy, HH:mm:ss"
    var s = String(snap.date || '');
    var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
    if (snap.timestamp) return ymd(new Date(snap.timestamp));
    return null;
  }

  // Convert reportData (rows ngắn) → TDCMP rows ({ma,ten,hd,cbtd,phong,loaiVay,duNo})
  // Schema cột: r[0]=ma, r[1]=ten, r[2]=hd, r[11]=duNo, r[12]=cbtd, r[13]=loaiVay, r[17]=phong
  function reportDataToRows(reportData) {
    if (!Array.isArray(reportData)) return [];
    var out = [];
    for (var i = 0; i < reportData.length; i++) {
      var r = reportData[i];
      if (!r) continue;
      var ma = String(r[0] || '').trim();
      var hd = String(r[2] || '').trim();
      if (!ma && !hd) continue;
      out.push({
        ma: ma,
        hd: hd,
        cbtd: String(r[12] || '').trim(),
        ten: String(r[1] || '').trim(),
        phong: String(r[17] || '(Chưa rõ)').trim(),
        loaiVay: String(r[13] || '(Khác)').trim(),
        duNo: Number(r[11]) || 0
      });
    }
    return out;
  }

  function aggTotals(rows) {
    var t = { duNo: 0, byPhong: {}, byLoai: {}, count: rows.length };
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      t.duNo += r.duNo;
      t.byPhong[r.phong] = (t.byPhong[r.phong] || 0) + r.duNo;
      t.byLoai[r.loaiVay] = (t.byLoai[r.loaiVay] || 0) + r.duNo;
    }
    return t;
  }

  // ─── Cache LRU đơn giản (8 entry) ─────────────────────────────────
  var CACHE = new Map();
  var CACHE_MAX = 8;
  function cacheGet(k) { return CACHE.get(k) || null; }
  function cachePut(k, v) {
    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(k, v);
  }
  function cacheClear() { CACHE.clear(); }

  // ─── Index ngày → archive snapshot ────────────────────────────────
  function buildArchiveIndex() {
    var idx = {};            // 'yyyy-mm-dd' -> archive snapshot
    var markers = { eom: {}, eoq: {}, eoy: {} };
    var list = (typeof _archiveReportList !== 'undefined' && Array.isArray(_archiveReportList))
      ? _archiveReportList : [];
    for (var i = 0; i < list.length; i++) {
      var snap = list[i];
      if (!snap || !Array.isArray(snap.reportData) || !snap.reportData.length) continue; // bỏ "chỉ meta"
      var d = archiveSnapDate(snap);
      if (!d) continue;
      // Snapshot mới hơn cùng ngày → ghi đè (timestamp lớn hơn)
      if (!idx[d] || (snap.timestamp || 0) > (idx[d].timestamp || 0)) idx[d] = snap;
      // Markers
      var t = snap.tag;
      if (t && t.kind === 'year_end' && t.year) markers.eoy[String(t.year)] = d;
      if (t && t.kind === 'quarter' && t.year && t.quarter) markers.eoq[t.year + '-Q' + t.quarter] = d;
      if (t && t.kind === 'month' && t.year && t.month)
        markers.eom[t.year + '-' + pad(t.month)] = d;
      // Auto-marker khi ngày rơi vào cuối tháng dù chưa tag
      var dt = parseYmd(d), y = dt.getFullYear(), mo = dt.getMonth(), dd = dt.getDate();
      if (dd === lastDayOfMonth(y, mo)) {
        var keyM = y + '-' + pad(mo + 1);
        if (!markers.eom[keyM]) markers.eom[keyM] = d;
        if (mo === 2 || mo === 5 || mo === 8 || mo === 11) {
          var q = Math.floor(mo / 3) + 1;
          if (!markers.eoq[y + '-Q' + q]) markers.eoq[y + '-Q' + q] = d;
        }
        if (mo === 11 && dd === 31 && !markers.eoy[String(y)]) markers.eoy[String(y)] = d;
      }
    }
    return { idx: idx, markers: markers, dates: Object.keys(idx).sort() };
  }

  // ─── Đợi TDCMP load xong rồi override ─────────────────────────────
  function applyPatch() {
    if (!window.TDCMP || !TDCMP.snapStore) return false;

    // Đánh dấu để không patch nhiều lần
    if (TDCMP._v2Patched) return true;
    TDCMP._v2Patched = true;
    TDCMP.v = (TDCMP.v || '1.0') + '+v2-archive';

    // Lưu backup store cũ (phòng cần migrate)
    TDCMP._snapStoreV1 = TDCMP.snapStore;

    // === snapStore v2: đọc/ghi qua Archive ===
    TDCMP.snapStore = {
      _arch: null,
      _rebuild: function () { this._arch = buildArchiveIndex(); cacheClear(); },
      index: function () { if (!this._arch) this._rebuild(); return this._arch.dates.slice(); },
      markers: function () { if (!this._arch) this._rebuild(); return this._arch.markers; },
      get: function (date) {
        if (!date) return null;
        var hit = cacheGet(date); if (hit) return hit;
        if (!this._arch) this._rebuild();
        var snap = this._arch.idx[date]; if (!snap) return null;
        var rows = reportDataToRows(snap.reportData);
        var totals = aggTotals(rows);
        var pack = {
          date: date, source: 'archive', archiveName: snap.name || '',
          schemaVersion: 42, savedAt: snap.date || '', rows: rows, totals: totals
        };
        cachePut(date, pack);
        return pack;
      },
      save: function (date /*, rows */) {
        // Chuyển hành vi "Lưu snapshot hôm nay" → gọi archiveSaveReport (kho thống nhất)
        if (typeof archiveSaveReport === 'function') {
          try { archiveSaveReport(); } catch (e) { console.warn('[TDCMP-v2] archiveSaveReport failed', e); }
        } else {
          alert('Không tìm thấy archiveSaveReport(). Vui lòng dùng nút "💾 Lưu Báo cáo Ngay" ở Lưu trữ File → Báo cáo.');
        }
        this._rebuild();
        return this.get(date);
      },
      remove: function (date) {
        // An toàn: chỉ huỷ cache, không xoá khỏi Archive (xoá Archive làm ở trang Lưu trữ)
        cacheClear(); this._rebuild();
        alert('Để xoá snapshot, vui lòng vào "Lưu trữ File → Báo cáo".');
      },
      gc: function () { /* Archive tự quản lý */ },
      exportJson: function () {
        if (TDCMP._snapStoreV1 && typeof TDCMP._snapStoreV1.exportJson === 'function')
          return TDCMP._snapStoreV1.exportJson();
        return '{}';
      },
      importJson: function (text) {
        if (TDCMP._snapStoreV1 && typeof TDCMP._snapStoreV1.importJson === 'function') {
          var n = TDCMP._snapStoreV1.importJson(text);
          this._rebuild();
          return n;
        }
        return 0;
      }
    };

    // === Resolver mới: ưu tiên tag, fallback near-date ±3 ngày ===
    function findNear(dates, target, tol) {
      var best = null, bestDiff = Infinity;
      for (var i = 0; i < dates.length; i++) {
        var diff = Math.abs(Math.round((parseYmd(dates[i]) - parseYmd(target)) / 86400000));
        if (diff <= tol && diff < bestDiff) { best = dates[i]; bestDiff = diff; }
      }
      return best;
    }

    TDCMP.resolveAnchors = function (todayStr) {
      TDCMP.snapStore._rebuild(); // luôn fresh khi resolve
      var today = todayStr || ymd(new Date());
      var arch = TDCMP.snapStore._arch;
      var datesBefore = arch.dates.filter(function (d) { return d < today; });
      var t = parseYmd(today);

      // D-1: snapshot có ngày < hôm nay gần nhất
      var D1 = datesBefore.length ? datesBefore[datesBefore.length - 1] : null;

      // EoM-1: cuối tháng trước — ưu tiên marker eom, fallback near
      var prevMonth = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      var eomKey = prevMonth.getFullYear() + '-' + pad(prevMonth.getMonth() + 1);
      var EoM1 = arch.markers.eom[eomKey] || null;
      var eomTarget = ymd(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0));
      if (!EoM1) EoM1 = findNear(arch.dates, eomTarget, 3);

      // EoQ-1: cuối quý trước
      var curQ = Math.floor(t.getMonth() / 3);          // 0..3
      var prevQ = curQ === 0 ? 3 : curQ - 1;            // 0..3
      var prevQYear = curQ === 0 ? t.getFullYear() - 1 : t.getFullYear();
      var eoqKey = prevQYear + '-Q' + (prevQ + 1);
      var EoQ1 = arch.markers.eoq[eoqKey] || null;
      var eoqTarget = ymd(new Date(prevQYear, prevQ * 3 + 3, 0));
      if (!EoQ1) EoQ1 = findNear(arch.dates, eoqTarget, 3);

      // EoY-1: 31/12 năm trước
      var prevYear = t.getFullYear() - 1;
      var EoY1 = arch.markers.eoy[String(prevYear)] || null;
      if (!EoY1) EoY1 = findNear(arch.dates, prevYear + '-12-31', 3);

      return {
        today: today,
        D1:   { date: D1,   label: 'vs Hôm qua (D-1)',                  target: null },
        EoM1: { date: EoM1, label: 'vs Cuối tháng trước',               target: eomTarget },
        EoQ1: { date: EoQ1, label: 'vs Cuối quý trước (đầu quý này)',   target: eoqTarget },
        EoY1: { date: EoY1, label: 'vs 31/12 năm trước',                target: prevYear + '-12-31' }
      };
    };

    // === Hook: archive thay đổi → invalidate cache + re-render KPI ===
    function rerender() {
      try { TDCMP.snapStore._rebuild(); } catch (e) {}
      try { if (typeof TDCMP.render === 'function') TDCMP.render(); } catch (e) {}
      try { if (typeof renderTranop === 'function') renderTranop(); } catch (e) {}
    }

    // Bọc archiveSaveReport
    if (typeof archiveSaveReport === 'function' && !archiveSaveReport._tdcmpWrapped) {
      var _orig = archiveSaveReport;
      window.archiveSaveReport = function () {
        var r = _orig.apply(this, arguments);
        setTimeout(rerender, 50);
        return r;
      };
      window.archiveSaveReport._tdcmpWrapped = true;
    }

    // Bọc xoá / gắn tag archive nếu có
    ['archiveDeleteReport', 'archiveSetReportTag', 'archiveClearAll'].forEach(function (fn) {
      if (typeof window[fn] === 'function' && !window[fn]._tdcmpWrapped) {
        var orig = window[fn];
        window[fn] = function () {
          var r = orig.apply(this, arguments);
          setTimeout(rerender, 50);
          return r;
        };
        window[fn]._tdcmpWrapped = true;
      }
    });

    // Render ngay nếu đang ở trang TRANOP
    var page = document.getElementById('page-tranop');
    if (page && page.classList && (page.classList.contains('active') || page.style.display !== 'none')) {
      setTimeout(rerender, 100);
    }

    (0)&&console.log('[TDCMP-v2] ✅ Patched. Archive snapshots:', TDCMP.snapStore.index().length);
    return true;
  }

  // Đợi TDCMP module v1 load (script #tdcmp-module)
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (applyPatch() || tries > 100) clearInterval(iv);
  }, 200);

  // Cũng patch lại khi user mở trang TRA NỢ (rerender lần đầu nếu chậm)
  document.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-page="tranop"],[onclick*="tranop"],[href*="tranop"]');
    if (nav) setTimeout(function () { if (window.TDCMP && TDCMP._v2Patched && typeof TDCMP.render === 'function') TDCMP.render(); }, 200);
  }, true);

  // Self-check ?dev=1
  if (/[\?&]dev=1/.test(location.search)) {
    setTimeout(function () {
      if (!window.TDCMP) { console.warn('[TDCMP-v2] TDCMP chưa tồn tại'); return; }
      var i = TDCMP.snapStore.index();
      console.table(i.map(function (d) {
        var s = TDCMP.snapStore.get(d);
        return { date: d, name: s && s.archiveName, rows: s && s.rows.length, duNo: s && s.totals.duNo };
      }));
    }, 2000);
  }
})();
