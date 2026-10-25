
// ======================================================
// ③ SO SANH 2 HO SO
// ======================================================
const HOSO_FIELD_LABELS = {
  // ── S0: Hành chính ──
  soHDTD:'Số HĐ tín dụng', ngayHDTD:'Ngày HĐ tín dụng',
  soHDTDCu:'Số HĐ tín dụng cũ', ngayHDTDCu:'Ngày HĐ tín dụng cũ',
  ngayGiaoNhan:'Ngày giao-nhận HS', ngayBia:'Ngày bìa HS',
  ngayCIC:'Ngày tra CIC', soUyQuyen:'Số ủy quyền TD',
  nguoiQHKH:'Người QHKH/QLN', nguoiThamDinh:'Người thẩm định',
  nguoiDuyet:'Người duyệt', chucVuDuyet:'Chức vụ người duyệt',
  xungHoDuyet:'Xưng hô người duyệt', chiNhanh:'Chi nhánh/PGD',
  theLoaiVay:'Thể loại vay', soToTrinh:'Số tờ trình',
  ngayToTrinh:'Ngày tờ trình', soPheDuyet:'Số phê duyệt',
  ngayPheDuyet:'Ngày phê duyệt', capPheDuyet:'Cấp phê duyệt',
  // ── S1: Khách hàng vay ──
  maKH:'Mã khách hàng', tkTT:'Tài khoản thanh toán',
  xungHo:'Xưng hô', gioiTinh:'Giới tính',
  tenKH:'Tên khách hàng', tenKHHoa:'Tên khách hàng (in hoa)',
  loaiCMND:'Loại CMND', cmnd:'Số CCCD/CMND',
  ngaySinh:'Ngày sinh', ngayCap:'Ngày cấp CCCD/CMND',
  noiCap:'Nơi cấp CCCD/CMND', maSoThue:'Mã số thuế',
  diaChi:'Địa chỉ thường trú/liên hệ', diaChiHK:'Địa chỉ theo hộ khẩu',
  sdt:'Số điện thoại', email:'Email',
  ngheNghiep:'Nghề nghiệp', chucVuKH:'Chức vụ khách hàng',
  tenCongTy:'Tên cơ quan/công ty', diaChiCT:'Địa chỉ cơ quan',
  diaChiKD:'Địa chỉ kinh doanh', dkkd:'Số ĐKKD',
  ngayCapDKKD:'Ngày cấp ĐKKD', noiCapDKKD:'Nơi cấp ĐKKD',
  benVay:'Bên vay', xepHangKH:'Xếp hạng khách hàng', xepHangKH_ipcas:'Xếp hạng KH (IPCAS)',
  nhomNo:'Nhóm nợ', diemCIC:'Điểm CIC',
  // ── S2: Người thừa kế / đồng vay ──
  tenTK:'Họ tên người thừa kế', tenTKHoa:'Tên TK (in hoa)',
  xungHoTK:'Xưng hô người TK', quanHeTK:'Quan hệ với KH',
  loaiCMNDTK:'Loại CMND người TK', ngaySinhTK:'Ngày sinh người TK',
  cmndTK:'Số CCCD/CMND người TK', ngayCapTK:'Ngày cấp CCCD người TK',
  noiCapTK:'Nơi cấp CCCD người TK', thuNhapTK:'Thu nhập người TK/tháng',
  diaChiTK:'Địa chỉ người TK', hoKhauTK:'Hộ khẩu người TK',
  sdtTK:'Số điện thoại người TK', ngheNghiepTK:'Nghề nghiệp người TK',
  // ── S3: Khoản vay ──
  mucDichVay:'Mục đích vay', mucDichCuThe:'Mục đích vay cụ thể',
  phuongThucTT:'Phương thức thanh toán', hinhThucGiaiNgan:'Hình thức giải ngân',
  soTienVay:'Số tiền vay', hmtdDuyet:'HMTD duyệt',
  soTienVayGD:'Tiền vay theo giao dịch', soTienVayHD:'Tiền vay theo HĐ',
  thoiHan:'Thời hạn vay (tháng)', thoiHanUuDai:'Thời hạn ưu đãi (tháng)',
  laiSuat:'Lãi suất (%/năm)', laiSuatUuDai:'Lãi suất ưu đãi (%/năm)',
  laiSuatThuong:'Lãi suất thường (%/năm)', loaiLaiSuat:'Loại lãi suất',
  kyHanTraLai:'Kỳ hạn trả lãi', kyHanTraGoc:'Kỳ hạn trả gốc',
  ngayGiaiNgan:'Ngày giải ngân', ngayDenHan:'Ngày đến hạn HMTD',
  ngayTraNoCuoi:'Ngày trả nợ cuối cùng', ngayTaiXet:'Ngày tái xét',
  duNo:'Dư nợ', duNoThauChi:'Dư nợ thấu chi',
  ncv:'Tổng nhu cầu vốn', vonTuCo:'Vốn tự có',
  tyLeVay:'Tỷ lệ cho vay/TSĐB (%)', tyLeVTC:'Tỷ lệ vốn tự có (%)',
  thuNhapNamTruoc:'Thu nhập năm trước', chamDiem:'Chấm điểm',
  // ── Thu nhập (TD) ──
  nguonTN1:'Nguồn thu nhập 1', soTienTN1:'Số tiền TN 1/tháng',
  nguonTN2:'Nguồn thu nhập 2', soTienTN2:'Số tiền TN 2/tháng',
  nguonTN3:'Nguồn thu nhập 3', soTienTN3:'Số tiền TN 3/tháng',
  tongThuNhap:'Tổng thu nhập/tháng', tongTN_TD:'Tổng TN thẩm định',
  chiSinhHoat:'Chi phí sinh hoạt/tháng', chiTraNo:'Chi trả nợ/tháng',
  // ── Kinh doanh ──
  doanhThu:'Tổng doanh thu từ KD', tongCP:'Tổng chi phí KD',
  loiNhuan:'Lợi nhuận KD', vonLuuDong:'Vốn lưu động',
  hangHoa:'Giá trị hàng hóa', noPT:'Nợ phải trả',
  // ── TSBĐ tóm tắt ──
  loaiTSBD:'Loại TSĐB', tongGTTSBD:'Tổng giá trị TSĐB',
  soGiayToTS:'Số giấy tờ TSĐB', chuSoHuuTS:'Chủ sở hữu TSĐB',
  viTriTS:'Vị trí/địa chỉ TSĐB', dienTichDat:'Diện tích đất (m²)',
  dienTichNha:'Diện tích nhà (m²)', giaTriDinhGia:'Giá trị định giá',
  donViDinhGia:'Đơn vị định giá', ngayDinhGia:'Ngày định giá',
  // ── ABIC / Bảo hiểm ──
  soHopDongBH:'Số HĐ bảo hiểm', soTienBH:'Số tiền bảo hiểm',
  thoiHanBH:'Thời hạn bảo hiểm', phiBH:'Phí bảo hiểm',
  // ── Ghi chú ──
  ghiChu:'Ghi chú chung', ghiChuNB:'Ghi chú nội bộ',
};
let _hcShowAll = false;

