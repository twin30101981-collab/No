
/* ═══════════════════════════════════════════════════════════════
   GIAI ĐOẠN 4 — TEMPLATE ENGINE & EXPORT
   BAN_CHUAN v41_GD4 | 2026-05-05
   ═══════════════════════════════════════════════════════════════
   - Template Picker Modal: nhóm templates theo loại hồ sơ
   - Mapping tự động GD2 fields → {{placeholder}} docx
   - Preview highlight trường còn trống (required)
   - Smart Clone: nhân bản hồ sơ, chỉ đổi KH
   - Batch Export: xuất nhiều hồ sơ + progress bar async
   - Guard ghi đè: hỏi Ghi đè / Tạo bản mới / Hủy
   ═══════════════════════════════════════════════════════════════ */

/* ── Template catalog theo loại hồ sơ GD2 ── */
const HSV_TEMPLATES = {
  hmtd: {
    label: 'Hạn mức tín dụng',
    groups: [
      {
        title: '📄 Hồ sơ chính',
        items: [
          { id:'hmtd_bca',   name:'Báo cáo đề xuất cho vay',        path:'HMTD/Báo cáo đề xuất cho vay.docx',        icon:'📋' },
          { id:'hmtd_bhs',   name:'Bìa hồ sơ tín dụng',             path:'HMTD/Bìa hồ sơ tín dụng.docx',             icon:'📁' },
          { id:'hmtd_hdtd',  name:'Hợp đồng tín dụng',              path:'HMTD/Hợp đồng tín dụng.docx',              icon:'📜' },
          { id:'hmtd_pauv',  name:'Phương án sử dụng vốn',          path:'HMTD/Phương án sử dụng vốn.docx',          icon:'📊' },
          { id:'hmtd_cic',   name:'Phiếu tra CIC',                  path:'HMTD/Phiếu tra thông tin CIC.docx',        icon:'🔍' },
          { id:'hmtd_dmhs',  name:'Danh mục hồ sơ vay vốn',        path:'HMTD/Danh mục Hồ sơ vay vốn.docx',        icon:'📑' },
          { id:'hmtd_ptttkh',name:'Phiếu thu thập thông tin KH',    path:'HMTD/Phiếu thu thập thông tin KH.docx',    icon:'📝' },
        ]
      },
      {
        title: '🏠 Tài sản bảo đảm',
        items: [
          { id:'ts_hdtc',    name:'HĐ thế chấp QSDĐ & TS gắn liền', path:'TAI SAN/HĐTC QSDĐ và TS gắn liền với đất.docx', icon:'🏠' },
          { id:'ts_bbxd',    name:'Biên bản xác định giá trị TSĐB', path:'TAI SAN/Biên bản XĐ giá trị TSĐB.docx',    icon:'⚖️' },
          { id:'ts_pddg',    name:'Phiếu định giá TSĐB',            path:'TAI SAN/Phiếu định giá TSĐB.docx',          icon:'💲' },
        ]
      }
    ]
  },
  tieudung: {
    label: 'Tiêu dùng',
    groups: [
      {
        title: '📄 Hồ sơ tiêu dùng',
        items: [
          { id:'td_bca',     name:'Báo cáo đề xuất cho vay',        path:'TIEU DUNG/Báo cáo đề xuất cho vay.docx',   icon:'📋' },
          { id:'td_hdtd',    name:'Hợp đồng tín dụng tiêu dùng',   path:'TIEU DUNG/Hợp đồng tín dụng.docx',         icon:'📜' },
          { id:'td_pauv',    name:'Phương án vay tiêu dùng',        path:'TIEU DUNG/Phương án vay tiêu dùng.docx',   icon:'📊' },
        ]
      }
    ]
  },
  camco: {
    label: 'Cầm cố',
    groups: [
      {
        title: '📄 Hồ sơ cầm cố',
        items: [
          { id:'cc_hdtd',    name:'Hợp đồng tín dụng cầm cố',      path:'CAM CO/Hợp đồng tín dụng.docx',            icon:'📜' },
          { id:'cc_hdcc',    name:'Hợp đồng cầm cố STK',           path:'CAM CO/Hợp đồng cầm cố STK.docx',          icon:'🔐' },
          { id:'cc_bb',      name:'Biên bản giao nhận hồ sơ',      path:'CAM CO/Biên bản giao nhận hồ sơ.docx',     icon:'📋' },
        ]
      }
    ]
  }
};

