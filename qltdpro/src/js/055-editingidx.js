
/* ═══════════════════════════════════════════════════════════════
   MODAL ADD/EDIT
   ═══════════════════════════════════════════════════════════════ */
let editingIdx = -1;
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }
function openAddModal() {
  editingIdx = -1;
  $('modal-title').textContent = '➕ Thêm hồ sơ tín dụng mới';
  buildEditForm({});
  openModal('modal-edit');
}
function editRow(idx) {
  editingIdx = idx;
  const r = DATA.qltd[idx];
  if (!r) return;
  $('modal-title').textContent = `✏️ Sửa hồ sơ: ${r[1]}`;
  buildEditForm({
    makh: fmtMaKH(r[0]), ten: r[1], sohd: r[2], ngayhd: r[3],
    hmtd: r[5], ngaygn: r[6], ngaytra: r[7], ls: r[8],
    sotien: r[9], tienlai: r[10], duno: r[11],
    cbtd: r[12], loaivay: r[13], diachi: r[14],
    mucdich: r[15], phongban: r[17], nhomno: r[18],
    sohoso: r[19], sotk: r[20],
    tsbdGiaTri: r[27], tsbdSoLuong: r[28],
  });
  openModal('modal-edit');
}
function buildEditForm(v) {
  const fields = [
    { k:'ten', label:'Tên Khách Hàng', full:true },
    { k:'makh', label:'Mã KH (brcd)' },
    { k:'sohd', label:'Số HĐTD' },
    { k:'ngayhd', label:'Ngày HĐ (dd/mm/yyyy)' },
    { k:'ngaygn', label:'Ngày giải ngân' },
    { k:'ngaytra', label:'Ngày trả nợ (đáo hạn)' },
    { k:'hmtd', label:'Hạn mức (đ)', type:'number' },
    { k:'sotien', label:'Số tiền GN (đ)', type:'number' },
    { k:'duno', label:'Dư nợ hiện tại (đ)', type:'number' },
    { k:'tienlai', label:'Tiền lãi phải thu (đ)', type:'number' },
    { k:'ls', label:'Lãi suất (%)', type:'number' },
    { k:'loaivay', label:'Loại vay', select:['','Vay ngắn hạn (TK 211)','Vay trung hạn (TK 212)','Vay dài hạn (TK 213)','Thấu chi trên TK khách hàng'] },
    { k:'nhomno', label:'Nhóm nợ', select:['','Nhóm 1','Nhóm 2','Nhóm 3','Nhóm 4','Nhóm 5'] },
    { k:'cbtd', label:'CBTD phụ trách' },
    { k:'phongban', label:'Phòng ban', select:['','Hội Sở','PGD Hai Bà Trưng','PGD Số 2'] },
    { k:'mucdich', label:'Mục đích vay', full:true },
    { k:'diachi', label:'Địa chỉ KH', full:true },
    { k:'sohoso', label:'Số hồ sơ' },
    { k:'sotk', label:'Số TK' },
    { k:'tsbdGiaTri', label:'🏠 Tổng giá trị TSBĐ (đ)', type:'number' },
    { k:'tsbdSoLuong', label:'🏠 Số lượng TSBĐ', type:'number' },
  ];
  $('modal-form').innerHTML = fields.map(f => {
    const val = v[f.k] ?? (f.k === 'cbtd' ? DEFAULT_CBTD : (f.k === 'nhomno' ? 'Nhóm 1' : ''));
    if (f.select) {
      return `<div class="form-group${f.full?' full':''}">
        <label>${f.label}</label>
        <select name="${f.k}">
          ${f.select.map(o => `<option value="${escapeHtml(o)}" ${o===val?'selected':''}>${escapeHtml(o||'— Chọn —')}</option>`).join('')}
        </select>
      </div>`;
    }
    return `<div class="form-group${f.full?' full':''}">
      <label>${f.label}</label>
      <input type="${f.type||'text'}" name="${f.k}" value="${escapeHtml(val)}" placeholder="${f.label}">
    </div>`;
  }).join('');
  // Nút đồng bộ TSBĐ từ hồ sơ HSVV liên kết (nếu có) — chèn cạnh 2 trường TSBĐ
  const tsbdField = document.querySelector('#modal-form [name="tsbdSoLuong"]');
  if (tsbdField) {
    const btnWrap = document.createElement('div');
    btnWrap.className = 'form-group full';
    btnWrap.style.marginTop = '-6px';
    btnWrap.innerHTML = `<button type="button" class="btn btn-outline" style="font-size:11px;padding:4px 10px" onclick="syncTSBDFromHsvv()">🔄 Đồng bộ TSBĐ từ hồ sơ HSVV liên kết</button>
      <span id="tsbd-sync-note" style="margin-left:8px;font-size:11px;color:var(--gray-500)"></span>`;
    tsbdField.closest('.form-group').insertAdjacentElement('afterend', btnWrap);
  }
}
// Kéo tổng giá trị & số lượng TSBĐ từ hồ sơ HSVV đang liên kết với KH/HĐTD trong form
function syncTSBDFromHsvv() {
  const form = $('modal-form');
  const ma  = form.querySelector('[name="makh"]')?.value || '';
  const hd  = form.querySelector('[name="sohd"]')?.value || '';
  const res = (typeof tsbdFromLinkedHoso === 'function') ? tsbdFromLinkedHoso(ma, hd) : null;
  const note = $('tsbd-sync-note');
  if (!res) {
    if (note) note.textContent = '⚠️ Không tìm thấy hồ sơ HSVV liên kết có dữ liệu TSBĐ';
    showToast('⚠️ Chưa có HSVV liên kết với dữ liệu TSBĐ cho KH này', 'red');
    return;
  }
  const gtField = form.querySelector('[name="tsbdGiaTri"]');
  const slField = form.querySelector('[name="tsbdSoLuong"]');
  if (gtField) gtField.value = res.tong;
  if (slField) slField.value = res.soLuong;
  if (note) note.textContent = `✅ Đã lấy ${res.soLuong} tài sản từ HSVV liên kết`;
  showToast(`✅ Đồng bộ ${res.soLuong} tài sản (${fmtMoney(res.tong)} đ) từ HSVV`, 'green');
}
function saveRecord() {
  const form = $('modal-form');
  const v = {};
  form.querySelectorAll('input, select').forEach(el => { v[el.name] = el.value.trim(); });
  if (!v.ten) { alert('⚠️ Vui lòng nhập tên khách hàng'); return; }
  const row = [
    normMaDigits(v.makh), v.ten, v.sohd, v.ngayhd, v.ngayhd,
    Number(v.hmtd)||0, v.ngaygn, v.ngaytra, parseFloat(v.ls)||'',
    Number(v.sotien)||0, Number(v.tienlai)||0, Number(v.duno)||0,
    v.cbtd || DEFAULT_CBTD, v.loaivay, v.diachi, v.mucdich, 0,
    v.phongban, v.nhomno || 'Nhóm 1', v.sohoso, v.sotk,
  ];
  // ✅ TSBĐ: r[27] Tổng giá trị TSBĐ, r[28] Số lượng TSBĐ
  // Giữ nguyên r[23]-r[26] (dữ liệu IPCAS: ngày thu lãi/đến hạn...) nếu hồ sơ đang sửa đã có
  if (editingIdx >= 0 && DATA.qltd[editingIdx]) {
    const old = DATA.qltd[editingIdx];
    for (let ci = 23; ci <= 26; ci++) row[ci] = old[ci];
  }
  row[27] = Number(v.tsbdGiaTri) || 0;
  row[28] = Number(v.tsbdSoLuong) || 0;
  // Req 3+4: Giữ nguyên số tập/số TK nếu KH đã có mapping từ TKSTT
  const tkstt = (typeof lookupTKSTT === 'function') ? lookupTKSTT(normMaDigits(v.makh), v.ten) : null;
  if (tkstt) {
    row[21] = tkstt.sotk || row[21] || '';
    row[22] = tkstt.sotap || row[22] || '';
  } else {
    // KH phát sinh mới (không có trong TKSTT) → cấp số tập kế tiếp
    if (!row[22] && editingIdx < 0 && typeof nextSotap === 'function') {
      row[22] = nextSotap(row[13]);
      const pool = (typeof getSotapPool === 'function') ? getSotapPool(row[13]) : 'KD';
      showToast(`🆕 KH mới — tự cấp SỐ TẬP ${row[22]} (nhóm ${pool==='TD'?'TRUNG HẠN':'NGẮN HẠN'})`, 'gold');
    }
  }

  if (editingIdx >= 0) {
    DATA.qltd[editingIdx] = row;
    showToast('✏️ Đã cập nhật hồ sơ', 'green');
  } else {
    DATA.qltd.unshift(row);
    showToast('➕ Đã thêm hồ sơ mới', 'green');
  }
  markUnsaved();
  closeModal('modal-edit');
  rebuildAll();
}
function deleteRow(idx) {
  const r = DATA.qltd[idx]; if (!r) return;
  if (!confirm(`🗑️ Xóa hồ sơ "${r[1]}" (${r[2]})?\nKhông thể hoàn tác.`)) return;
  DATA.qltd.splice(idx, 1);
  markUnsaved();
  rebuildAll();
  showToast('🗑️ Đã xóa hồ sơ', 'red');
}

/* ═══════════════════════════════════════════════════════════════
   EXPORT CSV
   ═══════════════════════════════════════════════════════════════ */
