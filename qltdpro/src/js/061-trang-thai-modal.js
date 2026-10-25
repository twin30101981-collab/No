
/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION SYSTEM — PRO-47
   + Lọc CBTD (mặc định: cán bộ đặt ở Tiện ích → Danh sách cán bộ — P10)
   + Toggle dạng Bảng ↔ Tin nhắn
   + Copy từng dòng / Copy tất cả
   ═══════════════════════════════════════════════════════════════ */

const NOTIF_LS_KEY        = 'notif_checked_v1_';
const DEFAULT_NOTIF_CBTD  = ''; // P10 (T6): không nhúng tên — dùng TD_SXCB.defaultCbtd() (cấu hình người dùng)

// ── Trạng thái modal ──────────────────────────────────────────
let _notifViewMode   = 'table';           // 'table' | 'text'
let _notifCBTDFilter = null; // lọc CBTD (null = chưa chọn ⇒ lấy cán bộ mặc định đã cấu hình)
let _notifCurrentKey = null;              // nhóm đang mở
let _notifTextLines  = [];               // cache dòng text để copy

/* ─── Quét và phân loại dữ liệu ─── */
// QA-FEATURE: gop 4 nguon canh bao rai rac thanh 1 checklist "Viec can lam hom nay"
// - dua tren du lieu da co san (scanNotifications, TSBD_getExpiringSoonCount, TDUP5), khong tinh lai gi moi.
function openTodoToday() {
  var today = todayMidnight();
  var res = scanNotifications((window.DATA && DATA.qltd) ? DATA.qltd : [], today);
  var tsbdN = (typeof window.TSBD_getExpiringSoonCount === 'function') ? window.TSBD_getExpiringSoonCount() : 0;
  var tdup5N = 0;
  try { if (window.TDUP5 && typeof TDUP5.scanInterestOverdue === 'function') tdup5N = TDUP5.scanInterestOverdue().length; } catch (e) {}

  var dayKey = 'todo_done_' + today.toISOString().slice(0, 10);
  var done = {};
  try { done = JSON.parse(localStorage.getItem(dayKey) || '{}'); } catch (e) {}

  var items = [
    { id: 'overdue',  icon: '🔴', label: (res.overdue || []).length + ' khoản nợ quá hạn cần đôn đốc',        n: (res.overdue || []).length,  go: function () { openNotifDetail('overdue'); } },
    { id: 'dueToday', icon: '🔥', label: (res.dueToday || []).length + ' khoản đến hạn HÔM NAY',                n: (res.dueToday || []).length, go: function () { openNotifDetail('dueToday'); } },
    { id: 'hdtdToday',icon: '📌', label: (res.hdtdToday || []).length + ' HĐTD đến hạn HÔM NAY',                n: (res.hdtdToday || []).length,go: function () { openNotifDetail('hdtdToday'); } },
    { id: 'tsbd',     icon: '🏠', label: tsbdN + ' tài sản sắp hết hạn thế chấp (≤60 ngày)',                    n: tsbdN,                       go: function () { if (typeof window.TSBD_openExpiringSoon === 'function') window.TSBD_openExpiringSoon(); } },
    { id: 'tdup5',    icon: '⚠️', label: tdup5N + ' khoản Nhóm 1 nhưng lãi đã quá hạn (TT11/31)',                n: tdup5N,                      go: function () { var b = document.getElementById('tdup5-badge'); if (b) b.click(); else alert('Không có khoản nào thuộc diện này ở thời điểm hiện tại.'); } }
  ];

  window._todoGoFns = {};
  items.forEach(function (it) { window._todoGoFns[it.id] = it.go; });
  var rowsHtml = items.map(function (it) {
    var isDone = !!done[it.id];
    var noneYet = it.n === 0;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #eee' + (isDone ? ';opacity:.45' : '') + '">'
      + '<input type="checkbox" ' + (isDone ? 'checked' : '') + (noneYet ? ' disabled' : '') + ' onchange="_todoToggle(\'' + it.id + '\', this.checked)" style="width:16px;height:16px">'
      + '<span style="font-size:18px">' + it.icon + '</span>'
      + '<span style="flex:1;font-size:13px;' + (isDone ? 'text-decoration:line-through' : 'font-weight:600') + '">' + it.label + '</span>'
      + (noneYet ? '<span style="font-size:11px;color:var(--gray-500)">Không có</span>'
                 : '<button class="btn btn-outline btn-sm" onclick="_todoGo(\'' + it.id + '\')">Xem</button>')
      + '</div>';
  }).join('');

  var totalOpen = items.filter(function (it) { return it.n > 0 && !done[it.id]; }).length;
  var html = '<div class="modal-overlay open" id="todo-today-modal" style="display:flex" onclick="if(event.target===this)closeTodoToday()">'
    + '<div class="modal" style="max-width:560px;width:94%">'
    + '<div class="modal-header"><h3>📋 Việc cần làm hôm nay</h3><span class="close" onclick="closeTodoToday()">×</span></div>'
    + '<div style="padding:6px 0">'
    + (totalOpen === 0
        ? '<div style="padding:30px;text-align:center;color:#15803d;font-weight:700">✅ Không còn việc gì tồn đọng hôm nay!</div>'
        : rowsHtml)
    + '</div>'
    + '<div style="padding:10px 16px;color:var(--gray-500);font-size:11px;border-top:1px solid #eee">Tích "đã xử lý" chỉ để tự nhắc trong ngày — không thay đổi số liệu hay dữ liệu hồ sơ.</div>'
    + '</div></div>';

  var old = document.getElementById('todo-today-modal');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}
function closeTodoToday() { var m = document.getElementById('todo-today-modal'); if (m) m.remove(); }
function _todoGo(id) { closeTodoToday(); var fn = window._todoGoFns && window._todoGoFns[id]; if (typeof fn === 'function') fn(); }
function _todoToggle(id, checked) {
  var dayKey = 'todo_done_' + realTodayMidnight().toISOString().slice(0, 10);
  var done = {};
  try { done = JSON.parse(localStorage.getItem(dayKey) || '{}'); } catch (e) {}
  done[id] = checked;
  try { localStorage.setItem(dayKey, JSON.stringify(done)); } catch (e) {}
  openTodoToday();
}

function scanNotifications(rows, today) {
  const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
  const isSameDay = (a, b) => a && b
    && a.getFullYear()===b.getFullYear()
    && a.getMonth()===b.getMonth()
    && a.getDate()===b.getDate();
  const d1  = addDays(today, 1);
  const d15 = addDays(today, 15);
  const d30 = addDays(today, 30);
  const res = { overdue:[], dueToday:[], due1:[], due15:[], due30:[], hdtdToday:[], hdtd1:[], hdtd15:[], hdtd30:[] };
  rows.forEach(r => {
    if ((Number(r[11]) || 0) <= 0) return;
    const dTraNo = parseVNDate(r[7]);
    const dHDTD  = parseVNDate(r[3]);
    const st = (DATA.denhanStatus || {})[denhanKey(r)] || {};
    if (dTraNo && !st.dathu) {
      if      (dTraNo < today)           res.overdue.push(r);
      else if (isSameDay(dTraNo, today)) res.dueToday.push(r);
      else if (isSameDay(dTraNo, d1))    res.due1.push(r);
      else if (isSameDay(dTraNo, d15))   res.due15.push(r);
      else if (isSameDay(dTraNo, d30))   res.due30.push(r);
    }
    if (dHDTD) {
      if      (isSameDay(dHDTD, today)) res.hdtdToday.push(r);
      else if (isSameDay(dHDTD, d1))    res.hdtd1.push(r);
      else if (isSameDay(dHDTD, d15))   res.hdtd15.push(r);
      else if (isSameDay(dHDTD, d30))   res.hdtd30.push(r);
    }
  });
  return res;
}