function hosoCompareOpen() {
  const records = hosoGetAll();
  const ids = Object.keys(records).sort((a,b) =>
    (records[b]?._meta?.savedAt||'').localeCompare(records[a]?._meta?.savedAt||''));
  if (ids.length < 2) { showToast('Cần ít nhất 2 hồ sơ để so sánh', 'red'); return; }
  const fmt = id => { const m=records[id]?._meta||{}; return (m.tenKH||'(Chưa tên)')+' — '+(m.soHDTD||'—'); };
  const optHtml = ids.map(id => '<option value="'+escapeHtml(id)+'">'+escapeHtml(fmt(id))+'</option>').join('');
  document.getElementById('hc-sel-a').innerHTML = optHtml;
  document.getElementById('hc-sel-b').innerHTML = optHtml;
  const curIdx = ids.indexOf(_hosoCurrentId);
  document.getElementById('hc-sel-a').value = ids[curIdx>=0?curIdx:0];
  document.getElementById('hc-sel-b').value = ids[curIdx>=0?(curIdx+1)%ids.length:1];
  _hcShowAll = false;
  hosoCompareDiff();
  document.getElementById('hoso-compare-ov').classList.add('open');
}

function hosoCompareClose() {
  document.getElementById('hoso-compare-ov').classList.remove('open');
}

function hosoCompareToggleAll() {
  _hcShowAll = !_hcShowAll;
  const btn = document.querySelector('.hc-btn.sec');
  if (btn) btn.textContent = _hcShowAll ? 'Chỉ hiện trường khác' : 'Hiện tất cả trường';
  hosoCompareDiff();
}

function hosoCompareDiff() {
  const idA = document.getElementById('hc-sel-a').value;
  const idB = document.getElementById('hc-sel-b').value;
  const records = hosoGetAll();
  const recA = records[idA] || {};
  const recB = records[idB] || {};
  const allKeys = new Set([...Object.keys(recA),...Object.keys(recB)]);
  allKeys.delete('_meta'); allKeys.delete('_tsbdData');
  const keys = [...allKeys];

  let diffCount = 0;
  const diffRows = [], sameRows = [];

  for (const k of keys) {
    const vA = String(recA[k]??'').trim();
    const vB = String(recB[k]??'').trim();
    const isDiff = vA !== vB;
    if (isDiff) diffCount++;
    if (!vA && !vB) continue;
    const label = HOSO_FIELD_LABELS[k] || k;
    const rowCls = isDiff ? 'hc-row-diff' : '';
    const fmtV = (v, side) => v
      ? '<span class="'+(isDiff?(side==='A'?'hc-val-a':'hc-val-b'):'')+'">'+escapeHtml(v)+'</span>'
      : '<span class="hc-val-empty">(trống)</span>';
    const row = '<tr class="'+rowCls+'"><td>'+escapeHtml(label)+'</td><td>'+fmtV(vA,'A')+'</td><td>'+fmtV(vB,'B')+'</td></tr>';
    isDiff ? diffRows.push(row) : sameRows.push(row);
  }

  const shown = _hcShowAll ? [...diffRows,...sameRows] : diffRows;
  const tbody = document.getElementById('hc-tbody');
  const summary = document.getElementById('hc-summary');

  tbody.innerHTML = shown.length === 0
    ? '<tr><td colspan="3" class="hc-no-diff">✅ 2 hồ sơ giống nhau hoàn toàn</td></tr>'
    : shown.join('');

  summary.textContent = idA===idB
    ? '⚠️ Đang chọn cùng một hồ sơ'
    : diffCount===0
      ? '✅ 2 hồ sơ giống nhau hoàn toàn'
      : '🔴 Có '+diffCount+' trường khác nhau'+(_hcShowAll?' · '+shown.length+' trường hiển thị':'');
}