function exportCurrentTable() {
  const key = activeTable;
  const rows = getFilteredData(key);
  if (!rows.length) { alert('Không có dữ liệu để xuất'); return; }
  const headerMap = {
    qltd:['Mã KH','Tên KH','Số HĐTD','Ngày HĐ','Ngày HĐTD','HMTD','Ngày GN','Ngày trả nợ','L/S %','Số tiền GN','Tiền lãi','Dư nợ','CBTD','Loại vay','Địa chỉ','Mục đích','Gốc trả','Phòng ban','Nhóm nợ','Số hồ sơ','Số TK'],
    kd: null, td: null,
    denhan:['Ngày trả nợ','Tên KH','Mã KH','Số HĐTD','Loại vay','Dư nợ','CBTD','Phòng ban','Đã thu','Ghi chú'],
    laidong:['Đã thu lãi đến','Tên KH','Mã KH','Số HĐTD','Loại vay','Tiền lãi','Dư nợ','CBTD','Đã thu','Ghi chú'],
    phidv:['STT','Tên KH','Mã KH','Ngày GN','Số tiền GN','Mức phí','Phí phải thu','CBTD','Trạng thái','Ghi chú'],
    macb:['STT','Họ tên','Mã CB','Chức vụ','Phòng ban','HS CB','HS KD','Lương V1','PCCV','Xếp loại'],
  };
  headerMap.kd = headerMap.qltd;
  headerMap.td = headerMap.qltd;
  const hdr = headerMap[key];
  if (!hdr) { alert('Chưa hỗ trợ xuất trang này'); return; }

  let lines = [hdr.join(',')];
  if (['qltd','kd','td'].includes(key)) {
    rows.forEach(r => {
      lines.push([r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11],r[12],r[13],r[14],r[15],r[16],r[17],r[18],r[19],r[20]].map(csvEscape).join(','));
    });
  } else if (key === 'denhan') {
    rows.forEach(r => {
      const s = DATA.denhanStatus[denhanKey(r)] || {};
      lines.push([r[7],r[1],r[0],r[2],r[13],r[11],r[12],r[17], s.dathu?'Đã thu':'Chưa thu', s.note||''].map(csvEscape).join(','));
    });
  } else if (key === 'laidong') {
    rows.forEach(r => {
      const s = DATA.laidongStatus[laidongKey(r)] || {};
      lines.push([r[23],r[1],r[0],r[2],r[13],r[10],r[11],r[12], s.dathu?'Đã thu':'Chưa thu', s.note||''].map(csvEscape).join(','));
    });
  } else if (key === 'phidv') {
    // ✅ PRO-32: gộp extra rows, dùng mức phí tuỳ chỉnh + trạng thái báo phí
    const extraMap = {};
    (DATA.phidvExtra || []).forEach(e => { extraMap[e.id] = e; });
    // ✅ KEY SYNC FIX: Dùng getAmt (đồng bộ với renderPhiDV) — r[9]>0 ? r[9] : r[11]
    // tránh export CSV ra số tiền 0 khi r[9]=0 nhưng màn hình hiển thị đúng r[11]
    const getAmtExport = r => Number(r[9]) > 0 ? Number(r[9]) : (Number(r[11]) || 0);
    rows.forEach((r,i) => {
      const amt   = getAmtExport(r);
      const k     = phidvGetRowKey(r);
      const st    = phidvGetSt(k);
      const phi   = phidvCalcPhi(amt, st.mucphi);
      const rowId = r[99] || '';
      const note  = rowId && extraMap[rowId] ? (extraMap[rowId].note || 'Thêm thủ công') : '';
      const trang = st.status === 'da_bao' ? 'Đã báo phí' : 'Chưa báo phí';
      lines.push([i+1, r[1], r[0], r[6], amt, phi.label, phi.phi, r[12], trang, note].map(csvEscape).join(','));
    });
  } else if (key === 'macb') {
    rows.forEach((r,i) => {
      lines.push([i+1, r.hoten, r.macb, r.chucvu, r.phongban, r.hscb, r.hskd, r.luongV1, r.pccv, r.xeploai].map(csvEscape).join(','));
    });
  }
  const csv = '\ufeff' + lines.join('\n');  // BOM for Excel to auto-detect UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  a.href = URL.createObjectURL(blob);
  a.download = `qltd_${key}_${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`⬇️ Đã xuất ${rows.length} dòng ra CSV`, 'green');
}
function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/* ═══════════════════════════════════════════════════════════════
   IMPORT – XLSX (offline parser using fflate-less pure-JS approach)
   We'll use a minimal XLSX reader: unzip → parse sheet1.xml
   ═══════════════════════════════════════════════════════════════ */
function openImportModal() {
  pendingImportRows = null;
  _syncAllRows = [];
  _syncExcluded = new Set();
  _syncActiveTab = 'all';
  $('import-file-info').textContent = '';
  $('import-preview').style.display = 'none';
  $('import-sync-panel').style.display = 'none';
  $('btn-do-import').disabled = true;
  $('btn-do-import').style.opacity = '.5';
  $('btn-do-import').textContent = '✅ Xác nhận nhập';
  // Reset file input để cho phép chọn lại cùng file
  const fi = $('import-file'); if (fi) fi.value = '';
  openModal('modal-import');
}
function handleDropImport(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'var(--gray-300)';
  e.currentTarget.style.background = 'transparent';
  const f = e.dataTransfer.files[0];
  if (f) processImportFile(f);
}
function handleImportFile(e) {
  const f = e.target.files[0];
  if (f) processImportFile(f);
}
async function processImportFile(f) {
  $('import-file-info').textContent = `📄 ${f.name} (${(f.size/1024/1024).toFixed(2)} MB)`;
  // ✅ Trích ngày từ tên file nguồn (dạng dd.mm.yyyy) → dùng làm tên lưu trữ
  // FIX GỐC RỄ #7 (05/9/2026) — file IPCAS thực tế của chi nhánh đặt tên dạng
  // "30_06_2026.XLS" (gạch dưới), không phải "30.06.2026" (dấu chấm). Regex
  // cũ chỉ khớp dấu chấm nên _importSourceDate luôn = null với file thật →
  // tên snapshot rơi về "Report <ngày giờ hiện tại>" thay vì ngày báo cáo
  // thật, khiến mốc so sánh (setDefaultFilter/mocBizDate) không tự nhận ra
  // được và cảnh báo lệch mốc phía trên luôn phải dựa vào tag/timestamp dự
  // phòng. Bổ sung nhận dạng cả dấu chấm VÀ dấu gạch dưới.
  // HM-07: TD.dataDate.fromFileName nhận cả "DUNO_18.08.2026" / "msit80_30_06_2026" (\b cũ coi "_" là ký tự từ nên bỏ sót)
  window._importSourceDate = TD.dataDate.fromFileName(f.name);
  // ✅ Lưu lại ngày file để gắn tag mốc (khác với _importSourceDate vì có thể đổi tên)
  window._importDateActual = window._importSourceDate;
  try {
    let rows;
    if (f.name.toLowerCase().endsWith('.csv')) {
      const text = await f.text();
      // ✅ FIX ❹: parseCSV trả về raw string — date sẽ được chuẩn hoá DD/MM/YYYY
      // trong transformIPCAS() qua smartDateToVN() (mọi định dạng IPCAS đều xử lý được)
      rows = parseCSV(text);
    } else if (/\.xlsx$|\.xlsm$/i.test(f.name)) {
      rows = await parseXLSX(f);
    } else if (/\.xls$/i.test(f.name)) {
      // Req 1: Hỗ trợ file .xls (binary BIFF) qua SheetJS
      rows = await parseXLS_legacy(f);
    } else {
      alert('Chỉ hỗ trợ .xls, .xlsx, .xlsm, .csv'); return;
    }
    if (!rows || rows.length < 2) { alert('File không có dữ liệu'); return; }
    // Transform IPCAS headers to our row format
    const transformed = transformIPCAS(rows);
    pendingImportRows = transformed;
    previewImport(transformed);
    $('btn-do-import').disabled = false;
    $('btn-do-import').style.opacity = '1';
    $('btn-do-import').textContent = `✅ Xác nhận nhập (${transformed.length} bản ghi)`;
  } catch (err) {
    alert('Lỗi đọc file: ' + err.message);
    console.error(err);
  }
}

// CSV parser – simple (supports quoted, commas, newlines in quotes)
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i+1] === '"') { cell += '"'; i++; }
        else inQuote = false;
      } else cell += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i+1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else cell += c;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Minimal XLSX reader — uses native DecompressionStream (modern browsers)
async function parseXLSX(file) {
  // HM-02: ưu tiên SheetJS (cùng đường với .xls); bộ đọc tự viết chỉ là dự phòng khi thư viện không nạp được.
  try {
    if (typeof XLSX === 'undefined' && typeof window.TD_ensureVendors === 'function') await window.TD_ensureVendors();
  } catch (e) { console.warn('[HM-02] Không nạp được thư viện đọc Excel, dùng bộ đọc dự phòng:', e); }
  if (typeof XLSX !== 'undefined') return parseXLS_legacy(file);
  return parseXLSX_fallback(file);
}
async function parseXLSX_fallback(file) {
  const buf = await file.arrayBuffer();
  const zip = unzip(new Uint8Array(buf));
  const _xmlAttr = (a, n) => { const m = new RegExp('\\b' + n + '="([^"]*)"').exec(a); return m ? m[1] : null; };
  const _unesc = t => t.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');

  // HM-02: tập chỉ số kiểu (s="n") mang định dạng ngày — chỉ ô thuộc tập này mới được đổi số → ngày
  const dateXf = new Set();
  const stEntry = zip['xl/styles.xml'];
  if (stEntry) {
    const st = new TextDecoder().decode(await inflateEntry(stEntry));
    const customDate = new Set();
    const nfRe = /<numFmt\b([^>]*?)\/?>/g;
    let nm;
    while ((nm = nfRe.exec(st))) {
      const id = _xmlAttr(nm[1], 'numFmtId'), code = _xmlAttr(nm[1], 'formatCode');
      if (id == null || code == null) continue;
      const bare = _unesc(code).replace(/"[^"]*"|\[[^\]]*\]|\\./g, '');
      if (/[dmyhs]/i.test(bare)) customDate.add(+id);
    }
    const isDateFmt = id => (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58) || customDate.has(id);
    const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(st);
    if (xfs) {
      const xfRe = /<xf\b([^>]*?)\/?>/g;
      let xm, idx = 0;
      while ((xm = xfRe.exec(xfs[1]))) { if (isDateFmt(+(_xmlAttr(xm[1], 'numFmtId') || 0))) dateXf.add(idx); idx++; }
    }
  }

  // Shared strings
  const ssXml = zip['xl/sharedStrings.xml'];
  const sharedStrings = [];
  if (ssXml) {
    const txt = new TextDecoder().decode(await inflateEntry(ssXml));
    const re = /<si[^>]*>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = re.exec(txt))) {
      // Extract all text inside <t>...</t>
      const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
      let tm, s = '';
      while ((tm = tRe.exec(m[1]))) s += tm[1];
      sharedStrings.push(s
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        .replace(/&quot;/g,'"').replace(/&apos;/g,"'"));
    }
  }

  // Find first sheet
  const wbXmlRaw = zip['xl/workbook.xml'];
  if (!wbXmlRaw) throw new Error('Không tìm thấy workbook.xml');
  const wbXml = new TextDecoder().decode(await inflateEntry(wbXmlRaw));
  // HM-02: sheet đầu tiên theo workbook.xml + rels (dự phòng sheet1.xml)
  let sheetPath = 'xl/worksheets/sheet1.xml';
  try {
    const first = /<sheet\b[^>]*>/.exec(wbXml);
    const rid = first && _xmlAttr(first[0], 'r:id');
    const relEntry = zip['xl/_rels/workbook.xml.rels'];
    if (rid && relEntry) {
      const rels = new TextDecoder().decode(await inflateEntry(relEntry));
      const re2 = /<Relationship\b[^>]*>/g;
      let rr;
      while ((rr = re2.exec(rels))) {
        if (_xmlAttr(rr[0], 'Id') === rid) {
          const tg = _xmlAttr(rr[0], 'Target');
          if (tg) sheetPath = tg.charAt(0) === '/' ? tg.slice(1) : 'xl/' + tg;
          break;
        }
      }
    }
  } catch (e) { console.warn('[HM-02] Không đọc được rels, dùng sheet1.xml:', e); }
  const shEntry = zip[sheetPath];
  if (!shEntry) throw new Error('Không tìm thấy ' + sheetPath);
  const shXml = new TextDecoder().decode(await inflateEntry(shEntry));

  // Parse rows
  const rows = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(shXml))) {
    const rowXml = rm[1];
    const cells = [];
    // HM-02: <c .../> tự đóng (ô trống có kiểu) không còn nuốt ô kế tiếp
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(rowXml))) {
      const colRef = (/\br="([A-Z]+)\d+"/.exec(cm[1]) || [])[1];
      if (!colRef) continue;
      const type = _xmlAttr(cm[1], 't') || '';
      const styleIdx = _xmlAttr(cm[1], 's');
      const inner = cm[2] || '';
      let val = '';
      if (type === 's') {
        const m = /<v>(\d+)<\/v>/.exec(inner);
        if (m) val = sharedStrings[+m[1]] || '';
      } else if (type === 'inlineStr') {
        const m = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        if (m) val = m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
      } else {
        const m = /<v>([\s\S]*?)<\/v>/.exec(inner);
        if (m) val = m[1];
        // ✅ FIX PRO-31-DATE: Date serial → ISO (YYYY-MM-DD) thay vì DD/MM/YYYY
        // Lý do: transformIPCAS() sẽ gọi smartDateToVN() lần 2 với _ipcasImportMode=true;
        // nếu đã là DD/MM thì ngày ambiguous (cả hai ≤12) sẽ bị hoán đổi sai.
        // ISO không mơ hồ → parseVNDate() xử lý đúng, không cần _ipcasImportMode.
        // Dải 25569 = 1970-01-01, ~80000 ≈ 2119 — bao gồm cả datetime (số thập phân)
        const num = parseFloat(val);
        if (type === 'd') {
          val = String(val).slice(0, 10);
        } else if (!isNaN(num) && num > 1 && num < 100000 && styleIdx != null && dateXf.has(+styleIdx)) {
          const _d = new Date((Math.floor(num) - 25569) * 86400 * 1000);
          val = isNaN(_d) ? val : `${_d.getUTCFullYear()}-${String(_d.getUTCMonth()+1).padStart(2,'0')}-${String(_d.getUTCDate()).padStart(2,'0')}`;
        }
      }
      const colIdx = colToIndex(colRef);
      cells[colIdx] = val;
    }
    // Pad empty cells
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = '';
    rows.push(cells);
  }
  return rows;
}
function colToIndex(c) {
  let n = 0;
  for (let i = 0; i < c.length; i++) n = n * 26 + (c.charCodeAt(i) - 64);
  return n - 1;
}
function excelSerialToVNDate(s) {
  // Excel: 1 = 1900-01-01 (accounting for Lotus 1900 bug: subtract 1 for dates > Feb 28 1900)
  const ms = (s - 25569) * 86400 * 1000; // 25569 = days between 1900-01-01 and 1970-01-01 (with bug)
  const d = new Date(ms);
  if (isNaN(d)) return String(s);
  return fmtVNDate(d);
}

// Minimal ZIP reader (store + deflate only)
function unzip(u8) {
  const files = {};
  // Find EOCD (End Of Central Directory)
  let eocdPos = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (u8[i] === 0x50 && u8[i+1] === 0x4b && u8[i+2] === 0x05 && u8[i+3] === 0x06) {
      eocdPos = i; break;
    }
  }
  if (eocdPos < 0) throw new Error('Không đọc được file ZIP');
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const nEntries = dv.getUint16(eocdPos + 10, true);
  const cdOffset = dv.getUint32(eocdPos + 16, true);
  let p = cdOffset;
  for (let i = 0; i < nEntries; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localHeaderOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen));
    // Read local header to find actual data offset
    const lh_nameLen = dv.getUint16(localHeaderOffset + 26, true);
    const lh_extraLen = dv.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + lh_nameLen + lh_extraLen;
    files[name] = { method, compSize, data: u8.subarray(dataStart, dataStart + compSize) };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
async function inflateEntry(entry) {
  if (entry.method === 0) return entry.data; // Stored
  if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt không hỗ trợ giải nén ZIP. Hãy dùng Chrome/Edge mới.');
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([entry.data]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  }
  throw new Error('Phương thức nén không hỗ trợ: ' + entry.method);
}

// ═══ Req 1: Đọc file .xls cổ (BIFF binary) — lazy-load SheetJS từ CDN ═══
let _sheetJSLoading = null;
/* P10 (T3/T4): TD.xlsrows — đọc Excel thành mảng dòng (đọc dense, nhánh cứu lãi suất theo mảng) + nén LZ, chạy được trong Web Worker tạo từ blob
   (mở bằng file:// vẫn chạy). Hàm thuần; người gọi tự chạy lại trên luồng chính khi worker lỗi. Nhúng nguyên văn + Node test. */
(function tdXlsRowsModule(root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var X = {};
  X.iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  X.DATE_MIN = 32874; // serial Excel của 01/01/1990: ô định dạng ngày nhỏ hơn ⇒ chắc chắn là số (lãi suất, tỉ lệ) bị định dạng ngày
  /* dateCell(v, SSF): ô SỐ mang định dạng ngày. Ngày thật ⇒ ISO (YYYY-MM-DD, tách từ serial — không phụ thuộc múi giờ; không mơ hồ ngày/tháng khi
     transformIPCAS chuẩn hoá lần 2). serial < 1990 ⇒ trả NGUYÊN số gốc (HM-03 / v13.7.7-LS#1: 8,5 hiện "08/01/1900" vẫn là 8.5 — bản cũ đọc qua
     cellDates trả "8", 0,1 trả "31"). */
  X.dateCell = function (v, SSF) {
    if (!isFinite(v) || v < X.DATE_MIN) return String(v);
    var p = SSF.parse_date_code(v);
    return p.y + '-' + ('0' + p.m).slice(-2) + '-' + ('0' + p.d).slice(-2);
  };
  /* ipcasRows(XLSX, buf, dense): tệp dư nợ IPCAS → mảng dòng chuỗi (mọi dòng của vùng dữ liệu, đủ cột, ô trống = ''). Tự dựng dòng từ ô
     (sheet_to_json luôn đổi ô số-định-dạng-ngày thành Date nên mất số gốc). dense=true: ô ở ws['!data'][r][c] — nhanh hơn, đầu ra y hệt. */
  X.ipcasRows = function (XLSX, buf, dense) {
    var wb = XLSX.read(buf, { type: 'array', cellDates: false, cellNF: true, cellText: false, raw: true, dense: !!dense });
    var sn = wb.SheetNames[0];
    if (!sn) throw new Error('File .xls không có sheet nào');
    var ws = wb.Sheets[sn], SSF = XLSX.SSF, D = ws['!data'];
    if (!ws['!ref']) return [];
    var rg = XLSX.utils.decode_range(ws['!ref']), out = [], cols = [];
    for (var C = rg.s.c; C <= rg.e.c; ++C) cols.push(XLSX.utils.encode_col(C));
    for (var R = rg.s.r; R <= rg.e.r; ++R) {
      var row = [], dr = D ? (D[R] || []) : null, rn = String(R + 1);
      for (var j = 0; j < cols.length; ++j) {
        var c = dr ? dr[rg.s.c + j] : ws[cols[j] + rn], v = c ? c.v : null;
        if (!c || c.t === undefined || c.t === 'z' || c.t === 'e' || v == null) row.push('');
        else if (c.t === 'n' && c.z && SSF.is_date(c.z)) row.push(X.dateCell(v, SSF));
        else if (v instanceof Date) row.push(isNaN(v) ? String(v) : v.getFullYear() < 1990 ? String(v.getDate()) : X.iso(v));
        else row.push(String(v).trim());
      }
      out.push(row);
    }
    return out;
  };
  /* aoa(XLSX, buf): trang đầu → mảng dòng giá trị thô (sao kê TSBĐ; ngày là Date) */
  X.aoa = function (XLSX, buf) {
    var wb = XLSX.read(buf, { type: 'array', cellDates: true, dense: true, cellText: false });
    var sh = wb.Sheets[wb.SheetNames[0]];
    if (!sh) throw new Error('Tệp không có sheet nào');
    return XLSX.utils.sheet_to_json(sh, { header: 1, raw: true, defval: '' });
  };
  /* head(XLSX, buf, o): chỉ đọc o.rows dòng đầu của trang đầu (nhận dạng loại tệp theo tiêu đề, xem trước). o.raw (mặc định true), o.defval. Trả { sheet, rows } */
  X.head = function (XLSX, buf, o) {
    o = o || {};
    var wb = XLSX.read(buf, { type: 'array', sheetRows: o.rows || 2, dense: true, cellText: false }), sn = wb.SheetNames[0], ws = wb.Sheets[sn];
    var opt = { header: 1, raw: o.raw !== false }; if (o.defval !== undefined) opt.defval = o.defval;
    return { sheet: sn || '', rows: ws ? XLSX.utils.sheet_to_json(ws, opt) : [] };
  };
  /* serve(self, XLSX, LZS): vòng nhận việc trong worker. Thư: {id, op:'ipcas'|'aoa'|'lz', buf|strs} ⇒ {id, ok, out|err} */
  X.serve = function (self, XLSX, LZS) {
    self.onmessage = function (e) {
      var m = e.data || {}, out;
      try {
        if (m.op === 'ipcas') out = X.ipcasRows(XLSX, m.buf, true);
        else if (m.op === 'aoa') out = X.aoa(XLSX, m.buf);
        else if (m.op === 'head') out = X.head(XLSX, m.buf, m.o);
        else if (m.op === 'lz') out = m.strs.map(function (s) { return LZS.compressToBase64(s); });
        else if (m.op === 'ping') out = !!XLSX && !!LZS;
        else throw new Error('op lạ: ' + m.op);
        self.postMessage({ id: m.id, ok: true, out: out });
      } catch (err) { self.postMessage({ id: m.id, ok: false, err: String(err && err.message || err) }); }
    };
  };
  /* workerSource(mã SheetJS, mã hàm tạo LZS): toàn bộ mã của worker (một blob, không tải gì từ mạng/đĩa) */
  X.workerSource = function (xlsxSrc, lzsFactorySrc) {
    return xlsxSrc + '\n;var LZS = (' + lzsFactorySrc + ')();\n(' + tdXlsRowsModule.toString() + ')(self);\nself.TD.xlsrows.serve(self, self.XLSX, LZS);\n';
  };
  /* client(makeWorker): gửi việc tới MỘT worker (tạo lần đầu dùng). Không tạo được / worker chết ⇒ mọi lời gọi bị từ chối (người gọi chạy luồng chính). */
  X.client = function (makeWorker) {
    var w = null, dead = false, seq = 0, wait = {}, C = { calls: 0, done: 0 };
    function failAll(msg) { dead = true; var ids = Object.keys(wait); ids.forEach(function (id) { var p = wait[id]; delete wait[id]; p.rej(new Error(msg)); }); try { if (w) w.terminate(); } catch (e) {} w = null; }
    function get() {
      if (w || dead) return w;
      try {
        w = makeWorker();
        w.onmessage = function (e) { var d = e.data || {}, p = wait[d.id]; if (!p) return; delete wait[d.id]; C.done++; if (d.ok) p.res(d.out); else p.rej(new Error(d.err)); };
        w.onerror = function (e) { try { e.preventDefault(); } catch (x) {} failAll('worker lỗi: ' + (e && e.message || '')); };
      } catch (e) { dead = true; w = null; }
      return w;
    }
    C.call = function (op, data, transfer) {
      var ww = get();
      if (!ww) return Promise.reject(new Error('no-worker'));
      return new Promise(function (res, rej) { var id = ++seq; wait[id] = { res: res, rej: rej }; data = data || {}; data.op = op; data.id = id; C.calls++; ww.postMessage(data, transfer || []); });
    };
    C.alive = function () { return !dead; };
    return C;
  };
  TD.xlsrows = X;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));
/* P10 (T3): MỘT Web Worker (blob từ mã SheetJS nhúng + LZS) đọc Excel/nén ngoài luồng chính — giao diện không đơ khi nhập. CSP chỉ giới hạn
   connect-src/img-src nên worker blob chạy được cả khi mở bằng file://. Không tạo được worker (trình duyệt chặn, thư viện hỏng) ⇒ chạy trên luồng chính như cũ. */
TD.xlsWorker = TD.xlsrows.client(function () {
  var xs = document.getElementById('td-vendor-xlsx');
  if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || !xs || !xs.textContent || typeof window.__TD_LZS_FACTORY !== 'function') throw new Error('no-worker');
  var url = URL.createObjectURL(new Blob([TD.xlsrows.workerSource(xs.textContent, window.__TD_LZS_FACTORY.toString())], { type: 'text/javascript' }));
  return new Worker(url);
});
TD.xlsWorker.stat = { worker: 0, main: 0 };
/* TD.readRows(op, buf, mainFn): chạy op ('ipcas'|'aoa') trong worker; worker lỗi/không có ⇒ mainFn() trên luồng chính (cùng hàm thuần ⇒ cùng kết quả) */
TD.readRows = async function (op, buf, mainFn, extra) {
  if (TD.xlsWorker.alive() && !window.__TD_NO_WORKER) {
    try { const out = await TD.xlsWorker.call(op, Object.assign({ buf: buf }, extra)); /* sao chép, không chuyển quyền ⇒ buf còn dùng khi phải chạy luồng chính */ TD.xlsWorker.stat.worker++; return out; }
    catch (e) { if (!/no-worker/.test(e && e.message)) console.warn('[P10] worker đọc Excel lỗi, chạy luồng chính:', e && e.message); }
  }
  TD.xlsWorker.stat.main++;
  return mainFn();
};
async function loadSheetJS() {
  /* OFFLINE: XLSX bundled inline */
  if (typeof XLSX === 'undefined' && typeof window.TD_ensureVendors === 'function') {
    try { await window.TD_ensureVendors(); } catch (e) { console.warn('[HM-02] TD_ensureVendors lỗi:', e); }
  }
  if (typeof XLSX !== 'undefined') return XLSX;
  throw new Error('XLSX không có sẵn (bundle offline lỗi)');
}
async function parseXLS_legacy(file) {
  const XLSX = await loadSheetJS();
  const buf = await (file.__tdBuf || file.arrayBuffer()); // P10 (T10): Trung tâm nhập đã đọc sẵn (nhận dạng + SHA-256) ⇒ dùng lại
  /* P10 (T3/T4): đọc dense trong worker; nhánh cứu lãi suất viết lại theo mảng (TD.xlsrows.ipcasRows — đầu ra y hệt bản cũ trên 11 kỳ thật,
     riêng ô lãi suất lẻ bị định dạng ngày nay giữ đủ thập phân). Ngày ra ISO (YYYY-MM-DD) như cũ để transformIPCAS không hoán ngày/tháng. */
  return TD.readRows('ipcas', buf, () => TD.xlsrows.ipcasRows(XLSX, buf, true));
}

// Transform raw IPCAS rows (with header at row 0) to our 21-column DATA.qltd format
/* PATCH v13.8.1 (2026-06-15): clearRateManualOnStale — gỡ cờ _rateManual của
   các dòng từng bị migrate cũ ghi đè (stale/auto-healed/overflow), để lần
   Nhập IPCAS kế tiếp sẽ ghi đè L/S đúng từ cột `sprd`. Idempotent. */
window.clearRateManualOnStale = function(){
  try {
    if (!window.DATA || !Array.isArray(DATA.qltd)) return 0;
    var n = 0;
    DATA.qltd.forEach(function(r){
      if (!r) return;
      if (r._rateManual && (r._rateStale || r._rateAutoHealed ||
          r._rateOverflowFixed || r._rateOverflowCleared || r._derivedFromIntAmt)) {
        delete r._rateManual; n++;
      }
    });
    if (n > 0) console.info('[v13.8.1] Đã gỡ cờ _rateManual cho ' + n +
      ' dòng L/S nghi sai — Nhập IPCAS để ghi đè từ cột sprd.');
    return n;
  } catch(e){ console.warn('clearRateManualOnStale', e); return 0; }
};
try { setTimeout(function(){ try { window.clearRateManualOnStale(); } catch(_){} }, 1500); } catch(_){}


/* PATCH v13.8.1: console helper — đối chiếu L/S 1 KH với raw IPCAS đã import.
   Dùng: TDDiffRate('3201-000000000') hoặc TDDiffRate('(đã ẩn)') */
window.TDDiffRate = function(q){
  try {
    if (!window.DATA || !Array.isArray(DATA.qltd)) { console.warn('DATA.qltd chưa load'); return; }
    var k = String(q||'').toLowerCase().trim();
    var rows = DATA.qltd.filter(function(r){
      return String(r[0]||'').toLowerCase().includes(k) ||
             String(r[1]||'').toLowerCase().includes(k) ||
             String(r[2]||'').toLowerCase().includes(k) ||
             String(r[20]||'').toLowerCase().includes(k);
    });
    if (!rows.length) { console.warn('Không tìm thấy KH:', q); return; }
    var view = rows.map(function(r){
      var sprdParsed = (window.HSVRate && r._sprdRaw !== undefined)
        ? window.HSVRate.parseSprd(r._sprdRaw) : '';
      var legacySum = (window.HSVRate && r._intrtRaw !== undefined && r._sprdRaw !== undefined)
        ? (window.HSVRate.coercePercent(r._intrtRaw) + window.HSVRate.coercePercent(r._sprdRaw)) : '';
      return {
        brcd: r[0], custnm: r[1], apprseq: r[2], dsbsseq: r[20],
        duNo: r[11], 'r[8] hiện': r[8],
        intrt_raw: r._intrtRaw, sprd_raw: r._sprdRaw,
        sprd_parsed: sprdParsed,
        legacy_sum_intrt_plus_sprd: legacySum,
        _rateManual: !!r._rateManual,
        _rateStale: !!r._rateStale,
        _autoHealed: !!r._rateAutoHealed,
        _overflowFixed: !!r._rateOverflowFixed
      };
    });
    console.info('[TDDiffRate] ' + rows.length + ' dòng cho "' + q + '":');
    console.table(view);
    return view;
  } catch(e){ console.error('TDDiffRate', e); }
};

function transformIPCAS(rows) {
  if (rows.length < 2) return [];
  window._ipcasImportMode = true; // ✅ PRO-31: IPCAS dùng MM/DD/YYYY
  const hdr = rows[0].map(h => String(h || '').trim().toLowerCase());
  const col = name => hdr.indexOf(name.toLowerCase());
  // Map expected IPCAS column names
  // Helper: tìm cột đầu tiên có mặt trong header (theo thứ tự ưu tiên)
  const firstCol = (...names) => {
    for (const n of names) { const i = col(n); if (i >= 0) return i; }
    return -1;
  };
  const c = {
    brcd: col('brcd'),
    custnm: col('custnm'),
    apprseq: col('apprseq'),
    apprdt: col('apprdt'),
    apprmatdt: col('apprmatdt'),
    appramt: col('appramt'),
    dsbsseq: col('dsbsseq'),
    dsbsdt: col('dsbsdt'),
    dsbsmatdt: col('dsbsmatdt'),
    // ✅ FIX v13.7.9 (2026-06-15): msit80 Agribank chỉ có cột `sprd` chứa lãi suất thật.
    // - Bỏ alias 'intrt','int_rate' khỏi nhánh intrt (Agribank không dùng — sẽ bắt nhầm cột rỗng/0).
    // - Bỏ alias 'rate','interest_rate' khỏi nhánh sprd (tránh bắt nhầm cột tổng ở file khác).
    intrt:   firstCol('pnintrt','base_intrt','base_rate','lai_suat_san','lai_san','interest_rate_base'),
    sprd:    firstCol('sprd','spread','intrt_sprd','intrtsprd','int_sprd','lai_suat_chuan','lschuan','lai_suat','lai suat','l/s','bien_do','biendo','margin'),
    dsbsamt: col('dsbsamt'),
    rpmtamt: col('rpmtamt'),
    intamt: col('intamt'),
    dsbsbal: col('dsbsbal'),
    ofcnm: col('ofcnm'),
    lntpcd: col('lntpcd'),
    addr1: col('addr1'),
    commmn: col('commmn'),
    fndprpstpcd: col('fndprpstpcd'),
    trctnm: col('trctnm'),
    aqccdfin: col('aqccdfin'),
    lstintchrgprd: col('lstintchrgprd'),
    nxtrpmtschddt: col('nxtrpmtschddt'), // r[25] cột AO — ngày trả gốc kế tiếp (phân kỳ)
    lstrpmtdt: col('lstrpmtdt'),          // r[26] cột AM — ngày trả nợ cuối cùng
  };
  if (c.brcd < 0 || c.custnm < 0) throw new Error('File không có cột brcd/custnm. Đây có phải file msit80 từ IPCAS?');
  // ✅ FIX v13.7.9: log rõ nguồn lãi suất (Agribank msit80 chỉ có cột `sprd`)
  if (c.sprd >= 0 && c.intrt >= 0) {
    console.info('[IMPORT] ✅ L/S% lấy từ cột `' + hdr[c.sprd] + '` (msit80 Agribank, sprd-only). INTRT `' + hdr[c.intrt] + '` chỉ để tham chiếu, KHÔNG cộng. Đã khóa chế độ SPRD-only để tránh cộng nhầm.');
  } else if (c.sprd >= 0) {
    console.info('[IMPORT] ✅ L/S% lấy thẳng từ cột `' + hdr[c.sprd] + '` (file không có cột intrt riêng — đúng với chuẩn msit80 Agribank).');
  } else {
    var __sprdMsg = '⚠ Không tìm thấy cột lãi suất (sprd/spread/lai_suat_chuan/...) trong file IPCAS. L/S sẽ trống cho mọi dòng.';
    console.error('[IMPORT]', __sprdMsg);
    try { if (typeof showToast === 'function') showToast(__sprdMsg, 'red'); } catch(__e){}
  }



  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[c.custnm] || !String(r[c.custnm]).trim()) continue;
    const addr = (r[c.addr1] || '') + (r[c.commmn] && !String(r[c.addr1]||'').includes(r[c.commmn]) ? ', ' + r[c.commmn] : '');
    // ✅ FIX: Chuẩn hoá TẤT CẢ cột date về DD/MM/YYYY qua smartDateToVN
    const apprDateVN  = smartDateToVN(String(r[c.apprdt]    || '').trim());
    const dsbsDtVN    = smartDateToVN(String(r[c.dsbsdt]    || '').trim());
    const dsbsMatVN   = smartDateToVN(String(r[c.dsbsmatdt] || '').trim());
    const lstIntVN    = smartDateToVN(String(r[c.lstintchrgprd] || '').trim());
    out.push([
      String(r[c.brcd] || '').trim(),
      String(r[c.custnm] || '').trim(),
      String(r[c.apprseq] || '').trim(),
      apprDateVN,                              // r[3] Ngày HĐ
      apprDateVN,                              // r[4] Ngày HĐ (duplicate dùng trong filter)
      Number(r[c.appramt]) || 0,
      dsbsDtVN,                                // r[6] Ngày giải ngân
      dsbsMatVN,                               // r[7] Ngày đến hạn
      // ✅ ROOT FIX v13.8.8: L/S% = SPRD-only cho msit80 Agribank.
      // Tuyệt đối không cộng pnintrt/base INTRT với SPRD; pnintrt chỉ để đối chiếu.
      (function(){
        var rawSprd  = (c.sprd  >= 0) ? r[c.sprd]  : '';
        return (window.HSVRate && window.HSVRate.parseSprd)
          ? window.HSVRate.parseSprd(rawSprd)
          : rawSprd;
      })(),

      Number(r[c.dsbsamt]) || 0,
      Number(r[c.intamt]) || 0,
      Number(r[c.dsbsbal]) || 0,
      String(r[c.ofcnm] || '').trim(),
      normalizeLntpcd(r[c.lntpcd]),   // ✅ PRO-31: chuẩn hoá mã lntpcd
      addr.trim(),
      String(r[c.fndprpstpcd] || '').trim(),
      Number(r[c.rpmtamt]) || 0,
      String(r[c.trctnm] || '').trim(),
      String(r[c.aqccdfin] || 'Nhóm 1').trim(),
      String(r[c.apprseq] || '').trim(),
      String(r[c.dsbsseq] || '').trim(),
      '',  // r[21] Số TK — sẽ điền bằng applyTKSTTMapping
      '',  // r[22] Số tập — sẽ điền bằng applyTKSTTMapping
      lstIntVN,                                // r[23] Ngày thu lãi cuối
      smartDateToVN(String(r[c.apprmatdt] || '').trim()), // r[24] Ngày đến hạn HĐTD (apprmatdt)
      smartDateToVN(String(r[c.nxtrpmtschddt] || '').trim()), // r[25] Ngày trả gốc kế tiếp (nxtrpmtschddt/AO)
      smartDateToVN(String(r[c.lstrpmtdt] || '').trim()),     // r[26] Ngày trả nợ cuối (lstrpmtdt/AM)
    ]);
    try {
      if (window.HSVRate && window.HSVRate.fingerprint) {
        var __lastRow = out[out.length - 1];
        var __rawIntrt = (c.intrt >= 0) ? r[c.intrt] : '';
        var __rawSprd  = (c.sprd  >= 0) ? r[c.sprd]  : '';
        window.HSVRate.fingerprint(__lastRow, [__rawIntrt, __rawSprd], 'intrt+sprd'); // lưu raw để audit; L/S vẫn lấy SPRD-only
      }
    } catch(__e){}
  }
  window._ipcasImportMode = false;
  // ── v13.7.6: validate L/S sau import ──
  try {
    var __valid = 0, __zero = 0, __empty = 0, __bad = 0;
    out.forEach(function(__r){
      var __v = __r[8];
      if (__v === '' || __v === null || __v === undefined) __empty++;
      else if (__v === 0) { __zero++; __valid++; }
      else if ((window.HSVRate && window.HSVRate.isPlausible && window.HSVRate.isPlausible(__v)) || (typeof __v === 'number' && isFinite(__v) && __v >= 0 && __v <= 50)) __valid++;
      else __bad++;
    });
    var __pctOk = out.length ? (__valid / out.length) : 0;
    if (out.length >= 20 && __pctOk < 0.70) {
      var __msg = '⚠ Chỉ ' + Math.round(__pctOk*100) + '% dòng có L/S hợp lệ (' + __valid + '/' + out.length + '). Kiểm tra cột "sprd" trong file IPCAS.';
      try { if (typeof showToast === 'function') showToast(__msg, 'orange'); } catch(__e){}
      console.warn('[IMPORT][L/S]', __msg, { valid:__valid, zero:__zero, empty:__empty, bad:__bad, total:out.length, intrtColumn:(c.intrt>=0?hdr[c.intrt]:''), sprdColumn:(c.sprd>=0?hdr[c.sprd]:'') });
    } else {
      console.info('[IMPORT][L/S] OK ' + __valid + '/' + out.length + ' dòng L/S hợp lệ (SPRD-only).', { zero:__zero, empty:__empty, bad:__bad, intrtColumn:(c.intrt>=0?hdr[c.intrt]:''), sprdColumn:(c.sprd>=0?hdr[c.sprd]:'') });
    }
  } catch(__e){ console.warn('[IMPORT][L/S] validate failed', __e); }
  // ── v13.7.9: cảnh báo riêng cho dòng L/S=0 nhưng dư nợ>0 (bất thường với Agribank) ──
  try {
    var __zeroWithBal = out.filter(function(__r){
      var __v = __r[8];
      var __bal = Number(__r[11]) || 0;
      return (__v === 0 || __v === '0') && __bal > 0;
    }).length;
    if (__zeroWithBal > 0) {
      var __msg2 = '⚠ ' + __zeroWithBal + ' dòng có L/S = 0% nhưng còn dư nợ — bất thường với chuẩn IPCAS Agribank.';
      console.warn('[IMPORT][L/S]', __msg2);
      try { if (typeof showToast === 'function') showToast(__msg2, 'orange'); } catch(__e){}
    }
  } catch(__e){}
  // ── v13.7.9: diagnostic 5 dòng đầu (debug mapping cột) ──
  try {
    if (out.length && typeof console.table === 'function') {
      var __sample = out.slice(0, 5).map(function(__r, __i){
        return {
          custnm: __r[1],
          apprseq: __r[2],
          dsbsseq: __r[20],
          dsbsbal: __r[11],
          intrt_raw: (rows[__i+1] && c.intrt >= 0) ? rows[__i+1][c.intrt] : '(no col)',
          sprd_raw:  (rows[__i+1] && c.sprd  >= 0) ? rows[__i+1][c.sprd]  : '(no col)',
          'r[8]_final': __r[8]
        };
      });
      console.info('[IMPORT][L/S] Diagnostic — 5 dòng đầu:');
      console.table(__sample);
    }
  } catch(__e){}
  console.info('[IMPORT] ✅ Hoàn thành: ' + out.length + ' bản ghi. Nguồn L/S: SPRD-only.');
  return out;
}

function previewImport(rows) {
  // Delegate to sync panel
  syncInitPanel(rows);
  $('import-preview').style.display = 'block';
  syncUpdateStats();
}

/* ═══════════════════════════════════════════════════════════════
   SYNC CHECK — Kiểm tra đồng bộ dữ liệu nguồn IPCAS
   ═══════════════════════════════════════════════════════════════ */
let _syncAllRows    = [];   // toàn bộ rows đã transform
let _syncExcluded   = new Set();  // indices bị loại (trong _syncAllRows)
let _syncActiveTab  = 'all';

// Phân loại từng row
function syncClassify(r) {
  const dn    = Number(r[11]) || 0;
  const loai  = String(r[13] || '').toLowerCase();
  const isTChi = /thấu\s*chi/i.test(loai);
  if (dn < 0)          return 'neg';
  if (dn === 0 && isTChi) return 'thauchiZ';
  if (dn === 0)        return 'zero';
  return 'active';
}

function syncInitPanel(rows) {
  _syncAllRows  = rows;
  _syncExcluded = new Set();
  _syncActiveTab = 'all';

  // Phát hiện trùng HĐTD (apprseq)
  const hdtdCount = {};
  rows.forEach((r, i) => {
    const k = String(r[2] || '').trim();
    if (!k) return;
    if (!hdtdCount[k]) hdtdCount[k] = [];
    hdtdCount[k].push(i);
  });
  // Đánh dấu trùng (giữ bản đầu tiên, flag các bản sau)
  window._syncDupSet = new Set();
  Object.values(hdtdCount).forEach(idxArr => {
    if (idxArr.length > 1) idxArr.slice(1).forEach(i => window._syncDupSet.add(i));
  });

  // Populate CBTD filter
  const cbtds = window.TD_SXCB.sortNames([...new Set(rows.map(r => r[12]).filter(Boolean))]);
  const sel = $('sync-filter-cbtd');
  sel.innerHTML = '<option value="">— Tất cả CBTD —</option>' +
    cbtds.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  // Mặc định: tự động loại tất cả dư nợ = 0 (kể cả thấu chi = 0)
  rows.forEach((r, i) => {
    const cls = syncClassify(r);
    if (cls === 'zero' || cls === 'thauchiZ') _syncExcluded.add(i);
  });

  // Render KPI
  syncUpdateKPI();
  syncSwitchTab('all');

  $('import-sync-panel').style.display = 'block';
}

function syncUpdateKPI() {
  const rows = _syncAllRows;
  const excl = _syncExcluded;
  const total    = rows.length;
  const zeroCnt  = rows.filter((r,i) => !excl.has(i) && syncClassify(r) === 'zero').length;
  const zeroExcl = [...excl].filter(i => syncClassify(rows[i]) === 'zero').length;
  const tcZeroCnt= rows.filter((r,i) => !excl.has(i) && syncClassify(rows[i]) === 'thauchiZ').length;
  const negCnt   = rows.filter((r,i) => !excl.has(i) && syncClassify(rows[i]) === 'neg').length;
  const dupCnt   = [...(window._syncDupSet||[])].filter(i => !excl.has(i)).length;
  const activeCnt= rows.filter((r,i) => !excl.has(i) && syncClassify(r) === 'active').length;
  const totalKept= total - excl.size;
  const totDN    = rows.filter((_,i)=>!excl.has(i)).reduce((s,r)=>s+(Number(r[11])||0),0);

  $('stc-all').textContent       = fmtNum(totalKept);
  $('stc-active').textContent    = fmtNum(activeCnt);
  $('stc-zero').textContent      = fmtNum(zeroCnt);
  $('stc-thauchiZ').textContent  = fmtNum(tcZeroCnt);
  $('stc-neg').textContent       = fmtNum(negCnt);
  $('stc-dup').textContent       = fmtNum(dupCnt);

  // Màu warn/red cho tabs
  ['stc-zero','stc-thauchiZ'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.className = 'tc ' + (parseInt(el.textContent,10) > 0 ? 'warn' : '');
  });
  ['stc-neg','stc-dup'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.className = 'tc ' + (parseInt(el.textContent,10) > 0 ? 'red' : '');
  });

  $('sync-kpi-row').innerHTML = `
    <div class="sync-kpi"><div class="sk-lbl">Tổng trong file</div><div class="sk-val">${fmtNum(total)}</div><div class="sk-sub">bản ghi gốc</div></div>
    <div class="sync-kpi"><div class="sk-lbl">Sẽ nhập</div><div class="sk-val" style="color:var(--green-dark)">${fmtNum(totalKept)}</div><div class="sk-sub">sau khi lọc</div></div>
    <div class="sync-kpi warn"><div class="sk-lbl">Dư nợ = 0</div><div class="sk-val" style="color:var(--orange)">${fmtNum(zeroCnt + tcZeroCnt)}</div><div class="sk-sub">${zeroCnt} thường + ${tcZeroCnt} thấu chi</div></div>
    <div class="sync-kpi ${negCnt>0?'danger':''}"><div class="sk-lbl">Âm / lỗi</div><div class="sk-val" style="color:${negCnt>0?'var(--red)':'var(--gray-500)'}">${fmtNum(negCnt)}</div><div class="sk-sub">cần kiểm tra</div></div>
    <div class="sync-kpi ${dupCnt>0?'danger':'info'}"><div class="sk-lbl">Trùng HĐTD</div><div class="sk-val" style="color:${dupCnt>0?'var(--red)':'var(--blue)'}">${fmtNum(dupCnt)}</div><div class="sk-sub">bản trùng (giữ 1)</div></div>
    <div class="sync-kpi info"><div class="sk-lbl">Tổng dư nợ</div><div class="sk-val" style="font-size:13px;color:var(--green-dark)">${fmtMoneyShort(totDN)}</div><div class="sk-sub">${fmtMoney(totDN)} đ</div></div>
    ${excl.size>0?`<div class="sync-kpi danger"><div class="sk-lbl">Đã loại</div><div class="sk-val" style="color:var(--red)">${fmtNum(excl.size)}</div><div class="sk-sub">bản ghi</div></div>`:''}
  `;
  syncUpdateStats();
}

const SYNC_TAB_NOTES = {
  all:      { cls:'green', txt:'📋 Toàn bộ bản ghi sau khi lọc (đã trừ các bản đã loại).' },
  active:   { cls:'green', txt:'✅ Các khoản vay còn dư nợ thực tế — đây là dữ liệu quan trọng cần nhập.' },
  zero:     { cls:'', txt:'⚠️ Dư nợ = 0: Đây thường là khoản đã tất toán từ IPCAS. Nên loại bỏ để tránh làm nhiễu thống kê. <b>Kiểm tra kỹ trước khi loại</b> — một số khoản thấu chi hợp lệ cũng về 0.' },
  thauchiZ: { cls:'', txt:'🔵 Thấu chi dư nợ = 0: Khách hàng có hạn mức thấu chi nhưng chưa sử dụng, hoặc đã hoàn trả hết. Thường nên loại bỏ trừ khi cần theo dõi hạn mức.' },
  neg:      { cls:'red', txt:'🔴 Dư nợ âm: Có thể là lỗi dữ liệu từ IPCAS (khấu trừ thừa, hoặc format số sai). <b>Cần kiểm tra bắt buộc.</b>' },
  dup:      { cls:'red', txt:'🔁 Trùng số HĐTD: Bản ghi đầu tiên được giữ, các bản sau đây là trùng lặp. Thường do IPCAS xuất nhiều lần giải ngân cho cùng 1 HĐTD — kiểm tra trước khi loại.' },
};

function syncSwitchTab(tab) {
  _syncActiveTab = tab;
  $$('.sync-tab').forEach(t => t.classList.remove('active'));
  $(`stab-${tab}`)?.classList.add('active');
  $('sync-search').value = '';
  const note = SYNC_TAB_NOTES[tab];
  const noteEl = $('sync-tab-note');
  if (note) {
    noteEl.style.display = 'block';
    noteEl.className = 'sync-note ' + (note.cls || '');
    noteEl.innerHTML = note.txt;
  } else {
    noteEl.style.display = 'none';
  }
  syncRenderTable();
}

function syncGetTabRows() {
  const tab = _syncActiveTab;
  const excl = _syncExcluded;
  const dupSet = window._syncDupSet || new Set();
  return _syncAllRows.map((r, i) => ({ r, i })).filter(({ r, i }) => {
    if (tab !== 'all' && excl.has(i)) return false;
    if (tab === 'all')     return !excl.has(i);
    if (tab === 'active')  return !excl.has(i) && syncClassify(r) === 'active';
    if (tab === 'zero')    return !excl.has(i) && syncClassify(r) === 'zero';
    if (tab === 'thauchiZ')return !excl.has(i) && syncClassify(r) === 'thauchiZ';
    if (tab === 'neg')     return !excl.has(i) && syncClassify(r) === 'neg';
    if (tab === 'dup')     return !excl.has(i) && dupSet.has(i);
    return false;
  });
}

function syncRenderTable() {
  const q      = ($('sync-search')?.value || '').toLowerCase();
  const cbtd   = $('sync-filter-cbtd')?.value || '';
  const loaivay= $('sync-filter-loaivay')?.value || '';

  let items = syncGetTabRows();
  if (q)       items = items.filter(({r}) => [r[0],fmtMaKH(r[0]),r[1],r[2]].some(v => String(v||'').toLowerCase().includes(q)));
  if (cbtd)    items = items.filter(({r}) => r[12] === cbtd);
  if (loaivay) items = items.filter(({r}) => String(r[13]||'').toLowerCase().includes(loaivay));

  $('sync-count-label').textContent = `${fmtNum(items.length)} bản ghi`;
  const dupSet = window._syncDupSet || new Set();

  const nhomChip = n => {
    const cls = {'Nhóm 1':'chip-green','Nhóm 2':'chip-blue','Nhóm 3':'chip-orange','Nhóm 4':'chip-red','Nhóm 5':'chip-red'};
    return `<span class="chip ${cls[n]||'chip-gray'}" style="font-size:9px">${escapeHtml(n||'N1')}</span>`;
  };
  const dnCell = dn => {
    if (dn < 0)  return `<td class="num neg">${fmtMoney(dn)}</td>`;
    if (dn === 0) return `<td class="num zero">—</td>`;
    return `<td class="num">${fmtMoney(dn)}</td>`;
  };
  const laiCell = v => v > 0
    ? `<td class="num" style="color:var(--red)">${fmtMoney(v)}</td>`
    : `<td class="num zero">—</td>`;

  $('sync-tbody').innerHTML = items.slice(0,500).map(({r, i}) => {
    const cls    = syncClassify(r);
    const isDup  = dupSet.has(i);
    const bgStyle = cls==='neg' ? 'background:#fff0ee!important'
                  : cls==='zero'||cls==='thauchiZ' ? 'background:#fffbf0!important'
                  : isDup ? 'background:#f0f4ff!important' : '';
    return `<tr style="${bgStyle}">
      <td style="text-align:center"><input type="checkbox" class="sync-row-chk" data-idx="${i}" ${_syncExcluded.has(i)?'checked disabled':''}></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;padding-left:10px">
        <strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong>
        ${isDup?'<span class="chip chip-red" style="font-size:8px;margin-left:3px">DUP</span>':''}
        ${cls==='neg'?'<span class="chip chip-red" style="font-size:8px;margin-left:3px">ÂM</span>':''}
      </td>
      <td class="copy-cell" onclick="copyCellValue(this,event)" title="Click để copy MÃ KH">${escapeHtml(fmtMaKH(r[0]))}</td>
      <td style="font-family:monospace;font-size:10px">${escapeHtml(r[2])}</td>
      <td><span class="chip chip-gray" style="font-size:9px">${escapeHtml(r[13]||'')}</span></td>
      ${dnCell(Number(r[11])||0)}
      ${laiCell(Number(r[10])||0)}
      <td class="date" style="color:var(--blue);font-size:10px">${escapeHtml(r[7])}</td>
      <td style="font-size:10.5px">${escapeHtml(r[12])}</td>
      <td>${nhomChip(r[18])}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--gray-500)">Không có bản ghi nào trong tab này</td></tr>`;
}

