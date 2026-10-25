
/* ══════════════════════════════════════════════════════════════════
   ZALO PREVIEW SYSTEM — với trạng thái ĐÃ ĐỌC / CHƯA ĐỌC
   ══════════════════════════════════════════════════════════════════ */

/* ─── Read-state store (localStorage theo ngày) ─── */
const ZALO_READ_LS = 'zalo_read_v1_';
function _zaloTodayKey() {
  return ZALO_READ_LS + new Date().toISOString().slice(0, 10);
}
function _zaloGetReadSet() {
  try { const s = localStorage.getItem(_zaloTodayKey()); return new Set(s ? JSON.parse(s) : []); }
  catch { return new Set(); }
}
function _zaloSaveReadSet(set) {
  try { localStorage.setItem(_zaloTodayKey(), JSON.stringify([...set])); } catch {}
}

/* ─── Filter mode: 'unread' | 'all' ─── */
window._zaloFilter = 'unread';

function zaloSetFilter(mode) {
  window._zaloFilter = mode;
  const btnU = document.getElementById('zalo-btn-unread');
  const btnA = document.getElementById('zalo-btn-all');
  if (btnU) { btnU.style.background = mode==='unread' ? '#0068ff' : 'transparent'; btnU.style.color = mode==='unread' ? '#fff' : '#555'; }
  if (btnA) { btnA.style.background = mode==='all'    ? '#0068ff' : 'transparent'; btnA.style.color = mode==='all'    ? '#fff' : '#555'; }
  _renderZaloUI();
}

/* ─── Cập nhật badge inbox chip (chỉ đếm chưa đọc) ─── */
function _refreshInboxBadge() {
  const inbox = document.getElementById('inbox-badge');
  if (!inbox || !window._zaloAllItems) return;
  const readSet = _zaloGetReadSet();
  const total   = window._zaloAllItems.length;
  const unread  = window._zaloAllItems.filter(m => !readSet.has(m.id)).length;
  if (unread > 0) {
    inbox.textContent   = unread > 99 ? '99+' : unread;
    inbox.style.display = 'block';
    const hasUrgent = window._zaloAllItems.some(m => m.urgent && !readSet.has(m.id));
    inbox.className = hasUrgent ? 'urgent' : '';
  } else {
    inbox.style.display = 'none';
    inbox.className = '';
  }
  _updateZaloSideStats(unread, total);
}

function _updateZaloSideStats(unread, total) {
  const uc = document.getElementById('zalo-unread-count');
  const tc = document.getElementById('zalo-total-count');
  if (uc) uc.textContent = unread > 0 ? '🔴 ' + unread + ' chưa đọc' : '✅ Đã đọc hết';
  if (tc) tc.textContent = '/ ' + total + ' tổng';
}

/* ─── Đánh dấu một tin đã đọc ─── */
function zaloMarkRead(id) {
  const s = _zaloGetReadSet();
  if (s.has(id)) return;
  s.add(id);
  _zaloSaveReadSet(s);
  _refreshInboxBadge();
  _renderZaloUI();
}

/* ─── Đánh dấu TẤT CẢ đã đọc ─── */
function zaloMarkAllRead() {
  if (!window._zaloAllItems) return;
  const s = _zaloGetReadSet();
  window._zaloAllItems.forEach(m => s.add(m.id));
  _zaloSaveReadSet(s);
  _refreshInboxBadge();
  _renderZaloUI();
}

/* ─── Đặt lại trạng thái đã đọc hôm nay ─── */
function zaloResetRead() {
  try { localStorage.removeItem(_zaloTodayKey()); } catch {}
  _refreshInboxBadge();
  _renderZaloUI();
}

/* ─── Mở modal ─── */
function openZaloPreview() {
  const modal = document.getElementById('zalo-preview-modal');
  if (!modal) return;
  if (!window._notifData) {
    window._notifData = scanNotifications(DATA.qltd || [], todayMidnight());
    _updateNotifBadge(window._notifData);
  }
  const now  = new Date();
  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const clk  = document.getElementById('zalo-clock');
  if (clk) clk.textContent = hhmm;
  const dSep = document.getElementById('zalo-date-label');
  if (dSep) dSep.textContent = now.toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'});
  _buildZaloAllItems();
  zaloSetFilter(window._zaloFilter || 'unread');
  modal.style.display = 'flex';
}

