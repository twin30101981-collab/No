
// ═══════════════════════════════════════════════════════
// IMPORT FILE MODULE — v1.0
// Hỗ trợ: Excel (SheetJS) + Word/docx (mammoth.js + Claude AI)
// ═══════════════════════════════════════════════════════

// ─── FIELD MAPPING: labelAPC → elementId ───
const IM_FIELD_MAP = {
  '[Số HĐ tín dụng]':'soHDTD','[Ngày HĐ tín dụng]':'ngayHDTD','[Số HĐ tín dụng cũ]':'soHDTDCu',
  '[Ngày HĐ tín dụng cũ]':'ngayHDTDCu','[Ngày giao-nhận]':'ngayGiaoNhan','[Ngày bìa HS]':'ngayBia',
  '[Ngày CIC]':'ngayCIC','[Số ủy quyền TD]':'soUyQuyen','[Người QHKH/QLN]':'nguoiQHKH',
  '[Người thẩm định]':'nguoiThamDinh','[Người duyệt]':'nguoiDuyet','[Chức vụ người duyệt]':'chucVuDuyet',
  '[Thể loại vay]':'theLoaiVay','[Mã khách hàng]':'maKH','[Tài khoản thanh toán]':'tkTT',
  '[Xưng hô]':'xungHo','[Nam/nữ]':'gioiTinh','[Tên khách hàng vay]':'tenKH',
  '[Tên khách hàng in hoa]':'tenKHHoa','[Loại CMND]':'loaiCMND','[CMND]':'cmnd',
  '[Năm sinh người vay]':'ngaySinh','[Địa chỉ]':'diaChi','[Địa chỉ theo hộ khẩu]':'diaChiHK',
  '[Số điện thoại]':'sdt','[Nghề nghiệp]':'ngheNghiep','[Địa chỉ kinh doanh]':'diaChiKD',
  '[Đăng ký kinh doanh số]':'dkkd','[Người thừa kế]':'tenTK','[Xưng hô người thừa kế]':'xungHoTK',
  '[Quan hệ người thừa kế]':'quanHeTK','[Loại CMT người thừa kế]':'loaiCMNDTK',
  '[Năm sinh người thừa kế]':'ngaySinhTK','[CMT người thừa kế]':'cmndTK',
  '[Địa chỉ người thừa kế]':'diaChiTK','[Hộ khẩu người thừa kế]':'hoKhauTK',
  '[Mục đích vay]':'mucDichVay','[Mục đích vay cụ thể]':'mucDichCuThe',
  '[Phương thức thanh toán]':'phuongThucTT','[Số tiền vay]':'soTienVay',
  '[HMTD duyệt]':'hmtdDuyet','[Thời hạn vay]':'thoiHan','[Lãi suất vay]':'laiSuat',
  '[Ngày đến hạn HMTD]':'ngayDenHan','[Ngày trả nợ cuối cùng]':'ngayTraNoCuoi',
  '[Dư nợ]':'duNo','[Tổng nhu cầu vốn]':'ncv','[Vốn tự có]':'vonTuCo',
  '[Chấm điểm]':'chamDiem','[Xếp hạng]':'xepHangKH',
  '[Ngày nhận nợ]':'ngayNhanNo','[Số tiền nhận nợ NN]':'soTienNN',
  '[Người thụ hưởng]':'nthNN','[CCCD/Căn cước]':'cmndNthNN',
  '[Địa chỉ người thụ hưởng]':'diaChiNthNN','[TK người thụ hưởng]':'tkNthNN',
  '[Mở tại ngân hàng]':'moTaiNH',
  '[SĐ.Chủ tài sản]':'chuTS','[SĐ.Tên TSBĐ]':'tenTSBD','[SĐ.Loại đất]':'loaiDat',
  '[SĐ.Số bìa đỏ]':'soBiaDo','[SĐ.Địa chỉ đất]':'diaChiDat','[SĐ.Diện tích đất]':'dtDat',
  '[SĐ.Số thửa]':'soThua','[SĐ.Số tờ bản đồ]':'soToBanDo','[SĐ.Thời hạn sử dụng]':'thoiHanSD',
  '[SĐ.Nguồn gốc]':'nguonGoc','[SĐ.Số BBĐG]':'soBBDG','[SĐ.Ngày BBĐG]':'ngayBBDG',
  '[SĐ.Giá đất G0]':'giaDatG0','[SĐ.Diện tích XD]':'dtXD','[SĐ.Diện tích SD]':'dtSD',
  '[SĐ.Số HĐ thế chấp]':'soHDTC','[SĐ.Ngày ký HĐTC]':'ngayKyHDTC',
};

// Tên hiển thị dễ đọc
const IM_LABELS = {
  'tenKH':'Tên khách hàng','cmnd':'Số CCCD/CMND','ngaySinh':'Ngày sinh',
  'diaChi':'Địa chỉ thường trú','sdt':'Số điện thoại','ngheNghiep':'Nghề nghiệp',
  'soHDTD':'Số HĐ tín dụng','ngayHDTD':'Ngày HĐ tín dụng','maKH':'Mã khách hàng',
  'tkTT':'Tài khoản thanh toán','xungHo':'Xưng hô','gioiTinh':'Giới tính',
  'loaiCMND':'Loại CMND','diaChiHK':'Địa chỉ hộ khẩu','diaChiKD':'Địa chỉ kinh doanh',
  'ngheNghiep':'Nghề nghiệp/KD','dkkd':'Số ĐKKD','mucDichVay':'Mục đích vay',
  'soTienVay':'Số tiền vay','thoiHan':'Thời hạn vay','laiSuat':'Lãi suất',
  'ngayNhanNo':'Ngày nhận nợ','nthNN':'Người thụ hưởng','soTienNN':'Số tiền nhận nợ',
  'tenTK':'Tên người thừa kế','quanHeTK':'Quan hệ thừa kế',
};

let imExtracted = {}; // Kết quả đã trích xuất

// ─── OPEN / CLOSE ───
function importModalOpen() {
  document.getElementById('import-modal-ov').classList.add('open');
  imReset();
}
function importModalClose() {
  document.getElementById('import-modal-ov').classList.remove('open');
}

// ─── TABS ───
function imSwitchTab(tab, el) {
  document.querySelectorAll('.im-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.im-tab-pane').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('im-pane-'+tab).classList.add('active');
  imReset();
}

// ─── RESET STATE ───
function imReset() {
  document.getElementById('im-progress').style.display = 'none';
  document.getElementById('im-preview').style.display = 'none';
  document.getElementById('im-error').style.display = 'none';
  imExtracted = {};
}

// ─── DRAG & DROP ───
function imDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}
function imDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}
function imHandleDrop(e, mode) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) imProcessFile(file, mode);
}
function imHandleFileInput(e, mode) {
  const file = e.target.files[0];
  if (file) imProcessFile(file, mode);
  e.target.value = '';
}

// ─── PROCESS FILE ───
async function imProcessFile(file, mode) {
  imReset();
  imShowProgress('Đang đọc file...', file.name);
  try {
    if (mode === 'excel') {
      await imParseExcel(file);
    } else {
      await imParseWord(file);
    }
  } catch(err) {
    imShowError('❌ Lỗi xử lý file: ' + err.message);
  }
}

// ─── EXCEL PARSER ───
async function imParseExcel(file) {
  // Lazy-load SheetJS nếu chưa có
  if (typeof XLSX === 'undefined') {
    imShowProgress('Đang tải thư viện SheetJS...', '');
    await loadSheetJS();
  }
  imShowProgress('Đang phân tích bảng tính...', file.name);
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

  const result = {};

  // Mode 1: Key-Value (cột A = nhãn, cột B = giá trị)
  // Mode 2: Header row (dòng 1 = nhãn, dòng 2 = giá trị)
  // Auto-detect: nếu dòng 1 cột A có nhiều hơn 3 dòng giống format key-value

  const isKV = rows.length > 2 && rows.slice(0,5).filter(r => r[0] && !r[1] && !r[2]).length >= 2;

  if (isKV || (rows[0] && rows[0].length <= 3)) {
    // Key-value: mỗi dòng [nhãn, giá trị]
    rows.forEach(r => {
      const key = String(r[0]||'').trim();
      const val = String(r[1]||'').trim();
      if (!key || !val) return;
      // Tìm trong map
      for (const [label, elId] of Object.entries(IM_FIELD_MAP)) {
        const clean = label.replace(/[\[\]]/g,'').toLowerCase();
        if (key.toLowerCase().includes(clean) || clean.includes(key.toLowerCase())) {
          result[elId] = val; break;
        }
      }
      // Fallback: tìm theo tên field phổ biến
      imMatchByKeyword(key, val, result);
    });
  } else {
    // Header row: dòng 1 là header, dòng 2 trở đi là data
    const headers = rows[0] || [];
    const dataRow = rows[1] || [];
    headers.forEach((h, i) => {
      const key = String(h||'').trim();
      const val = String(dataRow[i]||'').trim();
      if (!key || !val) return;
      for (const [label, elId] of Object.entries(IM_FIELD_MAP)) {
        const clean = label.replace(/[\[\]]/g,'').toLowerCase();
        if (key.toLowerCase().includes(clean) || clean.includes(key.toLowerCase())) {
          result[elId] = val; break;
        }
      }
      imMatchByKeyword(key, val, result);
    });
  }

  imShowPreview(result, '📊 Đọc từ file Excel: ' + file.name);
}

// ─── WORD/DOCX PARSER (mammoth.js — xử lý cục bộ, không cần API key) ───
async function imParseWord(file) {
  // 1. Lazy-load mammoth.js — thử nhiều CDN theo thứ tự ưu tiên
  if (typeof mammoth === 'undefined') {
    /* OFFLINE: mammoth.js bundled inline */
    throw new Error('mammoth.js không có sẵn (bundle offline lỗi)');
  }

  // 2. Đọc text từ .docx
  imShowProgress('Đang đọc nội dung file Word...', file.name);
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  const text = result.value;
  if (!text || text.length < 20) throw new Error('File Word không có nội dung text');

  // 3. Trích xuất cục bộ bằng regex (không cần AI)
  imShowProgress('🔍 Đang phân tích tài liệu...', 'Xử lý cục bộ');
  const fields = imLocalExtract(text);

  imShowPreview(fields, '📄 Trích xuất từ Word: ' + file.name);
}