function syncToggleAll(chk) {
  const items = syncGetTabRows();
  const allIdxs = items.map(o => o.i);
  if (chk.checked) {
    allIdxs.forEach(i => _syncExcluded.add(i));
  } else {
    allIdxs.forEach(i => _syncExcluded.delete(i));
  }
  syncUpdateKPI();
  syncRenderTable();
}

function syncExcludeChecked() {
  const checked = $$('.sync-row-chk:checked:not(:disabled)');
  if (!checked.length) { showToast('⚠ Chưa chọn bản ghi nào', 'gold'); return; }
  checked.forEach(chk => _syncExcluded.add(parseInt(chk.dataset.idx)));
  syncUpdateKPI();
  syncRenderTable();
  showToast(`🗑️ Đã loại ${checked.length} bản ghi`, 'gold');
}

function syncExcludeTab() {
  const items = syncGetTabRows();
  if (!items.length) { showToast('⚠ Tab này không có bản ghi nào', 'gold'); return; }
  const tab = _syncActiveTab;
  if (tab === 'all' || tab === 'active') {
    if (!confirm(`Loại tất cả ${items.length} bản ghi trong tab "${tab}"?\nThao tác này sẽ loại cả bản ghi có dư nợ!`)) return;
  }
  items.forEach(({i}) => _syncExcluded.add(i));
  syncUpdateKPI();
  syncRenderTable();
  showToast(`⚡ Đã loại ${items.length} bản ghi trong tab này`, 'gold');
}

