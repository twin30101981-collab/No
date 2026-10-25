
/* ═══════════════════════════════════════════════════════════════
   GIAI ĐOẠN 2 — HỒ SƠ VAY ENGINE
   DATA.hosovay[loai][id] = {id, loai, trangThai, fields, ngayTao, ngaySua}
   Hỗ trợ: hmtd | tieudung | camco
   ═══════════════════════════════════════════════════════════════ */

/* ── Hằng số & config ── */
const HSV_MAX = 100;
const HSV_STORE_KEY = 'hsv_records_v1';

/* Cấu hình section & fields theo loại hồ sơ */
const HSV_SECTIONS = {
  hmtd: [
    {
      id:'s1', title:'I. Thông tin chung', icon:'👤', fields:[
        {id:'tenKH',    label:'Tên khách hàng', req:true},
        {id:'maKH',     label:'Mã khách hàng',  req:true},
        {id:'diaChi',   label:'Địa chỉ', span:'r1'},
        {id:'cccd',     label:'Số CCCD/CMT', req:true},
        {id:'ngayCap',  label:'Ngày cấp'},
        {id:'noiCap',   label:'Nơi cấp'},
        {id:'sdt',      label:'Số điện thoại'},
        {id:'email',    label:'Email'},
        {id:'nganhNghe',label:'Ngành nghề KD', span:'r1'},
        {id:'mst',      label:'Mã số thuế'},
        {id:'nhomNo',   label:'Nhóm nợ'},
        {id:'cbtd',     label:'CBTD phụ trách'},
      ]
    },
    {
      id:'s2', title:'II. Khoản vay / Nhận nợ', icon:'💰', fields:[
        {id:'soHD',     label:'Số hợp đồng'},
        {id:'loaiVay',  label:'Loại vay', type:'select',
          opts:['Hạn mức tín dụng','Vay ngắn hạn TK211','Vay trung hạn TK212','Vay dài hạn TK213']},
        {id:'soTienVay',   label:'Số tiền vay', type:'number', unit:'đ'},
        {id:'hanMuc',      label:'Hạn mức tín dụng', type:'number', unit:'đ'},
        {id:'laiSuat',     label:'Lãi suất', type:'number', unit:'%/năm'},
        {id:'laiSuatUT',   label:'LS ưu đãi', type:'number', unit:'%/năm'},
        {id:'kyHan',       label:'Kỳ hạn', unit:'tháng'},
        {id:'ngayGiaiNgan',label:'Ngày giải ngân', type:'date'},
        {id:'ngayDaoHan',  label:'Ngày đáo hạn', type:'date'},
        {id:'ngayTaiXet',  label:'Ngày tái xét', type:'date'},
        {id:'duNo',        label:'Dư nợ hiện tại', type:'number', unit:'đ', readonly:true},
        {id:'laiThang',    label:'Lãi/tháng (TT)', type:'number', unit:'đ', computed:true},
        {id:'hinhThucGN',  label:'Hình thức giải ngân', type:'select',
          opts:['Chuyển khoản','Tiền mặt','Thư tín dụng']},
        {id:'mucDich',     label:'Mục đích vay', span:'r1'},
      ]
    },
    {
      id:'s3', title:'III. Tài sản bảo đảm', icon:'🏠', fields:[
        {id:'loaiTSBD',  label:'Loại TSBĐ', type:'select',
          opts:['Bất động sản','Động sản','Sổ tiết kiệm','Không có TSBĐ','Khác']},
        {id:'diaChiTS',  label:'Địa chỉ tài sản', span:'r1'},
        {id:'soGCN',     label:'Số GCN/Sổ đỏ'},
        {id:'dienTich',  label:'Diện tích', unit:'m²'},
        {id:'giaTriTS',  label:'Giá trị TS (TĐ)', type:'number', unit:'đ'},
        {id:'ngayDangKy',label:'Ngày ĐK giao dịch BĐ', type:'date'},
        {id:'LTV',       label:'Tỷ lệ vay/TSĐB', type:'number', unit:'%', computed:true},
        {id:'ghiChuTS',  label:'Ghi chú TSBĐ', type:'textarea'},
      ]
    },
  ],
  tieudung: [
    {
      id:'s1', title:'I. Thông tin chung', icon:'👤', fields:[
        {id:'tenKH',    label:'Tên khách hàng', req:true},
        {id:'maKH',     label:'Mã khách hàng',  req:true},
        {id:'cccd',     label:'Số CCCD'},
        {id:'ngayCap',  label:'Ngày cấp'},
        {id:'noiCap',   label:'Nơi cấp'},
        {id:'sdt',      label:'Số điện thoại'},
        {id:'ngheNghiep',label:'Nghề nghiệp'},
        {id:'cbtd',     label:'CBTD'},
      ]
    },
    {
      id:'s2', title:'II. Khoản vay tiêu dùng', icon:'💳', fields:[
        {id:'soHD',     label:'Số hợp đồng'},
        {id:'soTienVay',label:'Số tiền vay', type:'number', unit:'đ'},
        {id:'laiSuat',  label:'Lãi suất', type:'number', unit:'%/năm'},
        {id:'kyHan',    label:'Kỳ hạn', unit:'tháng'},
        {id:'ngayGiaiNgan',label:'Ngày giải ngân', type:'date'},
        {id:'ngayDaoHan',  label:'Ngày đáo hạn', type:'date'},
        {id:'mucDich',     label:'Mục đích vay', span:'r1'},
      ]
    },
    {
      id:'s3', title:'III. Thu nhập & TSBĐ', icon:'📊', fields:[
        {id:'tn1',      label:'Thu nhập tháng', type:'number', unit:'đ'},
        {id:'loaiTSBD', label:'Loại TSBĐ', type:'select',
          opts:['Không có TSBĐ','Bất động sản','Sổ tiết kiệm','Khác']},
        {id:'giaTriTS', label:'Giá trị TSBĐ', type:'number', unit:'đ'},
        {id:'ghiChu',   label:'Ghi chú', type:'textarea'},
      ]
    },
  ],
  camco: [
    {
      id:'s1', title:'I. Thông tin chung', icon:'👤', fields:[
        {id:'tenKH',    label:'Tên khách hàng', req:true},
        {id:'maKH',     label:'Mã khách hàng',  req:true},
        {id:'cccd',     label:'Số CCCD'},
        {id:'sdt',      label:'Số điện thoại'},
        {id:'cbtd',     label:'CBTD'},
      ]
    },
    {
      id:'s2', title:'II. Cầm cố sổ tiết kiệm', icon:'📋', fields:[
        {id:'soHD',       label:'Số hợp đồng'},
        {id:'soSTK',      label:'Số sổ tiết kiệm'},
        {id:'soTienSTK',  label:'Số tiền sổ TK', type:'number', unit:'đ'},
        {id:'soTienVay',  label:'Số tiền vay CC', type:'number', unit:'đ'},
        {id:'laiSuat',    label:'Lãi suất', type:'number', unit:'%/năm'},
        {id:'kyHan',      label:'Kỳ hạn', unit:'tháng'},
        {id:'ngayGiaiNgan',label:'Ngày giải ngân', type:'date'},
        {id:'ngayDaoHan', label:'Ngày đáo hạn', type:'date'},
        {id:'LTV',        label:'Tỷ lệ vay/STK', type:'number', unit:'%', computed:true},
      ]
    },
    {
      id:'s3', title:'III. Ghi chú', icon:'📝', fields:[
        {id:'ghiChu', label:'Ghi chú', type:'textarea', span:'r1'},
      ]
    },
  ],
};