function closeZaloPreview() {
  const modal = document.getElementById('zalo-preview-modal');
  if (modal) modal.style.display = 'none';
}

/* ─── Build danh sách đầy đủ ─── */
function _buildZaloAllItems() {
  const groups = typeof _notifGetFilteredGroups === 'function' ? _notifGetFilteredGroups() : [];
  const URGENT_KEYS = new Set(['overdue','due1','hdtd1']);
  const tagColors = {overdue:'#c0392b',dueToday:'#a3231d',due1:'#b45309',due15:'#c9962e',due30:'#2471a3',hdtdToday:'#a3231d',hdtd1:'#b45309',hdtd15:'#c9962e',hdtd30:'#2471a3'};
  const now  = new Date();
  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const savedTpl = window._notifActiveTpl;
  window._notifActiveTpl = 'zalo';
  const lineFmt = typeof _notifGetLineFormatter === 'function' ? _notifGetLineFormatter() : null;
  window._notifActiveTpl = savedTpl;
  const items = [];
  for (const { cfg, rows, key } of groups) {
    for (const r of rows) {
      const txt = lineFmt ? lineFmt(r, cfg.colIdx, cfg) : (r[1]||'?');
      const id  = key + '||' + (r[0]||'') + '||' + (r[2]||'');
      items.push({ id, name:(r[1]||'').trim()||'—', cbtd:(r[12]||'').trim()||'CBTD', txt, tag:cfg.label, tagColor:tagColors[key]||'#555', urgent:URGENT_KEYS.has(key), hhmm });
    }
  }
  window._zaloAllItems = items;
}

/* ─── Render phone + side panel ─── */
function _renderZaloUI() {
  const msgList  = document.getElementById('zalo-messages-list');
  const copyList = document.getElementById('zalo-copy-list');
  if (!msgList || !copyList) return;
  const all     = window._zaloAllItems || [];
  const readSet = _zaloGetReadSet();
  const filter  = window._zaloFilter || 'unread';
  const visible = filter === 'unread' ? all.filter(m => !readSet.has(m.id)) : all;

  /* Phone */
  if (!all.length) {
    msgList.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-size:12px">✅ Không có thông báo nào hôm nay!</div>';
  } else if (!visible.length && filter === 'unread') {
    msgList.innerHTML = '<div style="text-align:center;padding:40px;display:flex;flex-direction:column;align-items:center;gap:10px"><div style="font-size:40px">✅</div><div style="font-size:13px;font-weight:700;color:#2e7d32">Đã đọc hết tất cả tin nhắn!</div><div style="font-size:11px;color:#aaa">Nhấn "Tất cả" để xem lại hoặc "Đặt lại" để reset.</div></div>';
  } else {
    let html = '';
    let prevCBTD = null;
    const listToRender = filter === 'unread' ? visible : all;
    for (let i = 0; i < listToRender.length; i++) {
      const m    = listToRender[i];
      const isR  = readSet.has(m.id);
      const idxA = all.indexOf(m);
      if (m.cbtd !== prevCBTD) {
        html += '<div class="zalo-section-label"><span>👤 ' + escapeHtml(m.cbtd) + ' phụ trách</span></div>';
        prevCBTD = m.cbtd;
      }
      html += '<div class="zalo-msg-item' + (isR?' is-read':'') + '" id="zmsg-' + idxA + '" onclick="zaloQuickCopy(' + idxA + ')" title="' + (isR?'Đã đọc — nhấn để copy lại':'Nhấn để copy') + '">'
        + (!isR ? '<div class="zalo-unread-indicator"></div>' : '')
        + '<div class="zalo-msg-avatar">' + _zaloAvatar(m.cbtd) + '</div>'
        + '<div class="zalo-msg-content">'
        + '<div class="zalo-msg-sender">' + escapeHtml(m.cbtd) + '</div>'
        + '<div class="zalo-bubble"><span class="zalo-bubble-tag" style="background:' + m.tagColor + '22;color:' + m.tagColor + '">' + escapeHtml(m.tag) + '</span><br>' + _zaloFormatBold(m.txt) + '</div>'
        + '<div class="zalo-msg-time">' + m.hhmm + '</div>'
        + '</div>'
        + '<button class="zalo-read-btn" onclick="event.stopPropagation();' + (isR ? 'zaloUnmarkRead(\'' + m.id + '\')' : 'zaloMarkRead(\'' + m.id + '\')') + '" title="' + (isR?'Đánh dấu chưa đọc':'Đánh dấu đã đọc') + '">' + (isR ? '↩ Chưa đọc' : '✅ Đã đọc') + '</button>'
        + '</div>';
    }
    msgList.innerHTML = html;
    if (filter === 'unread') msgList.scrollTop = msgList.scrollHeight;
  }

  /* Side list */
  const listForSide = filter === 'unread' ? visible : all;
  copyList.innerHTML = listForSide.length
    ? listForSide.map(m => {
        const idxA = all.indexOf(m);
        const isR  = readSet.has(m.id);
        return '<div class="zalo-copy-row' + (isR?' is-read':'') + '" id="zcrow-' + idxA + '">'
          + '<div class="zalo-copy-name" title="' + escapeHtml(m.name) + '">' + escapeHtml(m.name) + '</div>'
          + '<button class="zalo-copy-btn" id="zcbtn-' + idxA + '" onclick="zaloQuickCopy(' + idxA + ')">' + (isR ? '✅' : '📋 Copy') + '</button>'
          + '</div>';
      }).join('')
    : '<div style="text-align:center;color:#aaa;font-size:11px;padding:12px">✅ Hết tin chưa đọc</div>';

  _refreshInboxBadge();
}