// ══════════════════════════════════════════════════════
// ⑤ SYNC HSVV ↔ QLTD (v1.8 — Bước 5)
// ══════════════════════════════════════════════════════
// Link storage: { [hosoId] → 'maKH|soHDTD' }
const HSVV_LINK_KEY = 'hsvv_qltd_links_v1';

function hsvvLinkGetAll() {
  try { return JSON.parse(localStorage.getItem(HSVV_LINK_KEY) || '{}'); } catch { return {}; }
}
function hsvvLinkSave(links) {
  try { localStorage.setItem(HSVV_LINK_KEY, JSON.stringify(links)); } catch {}
}

// ─── Tìm dòng QLTD khớp với HSVV (ưu tiên: maKH, sau đó soHDTD) ───
function hsvvFindQltdRow(maKH, soHDTD) {
  if (!window.DATA || !Array.isArray(DATA.qltd) || DATA.qltd.length === 0) return { row: null, idx: -1 };
  const ma  = String(maKH   || '').trim().toUpperCase();
  const hd  = String(soHDTD || '').trim();

  // Ưu tiên khớp cả Mã KH lẫn Số HĐ
  if (ma && hd) {
    const idx = DATA.qltd.findIndex(r =>
      String(r[0]||'').trim().toUpperCase() === ma &&
      String(r[2]||'').trim() === hd
    );
    if (idx >= 0) return { row: DATA.qltd[idx], idx };
  }
  // Fallback: chỉ khớp Mã KH
  if (ma) {
    const idx = DATA.qltd.findIndex(r =>
      String(r[0]||'').trim().toUpperCase() === ma
    );
    if (idx >= 0) return { row: DATA.qltd[idx], idx };
  }
  // Fallback: chỉ khớp Số HĐ
  if (hd) {
    const idx = DATA.qltd.findIndex(r =>
      String(r[2]||'').trim() === hd
    );
    if (idx >= 0) return { row: DATA.qltd[idx], idx };
  }
  return { row: null, idx: -1 };
}

// ─── Build link key từ một QLTD row ───
function hsvvQltdKey(r) {
  return String(r[0]||'').trim() + '|' + String(r[2]||'').trim();
}

// ─── Auto-link: gọi sau mỗi lần lưu HSVV ───
function hsvvAutoLink(hosoId, data) {
  if (!hosoId || !data) return;
  const maKH   = String(data.maKH   || '').trim();
  const soHDTD = String(data.soHDTD || '').trim();

  const links = hsvvLinkGetAll();
  const { row, idx } = hsvvFindQltdRow(maKH, soHDTD);

  if (row) {
    links[hosoId] = hsvvQltdKey(row);
    hsvvLinkSave(links);
    hsvvSyncBarUpdate('linked', row);
    // Refresh badge trong bảng QLTD nếu đang xem
    const activeTable = (typeof window._activeTable !== 'undefined') ? window._activeTable : '';
    if (['qltd','kd','td'].includes(activeTable)) {
      setTimeout(hsvvInjectQltdBadges, 0);
    }
  } else {
    // Chưa tìm thấy trong QLTD
    const wasLinked = !!links[hosoId];
    if (wasLinked) delete links[hosoId]; // Xóa link cũ nếu Mã KH đã đổi
    hsvvLinkSave(links);
    if (maKH || soHDTD) {
      hsvvSyncBarUpdate('not-found', null);
    } else {
      hsvvSyncBarUpdate('no-data', null);
    }
  }
}

