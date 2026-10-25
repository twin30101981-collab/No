
/* ═══════════════════════════════════════════════════════════════
   HSVV-PRO v14.4.0 — NÂNG CẤP PHÂN HỆ XUẤT WORD (theo Đề án 13/08/2026)
   3.1 Engine xuất Docx thống nhất (TD.exportDocx)
   3.2 Cache template .docx bằng IndexedDB
   3.3 Phát hiện & cảnh báo môi trường file://
   3.4 Preload vendor ngay sau first paint trên PC
   3.5 Thông báo lỗi Docxtemplater chi tiết theo trường
   3.6 Thanh tiến trình + nút Hủy (AbortController) khi xuất hàng loạt
   3.8 TD_loadWithRetry (3 lần, backoff 800/1600/3200ms)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__TD_V1440__) return; window.__TD_V1440__ = 1;

  var TD = window.TD = window.TD || {};
  function toast(m, c) { try { if (typeof window.showToast === 'function') window.showToast(m, c); } catch (_) {} }

  /* ───────── 3.3 Môi trường file:// ───────── */
  var IS_FILE = location.protocol === 'file:';
  TD.env = { isFile: IS_FILE, isPC: !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) && window.innerWidth >= 1024 };

  /* ───────── 3.9 Nạp mẫu biểu cục bộ — SỬA TẬN GỐC lỗi CORS khi mở file://
     NGUYÊN NHÂN GỐC RỄ: khi mở bằng file://, Chrome chặn hẳn fetch()/XHR
     đọc một file file:// khác (đây không phải lỗi mạng chập chờn — retry
     bao nhiêu lần cũng luôn thất bại, vì trình duyệt chủ động cấm truy cập
     chéo file cục bộ vì lý do bảo mật). Vì vậy fetch(item.path) KHÔNG BAO
     GIỜ thành công trong hoàn cảnh này, dù server/mạng có ổn định thế nào.
     Banner cảnh báo trước đây chỉ dừng ở mức thông báo, không giải quyết
     được vấn đề. SỬA TẬN GỐC: bỏ qua fetch() hoàn toàn cho trường hợp
     file:// — dùng <input type="file"> để đọc trực tiếp nội dung mẫu .docx
     từ đĩa qua FileReader/File API. Đây là API hoàn toàn khác với
     fetch()/XHR, không đi qua cơ chế mạng nên KHÔNG bị CORS chi phối, hoạt
     động bình thường trên mọi trình duyệt kể cả khi mở file:// trực tiếp.
     Mẫu sau khi nạp được lưu vào IndexedDB (cùng cache dùng chung với
     đường mạng), nên chỉ cần làm 1 lần — các lần xuất sau đọc thẳng từ
     cache, không cần chọn lại file. ───────── */
  function collectKnownTemplatePaths() {
    var set = {};
    try {
      var cat = window.HSV_TEMPLATES || {};
      Object.keys(cat).forEach(function (loai) {
        ((cat[loai] || {}).groups || []).forEach(function (g) {
          (g.items || []).forEach(function (it) { if (it && it.path) set[it.path] = 1; });
        });
      });
    } catch (_) {}
    return Object.keys(set);
  }
  function matchTemplatePath(fileName, knownPaths) {
    var norm = String(fileName || '').trim().toLowerCase();
    for (var i = 0; i < knownPaths.length; i++) {
      var base = knownPaths[i].split('/').pop().toLowerCase();
      if (base === norm) return knownPaths[i];
    }
    return null;
  }
  function pickLocalFiles() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.docx';
      input.multiple = true;
      input.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(input);
      var settled = false;
      function finish(files) {
        if (settled) return; settled = true;
        try { document.body.removeChild(input); } catch (_) {}
        resolve(files);
      }
      input.addEventListener('change', function () {
        finish(Array.prototype.slice.call(input.files || []));
      }, { once: true });
      // Nếu người dùng bấm Hủy trên hộp thoại chọn file, không có sự kiện
      // 'change' nào bắn ra — theo dõi khi cửa sổ lấy lại focus để coi như
      // đã hủy (nếu 'change' chưa kịp bắn trong 1 khung hình sau đó).
      window.addEventListener('focus', function onFocus() {
        window.removeEventListener('focus', onFocus);
        setTimeout(function () { finish(Array.prototype.slice.call(input.files || [])); }, 400);
      }, { once: true });
      input.click();
    });
  }
  TD.loadLocalTemplates = function () {
    var known = collectKnownTemplatePaths();
    return pickLocalFiles().then(function (files) {
      if (!files.length) return { ok: false, reason: 'cancelled' };
      var matched = 0, unmatched = [];
      var jobs = files.map(function (f) {
        var path = matchTemplatePath(f.name, known);
        if (!path) { unmatched.push(f.name); return Promise.resolve(); }
        return f.arrayBuffer().then(function (buf) {
          return idbPut({ path: path, version: TD.TEMPLATE_VERSION, buf: buf, at: Date.now() });
        }).then(function () { matched++; });
      });
      return Promise.all(jobs).then(function () {
        if (matched) toast('✅ Đã nạp ' + matched + ' mẫu biểu từ máy — dùng được ngay cả khi mở file://', 'green');
        if (unmatched.length) toast('⚠ ' + unmatched.length + ' file không khớp tên mẫu nào trong danh mục', 'orange');
        return { ok: true, matched: matched, unmatched: unmatched };
      });
    });
  };
  window.TD_loadLocalTemplates = TD.loadLocalTemplates;

  function showFileBanner() {
    if (!IS_FILE || document.getElementById('td-file-proto-banner')) return;
    var b = document.createElement('div');
    b.id = 'td-file-proto-banner';
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:calc(var(--z-7,99990) + 4);background:#fff4d6;border-bottom:2px solid #e0a800;color:#5c4200;font:13px/1.5 "Times New Roman",Times,serif;padding:8px 44px 8px 14px';
    b.innerHTML = '<b>⚠ Đang mở bằng giao thức file://</b> — trình duyệt luôn chặn việc tự động tải mẫu <b>.docx</b> trong hoàn cảnh này (không phải lỗi mạng). ' +
      'Bấm nút bên dưới để chọn trực tiếp các file mẫu .docx từ máy — chỉ cần làm 1 lần, sau đó xuất Word hoạt động bình thường kể cả khi mở file:// trực tiếp. ' +
      'Các chức năng khác vẫn dùng bình thường.' +
      '<button type="button" id="td-file-proto-pick" style="margin-left:10px;padding:3px 10px;border:1px solid #e0a800;border-radius:4px;background:#fff;color:#5c4200;font-weight:700;cursor:pointer">📁 Chọn mẫu biểu (.docx)</button>' +
      '<button type="button" id="td-file-proto-close" style="position:absolute;right:8px;top:6px;border:0;background:transparent;font-size:16px;cursor:pointer">✕</button>';
    document.body.insertBefore(b, document.body.firstChild);
    var c = document.getElementById('td-file-proto-close');
    if (c) c.addEventListener('click', function () { b.remove(); });
    var p = document.getElementById('td-file-proto-pick');
    if (p) p.addEventListener('click', function () { TD.loadLocalTemplates(); });
  }

  /* ───────── 3.8 Retry chuẩn hóa ───────── */
  TD.loadWithRetry = window.TD_loadWithRetry = function (url, opt) {
    opt = opt || {};
    var max = opt.maxRetries || 3, base = opt.backoff || 800;
    return new Promise(function (resolve, reject) {
      var n = 0;
      (function attempt() {
        fetch(url, opt.init || {}).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          resolve(r);
        }).catch(function (e) {
          n++;
          if (n >= max) {
            toast('❌ Không thể tải thư viện/mẫu biểu, vui lòng kiểm tra kết nối mạng', 'red');
            reject(e); return;
          }
          setTimeout(attempt, base * Math.pow(2, n - 1));
        });
      })();
    });
  };

  /* ───────── 3.2 Cache template (IndexedDB) ───────── */
  var DB_NAME = 'td-docx-cache', STORE = 'docxTemplates', DB_VER = 1;
  var dbP = null;
  function openDB() {
    if (dbP) return dbP;
    dbP = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no-idb'));
      var rq = indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = function () { if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE, { keyPath: 'path' }); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    }).catch(function (e) { dbP = null; throw e; });
    return dbP;
  }
  function idbGet(path) {
    return openDB().then(function (db) {
      return new Promise(function (res) {
        var rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(path);
        rq.onsuccess = function () { res(rq.result || null); };
        rq.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function idbPut(rec) {
    return openDB().then(function (db) {
      return new Promise(function (res) {
        var rq = db.transaction(STORE, 'readwrite').objectStore(STORE).put(rec);
        rq.onsuccess = rq.onerror = function () { res(); };
      });
    }).catch(function () {});
  }
  TD.clearTemplateCache = function () {
    return openDB().then(function (db) {
      return new Promise(function (res) {
        var rq = db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
        rq.onsuccess = rq.onerror = function () { toast('🔄 Đã làm mới kho mẫu biểu (.docx)', 'green'); res(); };
      });
    }).catch(function () { toast('⚠ Không truy cập được bộ nhớ đệm mẫu biểu', 'orange'); });
  };

  TD.TEMPLATE_VERSION = 1; /* tăng thủ công khi cập nhật mẫu biểu */

  TD.fetchTemplate = function (path, version) {
    var ver = version == null ? TD.TEMPLATE_VERSION : version;
    return idbGet(path).then(function (hit) {
      if (hit && hit.version === ver && hit.buf && hit.buf.byteLength) return hit.buf;
      return TD.loadWithRetry(path, { maxRetries: IS_FILE ? 1 : 3 })
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (buf) { idbPut({ path: path, version: ver, buf: buf, at: Date.now() }); return buf; });
    });
  };

  /* ───────── 3.5 Lỗi Docxtemplater chi tiết theo trường ───────── */
  function describeRenderError(err) {
    var list = [];
    try {
      var errs = (err && err.properties && err.properties.errors) || [];
      errs.forEach(function (e) {
        var p = e.properties || {};
        list.push((p.xtag || p.id || '?') + (p.explanation ? ' — ' + p.explanation : ''));
      });
    } catch (_) {}
    return list;
  }
  function showFieldErrors(itemName, list) {
    var msg = '❌ Lỗi dữ liệu khi xuất "' + itemName + '"';
    if (list.length) msg += ' — thiếu/sai trường: ' + list.slice(0, 6).join('; ') + (list.length > 6 ? ' …' : '');
    toast(msg, 'red');
    try { console.warn('[TD exportDocx] field errors', itemName, list); } catch (_) {}
  }

  /* ───────── 3.1 Engine xuất Docx thống nhất ───────── */
  function ensureVendors() {
    try { return (window.TD_ensureVendors ? window.TD_ensureVendors() : Promise.resolve()); }
    catch (_) { return Promise.resolve(); }
  }

  TD.exportDocx = function (opt) {
    opt = opt || {};
    var item = opt.item || { name: opt.templateId || 'HoSo', path: opt.path };
    var data = opt.data || {};
    var rec = opt.rec || {};
    var signal = opt.signal;
    return ensureVendors().then(function () {
      if (signal && signal.aborted) throw new Error('__ABORT__');
      if (typeof PizZip === 'undefined') throw new Error('PizZip chưa tải');
      if (!window.docxtemplater) throw new Error('Docxtemplater chưa tải');
      return TD.fetchTemplate(item.path, item.version);
    }).then(function (buf) {
      var doc = new window.docxtemplater(new PizZip(buf), {
        paragraphLoop: true, linebreaks: true,
        delimiters: { start: '{{', end: '}}' }, nullGetter: function () { return ''; }
      });
      try { doc.render(data); }
      catch (re) { re.__fields = describeRenderError(re); re.__render = 1; throw re; }
      var blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE'
      });
      var tenKH = String((rec.fields && rec.fields.tenKH) || 'HoSo').replace(/[/\\:*?"<>|]/g, '_');
      var fname = tenKH + '_' + item.name + '.docx';
      if (typeof window._hsvDownload === 'function') window._hsvDownload(blob, fname);
      return { ok: true, name: item.name, file: fname };
    }).catch(function (e) {
      if (e && e.message === '__ABORT__') return { ok: false, aborted: true, name: item.name };
      if (e && e.__render) { showFieldErrors(item.name, e.__fields || []); return { ok: false, name: item.name, error: e }; }
      var msg = String((e && e.message) || e);
      var isNetIssue = /HTTP|Failed to fetch|NetworkError|no-idb|Không tìm thấy/i.test(msg);
      if (isNetIssue && IS_FILE) {
        showFileBanner();
        // SỬA TẬN GỐC: thay vì chỉ cảnh báo rồi xuất TXT tạm, chủ động mời
        // người dùng chọn file mẫu .docx từ đĩa ngay lúc này (không đi qua
        // fetch/CORS) — nếu nạp được, tự thử xuất lại 1 lần. Chỉ mời 1 lần
        // cho cả phiên làm việc để tránh làm phiền khi xuất hàng loạt.
        if (!TD._localTplPrompted) {
          TD._localTplPrompted = true;
          return TD.loadLocalTemplates().then(function (r) {
            if (r && r.ok && r.matched) return TD.exportDocx(opt);
            toast('⚠ Không đọc được mẫu "' + item.name + '" — xuất bản TXT tạm thời', 'orange');
            if (typeof window._hsvExportFallback === 'function') { window._hsvExportFallback(item, data, rec); return { ok: false, fallback: true, name: item.name }; }
            return { ok: false, name: item.name, error: e };
          });
        }
        toast('⚠ Không đọc được mẫu "' + item.name + '" do đang mở bằng file:// — xuất bản TXT tạm thời', 'orange');
        if (typeof window._hsvExportFallback === 'function') { window._hsvExportFallback(item, data, rec); return { ok: false, fallback: true, name: item.name }; }
      } else if (isNetIssue) {
        if (typeof window._hsvExportFallback === 'function') { window._hsvExportFallback(item, data, rec); return { ok: false, fallback: true, name: item.name }; }
      }
      toast('❌ Lỗi xuất "' + item.name + '": ' + msg, 'red');
      return { ok: false, name: item.name, error: e };
    });
  };

  /* Wrapper mỏng: giữ nguyên API cũ để không phá vỡ onclick hiện có */
  window._hsvExportOne = function (item, data, rec, signal) {
    return TD.exportDocx({ item: item, data: data, rec: rec, signal: signal }).then(function (r) {
      if (r && r.ok) toast('✅ Đã xuất: ' + item.name, 'green');
      return r;
    });
  };

  /* ───────── 3.6 Tiến trình + nút Hủy ───────── */
  function progUI() {
    var el = document.getElementById('td-batch-prog');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'td-batch-prog';
    el.style.cssText = 'position:fixed;inset:0;z-index:calc(var(--z-7,99990) + 3);display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.35)';
    el.innerHTML =
      '<div style="background:#fff;min-width:320px;max-width:90vw;border-radius:10px;padding:16px 18px;font:13px/1.55 \'Times New Roman\',Times,serif;box-shadow:0 10px 30px rgba(0,0,0,.25)">' +
      '<div id="td-bp-title" style="font-weight:700;margin-bottom:8px">⏳ Đang xuất…</div>' +
      '<div style="height:10px;background:#eee;border-radius:6px;overflow:hidden"><div id="td-bp-fill" style="height:100%;width:0;background:#1f7a3f;transition:width .2s"></div></div>' +
      '<div id="td-bp-lbl" style="margin-top:8px;color:#555"></div>' +
      '<div style="margin-top:12px;text-align:right"><button type="button" id="td-bp-cancel" style="padding:6px 14px;border:1px solid #c33;background:#fff;color:#c33;border-radius:6px;cursor:pointer">✕ Hủy</button></div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }
  function progOpen(total) {
    var el = progUI(); el.style.display = 'flex';
    var ac = new AbortController();
    el.querySelector('#td-bp-cancel').onclick = function () { ac.abort(); el.querySelector('#td-bp-lbl').textContent = 'Đang hủy…'; };
    return { el: el, ac: ac, total: total };
  }
  function progUpdate(p, done, label) {
    p.el.querySelector('#td-bp-title').textContent = '⏳ Đang xuất file ' + Math.min(done + 1, p.total) + '/' + p.total;
    p.el.querySelector('#td-bp-fill').style.width = Math.round(done / p.total * 100) + '%';
    p.el.querySelector('#td-bp-lbl').textContent = label || '';
  }
  function progDone(p, txt) {
    p.el.querySelector('#td-bp-fill').style.width = '100%';
    p.el.querySelector('#td-bp-title').textContent = txt;
    p.el.querySelector('#td-bp-lbl').textContent = 'Hoàn thành';
    setTimeout(function () { p.el.style.display = 'none'; }, 2200);
  }

  TD.exportDocxBatch = function (items, data, rec) {
    var p = progOpen(items.length), okN = 0, failN = 0, i = 0;
    return (function next() {
      if (i >= items.length || p.ac.signal.aborted) return Promise.resolve();
      var it = items[i];
      progUpdate(p, i, it.name);
      return TD.exportDocx({ item: it, data: data, rec: rec, signal: p.ac.signal }).then(function (r) {
        if (r && r.ok) okN++; else failN++;
        i++;
        return new Promise(function (res) { setTimeout(res, 60); }).then(next);
      });
    })().then(function () {
      var aborted = p.ac.signal.aborted;
      progDone(p, (aborted ? '⛔ Đã hủy — ' : '✅ Hoàn tất — ') + okN + ' thành công, ' + failN + ' lỗi');
      toast((aborted ? '⛔ Đã hủy xuất hàng loạt. ' : '✅ Xuất xong. ') + okN + ' thành công, ' + failN + ' lỗi', aborted ? 'orange' : 'green');
      return { ok: okN, fail: failN, aborted: aborted };
    });
  };
  window._hsvExportBatch = function (items, data, rec) { return TD.exportDocxBatch(items, data, rec); };

  /* ───────── 3.4 Preload vendor trên PC sau first paint ───────── */
  // FIX GỐC RỄ v2026-08-19: banner vàng "Đang mở bằng giao thức file://"
  // trước đây tự bật ngay khi mở file, dù người dùng chưa xuất Word lần nào.
  // NGUYÊN NHÂN: boot() gọi showFileBanner() vô điều kiện mỗi lần tải trang.
  // SỬA TẬN GỐC: bỏ lời gọi tự động này — showFileBanner() vẫn được gọi đúng
  // lúc cần thật sự, tức khi xuất Word gặp lỗi mạng/CORS do chạy trên
  // file:// (xem nhánh catch của TD.exportDocx phía trên), nên người dùng
  // chỉ thấy cảnh báo khi nó thực sự liên quan.
  function boot() {
    if (TD.env.isPC) setTimeout(function () { ensureVendors(); }, 400);
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot, { once: true });

  try { console.info('[TD v14.4.0] export engine ready — TD.exportDocx / TD.exportDocxBatch / TD.clearTemplateCache'); } catch (_) {}
})();