function syncExcludeZeroAll() {
  let cnt = 0;
  _syncAllRows.forEach((r, i) => {
    const cls = syncClassify(r);
    if ((cls === 'zero' || cls === 'thauchiZ') && !_syncExcluded.has(i)) {
      _syncExcluded.add(i); cnt++;
    }
  });
  syncUpdateKPI();
  syncRenderTable();
  showToast(`🧹 Đã loại ${cnt} bản ghi dư nợ = 0 (kể cả thấu chi)`, 'gold');
}

function syncRestoreAll() {
  if (!_syncExcluded.size) { showToast('ℹ Không có bản ghi bị loại', 'gold'); return; }
  const n = _syncExcluded.size;
  _syncExcluded.clear();
  syncUpdateKPI();
  syncRenderTable();
  showToast(`↺ Đã khôi phục ${n} bản ghi`, 'green');
}

function syncUpdateStats() {
  const kept = _syncAllRows.filter((_, i) => !_syncExcluded.has(i));
  const totDN  = kept.reduce((s, r) => s + (Number(r[11]) || 0), 0);
  const totLai = kept.reduce((s, r) => s + (Number(r[10]) || 0), 0);
  const cbtds  = new Set(kept.map(r => r[12]).filter(Boolean)).size;
  const excl   = _syncExcluded.size;
  $('import-stats').innerHTML = `
    <b>📊 Thống kê sau khi lọc (sẽ nhập):</b>
    &nbsp;•&nbsp;Bản ghi sẽ nhập: <b style="color:var(--green-dark)">${fmtNum(kept.length)}</b>
    &nbsp;•&nbsp;Đã loại: <b style="color:${excl>0?'var(--red)':'var(--gray-500)'}">${fmtNum(excl)}</b>
    &nbsp;•&nbsp;Tổng dư nợ: <b>${fmtMoney(totDN)} đ</b> (${fmtMoneyShort(totDN)})
    &nbsp;•&nbsp;Tổng lãi: <b>${fmtMoney(totLai)} đ</b>
    &nbsp;•&nbsp;Số CBTD: <b>${cbtds}</b>
  `;
  $('sync-excluded-info').textContent = excl > 0 ? `⚠ ${fmtNum(excl)} bản ghi sẽ bị loại khỏi lần nhập này` : '';
  const btn = $('btn-do-import');
  if (btn) {
    btn.disabled = kept.length === 0;
    btn.style.opacity = kept.length === 0 ? '.5' : '1';
    btn.textContent = `✅ Xác nhận nhập (${fmtNum(kept.length)} bản ghi)`;
  }
}
function doImport() {
  if (!pendingImportRows) return;
  // Lấy rows sau khi đã loại các bản ghi bị mark exclude
  const finalRows = pendingImportRows.filter((_, i) => !_syncExcluded.has(i));
  const excludedCount = _syncExcluded.size;
  if (!finalRows.length) { alert('Không còn bản ghi nào để nhập sau khi lọc!'); return; }
  const msg = excludedCount > 0
    ? `✅ Xác nhận nhập ${fmtNum(finalRows.length)} bản ghi?\n` +
      `(Đã loại ${fmtNum(excludedCount)} bản ghi dư nợ = 0 / trùng / âm)\n\n` +
      `Dữ liệu hiện tại (${fmtNum(DATA.qltd.length)} bản ghi) sẽ bị THAY THẾ hoàn toàn.`
    : `✅ Xác nhận nhập ${fmtNum(finalRows.length)} bản ghi?\n` +
      `Dữ liệu hiện tại (${fmtNum(DATA.qltd.length)} bản ghi) sẽ bị THAY THẾ hoàn toàn.`;
  if (!confirm(msg)) return;
  if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04: người dùng đã xác nhận thay thế toàn bộ
  
  // ✅ PRO-35 FIX: Lưu pending data + show save location modal
  window._pendingImportFinalRows = finalRows;
  window._pendingImportExcludedCount = excludedCount;
  
  // Show modal asking where to save
  showImportSaveLocationModal();
}