/* Các field lấy từ QLTD khi sync */
const HSV_QLTD_MAP = {
  tenKH:   r => r[1],
  maKH:    r => r[0],
  soHD:    r => r[2],
  duNo:    r => r[11],
  laiSuat: r => (window.formatRateValue ? window.formatRateValue(r[8]) : ((r[8]===''||r[8]==null)?'':(isFinite(parseFloat(r[8]))?parseFloat(r[8]).toFixed(2):''))),  /* PATCH 2026-06-10: chuẩn hoá qua formatRateValue */
  loaiVay: r => r[13],
  cbtd:    r => r[12],
};

/* ── Storage ── */
let _hsvCache = null;
function hsvGetAll() {
  if (_hsvCache) return _hsvCache;
  try {
    const s = localStorage.getItem(HSV_STORE_KEY);
    _hsvCache = s ? JSON.parse(s) : { hmtd:{}, tieudung:{}, camco:{} };
  } catch { _hsvCache = { hmtd:{}, tieudung:{}, camco:{} }; }
  return _hsvCache;
}
function hsvSetAll(data) {
  _hsvCache = data;
  try { localStorage.setItem(HSV_STORE_KEY, JSON.stringify(data)); } catch(e) { console.warn('HSV save err', e); }
}
function hsvGetLoai(loai) { return hsvGetAll()[loai] || {}; }
function hsvSaveRecord(loai, rec) {
  const all = hsvGetAll();
  if (!all[loai]) all[loai] = {};
  rec.ngaySua = new Date().toISOString();
  // P2-1 FIX: cảnh báo khi records > 80, chặn khi >= HSV_MAX
    const _loaiCount = Object.keys(all[loai]).length;
    if (_loaiCount >= (typeof HSV_MAX !== 'undefined' ? HSV_MAX : 100)) {
      if (typeof showToast === 'function') showToast('🚨 Đạt giới hạn ' + (typeof HSV_MAX !== 'undefined' ? HSV_MAX : 100) + ' hồ sơ ' + loai + '! Vui lòng xóa bớt hoặc xuất backup.', 'red');
      return;
    } else if (_loaiCount >= 80) {
      if (typeof showToast === 'function') showToast('⚠️ Hồ sơ ' + loai + ': ' + _loaiCount + '/' + (typeof HSV_MAX !== 'undefined' ? HSV_MAX : 100) + ' — gần đầy!', 'gold');
    }
      all[loai][rec.id] = rec;
  hsvSetAll(all);
}
function hsvDeleteRecord(loai, id) {
  const all = hsvGetAll();
  if (all[loai]) delete all[loai][id];
  hsvSetAll(all);
}
function hsvNewId() {
  return 'hsv_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
}