// ─── Cập nhật sync bar trong HSVV ───
function hsvvSyncBarUpdate(state, qltdRow) {
  const bar = document.getElementById('hsvv-sync-bar');
  if (!bar) return;

  bar.className = '';
  bar.innerHTML = '';

  if (state === 'linked' && qltdRow) {
    const ten = String(qltdRow[1] || '—').trim();
    const ma  = String(qltdRow[0] || '—').trim();
    const dn  = Number(qltdRow[11] || 0);
    const dnStr = dn > 0 ? dn.toLocaleString('vi-VN') + ' đ' : '—';
    const hd  = String(qltdRow[2] || '—').trim();
    bar.classList.add('linked');
    bar.innerHTML = `
      <span class="hsvv-sync-icon">🔗</span>
      <span class="hsvv-sync-text">
        <strong>Đã liên kết QLTD:</strong> ${escapeHtml(ten)} · Mã KH: ${escapeHtml(ma)}
        · Số HĐ: ${escapeHtml(hd)} · Dư nợ: ${dnStr}
      </span>
      <button class="hsvv-sync-btn" onclick="hsvvGotoQltd()" title="Chuyển sang trang QLTD và tô sáng dòng này">🔍 Xem QLTD</button>
    `;
  } else if (state === 'not-found') {
    bar.classList.add('unlinked');
    bar.innerHTML = `
      <span class="hsvv-sync-icon">⚠️</span>
      <span class="hsvv-sync-text warn">Chưa tìm thấy trong QLTD — Kiểm tra Mã KH / Số HĐ hoặc cần import IPCAS mới nhất</span>
      <button class="hsvv-sync-btn sec" onclick="showPage('qltd',document.querySelector('[data-page=qltd]'))">Mở QLTD</button>
    `;
  } else {
    bar.classList.add('not-ready');
    bar.innerHTML = `
      <span class="hsvv-sync-icon">○</span>
      <span class="hsvv-sync-text gray">Chưa liên kết QLTD — Điền Mã KH hoặc Số HĐ rồi nhấn 💾 Lưu để tự động ghép</span>
    `;
  }
}

// ─── Khi click "Xem QLTD" từ sync bar: chuyển trang + highlight ───
function hsvvGotoQltd() {
  const links = hsvvLinkGetAll();
  if (!_hosoCurrentId || !links[_hosoCurrentId]) {
    showPage('qltd', document.querySelector('[data-page=qltd]'));
    return;
  }
  const [maKH, soHD] = links[_hosoCurrentId].split('|');
  showPage('qltd', document.querySelector('[data-page=qltd]'));
  // Tô sáng dòng sau khi render xong
  setTimeout(() => hsvvHighlightQltdRow(maKH, soHD), 200);
}

// ─── Tô sáng dòng QLTD sau khi render ───
function hsvvHighlightQltdRow(maKH, soHD) {
  const tbody = document.getElementById('tbody-qltd');
  if (!tbody) return;
  // Tìm dòng có badge với data-ma và data-hd khớp
  const rows = tbody.querySelectorAll('tr[data-hsvv-ma]');
  let found = null;
  rows.forEach(tr => {
    if (tr.dataset.hsvvMa === maKH && tr.dataset.hsvvHd === soHD) found = tr;
  });
  // Fallback: tìm cell chứa mã KH
  if (!found) {
    tbody.querySelectorAll('tr').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      cells.forEach(td => {
        if (td.textContent.trim() === maKH || td.textContent.trim() === soHD) found = tr;
      });
    });
  }
  if (found) {
    found.scrollIntoView({ behavior:'smooth', block:'center' });
    found.style.transition = 'background .3s';
    found.style.background = '#EFF6FF';
    setTimeout(() => { if (found) found.style.background = ''; }, 2500);
    showToast(`🔍 Đã tô sáng dòng QLTD: ${maKH}`, 'green');
  } else {
    showToast('⚠️ Không tìm thấy dòng trong QLTD — thử scroll tìm thủ công', 'red');
  }
}

// ─── Inject badge 📄 vào các dòng QLTD có liên kết HSVV ───
function hsvvInjectQltdBadges() {
  const tbody = document.getElementById('tbody-qltd');
  if (!tbody || !window.DATA || !Array.isArray(DATA.qltd)) return;

  const links   = hsvvLinkGetAll();
  const records  = hosoGetAll();

  // Build reverse map: qltdKey → [hosoId, ...]
  const reverseMap = {};
  Object.entries(links).forEach(([hId, qKey]) => {
    if (!reverseMap[qKey]) reverseMap[qKey] = [];
    reverseMap[qKey].push(hId);
  });

  if (Object.keys(reverseMap).length === 0) return;

  const trs = tbody.querySelectorAll('tr');
  trs.forEach((tr, visIdx) => {
    // Xác định dòng QLTD: tìm ô Mã KH (cột index 3 = td:nth-child(4) trong qltd table)
    const cells = tr.querySelectorAll('td');
    if (cells.length < 5) return;
    // Mã KH trong QLTD ở cột copy-cell đầu tiên
    const maTd  = tr.querySelector('td.copy-cell');
    const ma    = maTd ? maTd.textContent.trim() : '';
    // Số HĐ ở ô tiếp theo (index 5 = cells[5])
    const hd    = cells[5] ? cells[5].textContent.trim() : '';
    const qKey  = ma + '|' + hd;
    const altKey = ma + '|'; // fallback khi soHD không rõ

    const linkedIds = reverseMap[qKey] || reverseMap[altKey] || [];
    if (linkedIds.length === 0) return;

    // Xóa badge cũ nếu có
    tr.querySelectorAll('.qltd-hsvv-badge').forEach(b => b.remove());

    // Thêm data attribute để highlight sau này
    tr.dataset.hsvvMa = ma;
    tr.dataset.hsvvHd = hd;

    // Tạo badge trong ô Mã KH
    const meta  = records[linkedIds[0]]?._meta || {};
    const label = linkedIds.length === 1
      ? `📄 HSVV: ${meta.tenKH || '?'}`
      : `📄 ${linkedIds.length} HSVV`;
    const badge = document.createElement('span');
    badge.className = 'qltd-hsvv-badge';
    badge.title = `Hồ sơ vay vốn đã lưu — Click để mở HSVV`;
    badge.textContent = label;
    badge.onclick = (e) => {
      e.stopPropagation();
      hsvvOpenLinked(linkedIds[0]);
    };
    if (maTd) maTd.appendChild(badge);
  });
}