// ─── LOCAL EXTRACT ENGINE (thay thế Claude AI) ───
// Phân tích văn bản .docx bằng regex + keyword matching — không cần API
function imLocalExtract(text) {
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Chuẩn hoá chuỗi so sánh (bỏ dấu, thường hoá)
  function norm(s) {
    return String(s||'').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/đ/g,'d').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }

  // Tìm value sau label trên cùng dòng hoặc dòng kế tiếp
  function findAfterLabel(patterns) {
    const pats = Array.isArray(patterns) ? patterns : [patterns];
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const lnN = norm(ln);
      for (const pat of pats) {
        const patN = norm(pat);
        if (!lnN.includes(patN)) continue;
        // Thử tách value sau dấu : hoặc - trên cùng dòng
        const sep = ln.indexOf(':');
        if (sep !== -1) {
          const val = ln.slice(sep + 1).trim();
          if (val && val.length > 1) return val;
        }
        // Value ở dòng kế
        if (i + 1 < lines.length && lines[i+1].length > 1) return lines[i+1].trim();
      }
    }
    return null;
  }

  // Tìm value theo placeholder [Label] trong văn bản
  function findByPlaceholder(label) {
    const escaped = label.replace(/[[\]().*+?^${}|\\]/g, '\\$&');
    const re = new RegExp(escaped + '[:\\s]*([^\\[\\n\\r]{2,100})', 'i');
    const m = text.match(re);
    if (m) return m[1].trim().replace(/^[:\s\-—]+/, '').trim();
    return null;
  }

  // Chuẩn hoá ngày về YYYY-MM-DD
  function parseToISO(s) {
    if (!s) return null;
    const m = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    const m2 = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m2) return `${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`;
    return null;
  }

  // ── 1. Tên khách hàng ──────────────────────────────────────────
  let tenKH = findAfterLabel(['Họ và tên','Họ tên','Tên khách hàng','Tên KH','Người vay','Bên vay'])
           || findByPlaceholder('[Tên khách hàng vay]')
           || findByPlaceholder('[Tên khách hàng in hoa]');
  // Loại bỏ nếu value trông như label khác
  if (tenKH && tenKH.length < 100 && /[a-zắăâêôơưáàảãạéèẻẽẹ]/i.test(tenKH)) result['tenKH'] = tenKH;

  // ── 2. CCCD / CMND ──────────────────────────────────────────────
  let cccdRaw = findAfterLabel(['Số CCCD','Số CMND','CCCD','CMND','Căn cước công dân','Chứng minh nhân dân','Chứng minh thư']);
  if (!cccdRaw) cccdRaw = findByPlaceholder('[CMND]') || findByPlaceholder('[CCCD/Căn cước]');
  if (cccdRaw) {
    result['cmnd'] = cccdRaw.trim();
  } else {
    // Tìm chuỗi 12 chữ số độc lập (CCCD mới) hoặc 9 chữ số (CMND cũ)
    const m12 = text.match(/\b(\d{12})\b/);
    const m9  = text.match(/\b(\d{9})\b/);
    if (m12) result['cmnd'] = m12[1];
    else if (m9) result['cmnd'] = m9[1];
  }
  // Loại CMND
  if (/căn cước công dân|cccd/i.test(text)) result['loaiCMND'] = 'CCCD';
  else if (/chứng minh (nhân dân|thư)|cmnd/i.test(text)) result['loaiCMND'] = 'CMND';

  // ── 3. Ngày sinh ─────────────────────────────────────────────────
  let nsRaw = findAfterLabel(['Ngày sinh','Sinh ngày','Năm sinh'])
           || findByPlaceholder('[Năm sinh người vay]');
  if (nsRaw) {
    const iso = parseToISO(nsRaw);
    result['ngaySinh'] = iso || nsRaw;
  }

  // ── 4. Địa chỉ thường trú ────────────────────────────────────────
  let dcRaw = findAfterLabel(['Địa chỉ thường trú','Thường trú','Hộ khẩu thường trú','Nơi đăng ký hộ khẩu','Địa chỉ KH','Địa chỉ'])
           || findByPlaceholder('[Địa chỉ]');
  if (dcRaw && dcRaw.length < 200) result['diaChi'] = dcRaw;

  // ── 5. Địa chỉ hộ khẩu ──────────────────────────────────────────
  let dchk = findAfterLabel(['Địa chỉ theo hộ khẩu','Hộ khẩu','Địa chỉ hộ khẩu'])
          || findByPlaceholder('[Địa chỉ theo hộ khẩu]');
  if (dchk && dchk.length < 200) result['diaChiHK'] = dchk;

  // ── 6. Số điện thoại ─────────────────────────────────────────────
  let sdtRaw = findAfterLabel(['Số điện thoại','Điện thoại','SĐT','SDT','Mobile','Phone'])
            || findByPlaceholder('[Số điện thoại]');
  if (sdtRaw) {
    const m = sdtRaw.match(/0[3-9]\d{8}/);
    result['sdt'] = m ? m[0] : sdtRaw;
  } else {
    const m = text.match(/\b(0[3-9]\d{8})\b/);
    if (m) result['sdt'] = m[1];
  }

  // ── 7. Nghề nghiệp ───────────────────────────────────────────────
  let nn = findAfterLabel(['Nghề nghiệp','Ngành nghề','Nghề','Công việc'])
        || findByPlaceholder('[Nghề nghiệp]');
  if (nn && nn.length < 100) result['ngheNghiep'] = nn;

  // ── 8. Xưng hô / Giới tính ──────────────────────────────────────
  let xhRaw = findAfterLabel(['Xưng hô','Giới tính']) || findByPlaceholder('[Xưng hô]');
  if (xhRaw) {
    if (/^ông$/i.test(xhRaw.trim())) { result['xungHo']='Ông'; result['gioiTinh']='Nam'; }
    else if (/^bà$/i.test(xhRaw.trim())) { result['xungHo']='Bà'; result['gioiTinh']='Nữ'; }
    else result['xungHo'] = xhRaw.trim();
  } else if (/\bÔng\b/.test(text)) { result['xungHo']='Ông'; result['gioiTinh']='Nam'; }
  else if (/\bBà\b/.test(text)) { result['xungHo']='Bà'; result['gioiTinh']='Nữ'; }

  // ── 9. Mã khách hàng ─────────────────────────────────────────────
  let maKH = findAfterLabel(['Mã khách hàng','Mã KH']) || findByPlaceholder('[Mã khách hàng]');
  if (maKH) result['maKH'] = maKH.trim();

  // ── 10. Tài khoản thanh toán ─────────────────────────────────────
  let tktt = findAfterLabel(['Tài khoản thanh toán','Số tài khoản','TK TT','TK thanh toán'])
          || findByPlaceholder('[Tài khoản thanh toán]');
  if (tktt) result['tkTT'] = tktt.trim();

  // ── 11. Số HĐ tín dụng ───────────────────────────────────────────
  let sohd = findAfterLabel(['Số hợp đồng tín dụng','Số HĐ tín dụng','Số HĐTD','Số hợp đồng','Số HĐ'])
          || findByPlaceholder('[Số HĐ tín dụng]');
  if (sohd) result['soHDTD'] = sohd.trim();

  // ── 12. Ngày HĐ tín dụng ─────────────────────────────────────────
  let ngayHD = findAfterLabel(['Ngày ký hợp đồng tín dụng','Ngày HĐ tín dụng','Ngày HĐTD','Ngày hợp đồng','Ngày ký HĐ'])
            || findByPlaceholder('[Ngày HĐ tín dụng]');
  if (ngayHD) { const iso=parseToISO(ngayHD); result['ngayHDTD']=iso||ngayHD; }

  // ── 13. Số tiền vay ───────────────────────────────────────────────
  let stvRaw = findAfterLabel(['Số tiền vay','Số tiền đề nghị vay','Hạn mức tín dụng','HMTD','Số tiền cho vay'])
            || findByPlaceholder('[Số tiền vay]') || findByPlaceholder('[HMTD duyệt]');
  if (stvRaw) {
    const num = stvRaw.replace(/[.,\s]/g,'').match(/\d{6,}/);
    result['soTienVay'] = num ? num[0] : stvRaw;
  } else {
    // Tìm số tiền lớn kèm đơn vị VND/đồng/tỷ/triệu
    const mMoney = text.match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:đồng|VND|vnđ)/i);
    if (mMoney) result['soTienVay'] = mMoney[1].replace(/[.,]/g,'');
    else {
      const mTy = text.match(/(\d+(?:[,.]\d+)?)\s*tỷ/i);
      if (mTy) result['soTienVay'] = String(Math.round(parseFloat(mTy[1].replace(',','.')) * 1e9));
    }
  }

  // ── 14. Thời hạn vay ──────────────────────────────────────────────
  let th = findAfterLabel(['Thời hạn vay','Thời hạn cho vay','Thời hạn','Kỳ hạn'])
        || findByPlaceholder('[Thời hạn vay]');
  if (th) result['thoiHan'] = th.trim();
  else {
    const mTH = text.match(/(\d+)\s*(tháng|năm)\b/i);
    if (mTH) result['thoiHan'] = mTH[0];
  }

  // ── 15. Lãi suất ──────────────────────────────────────────────────
  let lsRaw = findAfterLabel(['Lãi suất vay','Lãi suất cho vay','Lãi suất','LS vay'])
           || findByPlaceholder('[Lãi suất vay]');
  if (lsRaw) {
    const pct = lsRaw.match(/[\d.,]+/);
    result['laiSuat'] = pct ? pct[0] : lsRaw;
  } else {
    const mLS = text.match(/(\d+(?:[,.]\d+)?)\s*%\s*\/\s*năm/i);
    if (mLS) result['laiSuat'] = mLS[1].replace(',','.');
  }

  // ── 16. Mục đích vay ──────────────────────────────────────────────
  let mdv = findAfterLabel(['Mục đích vay','Mục đích sử dụng vốn','Mục đích sử dụng','Mục đích'])
         || findByPlaceholder('[Mục đích vay]') || findByPlaceholder('[Mục đích vay cụ thể]');
  if (mdv && mdv.length < 300) result['mucDichVay'] = mdv;

  // ── 17. Địa chỉ kinh doanh ────────────────────────────────────────
  let dckd = findAfterLabel(['Địa chỉ kinh doanh','Địa chỉ SXKD','Địa chỉ KD','Trụ sở kinh doanh'])
          || findByPlaceholder('[Địa chỉ kinh doanh]');
  if (dckd && dckd.length < 200) result['diaChiKD'] = dckd;

  // ── 18. Đăng ký kinh doanh ────────────────────────────────────────
  let dkkd = findAfterLabel(['Số đăng ký kinh doanh','Đăng ký kinh doanh số','Số ĐKKD','ĐKKD','GPKD'])
          || findByPlaceholder('[Đăng ký kinh doanh số]');
  if (dkkd) result['dkkd'] = dkkd.trim();

  // ── 19. Người QHKH / CBTD ────────────────────────────────────────
  let cbtd = findAfterLabel(['Cán bộ tín dụng','CBTD','Người QHKH','Người quản lý','Cán bộ quản lý'])
          || findByPlaceholder('[Người QHKH/QLN]');
  if (cbtd) result['nguoiQHKH'] = cbtd.trim();

  // ── 20. Người thẩm định ───────────────────────────────────────────
  let ntd = findAfterLabel(['Người thẩm định','Cán bộ thẩm định'])
         || findByPlaceholder('[Người thẩm định]');
  if (ntd) result['nguoiThamDinh'] = ntd.trim();

  // ── 21. Người duyệt / Giám đốc ───────────────────────────────────
  let nd = findAfterLabel(['Giám đốc','Người duyệt','Người phê duyệt'])
        || findByPlaceholder('[Người duyệt]');
  if (nd) result['nguoiDuyet'] = nd.trim();

  // ── 22. Ngày nhận nợ ─────────────────────────────────────────────
  let ngayNN = findAfterLabel(['Ngày nhận nợ','Ngày giải ngân','Ngày cho vay'])
            || findByPlaceholder('[Ngày nhận nợ]');
  if (ngayNN) { const iso=parseToISO(ngayNN); result['ngayNhanNo']=iso||ngayNN; }

  // ── 23. Số tiền nhận nợ ───────────────────────────────────────────
  let stNN = findAfterLabel(['Số tiền nhận nợ','Số tiền giải ngân']) || findByPlaceholder('[Số tiền nhận nợ NN]');
  if (stNN) { const n=stNN.replace(/[.,\s]/g,'').match(/\d{6,}/); result['soTienNN']=n?n[0]:stNN; }

  // ── 24. Thể loại vay ──────────────────────────────────────────────
  let tlv = findAfterLabel(['Thể loại vay','Loại hình vay','Loại vay']) || findByPlaceholder('[Thể loại vay]');
  if (tlv) result['theLoaiVay'] = tlv.trim();

  // ── 25. Thông tin TSBĐ (Sổ đỏ) ───────────────────────────────────
  let chuTS = findAfterLabel(['Chủ tài sản','Chủ sở hữu']) || findByPlaceholder('[SĐ.Chủ tài sản]');
  if (chuTS) result['chuTS'] = chuTS.trim();

  let tenTSBD = findAfterLabel(['Tên TSBĐ','Tài sản bảo đảm']) || findByPlaceholder('[SĐ.Tên TSBĐ]');
  if (tenTSBD) result['tenTSBD'] = tenTSBD.trim();

  let soBD = findAfterLabel(['Số bìa đỏ','Số GCN','Số sổ đỏ']) || findByPlaceholder('[SĐ.Số bìa đỏ]');
  if (soBD) result['soBiaDo'] = soBD.trim();

  let dtDat = findAfterLabel(['Diện tích đất','Diện tích','DT đất']) || findByPlaceholder('[SĐ.Diện tích đất]');
  if (dtDat) result['dtDat'] = dtDat.trim();

  let dcDat = findAfterLabel(['Địa chỉ đất','Địa chỉ thửa đất','Vị trí thửa đất']) || findByPlaceholder('[SĐ.Địa chỉ đất]');
  if (dcDat && dcDat.length < 200) result['diaChiDat'] = dcDat;

  // ── 26. Người thừa kế ────────────────────────────────────────────
  let tenTK = findAfterLabel(['Người thừa kế','Người thụ hưởng bảo hiểm']) || findByPlaceholder('[Người thừa kế]');
  if (tenTK) result['tenTK'] = tenTK.trim();

  // ── 27. Phương thức thanh toán ────────────────────────────────────
  let pttt = findAfterLabel(['Phương thức thanh toán','Hình thức trả nợ']) || findByPlaceholder('[Phương thức thanh toán]');
  if (pttt) result['phuongThucTT'] = pttt.trim();

  // ── 28. Ngày đến hạn / Ngày trả nợ cuối ──────────────────────────
  let ndh = findAfterLabel(['Ngày đến hạn HMTD','Ngày đến hạn']) || findByPlaceholder('[Ngày đến hạn HMTD]');
  if (ndh) { const iso=parseToISO(ndh); result['ngayDenHan']=iso||ndh; }

  let ntnc = findAfterLabel(['Ngày trả nợ cuối cùng','Ngày kết thúc','Ngày tất toán']) || findByPlaceholder('[Ngày trả nợ cuối cùng]');
  if (ntnc) { const iso=parseToISO(ntnc); result['ngayTraNoCuoi']=iso||ntnc; }

  // ── 29. Fallback: quét từng dòng theo keyword ─────────────────────
  lines.forEach(line => {
    const sep = line.indexOf(':');
    if (sep > 0 && sep < line.length - 1) {
      const key = line.slice(0, sep).trim();
      const val = line.slice(sep + 1).trim();
      if (key && val && val.length > 1) imMatchByKeyword(key, val, result);
    }
    // Thử tách bằng dấu gạch ngang / em dash
    const sepDash = line.search(/\s[—\-]\s/);
    if (sepDash > 0) {
      const key2 = line.slice(0, sepDash).trim();
      const val2 = line.slice(sepDash).replace(/^[\s—\-]+/,'').trim();
      if (key2 && val2 && val2.length > 1) imMatchByKeyword(key2, val2, result);
    }
  });

  return result;
}