/* ── State hiện tại ── */
let _hsvLoai    = 'hmtd';   // loai đang mở (hmtd|tieudung|camco)
let _hsvCurId   = null;     // id hồ sơ đang mở
let _hsvCurStep = 0;        // step đang hiển thị (0-based)
let _hsvDirty   = false;
let _hsvAutoTimer = null;

/* ── Tính tiêu đề loại ── */
function _hsvTitle(loai) {
  return {hmtd:'HẠN MỨC TÍN DỤNG', tieudung:'TIÊU DÙNG', camco:'CẦM CỐ'}[loai] || loai;
}
function _hsvIcon(loai) {
  return {hmtd:'📃', tieudung:'💳', camco:'🔐'}[loai] || '📄';
}

/* ── Tính % hoàn thành ── */
function hsvCalcProgress(loai, fields) {
  const secs = HSV_SECTIONS[loai] || [];
  const result = [];
  let totalFilled = 0, totalFields = 0;
  for (const sec of secs) {
    const flds = sec.fields.filter(f => !f.computed && !f.readonly);
    const filled = flds.filter(f => fields[f.id] && String(fields[f.id]).trim() !== '').length;
    totalFilled += filled;
    totalFields += flds.length;
    result.push({ id: sec.id, filled, total: flds.length, pct: flds.length ? Math.round(filled/flds.length*100) : 0 });
  }
  return { sections: result, pct: totalFields ? Math.round(totalFilled/totalFields*100) : 0 };
}