// ✅ PRO-35 NEW: Modal để hỏi user lưu IPCAS vào đâu
function showImportSaveLocationModal() {
  const html = `
    <div class="modal-overlay open" id="modal-import-save-location">
      <div class="modal" style="max-width:500px">
        <div class="modal-header">
          <h2>💾 Lưu IPCAS Data Vào Đâu?</h2>
          <button class="modal-close" onclick="closeModal('modal-import-save-location')">✕</button>
        </div>
        <div class="modal-body">
          <div style="background:var(--blue-pale); border-left:3px solid var(--blue); padding:10px; border-radius:6px; margin-bottom:15px; font-size:11px">
            <strong>💡 Chọn cách lưu dữ liệu IPCAS:</strong>
            <div style="margin-top:5px; color:var(--gray-700)">
              Bạn vừa nhập dữ liệu từ IPCAS. Hãy chọn cách lưu trữ:
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:10px">
            
            <!-- Option 1: Data Archive -->
            <button class="btn" onclick="completeImportToDataArchive()" style="background:linear-gradient(135deg, var(--green-pale), #fff); border:2px solid var(--green-main); padding:15px; text-align:left; border-radius:8px; cursor:pointer; transition:all .2s">
              <div style="font-weight:700; color:var(--green-dark); font-size:12px">💾 Lưu Trữ Dữ Liệu (Replace All)</div>
              <div style="font-size:11px; color:var(--gray-700); margin-top:5px">
                ✅ Thay thế TOÀN BỘ dữ liệu hiện tại bằng IPCAS mới<br>
                ✅ Đồng bộ 100% với file IPCAS<br>
                ✅ Lưu snapshot vào Data Archive<br>
                ✅ Tự tạo thêm 1 mốc trong Lưu trữ Hàng ngày (1 mốc/ngày, nhập lại trong ngày sẽ ghi đè)<br>
                ✅ Phù hợp: Sync định kỳ từ IPCAS
              </div>
            </button>

            <!-- Option 2: Report Archive -->
            <button class="btn" onclick="completeImportToReportArchive()" style="background:linear-gradient(135deg, var(--orange-pale), #fff); border:2px solid var(--orange); padding:15px; text-align:left; border-radius:8px; cursor:pointer; transition:all .2s">
              <div style="font-weight:700; color:var(--orange); font-size:12px">📊 Lưu Trữ Báo Cáo (Snapshot Only)</div>
              <div style="font-size:11px; color:var(--gray-700); margin-top:5px">
                ✅ Chỉ snapshot IPCAS vào Report Archive<br>
                ❌ KHÔNG thay thế dữ liệu hiện tại<br>
                ✅ Giữ nguyên production data<br>
                ✅ Phù hợp: Backup định kỳ, so sánh
              </div>
            </button>

            <!-- Option 3: Skip -->
            <button class="btn" onclick="completeImportSkipArchive()" style="background:var(--gray-50); border:2px solid var(--gray-300); padding:15px; text-align:left; border-radius:8px; cursor:pointer; transition:all .2s">
              <div style="font-weight:700; color:var(--gray-700); font-size:12px">⏭️  Không Lưu (Skip)</div>
              <div style="font-size:11px; color:var(--gray-500); margin-top:5px">
                ✅ Chỉ cập nhật dữ liệu hiện tại<br>
                ❌ KHÔNG lưu vào Archive<br>
                ⚠️  Không có backup của import này<br>
                ✅ Phù hợp: Thử nghiệm, test
              </div>
            </button>

            <!-- Option 4: Daily Archive (PRO-35b) -->
            <button class="btn" onclick="completeImportToDailyArchive()" style="background:linear-gradient(135deg, var(--blue-pale), #fff); border:2px solid var(--blue); padding:15px; text-align:left; border-radius:8px; cursor:pointer; transition:all .2s">
              <div style="font-weight:700; color:var(--blue); font-size:12px">📅 Lưu Trữ Hàng Ngày (Daily Snapshot)</div>
              <div style="font-size:11px; color:var(--gray-700); margin-top:5px">
                ✅ Snapshot IPCAS được lưu ngay vào Lưu trữ Hàng ngày<br>
                ❌ KHÔNG thay thế dữ liệu hiện tại<br>
                🔗 Vẫn liên kết để so sánh Δ với Data/Báo cáo (cùng 1 kho)<br>
                🏷️ Nếu ngày trùng mốc (31/12, cuối quý, cuối tháng) → tự động xếp vào Mốc, không lặp<br>
                ✅ Phù hợp: theo dõi biến động số dư nợ hàng ngày
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existing = $('modal-import-save-location');
  if (existing) existing.remove();
  
  // Add new modal
  document.body.insertAdjacentHTML('beforeend', html);
}


// ✅ FIX 17/08/2026 — ĐỒNG BỘ MỐC HÀNG NGÀY KHI NHẬP IPCAS (Replace All)
// Yêu cầu: mỗi lần "Lưu Trữ Dữ Liệu (Replace All)" tự tạo thêm 1 snapshot vào
// Lưu trữ Hàng ngày để có thêm mốc so sánh, ĐỒNG BỘ cùng kho Lưu trữ báo cáo
// (_archiveReportList) — KHÔNG tách kho riêng nên toàn bộ pipeline so sánh Δ
// (D-1 / cuối tháng / cuối quý / 31-12) đọc được ngay.
// Chống trùng: 1 MỐC / NGÀY — nhập lại trong cùng ngày sẽ GHI ĐÈ mốc của ngày đó.
function ipcasUpsertDailySnapshot(finalRows, opts){
  opts = opts || {};
  if(!Array.isArray(finalRows) || !finalRows.length) return null;
  if(typeof _archiveReportList === 'undefined') return null;
  var ts = new Date();
  // HM-07: mốc theo NGÀY DỮ LIỆU của tệp (không phải ngày bấm nhập) — 2 tệp khác ngày nhập cùng 1 ngày ⇒ 2 mốc riêng
  var _dd = TD.dataDate.get();
  var dayKey = _dd ? TD.dataDate.vn(_dd) : TD.dataDate.vn(ts);
  var _snapTs = _dd ? new Date(_dd.getFullYear(), _dd.getMonth(), _dd.getDate(), ts.getHours(), ts.getMinutes(), ts.getSeconds()) : ts;
  var snap = {
    type: 'report',
    name: 'Hàng ngày ' + dayKey + ' (IPCAS)',
    date: _snapTs.toLocaleString('vi-VN'),
    timestamp: _snapTs.getTime(),
    importedAt: ts.getTime(),
    dayKey: dayKey,
    autoDaily: true,
    reportData: finalRows,
    source: opts.source || 'IPCAS Import (Replace All → mốc hàng ngày)',
    customers: TD.metrics.countCustomers(finalRows), // HM-09: theo mã KH, dư nợ>0
    accounts: finalRows.length,
    totalBalance: finalRows.reduce(function(s,r){ return s + (Number(r[11])||0); }, 0)
  };
  // Tìm mốc CÙNG NGÀY do cơ chế này tạo ra để ghi đè (không nhân bản mốc)
  var idx = -1;
  for(var i=0;i<_archiveReportList.length;i++){
    var it = _archiveReportList[i];
    if(!it || !it.autoDaily) continue;
    var k = it.dayKey || (typeof archiveSnapDateStr === 'function' ? archiveSnapDateStr(it) : '');
    if(k === dayKey){ idx = i; break; }
  }
  var replaced = false;
  if(idx >= 0){
    if(_archiveReportList[idx].tag) snap.tag = _archiveReportList[idx].tag; // giữ nhãn mốc 31/12 / cuối quý nếu đã gắn
    _archiveReportList[idx] = snap;
    replaced = true;
  } else {
    _archiveReportList.push(snap);
  }
  try { archiveSaveToStorage(); } catch(e){ console.warn('[DAILY-SNAP] save failed', e); }
  try { if(typeof archiveRenderReportList === 'function') archiveRenderReportList(); } catch(e){}
  try { if(typeof archiveRenderDailyList === 'function') archiveRenderDailyList(); } catch(e){}
  console.info('[DAILY-SNAP] ' + (replaced ? 'Ghi đè' : 'Tạo mới') + ' mốc hàng ngày ' + dayKey + ' — ' + finalRows.length + ' bản ghi');
  return { snap: snap, replaced: replaced, dayKey: dayKey };
}
window.ipcasUpsertDailySnapshot = ipcasUpsertDailySnapshot;

// ✅ PRO-35: Option 1 - Lưu vào Data Archive (thay thế dữ liệu)
function completeImportToDataArchive() {
  /* v13.9.7 FIX: thông báo TDUP5 quét Bảng VII */
  try{ window.dispatchEvent(new CustomEvent('td:ipcas-imported')); }catch(_e){}

  const finalRows = window._pendingImportFinalRows;
  const excludedCount = window._pendingImportExcludedCount;
  
  if (!finalRows) { alert('❌ Lỗi: Không tìm thấy dữ liệu import'); return; }

  // ✅ PRO-TRANO: Lưu snapshot dư nợ cũ trước khi ghi đè (để phát hiện KH trả gốc)
  _captureOldDunoSnapshot();

  // Replace data
  DATA.qltd = finalRows;
  // ✅ v13.7.5: ghi đè dứt khoát L/S từ cột sprd — dọn mọi cờ cũ + xoá cờ auto-heal
  try {
    let _rateCount = 0;
    DATA.qltd.forEach(r => {
      if (!r) return;
      delete r._rateOverflowFixed;
      delete r._rateOverflowCleared;
      delete r._derivedFromIntAmt;
      delete r._rateAutoHealed;
      delete r._rateStale;
      if (r[8] !== '' && r[8] != null && isFinite(parseFloat(r[8]))) _rateCount++;
    });
    try { localStorage.removeItem('td_rate_autoheal_const_v1'); } catch(e){}
    console.info('[IMPORT] ✅ Đã ghi đè L/S từ cột sprd cho ' + _rateCount + '/' + DATA.qltd.length + ' dòng.');
  } catch(e){ console.warn('rate-overwrite-log', e); }
  if (typeof applyTKSTTMapping === 'function') applyTKSTTMapping();
  if (typeof injectTKSTTPlaceholders === 'function') injectTKSTTPlaceholders();
  DATA.hdv = [];
  DATA.macb = [];
  autoGenerateMaCB(); // ✅ FIX: tái tạo danh sách CB ngay sau import
  pendingImportRows = null;
  _syncAllRows = [];
  _syncExcluded = new Set();
  markUnsaved();
  saveData(true);
  
  // Save to Data Archive
  archiveSaveData();

  // ✅ FIX 17/08/2026: đồng thời tạo/ghi đè mốc so sánh trong Lưu trữ Hàng ngày
  var _dailyRes = null;
  try { _dailyRes = ipcasUpsertDailySnapshot(finalRows); } catch(e){ console.warn('[DAILY-SNAP]', e); }
  
  // Cleanup
  closeModal('modal-import');
  closeModal('modal-import-save-location');
  rebuildAll();
  
  const excludeMsg = excludedCount > 0 ? ` (đã lọc bỏ ${fmtNum(excludedCount)} bản ghi)` : '';
  const dailyMsg = _dailyRes
    ? ` · ${_dailyRes.replaced ? 'đã ghi đè' : 'đã tạo'} mốc Hàng ngày ${_dailyRes.dayKey}`
    : '';
  showToast(`✅ Đã nhập & lưu vào Data Archive: ${fmtNum(DATA.qltd.length)} bản ghi từ IPCAS${excludeMsg}${dailyMsg}`, 'green');
  
  // Cleanup
  window._pendingImportFinalRows = null;
  window._pendingImportExcludedCount = null;
}

// ✅ PRO-35: Option 2 - Lưu vào Report Archive (snapshot only, no replace)
function completeImportToReportArchive() {
  /* v13.9.7 FIX: thông báo TDUP5 quét Bảng VII */
  try{ window.dispatchEvent(new CustomEvent('td:ipcas-imported')); }catch(_e){}

  const finalRows = window._pendingImportFinalRows;
  const excludedCount = window._pendingImportExcludedCount;
  
  if (!finalRows) { alert('❌ Lỗi: Không tìm thấy dữ liệu import'); return; }
  
  // Create Report Archive snapshot from imported data
  const timestamp = new Date();
  const dd = String(timestamp.getDate()).padStart(2,'0');
  const mm = String(timestamp.getMonth()+1).padStart(2,'0');
  const yyyy = timestamp.getFullYear();
  const HH = String(timestamp.getHours()).padStart(2,'0');
  const MM = String(timestamp.getMinutes()).padStart(2,'0');
  // ✅ Dùng ngày từ tên file nguồn nếu có (vd: 25/04/2026), ngược lại fallback timestamp
  const fileName = window._importSourceDate || `Report ${dd}/${mm}/${yyyy} ${HH}:${MM}`;
  window._importSourceDate = null;
  
  const report = {
    type: 'report',
    name: fileName,
    date: timestamp.toLocaleString('vi-VN'),
    timestamp: timestamp.getTime(),
    reportData: finalRows,
    source: 'IPCAS Import',
    customers: TD.metrics.countCustomers(finalRows), // HM-09
    accounts: finalRows.length,
    totalBalance: finalRows.reduce((sum, r) => sum + (Number(r[11]) || 0), 0)
  };
  
  _archiveReportList.push(report);
  archiveSaveToStorage();
  archiveRenderReportList();
  
  // Cleanup (do NOT replace current data)
  pendingImportRows = null;
  _syncAllRows = [];
  _syncExcluded = new Set();
  
  closeModal('modal-import');
  closeModal('modal-import-save-location');
  
  const excludeMsg = excludedCount > 0 ? ` (đã lọc bỏ ${fmtNum(excludedCount)} bản ghi)` : '';
  showToast(`✅ Đã snapshot IPCAS vào Report Archive: ${fmtNum(finalRows.length)} bản ghi${excludeMsg} (dữ liệu hiện tại không bị thay đổi)`, 'blue');
  
  // Cleanup
  window._pendingImportFinalRows = null;
  window._pendingImportExcludedCount = null;
}

// ✅ PRO-35b: Option 4 - Lưu nhanh vào Lưu trữ Hàng ngày (snapshot only, no replace)
// Dùng chung kho _archiveReportList với Report Archive (KHÔNG tách kho riêng) để
// giữ nguyên toàn bộ pipeline so sánh Δ (D-1/CT trước/CQ trước/31-12) đang đọc
// từ 1 nguồn duy nhất. Việc entry này hiển thị ở tab "Hàng ngày" hay tự động
// gộp vào "Mốc" khi ngày trùng 31/12 / cuối quý / cuối tháng đã được xử lý sẵn
// bởi archiveRenderDailyList() + archiveIsMilestoneSnap() — không cần logic mới.
function completeImportToDailyArchive() {
  /* v13.9.7 FIX: thông báo TDUP5 quét Bảng VII */
  try{ window.dispatchEvent(new CustomEvent('td:ipcas-imported')); }catch(_e){}

  const finalRows = window._pendingImportFinalRows;
  const excludedCount = window._pendingImportExcludedCount;

  if (!finalRows) { alert('❌ Lỗi: Không tìm thấy dữ liệu import'); return; }

  // Create Report Archive snapshot from imported data (nguồn: Nhập nhanh Hàng ngày)
  const timestamp = new Date();
  const dd = String(timestamp.getDate()).padStart(2,'0');
  const mm = String(timestamp.getMonth()+1).padStart(2,'0');
  const yyyy = timestamp.getFullYear();
  const HH = String(timestamp.getHours()).padStart(2,'0');
  const MM = String(timestamp.getMinutes()).padStart(2,'0');
  // ✅ Dùng ngày từ tên file nguồn nếu có (vd: 25/04/2026), ngược lại fallback timestamp
  const fileName = window._importSourceDate || `Hàng ngày ${dd}/${mm}/${yyyy} ${HH}:${MM}`;
  window._importSourceDate = null;

  const report = {
    type: 'report',
    name: fileName,
    date: timestamp.toLocaleString('vi-VN'),
    timestamp: timestamp.getTime(),
    reportData: finalRows,
    source: 'IPCAS Import (Hàng ngày)',
    customers: TD.metrics.countCustomers(finalRows), // HM-09
    accounts: finalRows.length,
    totalBalance: finalRows.reduce((sum, r) => sum + (Number(r[11]) || 0), 0)
  };

  _archiveReportList.push(report);
  archiveSaveToStorage();
  archiveRenderReportList();
  if (typeof archiveRenderDailyList === 'function') archiveRenderDailyList();

  // Cleanup (do NOT replace current data)
  pendingImportRows = null;
  _syncAllRows = [];
  _syncExcluded = new Set();

  closeModal('modal-import');
  closeModal('modal-import-save-location');

  // Cho biết entry này rơi vào Mốc hay Hàng ngày, dựa trên logic dedup đã có sẵn
  let landedMsg = 'vào Lưu trữ Hàng ngày';
  try {
    if (typeof archiveIsMilestoneSnap === 'function' && archiveIsMilestoneSnap(report)) {
      landedMsg = 'vào Mốc so sánh (ngày này trùng mốc 31/12 / cuối quý / cuối tháng)';
    }
  } catch(_e){}

  const excludeMsg = excludedCount > 0 ? ` (đã lọc bỏ ${fmtNum(excludedCount)} bản ghi)` : '';
  showToast(`✅ Đã snapshot IPCAS ${landedMsg}: ${fmtNum(finalRows.length)} bản ghi${excludeMsg} (dữ liệu hiện tại không bị thay đổi)`, 'blue');

  // Cleanup
  window._pendingImportFinalRows = null;
  window._pendingImportExcludedCount = null;
}

// ✅ PRO-35: Option 3 - Skip (không lưu, chỉ cập nhật)
function completeImportSkipArchive() {
  /* v13.9.7 FIX: thông báo TDUP5 quét Bảng VII */
  try{ window.dispatchEvent(new CustomEvent('td:ipcas-imported')); }catch(_e){}

  const finalRows = window._pendingImportFinalRows;
  const excludedCount = window._pendingImportExcludedCount;
  
  if (!finalRows) { alert('❌ Lỗi: Không tìm thấy dữ liệu import'); return; }
  
  // ✅ PRO-TRANO: Lưu snapshot dư nợ cũ trước khi ghi đè
  _captureOldDunoSnapshot();

  // Replace data (NO archive save)
  DATA.qltd = finalRows;
  // ✅ v13.8.0: import mới là nguồn đúng — dọn toàn bộ cờ L/S lỗi cũ kể cả khi Skip Archive
  try { DATA.qltd.forEach(function(r){ if (window.__clearRateLegacyFlags) window.__clearRateLegacyFlags(r); }); } catch(e){ console.warn('rate-flag-clean-skip', e); }
  if (typeof applyTKSTTMapping === 'function') applyTKSTTMapping();
  if (typeof injectTKSTTPlaceholders === 'function') injectTKSTTPlaceholders();
  DATA.hdv = [];
  DATA.macb = [];
  autoGenerateMaCB(); // ✅ FIX: tái tạo danh sách CB ngay sau import
  pendingImportRows = null;
  _syncAllRows = [];
  _syncExcluded = new Set();
  markUnsaved();
  saveData(true);
  
  // Cleanup
  closeModal('modal-import');
  closeModal('modal-import-save-location');
  rebuildAll();
  
  const excludeMsg = excludedCount > 0 ? ` (đã lọc bỏ ${fmtNum(excludedCount)} bản ghi)` : '';
  showToast(`✅ Đã nhập IPCAS (không lưu Archive): ${fmtNum(DATA.qltd.length)} bản ghi${excludeMsg}`, 'orange');
  
  // Cleanup
  window._pendingImportFinalRows = null;
  window._pendingImportExcludedCount = null;
}


/**
 * Ghi lại dư nợ hiện tại theo mã KH vào window._prevDunoByMa
 * Gọi TRƯỚC khi DATA.qltd bị ghi đè bởi file IPCAS mới.
 */
function _captureOldDunoSnapshot() {
  if (!DATA.qltd || !DATA.qltd.length) {
    window._prevDunoByMa = {};
    try { window._prevFileDate = null; TD.dataDate.set(window._importSourceDate || null); } catch (e) {} // HM-07: lần nhập đầu vẫn ghi ngày dữ liệu
    return;
  }
  const snap = {};
  DATA.qltd.forEach(r => {
    const ma = String(r[0] || '').trim();
    if (!ma) return;
    if (!snap[ma]) snap[ma] = { totalDN: 0, name: String(r[1] || '').trim(), cbtd: String(r[12] || '').trim() };
    snap[ma].totalDN += Number(r[11]) || 0;
  });
  window._prevDunoByMa = snap;
  // ✅ PRO-TRANO+: Ghi lại NGÀY của file ĐANG bị thay thế (là file đã import lần trước)
  let prevFileDate = null;
  try { prevFileDate = localStorage.getItem('_currentFileDate') || null; } catch(e) {}
  window._prevFileDate = prevFileDate;
  try {
    const ts = Date.now();
    localStorage.setItem('_prevDunoSnap', JSON.stringify({ ts, snap, prevFileDate }));
    // Ngay sau khi snapshot xong, ghi nhận NGÀY của file MỚI sắp được nạp
    TD.dataDate.set(window._importSourceDate || null); // HM-07
  } catch(e) {}
}

/**
 * Khôi phục snapshot từ localStorage nếu window._prevDunoByMa chưa có.
 * Chỉ dùng nếu snapshot < 24 giờ (tránh dữ liệu quá cũ).
 */
function _restorePrevDunoSnapshot() {
  if (window._prevDunoByMa) return;
  try {
    const raw = localStorage.getItem('_prevDunoSnap');
    if (!raw) { window._prevDunoByMa = {}; window._prevFileDate = null; return; }
    const obj = JSON.parse(raw);
    const age = Date.now() - obj.ts;
    window._prevDunoByMa = obj.snap || {}; // bỏ giới hạn 24h để vẫn so sánh khi file cách nhau >1 ngày
    window._prevFileDate = obj.prevFileDate || null;
  } catch(e) { window._prevDunoByMa = {}; window._prevFileDate = null; }
}

/**
 * ✅ PRO-TRANO+: Kiểm tra prev file date và current file date có cách nhau đúng 1 ngày
 * Định dạng đầu vào: "DD/MM/YYYY"
 */
function _isYesterdayDiff(prevDateStr, currDateStr) {
  if (!prevDateStr || !currDateStr) return false;
  const p = String(prevDateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const c = String(currDateStr).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!p || !c) return false;
  const pd = new Date(+p[3], +p[2]-1, +p[1]);
  const cd = new Date(+c[3], +c[2]-1, +c[1]);
  const diff = Math.round((cd - pd) / 86400000);
  return diff === 1;
}

/* ═══════════════════════════════════════════════════════════════
   REBUILD ALL — call after major data changes
   ═══════════════════════════════════════════════════════════════ */
function rebuildAll() {
  setTimeout(hsvvRecalcAll, 400); // ⚡ Recalc derived fields
  DATA.macb = []; // Force regenerate
  autoGenerateMaCB(); // ✅ FIX: tái tạo danh sách cán bộ từ DATA.qltd
  refreshBadges();
  initDashboardFilters();
  
  // ✅ FIX PRO-34: LUÔN update dashboard (không chỉ khi user đang xem)
  // Lý do: Dashboard cần sync với dữ liệu thực tế ngay cả khi user đang ở page khác
  renderDashboard();

  // ✅ PRO-46: Refresh thông báo nợ sau khi import dữ liệu mới
  window._notifData = null;  // force re-scan
  const today = todayMidnight();
  const dayKey = NOTIF_LS_KEY + today.toISOString().slice(0, 10);
  localStorage.removeItem(dayKey);  // cho phép hiện lại sau import
  setTimeout(checkAndNotify, 400);
  
  // Render current page
  if (['qltd','kd','td','denhan','laidong','macb'].includes(activeTable)) renderTable(activeTable);
  else if (activeTable === 'chlm') renderTable('chlm');
  else if (activeTable === 'phidv') {
    // ✅ KEY SYNC FIX: Sau khi import data mới, rebuild lưới tháng trước khi render
    // Không gọi phidvSetDefaultFilter() để giữ filter user đang chọn
    phidvRenderMonthGrid();
    renderTable('phidv');
  }
  else if (activeTable === 'tranop') renderTranop();
  else if (activeTable === 'hdv') renderHDV();
  else if (activeTable === 'baocao') renderBaoCao();
  else if (activeTable === 'giadat') renderGiaDat();
  else if (activeTable === 'list') renderList();
  // Note: activeTable === 'dashboard' is now redundant since we always render it above
  
  setTimeout(updateTableTopScrollbars, 0);
}


/* ═══════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  // HM-13b: Ctrl+S do TD.keys (HM-15) xử lý — đã gỡ nhánh cũ
  if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); openLaiCalcModal(); }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// Auto-save on unload
window.addEventListener('beforeunload', e => {
  // QLTD data
  if (hasUnsaved) {
    saveToLS();
    idbSet(getPayload());
  }
  // HSVV data — auto-save silently nếu có thay đổi chưa lưu
  if (typeof _hosoDirty !== 'undefined' && _hosoDirty &&
      typeof _hosoCurrentId !== 'undefined' && _hosoCurrentId) {
    try { hosoSilentSave(); } catch {}
  }
  // Hiện dialog nếu QLTD có unsaved (HSVV đã auto-save xong ở trên)
  if (hasUnsaved) {
    e.returnValue = 'Có dữ liệu QLTD chưa lưu!';
  }
  // Cảnh báo thêm nếu HSVV vẫn dirty sau khi cố auto-save (ví dụ save thất bại)
  if (!hasUnsaved &&
      typeof _hosoDirty !== 'undefined' && _hosoDirty &&
      typeof _hosoCurrentId !== 'undefined' && _hosoCurrentId) {
    e.returnValue = 'Hồ sơ vay vốn chưa được lưu — bạn có muốn rời trang?';
  }
});


/* ═══════════════════════════════════════════════════════════════
   MÁY TÍNH LÃI MODAL — HANDLERS
   ═══════════════════════════════════════════════════════════════ */
function openLaiCalcModal() {
  openModal('modal-laicalc');
  // Default prefill với ngày hôm nay ở trường ngày trả
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
  if (!$('lai-tra').value) $('lai-tra').value = todayStr;
  setTimeout(() => $('lai-goc').focus(), 100);
}

function laiCalcLive() {
  // Đọc chế độ (normal / quahan)
  const modeEl = document.querySelector('input[name="lai-mode"]:checked');
  const mode = modeEl ? modeEl.value : 'normal';

  // Hiện/ẩn ô Ngày đến hạn theo chế độ
  const denhanGrp = $('lai-denhan-group');
  if (denhanGrp) denhanGrp.style.display = (mode === 'quahan') ? '' : 'none';

  const gocRaw = String($('lai-goc').value || '').replace(/[^\d.-]/g, '');
  const goc = parseFloat(gocRaw) || 0;
  const ls = parseFloat($('lai-ls').value) || 0;
  const gnStr = $('lai-gn').value;     // Ngày bắt đầu tính lãi
  const traStr = $('lai-tra').value;   // Ngày trả / tất toán

  $('lai-goc-fmt').textContent = goc > 0 ? `= ${fmtMoney(goc)} đồng` : '';

  if (!goc || !ls || !gnStr || !traStr) { $('lai-result').style.display = 'none'; return; }
  const dGN  = parseVNDate(gnStr);
  const dTra = parseVNDate(traStr);
  if (!dGN || !dTra) { $('lai-result').style.display = 'none'; return; }
  if (dTra < dGN) {
    $('lai-result').style.display = 'block';
    $('lai-result-value').textContent = '⚠ Ngày trả không thể trước ngày bắt đầu';
    $('lai-result-value').style.color = 'var(--red)';
    return;
  }
  $('lai-result-value').style.color = 'var(--gold-light)';

  if (mode === 'quahan') {
    // ══════════════════════════════════════════════════════════
    // IPCAS OVERDUE MODE — song song: lãi trong hạn + lãi quá hạn
    // Giải thích: IPCAS tính ĐỒng THỜI 2 dòng lãi:
    //   ①  Lãi trong hạn  : từ ngày bắt đầu (lstintchrgprd) đến ngày tất toán (dTra), LS gốc
    //   ②  Lãi quá hạn    : từ ngày đáo hạn đến ngày tất toán, LS × 150%
    // (Tức là: ngày trong khoảng [đáo hạn, tất toán] bị tính cả 2 loại lãi đồng thời)
    // ══════════════════════════════════════════════════════════
    const denhanStr = $('lai-denhan').value;
    if (!denhanStr) {
      $('lai-result').style.display = 'block';
      $('lai-result-value').textContent = '⚠ Vui lòng nhập Ngày đáo hạn';
      $('lai-result-value').style.color = 'orange';
      return;
    }
    const dDenHan = parseVNDate(denhanStr);
    if (!dDenHan) {
      $('lai-result').style.display = 'block';
      $('lai-result-value').textContent = '⚠ Ngày đáo hạn không hợp lệ';
      $('lai-result-value').style.color = 'orange';
      return;
    }

    // ① Lãi trong hạn: từ ngày GN (lstintchrgprd) đến ngày tất toán (TOÀN BỘ khoảng)
    const laiTH = tinhLai365(goc, ls, dGN, dTra);

    // ② Lãi quá hạn: từ ngày đáo hạn đến ngày tất toán, rate = ls × 150% / 2
    // Ghi chú: IPCAS dùng LS quá hạn = LS trong hạn × 150% nhưng chỉ tính phần PHẠT
    // Phân tích chứng từ: 980tr × 8.5% × 5 ngày / 365 = 1.141.096 (trong hạn) ✓
    //                     570.548 = 1.141.096 / 2 → tức là phần quá hạn = LS/2 × 150% = LS × 75%
    // Hay: past_due = 980tr × (8.5% × 0.5) × 5 / 365 = 570.548 ✓
    // Kết luận: IPCAS tính lãi quá hạn = GỐC × (LS_NĂM × 0.5) × SỐ_NGÀY / 365
    //           (không phải LS × 1.5 — mà là LS × 0.5 cho phần penalty riêng)
    const lsQHRieng = ls * 0.5; // penalty rate = thêm 50% so với LS gốc
    const soNgayQH = Math.max(0, tinhSoNgayVay(dDenHan, dTra));
    const laiQH_tien = Math.round(goc * (lsQHRieng / 100) * soNgayQH / 365);
    const laiQH_ct = `${fmtNum(goc)} × ${lsQHRieng.toFixed(2)}%/năm × ${soNgayQH} ngày ÷ 365 = ${fmtNum(laiQH_tien)} đ`;

    const tongLai = laiTH.tienLai + laiQH_tien;
    const tongThu = goc + tongLai;

    // Hiển thị
    $('lai-result').style.display = 'block';
    $('lai-result-label').textContent = 'TỔNG LÃI (IPCAS — TÍNH SONG SONG)';
    $('lai-result-value').textContent = fmtMoney(tongLai) + ' đ';
    $('lai-result-value').style.color = 'var(--gold-light)';
    $('lai-result-formula').textContent = `Lãi TH (${laiTH.soNgay}n) + Lãi QH (${soNgayQH}n) = ${fmtNum(laiTH.tienLai)} + ${fmtNum(laiQH_tien)} đ`;
    $('lai-bd-goc').textContent  = fmtMoney(goc) + ' đ';
    $('lai-bd-ngay').textContent = `TH:${laiTH.soNgay}n / QH:${soNgayQH}n`;
    $('lai-bd-ls').textContent   = `${ls}% + ${lsQHRieng}%QH`;
    $('lai-bd-tong').textContent = fmtMoney(tongThu) + ' đ';
    // Breakdown
    $('lai-qh-breakdown').style.display = '';
    $('lai-qh-trongh-val').textContent = fmtMoney(laiTH.tienLai) + ' đ';
    $('lai-qh-trongh-ct').textContent  = laiTH.chiTiet;
    $('lai-qh-quah-val').textContent   = fmtMoney(laiQH_tien) + ' đ';
    $('lai-qh-quah-ct').textContent    = laiQH_ct;
    $('lai-qh-tong-lai').textContent   = fmtMoney(tongLai) + ' đ';
    $('lai-qh-tong-thu').textContent   = fmtMoney(tongThu) + ' đ';
    $('lai-qh-note').textContent       = `Gốc ${fmtNum(goc)} + Lãi TH ${fmtNum(laiTH.tienLai)} + Lãi QH ${fmtNum(laiQH_tien)}`;

    window._laiCalcLastResult = {
      goc, ls, mode: 'quahan',
      laiTrongHan: laiTH.tienLai, laiQuaHan: laiQH_tien,
      soNgayTH: laiTH.soNgay, soNgayQH,
      tongLai, tongThu,
      ngayGN: gnStr, ngayDenHan: denhanStr, ngayTra: traStr
    };

  } else {
    // ══════════════════════════════════════════════════════════
    // NORMAL MODE — trong hạn đơn giản
    // ══════════════════════════════════════════════════════════
    const result = tinhLai365(goc, ls, dGN, dTra);
    $('lai-result').style.display = 'block';
    $('lai-result-label').textContent = 'TIỀN LÃI PHẢI THU';
    $('lai-result-value').textContent = fmtMoney(result.tienLai) + ' đ';
    $('lai-result-value').style.color = 'var(--gold-light)';
    $('lai-result-formula').textContent = result.chiTiet;
    $('lai-bd-goc').textContent  = fmtMoney(goc) + ' đ';
    $('lai-bd-ngay').textContent = result.soNgay + ' ngày';
    $('lai-bd-ls').textContent   = ls + '%/năm';
    $('lai-bd-tong').textContent = fmtMoney(result.tongThu) + ' đ';
    if ($('lai-qh-breakdown')) $('lai-qh-breakdown').style.display = 'none';

    window._laiCalcLastResult = {
      goc, ls, soNgay: result.soNgay, tienLai: result.tienLai, tongThu: result.tongThu,
      ngayGN: gnStr, ngayTra: traStr
    };
  }
}

function laiCalcPreset(mode) {
  if (mode === 'cert') {
    // Preset trong hạn: KH KH mẫu
    document.querySelector('input[name="lai-mode"][value="normal"]').checked = true;
    $('lai-goc').value = '500000000';
    $('lai-ls').value = '8';
    $('lai-gn').value = '15/04/2026';
    $('lai-tra').value = '17/04/2026';
  } else if (mode === 'quahan') {
    // Preset quá hạn IPCAS: (đã ẩn) — 980tr, đáo hạn 29/04, tất toán 04/05/2026
    // Kiểm chứng: Lãi TH = 1.141.096 đ, Lãi QH = 570.548 đ, Tổng = 1.711.644 đ
    document.querySelector('input[name="lai-mode"][value="quahan"]').checked = true;
    $('lai-goc').value  = '980000000';
    $('lai-ls').value   = '8.5';
    $('lai-gn').value   = '29/04/2026';   // ngày đã thu lãi đến (lstintchrgprd)
    $('lai-denhan').value = '29/04/2026'; // ngày đáo hạn = đến hạn trả gốc
    $('lai-tra').value  = '04/05/2026';   // ngày tất toán
  } else if (mode === 'today') {
    const t = new Date();
    const s = `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
    $('lai-tra').value = s;
  }
  laiCalcLive();
}