// ─── KEYWORD MATCHING FALLBACK ───
function imMatchByKeyword(key, val, result) {
  if (!key || !val) return;
  const k = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  const kws = [
    [['ho ten','ten kh','ten khach hang','ten nguoi vay'], 'tenKH'],
    [['cccd','cmnd','so cmnd','so cccd','can cuoc'], 'cmnd'],
    [['ngay sinh','nam sinh','sinh ngay'], 'ngaySinh'],
    [['dia chi','dia chi tt','dia chi thuong tru','diachi'], 'diaChi'],
    [['dien thoai','so dt','sdt','phone','mobile'], 'sdt'],
    [['nghe nghiep','nghe','kinh doanh'], 'ngheNghiep'],
    [['so hop dong','so hd','so hdtd'], 'soHDTD'],
    [['ma khach hang','ma kh'], 'maKH'],
    [['tai khoan','so tai khoan','tk tt'], 'tkTT'],
    [['so tien vay','so tien','tien vay'], 'soTienVay'],
    [['thoi han vay','thoi han','ky han'], 'thoiHan'],
    [['lai suat','ls'], 'laiSuat'],
    [['muc dich vay','muc dich'], 'mucDichVay'],
    [['dia chi kinh doanh','dia chi kd'], 'diaChiKD'],
    [['dang ky kinh doanh','dkkd','so dkkd'], 'dkkd'],
  ];
  for (const [patterns, id] of kws) {
    if (patterns.some(p => k.includes(p)) && !result[id]) {
      result[id] = val; break;
    }
  }
}

// ─── HIỂN THỊ PROGRESS ───
function imShowProgress(msg, sub) {
  const p = document.getElementById('im-progress');
  p.style.display = 'block';
  document.getElementById('im-progress-msg').textContent = msg;
  document.getElementById('im-progress-sub').textContent = sub;
  document.getElementById('im-preview').style.display = 'none';
  document.getElementById('im-error').style.display = 'none';
}

// ─── HIỂN THỊ LỖI ───
function imShowError(msg) {
  document.getElementById('im-progress').style.display = 'none';
  const el = document.getElementById('im-error');
  el.style.display = 'block';
  el.innerHTML = msg.replace(/\n/g,'<br>');
}