/* ── Mapping GD2 fields → docx placeholder names ── */
const HSV_FIELD_MAP = {
  /* Thông tin KH */
  tenKH:          'Tên khách hàng',
  maKH:           'Mã khách hàng',
  diaChi:         'Địa chỉ',
  cccd:           'Số CCCD',
  ngayCap:        'Ngày cấp CCCD',
  noiCap:         'Nơi cấp CCCD',
  sdt:            'Số điện thoại',
  email:          'Email',
  nganhNghe:      'Ngành nghề kinh doanh',
  mst:            'Mã số thuế',
  nhomNo:         'Nhóm nợ',
  cbtd:           'Cán bộ tín dụng',
  ngheNghiep:     'Nghề nghiệp',
  /* Khoản vay */
  soHD:           'Số hợp đồng',
  loaiVay:        'Loại vay',
  soTienVay:      'Số tiền vay',
  hanMuc:         'Hạn mức tín dụng',
  laiSuat:        'Lãi suất',
  laiSuatUT:      'Lãi suất ưu đãi',
  kyHan:          'Kỳ hạn',
  ngayGiaiNgan:   'Ngày giải ngân',
  ngayDaoHan:     'Ngày đáo hạn',
  ngayTaiXet:     'Ngày tái xét',
  duNo:           'Dư nợ hiện tại',
  laiThang:       'Lãi tháng',
  hinhThucGN:     'Hình thức giải ngân',
  mucDich:        'Mục đích vay',
  /* TSBĐ */
  loaiTSBD:       'Loại TSBĐ',
  diaChiTS:       'Địa chỉ tài sản',
  soGCN:          'Số GCN',
  dienTich:       'Diện tích',
  giaTriTS:       'Giá trị tài sản',
  ngayDangKy:     'Ngày đăng ký giao dịch',
  LTV:            'Tỷ lệ vay/TSĐB',
  ghiChuTS:       'Ghi chú TSBĐ',
  /* Cầm cố */
  soSTK:          'Số sổ tiết kiệm',
  soTienSTK:      'Số tiền sổ TK',
  /* Thu nhập */
  tn1:            'Thu nhập tháng',
  ghiChu:         'Ghi chú',
};

/* ── Trường bắt buộc theo loại hồ sơ ── */
const HSV_REQUIRED = {
  hmtd:     ['tenKH','maKH','cccd','soHD','soTienVay','laiSuat','kyHan'],
  tieudung: ['tenKH','maKH','cccd','soHD','soTienVay','laiSuat','kyHan'],
  camco:    ['tenKH','maKH','cccd','soHD','soTienSTK','soTienVay','laiSuat'],
};

/* ── State modal ── */
let _hsvTplLoai    = null;
let _hsvTplSelected = new Set();

/* ══════════════════════════════
   TEMPLATE PICKER MODAL
   ══════════════════════════════ */
function hsvTplModalOpen(loai) {
  if (!_hsvCurId) { showToast('⚠ Vui lòng chọn hồ sơ trước','orange'); return; }
  _hsvTplLoai = loai;
  _hsvTplSelected.clear();
  const bg = document.getElementById('hsv-tpl-modal-bg');
  if (!bg) return;
  document.getElementById('hsv-tpl-modal-title').textContent =
    `Xuất Word — ${HSV_TEMPLATES[loai]?.label || loai}`;
  /* Render template list */
  _hsvTplRenderList(loai);
  /* Batch btn: hiện nếu có nhiều hồ sơ */
  const all = hsvGetAll();
  const count = Object.keys(all[loai] || {}).length;
  const batchBtn = document.getElementById('hsv-tpl-batch-btn');
  if (batchBtn) batchBtn.style.display = count > 1 ? '' : 'none';
  bg.classList.add('open');
}