/* ─── Điểm vào chính — chỉ chạy 1 lần/ngày ─── */
function checkAndNotify() {
  if (!DATA.qltd || !DATA.qltd.length) return;
  const today  = todayMidnight();
  const dayKey = NOTIF_LS_KEY + today.toISOString().slice(0, 10);
  if (localStorage.getItem(dayKey) === 'done') return;
  const result = scanNotifications(DATA.qltd, today);
  const total  = Object.values(result).reduce((s,a) => s + a.length, 0);
  // QA-FIX: khong duoc bo qua neu chi co canh bao TSBD (khac cau truc du lieu voi result)
  const tsbdSoonN = (typeof window.TSBD_getExpiringSoonCount === 'function') ? window.TSBD_getExpiringSoonCount() : 0;
  if (total === 0 && tsbdSoonN === 0) { safeLSSet(dayKey, 'done'); return; }
  safeLSSet(dayKey, 'done');
  window._notifData = result;
  showNotifBanner(result);
  playNotifSound(result.overdue.length > 0 || (result.dueToday && result.dueToday.length > 0) || result.due1.length > 0 ? 'urgent' : 'normal');
  requestAndSendChromeNotif(result);
}

/* ─── Banner ─── */
function showNotifBanner(result) {
  const banner  = document.getElementById('notif-banner');
  const pillBox = document.getElementById('notif-pills');
  if (!banner || !pillBox) return;
  const GROUPS = [
    { key:'overdue', color:'#c0392b', bg:'#fde8e6', icon:'🔴', text: n=>`${n} khoản NỢ QUÁ HẠN` },
    { key:'dueToday',color:'#a3231d', bg:'#fce4e2', icon:'🔥', text: n=>`${n} khoản đến hạn HÔM NAY` },
    { key:'due1',    color:'#b45309', bg:'#fef3e2', icon:'🟠', text: n=>`${n} khoản đến hạn NGÀY MAI` },
    { key:'due15',   color:'#c9962e', bg:'#fef6e0', icon:'🟡', text: n=>`${n} khoản còn 15 ngày` },
    { key:'due30',   color:'#2471a3', bg:'#dbeafe', icon:'🔵', text: n=>`${n} khoản còn 30 ngày` },
    { key:'hdtdToday', color:'#a3231d', bg:'#fce4e2', icon:'📌', text: n=>`${n} HĐTD đến hạn HÔM NAY` },
    { key:'hdtd1',   color:'#b45309', bg:'#fef3e2', icon:'📋', text: n=>`${n} HĐTD đến hạn NGÀY MAI` },
    { key:'hdtd15',  color:'#c9962e', bg:'#fef6e0', icon:'📄', text: n=>`${n} HĐTD còn 15 ngày` },
    { key:'hdtd30',  color:'#2471a3', bg:'#dbeafe', icon:'📃', text: n=>`${n} HĐTD còn 30 ngày` },
  ];
  pillBox.innerHTML = GROUPS
    .filter(g => result[g.key] && result[g.key].length > 0)
    .map(g => {
      const n = result[g.key].length;
      return `<span class="notif-pill"
        style="color:${g.color};background:${g.bg};border-color:${g.color}"
        onclick="openNotifDetail('${g.key}')"
        title="Click để xem chi tiết">${g.icon} ${g.text(n)}</span>`;
    }).join('');
  // QA-FEATURE: pill rieng cho TSBD sap het han the chap (du lieu khac cau truc, khong dung
  // chung modal openNotifDetail duoc, nen dieu huong thang sang trang TSBD + bat filter co san)
  try {
    const tsbdN = (typeof window.TSBD_getExpiringSoonCount === 'function') ? window.TSBD_getExpiringSoonCount() : 0;
    if (tsbdN > 0) {
      pillBox.innerHTML += `<span class="notif-pill"
        style="color:#a3661d;background:#fdf1e0;border-color:#a3661d"
        onclick="TSBD_openExpiringSoon()"
        title="Click để xem danh sách tài sản">🏠 ${tsbdN} tài sản sắp hết hạn thế chấp</span>`;
    }
  } catch(e) { console.warn('[TSBD pill]', e); }
  banner.style.display = 'block';
  _updateNotifBadge(result);
}

function dismissNotifBanner() {
  const b = document.getElementById('notif-banner');
  if (b) b.style.display = 'none';
}

function _updateNotifBadge(result) {
  const badge = document.getElementById('badge-notif');
  const inbox = document.getElementById('inbox-badge');
  const urgent = result.overdue.length + (result.dueToday?result.dueToday.length:0) + result.due1.length + result.hdtd1.length;
  const total  = Object.values(result).reduce((s,a) => s + a.length, 0);
  if (total > 0) {
    if (badge) {
      badge.textContent   = total;
      badge.className     = urgent > 0 ? 'badge red' : 'badge';
      badge.style.display = 'inline-flex';
    }
    if (inbox) {
      inbox.textContent  = total > 99 ? '99+' : total;
      inbox.className    = urgent > 0 ? 'urgent' : '';
      inbox.style.display = 'block';
    }
  } else {
    if (badge) badge.style.display = 'none';
    if (inbox) inbox.style.display = 'none';
  }
}

/* ─── Config nhóm ─── */
const _NOTIF_GROUP_CFG = {
  overdue: { label:'🔴 Nợ quá hạn',              color:'#c0392b', bg:'#fde8e6', colName:'NGÀY TRẢ NỢ', colIdx:7 },
  dueToday:{ label:'🔥 Đến hạn hôm nay',          color:'#a3231d', bg:'#fce4e2', colName:'NGÀY TRẢ NỢ', colIdx:7 },
  due1:    { label:'🟠 Đến hạn ngày mai',          color:'#b45309', bg:'#fef3e2', colName:'NGÀY TRẢ NỢ', colIdx:7 },
  due15:   { label:'🟡 Đến hạn sau 15 ngày',       color:'#c9962e', bg:'#fef6e0', colName:'NGÀY TRẢ NỢ', colIdx:7 },
  due30:   { label:'🔵 Đến hạn sau 30 ngày',       color:'#2471a3', bg:'#dbeafe', colName:'NGÀY TRẢ NỢ', colIdx:7 },
  hdtdToday:{ label:'📌 HĐTD đến hạn hôm nay',     color:'#a3231d', bg:'#fce4e2', colName:'NGÀY HĐTD',  colIdx:3 },
  hdtd1:   { label:'📋 HĐTD đến hạn ngày mai',     color:'#b45309', bg:'#fef3e2', colName:'NGÀY HĐTD',  colIdx:3 },
  hdtd15:  { label:'📄 HĐTD đến hạn sau 15 ngày',  color:'#c9962e', bg:'#fef6e0', colName:'NGÀY HĐTD',  colIdx:3 },
  hdtd30:  { label:'📃 HĐTD đến hạn sau 30 ngày',  color:'#2471a3', bg:'#dbeafe', colName:'NGÀY HĐTD',  colIdx:3 },
};