// ─── Mở HSVV từ badge trong QLTD ───
function hsvvOpenLinked(hosoId) {
  if (!hosoId) return;
  const records = hosoGetAll();
  if (!records[hosoId]) { showToast('❌ Không tìm thấy hồ sơ này', 'red'); return; }
  // Chuyển sang trang HSVV
  const hsvvNav = document.querySelector('[data-page=hsvv]');
  if (hsvvNav) showPage('hsvv', hsvvNav);
  // Load hồ sơ
  hosoLoad(hosoId);
}

// ─── PATCH: gọi hsvvAutoLink sau mỗi lần lưu HSVV ───
const _origHosoSilentSave = window.hosoSilentSave;
window.hosoSilentSave = function() {
  _origHosoSilentSave?.();
  // Lấy dữ liệu vừa lưu để tự động link
  if (_hosoCurrentId) {
    const records = hosoGetAll();
    const data    = records[_hosoCurrentId];
    if (data) hsvvAutoLink(_hosoCurrentId, data);
  }
};

// ─── PATCH: Inject badges sau mỗi lần render bảng qltd/kd/td ───
const _origRenderTableForSync = window.renderTable;
window.renderTable = function(key) {
  _origRenderTableForSync?.(key);
  if (['qltd','kd','td'].includes(key)) {
    setTimeout(hsvvInjectQltdBadges, 50);
  }
};

// ─── Init: kiểm tra link trạng thái khi mở trang HSVV ───
(function hsvvSyncInit() {
  // Đợi DOMContentLoaded + loadData hoàn tất
  const check = () => {
    if (!_hosoCurrentId) { hsvvSyncBarUpdate('no-data', null); return; }
    const records = hosoGetAll();
    const data    = records[_hosoCurrentId];
    if (!data) return;
    // Check existing link
    const links = hsvvLinkGetAll();
    const qKey  = links[_hosoCurrentId];
    if (qKey && window.DATA && Array.isArray(DATA.qltd)) {
      const [maKH, soHD] = qKey.split('|');
      const { row } = hsvvFindQltdRow(maKH, soHD);
      if (row) { hsvvSyncBarUpdate('linked', row); return; }
    }
    hsvvAutoLink(_hosoCurrentId, data);
  };
  // Chạy sau khi loadData và DOMContentLoaded
  if (document.readyState === 'complete') setTimeout(check, 1200);
  else window.addEventListener('load', () => setTimeout(check, 1200));
})();