function hsvTplModalClose() {
  const bg = document.getElementById('hsv-tpl-modal-bg');
  if (bg) bg.classList.remove('open');
}

function _hsvTplRenderList(loai) {
  const body = document.getElementById('hsv-tpl-modal-body');
  if (!body) return;
  const catalog = HSV_TEMPLATES[loai];
  if (!catalog) { body.innerHTML = '<div style="color:#94A3B8;padding:24px">Chưa có template cho loại hồ sơ này.</div>'; return; }

  /* Lấy fields hiện tại để check trống */
  const all    = hsvGetAll();
  const rec    = all[loai]?.[_hsvCurId];
  const fields = rec?.fields || {};
  const reqSet = new Set(HSV_REQUIRED[loai] || []);
  const missing = [...reqSet].filter(fid => !fields[fid]);

  let html = '';
  if (missing.length) {
    html += `<div style="background:#FFF5F5;border:1.5px solid #FCA5A5;border-radius:7px;padding:8px 12px;margin-bottom:14px;font-size:11px;color:#991B1B">
      ⚠ Còn <b>${missing.length}</b> trường bắt buộc chưa điền: 
      ${missing.map(f => `<span style="background:#FEE2E2;padding:1px 6px;border-radius:3px;margin-left:3px">${HSV_FIELD_MAP[f]||f}</span>`).join('')}
    </div>`;
  }

  catalog.groups.forEach(grp => {
    html += `<div class="hsv-tpl-group"><div class="hsv-tpl-group-title">${grp.title}</div><div class="hsv-tpl-grid">`;
    grp.items.forEach(item => {
      html += `<div class="hsv-tpl-item" id="hsv-tpl-${item.id}" onclick="hsvTplToggleItem('${item.id}')">
        <span class="hsv-tpl-item-ico">${item.icon}</span>
        <div><div class="hsv-tpl-item-name">${item.name}</div></div>
      </div>`;
    });
    html += '</div></div>';
  });
  body.innerHTML = html;
  _hsvTplUpdateCount();
}

function hsvTplToggleItem(id) {
  const el = document.getElementById('hsv-tpl-' + id);
  if (!el) return;
  if (_hsvTplSelected.has(id)) { _hsvTplSelected.delete(id); el.classList.remove('selected'); }
  else { _hsvTplSelected.add(id); el.classList.add('selected'); }
  _hsvTplUpdateCount();
}

function hsvTplToggleAll(checked) {
  const catalog = HSV_TEMPLATES[_hsvTplLoai];
  if (!catalog) return;
  catalog.groups.forEach(grp => grp.items.forEach(item => {
    const el = document.getElementById('hsv-tpl-' + item.id);
    if (checked) { _hsvTplSelected.add(item.id); el?.classList.add('selected'); }
    else { _hsvTplSelected.delete(item.id); el?.classList.remove('selected'); }
  }));
  _hsvTplUpdateCount();
}

function _hsvTplUpdateCount() {
  const n = _hsvTplSelected.size;
  const el = document.getElementById('hsv-tpl-sel-count');
  if (el) el.textContent = n ? `Đã chọn ${n} template` : '';
  const btn = document.getElementById('hsv-tpl-export-btn');
  if (btn) { btn.disabled = n === 0; btn.textContent = n > 1 ? `📥 Xuất ${n} file` : '📥 Xuất Word'; }
}

/* ══════════════════════════════
   EXPORT ENGINE (single hồ sơ)
   ══════════════════════════════ */