// ─── HIỂN THỊ PREVIEW ───
function imShowPreview(fields, title) {
  document.getElementById('im-progress').style.display = 'none';
  imExtracted = fields;

  const validFields = Object.entries(fields).filter(([,v]) => v && String(v).trim());
  const count = validFields.length;

  if (count === 0) {
    imShowError('⚠️ Không tìm thấy dữ liệu nào có thể nhận diện trong file này.\n\nGợi ý: Dùng file Excel template mẫu để đảm bảo nhận diện đúng trường.');
    return;
  }

  document.getElementById('im-preview-title-text').textContent = title;
  document.getElementById('im-found-count').textContent = count;
  document.getElementById('im-apply-count').textContent = count;
  document.getElementById('im-chk-all').checked = true;

  const tbody = document.getElementById('im-preview-tbody');
  tbody.innerHTML = '';
  validFields.forEach(([id, val]) => {
    const label = IM_LABELS[id] || id;
    const display = String(val).length > 80 ? String(val).slice(0,80)+'…' : String(val);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="pv-chk"><input type="checkbox" class="im-row-chk" data-id="${id}" checked onchange="imUpdateApplyCount()" style="accent-color:#7B3FBE;width:14px;height:14px"></td>
      <td style="white-space:nowrap;color:#5A7080;font-size:11px">${label}</td>
      <td class="pv-val">${display}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('im-preview').style.display = 'block';
}

// ─── TOGGLE ALL CHECKBOXES ───
function imToggleAll(checked) {
  document.querySelectorAll('.im-row-chk').forEach(c => c.checked = checked);
  imUpdateApplyCount();
}
function imUpdateApplyCount() {
  const n = document.querySelectorAll('.im-row-chk:checked').length;
  document.getElementById('im-apply-count').textContent = n;
}

// ─── ÁP DỤNG VÀO FORM ───
function imApplyFields() {
  const checked = [...document.querySelectorAll('.im-row-chk:checked')].map(c=>c.dataset.id);
  let applied = 0;
  checked.forEach(id => {
    const val = imExtracted[id];
    if (!val) return;
    const el = document.getElementById(id);
    if (!el) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      if (el.type === 'date') {
        // Chuyển nhiều định dạng về YYYY-MM-DD
        const d = imParseDate(String(val));
        if (d) { el.value = d; applied++; }
      } else {
        el.value = String(val);
        if (id === 'tenKH') {
          const upper = document.getElementById('tenKHHoa');
          if (upper) upper.value = String(val).toUpperCase();
        }
        applied++;
      }
    } else if (tag === 'select') {
      const opts = [...el.options];
      const match = opts.find(o =>
        o.value.toLowerCase() === String(val).toLowerCase() ||
        o.text.toLowerCase() === String(val).toLowerCase()
      );
      if (match) { el.value = match.value; applied++; }
      else { el.value = val; applied++; }
    }
    // Trigger input/change events
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  });

  // Cập nhật progress bar nếu có
  if (typeof updateProgress === 'function') updateProgress();
  if (typeof markUnsaved === 'function') markUnsaved();

  importModalClose();
  setTimeout(hsvvRecalcAll, 250); // ⚡ Recalc sau khi import điền form

  // Toast thông báo
  TD.toast(`✅ Đã điền ${applied} trường vào form!`, { type: 'success', duration: 3500 }); // HM-16c
}

// ─── PARSE DATE ───
function imParseDate(s) {
  if (!s) return null;
  // YYYY-MM-DD (đã chuẩn)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  let m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // DD-MM-YYYY
  m = s.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // YYYY/MM/DD
  m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return null;
}

// ─── LƯU API KEY ───
// ─── TẢI EXCEL TEMPLATE ───
function importDownloadTemplate() {
  // Tạo file Excel template với 2 cột: Trường | Giá trị
  if (typeof XLSX === 'undefined') {
    alert('Đang tải SheetJS, vui lòng thử lại sau 2 giây...');
    loadSheetJS().then(() => importDownloadTemplate());
    return;
  }
  const rows = [
    ['TEMPLATE HỒ SƠ VAY VỐN — AGRIBANK NAM ĐỊNH', ''],
    ['Điền thông tin vào cột "Giá trị". Không thay đổi cột "Tên trường".', ''],
    ['─────────────', '─────────────'],
    ['Tên trường', 'Giá trị'],
  ];
  const fields = [
    ['Tên khách hàng vay', ''],
    ['Số CCCD/CMND', 'Ví dụ: 012345678901 do Cục Cảnh sát QLHC cấp ngày 15/03/2020'],
    ['Ngày sinh', 'Ví dụ: 15/03/1985'],
    ['Xưng hô', 'Ông / Bà / Anh / Chị'],
    ['Nam/nữ', 'Nam / Nữ'],
    ['Địa chỉ thường trú', ''],
    ['Địa chỉ hộ khẩu', '(Nếu khác địa chỉ thường trú)'],
    ['Số điện thoại', ''],
    ['Nghề nghiệp/Kinh doanh', ''],
    ['Địa chỉ kinh doanh', ''],
    ['Số đăng ký kinh doanh', ''],
    ['Mã khách hàng', ''],
    ['Tài khoản thanh toán', ''],
    ['Số HĐ tín dụng', ''],
    ['Ngày HĐ tín dụng', 'YYYY-MM-DD'],
    ['Thể loại vay', 'Hạn mức / Từng lần / Trả góp / Luân chuyển'],
    ['Số tiền vay', 'Ví dụ: 500000000'],
    ['Thời hạn vay', 'Ví dụ: 12 (tháng)'],
    ['Lãi suất vay', 'Ví dụ: 6.5'],
    ['Mục đích vay', ''],
    ['Mục đích vay cụ thể', ''],
    ['Tên người thừa kế', ''],
    ['Quan hệ người thừa kế', 'Ví dụ: Vợ / Chồng / Con'],
    ['Người QHKH/QLN', ''],
    ['Người thẩm định', ''],
    ['Người duyệt', ''],
  ];
  fields.forEach(([k, hint]) => rows.push([k, hint]));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch:35},{wch:50}];
  // Style header rows
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Thông tin vay vốn');
  XLSX.writeFile(wb, `Template_HoSoVay_Agribank_NamDinh.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT CENTER — Features 1, 3, 4, 5
// ═══════════════════════════════════════════════════════════════════════════

// ── Template catalogue (41 files từ MAU_DOCXTEMPLATE_CONVERTED) ──────────
const EC_TEMPLATES = {
  HMTD: [
    '12C. BBKT TH HDKD vượt quyền',
    'Báo cáo tình hình thu nhập',
    'Báo cáo đánh giá xác định lại HMTD',
    'Báo cáo đề xuất cho vay',
    'Bìa hồ sơ tín dụng',
    'Bản kê khai người liên quan',
    'Bảng kê hàng tồn kho',
    'Bảng kê nợ phải thu',
    'Bảng kê nợ phải trả',
    'Danh mục Hồ sơ vay vốn',
    'Hợp đồng sửa đổi bổ sung HĐTD',
    'Hợp đồng tín dụng',
    'Nhắc nợ SMS',
    'Phiếu thu thập thông tin KH',
    'Phiếu thu thập thông tin KH vay mới',
    'Phiếu tra thông tin CIC',
    'Phương án sử dụng vốn',
    'Tờ trình giao dịch',
    'Tờ trình đề nghị thực hiện giao dịch',
  ],
  'TAI SAN': [
    'Biên bản XĐ giá trị TSĐB',
    'Biên bản XĐL giá trị TSTC',
    'Biên bản nội bộ XĐL giá trị TSBĐ',
    'Cam kết tài sản',
    'Danh mục tài sản',
    'Giấy ủy quyền giao nhận sổ đỏ',
    'HĐTC QSDĐ và TS gắn liền với đất',
    'HĐTC tài sản',
    'Nội dụng nhập tài sản cụ thể',
    'Thông báo giải tỏa tài sản TC',
    'Tờ trình đề nghị giải chấp TS',
    'Tờ trình đề nghị thay đổi thông tin TSĐB',
    'Tờ trình đề nghị thế chấp TSĐB',
    'Văn bản sửa đổi bổ sung HĐTC',
    'Đơn Đăng ký thế chấp',
    'Đơn đk xóa thế chấp',
  ],
  'GIAI NGAN': [
    'Báo cáo đề xuất giải ngân',
    'Biên bản đối chiếu KH',
    'Biên bản kiểm tra SDVV',
    'Biên bản kiểm tra tình hình HĐKD',
  ],
  KHAC: [
    'Giấy nộp tiền in sẵn',
    'Tờ trình đổ mực',
  ],
};

// Thư mục templates (đặt cùng cấp với file HTML)
const EC_BASE = 'templates';

// ── State ────────────────────────────────────────────────────────────────
const _ecSelected = new Set();

// ── Init & Open ──────────────────────────────────────────────────────────
function exportCenterOpen() {
  _ecRenderTemplateList();
  _ecRunValidation();
  _ecRenderPreview();
  document.getElementById('export-center-ov').classList.add('open');
}
function exportCenterClose() {
  document.getElementById('export-center-ov').classList.remove('open');
}

function _ecRenderTemplateList() {
  const groupMap = { HMTD:'ec-tpl-HMTD', 'TAI SAN':'ec-tpl-TAISAN', 'GIAI NGAN':'ec-tpl-GIAIGAN', KHAC:'ec-tpl-KHAC' };
  Object.entries(EC_TEMPLATES).forEach(([folder, files]) => {
    const container = document.getElementById(groupMap[folder]);
    if (!container) return;
    container.innerHTML = files.map(name => {
      const key = folder + '/' + name;
      const checked = _ecSelected.has(key) ? 'checked' : '';
      return `<div class="ec-tpl-item">
        <input type="checkbox" id="ectpl_${btoa(key).replace(/=/g,'')}" ${checked}
          onchange="_ecToggle('${key}',this.checked)">
        <label for="ectpl_${btoa(key).replace(/=/g,'')}">${name}</label>
      </div>`;
    }).join('');
  });
  _ecUpdateCount();
}

function _ecToggle(key, checked) {
  checked ? _ecSelected.add(key) : _ecSelected.delete(key);
  _ecUpdateCount();
}
function _ecUpdateCount() {
  const n = _ecSelected.size;
  const badge = document.getElementById('ec-count-badge');
  const btn   = document.getElementById('ec-export-btn');
  if (badge) badge.textContent = n + ' file';
  if (btn)   btn.disabled = n === 0;
}
function ecSelectAll()  { Object.entries(EC_TEMPLATES).forEach(([f,files]) => files.forEach(n => _ecSelected.add(f+'/'+n))); _ecRenderTemplateList(); }
function ecSelectNone() { _ecSelected.clear(); _ecRenderTemplateList(); }
function ecSelectGroup(g) {
  const map = { HMTD:'HMTD', TS:'TAI SAN', GN:'GIAI NGAN', KHAC:'KHAC' };
  const folder = map[g] || g;
  const files  = EC_TEMPLATES[folder] || [];
  files.forEach(n => _ecSelected.add(folder+'/'+n));
  _ecRenderTemplateList();
}

// ── FEATURE 4: Validation ────────────────────────────────────────────────
const EC_REQUIRED = [
  { id:'tenKH',      label:'Tên khách hàng vay', level:'error' },
  { id:'soHDTD',     label:'Số HĐ tín dụng',     level:'warn'  },
  { id:'ngayHDTD',   label:'Ngày HĐ tín dụng',   level:'warn'  },
  { id:'maKH',       label:'Mã khách hàng',       level:'warn'  },
  { id:'cmnd',       label:'CMND / CCCD',          level:'warn'  },
  { id:'soTienVay',  label:'Số tiền vay / HMTD',  level:'error' },
  { id:'thoiHan',    label:'Thời hạn vay',         level:'error' },
  { id:'laiSuat',    label:'Lãi suất vay',          level:'warn'  },
  { id:'mucDichVay', label:'Mục đích vay',          level:'warn'  },
  { id:'nguoiQHKH',  label:'Người QHKH/QLN',       level:'warn'  },
  { id:'nguoiDuyet', label:'Người duyệt',           level:'warn'  },
];

function _ecRunValidation() {
  const container = document.getElementById('ec-valid-container');
  if (!container) return;
  const g = id => (document.getElementById(id)?.value||'').trim();

  const errors = EC_REQUIRED.filter(f => f.level==='error' && !g(f.id));
  const warns  = EC_REQUIRED.filter(f => f.level==='warn'  && !g(f.id));

  let html = '';
  if (errors.length === 0 && warns.length === 0) {
    html = `<div class="ec-valid-ok">✅ Đủ dữ liệu bắt buộc — sẵn sàng xuất</div>`;
  }
  if (errors.length > 0) {
    html += `<div class="ec-valid-err"><div class="ec-ve-title">🔴 ${errors.length} trường BẮT BUỘC còn trống:</div>
      ${errors.map(f=>`<div class="ec-valid-item">${f.label}</div>`).join('')}
    </div>`;
  }
  if (warns.length > 0) {
    html += `<div class="ec-valid-warn"><div class="ec-vw-title">🟡 ${warns.length} trường nên điền thêm:</div>
      ${warns.map(f=>`<div class="ec-valid-item">${f.label}</div>`).join('')}
    </div>`;
  }
  container.innerHTML = html;
}

// ── FEATURE 5: Preview ───────────────────────────────────────────────────
function _ecRenderPreview() {
  const g = id => (document.getElementById(id)?.value||'').trim();
  const fmt = id => {
    const v = parseFloat(document.getElementById(id)?.value)||0;
    return v ? v.toLocaleString('vi-VN') : '';
  };
  const PREVIEW_FIELDS = [
    ['Khách hàng',    g('tenKH')],
    ['CMND/CCCD',     g('cmnd')],
    ['Ngày sinh',     g('ngaySinh')],
    ['Địa chỉ',       g('diaChi')],
    ['Mã KH',         g('maKH')],
    ['Số HĐ TD',      g('soHDTD')],
    ['Ngày HĐ TD',    g('ngayHDTD')],
    ['Số tiền vay',   fmt('soTienVay')+' đ'],
    ['Thời hạn',      g('thoiHan') ? g('thoiHan')+' tháng' : ''],
    ['Lãi suất',      g('laiSuat') ? g('laiSuat')+'%/năm' : ''],
    ['Mục đích vay',  g('mucDichVay')],
    ['Tên TSBĐ',      g('tenTSBD')],
    ['Chủ TS',        g('chuTS')],
    ['Tổng GT TS',    fmt('tongGTTS_sd')+' đ'],
    ['CBTD',          g('nguoiQHKH')],
    ['Người duyệt',   g('nguoiDuyet')],
  ];
  const grid = document.getElementById('ec-preview-grid');
  if (!grid) return;
  grid.innerHTML = PREVIEW_FIELDS.map(([lbl, val]) => `
    <div class="ec-preview-row">
      <span class="ec-preview-lbl">${lbl}</span>
      <span class="ec-preview-val ${val?'':'empty'}">${val || '(chưa điền)'}</span>
    </div>`).join('');
}

// ── FEATURE 3: Batch Export → ZIP ────────────────────────────────────────
async function ecExportAll() {
  if (!window._ecSelected || _ecSelected.size === 0) { showToast('⚠️ Chưa chọn template nào', 'red'); return; }

  // FEAT: Validation modal thay vì confirm() cũ
  hosoValidateBeforeExport(async () => {

  // Collect data once
  const data = collectDocxData();

  const btn      = document.getElementById('ec-export-btn');
  const progress = document.getElementById('ec-progress');
  const progFill = document.getElementById('ec-prog-fill');
  const progLbl  = document.getElementById('ec-prog-lbl');

  btn.disabled = true;
  if (progress) progress.classList.add('active');

  const files = [..._ecSelected];
  const total = files.length;
  let done = 0, errors = [];

  // Single file → download directly (no zip overhead)
  if (total === 1) {
    const [folder, name] = files[0].split('/').reduce((a,p,i,arr) => {
      if(i===0) return [p,'']; return [a[0], arr.slice(1).join('/')];
    }, []);
    // Actually just parse key properly
    const slashIdx = files[0].indexOf('/');
    const fld = files[0].slice(0, slashIdx);
    const nm  = files[0].slice(slashIdx + 1);
    const path = `${EC_BASE}/${fld}/${nm}.docx`;
    try {
      const rendered = await ecRenderOne(path, data);
      const blob = rendered.getZip().generate({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression:'DEFLATE' });
      const khName = data['Tên khách hàng vay'] || 'KhachHang';
      if(typeof saveAs==='function') saveAs(blob, `${nm}_${khName}.docx`);
      else { const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${nm}_${khName}.docx`;a.click(); }
      showToast(`✅ Đã xuất: ${nm}.docx`,'green');
    } catch(e) {
      showToast(`❌ Lỗi: ${e.message}`,'red');
      console.error('[ecExportAll]', e);
    }
    btn.disabled=false; if(progress) progress.classList.remove('active');
    return;
  }

  // Multiple files → collect into ZIP
  const zip = typeof JSZip!=='undefined' ? new JSZip() : null;
  if (!zip) { showToast('❌ JSZip chưa load — kiểm tra CDN','red'); btn.disabled=false; return; }

  const khName = (data['Tên khách hàng vay'] || 'HoSo').replace(/\s+/g,'_');
  const soHD   = (data['Số HĐ tín dụng']    || 'Draft').replace(/\//g,'-');

  for (const key of files) {
    const slashIdx = key.indexOf('/');
    const fld = key.slice(0, slashIdx);
    const nm  = key.slice(slashIdx + 1);
    const path = `${EC_BASE}/${fld}/${nm}.docx`;

    try {
      const rendered = await ecRenderOne(path, data);
      const arrBuf = rendered.getZip().generate({ type:'arraybuffer', compression:'DEFLATE' });
      zip.folder(fld).file(`${nm}.docx`, arrBuf);
    } catch(e) {
      errors.push(`${nm}: ${e.message}`);
      console.warn('[ecExportAll] skip', nm, e.message);
    }

    done++;
    const pct = Math.round(done/total*100);
    if(progFill) progFill.style.width = pct+'%';
    if(progLbl)  progLbl.textContent  = `${done}/${total} (${pct}%)`;
  }

  // Download ZIP
  const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
  const zipName = `HoSo_${khName}_${soHD}_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.zip`;
  if(typeof saveAs==='function') saveAs(zipBlob, zipName);
  else { const a=document.createElement('a');a.href=URL.createObjectURL(zipBlob);a.download=zipName;a.click(); }

  btn.disabled=false;
  if(progress) progress.classList.remove('active');

  const msg = errors.length > 0
    ? `⚠️ Xuất ${done-errors.length}/${total} file (${errors.length} lỗi: ${errors.join('; ')})`
    : `✅ Đã xuất ${total} file → ${zipName}`;
  showToast(msg, errors.length>0?'red':'green');
  exportCenterClose();
  }); // end hosoValidateBeforeExport
}