/* ─── Mở modal ─── */
function openNotifDetail(key) {
  const modal = document.getElementById('notif-detail-modal');
  if (!modal) return;
  _notifCurrentKey = key || null;
  // Quét lại nếu chưa có dữ liệu
  if (!window._notifData) {
    window._notifData = scanNotifications(DATA.qltd || [], todayMidnight());
  }
  // Build dropdown CBTD
  _buildNotifCBTDOptions();
  // Render nội dung
  _notifRenderBody();
  // Trạng thái toggle buttons
  _syncNotifToggleBtns();
  // Trạng thái Chrome permission
  _updateNotifPermStatus();
  modal.style.display = 'flex';
  modal.classList.add('open');
}

/* ─── Xây dựng dropdown CBTD ─── */
function _buildNotifCBTDOptions() {
  const sel = document.getElementById('notif-filter-cbtd');
  if (!sel || !window._notifData) return;
  const allRows = Object.values(window._notifData).flat();
  const cbtds   = window.TD_SXCB.sortNames([...new Set(allRows.map(r => r[12]).filter(Boolean))]);
  sel.innerHTML  = '<option value="">— Tất cả CBTD —</option>' +
    cbtds.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  // Ưu tiên: filter hiện tại → DEFAULT_NOTIF_CBTD → không chọn
  // Theo dõi TẤT CẢ CBTD (không mặc định 1 cán bộ)
  const _want = _notifCBTDFilter === null ? ((window.TD_SXCB && TD_SXCB.defaultCbtd && TD_SXCB.defaultCbtd()) || DEFAULT_NOTIF_CBTD) : _notifCBTDFilter;
  if (cbtds.includes(_want)) { sel.value = _want; _notifCBTDFilter = _want; } else if (_notifCBTDFilter === null) _notifCBTDFilter = '';
}

/* ─── Áp dụng filter CBTD ─── */
function notifApplyFilter() {
  const sel = document.getElementById('notif-filter-cbtd');
  _notifCBTDFilter = sel ? sel.value : '';
  _notifRenderBody();
}

/* ─── Chuyển chế độ Bảng ↔ Tin nhắn ─── */
function notifSetView(mode) {
  _notifViewMode = mode;
  _syncNotifToggleBtns();
  _notifRenderBody();
}

/* _syncNotifToggleBtns moved to enhanced section */

/* ─── Lấy dữ liệu đã lọc theo CBTD ─── */
function _notifGetFilteredGroups() {
  if (!window._notifData) return [];
  const data = window._notifData;
  const key  = _notifCurrentKey;
  let groups;
  if (key && _NOTIF_GROUP_CFG[key]) {
    groups = [{ cfg: _NOTIF_GROUP_CFG[key], rows: (data[key] || []).slice(), key }];
  } else {
    groups = Object.entries(_NOTIF_GROUP_CFG)
      .map(([k, cfg]) => ({ cfg, rows: (data[k] || []).slice(), key: k }))
      .filter(g => g.rows.length > 0);
  }
  // Áp dụng filter CBTD
  if (_notifCBTDFilter) {
    groups = groups
      .map(g => ({ ...g, rows: g.rows.filter(r => r[12] === _notifCBTDFilter) }))
      .filter(g => g.rows.length > 0);
  }
  return groups;
}