function laiCalcReset() {
  ['lai-goc','lai-ls','lai-gn','lai-denhan','lai-tra'].forEach(id => { const el=$(id); if(el) el.value=''; });
  $('lai-goc-fmt').textContent = '';
  $('lai-result').style.display = 'none';
  // Reset mode về bình thường
  const nm = document.querySelector('input[name="lai-mode"][value="normal"]');
  if (nm) nm.checked = true;
  const dg = $('lai-denhan-group');
  if (dg) dg.style.display = 'none';
}

function copyLaiResult() {
  // Ưu tiên tab đang active: nếu đang ở KH lookup tab thì copy kết quả KH
  const activeTab = document.querySelector('.laicalc-tab.active')?.id;
  if (activeTab === 'laitab-kh' && window._laikhLastResult) {
    const rk = window._laikhLastResult;
    const lines = [
      `TÍNH LÃI CHO KHÁCH HÀNG: ${rk.kh} (${rk.ma})`,
      `Ngày chốt lãi: ${rk.ngayChot}`,
      `Số khoản đã tick: ${rk.tickedCount}`,
      ``,
      `Chi tiết các khoản:`
    ];
    rk.tickedLoans.forEach((l, i) => {
      lines.push(`  ${i+1}. Số HĐTD ${l.sohd}: Dư nợ ${fmtMoney(l.duNo)} × ${l.ls}% từ ${l.daThu} → ${rk.ngayChot}`);
      if (l.tragoc > 0) lines.push(`     Tiền trả gốc: ${fmtMoney(l.tragoc)}`);
    });
    lines.push(``);
    lines.push(`Tổng trả gốc: ${fmtMoney(rk.totalGoc)} đồng`);
    lines.push(`TỔNG LÃI PHẢI THU: ${fmtMoney(rk.totalLai)} đồng`);
    lines.push(`TỔNG THU: ${fmtMoney(rk.tongThu)} đồng`);
    const txt = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        () => showToast('📋 Đã copy kết quả KH vào clipboard', 'green'),
        () => showToast('⚠ Không copy được', 'red')
      );
    } else { prompt('Kết quả:', txt); }
    return;
  }
  const r = window._laiCalcLastResult;
  if (!r) { showToast('⚠ Chưa có kết quả để copy', 'red'); return; }
  const text = `TÍNH LÃI CHO KHOẢN VAY (Cơ sở 365 ngày):
  • Dư nợ gốc: ${fmtMoney(r.goc)} đồng
  • Lãi suất: ${r.ls}%/năm
  • Ngày giải ngân: ${r.ngayGN}
  • Ngày trả nợ: ${r.ngayTra}
  • Số ngày vay: ${r.soNgay} ngày
  
Công thức: ${fmtNum(r.goc)} × ${r.ls}%/năm × ${r.soNgay} ngày ÷ 365 = ${fmtNum(r.tienLai)} đ
  → Tiền lãi: ${fmtMoney(r.tienLai)} đồng
  → Tổng thu: ${fmtMoney(r.tongThu)} đồng`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast('📋 Đã copy kết quả vào clipboard', 'green'),
      () => showToast('⚠ Không copy được, vui lòng chọn text thủ công', 'red')
    );
  } else {
    // Fallback: prompt
    prompt('Kết quả:', text);
  }
}