// Render 1 template: fetch → PizZip → Docxtemplater → return doc
async function ecRenderOne(templatePath, data) {
  // Guard: kiểm tra thư viện trước khi fetch
  if (typeof PizZip === 'undefined') throw new Error('PizZip chưa tải — kiểm tra kết nối internet');
  if (!window.docxtemplater) throw new Error('Docxtemplater chưa tải — kiểm tra kết nối internet');
  const resp = await fetch(templatePath);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} — ${templatePath}`);
  const buf  = await resp.arrayBuffer();
  const zip  = new PizZip(buf);
  const Docxtemplater = window.docxtemplater;
  const doc  = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks:    true,
    delimiters:    { start: '{{', end: '}}' },
    nullGetter:    () => '',  // trả về '' thay vì lỗi khi thiếu field
  });
  doc.render(data);
  return doc;
}

// ── FEATURE 1: Quick single-file export (legacy compat) ──────────────────
// Giữ lại để chip "Word" cũ vẫn hoạt động
async function xuatHoSoDocx(templateName) {
  // Nếu không có tham số → mở Export Center thay vì hardcode
  if (!templateName) { exportCenterOpen(); return; }
  const data = collectDocxData();
  try {
    const doc = await ecRenderOne(templateName, data);
    const blob = doc.getZip().generate({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression:'DEFLATE' });
    const nm = templateName.split('/').pop();
    if(typeof saveAs==='function') saveAs(blob, nm);
    else { const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nm;a.click(); }
    showToast(`✅ Đã xuất: ${nm}`,'green');
  } catch(e) {
    showToast('❌ Lỗi xuất: '+e.message,'red');
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// TÍNH NĂNG 1: LƯU LỰA CHỌN TEMPLATE (Export Center persistence)
// TÍNH NĂNG 2: AUTO-REFRESH PREVIEW khi form thay đổi
// TÍNH NĂNG 3: KIỂM TRA FILE TEMPLATE TỒN TẠI
// TÍNH NĂNG 4: BỘ HỒ SƠ PRESET
// TÍNH NĂNG 5: QUẢN LÝ HỒ SƠ NHIỀU KHÁCH HÀNG
// ═══════════════════════════════════════════════════════════════════════════

// ── FEATURE 1: Persist template selection ────────────────────────────────
const EC_SELECTED_KEY = 'ec_selected_v1';

function ecSaveSelection() {
  try { localStorage.setItem(EC_SELECTED_KEY, JSON.stringify([..._ecSelected])); } catch {}
}
function ecLoadSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(EC_SELECTED_KEY) || '[]');
    if (Array.isArray(saved)) saved.forEach(k => _ecSelected.add(k));
  } catch {}
}

// Patch _ecToggle to also persist
const _origEcToggle = window._ecToggle || function(){};
window._ecToggle = function(key, checked) {
  checked ? _ecSelected.add(key) : _ecSelected.delete(key);
  _ecUpdateCount();
  ecSaveSelection(); // ← persist
};

// Load saved selection on page load
document.addEventListener('DOMContentLoaded', ecLoadSelection);

// ── FEATURE 4: Preset bộ hồ sơ ───────────────────────────────────────────
const EC_PRESETS = {
  full_hmtd: {
    label: 'HMTD đầy đủ',
    files: [
      'HMTD/Bìa hồ sơ tín dụng',
      'HMTD/Báo cáo đề xuất cho vay',
      'HMTD/Hợp đồng tín dụng',
      'HMTD/Phương án sử dụng vốn',
      'HMTD/Phiếu tra thông tin CIC',
      'HMTD/Danh mục Hồ sơ vay vốn',
      'HMTD/Phiếu thu thập thông tin KH',
      'TAI SAN/HĐTC QSDĐ và TS gắn liền với đất',
      'TAI SAN/Biên bản XĐ giá trị TSĐB',
    ]
  },
  ts_only: {
    label: 'Chỉ tài sản',
    files: [
      'TAI SAN/HĐTC QSDĐ và TS gắn liền với đất',
      'TAI SAN/HĐTC tài sản',
      'TAI SAN/Biên bản XĐ giá trị TSĐB',
      'TAI SAN/Biên bản nội bộ XĐL giá trị TSBĐ',
      'TAI SAN/Đơn Đăng ký thế chấp',
      'TAI SAN/Cam kết tài sản',
    ]
  },
  giai_ngan: {
    label: 'Giải ngân',
    files: [
      'GIAI NGAN/Báo cáo đề xuất giải ngân',
      'GIAI NGAN/Biên bản đối chiếu KH',
      'GIAI NGAN/Biên bản kiểm tra SDVV',
      'HMTD/Tờ trình giao dịch',
      'KHAC/Giấy nộp tiền in sẵn',
    ]
  },
  ky_hop_dong: {
    label: 'Ký hợp đồng',
    files: [
      'HMTD/Hợp đồng tín dụng',
      'TAI SAN/HĐTC QSDĐ và TS gắn liền với đất',
      'TAI SAN/Đơn Đăng ký thế chấp',
      'TAI SAN/Danh mục tài sản',
      'TAI SAN/Giấy ủy quyền giao nhận sổ đỏ',
    ]
  },
};

function ecApplyPreset(presetKey) {
  const preset = EC_PRESETS[presetKey];
  if (!preset) return;
  _ecSelected.clear();
  preset.files.forEach(f => _ecSelected.add(f));
  _ecRenderTemplateList();
  ecSaveSelection();
  showToast(`✅ Bộ "${preset.label}": ${preset.files.length} file`, 'green');
}

// ── FEATURE 3: Kiểm tra file template tồn tại ────────────────────────────
const _ecAvailCache = {}; // key → true/false

async function ecCheckAvailability() {
  const status = document.getElementById('ec-avail-status');
  if (status) status.textContent = '🔍 Đang kiểm tra template...';

  const allFiles = [];
  Object.entries(EC_TEMPLATES).forEach(([folder, files]) =>
    files.forEach(name => allFiles.push(`${folder}/${name}`))
  );

  let ok = 0, missing = 0;
  await Promise.all(allFiles.map(async key => {
    const slashIdx = key.indexOf('/');
    const fld  = key.slice(0, slashIdx);
    const name = key.slice(slashIdx + 1);
    const path = `${EC_BASE}/${fld}/${name}.docx`;
    try {
      const r = await fetch(path, { method: 'HEAD' });
      _ecAvailCache[key] = r.ok;
      if (r.ok) ok++; else missing++;
    } catch {
      _ecAvailCache[key] = false;
      missing++;
    }
  }));

  // Re-render list with availability markers
  _ecRenderTemplateListWithAvail();

  if (status) {
    status.textContent = missing === 0
      ? `✅ Tất cả ${ok} template sẵn sàng`
      : `⚠️ ${ok} sẵn sàng · ${missing} chưa có file`;
  }
}

function _ecRenderTemplateListWithAvail() {
  const groupMap = { HMTD:'ec-tpl-HMTD', 'TAI SAN':'ec-tpl-TAISAN', 'GIAI NGAN':'ec-tpl-GIAIGAN', KHAC:'ec-tpl-KHAC' };
  Object.entries(EC_TEMPLATES).forEach(([folder, files]) => {
    const container = document.getElementById(groupMap[folder]);
    if (!container) return;
    container.innerHTML = files.map(name => {
      const key     = folder + '/' + name;
      const checked = _ecSelected.has(key) ? 'checked' : '';
      const avail   = _ecAvailCache[key];   // true/false/undefined
      const unavail = avail === false ? 'unavail' : '';
      const title   = avail === false ? 'File chưa tồn tại trong thư mục templates/' : '';
      return `<div class="ec-tpl-item ${unavail}" title="${title}">
        <input type="checkbox" id="ectpl_${btoa(unescape(encodeURIComponent(key))).replace(/[=+/]/g,'')}" ${checked}
          onchange="window._ecToggle('${key.replace(/'/g,"\\'")}',this.checked)">
        <label for="ectpl_${btoa(unescape(encodeURIComponent(key))).replace(/[=+/]/g,'')}">${name}</label>
      </div>`;
    }).join('');
  });
  _ecUpdateCount();
}

// Override exportCenterOpen to also check availability and load saved selection
const _origExportCenterOpen = window.exportCenterOpen;
window.exportCenterOpen = function() {
  ecLoadSelection();          // F1: restore saved
  _ecRenderTemplateList();
  _ecRunValidation();
  _ecRenderPreview();
  document.getElementById('export-center-ov').classList.add('open');
  // F3: async availability check
  setTimeout(ecCheckAvailability, 100);
};

// ── FEATURE 2: Auto-refresh Export Center preview ─────────────────────────
let _ecRefreshTimer = null;
function _ecDebounceRefresh() {
  clearTimeout(_ecRefreshTimer);
  _ecRefreshTimer = setTimeout(() => {
    if (!document.getElementById('export-center-ov')?.classList.contains('open')) return;
    _ecRunValidation();
    _ecRenderPreview();
    const ts = document.getElementById('ec-preview-refresh-ts');
    if (ts) ts.textContent = '🔄 Cập nhật ' + new Date().toLocaleTimeString('vi-VN');
  }, 800); // debounce 800ms
}

// Listen to any input in HSVV page
const _hsvvPage = document.getElementById('page-hsvv');
if (_hsvvPage) {
  _hsvvPage.addEventListener('input', _ecDebounceRefresh);
  _hsvvPage.addEventListener('change', _ecDebounceRefresh);
}

// ═══════════════════════════════════════════════════════════════════════════
// TÍNH NĂNG 5: QUẢN LÝ HỒ SƠ NHIỀU KHÁCH HÀNG
// ═══════════════════════════════════════════════════════════════════════════

const HOSO_STORE_KEY  = 'hsvv_records_v2';
const HOSO_CURRENT_KEY = 'hsvv_current_id';
const HOSO_MAX = 100;
let _hosoCurrentId = null;
let _hosoDirty     = false;

// ── Serialize/Deserialize toàn bộ form ───────────────────────────────────
const HOSO_SKIP_IDS = new Set([
  'hsvv-pgFill','hsvv-pgPct','hsvv-modalOv',
  'tenKHHoa','tenTKHoa','chuTSHoa','tkChuTSHoa','benVay','benTheChap',
  'soTienVayBC','hmtdDuyetBC','duNoBC','hangHoaBC','noPTBC','noPTraBC',
  'duNoAGRBC','nvbdBC','nghiaVuBDBC','soTienNNBC','soTienSauNNBC',
  'tongGTTSBC','dtDatBC','tongGTTS_sd','giaTriDat','giaTriNha','ltv_sd',
  'tyLeVTC','tyLeVay','tongThuNhap','tongTN_TD','tongTNDK','cpNhanCong','vonSLD',
  'laiVayCuThe','giaTriNha_round','gocThang','laiThang','gocLaiThang',
  'gocDK','laiDK','laiUocNN','chiSinhHoat','dsrFill',
]);

function hosoSerialize() {
  const data = {};
  const page = document.getElementById('page-hsvv');
  if (!page) return data;
  page.querySelectorAll(
    'input:not([type=file]):not([type=button]):not([type=submit]),' +
    'select, textarea'
  ).forEach(el => {
    if (!el.id || HOSO_SKIP_IDS.has(el.id)) return;
    if (el.type === 'checkbox' || el.type === 'radio') {
      data[el.id] = el.checked;
    } else {
      data[el.id] = el.value;
    }
  });
  // XL spreadsheet cells
  page.querySelectorAll('.xl-num[id]').forEach(el => { data[el.id] = el.value; });
  // TSBĐ panel
  data._tsbdData = JSON.stringify(typeof _tsbdData !== 'undefined' ? _tsbdData : []);
  // Loại vay (lt-tab state — không phải input nên phải lưu thủ công)
  data._loanType = (typeof curLT !== 'undefined') ? curLT : 'han_muc';
  return data;
}

function hosoDeserialize(data) {
  if (!data) return;
  Object.entries(data).forEach(([id, val]) => {
    if (id.startsWith('_')) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = !!val;
    } else if (!HOSO_SKIP_IDS.has(id)) {
      el.value = val || '';
    }
  });
  if (data._tsbdData) {
    try {
      if (typeof _tsbdData !== 'undefined') {
        window._tsbdData = JSON.parse(data._tsbdData);
        if (typeof tsbdRender === 'function') tsbdRender();
      }
    } catch {}
  }
  // Restore loại vay (lt-tab)
  if (data._loanType && typeof apcSwitchLT === 'function') {
    const ltBtn = document.querySelector(`.lt-tab[data-lt="${data._loanType}"]`);
    if (ltBtn) apcSwitchLT(ltBtn);
  }
  setTimeout(() => {
    if (typeof hsvvRecalcAll === 'function') hsvvRecalcAll();
    if (typeof updateChecklist === 'function') updateChecklist();
  }, 300);
}

// ── Storage helpers ───────────────────────────────────────────────────────
// ── HSVV Storage: IndexedDB primary + localStorage fallback ─────────────────
// Memory cache: tất cả call sites sync đọc từ đây, IDB write async background
let _hosoCache = null;

async function hosoInitCache() {
  try {
    const db  = await openIDB();
    const raw = await new Promise(res => {
      const tx  = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('hsvv_records');
      req.onsuccess = () => res(req.result || null);
      req.onerror   = () => res(null);
    });
    if (raw !== null) {
      _hosoCache = JSON.parse(
        typeof raw === 'string' ? LZS.decompressFromBase64(raw) : JSON.stringify(raw)
      );
      (0)&&console.log(`✅ [HSVV] Loaded ${Object.keys(_hosoCache).length} records from IndexedDB`);
      return;
    }
  } catch (e) { console.warn('[hosoInitCache] IDB read failed:', e); }
  // Migrate từ localStorage (chạy 1 lần duy nhất)
  try {
    const ls = localStorage.getItem(HOSO_STORE_KEY);
    _hosoCache = ls ? JSON.parse(ls) : {};
    const n = Object.keys(_hosoCache).length;
    if (n > 0) {
      hosoIDBSet(_hosoCache); // async migrate, không cần await
      (0)&&console.log(`🔄 [HSVV] Migrated ${n} records: localStorage → IndexedDB`);
    }
  } catch { _hosoCache = {}; }
}

async function hosoIDBSet(records) {
  try {
    const db         = await openIDB();
    const compressed = LZS.compressToBase64(JSON.stringify(records));
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(compressed, 'hsvv_records');
      tx.oncomplete = () => res(true);
      tx.onerror    = () => rej(tx.error);
    });
  } catch { return false; }
}

function hosoGetAll() {
  return _hosoCache || {};
}

function hosoSetAll(records) {
  _hosoCache = records;
  // Async write IndexedDB (fire-and-forget), không block UI
  hosoIDBSet(records).catch(() => {
    // Fallback localStorage chỉ khi data < 4MB để tránh QuotaExceededError
    try {
      const s = JSON.stringify(records);
      if (s.length < 4 * 1024 * 1024) {
        localStorage.setItem(HOSO_STORE_KEY, s);
      } else {
        showToast('⚠️ Dữ liệu lớn — đã lưu IndexedDB, localStorage bỏ qua', 'orange');
      }
    } catch {}
  });
}
function hosoMeta(data, existingMeta) {
  const g = id => (data[id] || '');
  return {
    tenKH:      g('tenKH')      || '(Chưa có tên)',
    soHDTD:     g('soHDTD')     || '—',
    maKH:       g('maKH')       || '—',
    soTien:     g('soTienVay')  || g('hmtdDuyet') || '',
    // FIX ③: bổ sung fields để danh sách phân biệt hồ sơ dễ hơn
    ngayDenHan: g('ngayDenHan') || g('ngayKetThuc') || g('ngayDaoHan') || g('ngayKT') || '',
    loaiVay:    g('theLoaiVay') || g('loaiVay') || '',
    loanType:   data._loanType || 'han_muc',
    nhomNo:     g('nhomNo')     || '',
    laiSuat:    g('laiSuat')    || '',
    savedAt:    new Date().toISOString(),
    // FEAT: Ghi chú nội bộ — không xuất ra Word, chỉ hiển thị trong danh sách
    notes:      (existingMeta && existingMeta.notes) || '',
  };
}

// ── Mark form dirty khi user nhập ─────────────────────────────────────────
function hosoMarkDirty() {
  if (_hosoDirty) return;
  _hosoDirty = true;
  const dot = document.getElementById('hoso-dirty-dot');
  if (dot) dot.classList.add('dirty');
  // ① Hiện nhãn "⚠ Chưa lưu"
  const lbl = document.getElementById('hoso-dirty-label');
  if (lbl) lbl.classList.add('show');
  // ② Nút Lưu chuyển sang màu cam pulse
  const saveBtn = document.getElementById('hoso-save-btn');
  if (saveBtn) saveBtn.classList.add('btn-dirty-pulse');
}

// Hook into existing form inputs
if (_hsvvPage) {
  _hsvvPage.addEventListener('input',  hosoMarkDirty);
  _hsvvPage.addEventListener('change', hosoMarkDirty);
}

// Auto-save every 60 seconds nếu có thay đổi
setInterval(() => {
  if (_hosoDirty && _hosoCurrentId) hosoSilentSave();
}, 60000);

// ── Save current ─────────────────────────────────────────────────────────
function hosoSilentSave() {
  if (!_hosoCurrentId) return;
  const records = hosoGetAll();
  const data    = hosoSerialize();
  // Truyền _meta cũ để giữ nguyên notes khi save
  const existingMeta = records[_hosoCurrentId]?._meta || null;
  const meta    = hosoMeta(data, existingMeta);
  records[_hosoCurrentId] = { _meta: meta, ...data };
  hosoSetAll(records);
  _hosoDirty = false;
  // Xóa dirty indicators
  const dot = document.getElementById('hoso-dirty-dot');
  if (dot) dot.classList.remove('dirty');
  const lbl = document.getElementById('hoso-dirty-label');
  if (lbl) lbl.classList.remove('show');
  const saveBtn = document.getElementById('hoso-save-btn');
  if (saveBtn) saveBtn.classList.remove('btn-dirty-pulse');
  hosoUpdateNameBar(meta);
}

function hosoSaveCurrent() {
  if (!_hosoCurrentId) {
    // First save → create new record
    _hosoCurrentId = 'hs_' + Date.now();
    try { localStorage.setItem(HOSO_CURRENT_KEY, _hosoCurrentId); } catch {}
  }
  hosoSilentSave();
  showToast('💾 Đã lưu hồ sơ vào bộ nhớ trình duyệt', 'green');
}

// ── Tính số ngày còn lại đến hạn (trả về số hoặc null) ─────────────────────
function hosoDaysLeft(ngayDenHan) {
  if (!ngayDenHan) return null;
  // Hỗ trợ cả YYYY-MM-DD và DD/MM/YYYY
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(ngayDenHan)) {
    d = new Date(ngayDenHan);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(ngayDenHan)) {
    const [dd, mm, yyyy] = ngayDenHan.split('/');
    d = new Date(`${yyyy}-${mm}-${dd}`);
  } else return null;
  if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}

// ── Ghi chú nội bộ — lưu trực tiếp vào _meta.notes, không dirty form ───────
function hosoSaveNote(id, val) {
  const records = hosoGetAll();
  if (!records[id]) return;
  records[id]._meta = records[id]._meta || {};
  records[id]._meta.notes = val.trim();
  hosoSetAll(records);
  // Refresh badge trong danh sách (không re-render toàn bộ)
  const noteIcon = document.getElementById(`hl-note-icon-${id}`);
  if (noteIcon) {
    noteIcon.textContent = val.trim() ? '📝' : '';
    noteIcon.title = val.trim();
  }
}

function hosoNoteToggle(id, event) {
  event.stopPropagation();
  // Đóng tất cả note textarea đang mở khác
  document.querySelectorAll('.hl-note-panel.open').forEach(p => {
    if (p.dataset.id !== id) { p.classList.remove('open'); }
  });
  const panel = document.getElementById(`hl-note-panel-${id}`);
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) {
    const ta = panel.querySelector('textarea');
    if (ta) { ta.focus(); ta.selectionStart = ta.value.length; }
  }
}

// ── Load a saved record ───────────────────────────────────────────────────
function hosoLoad(id) {
  // Save current first
  if (_hosoCurrentId && _hosoDirty) hosoSilentSave();

  const records = hosoGetAll();
  const record  = records[id];
  if (!record) { showToast('❌ Không tìm thấy hồ sơ', 'red'); return; }

  // Clear form first
  hosoClearForm();

  // Deserialize
  const { _meta, ...data } = record;
  hosoDeserialize(data);

  _hosoCurrentId = id;
  _hosoDirty     = false;
  try { localStorage.setItem(HOSO_CURRENT_KEY, id); } catch {}
  hosoUpdateNameBar(_meta);
  const dot = document.getElementById('hoso-dirty-dot');
  if (dot) dot.classList.remove('dirty');

  hosoListClose();
  showToast(`📂 Đã tải: ${_meta.tenKH} — ${_meta.soHDTD}`, 'green');
  // ✅ PATCH v18: Cập nhật sync bar sau khi load hồ sơ
  setTimeout(() => {
    if (typeof hsvvAutoLink === 'function') {
      const _data = hosoGetAll()[id];
      if (_data) hsvvAutoLink(id, _data);
    }
  }, 600);
}

// ── New record ────────────────────────────────────────────────────────────
function hosoNew() {
  // Save current first
  if (_hosoCurrentId && _hosoDirty) hosoSilentSave();
  hosoClearForm();
  _hosoCurrentId = 'hs_' + Date.now();
  _hosoDirty     = false;
  try { localStorage.setItem(HOSO_CURRENT_KEY, _hosoCurrentId); } catch {}
  hosoUpdateNameBar({ tenKH:'Hồ sơ mới', soHDTD:'—' });
  showToast('📄 Đã tạo hồ sơ mới — bắt đầu điền thông tin', 'green');
}

// ── Clone hồ sơ ───────────────────────────────────────────────────────────
function hosoClone(id) {
  const records = hosoGetAll();
  const src     = records[id];
  if (!src) { showToast('❌ Không tìm thấy hồ sơ gốc', 'red'); return; }

  const srcMeta = src._meta || {};
  const name    = srcMeta.tenKH || '(Chưa có tên)';
  if (!confirm(`Nhân bản hồ sơ "${name}"?\n\nBản sao sẽ giữ nguyên thông tin KH & TSĐB.\nCác trường hành chính (Số HĐ, ngày ký...) sẽ được xóa trắng để điền mới.`)) return;

  // Deep copy toàn bộ data
  const { _meta, ...data } = src;
  const cloneData = JSON.parse(JSON.stringify(data));

  // Xóa các field hành chính cần điền lại (duy nhất theo từng lần vay)
  const CLEAR_ON_CLONE = [
    'soHDTD','ngayHDTD','soHDTDCu','ngayHDTDCu',
    'ngayGiaoNhan','ngayBia','ngayCIC','soUyQuyen',
    'ngayKetThuc','ngayKT','ngayDaoHan',
  ];
  CLEAR_ON_CLONE.forEach(k => { if (k in cloneData) cloneData[k] = ''; });

  const newId   = 'hs_' + Date.now();
  const newMeta = {
    ...srcMeta,
    soHDTD:  '— (bản sao)',
    savedAt: new Date().toISOString(),
    clonedFrom: id,
    notes: '',  // Xóa ghi chú — bản sao là hồ sơ mới
  };

  records[newId] = { _meta: newMeta, ...cloneData };
  hosoSetAll(records);

  // Load bản sao ngay để user chỉnh
  if (_hosoCurrentId && _hosoDirty) hosoSilentSave();
  hosoClearForm();
  hosoDeserialize(cloneData);
  _hosoCurrentId = newId;
  _hosoDirty     = false;
  try { localStorage.setItem(HOSO_CURRENT_KEY, newId); } catch {}
  hosoUpdateNameBar(newMeta);
  hosoListClose();
  showToast(`📋 Đã nhân bản: ${name} — điền Số HĐ mới để hoàn tất`, 'green');
}

// ── Clear form ────────────────────────────────────────────────────────────
function hosoClearForm() {
  const page = document.getElementById('page-hsvv');
  if (!page) return;
  page.querySelectorAll(
    'input:not([type=file]):not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]),' +
    'textarea'
  ).forEach(el => {
    if (!HOSO_SKIP_IDS.has(el.id || '')) el.value = '';
  });
  page.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
  page.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
  if (typeof _tsbdData !== 'undefined') { window._tsbdData = []; }
  if (typeof tsbdRender === 'function') tsbdRender();
  // Reset loại vay về mặc định (Hạn mức SXKD)
  if (typeof apcSwitchLT === 'function') {
    const defaultTab = document.querySelector('.lt-tab[data-lt="han_muc"]') || document.querySelector('.lt-tab');
    if (defaultTab) apcSwitchLT(defaultTab);
  }
  if (typeof hsvvRecalcAll === 'function') setTimeout(hsvvRecalcAll, 200);
}

function hosoReset() {
  if (!confirm('Xóa trắng toàn bộ form hiện tại?\n(Hồ sơ đã lưu không bị ảnh hưởng)')) return;
  hosoClearForm();
  _hosoCurrentId = null;
  _hosoDirty     = false;
  hosoUpdateNameBar({ tenKH:'⬡ Chưa lưu', soHDTD:'' });
  showToast('🗑️ Đã xóa trắng form', 'green');
}

// ── Delete record ─────────────────────────────────────────────────────────
function hosoDelete(id) {
  const records = hosoGetAll();
  const meta = records[id]?._meta || {};
  const name = meta.tenKH || '(Chưa có tên)';
  if (!confirm(`Xóa hồ sơ "${name}"?\n\nHành động này không thể hoàn tác.`)) return;
  delete records[id];
  hosoSetAll(records);
  // Nếu đang mở hồ sơ này → reset form
  if (_hosoCurrentId === id) {
    hosoClearForm();
    _hosoCurrentId = null;
    _hosoDirty = false;
    hosoUpdateNameBar({ tenKH: '⬡ Chưa lưu', soHDTD: '' });
    try { localStorage.removeItem(HOSO_CURRENT_KEY); } catch {}
  }
  hosoRenderList();
  showToast(`🗑️ Đã xóa hồ sơ: ${name}`, 'green');
}

// ── Name bar ──────────────────────────────────────────────────────────────
function hosoUpdateNameBar(meta) {
  const el = document.getElementById('hoso-current-name');
  if (!el) return;
  const name = meta.tenKH || '(Chưa có tên)';
  const hd   = meta.soHDTD && meta.soHDTD !== '—' ? ` · ${meta.soHDTD}` : '';
  el.textContent = name + hd;
  el.title       = meta.savedAt ? 'Lưu lần cuối: ' + new Date(meta.savedAt).toLocaleString('vi-VN') : '';
  // FIX ⑥: nút Lưu hiển thị tên hồ sơ đang mở
  const btn = document.getElementById('hoso-save-btn');
  if (btn) {
    const isBlank = !meta.tenKH || meta.tenKH === '⬡ Chưa lưu' || meta.tenKH === 'Hồ sơ mới';
    const shortName = meta.tenKH && !isBlank
      ? (meta.tenKH.length > 18 ? meta.tenKH.slice(0,17) + '…' : meta.tenKH)
      : '';
    btn.textContent = shortName ? `💾 Lưu: ${shortName}` : '💾 Lưu';
    btn.title = shortName ? `Lưu hồ sơ: ${meta.tenKH}${hd}` : 'Lưu hồ sơ hiện tại (Ctrl+S)';
  }
}

// ── List modal ───────────────────────────────────────────────────────────
function hosoListOpen() {
  hosoRenderList();
  document.getElementById('hoso-list-ov')?.classList.add('open');
  // Reset search khi mở modal
  const inp = document.getElementById('hl-search-input');
  if (inp) { inp.value = ''; hosoSearchFilter(''); }
  setTimeout(() => inp?.focus(), 150);
}
function hosoListClose() {
  document.getElementById('hoso-list-ov')?.classList.remove('open');
}

// ── ② Search filter — FIX ⑤: dùng 1 code path với hosoRenderList ──────────
let _hosoSearchNorm = ''; // state tìm kiếm hiện tại

function hosoSearchFilter(q) {
  const clearBtn = document.getElementById('hl-search-clear');
  if (clearBtn) clearBtn.classList.toggle('show', q.length > 0);
  _hosoSearchNorm = q.trim().toLowerCase();
  _hosoListPage   = 1; // reset về trang 1 khi search
  hosoRenderList();
}

// ── Batch export state ───────────────────────────────────────────────────
const _hosoBatchSelected = new Set();

function _hosoBatchUpdateUI() {
  const n = _hosoBatchSelected.size;
  const countEl = document.getElementById('hl-sel-count');
  const btn     = document.getElementById('hl-batch-btn');
  if (countEl) countEl.textContent = n > 0 ? `${n} hồ sơ đã chọn` : '0 hồ sơ chọn';
  if (btn) btn.disabled = n === 0;
}

function hosoBatchToggle(id, checked) {
  checked ? _hosoBatchSelected.add(id) : _hosoBatchSelected.delete(id);
  // update row highlight
  const row = document.querySelector(`.hl-item[data-id="${id}"]`);
  if (row) row.classList.toggle('hl-checked', checked);
  _hosoBatchUpdateUI();
}

function hosoBatchSelectAll() {
  const records = hosoGetAll();
  Object.keys(records).forEach(id => _hosoBatchSelected.add(id));
  hosoRenderList();
}

function hosoBatchSelectNone() {
  _hosoBatchSelected.clear();
  hosoRenderList();
}

const HOSO_PAGE_SIZE = 20;
let _hosoListPage = 1;

function hosoRenderList(page) {
  const body    = document.getElementById('hoso-list-body');
  if (!body) return;
  const records = hosoGetAll();
  const allIds  = Object.keys(records).sort((a,b) => {
    const ta = records[a]?._meta?.savedAt || '';
    const tb = records[b]?._meta?.savedAt || '';
    return tb.localeCompare(ta); // newest first
  });

  // FIX ⑤: filter theo search query trước khi phân trang
  const norm = _hosoSearchNorm || '';
  const ids  = norm
    ? allIds.filter(id => {
        const m = records[id]?._meta || {};
        return (m.tenKH  || '').toLowerCase().includes(norm)
            || (m.maKH   || '').toLowerCase().includes(norm)
            || (m.soHDTD || '').toLowerCase().includes(norm);
      })
    : allIds;

  // Update search hint
  const hint = document.getElementById('hl-search-hint');
  if (hint) hint.textContent = norm
    ? (ids.length > 0 ? `Tìm thấy ${ids.length}/${allIds.length} hồ sơ` : 'Không tìm thấy hồ sơ nào')
    : '';

  if (ids.length === 0) {
    body.innerHTML = norm
      ? `<div class="hl-empty">🔍 Không có hồ sơ nào khớp "<strong>${escapeHtml(norm)}</strong>"</div>`
      : '<div class="hl-empty">📭 Chưa có hồ sơ nào. Nhấn "Lưu" để lưu hồ sơ hiện tại.</div>';
    _hosoBatchUpdateUI();
    return;
  }

  // ── Phân trang ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(ids.length / HOSO_PAGE_SIZE);
  if (page !== undefined) _hosoListPage = page;
  if (_hosoListPage > totalPages) _hosoListPage = totalPages;
  if (_hosoListPage < 1) _hosoListPage = 1;

  // Auto-jump đến trang chứa hồ sơ đang mở (chỉ khi không search)
  if (!norm && page === undefined && _hosoCurrentId) {
    const curIdx = ids.indexOf(_hosoCurrentId);
    if (curIdx >= 0) _hosoListPage = Math.floor(curIdx / HOSO_PAGE_SIZE) + 1;
  }

  const start   = (_hosoListPage - 1) * HOSO_PAGE_SIZE;
  const pageIds = ids.slice(start, start + HOSO_PAGE_SIZE);

  const fmtMoney = v => v ? Number(String(v).replace(/\D/g,'')).toLocaleString('vi-VN') : '';
  const fmtDate  = iso => iso ? new Date(iso).toLocaleDateString('vi-VN', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
  const jsA = v => escapeHtml(String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'"));   // P07: chuỗi JS trong thuộc tính onclick
  const hlText   = (str) => {   // P07: escape trước khi tô sáng (tên KH/ghi chú có thể chứa HTML)
    const s = String(str == null ? '' : str);
    if (!norm || !s) return escapeHtml(s);
    return s.split(new RegExp(`(${norm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi')).map((p, i) =>
      i % 2 ? '<mark style="background:#FDE68A;border-radius:2px;padding:0 1px">' + escapeHtml(p) + '</mark>' : escapeHtml(p)).join('');
  };

  const itemsHtml = pageIds.map(id => {
    const m      = records[id]?._meta || {};
    const active = id === _hosoCurrentId ? 'active' : '';
    const checked = _hosoBatchSelected.has(id) ? 'checked' : '';
    const hlChecked = _hosoBatchSelected.has(id) ? 'hl-checked' : '';
    const soTien = m.soTien ? `${fmtMoney(m.soTien)} đ` : '';
    // FIX ③: hiển thị thêm ngày đến hạn, loại vay, nhóm nợ
    // FEAT: badge cảnh báo đến hạn
    const daysLeft = hosoDaysLeft(m.ngayDenHan);
    let deadlineBadge = '';
    if (daysLeft !== null) {
      if (daysLeft < 0) {
        deadlineBadge = `<span style="background:#FEE2E2;color:#B91C1C;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700" title="Đã quá hạn ${Math.abs(daysLeft)} ngày">🔴 QUÁ HẠN ${Math.abs(daysLeft)}N</span>`;
      } else if (daysLeft <= 7) {
        deadlineBadge = `<span style="background:#FEE2E2;color:#B91C1C;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:700" title="Còn ${daysLeft} ngày đến hạn — Khẩn!">⚠️ CÒN ${daysLeft}N</span>`;
      } else if (daysLeft <= 15) {
        deadlineBadge = `<span style="background:#FEF3C7;color:#92400E;border-radius:3px;padding:1px 6px;font-size:10px;font-weight:600" title="Còn ${daysLeft} ngày đến hạn">⚠️ CÒN ${daysLeft}N</span>`;
      }
    }
    // Badge icon theo loanType
    const loanTypeIco = {han_muc:'📦',tieu_dung:'👤',the_chap:'🏠',cam_co:'🏦'}[m.loanType||'han_muc'] || '📄';
    const extraTags = [
      deadlineBadge,
      m.loaiVay    ? `<span style="background:#EFF6FF;color:#1D4ED8;border-radius:3px;padding:1px 5px;font-size:10px">${loanTypeIco} ${escapeHtml(m.loaiVay)}</span>` : '',
      m.laiSuat    ? `<span style="background:#F0FDF4;color:#166534;border-radius:3px;padding:1px 5px;font-size:10px">LS ${escapeHtml(m.laiSuat)}%</span>` : '',
      m.nhomNo     ? `<span style="background:#FEF3C7;color:#92400E;border-radius:3px;padding:1px 5px;font-size:10px">N${escapeHtml(m.nhomNo)}</span>` : '',
      m.ngayDenHan ? `<span style="color:#6B7280;font-size:10px">📅 ${escapeHtml(m.ngayDenHan)}</span>` : '',
    ].filter(Boolean).join(' ');
    return `<div class="hl-item ${active} ${hlChecked}" data-id="${escapeHtml(id)}" onclick="hosoLoad('${escapeHtml(id)}')">
      <input type="checkbox" class="hl-item-cb" ${checked}
        onclick="event.stopPropagation();hosoBatchToggle('${jsA(id)}',this.checked)"
        title="Chọn để xuất hàng loạt">
      <div class="hl-item-icon">📄</div>
      <div class="hl-item-info">
        <div class="hl-item-name">${hlText(m.tenKH || '(Chưa có tên)')}</div>
        <div class="hl-item-meta">
          HĐ: ${hlText(m.soHDTD || '—')} · Mã KH: ${hlText(m.maKH || '—')}
          ${soTien ? ` · ${soTien}` : ''}
          · ${fmtDate(m.savedAt)}
        </div>
        ${extraTags ? `<div style="margin-top:3px;display:flex;gap:4px;flex-wrap:wrap;align-items:center">${extraTags}</div>` : ''}
        ${m.notes ? `<div class="hl-note-preview" title="${escapeHtml(m.notes)}">💬 ${escapeHtml(m.notes.length > 60 ? m.notes.slice(0,60)+'…' : m.notes)}</div>` : ''}
        <div class="hl-note-panel${m.notes ? ' has-note' : ''}" id="hl-note-panel-${escapeHtml(id)}" data-id="${escapeHtml(id)}" onclick="event.stopPropagation()">
          <textarea class="hl-note-ta" placeholder="Ghi chú nội bộ (không xuất Word)..."
            oninput="hosoSaveNote('${jsA(id)}', this.value)"
          >${escapeHtml(m.notes || '')}</textarea>
        </div>
      </div>
      <div class="hl-item-actions">
        <button class="hl-act-btn" onclick="event.stopPropagation();hosoLoad('${jsA(id)}')">📂 Mở</button>
        <button class="hl-act-btn" id="hl-note-icon-${escapeHtml(id)}" onclick="hosoNoteToggle('${jsA(id)}',event)" title="${m.notes ? escapeHtml(m.notes) : 'Thêm ghi chú nội bộ'}" style="font-size:13px">${m.notes ? '📝' : '💬'}</button>
        <button class="hl-act-btn" onclick="event.stopPropagation();hosoClone('${jsA(id)}')" title="Nhân bản hồ sơ này">📋</button>
        <button class="hl-act-btn del" onclick="event.stopPropagation();hosoDelete('${jsA(id)}')">🗑️</button>
      </div>
    </div>`;
  }).join('');

  // ── Thanh phân trang ──────────────────────────────────────────────────────
  let pagerHtml = '';
  if (totalPages > 1) {
    const btnStyle = (disabled, active) =>
      `style="padding:4px 10px;border-radius:5px;border:1px solid ${active?'#0D2137':'#D3DCE8'};background:${active?'#0D2137':'#fff'};color:${active?'#fff':'#374151'};font-size:11px;font-weight:600;cursor:${disabled?'default':'pointer'};opacity:${disabled?'.4':'1'}"`;
    let pageNums = '';
    for (let p = 1; p <= totalPages; p++) {
      const isActive = p === _hosoListPage;
      pageNums += `<button onclick="hosoRenderList(${p})" ${btnStyle(false, isActive)}>${p}</button>`;
    }
    pagerHtml = `
      <div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 0;border-top:1px solid #E5EAF0;margin-top:6px;flex-wrap:wrap">
        <span style="font-size:11px;color:#6B7280;margin-right:4px">${norm ? `${ids.length}/${allIds.length}` : ids.length} hồ sơ</span>
        <button onclick="hosoRenderList(${_hosoListPage-1})" ${btnStyle(_hosoListPage<=1,false)}>‹ Trước</button>
        ${pageNums}
        <button onclick="hosoRenderList(${_hosoListPage+1})" ${btnStyle(_hosoListPage>=totalPages,false)}>Sau ›</button>
      </div>`;
  } else {
    pagerHtml = `<div style="text-align:center;font-size:11px;color:#9CA3AF;padding:6px 0">${norm ? `${ids.length}/${allIds.length}` : ids.length} hồ sơ</div>`;
  }

  body.innerHTML = itemsHtml + pagerHtml;

  // Warning if near capacity
  if (ids.length >= HOSO_MAX - 10) {
    body.innerHTML += `<div style="text-align:center;font-size:11px;color:#F59E0B;padding:6px 8px;background:#FFFBEB;border-radius:6px;margin:4px 0">⚠️ Đã lưu ${ids.length}/${HOSO_MAX} hồ sơ — nên xuất ZIP và xóa hồ sơ cũ</div>`;
  }

  _hosoBatchUpdateUI();
}