/* ── Render danh sách ── */
function hsvRenderList(loai) {
  const pageId = 'page-' + loai;
  const listEl = document.querySelector('#' + pageId + ' .hsv-list-body');
  if (!listEl) return;
  const recs = hsvGetLoai(loai);
  const arr  = Object.values(recs).sort((a,b)=> (b.ngaySua||'').localeCompare(a.ngaySua||''));
  const q    = (document.querySelector('#' + pageId + ' .hsv-list-search input')?.value||'').toLowerCase();
  const filtered = q ? arr.filter(r => (r.fields?.tenKH||'').toLowerCase().includes(q) || (r.fields?.maKH||'').toLowerCase().includes(q)) : arr;

  // Update count
  const cnt = document.querySelector('#' + pageId + ' .hsv-list-count');
  if (cnt) cnt.textContent = arr.length + ' hồ sơ';

  if (!filtered.length) {
    listEl.innerHTML = `<div class="hsv-list-empty">
      <div class="ico">📭</div>
      <div>${q ? 'Không tìm thấy hồ sơ' : 'Chưa có hồ sơ nào'}</div>
      <div style="font-size:10px;margin-top:4px;color:#cbd5e1">${q ? 'Thử từ khóa khác' : 'Nhấn + Tạo mới để bắt đầu'}</div>
    </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(r => {
    const prog = hsvCalcProgress(loai, r.fields||{});
    const statusMap = {draft:'Nháp', done:'Hoàn thành', review:'Đang duyệt'};
    const active = _hsvCurId === r.id ? ' active' : '';
    const tenKH = r.fields?.tenKH || '(Chưa có tên)';
    const soHD  = r.fields?.soHD  || '—';
    const dt    = r.ngaySua ? new Date(r.ngaySua).toLocaleDateString('vi-VN') : '';
    return `<div class="hsv-card${active}" data-id="${r.id}" onclick="hsvOpenRecord('${loai}','${r.id}')">
      <button class="hsv-card-del" onclick="event.stopPropagation();hsvDeleteConfirm('${loai}','${r.id}')" title="Xóa">✕</button>
      <div class="hsv-card-name" title="${escapeHtml(tenKH)}">${escapeHtml(tenKH)}</div>
      <div class="hsv-card-meta">
        <span class="hsv-card-status ${r.trangThai||'draft'}">${statusMap[r.trangThai||'draft']||'Nháp'}</span>
        <span>${soHD}</span>
        <span style="margin-left:auto;color:#cbd5e1">${dt}</span>
      </div>
      <div class="hsv-card-prog">
        <div class="hsv-card-prog-fill" style="width:${prog.pct}%"></div>
      </div>
    </div>`;
  }).join('');
}

/* ── Mở / load hồ sơ ── */
function hsvOpenRecord(loai, id) {
  _hsvLoai  = loai;
  _hsvCurId = id;
  _hsvCurStep = 0;
  hsvRenderForm(loai);
  hsvRenderList(loai);
}

/* ── Tạo hồ sơ mới ── */
function hsvNewRecord(loai) {
  const all = hsvGetAll();
  if (!all[loai]) all[loai] = {};
  const count = Object.keys(all[loai]).length;
  if (count >= HSV_MAX) { alert('Đã đạt giới hạn ' + HSV_MAX + ' hồ sơ cho loại này.'); return; }

  const id = hsvNewId();
  const rec = {
    id, loai, trangThai:'draft',
    fields: {},
    ngayTao: new Date().toISOString(),
    ngaySua: new Date().toISOString(),
  };
  hsvSaveRecord(loai, rec);
  hsvOpenRecord(loai, id);
}

/* ── Xóa hồ sơ ── */
function hsvDeleteConfirm(loai, id) {
  const recs = hsvGetLoai(loai);
  const tenKH = recs[id]?.fields?.tenKH || '(Chưa có tên)';
  if (!confirm('Xóa hồ sơ của "' + tenKH + '"?\n\nHành động này không thể hoàn tác.')) return;
  hsvDeleteRecord(loai, id);
  if (_hsvCurId === id) { _hsvCurId = null; hsvRenderFormEmpty(loai); }
  hsvRenderList(loai);
}

/* ── Thu thập giá trị từ form ── */
function hsvCollectFields(loai) {
  const fields = {};
  const secs = HSV_SECTIONS[loai] || [];
  for (const sec of secs) {
    for (const f of sec.fields) {
      if (f.computed) continue;
      const el = document.querySelector(`[data-fid="${f.id}"]`);
      if (el) fields[f.id] = el.value || '';
    }
  }
  return fields;
}

/* ── Lưu hồ sơ hiện tại ── */
function hsvSaveCurrent(loai) {
  loai = loai || _hsvLoai;
  if (!_hsvCurId) return;
  const fields = hsvCollectFields(loai);
  const all = hsvGetAll();
  const rec = all[loai]?.[_hsvCurId];
  if (!rec) return;
  rec.fields = { ...rec.fields, ...fields };
  rec.ngaySua = new Date().toISOString();
  hsvSaveRecord(loai, rec);
  _hsvDirty = false;
  hsvRenderList(loai);
  hsvRenderPreview(loai);
  hsvUpdateProgress(loai);
  _hsvShowAutoSave('Đã lưu ✓');
}

function _hsvShowAutoSave(msg) {
  const el = document.querySelector('.hsv-prog-autosave');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(()=> el.style.opacity = '0', 2000);
}

/* ── Auto-save ── */
function hsvMarkDirty(loai) {
  _hsvDirty = true;
  clearTimeout(_hsvAutoTimer);
  _hsvAutoTimer = setTimeout(() => hsvSaveCurrent(loai), 3000);
  _hsvShowAutoSave('Đang lưu...');
}

/* ── Render form trống (chưa chọn hồ sơ) ── */
function hsvRenderFormEmpty(loai) {
  const fCol = document.querySelector('#page-' + loai + ' .hsv-col-form');
  if (!fCol) return;
  fCol.innerHTML = `
    <div class="hsv-form-empty">
      <div class="ico">${_hsvIcon(loai)}</div>
      <div class="msg">Chưa chọn hồ sơ</div>
      <div class="sub">Chọn hồ sơ từ danh sách bên trái<br>hoặc nhấn <b>+ Tạo mới</b> để bắt đầu</div>
    </div>`;
}

/* ── Đóng form → về màn hình trống ── */
function hsvCloseForm(loai) {
  if (typeof hsvIsDirty === 'function' && hsvIsDirty(loai)) {
    const ok = confirm('Hồ sơ chưa lưu. Bạn có muốn lưu trước khi đóng không?');
    if (ok) hsvSaveCurrent(loai);
  }
  _hsvCurId   = null;
  _hsvCurStep = 0;
  /* Bỏ highlight card đang active trong danh sách */
  document.querySelectorAll('#page-' + loai + ' .hsv-card.active')
    .forEach(c => c.classList.remove('active'));
  hsvRenderFormEmpty(loai);
  hsvRenderPreview(loai);
}

/* ── Render form chính ── */
function hsvRenderForm(loai) {
  const fCol = document.querySelector('#page-' + loai + ' .hsv-col-form');
  if (!fCol) return;
  const all  = hsvGetAll();
  const rec  = all[loai]?.[_hsvCurId];
  if (!rec) { hsvRenderFormEmpty(loai); return; }

  const secs = HSV_SECTIONS[loai] || [];
  const fields = rec.fields || {};
  const prog   = hsvCalcProgress(loai, fields);
  const syncInfo = _hsvGetSyncInfo(loai, fields);

  /* ── Build HTML ── */
  let syncBarHtml = '';
  if (syncInfo.linked) {
    syncBarHtml = `<div class="hsv-sync-bar">
      <span>🔗</span>
      <span class="hsv-sync-text">Đã liên kết QLTD — ${syncInfo.tenKH} | Dư nợ: <b>${fmtMoneyShort(syncInfo.duNo||0)}</b></span>
      <button class="hsv-sync-btn-sm" onclick="hsvSyncFromQltd('${loai}')">🔄 Sync lại</button>
    </div>`;
  } else {
    syncBarHtml = `<div class="hsv-sync-bar unlinked">
      <span>⚠️</span>
      <span class="hsv-sync-text warn">Chưa liên kết QLTD — điền Mã KH để auto-link</span>
    </div>`;
  }

  /* Step nav */
  const stepNav = secs.map((s, i) => {
    const sp = prog.sections[i];
    const cls = _hsvCurStep === i ? 'active' : (sp && sp.pct >= 100 ? 'done' : '');
    const sep = i < secs.length-1 ? '<span class="hsv-step-sep">›</span>' : '';
    return `<div class="hsv-step-item ${cls}" onclick="hsvGoStep('${loai}',${i})">
      <div class="hsv-step-dot">${sp && sp.pct >= 100 ? '✓' : (i+1)}</div>
      <span>${s.title.replace(/^[IVX]+\.\s*/,'')}</span>
    </div>${sep}`;
  }).join('');

  /* Sections HTML */
  const sectionsHtml = secs.map((sec, si) => {
    const sp = prog.sections[si];
    const isActive = _hsvCurStep === si;
    const display  = isActive ? '' : 'display:none';
    return `<div class="hsv-section" id="hsv-sec-${loai}-${sec.id}" style="${display}">
      <div class="hsv-sec-hdr" onclick="hsvToggleSec(this)">
        <span class="hsv-sec-ico">${sec.icon}</span>
        <span class="hsv-sec-title">${sec.title}</span>
        <span class="hsv-sec-prog-lbl">${sp?.pct||0}%</span>
        <span class="hsv-sec-toggle">▼</span>
      </div>
      <div class="hsv-sec-body">
        ${hsvBuildSectionFields(sec, fields, loai)}
      </div>
    </div>`;
  }).join('');

  /* Footer */
  const isFirst = _hsvCurStep === 0;
  const isLast  = _hsvCurStep === secs.length - 1;
  const footerNext = isLast
    ? `<button class="hsv-footer-btn hsv-footer-done" onclick="hsvFinish('${loai}')">✅ Hoàn thành</button>`
    : `<button class="hsv-footer-btn hsv-footer-next" onclick="hsvNextStep('${loai}')">Tiếp theo →</button>`;

  /* ── Tên hồ sơ hiện trên header ── */
  const tenHoSo = rec.fields?.tenKH || rec.fields?.soHD || `Hồ sơ #${rec.id.slice(-4)}`;

  fCol.innerHTML = `
    <div class="hsv-form-header">
      <div class="hsv-form-title">
        <span class="hsv-form-title-ico">${_hsvIcon(loai)}</span>
        <span class="hsv-form-title-name" title="${escapeHtml(tenHoSo)}">${escapeHtml(tenHoSo)}</span>
        <span class="hsv-form-title-id">#${rec.id.slice(-6)}</span>
      </div>
      <button class="hsv-form-close-btn" onclick="hsvCloseForm('${loai}')" title="Đóng hồ sơ (ESC)">✕</button>
    </div>
    <div class="hsv-sync-bar-wrap">${syncBarHtml}</div>
    <div class="hsv-step-nav">${stepNav}</div>
    <div class="hsv-prog-bar">
      <div class="hsv-prog-track"><div class="hsv-prog-fill" id="hsv-prog-fill-${loai}" style="width:${prog.pct}%"></div></div>
      <span class="hsv-prog-lbl">Hoàn thành</span>
      <span class="hsv-prog-pct" id="hsv-prog-pct-${loai}">${prog.pct}%</span>
      <span class="hsv-prog-autosave" style="opacity:0;transition:opacity .3s"></span>
    </div>
    <div class="hsv-form-body" id="hsv-form-body-${loai}">
      ${sectionsHtml}
    </div>
    <div class="hsv-form-footer">
      ${isFirst ? '' : `<button class="hsv-footer-btn hsv-footer-prev" onclick="hsvPrevStep('${loai}')">← Quay lại</button>`}
      <span class="hsv-footer-step-lbl">Bước ${_hsvCurStep+1}/${secs.length} — ${secs[_hsvCurStep]?.title||''}</span>
      <button class="hsv-footer-btn hsv-btn-save" onclick="hsvSaveCurrent('${loai}')">💾 Lưu</button>
      ${footerNext}
    </div>`;

  hsvRenderPreview(loai);
  /* Bind oninput cho tất cả fields */
  fCol.querySelectorAll('[data-fid]').forEach(el => {
    el.addEventListener('input', () => {
      hsvMarkDirty(loai);
      _hsvFieldInputHandler(el, loai);
    });
    el.addEventListener('change', () => hsvMarkDirty(loai));
    /* Highlight field đã có giá trị */
    if (el.value && el.tagName === 'INPUT') el.classList.add('has-val');
    el.addEventListener('input', () => {
      el.classList.toggle('has-val', !!el.value && el.tagName === 'INPUT');
    });
  });
}

/* Field được thay đổi → tính toán auto */
function _hsvFieldInputHandler(el, loai) {
  const fid = el.dataset.fid;
  /* Auto-link QLTD khi nhập maKH */
  if (fid === 'maKH' && el.value.length >= 5) {
    setTimeout(() => hsvAutoLinkQltd(loai), 400);
  }
  /* Auto-calc LTV */
  if (['soTienVay','giaTriTS','soTienSTK'].includes(fid)) hsvCalcLTV(loai);
  /* Auto-calc laiThang */
  if (['soTienVay','laiSuat'].includes(fid)) hsvCalcLaiThang(loai);
  /* Live preview update */
  hsvRenderPreview(loai);
  hsvUpdateProgress(loai);
}

/* Tính LTV */
function hsvCalcLTV(loai) {
  const vay  = parseFloat(document.querySelector('[data-fid="soTienVay"]')?.value||0)||0;
  const ts   = parseFloat(document.querySelector('[data-fid="giaTriTS"]')?.value||0)
             ||parseFloat(document.querySelector('[data-fid="soTienSTK"]')?.value||0)||0;
  const ltvEl = document.querySelector('[data-fid="LTV"]');
  if (ltvEl && ts > 0) ltvEl.value = (vay/ts*100).toFixed(1);
}

/* Tính lãi tháng */
function hsvCalcLaiThang(loai) {
  const vay = parseFloat(document.querySelector('[data-fid="soTienVay"]')?.value||0)||0;
  const ls  = parseFloat(document.querySelector('[data-fid="laiSuat"]')?.value||0)||0;
  const el  = document.querySelector('[data-fid="laiThang"]');
  if (el && vay > 0 && ls > 0) el.value = Math.round(vay * ls / 100 / 12);
}

/* ── Build HTML fields cho một section ── */
function hsvBuildSectionFields(sec, fields, loai) {
  let html = '';
  const flds = sec.fields;
  for (let i = 0; i < flds.length; ) {
    const f = flds[i];
    /* Quyết định span layout */
    const span = f.span || (f.type === 'textarea' ? 'r1' : null);
    if (span === 'r1') {
      html += `<div class="hsv-row hsv-r1">${_hsvFieldHtml(f, fields, loai)}</div>`;
      i++;
    } else if (i+1 < flds.length && !flds[i+1]?.span && flds[i+1]?.type !== 'textarea') {
      /* ghép 2 field 1 hàng */
      html += `<div class="hsv-row hsv-r2">${_hsvFieldHtml(f, fields, loai)}${_hsvFieldHtml(flds[i+1], fields, loai)}</div>`;
      i += 2;
    } else {
      html += `<div class="hsv-row hsv-r1">${_hsvFieldHtml(f, fields, loai)}</div>`;
      i++;
    }
  }
  return html;
}

function _hsvFieldHtml(f, fields, loai) {
  const val  = fields[f.id] ?? '';
  const req  = f.req ? '<span class="req">*</span>' : '';
  const unit = f.unit ? `<span class="hsv-nu-unit">${f.unit}</span>` : '';
  const wrapCls = f.unit ? 'hsv-nu' : '';
  const readonly = (f.readonly || f.computed) ? 'readonly' : '';
  const inputCls = f.computed ? 'computed' : '';
  const hasVal   = val !== '' ? 'has-val' : '';
  let input;
  if (f.type === 'select') {
    const opts = (f.opts||[]).map(o => `<option value="${o}"${val===o?' selected':''}>${o}</option>`).join('');
    input = `<select data-fid="${f.id}"><option value="">— Chọn —</option>${opts}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea data-fid="${f.id}" rows="3">${escapeHtml(val)}</textarea>`;
  } else {
    const type = f.type === 'date' ? 'date' : (f.type === 'number' ? 'text' : 'text');
    input = `<input type="${type}" data-fid="${f.id}" value="${escapeHtml(val)}" ${readonly} class="${inputCls} ${hasVal}">`;
  }
  return `<div class="hsv-f">
    <label>${req}${f.label}${f.unit?`<span class="apc">(${f.unit})</span>`:''}</label>
    <div class="${wrapCls}">${input}${unit}</div>
  </div>`;
}

/* ── Step navigation ── */
function hsvNextStep(loai) {
  hsvSaveCurrent(loai);
  const secs = HSV_SECTIONS[loai] || [];
  if (_hsvCurStep < secs.length - 1) { _hsvCurStep++; hsvRenderForm(loai); }
}
function hsvPrevStep(loai) {
  hsvSaveCurrent(loai);
  if (_hsvCurStep > 0) { _hsvCurStep--; hsvRenderForm(loai); }
}
function hsvGoStep(loai, idx) {
  hsvSaveCurrent(loai);
  _hsvCurStep = idx;
  hsvRenderForm(loai);
}
function hsvToggleSec(hdr) {
  const body = hdr.nextElementSibling?.nextElementSibling || hdr.parentElement.querySelector('.hsv-sec-body');
  if (!body) return;
  const tog = hdr.querySelector('.hsv-sec-toggle');
  if (body.classList.toggle('collapsed')) { if(tog) tog.style.transform='rotate(-90deg)'; }
  else { if(tog) tog.style.transform=''; }
}

/* ── Hoàn thành hồ sơ ── */
function hsvFinish(loai) {
  hsvSaveCurrent(loai);
  const all = hsvGetAll();
  const rec = all[loai]?.[_hsvCurId];
  if (!rec) return;
  rec.trangThai = 'done';
  hsvSaveRecord(loai, rec);
  hsvRenderList(loai);
  _hsvShowAutoSave('✅ Đã hoàn thành!');
}

/* ── Update progress live ── */
function hsvUpdateProgress(loai) {
  const fields = hsvCollectFields(loai);
  const prog   = hsvCalcProgress(loai, fields);
  const fillEl = document.getElementById('hsv-prog-fill-' + loai);
  const pctEl  = document.getElementById('hsv-prog-pct-' + loai);
  if (fillEl) fillEl.style.width = prog.pct + '%';
  if (pctEl)  pctEl.textContent  = prog.pct + '%';

  /* cập nhật step nav dots */
  const secs = HSV_SECTIONS[loai] || [];
  secs.forEach((s, i) => {
    const items = document.querySelectorAll('#page-' + loai + ' .hsv-step-item');
    if (!items[i]) return;
    const sp = prog.sections[i];
    items[i].className = 'hsv-step-item' + (i === _hsvCurStep ? ' active' : (sp?.pct>=100 ? ' done' : ''));
    const dot = items[i].querySelector('.hsv-step-dot');
    if (dot) dot.textContent = sp?.pct >= 100 ? '✓' : (i+1);
  });
}

/* ── Render preview ── */
function hsvRenderPreview(loai) {
  const prevEl = document.querySelector('#page-' + loai + ' .hsv-prev-body');
  if (!prevEl) return;
  const all  = hsvGetAll();
  const rec  = all[loai]?.[_hsvCurId];
  if (!rec) { prevEl.innerHTML = '<div class="hsv-prev-empty">Chọn hồ sơ để xem trước</div>'; return; }

  const fields = rec.fields || {};
  const prog   = hsvCalcProgress(loai, fields);
  const secs   = HSV_SECTIONS[loai] || [];

  /* Progress overview */
  let html = `<div class="hsv-prev-prog">
    <div class="hsv-prev-prog-title">📊 Tiến độ hoàn thành</div>`;
  prog.sections.forEach((sp, i) => {
    const sec = secs[i];
    html += `<div class="hsv-prev-prog-row">
      <span class="hsv-prev-prog-lbl" title="${sec.title}">${sec.title.replace(/^[IVX]+\.\s*/,'')}</span>
      <div class="hsv-prev-prog-track"><div class="hsv-prev-prog-fill" style="width:${sp.pct}%"></div></div>
      <span class="hsv-prev-prog-pct">${sp.pct}%</span>
    </div>`;
  });
  html += `</div>`;

  /* Fields preview */
  secs.forEach(sec => {
    const secFields = sec.fields.filter(f => !f.computed);
    const hasAny = secFields.some(f => fields[f.id] && String(fields[f.id]).trim());
    html += `<div class="hsv-prev-section">
      <div class="hsv-prev-sec-title">${sec.icon} ${sec.title}</div>`;
    secFields.forEach(f => {
      const v = fields[f.id] || '';
      const fmt = f.type === 'number' && v ? fmtNum(parseFloat(v)) + (f.unit ? ' ' + f.unit : '') : (v || '');
      html += `<div class="hsv-prev-row">
        <span class="hsv-prev-lbl">${f.label}</span>
        <span class="hsv-prev-val ${!v?'empty':''}">${fmt || '—'}</span>
      </div>`;
    });
    html += '</div>';
  });

  prevEl.innerHTML = html;
}

/* ── Sync từ QLTD ── */
function _hsvGetSyncInfo(loai, fields) {
  const maKH = fields.maKH || '';
  const soHD = fields.soHD || '';
  if (!window.DATA || !Array.isArray(DATA.qltd) || !maKH) return { linked:false };
  const row = DATA.qltd.find(r => r[0] === maKH && (!soHD || r[2] === soHD))
           || DATA.qltd.find(r => r[0] === maKH);
  if (!row) return { linked:false };
  return {
    linked:true,
    tenKH: row[1],
    duNo:  row[11],
    row,
  };
}

function hsvAutoLinkQltd(loai) {
  const maKHEl = document.querySelector('[data-fid="maKH"]');
  if (!maKHEl) return;
  const maKH = maKHEl.value.trim();
  if (!maKH || !window.DATA || !Array.isArray(DATA.qltd)) return;
  const row = DATA.qltd.find(r => r[0] === maKH);
  if (!row) return;
  /* Điền auto các fields từ QLTD */
  for (const [fid, getter] of Object.entries(HSV_QLTD_MAP)) {
    const el = document.querySelector('[data-fid="' + fid + '"]');
    if (!el || el.hasAttribute('readonly')) continue;
    const v = getter(row);
    if (v != null && v !== '' && !el.value) el.value = v;
    el.classList.toggle('has-val', !!el.value);
  }
  hsvUpdateProgress(loai);
  hsvRenderPreview(loai);
  /* Update sync bar */
  const bar = document.querySelector('#page-' + loai + ' .hsv-sync-bar');
  if (bar) {
    bar.className = 'hsv-sync-bar';
    bar.innerHTML = `<span>🔗</span>
      <span class="hsv-sync-text">Đã liên kết QLTD — ${row[1]} | Dư nợ: <b>${fmtMoneyShort(row[11]||0)}</b></span>
      <button class="hsv-sync-btn-sm" onclick="hsvSyncFromQltd('${loai}')">🔄 Sync lại</button>`;
  }
}

function hsvSyncFromQltd(loai) {
  const maKHEl = document.querySelector('[data-fid="maKH"]');
  const soHDEl = document.querySelector('[data-fid="soHD"]');
  const maKH = maKHEl?.value.trim();
  if (!maKH || !window.DATA || !Array.isArray(DATA.qltd)) {
    alert('Chưa có dữ liệu QLTD hoặc chưa nhập Mã KH.'); return;
  }
  const soHD = soHDEl?.value || '';
  const row = DATA.qltd.find(r => r[0] === maKH && (!soHD || r[2] === soHD))
           || DATA.qltd.find(r => r[0] === maKH);
  if (!row) { alert('Không tìm thấy KH "' + maKH + '" trong QLTD.'); return; }
  for (const [fid, getter] of Object.entries(HSV_QLTD_MAP)) {
    const el = document.querySelector('[data-fid="' + fid + '"]');
    if (!el) continue;
    const v = getter(row);
    if (v != null && v !== '') el.value = v;
    el.classList.toggle('has-val', !!el.value);
  }
  hsvMarkDirty(loai);
  hsvUpdateProgress(loai);
  hsvRenderPreview(loai);
}

/* ── Init page khi showPage ── */
function hsvInitPage(loai) {
  _hsvLoai    = loai;
  _hsvCurStep = 0;
  hsvRenderList(loai);
  if (_hsvCurId) hsvRenderForm(loai);
  else hsvRenderFormEmpty(loai);
}
