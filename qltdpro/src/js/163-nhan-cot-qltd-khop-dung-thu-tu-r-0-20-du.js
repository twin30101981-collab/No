
/* ═══════════════════════════════════════════════════════════════════════
   📜 AUDIT TRAIL — Nhật ký chỉnh sửa (v1, thêm mới 07/09/2026)
   Module TỰ CHỨA, không đụng vào schema r[...]/DATA.hosovay hiện có.
   Chỉ ĐỌC dữ liệu để so sánh trước/sau, ghi log riêng vào key mới
   'td_audit_log_v1' (không ảnh hưởng các key localStorage khác).
   An toàn: mọi lỗi trong module này đều bị nuốt (try/catch), KHÔNG BAO
   GIỜ được phép chặn hoặc làm hỏng luồng saveData() gốc.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var LOG_KEY   = 'td_audit_log_v1';
  var ACTOR_KEY = 'td_audit_actor_v1';
  var MAX_LOG   = 300;
  // Nhãn cột QLTD — khớp đúng thứ tự r[0..20] dùng trong exportCurrentTable()
  var QLTD_COLS = ['Mã KH','Tên KH','Số HĐTD','Ngày HĐ','Ngày HĐTD','HMTD','Ngày GN',
    'Ngày trả nợ','L/S %','Số tiền GN','Tiền lãi','Dư nợ','CBTD','Loại vay','Địa chỉ',
    'Mục đích','Gốc trả','Phòng ban','Nhóm nợ','Số hồ sơ','Số TK'];

  function esc(s){ return (typeof window.escapeHtml === 'function') ? window.escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function getActor() {
    try { return localStorage.getItem(ACTOR_KEY) || ''; } catch (e) { return ''; }
  }
  window.tdAuditSetActor = function () {
    try {
      var cur = getActor();
      var name = prompt('Nhập tên/mã CBTD của bạn (dùng để ghi nhật ký chỉnh sửa):', cur);
      if (name != null) {
        name = name.trim();
        localStorage.setItem(ACTOR_KEY, name);
        var chip = document.getElementById('td-audit-actor-chip');
        if (chip) chip.textContent = '👤 ' + (name || 'Chưa đặt tên');
      }
    } catch (e) { console.warn('[audit] setActor', e); }
  };

  function loadLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; }
  }
  function appendLog(entries) {
    if (!entries || !entries.length) return;
    try {
      var log = loadLog();
      for (var i = 0; i < entries.length; i++) log.push(entries[i]);
      if (log.length > MAX_LOG) log = log.slice(log.length - MAX_LOG);
      localStorage.setItem(LOG_KEY, JSON.stringify(log));
    } catch (e) {
      // Hết quota hay lỗi bất kỳ: bỏ qua, KHÔNG được làm hỏng save chính
      console.warn('[audit] appendLog failed', e);
    }
  }
  function trunc(s, n) {
    s = (s == null) ? '' : String(s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function keyOfRow(r) { return String((r && r[0]) || '') + '‖' + String((r && r[2]) || ''); }

  function diffQltd(prevRows, curRows) {
    var out = [];
    var ts = Date.now(), actor = getActor() || 'Chưa đặt tên';
    var prevMap = {}, curMap = {};
    (prevRows || []).forEach(function (r) { if (r) prevMap[keyOfRow(r)] = r; });
    (curRows || []).forEach(function (r) { if (r) curMap[keyOfRow(r)] = r; });
    Object.keys(curMap).forEach(function (k) {
      if (!(k in prevMap)) {
        out.push({ ts: ts, actor: actor, type: 'qltd', action: 'add', key: k, changes: [] });
      }
    });
    Object.keys(prevMap).forEach(function (k) {
      if (!(k in curMap)) {
        out.push({ ts: ts, actor: actor, type: 'qltd', action: 'del', key: k, changes: [] });
        return;
      }
      var a = prevMap[k], b = curMap[k];
      var changes = [];
      for (var c = 0; c < QLTD_COLS.length; c++) {
        var av = a[c], bv = b[c];
        if (String(av == null ? '' : av) !== String(bv == null ? '' : bv)) {
          changes.push({ col: QLTD_COLS[c], before: trunc(av, 60), after: trunc(bv, 60) });
        }
      }
      if (changes.length) out.push({ ts: ts, actor: actor, type: 'qltd', action: 'edit', key: k, changes: changes });
    });
    return out;
  }

  function diffHosovay(prevObj, curObj) {
    var out = [];
    var ts = Date.now(), actor = getActor() || 'Chưa đặt tên';
    prevObj = prevObj || {}; curObj = curObj || {};
    var prevKeys = Object.keys(prevObj), curKeys = Object.keys(curObj);
    curKeys.forEach(function (id) {
      if (!(id in prevObj)) {
        out.push({ ts: ts, actor: actor, type: 'hosovay', action: 'add', key: id, changes: [] });
      } else {
        var sa = JSON.stringify(prevObj[id]), sb = JSON.stringify(curObj[id]);
        if (sa !== sb) {
          out.push({ ts: ts, actor: actor, type: 'hosovay', action: 'edit', key: id,
            changes: [{ col: '(toàn bộ hồ sơ)', before: trunc(sa, 200), after: trunc(sb, 200) }] });
        }
      }
    });
    prevKeys.forEach(function (id) {
      if (!(id in curObj)) out.push({ ts: ts, actor: actor, type: 'hosovay', action: 'del', key: id, changes: [] });
    });
    return out;
  }

  // ── Hook saveData() — chỉ đọc/so sánh, KHÔNG bao giờ chặn save gốc ──
  var _prevQltd = null, _prevHoso = null, _inited = false;
  function snapshotNow() {
    try {
      var D = window.DATA || {};
      return {
        qltd: JSON.parse(JSON.stringify(D.qltd || [])),
        hoso: JSON.parse(JSON.stringify(D.hosovay || {}))
      };
    } catch (e) { return { qltd: [], hoso: {} }; }
  }
  function runDiffAndLog() {
    try {
      var D = window.DATA || {};
      var curQltd = D.qltd || [], curHoso = D.hosovay || {};
      var entries = diffQltd(_prevQltd, curQltd).concat(diffHosovay(_prevHoso, curHoso));
      appendLog(entries);
    } catch (e) { console.warn('[audit] diff error', e); }
  }
  function hookSaveData() {
    if (typeof window.saveData !== 'function' || window.saveData.__tdAuditWrapped) return false;
    var orig = window.saveData;
    var wrapped = function () {
      if (window.__TD_SAVE_DEFER > 0) return orig.apply(this, arguments); // P10 (T5): lần lưu bị hoãn trong đợt nhập — so sánh 1 lần ở lần lưu cuối đợt (khỏi sao chép sâu 2 × toàn bộ dư nợ mỗi lần gọi)
      try {
        if (!_inited) {
          var snap = snapshotNow();
          _prevQltd = snap.qltd; _prevHoso = snap.hoso;
          _inited = true;
        } else {
          runDiffAndLog();
          var snap2 = snapshotNow();
          _prevQltd = snap2.qltd; _prevHoso = snap2.hoso;
        }
      } catch (e) { console.warn('[audit] hook pre-save', e); }
      return orig.apply(this, arguments);
    };
    wrapped.__tdAuditWrapped = true;
    window.saveData = wrapped;
    return true;
  }
  if (!hookSaveData()) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (hookSaveData() || tries > 40) clearInterval(iv);
    }, 250);
  }

  // ── UI: chip actor + nút "📜 Nhật ký" trên topbar ──
  function fmtTs(ts) {
    var d = new Date(ts);
    function p(n){ return String(n).padStart(2,'0'); }
    return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes());
  }
  function actionLabel(a) { return a === 'add' ? '➕ Thêm mới' : a === 'del' ? '🗑️ Xóa' : '✏️ Sửa'; }

  window.tdAuditOpenViewer = function () {
    try {
      var log = loadLog().slice().reverse(); // mới nhất trước
      var old = document.getElementById('td-audit-modal');
      if (old) old.remove();
      var wrap = document.createElement('div');
      wrap.id = 'td-audit-modal';
      wrap.className = 'no-print';
      wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:calc(var(--z-7,99990) + 4);display:flex;align-items:center;justify-content:center';
      var rows = log.length ? log.map(function (e) {
        var chg = (e.changes || []).map(function (c) {
          return '<div style="font-size:12px;color:#333"><b>' + esc(c.col) + ':</b> '
            + '<span style="color:#b91c1c;text-decoration:line-through">' + esc(c.before) + '</span> → '
            + '<span style="color:#166534">' + esc(c.after) + '</span></div>';
        }).join('');
        return '<tr>'
          + '<td style="white-space:nowrap;font-size:12px;color:#555">' + esc(fmtTs(e.ts)) + '</td>'
          + '<td style="font-size:12px">' + esc(e.actor) + '</td>'
          + '<td style="font-size:12px">' + (e.type === 'qltd' ? 'QLTD' : 'HSVV') + '</td>'
          + '<td style="font-size:12px">' + actionLabel(e.action) + '</td>'
          + '<td style="font-size:12px;font-weight:600">' + esc(e.key) + '</td>'
          + '<td>' + (chg || '<span style="color:#6b7280;font-size:12px">—</span>') + '</td>'
          + '</tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:20px">Chưa có nhật ký nào</td></tr>';
      wrap.innerHTML =
        '<div style="background:#fff;border-radius:8px;max-width:1000px;width:95%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden">'
        + '<div style="background:#1a2540;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">'
        + '<b>📜 Nhật ký chỉnh sửa (' + log.length + ' bản ghi gần nhất, tối đa ' + MAX_LOG + ')</b>'
        + '<button id="td-audit-close" style="background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1">✕</button>'
        + '</div>'
        + '<div style="overflow:auto;flex:1">'
        + '<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9;position:sticky;top:0">'
        + '<th style="text-align:left;padding:8px;font-size:12px">Thời gian</th>'
        + '<th style="text-align:left;padding:8px;font-size:12px">Người thực hiện</th>'
        + '<th style="text-align:left;padding:8px;font-size:12px">Phân hệ</th>'
        + '<th style="text-align:left;padding:8px;font-size:12px">Hành động</th>'
        + '<th style="text-align:left;padding:8px;font-size:12px">Mã KH‖Số HĐ / ID</th>'
        + '<th style="text-align:left;padding:8px;font-size:12px">Chi tiết thay đổi</th>'
        + '</tr></thead><tbody>' + rows + '</tbody></table>'
        + '</div></div>';
      document.body.appendChild(wrap);
      document.getElementById('td-audit-close').onclick = function () { wrap.remove(); };
      wrap.addEventListener('click', function (ev) { if (ev.target === wrap) wrap.remove(); });
    } catch (e) { console.warn('[audit] openViewer', e); alert('Không thể mở nhật ký: ' + e.message); }
  };

  function injectAuditUI() {
    if (document.getElementById('td-audit-actor-chip')) return;
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    var actor = getActor();
    var chip = document.createElement('button');
    chip.id = 'td-audit-actor-chip';
    chip.className = 'btn btn-outline btn-sm no-print';
    chip.title = 'Đặt tên người thao tác (dùng cho nhật ký chỉnh sửa)';
    chip.textContent = '👤 ' + (actor || 'Chưa đặt tên');
    chip.style.marginLeft = '4px';
    chip.onclick = function () { window.tdAuditSetActor(); };
    var logBtn = document.createElement('button');
    logBtn.id = 'btn-audit-log';
    logBtn.className = 'btn btn-navy btn-sm no-print';
    logBtn.title = 'Xem nhật ký chỉnh sửa (audit trail)';
    logBtn.innerHTML = '📜 Nhật ký';
    logBtn.style.marginLeft = '4px';
    logBtn.onclick = function () { window.tdAuditOpenViewer(); };
    bar.appendChild(chip);
    bar.appendChild(logBtn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectAuditUI);
  else injectAuditUI();
  setTimeout(injectAuditUI, 800);
  setTimeout(injectAuditUI, 2000);
})();