function _zaloAvatar(name) {
  if (!name) return 'A';
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[p.length-2][0]+p[p.length-1][0]).toUpperCase() : name[0].toUpperCase();
}
function _zaloFormatBold(txt) {
  return escapeHtml(txt).replace(/\*([^*]+)\*/g,'<b>$1</b>');
}

/* ─── Copy + auto-mark read ─── */
function zaloQuickCopy(idx) {
  if (!window._zaloAllItems) return;
  const m = window._zaloAllItems[idx];
  if (!m) return;
  const done = () => {
    const btn = document.getElementById('zcbtn-' + idx);
    if (btn) { btn.textContent = '✅'; setTimeout(() => { if (!_zaloGetReadSet().has(m.id)) btn.textContent = '📋 Copy'; }, 2000); }
    if (typeof showToast === 'function') showToast('📋 Đã copy tin nhắn', 'green');
    const s = _zaloGetReadSet();
    if (!s.has(m.id)) { s.add(m.id); _zaloSaveReadSet(s); }
    _refreshInboxBadge();
    const el = document.getElementById('zmsg-' + idx);
    if (el) { el.classList.add('is-read'); const dot = el.querySelector('.zalo-unread-indicator'); if(dot) dot.remove(); }
    const row = document.getElementById('zcrow-' + idx);
    if (row) row.classList.add('is-read');
    if (window._zaloFilter === 'unread') {
      const msgEl = document.getElementById('zmsg-' + idx);
      if (msgEl) {
        msgEl.style.transition = 'opacity .5s, transform .5s';
        msgEl.style.opacity = '0';
        msgEl.style.transform = 'translateX(30px)';
        setTimeout(() => _renderZaloUI(), 500);
      }
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(m.txt).then(done).catch(() => { if (typeof _clipFallback === 'function') _clipFallback(m.txt,'Copy'); done(); });
  } else {
    if (typeof _clipFallback === 'function') _clipFallback(m.txt,'Copy tin nhắn');
    done();
  }
}

/* ─── Bỏ đánh dấu đã đọc ─── */
function zaloUnmarkRead(id) {
  const s = _zaloGetReadSet();
  s.delete(id);
  _zaloSaveReadSet(s);
  _refreshInboxBadge();
  _renderZaloUI();
}

/* ─── Copy tất cả chưa đọc ─── */
function zaloPreviewCopyAll() {
  if (!window._zaloAllItems) return;
  const readSet = _zaloGetReadSet();
  const filter  = window._zaloFilter || 'unread';
  const lines   = (filter === 'unread' ? window._zaloAllItems.filter(m => !readSet.has(m.id)) : window._zaloAllItems).map(m => m.txt);
  if (!lines.length) { if (typeof showToast === 'function') showToast('Không có tin nào để copy', ''); return; }
  const text = lines.join('\n\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => { if (typeof showToast === 'function') showToast('📋 Đã copy ' + lines.length + ' tin nhắn', 'green'); })
      .catch(() => { if (typeof _clipFallback === 'function') _clipFallback(text,'Copy tất cả'); });
  } else {
    if (typeof _clipFallback === 'function') _clipFallback(text,'Copy tất cả tin nhắn');
  }
}