/* ═══════════════════════════════════════════════════════════════
   TÍNH LÃI — TAB SWITCHER + CUSTOMER LOOKUP + LOAN TABLE
   ═══════════════════════════════════════════════════════════════ */
let _laikhSelectedCustomer = null;   // {ma, ten, loans: [rows...]}
let _laikhTickState = {};             // { idx: true/false }
let _laikhTragocState = {};           // { idx: number }

function switchLaiTab(tab) {
  document.querySelectorAll('.laicalc-tab').forEach(t => t.classList.remove('active'));
  $(`laitab-${tab}`).classList.add('active');
  $('laitab-kh-panel').style.display = tab === 'kh' ? 'block' : 'none';
  $('laitab-manual-panel').style.display = tab === 'manual' ? 'block' : 'none';
  // Toggle footer reset button
  const resetBtn = $('laikh-reset-btn');
  if (resetBtn) resetBtn.style.display = (tab === 'kh' && _laikhSelectedCustomer) ? 'inline-flex' : 'none';
}

// Tìm kiếm KH trong DATA.qltd
function laikhSearch() {
  const q = ($('laikh-search').value || '').trim().toLowerCase();
  const results = $('laikh-results');
  if (q.length < 2) { results.style.display = 'none'; return; }

  // Group by (ma + ten) để không duplicate KH có nhiều khoản vay
  const byKey = {};
  DATA.qltd.forEach((r, i) => {
    if (!r[1]) return;
    const matches = [r[0], r[1], r[2]].some(v => String(v || '').toLowerCase().includes(q));
    if (!matches) return;
    const key = (r[0] || '') + '|' + (r[1] || '');
    const nh = isNganHan(r[13]);   // ngắn hạn + thấu chi
    const tdh = isTrungHan(r[13]); // trung + dài hạn
    if (!byKey[key]) {
      byKey[key] = {
        ma: r[0], ten: r[1],
        diachi: String(r[14] || '').trim(),  // lấy địa chỉ từ dòng đầu tiên
        hmtd: 0,      // HMTD ngắn hạn/thấu chi — chỉ lấy 1 giá trị đại diện, không cộng gộp
        hmtdSet: false,
        totalGN: 0,   // Tổng số tiền GN cho trung/dài hạn
        countNH: 0, countTDH: 0,
        count: 0, idxList: []
      };
    }
    const ent = byKey[key];
    ent.count++;
    ent.idxList.push(i);
    // Địa chỉ: lấy dòng đầu tiên có địa chỉ khác rỗng
    if (!ent.diachi && r[14]) ent.diachi = String(r[14]).trim();
    if (nh) {
      ent.countNH++;
      // HMTD: không cộng gộp — chỉ lấy 1 giá trị đại diện đầu tiên ≠ 0
      if (!ent.hmtdSet && Number(r[5]) > 0) { ent.hmtd = Number(r[5]); ent.hmtdSet = true; }
    } else if (tdh) {
      ent.countTDH++;
      ent.totalGN += Number(r[9]) || 0;
    }
  });

  const matches = Object.values(byKey).slice(0, 20);
  if (!matches.length) {
    results.innerHTML = '<div style="padding:12px;text-align:center;color:var(--gray-500)">Không tìm thấy KH</div>';
    results.style.display = 'block';
    return;
  }

  results.innerHTML = matches.map(k => {
    // Xây phần thông tin tài chính bên phải
    const hasNH  = k.countNH  > 0;
    const hasTDH = k.countTDH > 0;
    let finHtml = '';
    if (hasNH && hasTDH) {
      // KH có cả 2 loại: hiện cả 2 dòng
      finHtml = `
        <div style="font-size:8.5px;color:var(--gray-400);font-weight:700;text-transform:uppercase;letter-spacing:.4px">HMTD (ngắn hạn)</div>
        <div style="font-weight:700;color:var(--green-dark);font-size:11px;white-space:nowrap">${fmtMoney(k.hmtd)} đ</div>
        <div style="font-size:8.5px;color:var(--gray-400);font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-top:3px">GN (trung/dài hạn)</div>
        <div style="font-weight:700;color:var(--blue);font-size:11px;white-space:nowrap">${fmtMoney(k.totalGN)} đ</div>`;
    } else if (hasNH) {
      finHtml = `
        <div style="font-size:8.5px;color:var(--gray-400);font-weight:700;text-transform:uppercase;letter-spacing:.4px">Hạn mức TD</div>
        <div style="font-weight:700;color:var(--green-dark);font-size:11.5px;white-space:nowrap">${fmtMoney(k.hmtd)} đ</div>`;
    } else if (hasTDH) {
      finHtml = `
        <div style="font-size:8.5px;color:var(--gray-400);font-weight:700;text-transform:uppercase;letter-spacing:.4px">Số tiền GN</div>
        <div style="font-weight:700;color:var(--blue);font-size:11.5px;white-space:nowrap">${fmtMoney(k.totalGN)} đ</div>`;
    }
    finHtml += `<div style="font-size:9px;color:var(--gray-500);margin-top:2px">${k.count} khoản vay</div>`;

    // Địa chỉ rút gọn (tối đa 45 ký tự)
    const dc = k.diachi ? k.diachi.length > 45 ? k.diachi.slice(0, 45) + '…' : k.diachi : '';

    return `
    <div class="kh-result-item" onclick="laikhSelectCustomer('${escapeHtml(k.ma).replace(/'/g,"\\'")}','${escapeHtml(k.ten).replace(/'/g,"\\'")}')">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(k.ten)}</div>
        <div style="font-size:10px;color:var(--gray-500)">Mã KH: ${escapeHtml(k.ma)}</div>
        ${dc ? `<div style="font-size:9.5px;color:var(--gray-400);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📍 ${escapeHtml(dc)}</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;padding-left:8px">${finHtml}</div>
    </div>`;
  }).join('');
  results.style.display = 'block';
}

// Chọn 1 KH — lấy TẤT CẢ khoản vay còn dư nợ của họ
function laikhSelectCustomer(ma, ten) {
  $('laikh-results').style.display = 'none';
  $('laikh-search').value = ten;
  _laikhSelectedCustomer = { ma, ten, loans: [] };
  _laikhTickState = {};
  _laikhTragocState = {};

  // Lấy TẤT CẢ dòng của KH này — khớp cả mã lẫn tên để tránh nhầm KH trùng tên
  // Hiển thị toàn bộ dòng từ file nguồn (kể cả dư nợ = 0) đúng như bảng QLTD
  DATA.qltd.forEach((r, i) => {
    const matchMa  = r[0] && ma  && r[0].trim() === ma.trim();
    const matchTen = r[1] && ten && r[1].trim() === ten.trim();
    if (matchMa && matchTen) {
      _laikhSelectedCustomer.loans.push({ idx: i, r });
      // Mặc định tick những khoản có dư nợ > 0; khoản dư nợ = 0 bỏ tick
      _laikhTickState[i] = Number(r[11]) > 0;
      _laikhTragocState[i] = 0;
    }
  });

  // Set ngày chốt mặc định = hôm nay nếu trống
  if (!$('laikh-ngaychot').value) {
    $('laikh-ngaychot').value = fmtVNDate(new Date());
    markDateInputState($('laikh-ngaychot'), true);
  }

  // Show info banner
  const info = $('laikh-selected');
  const totalDN = _laikhSelectedCustomer.loans.reduce((s, o) => s + (Number(o.r[11]) || 0), 0);
  info.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-weight:800;font-size:14px">${escapeHtml(ten)}</div>
        <div style="font-size:10.5px;color:rgba(255,255,255,.7)">Mã KH: ${escapeHtml(ma)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:9.5px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.8px">Tổng dư nợ</div>
        <div style="font-size:18px;font-weight:800;color:var(--gold-light)">${fmtMoney(totalDN)} đồng</div>
        <div style="font-size:10px;color:rgba(255,255,255,.7)">${_laikhSelectedCustomer.loans.length} khoản vay còn dư nợ</div>
      </div>
    </div>
  `;
  info.style.display = 'block';

  $('laikh-empty').style.display = 'none';
  $('laikh-table-wrap').style.display = 'block';
  $('laikh-reset-btn').style.display = 'inline-flex';

  laikhRenderTable();
}

// Render bảng các khoản vay + tính lãi realtime
function laikhRenderTable() {
  if (!_laikhSelectedCustomer) return;
  const loans = _laikhSelectedCustomer.loans;
  const ngayChot = parseVNDate($('laikh-ngaychot').value) || new Date();
  // Lãi suất quá hạn chuẩn Agribank: 150% lãi suất trong hạn tối đa, thực tế dùng 4.25%/năm
  const LS_QH = 4.25; // %/năm — có thể điều chỉnh theo quy định

  const tbody = $('laikh-tbody');
  tbody.innerHTML = loans.map(({ idx, r }) => {
    // ── Nguồn dữ liệu từ file IPCAS ──
    const daThuRaw    = r[23] || '';   // lstintchrgprd → ĐÃ THU LÃI ĐẾN
    const ngayGNRaw   = r[6]  || '';   // dsbsdt        → NGÀY GN
    const ngayDHRaw   = r[24] || '';   // apprmatdt     → NGÀY ĐẾN HẠN (từ QLTD)
    const daThuRawD   = parseVNDate(daThuRaw);
    const ngayGND     = parseVNDate(ngayGNRaw);
    const ngayDHD     = parseVNDate(ngayDHRaw);   // ngày đến hạn HĐ

    // Mốc tính lãi bắt đầu: lstintchrgprd nếu có, ngược lại dùng NGÀY GN
    const useNgayGN = !daThuRawD;
    const mocBatDau = useNgayGN ? ngayGND : daThuRawD;  // ngày đã thu lãi đến

    const duNo   = Number(r[11]) || 0;
    const ls     = (window.HSVRate ? (Number(window.HSVRate.normalize(r[8])) || 0) : (Number(r[8]) || 0));
    const tragoc = Number(_laikhTragocState[idx]) || 0;
    const ticked = !!_laikhTickState[idx];
    const zeroDuNo = duNo === 0;

    // ── Tính lãi tách trong hạn / quá hạn ──
    // Ngày tính lãi trong hạn: từ ngày kế tiếp của mocBatDau đến ngayDHD
    // Ngày tính lãi quá hạn:   từ ngày kế tiếp của ngayDHD  đến ngayChot
    let laiTrongHan = 0, laiQuaHan = 0, soNgayTH = 0, soNgayQH = 0;
    let hasData = !zeroDuNo && mocBatDau && ls > 0 && ngayChot >= mocBatDau;
    let isQuaHan = false;

    if (hasData) {
      if (ngayDHD && ngayChot > ngayDHD) {
        // Trường hợp QUÁ HẠN: tính cả 2 phần
        isQuaHan = true;
        // Lãi trong hạn: mocBatDau → ngayDHD
        if (ngayDHD >= mocBatDau) {
          const resIn = tinhLai365(duNo, ls, mocBatDau, ngayDHD);
          laiTrongHan = resIn.tienLai;
          soNgayTH = resIn.soNgay;
        }
        // Lãi quá hạn: ngayDHD+1 → ngayChot (LS cố định 4.25%/năm)
        const ngayBDQH = new Date(ngayDHD); ngayBDQH.setDate(ngayBDQH.getDate() + 1);
        if (ngayChot >= ngayBDQH) {
          const msPerDay = 86400000;
          soNgayQH = Math.round((ngayChot - ngayDHD) / msPerDay); // số ngày quá hạn từ ngày kế tiếp ngày đến hạn
          laiQuaHan = duNo * (LS_QH / 100) / 365 * soNgayQH;
        }
      } else {
        // Còn trong hạn hoặc chưa có ngày đến hạn: tính toàn bộ là lãi trong hạn
        const resIn = tinhLai365(duNo, ls, mocBatDau, ngayChot);
        laiTrongHan = resIn.tienLai;
        soNgayTH = resIn.soNgay;
      }
    }

    const tongLai = laiTrongHan + laiQuaHan;
    const invalidDate = mocBatDau && ngayChot < mocBatDau;
    const noDataFlag  = !mocBatDau || !ls || zeroDuNo;

    // ── HTML cells ──
    const dathuCellHtml = (() => {
      if (!daThuRaw) return `<span style="color:var(--red);font-size:10px">(trống)</span>`;
      if (useNgayGN) return `<span style="color:var(--gray-400);font-size:10.5px">${escapeHtml(daThuRaw)}</span>
        <br><span style="font-size:9px;color:var(--gray-400);font-style:italic">→ dùng NGÀY GN</span>`;
      return `<strong style="color:var(--navy)">${escapeHtml(daThuRaw)}</strong>`;
    })();

    const ngayGNCellHtml = (() => {
      if (!ngayGNRaw) return `<span style="color:var(--gray-400)">—</span>`;
      if (useNgayGN) return `
        <strong style="color:var(--blue)">${escapeHtml(ngayGNRaw)}</strong>
        <br><span style="font-size:9px;background:var(--blue-pale);color:var(--blue);padding:1px 5px;border-radius:3px;font-weight:700">▶ ĐANG DÙNG</span>`;
      return `<span style="color:var(--gray-600)">${escapeHtml(ngayGNRaw)}</span>`;
    })();

    const ngayDHCellHtml = (() => {
      if (!ngayDHRaw) return `<span style="color:var(--gray-400);font-size:10px">—</span>`;
      if (isQuaHan) return `<strong style="color:#c0392b">${escapeHtml(ngayDHRaw)}</strong>
        <br><span style="font-size:9px;background:#fde8e8;color:#c0392b;padding:1px 5px;border-radius:3px;font-weight:700">⚠ QUÁ HẠN</span>`;
      return `<strong style="color:var(--green-dark)">${escapeHtml(ngayDHRaw)}</strong>`;
    })();

    const rowStyle = zeroDuNo ? 'opacity:.65;background:#f4f6f9 !important' : '';

    return `<tr class="${ticked ? 'ticked' : ''}" id="laikh-row-${idx}" style="${rowStyle}">
      <td style="text-align:center">
        <input type="checkbox" ${ticked ? 'checked' : ''} ${zeroDuNo ? 'disabled title="Dư nợ = 0, không tính lãi"' : ''} onchange="laikhToggleTick(${idx}, this)">
      </td>
      <td style="text-align:left;padding-left:10px">
        <strong>${khLink(r[0], r[1], r[14], undefined, r[2])}</strong>
        <br><small style="color:var(--gray-500);font-size:9.5px">${escapeHtml(fmtMaKH(r[0]))}</small>
      </td>
      <td class="date">
        ${escapeHtml(r[2] || '')}
        <br><small style="color:var(--gray-500);font-size:9.5px">${escapeHtml(r[13] || '')}</small>
      </td>
      <td class="date">${dathuCellHtml}</td>
      <td class="date" style="background:${useNgayGN && !zeroDuNo ? 'var(--blue-pale)' : ''}">${ngayGNCellHtml}</td>
      <td class="date" style="background:${isQuaHan ? '#fde8e8' : ''}">${ngayDHCellHtml}</td>
      <td style="text-align:right">
        <input type="text" class="laikh-tragoc" value="${tragoc || ''}" placeholder="0"
          data-idx="${idx}" ${zeroDuNo ? 'disabled' : ''}
          oninput="laikhUpdateTragoc(${idx}, this.value)"
          onblur="laikhFormatTragoc(this)" onfocus="this.select()">
      </td>
      <td class="money">
        <strong ${zeroDuNo ? 'style="color:var(--gray-400)"' : ''}>${fmtMoney(duNo)}</strong>
        ${zeroDuNo ? '<br><span style="font-size:9px;color:var(--gray-400);font-style:italic">Dư nợ = 0</span>' : ''}
      </td>
      <td class="rate">${ window.HSVRate ? window.HSVRate.format(r[8], r) : (ls ? ls.toFixed(1)+'%' : '<span style="color:var(--gray-400)">—</span>') }</td>
      <td class="num">
        ${zeroDuNo ? '<span style="color:var(--gray-400);font-style:italic">—</span>'
          : noDataFlag ? '—'
          : invalidDate ? '<span style="color:var(--red)">!</span>'
          : soNgayTH + ' ngày'}
      </td>
      <td class="money" style="background:${ticked && !noDataFlag && !invalidDate ? '#fffbea' : ''}">
        ${zeroDuNo
          ? '<span style="color:var(--gray-400);font-size:10px;font-style:italic">Không tính</span>'
          : noDataFlag
            ? '<span style="color:var(--gray-500);font-style:italic">(thiếu dữ liệu)</span>'
            : invalidDate
              ? '<span style="color:var(--red)">Ngày chốt sai</span>'
              : `<strong style="color:var(--green-dark)">${fmtMoney(laiTrongHan)}</strong>`}
      </td>
      <td class="num" style="background:${isQuaHan ? '#fde8e8' : ''}">
        ${zeroDuNo || !isQuaHan ? '<span style="color:var(--gray-400)">—</span>'
          : `<strong style="color:#c0392b">${soNgayQH} ngày</strong>`}
      </td>
      <td class="money" style="background:${isQuaHan ? '#fde8e8' : ''}">
        ${zeroDuNo
          ? '<span style="color:var(--gray-400);font-size:10px;font-style:italic">Không tính</span>'
          : noDataFlag
            ? '<span style="color:var(--gray-500);font-style:italic">(thiếu dữ liệu)</span>'
            : !isQuaHan
              ? '<span style="color:var(--gray-400)">—</span>'
              : `<strong style="color:#c0392b">${fmtMoney(laiQuaHan)}</strong>`}
      </td>
      <td class="money" style="background:${ticked && !noDataFlag && !invalidDate ? 'linear-gradient(135deg,#e8f5ec,#eef4ff)' : ''}">
        ${zeroDuNo
          ? '<span style="color:var(--gray-400);font-size:10px;font-style:italic">Không tính</span>'
          : noDataFlag
            ? '<span style="color:var(--gray-500);font-style:italic">(thiếu dữ liệu)</span>'
            : invalidDate
              ? '<span style="color:var(--red)">Ngày chốt sai</span>'
              : `<strong style="color:var(--navy);font-size:13px">${fmtMoney(tongLai)}</strong>`}
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="13" style="text-align:center;padding:22px;color:var(--gray-500)">KH này không có hồ sơ nào trong hệ thống.</td></tr>';

  // Sync tick-all checkbox — chỉ tính các dòng dư nợ > 0
  const activeLoan = loans.filter(o => Number(o.r[11]) > 0);
  $('laikh-tick-all').checked = activeLoan.length > 0 && activeLoan.every(o => _laikhTickState[o.idx]);

  laikhUpdateTotals();
}

function laikhToggleTick(idx, cb) {
  _laikhTickState[idx] = cb.checked;
  const row = $(`laikh-row-${idx}`);
  if (row) row.classList.toggle('ticked', cb.checked);
  // Update tick-all
  const loans = _laikhSelectedCustomer?.loans || [];
  $('laikh-tick-all').checked = loans.length > 0 && loans.every(o => _laikhTickState[o.idx]);
  laikhUpdateTotals();
}
function laikhTickAll(cb) {
  if (!_laikhSelectedCustomer) return;
  _laikhSelectedCustomer.loans.forEach(o => { _laikhTickState[o.idx] = cb.checked; });
  laikhRenderTable();
}
function laikhUpdateTragoc(idx, val) {
  const n = parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
  _laikhTragocState[idx] = n;
  laikhUpdateTotals();
}
function laikhFormatTragoc(el) {
  const n = parseFloat(String(el.value).replace(/[^\d.-]/g, '')) || 0;
  el.value = n > 0 ? fmtNum(n) : '';
}

function laikhUpdateTotals() {
  if (!_laikhSelectedCustomer) return;
  const ngayChot = parseVNDate($('laikh-ngaychot').value) || new Date();
  const LS_QH = 4.25; // %/năm — lãi suất quá hạn cố định
  const loans = _laikhSelectedCustomer.loans;
  let tickedCount = 0, totalGoc = 0, totalLaiTH = 0, totalLaiQH = 0;

  loans.forEach(({ idx, r }) => {
    if (!_laikhTickState[idx]) return;
    tickedCount++;
    totalGoc += Number(_laikhTragocState[idx]) || 0;

    const daThuRawD = parseVNDate(r[23]);
    const ngayGND   = parseVNDate(r[6]);
    const ngayDHD   = parseVNDate(r[24]);
    const useNgayGN = !daThuRawD;
    const mocBatDau = useNgayGN ? ngayGND : daThuRawD;
    const duNo = Number(r[11]) || 0;
    const ls   = Number(r[8])  || 0;

    if (!mocBatDau || !ls || duNo <= 0 || ngayChot < mocBatDau) return;

    if (ngayDHD && ngayChot > ngayDHD) {
      // Quá hạn: tính 2 phần
      if (ngayDHD >= mocBatDau) {
        totalLaiTH += tinhLai365(duNo, ls, mocBatDau, ngayDHD).tienLai;
      }
      const soNgayQH = Math.round((ngayChot - ngayDHD) / 86400000);
      if (soNgayQH > 0) totalLaiQH += duNo * (LS_QH / 100) / 365 * soNgayQH;
    } else {
      totalLaiTH += tinhLai365(duNo, ls, mocBatDau, ngayChot).tienLai;
    }
  });

  const totalLai = totalLaiTH + totalLaiQH;
  $('laikh-count').textContent = fmtNum(tickedCount);
  $('laikh-total-goc').textContent = fmtMoney(totalGoc) + ' đồng';
  $('laikh-total-lai').textContent = fmtMoney(totalLai) + ' đồng';
  $('laikh-total-thu').textContent = fmtMoney(totalGoc + totalLai) + ' đồng';

  window._laikhLastResult = {
    kh: _laikhSelectedCustomer.ten,
    ma: _laikhSelectedCustomer.ma,
    ngayChot: fmtVNDate(ngayChot),
    tickedCount, totalGoc, totalLaiTH, totalLaiQH, totalLai,
    tongThu: totalGoc + totalLai,
    tickedLoans: loans.filter(o => _laikhTickState[o.idx]).map(o => {
      const rawD = parseVNDate(o.r[23]);
      const usedGN = !rawD;
      return {
        sohd: o.r[2], duNo: Number(o.r[11]) || 0, ls: Number(o.r[8]) || 0,
        daThu: usedGN ? o.r[6] : o.r[23], ngayDenHan: o.r[24],
        daThuGoc: o.r[23], usedNgayGN: usedGN,
        tragoc: Number(_laikhTragocState[o.idx]) || 0,
      };
    }),
  };
}

function laikhResetTable() {
  _laikhSelectedCustomer = null;
  _laikhTickState = {};
  _laikhTragocState = {};
  $('laikh-search').value = '';
  $('laikh-ngaychot').value = '';
  $('laikh-selected').style.display = 'none';
  $('laikh-table-wrap').style.display = 'none';
  $('laikh-empty').style.display = 'block';
  $('laikh-reset-btn').style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   FIX NGÀY BỊ ĐẢO — Cờ thông báo re-import
   ═══════════════════════════════════════════════════════════════ */
function fixSwappedDates() {
  // ✅ FIX BUG NGÀY ĐẢO MM/DD ↔ DD/MM (smartDateToVN không kiểm tra _ipcasImportMode ở nhánh ambiguous)
  // - Bản v1 cũ: chỉ set flag, không fix dữ liệu đã import lỗi
  // - Bản v2:    tự động đảo lại ngày ambiguous (cả ngày & tháng ≤ 12) cho các cột IPCAS-sourced
  //              → KH có ngày đến hạn HMTD bị sai (vd: 07/05 ↔ 05/07) sẽ được sửa ngay
  const OLD_FLAG = 'qltd_date_format_fixed_v1';
  const NEW_FLAG = 'qltd_date_format_fixed_v2_ipcas_us_swap';
  if (localStorage.getItem(NEW_FLAG)) return; // đã chạy v2 → bỏ qua

  // Chỉ chạy auto-fix nếu trước đó user đã import IPCAS với code v1 lỗi
  const wasOldImport = !!localStorage.getItem(OLD_FLAG);
  if (!wasOldImport || !DATA.qltd || DATA.qltd.length === 0) {
    safeLSSet(NEW_FLAG, '1');
    return;
  }

  // 8 cột date đến từ IPCAS (qua transformIPCAS → smartDateToVN)
  // r[3]=apprdt, r[4]=apprdt(dup), r[6]=dsbsdt, r[7]=dsbsmatdt,
  // r[23]=lstintchrgprd, r[24]=apprmatdt, r[25]=nxtrpmtschddt, r[26]=lstrpmtdt
  const dateCols = [3, 4, 6, 7, 23, 24, 25, 26];
  let fixedCount = 0, fixedRows = 0;

  DATA.qltd.forEach(r => {
    let rowChanged = false;
    dateCols.forEach(c => {
      const v = String(r[c] == null ? '' : r[c]).trim();
      if (!v) return;
      const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) return;
      const p1 = +m[1], p2 = +m[2], yr = +m[3];
      // Chỉ swap khi cả 2 đều ∈ [1..12] (ambiguous → bị bug v1 đảo)
      if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 12 && p1 !== p2) {
        // Đảo: stored là (dd=p1, mm=p2) → thực tế từ IPCAS là (mm=p1, dd=p2) → sửa thành (p2/p1)
        r[c] = `${String(p2).padStart(2,'0')}/${String(p1).padStart(2,'0')}/${yr}`;
        fixedCount++;
        rowChanged = true;
      }
    });
    if (rowChanged) fixedRows++;
  });

  safeLSSet(NEW_FLAG, '1');

  if (fixedCount > 0) {
    // Lưu dữ liệu đã sửa vào localStorage
    if (typeof saveData === 'function') saveData(true);
    // Báo cho user (trễ 1.5s để init xong, toast hiện rõ)
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(`✅ Đã tự sửa ${fixedCount} ngày bị đảo MM/DD ↔ DD/MM trên ${fixedRows} HSVV (lỗi import IPCAS cũ)`, 'success');
      }
      console.info(`[DATE-FIX v2] Đã đảo ${fixedCount} ngày ambiguous trên ${fixedRows} dòng. Nếu vẫn còn ngày sai (do swap không đúng với date user nhập tay), hãy Nhập lại file IPCAS.`);
    }, 1500);
  } else {
    console.info('[DATE-FIX v2] Không có ngày nào cần sửa.');
  }
}

async function init() {
  try {
    const src = await loadData();
    if (!src || !DATA.qltd.length) {
      DATA.qltd = JSON.parse(JSON.stringify(SAMPLE_QLTD));
      console.info('[INIT] Loaded default sample data:', DATA.qltd.length, 'records');
    } else {
      console.info('[INIT] Loaded from', src, ':', DATA.qltd.length, 'records');
    }
  } catch (e) { console.error('[INIT] loadData failed:', e); }
  // ✅ v13.7.6 SSOT: HSVRate.healOnLoad — phục hồi r[8] từ _sprdRaw (idempotent, versioned flag)
  try {
    if (window.HSVRate && window.HSVRate.healOnLoad) {
      var __hr = window.HSVRate.healOnLoad(false);
      if (__hr && (__hr.healed || __hr.cleared || __hr.stale)) {
        console.info('[INIT] HSVRate.healOnLoad:', __hr);
        if (__hr.healed && typeof saveData === 'function') saveData(true);
      }
    }
    // Legacy fallback (giữ để an toàn nếu HSVRate chưa nạp): KHÔNG tự ghi nữa, chỉ log.
  } catch (e) { console.error('[INIT] HSVRate.healOnLoad failed:', e); }
  // ✅ FIX TRIỆT ĐỂ v13.8.4: chạy normalize trực tiếp trong init sau loadData,
  // không phụ thuộc polling/window.DATA nên dữ liệu 1900/850/0.085 được sửa và lưu ngay.
  try { if (typeof __normalizeAllRates === 'function') __normalizeAllRates('init', true); } catch (e) { console.error('[INIT] __normalizeAllRates failed:', e); }
  // ✅ FIX v13.7.9: phát hiện dữ liệu L/S cũ bị 0 (do bản patch cũ ghi đè) — flag + banner
  try { if (typeof repairSprdRatesOnLoad === 'function') repairSprdRatesOnLoad(); } catch (e) { console.error('[INIT] repairSprdRatesOnLoad failed:', e); }
  // ✅ FIX NGÀY: Sửa các ngày bị đảo MM/DD→DD/MM do _ipcasImportMode cũ
  try { fixSwappedDates(); } catch (e) { console.error('[INIT] fixSwappedDates failed:', e); }
  // ITEM 4: Áp mapping SỐ TẬP + SỐ TÀI KHOẢN từ TK_so_tap.xlsx (match tên+mã KH)
  try { if (typeof applyTKSTTMapping === 'function') applyTKSTTMapping(); } catch (e) { console.error('[INIT] applyTKSTTMapping failed:', e); }
  // Thêm placeholder rows cho KH trong TKSTT nhưng chưa có trong IPCAS
  try { if (typeof injectTKSTTPlaceholders === 'function') injectTKSTTPlaceholders(); } catch (e) { console.error('[INIT] injectTKSTTPlaceholders failed:', e); }
  // ✅ Mặc định sắp xếp 3 menu QLTD / KD / TD theo SỐ HĐTD (cột 2) tăng dần
  try {
    // v14.12: KHÔNG ép sortState nữa — mặc định là thứ tự CHUẨN Phòng ban → CBTD,
    // các cột dưới đây chỉ còn là khoá phụ trong từng CBTD.
    window.TD_DEFSEC = window.TD_DEFSEC || { qltd: 2, kd: 2, td: 2, laidong: 23, chlm: 24, denhan: 7 };
  } catch (e) { console.error('[INIT] sortState failed:', e); }
  try { refreshBadges(); } catch (e) { console.error('[INIT] refreshBadges failed:', e); }
  // ✅ FIX LỌC DỮ LIỆU: đảm bảo danh sách CBTD luôn có (tái tạo từ DATA.qltd) trước khi build dropdown.
  try { if (typeof autoGenerateMaCB === 'function') autoGenerateMaCB(); } catch (e) { console.error('[INIT] autoGenerateMaCB failed:', e); }
  try { initDashboardFilters(); } catch (e) { console.error('[INIT] initDashboardFilters failed:', e); }
  try { renderDashboard(); } catch (e) { console.error('[INIT] renderDashboard failed:', e); }
  setTimeout(checkAndNotify, 600);
}


// Close laikh search dropdown when clicking outside
document.addEventListener('click', e => {
  const results = $('laikh-results');
  if (!results || results.style.display === 'none') return;
  const search = $('laikh-search');
  if (search && !search.contains(e.target) && !results.contains(e.target)) {
    results.style.display = 'none';
  }
});
// Auto-normalize any date-input-vn on page load (for values set by JS)
function refreshAllDateInputsVisual() {
  document.querySelectorAll('.date-input-vn').forEach(el => {
    if (el.value.trim()) {
      const norm = normalizeDateString(el.value);
      if (norm) { el.value = norm; markDateInputState(el, true); }
      else markDateInputState(el, false);
    }
  });
}

// PRO-19 FIX: Bỏ đoạn xóa storage khi khởi động — dữ liệu đã lưu sẽ được giữ nguyên
window.addEventListener('DOMContentLoaded', function() {
    // P2-2 FIX: centralized init sequence with error boundary
    try { init(); } catch(e) { console.error('[init] Failed:', e); }
    setTimeout(function(){ try { updateTableTopScrollbars(); } catch(e) { console.warn('[updateTableTopScrollbars]', e); } }, 300);
  });
window.addEventListener('resize', () => updateTableTopScrollbars());