// ── Batch export: xuất ZIP cho từng hồ sơ được chọn ────────────────────────
async function hosoBatchExport() {
  if (_hosoBatchSelected.size === 0) { showToast('⚠️ Chưa chọn hồ sơ nào', 'red'); return; }
  if (_ecSelected.size === 0) {
    showToast('⚠️ Chưa chọn template nào — hãy mở Export Center chọn template trước', 'red');
    hosoListClose();
    exportCenterOpen();
    return;
  }

  const records  = hosoGetAll();
  const ids      = [..._hosoBatchSelected];
  const total    = ids.length;

  // Save + backup current form
  const backupId   = _hosoCurrentId;
  const backupDirty = _hosoDirty;
  if (backupId && backupDirty) hosoSilentSave();

  const btn = document.getElementById('hl-batch-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang xuất...'; }

  const zip = typeof JSZip !== 'undefined' ? new JSZip() : null;
  if (!zip) {
    showToast('❌ JSZip chưa load', 'red');
    if (btn) { btn.disabled = false; btn.textContent = '📦 Xuất ZIP nhiều hồ sơ'; }
    return;
  }

  let done = 0, errors = [];

  for (const id of ids) {
    const record = records[id];
    if (!record) { errors.push(`${id}: không tìm thấy`); done++; continue; }

    // Temporarily load record into form to use collectDocxData()
    hosoClearForm();
    const { _meta, ...data } = record;
    hosoDeserialize(data);
    await new Promise(r => setTimeout(r, 600)); // ✅ BUG-FIX v18: tăng từ 420→600ms, đảm bảo chain recalc (hsvvRecalcAll→calcGiaDat→calcFinance) hoàn tất trước collectDocxData

    const docxData = (typeof collectDocxData === 'function') ? collectDocxData() : {};
    const khName = (_meta?.tenKH || 'KhachHang').replace(/\s+/g,'_').replace(/[^\w\-]/g,'');
    const soHD   = (_meta?.soHDTD || 'Draft').replace(/\//g,'-');
    const folder = zip.folder(`${khName}_${soHD}`);

    for (const key of _ecSelected) {
      const slashIdx = key.indexOf('/');
      const fld = key.slice(0, slashIdx);
      const nm  = key.slice(slashIdx + 1);
      const path = `${EC_BASE}/${fld}/${nm}.docx`;
      try {
        const rendered = await ecRenderOne(path, docxData);
        const arrBuf = rendered.getZip().generate({ type:'arraybuffer', compression:'DEFLATE' });
        folder.folder(fld).file(`${nm}.docx`, arrBuf);
      } catch(e) {
        errors.push(`${khName}/${nm}: ${e.message}`);
        console.warn('[hosoBatchExport]', nm, e);
      }
    }
    done++;
    if (btn) btn.textContent = `⏳ ${done}/${total}...`;
  }

  // Restore original form
  if (backupId) {
    const orig = records[backupId];
    if (orig) {
      hosoClearForm();
      const { _meta, ...origData } = orig;
      hosoDeserialize(origData);
      _hosoCurrentId = backupId;
      _hosoDirty = false;
      hosoUpdateNameBar(_meta);
    }
  }

  // Generate ZIP
  const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE' });
  const zipName = `BatchExport_${total}HS_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.zip`;
  if (typeof saveAs === 'function') saveAs(zipBlob, zipName);
  else { const a=document.createElement('a');a.href=URL.createObjectURL(zipBlob);a.download=zipName;a.click(); }

  if (btn) { btn.disabled = false; btn.textContent = '📦 Xuất ZIP nhiều hồ sơ'; }
  _hosoBatchSelected.clear(); // ✅ BUG-FIX: xóa selection sau khi xuất xong
  _hosoBatchUpdateUI();

  const msg = errors.length > 0
    ? `⚠️ Xuất ${done-errors.length}/${total} hồ sơ (${errors.length} lỗi)`
    : `✅ Đã xuất ${total} hồ sơ → ${zipName}`;
  showToast(msg, errors.length > 0 ? 'red' : 'green');
  hosoListClose();
}

// ── Auto-load current session on page open ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Phải await cache trước khi dùng hosoGetAll()
  await hosoInitCache();
  ecLoadSelection();
  try {
    const lastId = localStorage.getItem(HOSO_CURRENT_KEY);
    if (lastId) {
      const records = hosoGetAll();
      if (records[lastId]) {
        _hosoCurrentId = lastId;
        const meta = records[lastId]._meta || {};
        hosoUpdateNameBar(meta);
        // Silently restore last session form data
        const { _meta, ...data } = records[lastId];
        hosoDeserialize(data); // ✅ v20: hosoDeserialize đã tự restore _loanType bên trong
        (0)&&console.log(`✅ Restored session: ${meta.tenKH} [${data._loanType||'han_muc'}]`);
      }
    }
  } catch (e) { console.warn('[hosoInit]', e); }
});