function hosoExportJSON() {
  const records = hosoGetAll();
  const ids = Object.keys(records);
  if (ids.length === 0) { showToast('⚠️ Chưa có hồ sơ nào để xuất', 'red'); return; }

  const payload = {
    _exportedAt: new Date().toISOString(),
    _version: 'hsvv_v2',
    _count: ids.length,
    records
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const date = new Date().toLocaleDateString('vi-VN').replace(/\//g,'-');
  const fname = `HoSo_Backup_${ids.length}HS_${date}.json`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  URL.revokeObjectURL(a.href);

  showToast(`✅ Đã xuất ${ids.length} hồ sơ → ${fname}`, 'green');
}

function hosoImportJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  // Reset input để có thể chọn lại cùng file
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = e => {
    let payload;
    try {
      payload = JSON.parse(e.target.result);
    } catch {
      showToast('❌ File JSON không hợp lệ', 'red'); return;
    }

    // Validate structure
    if (!payload.records || typeof payload.records !== 'object') {
      showToast('❌ File không đúng định dạng bộ hồ sơ', 'red'); return;
    }

    const incoming = payload.records;
    const inCount  = Object.keys(incoming).length;
    const existing = hosoGetAll();
    const exCount  = Object.keys(existing).length;

    if (inCount === 0) { showToast('⚠️ File không có hồ sơ nào', 'red'); return; }

    // ✅ BUG-FIX: Dùng 2 confirm riêng biệt, không để Cancel → hành động nguy hiểm
    const exportedAt = payload._exportedAt
      ? new Date(payload._exportedAt).toLocaleString('vi-VN') : '?';

    const doMerge = confirm(
      `📥 File chứa ${inCount} hồ sơ (xuất lúc ${exportedAt}).\n\n` +
      `Hiện có ${exCount} hồ sơ trong máy.\n\n` +
      `▶ Nhấn OK  → Gộp (giữ hồ sơ cũ, thêm hồ sơ mới — AN TOÀN)\n` +
      `▶ Nhấn Hủy → Thoát (không làm gì)`
    );
    if (!doMerge) {
      // Hỏi lần 2 nếu muốn ghi đè
      const doOverwrite = confirm(
        `⚠️ Muốn GHI ĐÈ toàn bộ ${exCount} hồ sơ cũ?\n\n` +
        `▶ OK  → Xóa ${exCount} hồ sơ cũ, nhập ${inCount} hồ sơ mới\n` +
        `▶ Hủy → Thoát hoàn toàn (không thay đổi gì)`
      );
      if (!doOverwrite) return; // Thoát hẳn
      if (!confirm(`⚠️ Xác nhận lần cuối: Xóa ${exCount} hồ sơ cũ và thay bằng ${inCount} hồ sơ mới?\nKhông thể hoàn tác!`)) return;
      hosoSetAll(incoming);
      hosoRenderList();
      showToast(`✅ Đã ghi đè — nhập ${inCount} hồ sơ mới`, 'green');
      return;
    }

    // Gộp
    let merged = { ...existing, ...incoming };

    // Kiểm tra giới hạn
    const totalCount = Object.keys(merged).length;
    if (totalCount > HOSO_MAX) {
      showToast(`⚠️ Vượt giới hạn ${HOSO_MAX} hồ sơ — chỉ giữ ${HOSO_MAX} hồ sơ mới nhất`, 'red');
      // Giữ HOSO_MAX hồ sơ mới nhất
      const sorted = Object.entries(merged).sort((a,b) =>
        (b[1]?._meta?.savedAt||'').localeCompare(a[1]?._meta?.savedAt||''));
      merged = Object.fromEntries(sorted.slice(0, HOSO_MAX));
    }

    hosoSetAll(merged);
    hosoRenderList();

    const finalCount = Object.keys(merged).length;
    showToast(`✅ Đã nhập ${inCount} hồ sơ — tổng ${finalCount} hồ sơ trong máy`, 'green');
  };
  reader.readAsText(file, 'utf-8');
}

// ── FIELD SPOTLIGHT — Ctrl+F trong form HSVV ─────────────────────────────
let _spotlightMatches = [];
let _spotlightIdx     = -1;
let _spotlightPrevEl  = null; // để xóa highlight cũ

function fieldSpotlightOpen() {
  const bar = document.getElementById('field-spotlight');
  if (!bar) return;
  bar.style.display = 'flex';
  const inp = document.getElementById('field-spotlight-input');
  if (inp) { inp.focus(); inp.select(); }
}

function fieldSpotlightClose() {
  const bar = document.getElementById('field-spotlight');
  if (bar) bar.style.display = 'none';
  fieldSpotlightClearHL();
  _spotlightMatches = [];
  _spotlightIdx = -1;
  const cnt = document.getElementById('field-spotlight-count');
  if (cnt) cnt.textContent = '';
  const inp = document.getElementById('field-spotlight-input');
  if (inp) inp.value = '';
}

function fieldSpotlightClearHL() {
  if (_spotlightPrevEl) {
    _spotlightPrevEl.style.outline = '';
    _spotlightPrevEl.style.boxShadow = '';
    _spotlightPrevEl.style.background = '';
    _spotlightPrevEl = null;
  }
  // Xóa tất cả label highlight cũ
  document.querySelectorAll('.fsl-hl').forEach(el => el.classList.remove('fsl-hl'));
}

function fieldSpotlightSearch(q) {
  fieldSpotlightClearHL();
  _spotlightMatches = [];
  _spotlightIdx = -1;
  const cnt = document.getElementById('field-spotlight-count');

  if (!q || q.trim().length < 1) {
    if (cnt) cnt.textContent = '';
    return;
  }

  const norm = q.trim().toLowerCase();
  const page = document.getElementById('page-hsvv');
  if (!page) return;

  // Tìm tất cả field có label khớp
  page.querySelectorAll('.f').forEach(wrapper => {
    const label = wrapper.querySelector('label');
    const input = wrapper.querySelector('input:not([type=hidden]):not([readonly]), select, textarea:not([readonly])');
    if (!label || !input || HOSO_SKIP_IDS.has(input.id)) return;
    const labelText = label.textContent.toLowerCase();
    if (labelText.includes(norm)) {
      _spotlightMatches.push({ wrapper, input, label });
    }
  });

  if (_spotlightMatches.length === 0) {
    if (cnt) cnt.textContent = 'Không tìm thấy';
    return;
  }

  if (cnt) cnt.textContent = `1/${_spotlightMatches.length}`;
  _spotlightIdx = 0;
  fieldSpotlightGoTo(0);
}

function fieldSpotlightGoTo(i) {
  fieldSpotlightClearHL();
  if (_spotlightMatches.length === 0) return;
  _spotlightIdx = ((i % _spotlightMatches.length) + _spotlightMatches.length) % _spotlightMatches.length;
  const m = _spotlightMatches[_spotlightIdx];

  const cnt = document.getElementById('field-spotlight-count');
  if (cnt) cnt.textContent = `${_spotlightIdx + 1}/${_spotlightMatches.length}`;

  // Nếu section đang ẩn → hiện section chứa field đó
  const sec = m.wrapper.closest('.sec[id]');
  if (sec && sec.style.display === 'none') {
    // Tìm chip tương ứng và click
    const chip = document.querySelector(`.chip[onclick*="'${sec.id}'"]`);
    if (chip) chip.click();
  }

  // Scroll + highlight
  m.input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  m.input.focus();
  m.input.style.outline    = '2.5px solid #3B82F6';
  m.input.style.boxShadow  = '0 0 0 4px rgba(59,130,246,.2)';
  m.input.style.background = '#EFF6FF';
  m.label.classList.add('fsl-hl');
  _spotlightPrevEl = m.input;

  // Xóa highlight sau 2.5s nếu user không navigate tiếp
  clearTimeout(m.input._spotTimeout);
  m.input._spotTimeout = setTimeout(() => {
    if (_spotlightPrevEl === m.input) fieldSpotlightClearHL();
  }, 2500);
}

function fieldSpotlightKey(e) {
  if (e.key === 'Escape') { fieldSpotlightClose(); return; }
  if (e.key === 'Enter' || e.key === 'F3') {
    e.preventDefault();
    if (_spotlightMatches.length === 0) return;
    fieldSpotlightGoTo(e.shiftKey ? _spotlightIdx - 1 : _spotlightIdx + 1);
  }
}

// Ctrl+F trong page-hsvv → mở spotlight thay browser find
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    const page = document.getElementById('page-hsvv');
    if (page && getComputedStyle(page).display !== 'none') {
      e.preventDefault();
      fieldSpotlightOpen();
    }
  }
});