/* ─── Render body modal ─── */
function notifExportExcel() {
  // QA-FEATURE: xuat danh sach nhac no dang xem (bat ky trong 9 loai) ra CSV/Excel
  const groups = _notifGetFilteredGroups();
  if (!groups.length) { showToast('⚠️ Không có dữ liệu để xuất', 'red'); return; }
  const hdr = ['Nhóm', 'Mã KH', 'Tên KH', 'Số HĐTD', 'Mốc ngày', 'Dư nợ (đ)', 'Loại vay', 'CBTD'];
  const lines = [hdr.join(',')];
  groups.forEach(({ cfg, rows, key }) => {
    rows.forEach(r => {
      lines.push([
        cfg.label.replace(/^[^\wÀ-ỹ]+/, '').trim(),
        r[0] || '', r[1] || '', r[2] || '',
        r[cfg.colIdx] || '', Number(r[11]) || 0,
        (r[13] || '').replace(/Vay |\ \(TK 21\d\)/g, ''),
        r[12] || ''
      ].map(csvEscape).join(','));
    });
  });
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = realTodayMidnight().toISOString().slice(0,10);
  a.href = url;
  a.download = `NhacNo_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 Đã xuất file nhắc nợ', 'green');
}

function _notifRenderBody() {
  const body  = document.getElementById('notif-detail-body');
  const title = document.getElementById('notif-detail-title');
  if (!body) return;
  // Cập nhật tiêu đề modal
  if (title) {
    const cbtdStr = _notifCBTDFilter ? ` · ${_notifCBTDFilter}` : '';
    const key = _notifCurrentKey;
    title.textContent = (key && _NOTIF_GROUP_CFG[key])
      ? _NOTIF_GROUP_CFG[key].label + cbtdStr
      : '🔔 Thông báo nợ hôm nay' + cbtdStr;
  }
  const groups = _notifGetFilteredGroups();
  if (!groups.length) {
    const who = _notifCBTDFilter ? ` cho CBTD <strong>${escapeHtml(_notifCBTDFilter)}</strong>` : '';
    body.innerHTML = `<div style="text-align:center;padding:36px;color:var(--gray-400);font-size:14px">
      ✅ Không có thông báo nào${who} hôm nay!
    </div>`;
    return;
  }
  body.innerHTML = _notifViewMode === 'text'
    ? _renderNotifText(groups)
    : _renderNotifTable(groups);
}

/* ─── Dạng Bảng ─── */
function _renderNotifTable(groups) {
  return groups.map(({ cfg, rows }) => `
    <div class="nd-section">
      <div class="nd-section-hdr" style="background:${cfg.bg};color:${cfg.color}">
        ${cfg.label}
        <span style="font-size:11px;font-weight:500;margin-left:6px;opacity:.8">
          (${rows.length} khoản · tổng: ${fmtMoney(rows.reduce((s,r)=>s+(Number(r[11])||0),0))} đ)
        </span>
      </div>
      <table class="nd-table">
        <thead><tr>
          <th style="min-width:140px">Tên KH</th>
          <th style="min-width:90px;text-align:center">${cfg.colName}</th>
          <th style="min-width:110px;text-align:right">Dư nợ (đ)</th>
          <th style="min-width:100px">Loại vay</th>
          <th>CBTD</th>
        </tr></thead>
        <tbody>
          ${rows.map((r,i) => `<tr style="background:${i%2===0?'#fff':'#f6f8fb'}">
            <td style="font-weight:600">${escapeHtml(r[1]||'')}</td>
            <td style="text-align:center;color:${cfg.color};font-weight:700">${escapeHtml(r[cfg.colIdx]||'')}</td>
            <td style="text-align:right;font-weight:700;color:var(--navy)">${fmtMoney(r[11])}</td>
            <td>${escapeHtml((r[13]||'').replace(/Vay |\ \(TK 21\d\)/g,''))}</td>
            <td style="font-size:11px">${escapeHtml(r[12]||'')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

/* ─── Dạng Tin nhắn thuần ─── */
function _notifFmtLine(r, colIdx) {
  // Delegate to template system (defined later in code)
  const lineFmt = (typeof _notifGetLineFormatter === 'function') ? _notifGetLineFormatter() : null;
  if (lineFmt) return lineFmt(r, colIdx);
  const ngay = r[colIdx] || r[7] || '';
  return `${(r[1]||'').trim()} — HĐTD ${(r[2]||'').trim()} — Đến hạn: ${ngay} — Dư nợ: ${fmtMoney(r[11])}đ — CBTD: ${(r[12]||'').trim()}`;
}
// _renderNotifText is defined in the enhanced THONG BAO NO section

/* ─── Copy ─── */
function notifCopyAll() {
  if (!_notifTextLines.length) { showToast('Không có dòng nào để copy', ''); return; }
  const text = _notifTextLines.join('\n');
  _doCopy(text, `📋 Đã copy ${_notifTextLines.length} dòng`, `📋 Copy tất cả (${_notifTextLines.length} dòng)`);
}

/* notifCopyRow moved to enhanced section */

function _doCopy(text, successMsg, fallbackTitle) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(successMsg, 'green'))
      .catch(() => _clipFallback(text, fallbackTitle));
  } else {
    _clipFallback(text, fallbackTitle);
  }
}

function _clipFallback(text, title) {
  if (typeof copyFallback === 'function') { copyFallback(text); return; }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); showToast('📋 Đã copy', 'green'); } catch(e) { prompt(title, text); }
  document.body.removeChild(ta);
}

/* ─── Đóng modal ─── */
function closeNotifDetail() {
  const m = document.getElementById('notif-detail-modal');
  if (m) { m.classList.remove('open'); m.style.display = 'none'; }
}

/* ══════════════════════════════════════════════════════════════════
   PRO-TIP SYSTEM — TOOLTIP HỖ TRỢ NÚT BẤM
   ══════════════════════════════════════════════════════════════════ */
const BTN_TIPS = {
  'save': {
    icon:'💾', title:'Lưu dữ liệu',
    short:'Lưu toàn bộ dữ liệu vào IndexedDB + LocalStorage. Tự động lưu mỗi 3 giây.',
    detail:`<p>Lưu ngay lập tức tất cả dữ liệu tín dụng (QLTD, HĐV, trạng thái phí...) xuống bộ nhớ trình duyệt.</p>
    <h4>Cách thức lưu trữ</h4><ul>
      <li><strong>IndexedDB (ưu tiên)</strong>: Lưu dung lượng lớn, chia chunk, nén dữ liệu bằng LZ-String</li>
      <li><strong>LocalStorage (fallback)</strong>: Lưu metadata + bản nén nhỏ phòng khi IndexedDB lỗi</li>
    </ul>
    <h4>Phím tắt</h4><p><span class="bh-hotkey">Ctrl + S</span> — Lưu từ bất kỳ trang nào</p>
    <h4>Lưu ý</h4><ul>
      <li>Dữ liệu lưu trong trình duyệt — chỉ có trên máy này</li>
      <li>Nên dùng <strong>Backup</strong> để xuất file JSON phòng mất dữ liệu khi xóa cache</li>
    </ul>`,
  },
  'backup': {
    icon:'📤', title:'Backup — Xuất file JSON',
    short:'Xuất toàn bộ dữ liệu ra file JSON để lưu trữ ngoài trình duyệt.',
    detail:`<p>Tạo file <code>.json</code> chứa đầy đủ dữ liệu QLTD, HĐV, mẫu cán bộ... Tải về máy để bảo toàn dữ liệu.</p>
    <h4>Khi nào cần dùng?</h4><ul>
      <li>Trước khi xóa cache trình duyệt hoặc đổi máy tính</li>
      <li>Sau mỗi phiên làm việc quan trọng</li>
      <li>Để chia sẻ dữ liệu cho đồng nghiệp</li>
    </ul>
    <h4>Tên file tạo ra</h4><p><code>qltd_backup_YYYYMMDD_HHmm.json</code></p>`,
  },
  'restore': {
    icon:'📥', title:'Khôi phục từ Backup',
    short:'Nạp lại dữ liệu từ file JSON backup đã xuất trước đó.',
    detail:`<p>Chọn file <code>.json</code> đã backup để khôi phục toàn bộ dữ liệu. <strong>Dữ liệu hiện tại sẽ bị ghi đè!</strong></p>
    <h4>Quy trình</h4><ul>
      <li>Chọn file → Xác nhận số bản ghi → Tải vào bộ nhớ → Lưu</li>
      <li>Sau khôi phục: kiểm tra lại số lượng hồ sơ ở Dashboard</li>
    </ul>
    <h4>Lưu ý quan trọng</h4><p>⚠️ Toàn bộ dữ liệu hiện tại sẽ bị thay thế. Hãy backup dữ liệu hiện tại trước nếu cần.</p>`,
  },
  'archive-data': {
    icon:'💾', title:'Archive Data — Lưu snapshot dữ liệu',
    short:'Tạo bản chụp (snapshot) toàn bộ dữ liệu tại thời điểm hiện tại để đối chiếu sau.',
    detail:`<p>Lưu một bản snapshot dữ liệu kèm nhãn thời gian vào kho lưu trữ trong trình duyệt.</p>
    <h4>Ứng dụng</h4><ul>
      <li>Chụp dữ liệu cuối tháng/quý để so sánh biến động dư nợ</li>
      <li>Snapshot dùng cho bảng BCKH (Auto-Fill từ 14 mốc)</li>
      <li>Xem lại lịch sử theo từng mốc thời gian</li>
    </ul>
    <h4>Quản lý</h4><p>Vào <strong>LƯU TRỮ FILE</strong> ở sidebar để xem, đổi tên, xóa các snapshot.</p>`,
  },
  'archive-report': {
    icon:'📊', title:'Archive Report — Lưu snapshot báo cáo',
    short:'Lưu lại bản báo cáo IPCAS hiện tại để tra cứu về sau.',
    detail:`<p>Chụp nhanh nội dung báo cáo đang xem và lưu vào kho. Mỗi snapshot có thể Auto-Fill vào mẫu báo cáo.</p>
    <h4>Ứng dụng</h4><ul>
      <li>Lưu báo cáo theo ngày/mốc (cuối tháng, cuối quý...)</li>
      <li>Dùng nút <strong>Auto-Fill</strong> trong Báo cáo BCKH để điền tự động</li>
    </ul>`,
  },
  'import': {
    icon:'📂', title:'Nhập IPCAS — Import file nguồn',
    short:'Nhập dữ liệu từ file msit80.xlsx hoặc CSV xuất từ hệ thống IPCAS.',
    detail:`<p>Mở hộp thoại chọn file Excel (<code>.xlsx</code>) hoặc CSV từ hệ thống IPCAS để nạp vào ứng dụng.</p>
    <h4>File được hỗ trợ</h4><ul>
      <li><code>msit80.xlsx</code> — File IPCAS chuẩn (nhiều sheet)</li>
      <li><code>.csv</code> — Xuất từ IPCAS hoặc chuyển đổi từ Excel</li>
    </ul>
    <h4>Xử lý sau import</h4><ul>
      <li>Tự động phân loại: QLTD (tín dụng), KD (kinh doanh), TD (tiêu dùng)</li>
      <li>Gán phòng ban, CBTD, nhóm nợ theo bản đồ cấu hình</li>
      <li>Dữ liệu cũ được <strong>ghi đè</strong> (không merge)</li>
    </ul>
    <h4>Tự động hóa</h4><p>Dùng <strong>Auto-Sync</strong> để tự động đọc file từ folder mà không cần nhập tay.</p>`,
  },
  'autosync': {
    icon:'🔄', title:'Auto-Sync IPCAS',
    short:'Tự động đọc file IPCAS từ thư mục theo lịch (5/10/15/30/60 phút).',
    detail:`<p>Cấp quyền truy cập thư mục một lần, sau đó hệ thống tự động đọc file theo chu kỳ đặt trước.</p>
    <h4>Các chế độ</h4><ul>
      <li><strong>Ask</strong>: Hỏi trước khi import</li>
      <li><strong>Auto</strong>: Import ngay khi phát hiện file thay đổi</li>
      <li><strong>Notify</strong>: Chỉ thông báo, không import tự động</li>
    </ul>
    <h4>Yêu cầu</h4><p>Trình duyệt Chrome/Edge 86+ hỗ trợ File System Access API. Không hoạt động trên Firefox/Safari.</p>`,
  },
  'export-csv': {
    icon:'⬇️', title:'Xuất CSV',
    short:'Xuất bảng dữ liệu hiện tại ra file CSV để dùng trong Excel hoặc các công cụ khác.',
    detail:`<p>Tải xuống dữ liệu của trang đang xem dưới dạng file <code>.csv</code> (UTF-8 BOM).</p>
    <h4>Nội dung xuất</h4><ul>
      <li>Toàn bộ cột dữ liệu của bảng hiện tại</li>
      <li>Bao gồm cả hàng đã lọc/tìm kiếm (theo filter đang áp dụng)</li>
    </ul>`,
  },
  'add-new': {
    icon:'➕', title:'Thêm hồ sơ mới',
    short:'Mở form nhập liệu để thêm một hồ sơ tín dụng mới vào danh sách.',
    detail:`<p>Nhập thủ công thông tin một hợp đồng tín dụng mới: mã KH, tên, số HĐTD, dư nợ, ngày trả nợ...</p>
    <h4>Khi nào dùng?</h4><ul>
      <li>Cập nhật khoản vay phát sinh mới chưa có trong file IPCAS</li>
      <li>Nhập thử nghiệm, kiểm tra giao diện</li>
    </ul>
    <h4>Lưu ý</h4><p>Dữ liệu nhập tay sẽ bị ghi đè khi import lại file IPCAS mới nếu trùng mã KH/HĐTD.</p>`,
  },
  'lai-calc': {
    icon:'🧮', title:'Máy tính lãi',
    short:'Tính lãi suất theo Thông tư 14/2017/TT-NHNN (365 ngày/năm).',
    detail:`<p>Công cụ tính lãi nhanh: nhập số dư nợ, lãi suất, kỳ hạn → ra tiền lãi phải trả.</p>
    <h4>Công thức</h4><p><code>Lãi = Dư nợ × Lãi suất/năm × Số ngày / 365</code></p>
    <h4>Tính năng</h4><ul>
      <li>Hỗ trợ tính lãi đơn (kỳ hạn cố định) và lãi theo ngày</li>
      <li>Xuất kết quả ra bảng phân kỳ</li>
      <li>Theo chuẩn Thông tư 14/2017/TT-NHNN</li>
    </ul>`,
  },
  'print': {
    icon:'🖨️', title:'In trang',
    short:'Mở hộp thoại in của trình duyệt. Có thể lưu PDF qua "Save as PDF".',
    detail:`<p>Gọi lệnh in mặc định của trình duyệt. Để lưu thành PDF: chọn <strong>Save as PDF</strong> trong mục đích in.</p>
    <h4>Mẹo in đẹp</h4><ul>
      <li>Chọn in ngang (Landscape) cho các bảng nhiều cột</li>
      <li>Dùng nút <strong>Xuất Excel/Word/PDF</strong> chuyên biệt cho bảng BCKH</li>
    </ul>`,
  },
  'reset': {
    icon:'🔄', title:'Reset — Xóa toàn bộ',
    short:'⚠️ XÓA TOÀN BỘ dữ liệu và nạp lại dữ liệu mẫu. Không thể hoàn tác!',
    detail:`<p>⚠️ <strong>Hành động nguy hiểm!</strong> Sẽ xóa toàn bộ dữ liệu khỏi IndexedDB và LocalStorage. Sau khi reset, danh sách IPCAS sẽ trống — hãy import lại từ file IPCAS.</p>
    <h4>Khi nào dùng?</h4><ul>
      <li>Khởi động lại ứng dụng về trạng thái ban đầu</li>
      <li>Xử lý lỗi nghiêm trọng do dữ liệu bị hỏng</li>
    </ul>
    <h4>⚠️ Lưu ý</h4><p>Hãy <strong>Backup</strong> trước khi Reset! Sau khi xác nhận sẽ không thể hoàn tác.</p>`,
  },
};

let _proTipCurrentKey = null;
let _proTipHideTimer  = null;

function proTipShow(el, tipKey) {
  const tip = BTN_TIPS[tipKey];
  if (!tip) return;
  _proTipCurrentKey = tipKey;
  const popup = document.getElementById('pro-tip-popup');
  if (!popup) return;
  document.getElementById('pt-head-text').textContent = (tip.icon || '') + ' ' + tip.title;
  document.getElementById('pt-body-text').textContent = tip.short;

  // Position above the element
  const rect = el.getBoundingClientRect();
  const pw = 280;
  let left = rect.left;
  if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
  if (left < 8) left = 8;
  const top  = rect.top - popup.offsetHeight - 12;
  const finalTop = top < 8 ? rect.bottom + 10 : top;

  popup.style.left = left + 'px';
  popup.style.top  = finalTop + 'px';
  popup.style.bottom = 'auto';

  clearTimeout(_proTipHideTimer);
  popup.classList.add('visible');
}

function proTipHide() {
  _proTipHideTimer = setTimeout(() => {
    const popup = document.getElementById('pro-tip-popup');
    if (popup) popup.classList.remove('visible');
  }, 220);
}

function proTipKeepOpen() {
  clearTimeout(_proTipHideTimer);
}

function proTipOpenDetail() {
  const tip = BTN_TIPS[_proTipCurrentKey];
  if (!tip) return;
  // Hide tooltip first
  const popup = document.getElementById('pro-tip-popup');
  if (popup) popup.classList.remove('visible');
  // Show detail modal
  const body = document.getElementById('btn-help-body');
  if (!body) return;
  body.innerHTML = `
    <span class="bh-icon">${tip.icon || '📖'}</span>
    <div class="bh-title">${tip.title}</div>
    <div class="bh-sub">${_proTipCurrentKey ? 'data-tipkey="' + _proTipCurrentKey + '"' : ''}</div>
    <div class="bh-section">
      <h4>Tổng quan</h4>
      <p>${tip.short}</p>
    </div>
    <div class="bh-section">
      ${tip.detail || '<p>Không có thông tin chi tiết.</p>'}
    </div>`;
  document.getElementById('modal-btn-help').style.display = 'flex';
}

function closeBtnHelp() {
  const m = document.getElementById('modal-btn-help');
  if (m) m.style.display = 'none';
}

// Init tooltip listeners once DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('pro-tip-popup');
  if (popup) {
    popup.addEventListener('mouseenter', proTipKeepOpen);
    popup.addEventListener('mouseleave', proTipHide);
  }
  // Attach to all elements with data-tipkey (current + future via MutationObserver)
  function attachTips(root) {
    root.querySelectorAll('[data-tipkey]').forEach(el => {
      if (el._proTipBound) return;
      el._proTipBound = true;
      el.addEventListener('mouseenter', () => proTipShow(el, el.dataset.tipkey));
      el.addEventListener('mouseleave', proTipHide);
    });
  }
  attachTips(document.body);
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) attachTips(n);
    }));
  }).observe(document.body, { childList:true, subtree:true });
});

/* ══════════════════════════════════════════════════════════════════
   ENHANCED THÔNG BÁO NỢ — TEMPLATES & COMPOSE
   ══════════════════════════════════════════════════════════════════ */
let _notifGroupByCBTD = false;

/* ── Các mẫu tin nhắn ── */
const NOTIF_TEMPLATES = {
  short: {
    name: 'Tóm tắt nhanh',
    line: (r, colIdx) => {
      const ngay = r[colIdx] || r[7] || '';
      return `${(r[1]||'').trim()} — HĐTD ${(r[2]||'').trim()} — Đến hạn: ${ngay} — Dư nợ: ${fmtMoney(r[11])}đ — CBTD: ${(r[12]||'').trim()}`;
    },
    header: null, footer: null,
  },
  zalo: {
    name: 'Zalo/Viber (thân thiện)',
    line: (r, colIdx, cfg) => {
      const ngay  = r[colIdx] || r[7] || '';
      const lv    = (r[13]||'').replace(/Vay |\(TK 21\d\)/g,'').trim();
      const label = cfg ? cfg.label.replace(/^\S+\s*/,'').trim() : '';
      return `🔔 Thông báo: Quý khách *${(r[1]||'').trim()}* có khoản vay (HĐTD ${(r[2]||'').trim()} — ${lv}) ${label ? label.toLowerCase() + ', ' : ''}đến hạn *${ngay}*, dư nợ *${fmtMoney(r[11])}đ*. Kính nhờ Quý khách chuẩn bị thanh toán. Liên hệ CBTD: ${(r[12]||'').trim()}.`;
    },
    header: '📢 AgriBank Nam Định — Nhắc nhở thanh toán khoản vay:',
    footer: '⚠️ Vui lòng liên hệ cán bộ tín dụng phụ trách để được hỗ trợ.\nNgân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam — Chi nhánh Nam Định',
  },
  sms: {
    name: 'SMS (ngắn gọn)',
    line: (r, colIdx) => {
      const ngay = (r[colIdx] || r[7] || '').replace(/\//g, '/');
      const dn   = Math.round(Number(r[11])||0);
      const dnM  = dn >= 1e9 ? (dn/1e9).toFixed(1)+'ty' : dn >= 1e6 ? (dn/1e6).toFixed(0)+'tr' : dn+'d';
      return `AgriBank: HD ${(r[2]||'').trim()} den han ${ngay} duno ${dnM}. Lien he CBTD ${(r[12]||'').trim().split(' ').pop()}.`;
    },
    header: null, footer: 'AgriBank NamDinh. HotLine: 1900xxxx.',
  },
  formal: {
    name: 'Chính thức (ngân hàng)',
    line: (r, colIdx, cfg) => {
      const ngay = r[colIdx] || r[7] || '';
      const lv   = (r[13]||'').replace(/Vay |\(TK 21\d\)/g,'').trim();
      const label = cfg ? cfg.label.replace(/^\S+\s*/,'').trim() : 'đến hạn';
      return `- Khách hàng: ${(r[1]||'').trim()} | Số HĐTD: ${(r[2]||'').trim()} | Loại vay: ${lv} | Ngày ${label.toLowerCase()}: ${ngay} | Dư nợ: ${fmtMoney(r[11])} đồng | CBTD phụ trách: ${(r[12]||'').trim()}`;
    },
    header: `NGÂN HÀNG NÔNG NGHIỆP VÀ PHÁT TRIỂN NÔNG THÔN VIỆT NAM
CHI NHÁNH NAM ĐỊNH — PHÒNG KHÁCH HÀNG
──────────────────────────────
THÔNG BÁO NHẮC NỢ — ${new Date().toLocaleDateString('vi-VN')}
──────────────────────────────
Kính gửi Quý khách hàng,

Ngân hàng AgriBank Chi nhánh Nam Định kính thông báo các khoản vay sắp đến hạn hoặc đã quá hạn:`,
    footer: `──────────────────────────────
Kính đề nghị Quý khách hàng chủ động liên hệ cán bộ tín dụng phụ trách để hoàn tất nghĩa vụ thanh toán đúng hạn, tránh phát sinh lãi phạt và ảnh hưởng đến điểm tín dụng.

Trân trọng,
PHÒNG KHÁCH HÀNG — AGRIBANK NAM ĐỊNH`,
  },
  custom: {
    name: 'Tự soạn',
    line: null, // built dynamically from compose panel
    header: null, footer: null,
  },
};

let _notifActiveTpl = 'short';

function notifChangeTpl() {
  const sel = document.getElementById('notif-tpl-select');
  if (!sel) return;
  _notifActiveTpl = sel.value;
  const composePanel = document.getElementById('notif-compose-panel');
  if (composePanel) {
    composePanel.classList.toggle('open', _notifActiveTpl === 'custom');
  }
  _notifRenderBody();
}

function notifToggleCompose() {
  const panel = document.getElementById('notif-compose-panel');
  const btn   = document.getElementById('btn-notif-compose');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('active', isOpen);
  if (isOpen && _notifActiveTpl !== 'custom') {
    // switch to custom
    _notifActiveTpl = 'custom';
    const sel = document.getElementById('notif-tpl-select');
    if (sel) sel.value = 'custom';
  }
}

function notifToggleGroup() {
  _notifGroupByCBTD = !_notifGroupByCBTD;
  const btn = document.getElementById('btn-notif-group');
  if (btn) btn.classList.toggle('active', _notifGroupByCBTD);
  _notifRenderBody();
}

function notifResetCompose() {
  const hdr = document.getElementById('notif-compose-header');
  const ln  = document.getElementById('notif-compose-line');
  const ftr = document.getElementById('notif-compose-footer');
  if (hdr) hdr.value = 'Kính gửi Quý khách hàng,';
  if (ln)  ln.value  = '{ten} — HĐTD {hdtd} — Đến hạn: {ngaydenhan} — Dư nợ: {duno}đ — CBTD: {cbtd}';
  if (ftr) ftr.value = 'Trân trọng,\nPhòng Khách Hàng — Agribank Nam Định';
  _notifRenderBody();
}

/* ── Build custom line from compose template ── */
function _notifCustomLine(r, colIdx) {
  const tpl   = (document.getElementById('notif-compose-line')?.value || '{ten} — {hdtd}');
  const ngay  = r[colIdx] || r[7] || '';
  return tpl
    .replace(/{ten}/g, (r[1]||'').trim())
    .replace(/{hdtd}/g, (r[2]||'').trim())
    .replace(/{ngaydenhan}/g, ngay)
    .replace(/{duno}/g, fmtMoney(r[11]))
    .replace(/{cbtd}/g, (r[12]||'').trim())
    .replace(/{loaivay}/g, (r[13]||'').replace(/Vay /,'').trim())
    .replace(/{laisuat}/g, (r[8]||'').trim())
    .replace(/{makh}/g, (r[0]||'').trim());
}

/* ── Get active line formatter ── */
function _notifGetLineFormatter() {
  if (_notifActiveTpl === 'custom') return _notifCustomLine;
  const tpl = NOTIF_TEMPLATES[_notifActiveTpl];
  return tpl?.line || NOTIF_TEMPLATES.short.line;
}

/* ── Get header/footer for current template ── */
function _notifGetHeaderFooter() {
  if (_notifActiveTpl === 'custom') {
    return {
      header: document.getElementById('notif-compose-header')?.value || null,
      footer: document.getElementById('notif-compose-footer')?.value || null,
    };
  }
  const tpl = NOTIF_TEMPLATES[_notifActiveTpl] || NOTIF_TEMPLATES.short;
  return { header: tpl.header, footer: tpl.footer };
}

/* ── Render text mode with templates ── */
function _renderNotifText(groups) {
  _notifTextLines = [];
  let lineIdx = 0;
  const lineFmt = _notifGetLineFormatter();
  const { header, footer } = _notifGetHeaderFooter();

  const renderGroups = _notifGroupByCBTD
    ? _splitGroupsByCBTD(groups)
    : groups.map(g => ({ cbtd: null, subGroups: [g] }));

  let html = '';

  // Summary bar
  const total = groups.reduce((s,g) => s + g.rows.length, 0);
  const tplName = NOTIF_TEMPLATES[_notifActiveTpl]?.name || 'Tùy chỉnh';
  html += `<div style="background:var(--green-pale);border:1.5px solid var(--green-accent);border-radius:7px;padding:8px 14px;margin-bottom:12px;font-size:11.5px;color:var(--green-dark);font-weight:600;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <span>📋 <strong>${total}</strong> dòng${_notifCBTDFilter ? ` · CBTD: ${escapeHtml(_notifCBTDFilter)}` : ''}</span>
    <span style="opacity:.6">|</span>
    <span>📝 Mẫu: <em>${tplName}</em></span>
    ${_notifGroupByCBTD ? '<span style="background:#dcfce7;color:#166534;border-radius:4px;padding:1px 7px;font-size:10px">👥 Nhóm CBTD</span>' : ''}
    <span style="margin-left:auto;font-weight:400;font-size:10.5px;color:var(--gray-500)">Nhấn ✏️ để sửa từng dòng</span>
  </div>`;

  // Global header
  if (header) {
    html += `<div class="notif-msg-block">
      <div class="notif-msg-section-hdr" style="background:#0f2744;color:#fff;border-radius:6px;margin-bottom:4px">📌 Lời mở đầu</div>
      <div style="background:#fff;border:1px solid var(--gray-200);border-radius:0 0 6px 6px;padding:9px 12px;font-size:12px;white-space:pre-line;color:var(--navy)">${escapeHtml(header)}</div>
    </div>`;
  }

  for (const { cbtd, subGroups } of renderGroups) {
    if (cbtd) {
      html += `<div style="background:#1a3c5e;color:#fff;padding:6px 13px;border-radius:6px;margin:10px 0 6px;font-size:12px;font-weight:800">👤 CBTD: ${escapeHtml(cbtd)}</div>`;
    }
    for (const { cfg, rows } of subGroups) {
      const lineHtml = rows.map(r => {
        const txt = lineFmt(r, cfg.colIdx, cfg);
        _notifTextLines.push(txt);
        const idx = lineIdx++;
        return `<div class="notif-msg-line" id="nmline-${idx}">
          <span class="notif-msg-text">${escapeHtml(txt)}</span>
          <textarea class="notif-edit-area" id="nmline-edit-${idx}" rows="2">${escapeHtml(txt)}</textarea>
          <button class="notif-edit-btn" onclick="notifEditLine(${idx})" title="Sửa dòng này">✏️</button>
          <button class="notif-copy-btn" onclick="notifCopyRow(${idx})" title="Copy dòng này">📋</button>
        </div>`;
      }).join('');

      html += `<div class="notif-msg-block">
        <div class="notif-msg-section-hdr" style="background:${cfg.bg};color:${cfg.color}">
          ${cfg.label}
          <span style="font-size:11px;font-weight:500;margin-left:6px;opacity:.8">(${rows.length} dòng)</span>
        </div>
        <div class="notif-msg-lines">${lineHtml}</div>
      </div>`;
    }
  }

  // Global footer
  if (footer) {
    html += `<div class="notif-msg-block">
      <div class="notif-msg-section-hdr" style="background:#374151;color:#fff;border-radius:6px;margin-bottom:4px">🔏 Chữ ký / Lời kết</div>
      <div style="background:#fff;border:1px solid var(--gray-200);border-radius:0 0 6px 6px;padding:9px 12px;font-size:12px;white-space:pre-line;color:var(--navy)">${escapeHtml(footer)}</div>
    </div>`;
  }

  return html;
}

/* ── Split groups by CBTD ── */
function _splitGroupsByCBTD(groups) {
  const cbtdMap = {};
  for (const g of groups) {
    for (const r of g.rows) {
      const cbtd = (r[12]||'Chưa rõ').trim();
      if (!cbtdMap[cbtd]) cbtdMap[cbtd] = [];
      cbtdMap[cbtd].push({ cfg:g.cfg, rows:[] });
      cbtdMap[cbtd][cbtdMap[cbtd].length-1].rows.push(r);
    }
  }
  // Consolidate same cfg under same CBTD
  const result = [];
  for (const [cbtd, entries] of Object.entries(cbtdMap).sort((a,b)=>window.TD_SXCB.cmpName(a[0],b[0]))) {
    // Merge entries with same cfg key
    const merged = [];
    const seenCfg = new Map();
    for (const e of entries) {
      const cfgKey = e.cfg.label;
      if (seenCfg.has(cfgKey)) seenCfg.get(cfgKey).rows.push(...e.rows);
      else { const ne={...e,rows:[...e.rows]}; seenCfg.set(cfgKey,ne); merged.push(ne); }
    }
    result.push({ cbtd, subGroups: merged });
  }
  return result;
}

/* ── Edit a single line ── */
function notifEditLine(idx) {
  const lineEl  = document.getElementById('nmline-' + idx);
  const editEl  = document.getElementById('nmline-edit-' + idx);
  if (!lineEl) return;
  const isEditing = lineEl.classList.toggle('editing');
  const btn = lineEl.querySelector('.notif-edit-btn');
  if (isEditing) {
    if (editEl) { editEl.style.display='block'; editEl.focus(); }
    if (btn) { btn.textContent = '✅'; btn.classList.add('save-edit'); btn.title = 'Lưu thay đổi'; }
  } else {
    // Save edited text
    if (editEl && editEl.value.trim()) {
      _notifTextLines[idx] = editEl.value.trim();
      const textEl = lineEl.querySelector('.notif-msg-text');
      if (textEl) textEl.textContent = editEl.value.trim();
    }
    if (editEl) editEl.style.display = 'none';
    if (btn) { btn.textContent = '✏️'; btn.classList.remove('save-edit'); btn.title = 'Sửa dòng này'; }
  }
}

/* ── Copy formatted (with header + footer) ── */
function notifCopyFormatted() {
  const { header, footer } = _notifGetHeaderFooter();
  const lines = _notifTextLines.slice();
  const parts = [];
  if (header) parts.push(header);
  parts.push(...lines);
  if (footer) parts.push(footer);
  const text = parts.join('\n');
  _doCopy(text, `📋 Đã copy ${lines.length} dòng (đầy đủ)`, `Copy đầy đủ`);
}

/* ── Override notifCopyRow to use edited lines ── */
function notifCopyRow(idx) {
  const editEl = document.getElementById('nmline-edit-' + idx);
  const txt = (editEl && editEl.style.display !== 'none') ? editEl.value : _notifTextLines[idx];
  if (!txt) return;
  _doCopy(txt, '📋 Đã copy', '📋 Copy');
}

/* ── Sync toggle buttons — override to also handle template bar ── */
function _syncNotifToggleBtns() {
  const btnTable   = document.getElementById('nvt-table');
  const btnText    = document.getElementById('nvt-text');
  const btnCopyAll = document.getElementById('btn-notif-copy-all');
  const btnCopyFmt = document.getElementById('btn-notif-copy-formatted');
  const tplBar     = document.getElementById('notif-template-bar');
  if (btnTable)   btnTable.classList.toggle('active',  _notifViewMode === 'table');
  if (btnText)    btnText.classList.toggle('active',   _notifViewMode === 'text');
  const isText = _notifViewMode === 'text';
  if (btnCopyAll) btnCopyAll.style.display  = isText ? 'inline-flex' : 'none';
  if (btnCopyFmt) btnCopyFmt.style.display  = isText ? 'inline-flex' : 'none';
  if (tplBar)     tplBar.style.display      = isText ? 'flex'        : 'none';
}

/* ─── Chrome permission status ─── */
function _updateNotifPermStatus() {
  const el = document.getElementById('notif-perm-status');
  if (!el) return;
  if (!('Notification' in window)) {
    el.innerHTML = '⚠️ Trình duyệt không hỗ trợ thông báo hệ thống.'; return;
  }
  const p = Notification.permission;
  if (p === 'granted')
    el.innerHTML = '✅ Thông báo Chrome đã bật.';
  else if (p === 'denied')
    el.innerHTML = '🚫 Thông báo bị chặn. Vào <code>chrome://settings/content/notifications</code> để bật.';
  else
    el.innerHTML = '💡 Chưa bật thông báo Chrome. Nhấn nút bên phải để cho phép.';
}

function requestChromeNotifPerm() {
  if (!('Notification' in window)) { showToast('⚠ Trình duyệt không hỗ trợ thông báo hệ thống', 'red'); return; }
  if (Notification.permission === 'granted') {
    showToast('✅ Thông báo Chrome đã được bật sẵn!', 'green');
    _updateNotifPermStatus(); return;
  }
  Notification.requestPermission().then(p => {
    _updateNotifPermStatus();
    if (p === 'granted') {
      showToast('✅ Đã bật thông báo Chrome!', 'green');
      if (window._notifData) sendChromeNotif(window._notifData);
    } else {
      showToast('⚠ Đã từ chối — vào Cài đặt Chrome để bật lại.', 'red');
    }
  });
}

/* ─── Chrome Notification API ─── */
function requestAndSendChromeNotif(result) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') sendChromeNotif(result);
}

function sendChromeNotif(result) {
  const lines = [];
  if (result.overdue.length)  lines.push(`🔴 ${result.overdue.length} khoản NỢ QUÁ HẠN`);
  if (result.dueToday && result.dueToday.length) lines.push(`🔥 ${result.dueToday.length} khoản đến hạn HÔM NAY`);
  if (result.due1.length)     lines.push(`🟠 ${result.due1.length} khoản đến hạn NGÀY MAI`);
  if (result.due15.length)    lines.push(`🟡 ${result.due15.length} khoản còn 15 ngày`);
  if (result.due30.length)    lines.push(`🔵 ${result.due30.length} khoản còn 30 ngày`);
  if (result.hdtd1.length)    lines.push(`📋 ${result.hdtd1.length} HĐTD đến hạn NGÀY MAI`);
  if (result.hdtd15.length)   lines.push(`📄 ${result.hdtd15.length} HĐTD còn 15 ngày`);
  if (result.hdtd30.length)   lines.push(`📃 ${result.hdtd30.length} HĐTD còn 30 ngày`);
  if (!lines.length) return;
  try {
    const notif = new Notification('🏦 QLTD — Agribank Nam Định', {
      body: lines.join('\n'),
      tag:  'qltd-notif-daily',
      requireInteraction: result.overdue.length > 0 || (result.dueToday && result.dueToday.length > 0) || result.due1.length > 0,
      silent: true,
    });
    notif.onclick = () => { window.focus(); closeNotifDetail(); openNotifDetail(); };
  } catch(e) { console.warn('[NOTIF] Chrome notification failed:', e.message); }
}

/* ─── Web Audio ─── */
function playNotifSound(type) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, tStart, dur, vol) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, tStart);
      gain.gain.linearRampToValueAtTime(vol||0.22, tStart+0.01);
      gain.gain.linearRampToValueAtTime(0, tStart+dur-0.01);
      osc.start(tStart); osc.stop(tStart+dur);
    };
    const t = ctx.currentTime;
    if (type === 'urgent') {
      beep(880, t, 0.14, 0.25); beep(880, t+0.20, 0.14, 0.25); beep(880, t+0.40, 0.20, 0.30);
    } else {
      beep(660, t, 0.35, 0.18);
    }
  } catch(e) {}
}