async function hsvTplExport() {
  if (!_hsvTplSelected.size) return;
  hsvTplModalClose();
  const loai   = _hsvTplLoai;
  const all    = hsvGetAll();
  const rec    = all[loai]?.[_hsvCurId];
  if (!rec) { showToast('⚠ Không tìm thấy hồ sơ','orange'); return; }

  /* Build data object từ GD2 fields */
  const data = _hsvBuildDocxData(loai, rec);

  /* Tìm items được chọn */
  const catalog  = HSV_TEMPLATES[loai];
  const allItems = catalog.groups.flatMap(g => g.items);
  const toExport = allItems.filter(item => _hsvTplSelected.has(item.id));

  /* Nếu chỉ 1 file → xuất trực tiếp */
  if (toExport.length === 1) {
    await _hsvExportOne(toExport[0], data, rec);
    return;
  }
  /* Nhiều file → batch */
  await _hsvExportBatch(toExport, data, rec);
}

async function _hsvExportOne(item, data, rec) {
  try {
    if (typeof PizZip === 'undefined') throw new Error('PizZip chưa tải');
    if (!window.docxtemplater) throw new Error('Docxtemplater chưa tải');
    const resp = await fetch(item.path);
    if (!resp.ok) throw new Error(`Không tìm thấy template: ${item.path}`);
    const buf  = await resp.arrayBuffer();
    const zip  = new PizZip(buf);
    const Dt   = window.docxtemplater;
    const doc  = new Dt(zip, { paragraphLoop:true, linebreaks:true, delimiters:{start:'{{',end:'}}'}, nullGetter:()=>'' });
    doc.render(data);
    const blob = doc.getZip().generate({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression:'DEFLATE' });
    const tenKH = (rec.fields?.tenKH || 'HoSo').replace(/[/\\:*?"<>|]/g,'_');
    const fname = `${tenKH}_${item.name}.docx`;
    _hsvDownload(blob, fname);
    showToast(`✅ Đã xuất: ${item.name}`,'green');
  } catch(e) {
    /* Template không tồn tại → tạo file placeholder */
    if (e.message.includes('Không tìm thấy')) {
      _hsvExportFallback(item, data, rec);
    } else {
      showToast(`❌ Lỗi xuất "${item.name}": ${e.message}`, 'red');
    }
  }
}

/* Fallback: template chưa upload → xuất file TXT với tất cả fields */
function _hsvExportFallback(item, data, rec) {
  const lines = [`=== ${item.name} ===\n`];
  Object.entries(data).forEach(([k,v]) => { if (v) lines.push(`${k}: ${v}`); });
  const blob = new Blob([lines.join('\n')], { type:'text/plain;charset=utf-8' });
  const tenKH = (rec.fields?.tenKH || 'HoSo').replace(/[/\\:*?"<>|]/g,'_');
  _hsvDownload(blob, `${tenKH}_${item.name}.txt`);
  showToast(`⚠ Template chưa có — xuất dạng TXT tạm thời`,'orange');
}

/* Batch export nhiều file cho 1 hồ sơ */
async function _hsvExportBatch(items, data, rec) {
  const prog = document.getElementById('hsv-batch-progress');
  const fill = document.getElementById('hsv-batch-prog-fill');
  const lbl  = document.getElementById('hsv-batch-prog-lbl');
  const titl = document.getElementById('hsv-batch-prog-title');
  if (prog) prog.classList.add('open');

  let done = 0;
  for (const item of items) {
    if (lbl)  lbl.textContent  = `Đang xuất: ${item.name}…`;
    if (titl) titl.textContent = `⏳ Đang xuất ${done+1}/${items.length}`;
    if (fill) fill.style.width = `${Math.round(done/items.length*100)}%`;
    await _hsvExportOne(item, data, rec);
    done++;
    await new Promise(r => setTimeout(r, 80)); /* breath */
  }
  if (fill) fill.style.width = '100%';
  if (titl) titl.textContent = `✅ Xuất xong ${done} file`;
  if (lbl)  lbl.textContent  = 'Hoàn thành';
  setTimeout(() => { if (prog) prog.classList.remove('open'); }, 2000);
}

/* Batch export NHIỀU hồ sơ */
async function hsvTplBatchExport() {
  if (!_hsvTplSelected.size) { showToast('⚠ Chọn ít nhất 1 template','orange'); return; }
  const loai    = _hsvTplLoai;
  const allRecs = hsvGetAll()[loai] || {};
  const ids     = Object.keys(allRecs);
  if (!ids.length) { showToast('Không có hồ sơ nào','orange'); return; }

  hsvTplModalClose();
  const catalog  = HSV_TEMPLATES[loai];
  const allItems = catalog.groups.flatMap(g => g.items);
  const toExport = allItems.filter(item => _hsvTplSelected.has(item.id));

  const prog = document.getElementById('hsv-batch-progress');
  const fill = document.getElementById('hsv-batch-prog-fill');
  const lbl  = document.getElementById('hsv-batch-prog-lbl');
  const titl = document.getElementById('hsv-batch-prog-title');
  if (prog) prog.classList.add('open');

  const total = ids.length * toExport.length;
  let done = 0;

  for (const id of ids) {
    const rec  = allRecs[id];
    const data = _hsvBuildDocxData(loai, rec);
    for (const item of toExport) {
      if (titl) titl.textContent = `📦 Xuất nhiều hồ sơ ${done+1}/${total}`;
      if (lbl)  lbl.textContent  = `${rec.fields?.tenKH||id} — ${item.name}`;
      if (fill) fill.style.width = `${Math.round(done/total*100)}%`;
      await _hsvExportOne(item, data, rec);
      done++;
      await new Promise(r => setTimeout(r, 120));
    }
  }
  if (fill) fill.style.width = '100%';
  if (titl) titl.textContent = `✅ Xuất xong ${done} file (${ids.length} hồ sơ)`;
  setTimeout(() => { if (prog) prog.classList.remove('open'); }, 3000);
}

/* ══════════════════════════════
   DATA BUILDER — GD2 fields → docx placeholders
   ══════════════════════════════ */
function _hsvBuildDocxData(loai, rec) {
  const f = rec.fields || {};
  const fmt = v => v ? Number(String(v).replace(/[^\d.]/g,'')).toLocaleString('vi-VN') : '';
  const fmtDate = v => {
    if (!v) return '';
    /* Hỗ trợ ISO (yyyy-mm-dd) và dd/mm/yyyy */
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y,m,d] = v.split('-'); return `${d}/${m}/${y}`;
    }
    return v;
  };
  const num2txt = v => { try { return window.sfNum2Text ? sfNum2Text(parseFloat(String(v).replace(/[^\d.]/g,''))||0) : v; } catch { return v; } };
  const today = sfToday ? sfToday() : new Date().toLocaleDateString('vi-VN');

  /* Tính tự động */
  const soTienVay   = parseFloat(f.soTienVay) || 0;
  const laiSuat     = parseFloat(f.laiSuat)   || 0;
  const giaTriTS    = parseFloat(f.giaTriTS)   || 0;
  const soTienSTK   = parseFloat(f.soTienSTK)  || 0;
  const laiThangCalc = laiSuat ? (soTienVay * laiSuat / 100 / 12) : 0;
  const ltvCalc      = giaTriTS ? (soTienVay / giaTriTS * 100).toFixed(2)
                     : soTienSTK ? (soTienVay / soTienSTK * 100).toFixed(2) : '';

  return {
    /* ── Thông tin KH ── */
    'Tên khách hàng':             f.tenKH || '',
    'Tên khách hàng viết hoa':    (f.tenKH||'').toUpperCase(),
    'Mã khách hàng':              f.maKH  || '',
    'Địa chỉ':                    f.diaChi || f.diaChiTS || '',
    'Số CCCD':                    f.cccd  || '',
    'Ngày cấp CCCD':              fmtDate(f.ngayCap) || '',
    'Nơi cấp CCCD':               f.noiCap || '',
    'Số điện thoại':              f.sdt   || '',
    'Email':                      f.email || '',
    'Ngành nghề kinh doanh':      f.nganhNghe || f.ngheNghiep || '',
    'Mã số thuế':                 f.mst   || '',
    'Nhóm nợ':                    f.nhomNo || '',
    'Cán bộ tín dụng':            f.cbtd  || '',
    'Nghề nghiệp':                f.ngheNghiep || '',
    /* ── Khoản vay ── */
    'Số hợp đồng':                f.soHD  || '',
    'Loại vay':                   f.loaiVay || '',
    'Số tiền vay':                fmt(f.soTienVay),
    'Số tiền vay bằng chữ':       num2txt(f.soTienVay),
    'Hạn mức tín dụng':           fmt(f.hanMuc),
    'Hạn mức bằng chữ':          num2txt(f.hanMuc),
    'Lãi suất':                   f.laiSuat ? `${f.laiSuat}%/năm` : '',
    'Lãi suất ưu đãi':            f.laiSuatUT ? `${f.laiSuatUT}%/năm` : '',
    'Kỳ hạn':                     f.kyHan ? `${f.kyHan} tháng` : '',
    'Kỳ hạn số':                  f.kyHan || '',
    'Ngày giải ngân':             fmtDate(f.ngayGiaiNgan),
    'Ngày đáo hạn':               fmtDate(f.ngayDaoHan),
    'Ngày tái xét':               fmtDate(f.ngayTaiXet),
    'Dư nợ hiện tại':             fmt(f.duNo),
    'Lãi tháng':                  fmt(f.laiThang || laiThangCalc.toFixed(0)),
    'Hình thức giải ngân':        f.hinhThucGN || '',
    'Mục đích vay':               f.mucDich || '',
    /* ── TSBĐ ── */
    'Loại TSBĐ':                  f.loaiTSBD || '',
    'Địa chỉ tài sản':            f.diaChiTS || '',
    'Số GCN':                     f.soGCN    || '',
    'Diện tích':                  f.dienTich ? `${f.dienTich} m²` : '',
    'Diện tích số':               f.dienTich || '',
    'Giá trị tài sản':            fmt(f.giaTriTS),
    'Giá trị tài sản bằng chữ':  num2txt(f.giaTriTS),
    'Ngày đăng ký giao dịch':     fmtDate(f.ngayDangKy),
    'Tỷ lệ vay/TSĐB':            (f.LTV || ltvCalc) ? `${f.LTV||ltvCalc}%` : '',
    'Ghi chú TSBĐ':               f.ghiChuTS || '',
    /* ── Cầm cố ── */
    'Số sổ tiết kiệm':            f.soSTK    || '',
    'Số tiền sổ TK':              fmt(f.soTienSTK),
    'Số tiền sổ TK bằng chữ':    num2txt(f.soTienSTK),
    /* ── Thu nhập ── */
    'Thu nhập tháng':             fmt(f.tn1),
    'Ghi chú':                    f.ghiChu   || f.ghiChuTS || '',
    /* ── Meta ── */
    'Ngày lập':                   today,
    'Năm':                        new Date().getFullYear().toString(),
    'Tháng':                      String(new Date().getMonth()+1).padStart(2,'0'),
    'Ngày':                       String(new Date().getDate()).padStart(2,'0'),
    'Loại hồ sơ':                 HSV_TEMPLATES[loai]?.label || loai,
    'ID hồ sơ':                   rec.id || '',
  };
}

/* ══════════════════════════════
   SMART CLONE
   ══════════════════════════════ */
function hsvCloneRecord(loai) {
  if (!_hsvCurId) { showToast('⚠ Chưa chọn hồ sơ để clone','orange'); return; }
  const all = hsvGetAll();
  const src = all[loai]?.[_hsvCurId];
  if (!src) return;

  /* Kiểm tra xem đã có hồ sơ clone chưa (cùng maKH + badge clone) */
  const existClones = Object.values(all[loai]||{}).filter(r => r._cloneOf === _hsvCurId);
  if (existClones.length) {
    const ok = confirm(`Đã có ${existClones.length} bản clone của hồ sơ này.\nTiếp tục tạo thêm?`);
    if (!ok) return;
  }

  const newId  = hsvNewId();
  const now    = new Date().toISOString();
  /* Giữ: KH/TSBĐ info. Xóa trắng: soHD, ngày GN, ngày ĐH, dư nợ */
  const cloneFields = { ...src.fields };
  ['soHD','ngayGiaiNgan','ngayDaoHan','ngayTaiXet','duNo','laiThang','LTV'].forEach(k => delete cloneFields[k]);

  const clone = {
    id:       newId,
    loai,
    trangThai:'draft',
    fields:   cloneFields,
    ngayTao:  now,
    ngaySua:  now,
    _cloneOf: _hsvCurId,
  };

  /* Guard: nếu maKH trống thì vẫn cho clone */
  if (!all[loai]) all[loai] = {};
  all[loai][newId] = clone;
  hsvSetAll(all);

  /* Mở hồ sơ clone */
  _hsvCurId   = newId;
  _hsvCurStep = 0;
  hsvRenderList(loai);
  hsvRenderForm(loai);
  const tenKH = cloneFields.tenKH || 'hồ sơ';
  showToast(`✅ Đã clone hồ sơ "${tenKH}" — vui lòng điền Số HĐ mới`, 'green');
}

/* ══════════════════════════════
   HELPERS
   ══════════════════════════════ */
function _hsvDownload(blob, filename) {
  if (typeof saveAs === 'function') { saveAs(blob, filename); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ── Cập nhật preview: hiện missing fields + ẩn/hiện action buttons ── */
(function() {
  const _origPreview = window.hsvRenderPreview;
  if (typeof _origPreview !== 'function') return;

  window.hsvRenderPreview = function(loai) {
    _origPreview(loai);
    /* Hiện/ẩn action buttons theo trạng thái hồ sơ */
    const actionsEl = document.getElementById('hsv-prev-actions-' + loai);
    if (actionsEl) actionsEl.style.display = _hsvCurId ? 'flex' : 'none';
    /* Highlight missing required fields trong preview */
    _hsvPreviewMarkMissing(loai);
  };
})();

function _hsvPreviewMarkMissing(loai) {
  const prevEl = document.querySelector('#page-' + loai + ' .hsv-prev-body');
  if (!prevEl || !_hsvCurId) return;
  const all    = hsvGetAll();
  const rec    = all[loai]?.[_hsvCurId];
  if (!rec) return;
  const fields = rec.fields || {};
  const reqSet = new Set(HSV_REQUIRED[loai] || []);
  /* Đánh dấu missing trên các row preview */
  prevEl.querySelectorAll('.hsv-prev-val.empty').forEach(el => {
    const row = el.closest('.hsv-prev-row');
    const lbl = row?.querySelector('.hsv-prev-lbl')?.textContent?.trim();
    /* Tìm fid tương ứng với label */
    const fid = Object.keys(HSV_FIELD_MAP).find(k => HSV_FIELD_MAP[k] === lbl);
    if (fid && reqSet.has(fid)) { el.classList.add('missing'); row?.classList.add('req'); }
  });
}

/* Init: ẩn action buttons khi chưa mở hồ sơ */
document.addEventListener('DOMContentLoaded', () => {
  ['hmtd','tieudung','camco'].forEach(loai => {
    const el = document.getElementById('hsv-prev-actions-' + loai);
    if (el) el.style.display = 'none';
  });
});

/* ESC đóng modal template */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const bg = document.getElementById('hsv-tpl-modal-bg');
    if (bg?.classList.contains('open')) hsvTplModalClose();
  }
});

console.info('[GD4] Template Engine & Export loaded ✅');