// ── AUTOCOMPLETE MÃ KH từ DATA.qltd ─────────────────────────────────────
let _makhAutoIdx = -1; // keyboard nav index

function maKHAutocomplete(val) {
  const dd = document.getElementById('makh-dropdown');
  if (!dd) return;
  const q = val.trim().toLowerCase();

  // Ẩn dropdown nếu nhập < 2 ký tự hoặc không có data
  if (q.length < 2 || typeof DATA === 'undefined' || !Array.isArray(DATA.qltd) || DATA.qltd.length === 0) {
    dd.style.display = 'none'; return;
  }

  // Tìm khớp — ưu tiên mã KH, fallback tên KH
  const seen = new Set();
  const matches = [];
  for (const r of DATA.qltd) {
    const makh = (r[0] || '').toLowerCase();
    const ten  = (r[1] || '').toLowerCase();
    const key  = r[0] + '|' + r[1];
    if (seen.has(key)) continue;
    if (makh.includes(q) || ten.includes(q)) {
      seen.add(key);
      matches.push({ makh: r[0] || '', ten: r[1] || '', diaChi: r[14] || '' });
      if (matches.length >= 8) break;
    }
  }

  if (matches.length === 0) { dd.style.display = 'none'; return; }

  _makhAutoIdx = -1;
  dd.innerHTML = matches.map((m, i) => {
    const highlight = (str) => {   // P07: escape trước khi tô sáng
      str = String(str == null ? '' : str);
      if (!q) return escapeHtml(str);
      return str.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi')).map((p, j) =>
        j % 2 ? '<mark style="background:#BFDBFE;border-radius:2px">' + escapeHtml(p) + '</mark>' : escapeHtml(p)).join('');
    };
    return `<div class="makh-ac-item" data-i="${i}"
      style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #EFF6FF;display:flex;flex-direction:column;gap:2px"
      onmouseenter="this.style.background='#EFF6FF';_makhAutoIdx=${i}"
      onmouseleave="this.style.background=''"
      onclick="maKHAutoPick(${i})">
      <div style="font-weight:700;color:#1D4ED8;font-size:12px">${highlight(m.makh)}</div>
      <div style="color:#374151">${highlight(m.ten)}</div>
      ${m.diaChi ? `<div style="color:#9CA3AF;font-size:11px">${escapeHtml(m.diaChi)}</div>` : ''}
    </div>`;
  }).join('');

  // Lưu matches để pick sau
  dd._matches = matches;
  dd.style.display = 'block';
}

function maKHAutoPick(i) {
  const dd = document.getElementById('makh-dropdown');
  if (!dd || !dd._matches) return;
  const m = dd._matches[i];
  if (!m) return;

  // Điền maKH
  const maKHEl = document.getElementById('maKH');
  if (maKHEl) maKHEl.value = m.makh;

  // Tự điền tenKH nếu đang trống
  const tenKHEl = document.getElementById('tenKH');
  if (tenKHEl && !tenKHEl.value.trim()) {
    tenKHEl.value = m.ten;
    if (typeof autoUpper === 'function') autoUpper('tenKHHoa', m.ten);
    tenKHEl.dispatchEvent(new Event('input'));
  }

  // Tự điền diaChi nếu đang trống
  const diaChiEl = document.getElementById('diaChi');
  if (diaChiEl && !diaChiEl.value.trim() && m.diaChi) {
    diaChiEl.value = m.diaChi;
  }

  dd.style.display = 'none';
  hosoMarkDirty();
  showToast(`✅ Đã điền: ${m.ten} (${m.makh})`, 'green');
}

function maKHAutoKey(e) {
  const dd = document.getElementById('makh-dropdown');
  if (!dd || dd.style.display === 'none') return;
  const items = dd.querySelectorAll('.makh-ac-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _makhAutoIdx = Math.min(_makhAutoIdx + 1, items.length - 1);
    items.forEach((el, i) => el.style.background = i === _makhAutoIdx ? '#EFF6FF' : '');
    if (items[_makhAutoIdx]) items[_makhAutoIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _makhAutoIdx = Math.max(_makhAutoIdx - 1, 0);
    items.forEach((el, i) => el.style.background = i === _makhAutoIdx ? '#EFF6FF' : '');
  } else if (e.key === 'Enter' && _makhAutoIdx >= 0) {
    e.preventDefault();
    maKHAutoPick(_makhAutoIdx);
  } else if (e.key === 'Escape') {
    dd.style.display = 'none';
  }
}

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', e => {
  const dd = document.getElementById('makh-dropdown');
  if (dd && !dd.contains(e.target) && e.target.id !== 'maKH') {
    dd.style.display = 'none';
  }
});

// ── VALIDATION BEFORE EXPORT — Modal ──────────────────────────────────────
// Biến callback để ecExportAll / hosoBatchExport gọi sau khi user xác nhận
let _validateExportCallback = null;

function hosoValidateBeforeExport(onProceed) {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const errors = EC_REQUIRED.filter(f => f.level === 'error' && !g(f.id));
  const warns  = EC_REQUIRED.filter(f => f.level === 'warn'  && !g(f.id));

  // Nếu không có lỗi + cảnh báo → xuất thẳng
  if (errors.length === 0 && warns.length === 0) { onProceed(); return; }

  // Render nội dung modal
  let body = '';
  if (errors.length > 0) {
    body += `<div style="margin-bottom:10px">
      <div style="font-weight:700;color:#B91C1C;margin-bottom:6px">🔴 ${errors.length} trường BẮT BUỘC còn trống — tài liệu sẽ có ô rỗng:</div>
      ${errors.map(f => `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #FEE2E2;font-size:12.5px">
        <span style="color:#B91C1C;font-weight:700">✕</span>
        <span>${f.label}</span>
        <button onclick="hosoValidateJumpTo('${f.id}')" style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #FECACA;background:#FFF5F5;color:#B91C1C;cursor:pointer">Điền ngay</button>
      </div>`).join('')}
    </div>`;
  }
  if (warns.length > 0) {
    body += `<div style="margin-bottom:10px">
      <div style="font-weight:600;color:#92400E;margin-bottom:6px">🟡 ${warns.length} trường nên có — nếu thiếu tài liệu sẽ in dấu [...]:</div>
      ${warns.map(f => `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #FEF3C7;font-size:12.5px">
        <span style="color:#D97706">⚠</span>
        <span>${f.label}</span>
        <button onclick="hosoValidateJumpTo('${f.id}')" style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid #FDE68A;background:#FFFBEB;color:#92400E;cursor:pointer">Điền ngay</button>
      </div>`).join('')}
    </div>`;
  }

  document.getElementById('modal-validate-body').innerHTML = body;
  _validateExportCallback = onProceed;

  // Cập nhật label nút xuất
  const proceedBtn = document.getElementById('modal-validate-proceed');
  if (proceedBtn) {
    proceedBtn.textContent = errors.length > 0
      ? '⚡ Xuất dù thiếu trường bắt buộc'
      : '📄 Xuất (bỏ qua cảnh báo)';
    proceedBtn.style.background = errors.length > 0 ? '#B91C1C' : '#D97706';
  }

  openModal('modal-validate-export');
}

function hosoValidateJumpTo(fieldId) {
  closeModal('modal-validate-export');
  // Chuyển về tab HSVV nếu chưa ở đó
  const hsvvPage = document.getElementById('page-hsvv');
  if (hsvvPage && hsvvPage.style.display === 'none') {
    if (typeof showPage === 'function') showPage('hsvv');
  }
  setTimeout(() => {
    const el = document.getElementById(fieldId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
    el.style.outline = '3px solid #3B82F6';
    el.style.boxShadow = '0 0 0 4px rgba(59,130,246,.25)';
    setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 2500);
  }, 200);
}

function hosoValidateProceed() {
  closeModal('modal-validate-export');
  if (typeof _validateExportCallback === 'function') {
    _validateExportCallback();
    _validateExportCallback = null;
  }
}
