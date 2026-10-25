
/* ═══════════════════════════════════════════════════════════════
   GLOBAL STATE & CONSTANTS
   ═══════════════════════════════════════════════════════════════ */
const DEFAULT_CBTD = ''; /* v13.9.2: bỏ ghim CBTD mặc định (tên cán bộ) */
const LS_KEY = 'qltd_pro_data_v2';
const IDB_NAME = 'QLTDProDB';
const IDB_VER = 3; /* PATCH v13.8.1: bump để khớp IDB hiện trường đã ở v3, tránh VersionError → fallback localStorage cũ giữ L/S sai */
const IDB_STORE = 'snapshots';
const IDB_CHUNKS = 'chunks';    // store for chunked large arrays

// Row layout for DATA.qltd:
// 0 Mã KH · 1 Tên KH · 2 Số HĐTD · 3 Ngày HĐ · 4 Ngày HĐTD
// 5 HMTD · 6 Ngày GN · 7 Ngày trả nợ · 8 L/S % · 9 Số tiền GN
// 10 Tiền lãi · 11 Dư nợ · 12 CBTD · 13 Loại vay · 14 Địa chỉ
// 15 Mục đích · 16 Gốc trả · 17 Phòng ban · 18 Nhóm nợ · 19 Số Hồ Sơ · 20 Số TK
// ═══ NỢ ĐẾN HẠN 2026 — dữ liệu từ file XLS (tự động đồng bộ) ═══
// Key: "custseqno|dd/mm/yyyy" → số tiền đến hạn phải trả (đồng)
const DENHAN_AMT = JSON.parse(document.getElementById('denhan-amt-data').textContent);

/**
 * Tra cứu số tiền đến hạn từ DENHAN_AMT theo Mã KH (r[0]) + Ngày trả nợ (r[7]) + Dư nợ (r[11])
 * FIX v25: Nếu không tìm thấy trong DENHAN_AMT (khoản mới nhập / dư nợ thay đổi),
 * fallback về DƯ NỢ HIỆN TẠI (r[11]) để đảm bảo không bị lọc mất khỏi LỊCH TRẢ NỢ.
 */
function getDenhanAmt(r) {
  const k = String(r[0]||'').trim() + '|' + String(r[7]||'').trim() + '|' + String(r[11]||'').trim();
  const fromCache = DENHAN_AMT[k];
  if (fromCache > 0) return fromCache;
  // Fallback: nếu không có trong bảng cứng, dùng DƯ NỢ làm số tiền đến hạn
  // Đảm bảo các khoản mới nhập IPCAS hoặc có dư nợ thay đổi vẫn hiện lên LỊCH TRẢ NỢ
  const duNo = Number(r[11]) || 0;
  return duNo;
}

const DATA = {
  qltd: [],          // Main credit table (synced from IPCAS)
  denhanStatus: {},  // Status overrides for due-date tracking
  laidongStatus: {}, // Status overrides for interest tracking
  hdv: [],           // Capital mobilization registrations
  hdvSnapshots: {},       // ✅ HDV PRO: Lưu trữ kỳ theo dõi
  hdvCurrentPeriod: '',   // ✅ HDV PRO: Kỳ đang xem
  chlmStatus: {},    // ✅ CHLM: Trạng thái chuyển hạn mức theo từng hợp đồng
  macb: [],          // Officers / salary data — P10: KHÔNG nhúng sẵn hồ sơ cán bộ (họ tên, mã CB, số TK, lương); trống ⇒ autoGenerateMaCB() sinh từ dữ liệu dư nợ, người dùng tự bổ sung/ nhập
  baocao: [{"system": "TT31", "ma": "TT31_01-B/DBTKTT", "msstt": "mstt09", "ten": "Báo cáo cho vay xuất nhập khẩu", "ky": "", "link": ""}, {"system": "TT31", "ma": "TT31_02-B/DBTKTT", "msstt": "", "ten": "Báo cáo đầu tư Tphiếu DN và cho vay đầu tư theo HĐ nhận ủy thác", "ky": "", "link": ""}, {"system": "TT31", "ma": "TT31_06-B/CSTT", "msstt": "", "ten": "Báo cáo tiêu dùng", "ky": "", "link": ""}, {"system": "TT31", "ma": "TT31_07-B/CSTT", "msstt": "", "ten": "Báo cáo tín dụng đối với lĩnh vực đầu tư, kinh doanh bất động sản", "ky": "", "link": ""}, {"system": "TT31", "ma": "TT31_08-B/CSTT", "msstt": "", "ten": "Báo cáo nghiệp vụ nhận ủy thác", "ky": "", "link": ""}, {"system": "TT31", "ma": "TT31_20B/TD", "msstt": "", "ten": "Báo cáo tình hình tín dụng NNNT", "ky": "", "link": ""}, {"system": "TT31", "ma": "TT31_22B_TD", "msstt": "", "ten": "Báo cáo tình hình thực hiện cấp tín dụng hợp vốn", "ky": "Quý", "link": ""}, {"system": "MIS62", "ma": "HTLS_QD68", "msstt": "msit62", "ten": "Báo cáo tình hình cho vay hỗ trợ lãi suất theo QĐ 68", "ky": "", "link": ""}, {"system": "MIS62", "ma": "TDH_BC01", "msstt": "", "ten": "Báo cáo tình hình quan hệ tín dụng giữa NH và KH", "ky": "", "link": ""}, {"system": "MIS64", "ma": "ATKDB_BCCCV 1575", "msstt": "msit64", "ten": "Dư nợ tín dụng, lãi suất cho vay các lĩnh vực hỗ trợ ưu tiên pt", "ky": "", "link": ""}, {"system": "MIS64", "ma": "KHDN_BC02", "msstt": "", "ten": "Báo cáo tình hình thực hiện theo quyết định 780/QĐ-NHNN", "ky": "", "link": ""}, {"system": "TT35", "ma": "N35_004_TD", "msstt": "", "ten": "Báo cáo tình hình CTD đối với một số ngành thuộc NNNT", "ky": "Quý", "link": ""}, {"system": "TT35", "ma": "VB10265_04_TD", "msstt": "", "ten": "Báo cáo dư nợ TD (không gồm ĐT TP DN) đối với lĩnh vực NNNT", "ky": "", "link": ""}, {"system": "TT11", "ma": "N11_004 N_TD", "msstt": "", "ten": "Báo cáo DN tín dụng đối với  một số ngành NNNT", "ky": "", "link": ""}, {"system": "TT11", "ma": "T11_009_TD", "msstt": "", "ten": "BC dư nợ tín dụng đối với lĩnh vực NNNT", "ky": "x", "link": ""}, {"system": "TT11", "ma": "T11_014_CSTT", "msstt": "", "ten": "BC DN cho vay phục vụ nhu cầu đời sống và DN qua TTD", "ky": "x", "link": ""}, {"system": "msgm", "ma": "GL/PL management", "msstt": "msgm28", "ten": "Báo cáo nợ xấu và tình hình xử lý nợ xấu", "ky": "", "link": ""}, {"system": "msgm", "ma": "Báo cáo cho vay theo CV18", "msstt": "", "ten": "Cho vay đối với người lao động Agribank", "ky": "Quý", "link": ""}, {"system": "msgm", "ma": "Báo cáo KH và người có liên quan", "msstt": "", "ten": "Báo cáo cấp tín dụng đối với KH và người có liên quan", "ky": "Quý", "link": "ftp://10.21.0.22/KHCN/KHANH/Quy Bao cao KH va nguoi co lien quan NHNN ngay 5 dau quy"}, {"system": "msgm", "ma": "Báo cáo theo CV 854", "msstt": "", "ten": "Chương trình MTQG xây dựng nông thôn mới giai đoạn 2121-2025", "ky": "Quý", "link": ""}, {"system": "msgm", "ma": "Báo cáo theo VB 884", "msstt": "", "ten": "Báo cáo tồn tại qua giám sát chấp hành quy định về hoạt động tín dụng", "ky": "", "link": ""}, {"system": "msgm", "ma": "Nguồn vốn", "msstt": "", "ten": "Báo cáo chỉ tiêu huy động vốn cơ quan", "ky": "", "link": ""}, {"system": "msgm", "ma": "CIC", "msstt": "", "ten": "Hạch toán thanh toán phí, làm lại hợp đồng khi hết hạn", "ky": "", "link": ""}, {"system": "msgm", "ma": "Giao dịch động sản", "msstt": "", "ten": "Hạch toán phí, làm lại Hợp đồng khi hết hạn", "ky": "", "link": ""}, {"system": "msgm", "ma": "Giấy CNQSDĐ mất, hủy", "msstt": "", "ten": "Theo dõi giấy chứng nhận QSDĐ mất, thất lạc, hủy", "ky": "", "link": ""}],        // IPCAS reports list
  list: [],          // Quick-link catalog
  phidvExtra: [],    // ✅ PRO-31: Phí GN thêm thủ công (không từ file nguồn)
  phidvStatus: {},   // ✅ PRO-32: Trạng thái báo phí + mức phí tuỳ chỉnh theo từng dòng
  hosovay: {},       // ✅ GD2: Hồ sơ vay theo loại {hmtd:{}, tieudung:{}, camco:{}}
  khmoiExclude: { camco: {}, newcust: {} }, // ✅ KHMOI: loại trừ dòng khỏi phân loại (key -> true)
};
// PATCH v13.8.4: expose DATA for legacy boot hooks. Top-level const does not attach to window,
// so the previous L/S auto-fix checked window.DATA and never ran.
window.DATA = DATA;

let activeTable = 'dashboard';
let sortState = {};   // {key: {col, asc}}
let hasUnsaved = false;
let autoSaveTimer = null;
let _idb = null;
let pendingImportRows = null;  // Holds parsed rows pending confirmation

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const fmtNum = n => {
  if (n == null || n === '' || isNaN(n)) return '';
  return Number(n).toLocaleString('vi-VN');
};
const fmtMoney = n => fmtNum(n);
const fmtMoneyShort = n => {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(2).replace(/\.?0+$/, '') + ' tỷ';
  if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1).replace(/\.?0+$/, '') + ' tr';
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(0) + ' nghìn';
  return fmtNum(n);
};
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ═══════════════════════════════════════════════════════════════
   HYPERLINK TÊN KH → MỞ FOLDER HỒ SƠ TRÊN MÁY TÍNH
   ───────────────────────────────────────────────────────────────
   Folder format: D:\Tín dụng\Hồ sơ vay\{Tên KH} - {Địa chỉ}\
   Quy tắc: Tất cả khoản vay cùng Mã KH luôn link vào CÙNG 1 folder.
            (Lấy Tên + Địa chỉ từ dòng đầu tiên có Mã KH đó)
   Cơ chế:
     1. Click → COPY đường dẫn vào clipboard (luôn hoạt động)
     2. Click → cũng thử mở qua protocol "openhoso://" (cần cài 1 lần)
   Cài đặt protocol: chạy file "1-CAI-DAT-PROTOCOL.bat" với quyền Admin.
   ═══════════════════════════════════════════════════════════════ */
const HOSO_BASE_PATH = 'D:\\Tín dụng\\Hồ sơ vay\\';

// Cache: Mã KH → folder name. Invalidate khi DATA.qltd thay đổi.
let _khFolderCache = null;
let _khFolderCacheVer = -1;

function khBuildFolderName(ten, diachi) {
  const t = String(ten || '').trim();
  if (!t) return '';
  const d = String(diachi || '').trim();
  // Loại các ký tự không hợp lệ trong tên folder Windows: \ / : * ? " < > |
  const clean = s => s.replace(/[\\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  return d ? `${clean(t)} - ${clean(d)}` : clean(t);
}

// Build (hoặc trả từ cache) map Mã KH → folder name từ dòng đầu tiên trong DATA.qltd
function khBuildFolderCache() {
  const ver = (DATA?.qltd?.length || 0);
  if (_khFolderCache && _khFolderCacheVer === ver) return _khFolderCache;
  const map = {};
  for (const r of (DATA?.qltd || [])) {
    const ma = String(r[0] || '').trim();
    if (!ma || map[ma]) continue; // Đã có Mã KH này → giữ nguyên dòng đầu
    const folder = khBuildFolderName(r[1], r[14]);
    if (folder) map[ma] = folder;
  }
  _khFolderCache = map;
  _khFolderCacheVer = ver;
  return map;
}

// Trả folder cho 1 Mã KH (ưu tiên cache, fallback: ten+diachi của dòng hiện tại)
function khFolderForMa(ma, fallbackTen, fallbackDiachi) {
  const m = String(ma || '').trim();
  if (m) {
    const cache = khBuildFolderCache();
    if (cache[m]) return cache[m];
  }
  return khBuildFolderName(fallbackTen, fallbackDiachi);
}

// Sinh hyperlink HTML cho Tên KH. Tham số:
//   ma         - Mã KH (r[0])  ← KEY chính, đảm bảo cùng KH = cùng folder
//   ten        - Tên KH (r[1]) ← fallback nếu Mã KH không có trong cache
//   diachi     - Địa chỉ (r[14]) ← fallback
//   displayHtml- Optional HTML hiển thị thay cho tên (vd: span gạch chân)
function khLink(ma, ten, diachi, displayHtml, soHD) {
  const t = String(ten || '').trim();
  if (!t) return displayHtml || '';
  const inner = (displayHtml !== undefined && displayHtml !== null) ? displayHtml : escapeHtml(t);

  // ── Sync ngược QLTD → HSVV: nếu có HSVV liên kết → click mở HSVV ──
  if (typeof hsvvLinkGetAll === 'function' && typeof hosoGetAll === 'function') {
    try {
      var _qKey   = String(ma || '').trim() + '|' + String(soHD || '').trim();
      var _altKey = String(ma || '').trim() + '|';
      var _links   = hsvvLinkGetAll();
      var _records = hosoGetAll();
      var _hosoId  = Object.keys(_links).find(function(id) {
        return _links[id] === _qKey || (soHD === undefined && _links[id] === _altKey);
      });
      if (_hosoId && _records[_hosoId]) {
        var _safeMa = String(ma || '').replace(/'/g, "\\'");
        var _safeHD = String(soHD || '').replace(/'/g, "\\'");
        return '<a href="javascript:void(0)" class="kh-folder-link kh-hsvv-link"'
          + ' onclick="event.stopPropagation();khLinkClickHandler(\'' + _safeMa + '\',\'' + _safeHD + '\')"'
          + ' title="[HS] ' + escapeHtml(String(ma||'')) + ' HĐ: ' + escapeHtml(String(soHD||'')) + '">'
          + inner + '</a>';
      }
    } catch(e) { /* fallback to folder */ }
  }

  // ── Mặc định: click tên KH → mở popup Xem nhanh ──
  const safeMa2 = String(ma||'').replace(/'/g, "\\'");
  const safeTen2 = t.replace(/'/g, "\\'");
  const safeDc2 = String(diachi||'').replace(/'/g, "\\'");
  const safeHD2 = String(soHD||'').replace(/'/g, "\\'");
  return `<a href="javascript:void(0)" class="kh-folder-link"
            onclick="event.stopPropagation();showKHQuickView('${safeMa2}','${safeTen2}','${safeDc2}','${safeHD2}')"
            title="👤 Click để xem nhanh hồ sơ">${inner}</a>`;
}

// ── Popup XEM NHANH: click tên KH trong bảng QLTD ──
function findQltdRowIdx(ma, soHD) {
  const maS = String(ma||'').trim();
  const hdS = String(soHD||'').trim();
  if (!maS && !hdS) return -1;
  let idx = DATA.qltd.findIndex(r => String(r[0]||'').trim() === maS && String(r[2]||'').trim() === hdS);
  if (idx < 0 && maS) idx = DATA.qltd.findIndex(r => String(r[0]||'').trim() === maS);
  return idx;
}
// ── TSBĐ: lấy dữ liệu tài sản THẬT từ hồ sơ HSVV liên kết (nếu có) ──
// HSVV lưu danh sách tài sản chi tiết trong data._tsbdData (mảng {tenTS,soBiaDo,diaChiTS,giaTS})
// khi người dùng dùng panel "Tài sản bảo đảm" trong FORM HỒ SƠ. Hàm này đọc trực tiếp
// từ đó để 2 trường Tổng giá trị / Số lượng TSBĐ trong QLTD luôn khớp với hồ sơ gốc,
// thay vì phải gõ tay riêng.
function tsbdFromLinkedHoso(ma, soHD) {
  try {
    const qKey   = String(ma || '').trim() + '|' + String(soHD || '').trim();
    const altKey = String(ma || '').trim() + '|';
    const links   = (typeof hsvvLinkGetAll === 'function') ? hsvvLinkGetAll() : {};
    const records = (typeof hosoGetAll === 'function') ? hosoGetAll() : {};
    const hosoId  = Object.keys(links).find(id => links[id] === qKey || links[id] === altKey);
    if (!hosoId || !records[hosoId]) return null;
    const raw = records[hosoId]._tsbdData;
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.length) return null;
    const tong = list.reduce((sum, ts) => sum + (parseFloat(String(ts.giaTS || '').replace(/[^\d.-]/g, '')) || 0), 0);
    return { list, tong, soLuong: list.length, hosoId };
  } catch (e) { return null; }
}

function showKHQuickView(ma, ten, diachi, soHD) {
  const idx = findQltdRowIdx(ma, soHD);
  const r = idx >= 0 ? DATA.qltd[idx] : null;
  $('qv-title').textContent = `👤 ${ten || (r ? r[1] : '')}`;

  const row = (label, val, opts) => {
    if (val === undefined || val === null || val === '') return '';
    return `<div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--gray-100);padding:3px 0">
      <span style="color:var(--gray-500)">${label}</span>
      <strong style="text-align:right${opts&&opts.wrap?';white-space:normal':''}">${opts&&opts.raw ? val : escapeHtml(String(val))}</strong>
    </div>`;
  };

  let body = '';
  if (r) {
    body += row('Mã KH', fmtMaKH(r[0]));
    body += row('Số HĐTD', r[2]);
    body += row('Loại vay', r[13]);
    body += row('Nhóm nợ', r[18]);
    body += row('Dư nợ hiện tại', fmtMoney(r[11]) + ' đ');
    body += row('Tiền lãi phải thu', fmtMoney(r[10]) + ' đ');
    body += row('Ngày giải ngân', r[6]);
    body += row('Ngày trả nợ (đáo hạn)', r[7]);
    body += row('CBTD phụ trách', r[12]);
    body += row('Phòng ban', r[17]);
    body += row('Mục đích vay', r[15], {wrap:true});
    body += row('Địa chỉ KH', r[14] || diachi, {wrap:true});
    const tsbdLinked = tsbdFromLinkedHoso(ma, soHD);
    if (tsbdLinked) {
      const items = tsbdLinked.list.map(ts => `<div style="padding:3px 0;border-bottom:1px dashed var(--gray-100)">
          <div>${escapeHtml(ts.tenTS || '(chưa đặt tên)')}</div>
          <div style="color:var(--gray-500);font-size:11px">${escapeHtml(ts.diaChiTS||'')}${ts.soBiaDo?' · GCN: '+escapeHtml(ts.soBiaDo):''}${ts.giaTS?' · '+escapeHtml(ts.giaTS)+' đ':''}</div>
        </div>`).join('');
      body += `<div style="margin-top:8px;padding:8px 10px;background:var(--blue-pale,#eef4ff);border-radius:6px">
        <div style="font-weight:700;color:var(--navy,#1e3a5f);margin-bottom:4px">🏠 Tài sản bảo đảm <span style="font-weight:400;font-size:10.5px;color:var(--gray-500)">(🔗 đồng bộ từ HSVV)</span></div>
        ${row('Tổng giá trị TSBĐ', fmtMoney(tsbdLinked.tong) + ' đ')}
        ${row('Số lượng TSBĐ', tsbdLinked.soLuong)}
        <div style="margin-top:6px">${items}</div>
      </div>`;
    } else {
      const tsbdGT = Number(r[27]) || 0;
      const tsbdSL = Number(r[28]) || 0;
      if (tsbdGT || tsbdSL) {
        body += `<div style="margin-top:8px;padding:8px 10px;background:var(--gray-50,#f7f7f8);border-radius:6px">
          <div style="font-weight:700;color:var(--navy,#1e3a5f);margin-bottom:4px">🏠 Tài sản bảo đảm <span style="font-weight:400;font-size:10.5px;color:var(--gray-500)">(✍️ nhập tay — chưa liên kết HSVV)</span></div>
          ${row('Tổng giá trị TSBĐ', fmtMoney(tsbdGT) + ' đ')}
          ${row('Số lượng TSBĐ', tsbdSL)}
        </div>`;
      } else {
        body += `<div style="margin-top:8px;padding:8px 10px;background:var(--gray-50,#f7f7f8);border-radius:6px;color:var(--gray-500);font-style:italic">🏠 Chưa có thông tin TSBĐ — liên kết HSVV hoặc bấm "Sửa hồ sơ" để bổ sung</div>`;
      }
    }
  } else {
    body += row('Tên KH', ten);
    body += row('Địa chỉ', diachi, {wrap:true});
    body += `<div style="margin-top:8px;color:var(--gray-500);font-style:italic">Không tìm thấy hồ sơ khớp trong QLTD.</div>`;
  }
  $('qv-body').innerHTML = body;

  // ── Footer actions ──
  const folder = khFolderForMa(ma, ten, diachi);
  const safeFolder = folder ? folder.replace(/'/g, "\\'").replace(/"/g, '&quot;') : '';
  let hasHsvv = false;
  try {
    const qKey = String(ma||'').trim() + '|' + String(soHD||'').trim();
    const altKey = String(ma||'').trim() + '|';
    const links = (typeof hsvvLinkGetAll === 'function') ? hsvvLinkGetAll() : {};
    const records = (typeof hosoGetAll === 'function') ? hosoGetAll() : {};
    const hosoId = Object.keys(links).find(id => links[id] === qKey || links[id] === altKey);
    hasHsvv = !!(hosoId && records[hosoId]);
  } catch(e) {}
  const safeMaF = String(ma||'').replace(/'/g, "\\'");
  const safeHDF = String(soHD||'').replace(/'/g, "\\'");
  let footer = '';
  if (r) footer += `<button class="btn btn-outline" onclick="closeModal('modal-quickview');editRow(${idx})">✏️ Sửa hồ sơ</button>`;
  if (hasHsvv) footer += `<button class="btn btn-outline" onclick="closeModal('modal-quickview');khLinkClickHandler('${safeMaF}','${safeHDF}')">🔗 Mở HSVV liên kết</button>`;
  if (folder) footer += `<button class="btn btn-outline" onclick="openKhFolder('${safeFolder}')">📁 Mở folder hồ sơ</button>`;
  footer += `<button class="btn btn-green" onclick="closeModal('modal-quickview')">Đóng</button>`;
  $('qv-footer').innerHTML = footer;

  openModal('modal-quickview');
}

// ── Handler khi click tên KH trong QLTD có HSVV liên kết ──
function khLinkClickHandler(ma, soHD) {
  const qKey   = String(ma  || '').trim() + '|' + String(soHD || '').trim();
  const altKey = String(ma  || '').trim() + '|';
  try {
    const links   = hsvvLinkGetAll();
    const records = hosoGetAll ? hosoGetAll() : {};
    const hosoId  = Object.keys(links).find(id => links[id] === qKey || links[id] === altKey);
    if (hosoId && records[hosoId]) {
      hsvvOpenLinked(hosoId);
      return;
    }
  } catch(e) {}
  showToast('⚠ Không tìm thấy HSVV liên kết', 'red');
}

function openKhFolder(folderName) {
  if (!folderName) { showToast('⚠ Thiếu tên KH', 'red'); return; }
  const fullPath = HOSO_BASE_PATH + folderName;

  // (1) Copy đường dẫn vào clipboard — luôn hoạt động trên mọi máy
  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullPath).then(
      () => {},
      () => _khFallbackCopy(fullPath)
    );
    copied = true;
  } else {
    copied = _khFallbackCopy(fullPath);
  }

  // (2) Thử mở folder qua custom protocol "openhoso://"
  // Dùng iframe ẩn để không gây navigate trang nếu protocol chưa cài
  try {
    const ifr = document.createElement('iframe');
    ifr.style.display = 'none';
    ifr.src = 'openhoso:' + encodeURIComponent(fullPath);
    document.body.appendChild(ifr);
    setTimeout(() => { try { ifr.remove(); } catch(e){} }, 2000);
  } catch(e) { /* ignore */ }

  // (3) Toast hướng dẫn
  showToast(
    `📁 ${folderName}\n` +
    `${copied ? '✅ Đã copy đường dẫn — Nếu folder không tự mở, paste vào File Explorer (Ctrl+L) để mở.' : '⚠ Không copy được'}`,
    'green'
  );
}

function _khFallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch(e) { return false; }
}

/* HM-06: module số / ngày dùng chung (TD.num, TD.date).
   Một nguồn duy nhất thay cho 3 bản parseVNDate, 2 bản parseNum, groupDigits/stripDots rải rác.
   Nguồn này vừa được nhúng nguyên văn vào app, vừa được Node nạp trực tiếp để kiểm thử (không có bản sao thứ hai). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};

  /* ───────── SỐ ───────── */
  var num = {};
  /* parse(v): số thực hoặc NaN. Nhận 300.000.000 · 300,000,000 · 1.234,56 · 1,234.56 · (1.234) · -5 · 8,5 · 0.075 · "1.234 đ"
     Quy tắc dấu phân cách: có cả '.' và ',' → dấu xuất hiện CUỐI là thập phân, dấu kia là hàng nghìn;
     chỉ một loại dấu, xuất hiện ≥2 lần → hàng nghìn; xuất hiện 1 lần → hàng nghìn nếu đúng 3 chữ số sau dấu
     và phần trước dấu 1–3 chữ số không phải "0"; ngược lại là thập phân. */
  num.parse = function (v) {
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    if (v == null) return NaN;
    var s = String(v).trim();
    if (!s) return NaN;
    if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(s)) return Number(s);
    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/[−–]/g, '-');
    if (s.charAt(0) === '-') { neg = true; s = s.slice(1); }
    s = s.replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return NaN;
    var dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
    var out;
    if (dots && commas) {
      var dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
      var th = dec === '.' ? ',' : '.';
      out = s.split(th).join('');
      var parts = out.split(dec);
      if (parts.length > 2) return NaN; // nhiều dấu thập phân
      out = parts[0] + (parts.length === 2 ? '.' + parts[1] : '');
    } else if (dots || commas) {
      var sep = dots ? '.' : ',';
      var cnt = dots || commas;
      if (cnt >= 2) {
        out = s.split(sep).join('');
      } else {
        var idx = s.indexOf(sep), left = s.slice(0, idx), right = s.slice(idx + 1);
        if (right.length === 3 && /^[1-9]\d{0,2}$/.test(left)) out = left + right;      // 1.234 / 300,000
        else out = left + '.' + right;                                                 // 8,5 / 0.075 / 12,3456
      }
    } else {
      out = s;
    }
    if (out === '' || out === '.') return NaN;
    var n = Number(out);
    if (!isFinite(n)) return NaN;
    return neg ? -n : n;
  };
  num.toNumber = function (v, def) { var n = num.parse(v); return isNaN(n) ? (def === undefined ? 0 : def) : n; };
  /* fmt(n, dec): chuẩn vi-VN (dấu '.' hàng nghìn, ',' thập phân), không phụ thuộc ICU của trình duyệt */
  num.fmt = function (n, dec) {
    n = Number(n); if (!isFinite(n)) return '';
    dec = dec == null ? 0 : dec;
    var neg = n < 0, a = Math.abs(n), f = a.toFixed(dec), p = f.split('.');
    var g = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + g + (p[1] ? ',' + p[1] : '');
  };
  /* tiền VND nhập tay: số → làm tròn nguyên; chuỗi gõ tay → chỉ giữ chữ số; chuỗi số máy (≥4 chữ số + 1–2 thập phân) → làm tròn */
  num.groupVND = function (s) {
    if (s == null || s === '') return '';
    if (typeof s === 'number') return isFinite(s) ? num.fmt(Math.round(s), 0) : '';
    var t = String(s).trim();
    if (/^-?\d{4,}\.\d{1,2}$/.test(t)) return num.fmt(Math.round(Number(t)), 0);
    var neg = /^-/.test(t);
    var d = t.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
    return d ? (neg ? '-' : '') + d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  };
  num.stripVND = function (s) {
    var t = String(s == null ? '' : s).trim();
    var d = t.replace(/[^\d]/g, '');
    return d && /^-/.test(t) ? '-' + d : d;
  };

  /* ───────── NGÀY ───────── */
  var date = {};
  function mk(y, m, d) {            // Date (giờ địa phương 00:00) hoặc null nếu ngày không tồn tại (31/02…)
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1000 || y > 9999) return null;
    var dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return dt;
  }
  var TAIL = '(?![\\d/\\-.])'; // sau năm không được tiếp tục là chữ số hoặc dấu phân cách (tránh "2026-05-31" thành 26/05/31, "…20261")
  var RE = {
    dmy4: new RegExp('^(\\d{1,2})[/\\-.](\\d{1,2})[/\\-.](\\d{4})' + TAIL),
    ymd:  new RegExp('^(\\d{4})[/\\-.](\\d{1,2})[/\\-.](\\d{1,2})(?![\\d])'),
    ymd8: /^(\d{4})(\d{2})(\d{2})$/,
    dmy2: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
  };
  /* parse(s): Date hợp lệ hoặc null. Neo đầu chuỗi (cho phép giờ/chữ theo sau).
     Nhận dd/mm/yyyy, d/m/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd, yyyy/mm/dd, yyyymmdd, dd/mm/yy (năm 2000+). */
  date.parse = function (s) {
    if (s == null || s === '') return null;
    if (s instanceof Date) return isNaN(s) ? null : s;
    var str = String(s).trim(), m;
    if ((m = RE.dmy4.exec(str))) return mk(+m[3], +m[2], +m[1]);
    if ((m = RE.ymd.exec(str))) return mk(+m[1], +m[2], +m[3]);
    if ((m = RE.ymd8.exec(str))) return mk(+m[1], +m[2], +m[3]);
    if ((m = RE.dmy2.exec(str))) return mk(2000 + +m[3], +m[2], +m[1]);
    return null;
  };
  /* find(text): ngày hợp lệ đầu tiên nằm BẤT KỲ đâu trong văn bản (cho phát hiện ngày trên trang); ISO ưu tiên */
  date.find = function (text) {
    if (text == null) return null;
    var t = String(text), m, re;
    re = /(?<![\d/\-.])(\d{4})-(\d{1,2})-(\d{1,2})(?![\d])/g;
    while ((m = re.exec(t))) { var a = mk(+m[1], +m[2], +m[3]); if (a) return a; }
    re = /(?<![\d/\-.])(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?![\d/\-.])/g;
    while ((m = re.exec(t))) { var y = +m[3]; if (m[3].length === 2) y += 2000; var b = mk(y, +m[2], +m[1]); if (b) return b; }
    return null;
  };
  date.iso = function (d) { d = d instanceof Date ? d : date.parse(d); return d ? d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) : ''; };
  date.vn = function (d) { d = d instanceof Date ? d : date.parse(d); return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() : ''; };
  date.isValid = function (s) { return !!date.parse(s); };

  TD.num = num; TD.date = date;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

// Parse "dd/mm/yyyy" → Date (HM-06: gọi TD.date.parse — hợp lệ hoá ngày, từ chối 31/02)
function parseVNDate(s) { return window.TD.date.parse(s); }

/**
 * smartDateToVN — Chuyển đổi BẤT KỲ định dạng date nào về DD/MM/YYYY
 * Hỗ trợ: DD/MM/YYYY, MM/DD/YYYY (IPCAS-US), YYYY-MM-DD,
 *          DD-MM-YYYY, DD.MM.YYYY, YYYYMMDD, Excel serial, Date object
 *
 * ✅ FIX PRO-31: IPCAS xuất ngày MM/DD/YYYY (Mỹ) — vd 04/28/2016.
 *    p2>12 → chắc chắn MM/DD; p1>12 → chắc chắn DD/MM;
 *    ambiguous → dùng cờ window._ipcasImportMode (bật trong transformIPCAS).
 */
function smartDateToVN(s) {
  if (!s && s !== 0) return '';
  const str = String(s).trim();
  if (!str) return '';
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    let p1 = +slashMatch[1], p2 = +slashMatch[2], yr = +slashMatch[3];
    let dd, mm;
    if (p2 > 12)                              { mm = p1; dd = p2; }  // chắc chắn MM/DD/YYYY (tháng không thể >12)
    else if (p1 > 12)                         { dd = p1; mm = p2; }  // chắc chắn DD/MM/YYYY (ngày không thể >12)
    else if (window._ipcasImportMode === true){ mm = p1; dd = p2; }  // ✅ FIX: ambiguous + đang import IPCAS → MM/DD/YYYY (Mỹ)
    else                                      { dd = p1; mm = p2; }  // ambiguous bình thường → DD/MM/YYYY (chuẩn Agribank VN)
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return str;
    return `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${yr}`;
  }
  const d = parseVNDate(str);
  if (d && !isNaN(d)) return fmtVNDate(d);
  if (/^\d+(\.\d+)?$/.test(str)) { // HM-06: chỉ số thuần mới là seri Excel
    const num = parseFloat(str);
    if (!isNaN(num) && num > 1 && num < 100000) return excelSerialToVNDate(num);
  }
  return str;
}
function fmtVNDate(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    const dt = parseVNDate(d);
    if (!dt) return d;
    d = dt;
  }
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
// ISO for <input type="date">
function isoDate(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysDiff(a, b) {
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000);
}
/* HM-07: "Ngày dữ liệu" là nguồn sự thật cho đến hạn / quá hạn / mốc snapshot.
   Nguồn duy nhất: vừa nhúng nguyên văn vào app, vừa được Node nạp để kiểm thử (lưu trữ truyền qua tham số store). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var KEY_DATE = '_currentFileDate', KEY_MODE = 'td_datemode';
  var dd = {};
  dd.store = function () { try { return dd._store || root.localStorage; } catch (e) { return null; } };
  function rd(k) { try { var s = dd.store(); return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function wr(k, v) { try { var s = dd.store(); if (s) { if (v == null) s.removeItem(k); else s.setItem(k, v); } } catch (e) {} }
  function mk(y, m, d) {
    if (y < 2000 || y > 2100) return null;
    var x = new Date(y, m - 1, d);
    return (x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d) ? x : null;
  }
  function vn(x) { return ('0' + x.getDate()).slice(-2) + '/' + ('0' + (x.getMonth() + 1)).slice(-2) + '/' + x.getFullYear(); }
  /* fromFileName(tên): "dd/mm/yyyy" hoặc null. Nhận 30.06.2026 · 30_06_2026 · DUNO_18.08.2026 · msit80_30_06_2026 ·
     2026-06-30 · 20260630 · 30062026. Gạch dưới KHÔNG được coi là biên từ (\b cũ không nhận "DUNO_18.08.2026"). */
  dd.fromFileName = function (name) {
    var t = String(name == null ? '' : name).replace(/\.[A-Za-z0-9]{2,5}$/, ''), m, re, x;
    re = /(?<!\d)(\d{1,2})[._\-\/](\d{1,2})[._\-\/](\d{4})(?!\d)/g;
    while ((m = re.exec(t))) { x = mk(+m[3], +m[2], +m[1]); if (x) return vn(x); }
    re = /(?<!\d)(\d{4})[._\-\/](\d{1,2})[._\-\/](\d{1,2})(?!\d)/g;
    while ((m = re.exec(t))) { x = mk(+m[1], +m[2], +m[3]); if (x) return vn(x); }
    re = /(?<!\d)(\d{8})(?!\d)/g;
    while ((m = re.exec(t))) {
      var s = m[1];
      x = mk(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8)) || mk(+s.slice(4, 8), +s.slice(2, 4), +s.slice(0, 2));
      if (x) return vn(x);
    }
    return null;
  };
  /* get(): Date (00:00) của tệp đang dùng, hoặc null nếu chưa biết */
  dd.get = function () {
    var s = rd(KEY_DATE); if (!s) return null;
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s).trim());
    return m ? mk(+m[3], +m[2], +m[1]) : null;
  };
  dd.set = function (vnStr) { wr(KEY_DATE, vnStr || null); };
  dd.mode = function () { return rd(KEY_MODE) === 'today' ? 'today' : 'data'; };
  dd.setMode = function (m) { wr(KEY_MODE, m === 'today' ? 'today' : 'data'); };
  /* realToday(): hôm nay thật (00:00) */
  dd.realToday = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  /* effective(): ngày dùng để tính đến hạn/quá hạn: ngày dữ liệu nếu chế độ "data" và đã biết, ngược lại hôm nay */
  dd.effective = function () { var g = dd.mode() === 'data' ? dd.get() : null; return g || dd.realToday(); };
  dd.key = function () { return vn(dd.effective()); };
  dd.vn = vn;
  /* label(): nội dung chip */
  dd.label = function () {
    var g = dd.get(), real = dd.realToday(), m = dd.mode();
    if (!g) return { text: '📅 Ngày: hôm nay ' + vn(real), title: 'Chưa nhận được ngày từ tên tệp — đang dùng hôm nay', stale: false, mode: 'today' };
    var lag = Math.round((real - g) / 864e5);
    if (m === 'today') return { text: '📅 Hôm nay ' + vn(real), title: 'Đến hạn/quá hạn tính theo hôm nay. Ngày dữ liệu của tệp: ' + vn(g) + '. Bấm để dùng ngày dữ liệu.', stale: false, mode: 'today' };
    return { text: '📅 Dữ liệu ' + vn(g), title: 'Đến hạn/quá hạn tính theo ngày dữ liệu của tệp (' + vn(g) + ')' + (lag > 0 ? ', cũ ' + lag + ' ngày so với hôm nay' : '') + '. Bấm để chuyển sang hôm nay.', stale: lag > 1, mode: 'data' };
  };
  TD.dataDate = dd;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* HM-08: engine KPI duy nhất TD.metrics — hàm thuần (không đọc DOM/DATA), nhúng nguyên văn vào app và được Node nạp để kiểm thử.
   Cột dòng dư nợ: 0 mã KH · 1 tên · 2 số HĐ · 5 HMTD · 7 ngày đến hạn · 10 lãi · 11 dư nợ · 12 CBTD · 13 loại vay · 17 phòng ban · 18 nhóm nợ.
   Bất biến: Σ theo loại vay = Σ theo nhóm nợ = Σ theo phòng ban = tổng dư nợ (không bao giờ rơi khoản vào "khoảng trống"). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var M = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  var NHOM_LIST = ['Nhóm 1', 'Nhóm 2', 'Nhóm 3', 'Nhóm 4', 'Nhóm 5'];
  var NHOM_UNKNOWN = 'Không rõ nhóm';
  M.NHOM_LIST = NHOM_LIST; M.NHOM_UNKNOWN = NHOM_UNKNOWN;

  /* mã KH: theo mã nếu có, không thì theo tên chuẩn hoá */
  M.customerKey = function (r) {
    var ma = String(r && r[0] != null ? r[0] : '').trim();
    var ten = String(r && r[1] != null ? r[1] : '').trim().replace(/\s+/g, ' ').toUpperCase();
    return ma ? 'M:' + ma : (ten ? 'N:' + ten : '');
  };
  /* đếm KH có tổng dư nợ > 0 */
  M.countCustomers = function (rows) {
    var m = new Map();
    rows.forEach(function (r) { var k = M.customerKey(r); if (k) m.set(k, (m.get(k) || 0) + n(r[11])); });
    var c = 0; m.forEach(function (v) { if (v > 0) c++; }); return c;
  };
  /* loại vay: thấu chi > ngắn > trung > dài > khác. Mỗi dòng đúng MỘT loại (bản cũ đếm 2 lần "trung và dài hạn"). */
  M.classifyLoai = function (v) {
    v = String(v == null ? '' : v);
    if (/thấu\s*chi/i.test(v)) return 'thauchi';
    if (/ngắn\s*hạn/i.test(v)) return 'nganhan';
    if (/trung\s*hạn/i.test(v)) return 'trunghan';
    if (/dài\s*hạn/i.test(v)) return 'daihan';
    return 'khac';
  };
  M.LOAI = [
    { key: 'nganhan', name: 'Vay ngắn hạn (TK 211)' }, { key: 'trunghan', name: 'Vay trung hạn (TK 212)' },
    { key: 'daihan', name: 'Vay dài hạn (TK 213)' }, { key: 'thauchi', name: 'Thấu chi' }, { key: 'khac', name: 'Khác (chưa phân loại)' }];
  /* nhóm nợ: lấy chữ số 1–5 ("Nhóm 3", "3", "N3"); trống/lạ ⇒ "Không rõ nhóm" (bản cũ mặc định "Nhóm 1" và bỏ rơi nhóm lạ) */
  M.nhomRank = function (v) { var m = /\d+/.exec(String(v == null ? '' : v)); return m ? parseInt(m[0], 10) : 0; };
  M.normNhom = function (v) { var k = M.nhomRank(v); return (k >= 1 && k <= 5) ? 'Nhóm ' + k : NHOM_UNKNOWN; };

  function group(rows, keyFn, init) {
    var m = new Map();
    rows.forEach(function (r) {
      var k = keyFn(r), g = m.get(k);
      if (!g) { g = { key: k, rows: [], hs: 0, duno: 0, hmtd: 0, lai: 0, _kh: new Set() }; if (init) init(g, r); m.set(k, g); }
      g.rows.push(r); g.hs++; g.duno += n(r[11]); g.hmtd += n(r[5]); g.lai += n(r[10]);
      var ck = M.customerKey(r); if (ck) g._kh.add(ck);
    });
    return m;
  }
  function fin(g) { g.kh = g._kh.size; delete g._kh; return g; }

  /* summarize(rows, opt): rows = các dòng dư nợ thực tế (đã lọc); opt.today (Date 00:00), opt.pastDue (map key→{duNoQH,laiQH,cleared,...}),
     opt.pdKey(r), opt.parseDate(s). Trả: totals, byLoai (đủ 5 loại), byNhom (5 nhóm + Không rõ nhóm), byPB, byCBTD, duehan, overdue. */
  M.summarize = function (rows, opt) {
    opt = opt || {};
    var parse = opt.parseDate || (root.TD && root.TD.date && root.TD.date.parse) || function () { return null; };
    var today = opt.today || (function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
    var pd = opt.pastDue || {}, pdKey = opt.pdKey || function (r) { return String(r[0] || '').replace(/\D/g, '') + '|' + String(r[2] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(); };
    var out = { rows: rows };
    out.totals = { hs: rows.length, kh: M.countCustomers(rows), duno: 0, lai: 0, hmtd: 0 };
    rows.forEach(function (r) { out.totals.duno += n(r[11]); out.totals.lai += n(r[10]); out.totals.hmtd += n(r[5]); });

    var lm = group(rows, function (r) { return M.classifyLoai(r[13]); });
    out.byLoai = M.LOAI.map(function (d) { var g = lm.get(d.key) || { key: d.key, rows: [], hs: 0, duno: 0, hmtd: 0, lai: 0, _kh: new Set() }; g.name = d.name; return fin(g); });

    var nm = group(rows, function (r) { return M.normNhom(r[18]); });
    out.byNhom = NHOM_LIST.concat([NHOM_UNKNOWN]).map(function (k) { var g = nm.get(k) || { key: k, rows: [], hs: 0, duno: 0, hmtd: 0, lai: 0, _kh: new Set() }; return fin(g); });

    var pm = group(rows, function (r) { return r[17] || '(Chưa phân loại)'; });
    out.byPB = Array.from(pm.values()).map(fin);
    var cm = group(rows, function (r) { return r[12] || '(Chưa phân công)'; }, function (g, r) { g.pb = r[17] || ''; });
    out.byCBTD = Array.from(cm.values()).map(fin);

    /* đến hạn trong tháng của ngày tính + quá hạn (hợp nhất với past-due IPCAS, khử trùng theo HĐTD) */
    var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    out.duehan = rows.filter(function (r) { var d = parse(r[7]); return d && d >= monthStart && d <= today && n(r[11]) > 0; });
    var raw = rows.filter(function (r) {
      var p = pd[pdKey(r)];
      if (p) { if (p.cleared) return false; return n(p.duNoQH) > 0 || n(p.laiQH) > 0; }
      var d = parse(r[7]); return !!(d && d < today && n(r[11]) > 0);
    });
    var om = new Map();
    raw.forEach(function (r) {
      var k = pdKey(r);
      if (!om.has(k)) om.set(k, r.slice());
      else if (!pd[k]) { var a = om.get(k); a[11] = n(a[11]) + n(r[11]); a[10] = n(a[10]) + n(r[10]); }
    });
    out.overdue = Array.from(om.values());
    out.duehanDN = out.duehan.reduce(function (s, r) { return s + n(r[11]); }, 0);
    out.overdueDN = out.overdue.reduce(function (s, r) { var p = pd[pdKey(r)]; return s + (p && p.duNoQH != null ? n(p.duNoQH) : n(r[11])); }, 0);
    return out;
  };
  /* check(summary): bất biến cân đối; trả danh sách lỗi (rỗng = đạt) */
  M.check = function (S) {
    var e = [], t = S.totals.duno, sum = function (a) { return a.reduce(function (s, g) { return s + g.duno; }, 0); };
    ['byLoai', 'byNhom', 'byPB', 'byCBTD'].forEach(function (k) { if (Math.abs(sum(S[k]) - t) > 0.5) e.push(k + ': Σ=' + sum(S[k]) + ' ≠ tổng ' + t); });
    ['byLoai', 'byNhom', 'byPB'].forEach(function (k) { var h = S[k].reduce(function (s, g) { return s + g.hs; }, 0); if (h !== S.totals.hs) e.push(k + ': Σ hồ sơ ' + h + ' ≠ ' + S.totals.hs); });
    return e;
  };
  TD.metrics = M;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* HM-10: lõi đối soát tài sản bảo đảm TD.tsbd — hàm thuần, nhúng nguyên văn vào app và được Node nạp để kiểm thử.
   Dòng TS (đã chuẩn hoá): soTS (clno), maKH (plgcustno), giaTriTS (clamt), giaTriTC (plgamt), tienTe (clccycd), giuTS (clholdcd).
   Quy tắc: một TS (clno) chỉ tính MỘT lần (cùng TS được thế chấp qua nhiều hợp đồng ⇒ nhiều dòng); chỉ cộng VND vào tổng VND
   (USD/EUR tách riêng theo nguyên tệ, không cộng vào đồng); dư nợ của KH chỉ tính MỘT lần dù KH có nhiều TS. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var T = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  T.isVND = function (t) { var c = String(t && t.tienTe != null ? t.tienTe : 'VND').trim().toUpperCase(); return c === '' || c === 'VND'; };
  /* dedupe(rows): giữ dòng đầu của mỗi soTS; dòng không có soTS luôn giữ. Trả {unique, dupRows, dupKeys} */
  T.dedupe = function (rows) {
    var seen = Object.create(null), unique = [], dupRows = [], dupKeys = Object.create(null);
    rows.forEach(function (t) {
      var k = String(t.soTS || '').trim();
      if (!k) { unique.push(t); return; }
      if (seen[k]) { dupRows.push(t); dupKeys[k] = 1; } else { seen[k] = 1; unique.push(t); }
    });
    return { unique: unique, dupRows: dupRows, dupKeys: Object.keys(dupKeys) };
  };
  /* value(t): giá trị TSBĐ tính cho 1 TS = giá trị thế chấp (plgamt) nếu >0, ngược lại giá trị TS (clamt) */
  T.value = function (t) { var c = n(t.giaTriTC); return c > 0 ? c : n(t.giaTriTS); };
  /* summarize(rows): tổng đã khử trùng */
  T.summarize = function (rows) {
    var d = T.dedupe(rows), vnd = 0, vndTC = 0, fx = {}, byLoai = {};
    d.unique.forEach(function (t) {
      if (T.isVND(t)) {
        vnd += n(t.giaTriTS); vndTC += n(t.giaTriTC);
        var L = t.loaiTS || '(không rõ)'; var b = byLoai[L] || (byLoai[L] = [0, 0]); b[0]++; b[1] += n(t.giaTriTS);
      } else { var c = String(t.tienTe).trim().toUpperCase(); var f = fx[c] || (fx[c] = [0, 0]); f[0]++; f[1] += n(t.giaTriTS); }
    });
    var hold = {}; rows.forEach(function (t) { var h = String(t.giuTS == null ? '' : t.giuTS).trim() || '(trống)'; hold[h] = (hold[h] || 0) + 1; });
    return { rows: rows.length, unique: d.unique.length, dupRows: d.dupRows.length, dupKeys: d.dupKeys.length,
      giaTriTS_VND: vnd, giaTriTC_VND: vndTC, giaTriTS_raw: rows.reduce(function (s, t) { return s + n(t.giaTriTS); }, 0), fx: fx, byLoai: byLoai, hold: hold };
  };
  /* byKH(rows, keyFn): Map key → {n, value(VND, khử trùng theo clno), fx:{ccy:[n,sum]}} */
  T.byKH = function (rows, keyFn) {
    var d = T.dedupe(rows), m = new Map();
    d.unique.forEach(function (t) {
      var k = keyFn ? keyFn(t.maKH) : t.maKH; if (!k) return;
      var g = m.get(k); if (!g) { g = { n: 0, value: 0, giaTriTS: 0, fx: {} }; m.set(k, g); }
      g.n++;
      if (T.isVND(t)) { g.value += T.value(t); g.giaTriTS += n(t.giaTriTS); }
      else { var c = String(t.tienTe).trim().toUpperCase(); var f = g.fx[c] || (g.fx[c] = [0, 0]); f[0]++; f[1] += n(t.giaTriTS); }
    });
    return m;
  };
  /* coverage(rows, duNoByKey, keyFn): duNoByKey = Map/obj key → dư nợ (mỗi KH 1 lần). Trả tỷ lệ phủ chung + danh sách KH còn nợ chưa có TS. */
  T.coverage = function (rows, duNoByKey, keyFn) {
    var m = T.byKH(rows, keyFn), get = function (k) { return duNoByKey instanceof Map ? duNoByKey.get(k) : duNoByKey[k]; };
    var keys = duNoByKey instanceof Map ? Array.from(duNoByKey.keys()) : Object.keys(duNoByKey);
    var out = { khCon: 0, khCoTS: 0, khKhongTS: [], duNoCon: 0, duNoCoTS: 0, tsCuaKHCon: 0, duoi100: 0 };
    keys.forEach(function (k) {
      var dn = n(get(k)); if (dn <= 0) return;
      out.khCon++; out.duNoCon += dn;
      var g = m.get(k);
      if (!g || (g.value <= 0 && !Object.keys(g.fx).length)) { out.khKhongTS.push({ key: k, duNo: dn }); return; }
      out.khCoTS++; out.duNoCoTS += dn; out.tsCuaKHCon += g.value;
      if (g.value < dn) out.duoi100++;
    });
    out.tyLePhu = out.duNoCoTS > 0 ? out.tsCuaKHCon / out.duNoCoTS : 0;
    return out;
  };
  TD.tsbd = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* HM-11b: bộ đọc PL02 .docx (bảng giá đất) TD.pl02 — hàm thuần trên chuỗi word/document.xml, không cần DOM; nhúng nguyên văn vào app + Node test.
   parse(xml) → [{ward, stt, duong, tu, den, cells:[12 chuỗi VT1..VT4 × cao/thấp/TB]}] ; issues(rows, W) → {errCells, missingRows, rows} (cùng khuôn BGD_DOCX_ISSUES). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var P = {};
  var nk = function (s) { return s ? String(s).toLowerCase().replace(/\s+/g, '') : ''; }; // bỏ mọi khoảng trắng: docx dính/tách chữ giữa các run ("TâyĐông" ≡ "Tây Đông")
  var unesc = function (s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); };
  var text = function (frag) {
    var t = '', re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<\/w:p>/g, m;
    while ((m = re.exec(frag))) t += m[1] != null ? m[1] : ' ';
    return unesc(t).replace(/\s+/g, ' ').trim();
  };
  P.COLS = ['VT1 cao nhất', 'VT1 thấp nhất', 'VT1 trung bình', 'VT2 cao nhất', 'VT2 thấp nhất', 'VT2 trung bình', 'VT3 cao nhất', 'VT3 thấp nhất', 'VT3 trung bình', 'VT4 cao nhất', 'VT4 thấp nhất', 'VT4 trung bình'];
  P.isNum = function (s) { return /^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(String(s).trim()); };
  /* parse: ward lấy từ đoạn văn gần nhất trước mỗi bảng có dạng "Phường/Xã/Thị trấn …"; 2 dòng đầu mỗi bảng là tiêu đề */
  P.parse = function (xml) {
    var body = xml.slice(Math.max(0, xml.indexOf('<w:body>'))), out = [], pos = 0, m, reT = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
    while ((m = reT.exec(body))) {
      var pre = body.slice(pos, m.index), ward = '', ps = pre.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
      for (var i = ps.length - 1; i >= 0; i--) { var t = text(ps[i]); if (/^(Phường|Xã|Thị trấn)\s/i.test(t)) { ward = t; break; } }
      pos = m.index + m[0].length;
      var trs = m[0].match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [], stt = '', duong = '', vprev = [];
      for (var r = 2; r < trs.length; r++) {
        var cs = []; (trs[r].match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).forEach(function (tc) {
          var g = /<w:gridSpan w:val="(\d+)"/.exec(tc), t = text(tc), vc = /<w:vMerge\s*\/>|<w:vMerge w:val="continue"/.test(tc);
          for (var k = 0, n = g ? +g[1] : 1; k < n; k++) { var col = cs.length; cs.push(vc ? (vprev[col] || '') : t); } // ô gộp cột: lặp theo từng cột; gộp dòng: kế thừa ô dòng trên
        });
        vprev = cs.slice();
        if (cs.length < 16) continue;
        if (cs[0]) stt = cs[0]; if (cs[1]) duong = cs[1];
        out.push({ ward: ward, stt: stt, duong: duong, tu: cs[2], den: cs[3], cells: cs.slice(4, 16) });
      }
    }
    return out;
  };
  /* issues: ô không phải số (vd "#DIV/0!", "chưa hoàn thiện") + dòng PL02 không có trong bảng đang nạp (khoá ward|đường|từ|đến) */
  P.issues = function (rows, W) {
    var have = {};
    Object.keys(W || {}).forEach(function (w) { W[w].forEach(function (r) { have[nk(w) + '|' + nk(r[1]) + '|' + nk(r[2]) + '|' + nk(r[3])] = 1; }); });
    var err = [], miss = [];
    rows.forEach(function (r) {
      var bad = false;
      r.cells.forEach(function (c, i) { if (c !== '' && !P.isNum(c)) { bad = true; err.push([r.ward, r.stt, r.duong, r.tu, r.den, P.COLS[i], c]); } });
      if (!have[nk(r.ward) + '|' + nk(r.duong) + '|' + nk(r.tu) + '|' + nk(r.den)]) miss.push([r.ward, r.stt, r.duong, r.tu, r.den, bad]);
    });
    return { errCells: err, missingRows: miss, rows: rows.length };
  };
  TD.pl02 = P;
  })(typeof window !== 'undefined' ? window : globalThis);

/* HM-11: lõi bảng giá đất TD.giadat — hàm thuần, nhúng nguyên văn vào app và được Node nạp để kiểm thử.
   W[ward] = [[stt, đường, từ, đến, VT1 cao/thấp/TB, VT2 …, VT3 …, VT4 …]]; UB[ward][từ|||đến] = [VT1..VT4] (giá NQ38).
   Bảng NQ38 chỉ khoá theo "từ|||đến" (không có tên đường) ⇒ cùng cặp (từ,đến) thuộc nhiều đường thì KHÔNG xác định được giá nào là của đường nào. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var G = {};
  var nk = function (s) { return s ? String(s).toLowerCase().trim().replace(/\s+/g, ' ') : ''; };
  G.key = function (tu, den) { return nk(tu) + '|||' + nk(den); };
  /* index(W): ward → Map(từ|||đến → [các dòng]) */
  G.index = function (W) {
    var idx = {};
    Object.keys(W).forEach(function (w) {
      var m = new Map();
      W[w].forEach(function (r) { var k = G.key(r[2], r[3]); var a = m.get(k); if (!a) m.set(k, a = []); a.push(r); });
      idx[w] = m;
    });
    return idx;
  };
  /* lookupUBND(idx, UB, ward, tu, den, duong): {price, ambiguous, n}. Khoá trùng (≥2 dòng khác tên đường) ⇒ ambiguous, price=null. */
  G.lookupUBND = function (idx, UB, ward, tu, den, duong) {
    var k = G.key(tu, den), m = idx && idx[ward], rows = m && m.get(k) || [];
    var roads = {}; rows.forEach(function (r) { roads[nk(r[1])] = 1; });
    var amb = Object.keys(roads).length > 1;
    var p = UB && UB[ward] && UB[ward][k] || null;
    return { price: amb ? null : p, ambiguous: amb && !!p, n: rows.length, raw: p };
  };
  G.coeff = function (area, loai) {
    area = +area || 0;
    if (area <= 0) return 1;
    var T = loai === 'nn' ? [[200, 1], [500, 0.95], [2000, 0.9], [5000, 0.8], [10000, 0.7]] : [[100, 1], [300, 0.9], [500, 0.8], [1000, 0.7]];
    for (var i = 0; i < T.length; i++) if (area < T[i][0]) return T[i][1];
    return 0.5;
  };
  /* compute: đơn giá × K1 × K2(diện tích) × K4 × K5 × H1 × H2 (PL01) */
  G.compute = function (o) {
    var k2 = G.coeff(o.area, o.loai), f = (+o.k1 || 1) * k2 * (+o.k4 || 1) * (+o.k5 || 1) * (+o.h1 || 1) * (+o.h2 || 1);
    return { k2: k2, heSo: f, gia: (+o.dongia || 0) * f };
  };
  /* audit(W, UB): các lỗi dữ liệu có thể phát hiện từ chính bảng */
  G.audit = function (W, UB) {
    var idx = G.index(W), out = { rows: 0, dupGroups: [], dupRows: 0, dupAffectedUBND: 0, tbLech: [], ubndCaoHonThap: [], khongCoUBND: 0, khongCoGia: 0 };
    Object.keys(W).forEach(function (w) {
      out.rows += W[w].length;
      idx[w].forEach(function (rows, k) {
        var roads = {}; rows.forEach(function (r) { roads[nk(r[1])] = 1; });
        if (Object.keys(roads).length > 1) {
          out.dupGroups.push({ ward: w, key: k, roads: Object.keys(roads), n: rows.length, ubnd: !!(UB && UB[w] && UB[w][k]) });
          out.dupRows += rows.length; if (UB && UB[w] && UB[w][k]) out.dupAffectedUBND += rows.length;
        }
      });
      W[w].forEach(function (r) {
        var u = UB && UB[w] && UB[w][G.key(r[2], r[3])];
        if (!u) out.khongCoUBND++;
        var anyP = false;
        for (var v = 0; v < 4; v++) {
          var c = +r[4 + 3 * v] || 0, t = +r[5 + 3 * v] || 0, tb = +r[6 + 3 * v] || 0;
          if (c || t || tb) anyP = true;
          if (c > 0 && t > 0 && tb > 0 && Math.abs(tb - (c + t) / 2) > 1) out.tbLech.push({ ward: w, stt: r[0], duong: r[1], tu: r[2], den: r[3], vt: v + 1, cao: c, thap: t, tb: tb, ky_vong: (c + t) / 2 });
          if (u && t > 0 && u[v] > t) out.ubndCaoHonThap.push({ ward: w, stt: r[0], duong: r[1], tu: r[2], den: r[3], vt: v + 1, ubnd: u[v], thap: t });
        }
        if (!anyP) out.khongCoGia++;
      });
    });
    return out;
  };
  TD.giadat = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* HM-12: lõi đối soát số liệu TD.doisoat — hàm thuần (nhận số đã thu thập, trả kết quả + biên bản); nhúng nguyên văn và Node nạp để kiểm thử.
   inp: { dataDate, rows:{hs,duno,kh}, dash:{duno,kh,sumLoai,sumNhom,sumPB}|null, snap:{duno,kh,dayKey}|null, tsbd:{khCon,src}|null,
          bckh:{mapped,unassigned}|null, ls:{high,total}|null } */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var D = {};
  var f = function (v) { return Math.round(+v || 0).toLocaleString('vi-VN'); };
  D.checks = function (inp) {
    var out = [], R = inp.rows, TOL = 0.5;
    function add(id, name, exp, act, note, opt) {
      var skip = act == null || exp == null;
      out.push({ id: id, name: name, expected: exp, actual: act, status: skip ? 'bo_qua' : (Math.abs(exp - act) <= ((opt && opt.tol) || TOL) ? 'khop' : 'lech'), note: note || '' });
    }
    var d = inp.dash;
    add('D1', 'Dashboard · Tổng dư nợ (Bảng I) = tổng tính lại từ dữ liệu', R.duno, d ? d.duno : null, 'Tổng cộng Bảng I theo loại vay');
    add('D2', 'Dashboard · Σ dòng theo loại vay = tổng', R.duno, d ? d.sumLoai : null, 'Mỗi khoản phải rơi vào đúng một loại (kể cả "Khác")');
    add('D3', 'Dashboard · Σ theo nhóm nợ = tổng', R.duno, d ? d.sumNhom : null, 'Kể cả "Không rõ nhóm"');
    add('D4', 'Dashboard · Σ theo phòng ban = tổng', R.duno, d ? d.sumPB : null, '');
    add('D5', 'Dashboard · Số khách hàng (theo mã, dư nợ>0) = tính lại', R.kh, d ? d.kh : null, '');
    var s = inp.snap;
    add('S1', 'Mốc hàng ngày ' + (s ? s.dayKey : '(chưa có)') + ' · Σ dư nợ = dữ liệu hiện tại', R.duno, s ? s.duno : null, 'Lệch nếu đã sửa tay/nhập lại sau khi tạo mốc', { tol: 1 });
    add('S2', 'Mốc hàng ngày · Số KH = dữ liệu hiện tại', R.kh, s ? s.kh : null, '');
    add('T1', 'TSBĐ · KH còn dư nợ (theo hồ sơ vay) = số KH', R.kh, inp.tsbd ? inp.tsbd.khCon : null, inp.tsbd ? 'Nguồn TSBĐ: ' + inp.tsbd.src : 'Chưa nhập tệp TSBĐ');
    add('B1', 'Báo cáo theo CBTD · Σ trong bảng + chưa phân CBTD = tổng', R.duno, inp.bckh ? inp.bckh.mapped + inp.bckh.unassigned : null, inp.bckh && inp.bckh.unassigned ? 'Chưa phân CBTD: ' + f(inp.bckh.unassigned) + ' đ (không nằm trong bảng theo CBTD)' : '');
    if (inp.ls && inp.ls.total) out.push({ id: 'L1', name: 'Lãi suất · tỷ lệ khoản có LS ≥ 18%', expected: null, actual: inp.ls.high / inp.ls.total, status: inp.ls.high / inp.ls.total > 0.7 ? 'lech' : 'khop', note: '>70% cùng LS≥18% nghi lỗi đọc .xlsx cũ — nhập lại tệp' });
    return out;
  };
  D.summary = function (checks) {
    var s = { khop: 0, lech: 0, bo_qua: 0 }; checks.forEach(function (c) { s[c.status]++; });
    s.tong = checks.length; s.text = s.lech ? '⚠️ ' + s.lech + ' chỉ tiêu lệch / ' + (s.khop + s.lech) + ' đã đối soát' : '✅ ' + s.khop + '/' + (s.khop + s.lech) + ' chỉ tiêu khớp' + (s.bo_qua ? ' (' + s.bo_qua + ' chưa có dữ liệu để so)' : '');
    return s;
  };
  D.report = function (inp, checks, meta) {
    var S = D.summary(checks), L = [];
    L.push('BIÊN BẢN ĐỐI SOÁT SỐ LIỆU — QLTD PRO');
    L.push('Ngày dữ liệu: ' + (inp.dataDate || '(không rõ — dùng hôm nay)') + ' · Lập lúc: ' + ((meta && meta.at) || '') + ' · Người lập: ' + ((meta && meta.by) || '(chưa khai)'));
    L.push('Dữ liệu: ' + inp.rows.hs + ' hồ sơ dư nợ · ' + inp.rows.kh + ' khách hàng · tổng dư nợ ' + f(inp.rows.duno) + ' đ');
    L.push('Kết luận: ' + S.text); L.push('');
    checks.forEach(function (c) {
      var st = c.status === 'khop' ? 'KHỚP' : c.status === 'lech' ? 'LỆCH' : 'BỎ QUA';
      L.push('[' + st + '] ' + c.id + ' · ' + c.name);
      if (c.expected != null && c.actual != null) L.push('      tính lại: ' + f(c.expected) + ' | màn hình/nguồn: ' + f(c.actual) + (c.status === 'lech' ? ' | chênh: ' + f(c.actual - c.expected) : ''));
      else if (c.actual != null) L.push('      giá trị: ' + (c.actual * 100).toFixed(1) + '%');
      if (c.note) L.push('      ghi chú: ' + c.note);
    });
    L.push(''); L.push('Quy ước: "tính lại" = cộng trực tiếp từ DATA.qltd, không qua engine TD.metrics; "màn hình" = số đang hiển thị/lưu ở màn hình tương ứng.');
    return L.join('\n');
  };
  TD.doisoat = D;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* ───────── HM-12: thu thập số + giao diện đối soát ───────── */
function tdDoiSoatGather() {
  const num = t => Number(String(t == null ? '' : t).replace(/[^\d-]/g, '')) || 0;
  const q = (DATA.qltd || []).filter(r => r && String((r[0] || '') + (r[1] || '')).trim() && (Number(r[11]) || 0) > 0);
  let duno = 0; const khm = new Map(); let high = 0;
  q.forEach(r => { // tính lại độc lập: cộng trực tiếp, không qua TD.metrics
    const v = Number(r[11]) || 0; duno += v;
    const ma = String(r[0] || '').trim(), k = ma ? 'M:' + ma : 'N:' + String(r[1] || '').trim().replace(/\s+/g, ' ').toUpperCase();
    khm.set(k, (khm.get(k) || 0) + v);
    if ((parseFloat(r[8]) || 0) >= 18) high++;
  });
  let kh = 0; khm.forEach(v => { if (v > 0) kh++; });
  const inp = { dataDate: (TD.dataDate.get() ? TD.dataDate.vn(TD.dataDate.get()) : ''), rows: { hs: q.length, duno: duno, kh: kh }, dash: null, snap: null, tsbd: null, bckh: null, ls: { high: high, total: q.length } };
  // Dashboard: đọc số đang hiển thị (bỏ qua nếu đang lọc)
  try {
    const filt = ['db-filter-cbtd', 'db-filter-pb', 'db-filter-lv', 'db-filter-search'].some(id => { const e = document.getElementById(id); return e && String(e.value || '').trim(); });
    const sumCol = (id, ci) => [...document.querySelectorAll('#' + id + ' tr')].reduce((a, tr) => a + num(tr.children[ci] && tr.children[ci].textContent), 0);
    const tf = document.querySelector('#tfoot-db-main');
    if (!filt && tf && tf.textContent.trim()) inp.dash = { duno: num(document.querySelector('#tfoot-db-main td:nth-child(4)').textContent), kh: num(document.querySelector('#tfoot-db-main td:nth-child(3)').textContent),
      sumLoai: sumCol('tbody-db-main', 3), sumNhom: sumCol('tbody-db-nhomno', 2), sumPB: sumCol('tbody-db-pb', 2) };
  } catch (e) { console.warn('[doisoat dash]', e); }
  try {
    const key = TD.dataDate.get() ? TD.dataDate.vn(TD.dataDate.get()) : null;
    const sn = key && (_archiveReportList || []).filter(x => x && x.autoDaily && x.dayKey === key)[0];
    if (sn) inp.snap = { duno: sn.totalBalance, kh: sn.customers, dayKey: key };
  } catch (e) {}
  try {
    if (window.TSBD && TSBD.rows && TSBD.rows.length && window.TSBD_mdig) {
      const dn = {}; (DATA.qltd || []).forEach(r => { const k = TSBD_mdig(r[0]); if (k) dn[k] = (dn[k] || 0) + (Number(r[11]) || 0); });
      inp.tsbd = { khCon: TD.tsbd.coverage(TSBD.rows, dn, TSBD_mdig).khCon, src: TSBD.src || '' };
    }
  } catch (e) {}
  try {
    if (typeof bckhAggregateData === 'function') {
      const a = bckhAggregateData(DATA.qltd || []); let m = 0;
      Object.keys(a).forEach(k => { if (k !== '__chuaphan') m += a[k].dnAll || 0; });
      inp.bckh = { mapped: m, unassigned: a.__chuaphan ? a.__chuaphan.duno : 0 };
    }
  } catch (e) {}
  return inp;
}
function tdDoiSoatCompute() { const inp = tdDoiSoatGather(), c = TD.doisoat.checks(inp); return { inp: inp, checks: c, summary: TD.doisoat.summary(c) }; }
function tdDoiSoatRun() { // trang Đối soát
  try { renderDashboard(); } catch (e) {}
  const R = tdDoiSoatCompute(); window._tdDoiSoatLast = R;
  const f = v => v == null ? '—' : Math.round(v).toLocaleString('vi-VN');
  const col = { khop: '#15803d', lech: '#dc2626', bo_qua: '#6b7280' }, lab = { khop: '✅ Khớp', lech: '⚠️ Lệch', bo_qua: '… Chưa có dữ liệu' };
  const el = document.getElementById('doisoat-body'); if (!el) return;
  el.innerHTML = '<div style="font-size:1.05rem;font-weight:700;margin:8px 0;color:' + (R.summary.lech ? '#dc2626' : '#166534') + '">' + R.summary.text + '</div>' +
    '<div style="font-size:.85rem;color:#555;margin-bottom:8px">Ngày dữ liệu: <b>' + (R.inp.dataDate || '(không rõ — dùng hôm nay)') + '</b> · ' + R.inp.rows.hs.toLocaleString('vi-VN') + ' hồ sơ · ' + R.inp.rows.kh.toLocaleString('vi-VN') + ' KH · tổng dư nợ ' + f(R.inp.rows.duno) + ' đ</div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>MÃ</th><th>CHỈ TIÊU</th><th style="text-align:right">TÍNH LẠI</th><th style="text-align:right">MÀN HÌNH / NGUỒN</th><th style="text-align:right">CHÊNH</th><th>KẾT QUẢ</th><th>GHI CHÚ</th></tr></thead><tbody>' +
    R.checks.map(c => '<tr><td>' + c.id + '</td><td style="text-align:left">' + c.name + '</td><td style="text-align:right">' + (c.expected == null ? '—' : f(c.expected)) + '</td><td style="text-align:right">' + (c.id === 'L1' ? (c.actual * 100).toFixed(1) + '%' : f(c.actual)) + '</td><td style="text-align:right">' + (c.expected != null && c.actual != null ? f(c.actual - c.expected) : '') + '</td><td style="color:' + col[c.status] + ';font-weight:700">' + lab[c.status] + '</td><td style="text-align:left;font-size:.8rem;color:#555">' + (c.note || '') + '</td></tr>').join('') + '</tbody></table></div>';
  tdDoiSoatStrip(R);
}
function tdDoiSoatExport() {
  const R = window._tdDoiSoatLast || tdDoiSoatCompute();
  const txt = TD.doisoat.report(R.inp, R.checks, { at: new Date().toLocaleString('vi-VN'), by: (localStorage.getItem('td_user') || '') });
  const blob = new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'BienBanDoiSoat_' + (R.inp.dataDate || '').replace(/\//g, '-') + '.txt'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function tdDoiSoatStrip(R) { // dải trạng thái trên Dashboard
  try {
    const pg = document.getElementById('page-dashboard'); if (!pg) return;
    let d = document.getElementById('td-doisoat-strip');
    if (!d) { d = document.createElement('div'); d.id = 'td-doisoat-strip'; d.style.cssText = 'margin:6px 0;padding:6px 12px;border-radius:6px;font:600 13px/1.4 system-ui;cursor:pointer;border:1px solid'; d.onclick = () => showPage('doisoat'); d.title = 'Bấm để mở trang Đối soát số liệu'; pg.insertBefore(d, pg.firstChild); }
    R = R || tdDoiSoatCompute();
    d.textContent = '🔎 Đối soát: ' + R.summary.text;
    d.style.background = R.summary.lech ? '#fef2f2' : '#f0fdf4'; d.style.color = R.summary.lech ? '#991b1b' : '#166534'; d.style.borderColor = R.summary.lech ? '#fecaca' : '#bbf7d0';
  } catch (e) { console.warn('[doisoat strip]', e); }
}
window.tdDoiSoatRun = tdDoiSoatRun; window.tdDoiSoatExport = tdDoiSoatExport;

/* HM-17: lõi chọn cột bảng dữ liệu TD.cols — hàm thuần (preset, chuẩn hoá lưu trữ, CSS), nhúng nguyên văn vào app + Node test.
   Bảng Dư nợ/Ngắn hạn/Trung-dài có 20 cột cùng thứ tự (0 TẤT CẢ, 1 CBTD, 2 PHÒNG BAN, 3 SỐ HỒ SƠ, 4 TÊN KH, 5 MÃ KH, 6 SỐ TK, 7 SỐ HĐTD, 8 NGÀY HĐTD,
   9 ĐẾN HẠN HMTD, 10 HMTD/SỐ TIỀN VAY, 11 SỐ TIỀN GN, 12 DƯ NỢ, 13 NGÀY GN, 14 NGÀY T.NỢ, 15 SỐ GN, 16 L/S%, 17 MỤC ĐÍCH, 18 ĐỊA CHỈ, 19 NHÓM NỢ). */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var C = {};
  C.NCOL = 20;
  C.ALWAYS = [0, 4, 12];                       // luôn hiện: chọn dòng, tên KH, dư nợ
  C.PRESETS = {
    full: { name: 'Đầy đủ', hide: [] },
    g1920: { name: 'Gọn 1920', hide: [6, 15, 17, 18] },
    g1600: { name: 'Gọn 1600', hide: [2, 3, 6, 13, 15, 17, 18] }, // P05: vùng bảng ≈1.590 px khi menu bên cố định (màn 1920)
    g1366: { name: 'Gọn 1366', hide: [2, 3, 6, 8, 10, 11, 13, 15, 17, 18] },
    dt: { name: 'Điện thoại', hide: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18] } // chỉ: chọn dòng, tên KH, dư nợ, nhóm nợ
  };
  C.FIT = ['g1920', 'g1600', 'g1366']; // P05: nếu mẫu mặc định vẫn tràn khung thì lùi dần theo chuỗi này (không áp cho mẫu người dùng đã chọn)
  C.defaultPreset = function (viewportW) { return viewportW >= 1800 ? 'g1920' : viewportW < 700 ? 'dt' : 'g1366'; };
  /* HM-17b: đặc tả các bảng khác (cột logic, đếm cả cột nằm dưới tiêu đề gộp ô). Mặc định 'full' = không tự ẩn cột nào.
     Mẫu "Gọn" chọn theo bề rộng đo trên dữ liệu thật ở 1366 px (vùng bảng ~1288 px). */
  C.SPECS = {
    // Chuyển HM: 0 chọn · 1 CBTD · 2 PHÒNG BAN · 3 ĐẾN HẠN HMTD · 4 TÊN KH · 5 MÃ KH · 6 SỐ HĐTD · 7 NGÀY BĐ HĐ · 8 HMTD · 9 LOẠI VAY · 10 DƯ NỢ · 11 GHI CHÚ
    chlm: { ncol: 12, always: [0, 4, 10], pinTo: 4, presets: { full: { name: 'Đầy đủ', hide: [] }, gon: { name: 'Gọn 1366', hide: [2, 7, 9] }, gon2: { name: 'Gọn 1280', hide: [2, 5, 7, 9, 11] } }, fit: ['gon', 'gon2'] },
    // TSBĐ: 0 # · 1 MÃ KH · 2 TÊN KH · 3 TÊN CHỦ TS · 4 MÃ KH CHỦ TS · 5 LOẠI TS · 6 ĐỊA CHỈ · 7 GIÁ TRỊ TS · 8 TỶ LỆ · 9 SỐ GCN · 10 NGÀY TC · 11 HẾT HẠN · 12 CBTD · 13 DƯ NỢ KH · 14 TRẠNG THÁI
    tsbd: { ncol: 15, always: [0, 2, 7], pinTo: 2, presets: { full: { name: 'Đầy đủ', hide: [] }, gon: { name: 'Gọn 1366', hide: [3, 4, 6, 9, 10, 12] }, gon2: { name: 'Gọn 1280', hide: [1, 3, 4, 6, 9, 10, 12] } }, fit: ['gon', 'gon2'] },
    // Giá đất: 0 STT · 1 Tên đường · 2 Từ · 3 Đến · 4–6 VT1 (cao, thấp, UBND) · 7–9 VT2 · 10–12 VT3 · 13–15 VT4
    giadat: { ncol: 16, always: [0, 1], presets: { full: { name: 'Đầy đủ', hide: [] }, ubnd: { name: 'Chỉ giá UBND (NQ38)', hide: [4, 5, 7, 8, 10, 11, 13, 14] }, vt1: { name: 'Chỉ VT1', hide: [7, 8, 9, 10, 11, 12, 13, 14, 15] } } }
  };
  function sp(spec) { return spec || { ncol: C.NCOL, always: C.ALWAYS, presets: C.PRESETS }; }
  /* sanitize(hide[, spec]): mảng chỉ số hợp lệ, không chứa cột luôn hiện, không trùng, tăng dần */
  C.sanitize = function (hide, spec) {
    var S = sp(spec), s = {}; (hide || []).forEach(function (i) { i = +i; if (i >= 0 && i < S.ncol && S.always.indexOf(i) < 0) s[i] = 1; });
    return Object.keys(s).map(Number).sort(function (a, b) { return a - b; });
  };
  /* resolve(saved, viewportW[, spec]): {preset, hide, pin}; saved = {preset?, hide?, pin?} hoặc null */
  C.resolve = function (saved, viewportW, spec) {
    saved = saved || {}; var S = sp(spec);
    var p = saved.preset && S.presets[saved.preset] ? saved.preset : (saved.hide ? 'custom' : (spec ? 'full' : C.defaultPreset(viewportW)));
    var hide = p === 'custom' ? C.sanitize(saved.hide, spec) : S.presets[p].hide.slice();
    /* P07: chưa chọn gì ⇒ ghim cột đến TÊN KH mặc định (màn ≥1280 px); đã chọn thì theo lựa chọn */
    return { preset: p, hide: hide, pin: spec ? (spec.pinTo != null && saved.pin === true) : (saved.pin === undefined ? viewportW >= 1280 : !!saved.pin) }; // P08: bảng khác chỉ ghim khi người dùng bật (mặc định tắt); Giá đất (tiêu đề 2 hàng) không có ghim
  };
  /* grid(rows): rows = [[{cs, rs}…]…] (các ô của thead/tfoot) ⇒ [[ [đầu, cuối) cột logic ]…] — tính cả rowspan/colspan */
  C.grid = function (rows) {
    var occ = [], out = [];
    rows.forEach(function (cells, r) {
      occ[r] = occ[r] || []; var col = 0, o = [];
      cells.forEach(function (c) {
        while (occ[r][col]) col++;
        var cs = Math.max(1, c.cs | 0), rs = Math.max(1, c.rs | 0);
        for (var y = r; y < r + rs; y++) { occ[y] = occ[y] || []; for (var x = col; x < col + cs; x++) occ[y][x] = 1; }
        o.push([col, col + cs]); col += cs;
      });
      out.push(o);
    });
    return out;
  };
  /* span(range, hide): số cột còn hiện trong [đầu, cuối) — 0 ⇒ ẩn ô */
  C.span = function (rg, hide) { var v = 0; for (var x = rg[0]; x < rg[1]; x++) if (hide.indexOf(x) < 0) v++; return v; };
  /* css(tableId, hide, pinLefts): quy tắc CSS ẩn cột (chỉ thead/tbody; tfoot có 1 ô colspan nên giữ) và ghim các cột đầu đến TÊN KH */
  C.css = function (tid, hide, pinLefts, bodyOnly) { // bodyOnly: tiêu đề gộp ô do C.grid/C.span xử lý
    var out = [];
    hide.forEach(function (i) { out.push((bodyOnly ? '' : '#' + tid + ' thead th:nth-child(' + (i + 1) + '),') + '#' + tid + ' tbody td:nth-child(' + (i + 1) + '){display:none!important}'); });
    if (pinLefts) pinLefts.forEach(function (o) { out.push('#' + tid + ' thead th:nth-child(' + (o.i + 1) + '),#' + tid + ' tbody td:nth-child(' + (o.i + 1) + '){position:sticky;left:' + o.left + 'px;z-index:' + (o.hdr ? 4 : 2) + ';background:var(--td-pin-bg,#fff)}'); });
    return out.join('\n');
  };
  /* pinLefts(widths, hide): các cột hiện từ 0 đến TÊN KH (4) ghim với left cộng dồn */
  C.pinLefts = function (widths, hide, upTo) {
    var left = 0, out = [];
    for (var i = 0; i <= (upTo == null ? 4 : upTo); i++) { if (hide.indexOf(i) >= 0) continue; out.push({ i: i, left: Math.round(left) }); left += widths[i] || 0; }
    return out;
  };
  TD.cols = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* ───────── HM-17: giao diện chọn cột ───────── */
(function () {
  var KEYS = ['qltd', 'kd', 'td', 'chlm', 'tsbd', 'giadat'], LS = 'td_cols_v1_', timer = 0;
  var TID = { tsbd: 'tsbd-table', giadat: 'main-table' }; // HM-17b: bảng khác dùng TD.cols.SPECS (mặc định Đầy đủ)
  function spec(k) { return TD.cols.SPECS[k] || null; }
  function load(k) { try { return JSON.parse(localStorage.getItem(LS + k) || 'null'); } catch (e) { return null; } }
  function save(k, o) { try { localStorage.setItem(LS + k, JSON.stringify(o)); } catch (e) {} }
  function tbl(k) { return document.getElementById(TID[k] || 'table-' + k); }
  function lbl(c) { return c.textContent.replace(/[↕★]/g, '').replace(/\s+/g, ' ').trim(); }
  function cellRows(sec) { return Array.prototype.map.call(sec.rows, function (r) { return Array.prototype.map.call(r.cells, function (c) { return { cs: +(c.dataset.tdCs || c.colSpan), rs: c.rowSpan }; }); }); }
  function names(k) {
    var t = tbl(k); if (!t || !t.tHead) return [];
    if (!spec(k)) return Array.prototype.map.call(t.tHead.rows[0].cells, lbl);
    var g = TD.cols.grid(cellRows(t.tHead)), out = []; // nhãn cột logic = ghép các ô tiêu đề phủ cột đó (vd. "VT1 · UBND (NQ38)")
    Array.prototype.forEach.call(t.tHead.rows, function (r, i) { Array.prototype.forEach.call(r.cells, function (c, j) { for (var x = g[i][j][0]; x < g[i][j][1]; x++) out[x] = out[x] ? out[x] + ' · ' + lbl(c) : lbl(c); }); });
    return out;
  }
  /* tiêu đề/dòng tổng gộp ô: đặt lại colspan theo số cột logic còn hiện, ô không còn cột nào thì ẩn */
  function fixSpans(t, hide) {
    [t.tHead, t.tFoot].forEach(function (sec) {
      if (!sec || !sec.rows.length) return;
      var g = TD.cols.grid(cellRows(sec));
      Array.prototype.forEach.call(sec.rows, function (r, i) { Array.prototype.forEach.call(r.cells, function (c, j) {
        if (!c.dataset.tdCs) c.dataset.tdCs = c.colSpan;
        var v = TD.cols.span(g[i][j], hide); c.style.display = v ? '' : 'none'; c.colSpan = v || +c.dataset.tdCs;
      }); });
    });
  }
  function styleEl() { var e = document.getElementById('td-cols-style'); if (!e) { e = document.createElement('style'); e.id = 'td-cols-style'; document.head.appendChild(e); } return e; }
  function visible(k) { var t = tbl(k); return !!t && t.offsetParent !== null; }
  /* P05: "mẫu hiệu lực" — mẫu cột tự lùi nếu vẫn tràn khung. Bảng Dư nợ: chỉ khi người dùng CHƯA chọn gì (Gọn 1920 → 1600 → 1366);
     bảng khác: khi đang ở mẫu "Gọn" (gon → gon2). Dùng chung cho dựng bảng và cho hộp chọn cột (để "bỏ thêm 1 cột" tính từ mẫu đang HIỆN). */
  function fitR(k, t, S, r) {
    if (!t || !visible(k)) return r;
    var sv = load(k), chain = S ? S.fit : (sv && (sv.preset || sv.hide) ? null : TD.cols.FIT), ix = chain ? chain.indexOf(r.preset) : -1; if (ix < 0) return r;
    var wr = t.closest('.table-wrap') || t.parentElement, tmp = styleEl();
    while (ix < chain.length - 1) {
      tmp.textContent = TD.cols.css(t.id, r.hide, null, !!S); if (S) fixSpans(t, r.hide);
      if (wr.scrollWidth <= wr.clientWidth + 1) break;
      r = TD.cols.resolve({ preset: chain[++ix] }, window.innerWidth, S);
    }
    return r;
  }
  function build() {
    var css = [];
    KEYS.forEach(function (k) {
      var t = tbl(k); if (!t) return;
      var S = spec(k), r = fitR(k, t, S, TD.cols.resolve(load(k), window.innerWidth, S)), pins = null;
      if (S) {
        if (r.pin && visible(k)) { // P08: ghim cột đến TÊN KH cho bảng có pinTo (tiêu đề 1 hàng)
          var tm = styleEl(); tm.textContent = TD.cols.css(t.id, r.hide, null, true); fixSpans(t, r.hide);
          var w2 = Array.prototype.map.call(t.tHead.rows[0].cells, function (c) { return c.getBoundingClientRect().width; });
          pins = TD.cols.pinLefts(w2, r.hide, S.pinTo).map(function (o) { o.hdr = false; return o; });
        }
        css.push(TD.cols.css(t.id, r.hide, pins, true)); fixSpans(t, r.hide);
      }
      else {
      if (r.pin && visible(k)) { // đo bề rộng khi cột đã ẩn đúng
        var tmp = styleEl(); tmp.textContent = TD.cols.css(t.id, r.hide, null);
        var w = Array.prototype.map.call(t.tHead.rows[0].cells, function (c) { return c.getBoundingClientRect().width; });
        pins = TD.cols.pinLefts(w, r.hide).map(function (o) { o.hdr = false; return o; });
      }
      css.push(TD.cols.css(t.id, r.hide, pins));
      }
      var bar = document.querySelector('.td-cols-bar[data-key="' + k + '"]');
      if (bar) {
        Array.prototype.forEach.call(bar.querySelectorAll('[data-p]'), function (b) { b.classList.toggle('on', b.dataset.p === r.preset); });
        var pin = bar.querySelector('[data-act="pin"]'); if (pin) pin.checked = r.pin;
        var nc = S ? S.ncol : TD.cols.NCOL; bar.querySelector('.td-cols-info').textContent = 'Hiện ' + (nc - r.hide.length) + '/' + nc + ' cột';
        Array.prototype.forEach.call(bar.querySelectorAll('.td-cols-panel input'), function (c) { c.checked = r.hide.indexOf(+c.dataset.i) < 0; });
      }
    });
    styleEl().textContent = css.join('\n');
    try { updateTableTopScrollbars(); } catch (e) {}
  }
  function mkBar(k) {
    var t = tbl(k); if (!t || document.querySelector('.td-cols-bar[data-key="' + k + '"]')) return;
    var host = t.closest('.card,.table-card') || t.parentElement.parentElement || t.parentElement;
    var bar = document.createElement('div'); bar.className = 'td-cols-bar'; bar.dataset.key = k;
    var nm = names(k), S = spec(k), PR = S ? S.presets : TD.cols.PRESETS, AL = S ? S.always : TD.cols.ALWAYS;
    bar.innerHTML = '<span class="td-cols-lbl">Cột:</span>' + Object.keys(PR).map(function (p) { return '<button type="button" data-p="' + p + '">' + PR[p].name + '</button>'; }).join('') +
      '<button type="button" data-act="pick">⚙ Chọn cột</button>' + ((S && S.pinTo == null) ? '' : '<label class="td-cols-pin"><input type="checkbox" data-act="pin"> 📌 Ghim đến Tên KH</label>') + '<span class="td-cols-info"></span>' +
      '<div class="td-cols-panel" hidden>' + nm.map(function (n, i) { return '<label><input type="checkbox" data-i="' + i + '"' + (AL.indexOf(i) >= 0 ? ' disabled' : '') + '> ' + escapeHtml(n || ('Cột ' + (i + 1))) + '</label>'; }).join('') + '</div>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.p) { var o = load(k) || {}; save(k, { preset: b.dataset.p, pin: TD.cols.resolve(o, window.innerWidth, spec(k)).pin }); build(); }
      else if (b.dataset.act === 'pick') { var pn = bar.querySelector('.td-cols-panel'); pn.hidden = !pn.hidden; }
    });
    bar.addEventListener('change', function (e) {
      var c = e.target; if (!(c instanceof HTMLInputElement)) return;
      var o = load(k) || {}, r = fitR(k, tbl(k), spec(k), TD.cols.resolve(o, window.innerWidth, spec(k)));
      if (c.dataset.act === 'pin') { save(k, { preset: o.preset, hide: o.hide, pin: c.checked }); }
      else if (c.dataset.i != null) { var h = r.hide.slice(), i = +c.dataset.i, ix = h.indexOf(i); if (c.checked) { if (ix >= 0) h.splice(ix, 1); } else if (ix < 0) h.push(i); save(k, { hide: TD.cols.sanitize(h, spec(k)), pin: r.pin }); }
      build();
    });
    host.insertBefore(bar, host.firstChild);
  }
  function init() { KEYS.forEach(mkBar); build(); }
  function later() { clearTimeout(timer); timer = setTimeout(build, 120); }
  window.addEventListener('resize', later);
  window.addEventListener('load', function () { setTimeout(init, 900); });
  if (document.readyState === 'complete') setTimeout(init, 900);
  window.tdColsBuild = build;
  setTimeout(function () { try { if (window.TD && TD.router) TD.router.onPageEnter('*', function (n) { if (KEYS.indexOf(n) >= 0) { mkBar(n); later(); } }); } catch (e) {} }, 2500);
})();

/* HM-25: cảnh báo sớm TD.warn — hàm thuần, nhúng nguyên văn vào app + Node test.
   Dòng dư nợ: 0 mã KH · 1 tên · 2 số HĐ · 7 ngày đến hạn · 8 lãi suất · 11 dư nợ · 12 CBTD · 18 nhóm nợ.
   inp = { rows, today(Date 00:00), parse(s)→Date|null, prevRows|null, prevLabel, tsbd:{rows, dnByKey, keyFn, cutoffMonths}|null, lsLow, lsHigh } */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var W = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  var DAY = 864e5;
  function ck(r) { var m = String(r[0] == null ? '' : r[0]).trim(); return m ? 'M:' + m : 'N:' + String(r[1] || '').trim().replace(/\s+/g, ' ').toUpperCase(); }
  function rank(v) { var m = /\d+/.exec(String(v == null ? '' : v)); return m ? parseInt(m[0], 10) : 0; }
  W.rank = rank;
  function lsOf(v) { var s = String(v == null ? '' : v).replace('%', '').replace(',', '.').trim(); var x = parseFloat(s); return isFinite(x) ? x : 0; }
  W.lsOf = lsOf;
  function isoOk(s) { var y = +String(s || '').slice(0, 4); return y >= 1990 && y <= 2100; }
  function sec(id, title, items, extra) {
    var kh = {}, duno = 0; items.forEach(function (x) { if (x.key) kh[x.key] = 1; duno += n(x.duno); });
    var o = { id: id, title: title, count: items.length, kh: Object.keys(kh).length, duno: duno, items: items }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return o;
  }
  W.compute = function (inp) {
    var rows = (inp.rows || []).filter(function (r) { return r && n(r[11]) > 0; }), today = inp.today, parse = inp.parse, S = [];
    var lo = inp.lsLow == null ? 4 : inp.lsLow, hi = inp.lsHigh == null ? 13 : inp.lsHigh;
    // 1) đến hạn / quá hạn theo ngày của dữ liệu
    var b = { over: [], d7: [], d15: [], d30: [] };
    rows.forEach(function (r) {
      var d = parse(r[7]); if (!d) return; var k = Math.round((d - today) / DAY);
      var it = { key: ck(r), ma: r[0], ten: r[1], sohd: r[2], due: r[7], days: k, duno: n(r[11]), cbtd: r[12] };
      if (k < 0) b.over.push(it); else if (k <= 7) b.d7.push(it); else if (k <= 15) b.d15.push(it); else if (k <= 30) b.d30.push(it);
    });
    S.push(sec('over', 'Quá hạn (ngày đến hạn < ngày dữ liệu)', b.over.sort(function (a, c) { return a.days - c.days; })));
    S.push(sec('d7', 'Đến hạn trong 7 ngày', b.d7.sort(function (a, c) { return a.days - c.days; })));
    S.push(sec('d15', 'Đến hạn 8–15 ngày', b.d15.sort(function (a, c) { return a.days - c.days; })));
    S.push(sec('d30', 'Đến hạn 16–30 ngày', b.d30.sort(function (a, c) { return a.days - c.days; })));
    // 2) chuyển nhóm nợ (cần mốc kỳ trước)
    if (inp.prevRows && inp.prevRows.length) {
      var pm = {}; inp.prevRows.forEach(function (r) { if (!r) return; var k = ck(r); pm[k] = Math.max(pm[k] || 0, rank(r[18])); });
      var cur = {}; rows.forEach(function (r) { var k = ck(r), o = cur[k] || (cur[k] = { key: k, ma: r[0], ten: r[1], rk: 0, duno: 0, cbtd: r[12] }); o.rk = Math.max(o.rk, rank(r[18])); o.duno += n(r[11]); });
      var mv = []; Object.keys(cur).forEach(function (k) { var c = cur[k]; if (c.rk >= 2 && pm[k] != null && pm[k] <= 1) mv.push({ key: k, ma: c.ma, ten: c.ten, tu: 'Nhóm ' + pm[k], den: 'Nhóm ' + c.rk, duno: c.duno, cbtd: c.cbtd }); });
      S.push(sec('nhom', 'Chuyển nhóm nợ xấu hơn so với ' + (inp.prevLabel || 'kỳ trước'), mv.sort(function (a, c) { return c.duno - a.duno; })));
    } else S.push(sec('nhom', 'Chuyển nhóm nợ — chưa có mốc kỳ trước để so (hãy nhập dư nợ kỳ trước)', [], { skipped: true }));
    // 3) lãi suất bất thường
    var ls = []; rows.forEach(function (r) { var v = lsOf(r[8]); if (!(v > 0) || v < lo || v >= hi) ls.push({ key: ck(r), ma: r[0], ten: r[1], sohd: r[2], ls: v, duno: n(r[11]), cbtd: r[12] }); });
    S.push(sec('ls', 'Lãi suất bất thường (< ' + lo + '% hoặc ≥ ' + hi + '% hoặc trống)', ls.sort(function (a, c) { return c.duno - a.duno; })));
    // 4) TSBĐ
    var T = inp.tsbd;
    if (T && T.rows && T.rows.length) {
      var kf = T.keyFn || function (x) { return x; }, dn = T.dnByKey || {}, cut = T.cutoffMonths == null ? 36 : T.cutoffMonths;
      var todayIso = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);
      var cd = new Date(today.getFullYear(), today.getMonth() - cut, today.getDate()), cutIso = cd.getFullYear() + '-' + ('0' + (cd.getMonth() + 1)).slice(-2) + '-' + ('0' + cd.getDate()).slice(-2);
      var seen = {}, ex = [], old = [];
      T.rows.forEach(function (t) {
        var k = kf(t.maKH); if (!k || n(dn[k]) <= 0) return; var sk = String(t.soTS || '') + '|' + k; if (t.soTS && seen[sk]) return; seen[sk] = 1;
        var it = { key: k, ma: t.maKH, ten: t.tenKH, soTS: t.soTS, loai: t.loaiTS, gt: n(t.giaTriTS), duno: n(dn[k]) };
        if (t.ngayHetHan && isoOk(t.ngayHetHan) && t.ngayHetHan < todayIso) { var e = Object.assign({}, it, { han: t.ngayHetHan }); ex.push(e); }
        if (t.ngayDinhGia && isoOk(t.ngayDinhGia) && t.ngayDinhGia < cutIso) { var o = Object.assign({}, it, { dg: t.ngayDinhGia }); old.push(o); }
      });
      S.push(sec('tsHet', 'TSBĐ của KH còn dư nợ đã hết hạn thế chấp (< ngày dữ liệu)', ex.sort(function (a, c) { return c.gt - a.gt; })));
      S.push(sec('tsCu', 'TSBĐ của KH còn dư nợ có định giá cũ hơn ' + cut + ' tháng', old.sort(function (a, c) { return c.gt - a.gt; })));
      var keys = Object.keys(dn).filter(function (k) { return n(dn[k]) > 0; }), has = {}; T.rows.forEach(function (t) { var k = kf(t.maKH); if (k) has[k] = 1; });
      var names = T.names || {}, no = keys.filter(function (k) { return !has[k]; }).map(function (k) { return { key: k, ma: k, ten: names[k] || '', duno: n(dn[k]) }; });
      S.push(sec('tsKhong', 'KH còn dư nợ chưa có TSBĐ (theo mã KH)', no.sort(function (a, c) { return c.duno - a.duno; })));
    } else S.push(sec('ts', 'TSBĐ — chưa nạp sao kê tài sản để cảnh báo', [], { skipped: true }));
    var total = 0; S.forEach(function (s) { if (!s.skipped && s.id !== 'd15' && s.id !== 'd30' && s.id !== 'tsCu') total += s.count; });
    return { sections: S, total: total };
  };
  W.csv = function (s) {
    var cols = s.items.length ? Object.keys(s.items[0]).filter(function (k) { return k !== 'key'; }) : [], q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.join(',')].concat(s.items.map(function (it) { return cols.map(function (c) { return q(it[c]); }).join(','); })).join('\n');
  };
  TD.warn = W;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* ───────── HM-25: giao diện cảnh báo sớm ───────── */
function tdWarnCompute() {
  const parseD = x => parseVNDate(x);
  const today = todayMidnight();
  let prev = null, prevLabel = '';
  try { // mốc kỳ trước gần nhất (nhỏ hơn ngày dữ liệu)
    (_archiveReportList || []).forEach(x => {
      if (!x || !x.autoDaily || !x.dayKey || !Array.isArray(x.reportData)) return;
      const d = parseVNDate(x.dayKey); if (!d || d >= today) return;
      if (!prev || d > prev.d) prev = { d: d, rows: x.reportData, label: x.dayKey };
    });
  } catch (e) {}
  const inp = { rows: DATA.qltd || [], today: today, parse: parseD, prevRows: prev ? prev.rows : null, prevLabel: prev ? prev.label : '', tsbd: null };
  try {
    if (window.TSBD && TSBD.rows && TSBD.rows.length && window.TSBD_mdig) {
      const dn = {}, names = {}; (DATA.qltd || []).forEach(r => { const k = TSBD_mdig(r[0]); if (!k) return; dn[k] = (dn[k] || 0) + (Number(r[11]) || 0); if (!names[k]) names[k] = r[1]; });
      inp.tsbd = { rows: TSBD.rows, dnByKey: dn, keyFn: TSBD_mdig, names: names, cutoffMonths: 36 };
    }
  } catch (e) {}
  return { inp: inp, res: TD.warn.compute(inp) };
}
function tdWarnRun() {
  const el = document.getElementById('warn-body'); if (!el) return;
  const R = tdWarnCompute(); window._tdWarnLast = R;
  const f = v => Math.round(Number(v) || 0).toLocaleString('vi-VN');
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dd = TD.dataDate.get();
  const cols = { over: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'], d7: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'], d15: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'], d30: ['ma', 'ten', 'sohd', 'due', 'days', 'duno', 'cbtd'],
    nhom: ['ma', 'ten', 'tu', 'den', 'duno', 'cbtd'], ls: ['ma', 'ten', 'sohd', 'ls', 'duno', 'cbtd'], tsHet: ['ma', 'ten', 'soTS', 'loai', 'han', 'gt', 'duno'], tsCu: ['ma', 'ten', 'soTS', 'loai', 'dg', 'gt', 'duno'], tsKhong: ['ma', 'ten', 'duno'] };
  const head = { ma: 'MÃ KH', ten: 'TÊN KH', sohd: 'SỐ HĐ', due: 'ĐẾN HẠN', days: 'NGÀY', duno: 'DƯ NỢ', cbtd: 'CBTD', tu: 'TỪ', den: 'SANG', ls: 'LS %', soTS: 'SỐ TS', loai: 'LOẠI TS', han: 'HẾT HẠN', gt: 'GIÁ TRỊ TS', dg: 'ĐỊNH GIÁ' };
  const num = new Set(['duno', 'gt', 'days', 'ls']);
  el.innerHTML = '<div style="font-size:.85rem;color:#555;margin:4px 0 10px">Ngày dữ liệu: <b>' + (dd ? TD.dataDate.vn(dd) : '(không rõ — dùng hôm nay)') + '</b> · ' + (R.inp.prevLabel ? 'mốc kỳ trước: <b>' + esc(R.inp.prevLabel) + '</b>' : 'chưa có mốc kỳ trước') + ' · <b>' + R.res.total + '</b> mục cần xem</div>' +
    R.res.sections.map(sc => {
      const rows = sc.items.slice(0, 200), cl = cols[sc.id] || [];
      const tone = sc.skipped ? '#6b7280' : (sc.count ? (sc.id === 'over' || sc.id === 'tsHet' ? '#b91c1c' : '#b45309') : '#15803d');
      return '<details class="card" style="margin:8px 0;padding:0"><summary style="cursor:pointer;padding:10px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:1.25rem;font-weight:800;color:' + tone + ';min-width:48px">' + (sc.skipped ? '—' : sc.count.toLocaleString('vi-VN')) + '</span><span style="font-weight:700;flex:1">' + esc(sc.title) + '</span>' +
        (!sc.skipped ? '<span style="font-size:.8rem;color:#555">' + sc.kh.toLocaleString('vi-VN') + ' KH · dư nợ ' + f(sc.duno) + ' đ</span>' : '') + '</summary>' +
        (sc.count ? '<div style="padding:0 14px 10px"><button class="btn btn-ghost btn-sm" onclick="tdWarnCsv(\'' + sc.id + '\')">📄 Xuất CSV</button></div><div class="table-wrap" style="max-height:340px"><table class="data-table"><thead><tr>' + cl.map(c => '<th>' + head[c] + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map(it => '<tr>' + cl.map(c => '<td style="text-align:' + (num.has(c) ? 'right' : 'left') + '">' + (num.has(c) && c !== 'ls' && c !== 'days' ? f(it[c]) : esc(it[c])) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' + (sc.count > 200 ? '<div style="padding:6px 14px;font-size:.8rem">Hiển thị 200/' + sc.count + ' dòng đầu — xuất CSV để xem đủ.</div>' : '') : '<div style="padding:0 14px 10px;color:#555;font-size:.85rem">' + (sc.skipped ? 'Chưa đủ dữ liệu để cảnh báo mục này.' : '✅ Không có.') + '</div>') + '</details>';
    }).join('');
  tdWarnStrip(R);
}
function tdWarnCsv(id) {
  const R = window._tdWarnLast || tdWarnCompute(), sc = R.res.sections.find(x => x.id === id); if (!sc) return;
  const blob = new Blob(['﻿' + TD.warn.csv(sc)], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'CanhBao_' + id + '_' + (TD.dataDate.get() ? TD.dataDate.vn(TD.dataDate.get()).replace(/\//g, '-') : 'hom-nay') + '.csv'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function tdWarnStrip(R) { // dải trên Dashboard
  try {
    const pg = document.getElementById('page-dashboard'); if (!pg) return;
    let d = document.getElementById('td-warn-strip');
    if (!d) { d = document.createElement('div'); d.id = 'td-warn-strip'; d.style.cssText = 'margin:6px 0;padding:6px 12px;border-radius:6px;font:600 13px/1.4 system-ui;cursor:pointer;border:1px solid #fde68a;background:#fffbeb;color:#92400e'; d.onclick = () => showPage('canhbao'); d.title = 'Bấm để mở trang Cảnh báo sớm'; const ref = document.getElementById('td-doisoat-strip'); pg.insertBefore(d, ref ? ref.nextSibling : pg.firstChild); }
    R = R || tdWarnCompute();
    const S = Object.fromEntries(R.res.sections.map(s => [s.id, s]));
    d.textContent = '⚠️ Cảnh báo sớm: ' + R.res.total + ' mục — quá hạn ' + (S.over ? S.over.count : 0) + ' · đến hạn ≤7 ngày ' + (S.d7 ? S.d7.count : 0) + ' · lãi suất bất thường ' + (S.ls ? S.ls.count : 0) + (S.tsKhong ? ' · chưa có TSBĐ ' + S.tsKhong.count : '');
  } catch (e) { console.warn('[warn strip]', e); }
}
window.tdWarnRun = tdWarnRun; window.tdWarnCsv = tdWarnCsv;

/* HM-24: xu hướng nhiều kỳ TD.trend — hàm thuần, nhúng nguyên văn + Node test.
   snaps: [{dayKey:'dd/mm/yyyy', reportData:[dòng dư nợ]}]; summarize = TD.metrics.summarize. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var T = {};
  function pdate(k) { var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(k || '')); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
  /* P09: bộ nhớ đệm tóm tắt theo từng mốc — khoá = mảng dữ liệu gốc của mốc; tổng kiểm các cột mà summarize dùng (mã, tên, HĐ, HMTD, ngày, dư nợ, CBTD, loại, phòng, nhóm)
     nên sửa tại chỗ vẫn tính lại; đổi hàm summarize hoặc ngày cũng tính lại. */
  var memo = typeof WeakMap === 'function' ? new WeakMap() : null;
  var COLS = [0, 1, 2, 5, 7, 10, 11, 12, 13, 17, 18];
  function sigOf(a) {
    var h = a.length | 0;
    for (var i = 0; i < a.length; i++) { var r = a[i] || [], s = ''; for (var c = 0; c < COLS.length; c++) s += r[COLS[c]] + '|'; for (var j = 0; j < s.length; j++) h = (Math.imul(h, 31) + s.charCodeAt(j)) | 0; }
    return h;
  }
  function memoSummary(src, rows, summarize, date) {
    if (!memo || !src || typeof src !== 'object') return summarize(rows, { today: date });
    var sg = sigOf(src) + ':' + (+date), e = memo.get(src);
    if (e && e.fn === summarize && e.sg === sg) return e.S;
    var S = summarize(rows, { today: date }); memo.set(src, { fn: summarize, sg: sg, S: S }); return S;
  }
  /* build: một dòng cho mỗi NGÀY DỮ LIỆU (trùng ngày giữ bản cuối), sắp theo ngày tăng */
  T.build = function (snaps, summarize) {
    var byDay = {};
    (snaps || []).forEach(function (s) { var d = pdate(s && s.dayKey); if (d && Array.isArray(s.reportData) && s.reportData.length) byDay[s.dayKey] = { key: s.dayKey, date: d, rows: s.reportData }; });
    return Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a.date - b.date; }).map(function (p) {
      var rows = p.rows.filter(function (r) { return r && (+r[11] || 0) > 0 && String((r[0] || '') + (r[1] || '')).trim(); });
      var S = memoSummary(p.rows, rows, summarize, p.date); /* P09: mốc lưu trữ không đổi ⇒ không tóm tắt lại (Dashboard/Đối soát từng tính lại 11 mốc mỗi lần mở) */
      var pack = function (g) { return { duno: g.duno, kh: g.kh, hs: g.hs }; }, o = { key: p.key, date: p.date, totals: { duno: S.totals.duno, kh: S.totals.kh, hs: S.totals.hs }, nhom: {}, pb: {}, cbtd: {}, loai: {} };
      S.byNhom.forEach(function (g) { if (g.hs) o.nhom[g.key] = pack(g); }); S.byPB.forEach(function (g) { o.pb[g.key] = pack(g); }); S.byCBTD.forEach(function (g) { o.cbtd[g.key] = pack(g); }); S.byLoai.forEach(function (g) { if (g.hs) o.loai[g.key] = pack(g); });
      return o;
    });
  };
  /* seriesFor(periods, by, metric, topN): {labels, series:[{name, values}]}; by: total|nhom|pb|cbtd|loai */
  T.seriesFor = function (periods, by, metric, topN) {
    var labels = periods.map(function (p) { return p.key; });
    if (by === 'total') return { labels: labels, series: [{ name: 'Tổng', values: periods.map(function (p) { return p.totals[metric]; }) }] };
    var names = {}; periods.forEach(function (p) { Object.keys(p[by] || {}).forEach(function (k) { names[k] = (names[k] || 0) + (p[by][k].duno || 0); }); });
    var last = periods[periods.length - 1], order = Object.keys(names).sort(function (a, b) { var la = last && last[by][a] ? last[by][a].duno : 0, lb = last && last[by][b] ? last[by][b].duno : 0; return lb - la || names[b] - names[a]; });
    var keep = topN ? order.slice(0, topN) : order, rest = order.slice(keep.length);
    var series = keep.map(function (k) { return { name: k, values: periods.map(function (p) { return p[by][k] ? p[by][k][metric] : 0; }) }; });
    if (rest.length) series.push({ name: 'Khác (' + rest.length + ')', values: periods.map(function (p) { return rest.reduce(function (s, k) { return s + (p[by][k] ? p[by][k][metric] : 0); }, 0); }) });
    return { labels: labels, series: series };
  };
  T.delta = function (values) { return values.map(function (v, i) { return i ? v - values[i - 1] : null; }); };
  T.pct = function (values) { return values.map(function (v, i) { return i && values[i - 1] ? (v - values[i - 1]) / values[i - 1] : null; }); };
  T.csv = function (S) {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [['Kỳ'].concat(S.series.map(function (s) { return s.name; })).map(q).join(',')].concat(S.labels.map(function (l, i) { return [l].concat(S.series.map(function (s) { return s.values[i]; })).map(q).join(','); })).join('\n');
  };
  /* ticks: các mốc trục y "đẹp" */
  T.ticks = function (max, n) {
    n = n || 4; if (!(max > 0)) return [0]; var raw = max / n, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p, out = [];
    for (var v = 0; v <= max + step * 0.999; v += step) out.push(v); return out;
  };
  TD.trend = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* ───────── HM-24: giao diện xu hướng ───────── */
(function () {
  var PAL = ['#0d5c1e', '#2563eb', '#b45309', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#9a3412', '#475569'];
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var fmt = function (v, metric) { v = Number(v) || 0; return metric === 'duno' ? (Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ' : Math.round(v / 1e6).toLocaleString('vi-VN') + ' tr') : Math.round(v).toLocaleString('vi-VN'); };
  function periods() {
    var snaps = []; try { (_archiveReportList || []).forEach(function (x) { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) snaps.push(x); }); } catch (e) {}
    return TD.trend.build(snaps, TD.metrics.summarize);
  }
  function chart(S, metric) {
    var W = 860, H = 300, L = 74, R = 30, T = 14, B = 46, n = S.labels.length, mx = 0;
    S.series.forEach(function (s) { s.values.forEach(function (v) { if (v > mx) mx = v; }); });
    var mn = Infinity; S.series.forEach(function (s) { s.values.forEach(function (v) { if (v < mn) mn = v; }); });
    var lo = 0, top, tk;
    if (S.series.length === 1 && mx > mn) { var pad = (mx - mn) * 0.25; lo = Math.max(0, mn - pad); top = mx + pad; tk = [0, 1, 2, 3, 4].map(function (i) { return lo + (top - lo) * i / 4; }); } // một đường: phóng trục để thấy biến động
    else { tk = TD.trend.ticks(mx, 4); top = tk[tk.length - 1] || 1; }
    var x = function (i) { return n > 1 ? L + (W - L - R) * i / (n - 1) : (L + W - R) / 2; }, y = function (v) { return T + (H - T - B) * (1 - (v - lo) / ((top - lo) || 1)); };
    var g = tk.map(function (t) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="#e2e8f0"/><text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="#475569">' + fmt(t, metric) + '</text>'; }).join('');
    var xl = S.labels.map(function (l, i) { return '<text x="' + x(i) + '" y="' + (H - 24) + '" text-anchor="middle" font-size="10.5" fill="#475569" transform="rotate(-25 ' + x(i) + ' ' + (H - 24) + ')">' + esc(l.slice(0, 5) + '/' + l.slice(8)) + '</text>'; }).join('');
    var ls = S.series.map(function (s, k) { var c = PAL[k % PAL.length], pts = s.values.map(function (v, i) { return x(i) + ',' + y(v); }).join(' ');
      return '<polyline fill="none" stroke="' + c + '" stroke-width="2.2" points="' + pts + '"/>' + s.values.map(function (v, i) { return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.2" fill="' + c + '"><title>' + esc(s.name) + ' · ' + esc(S.labels[i]) + ': ' + fmt(v, metric) + '</title></circle>'; }).join(''); }).join('');
    var lg = S.series.map(function (s, k) { return '<span style="display:inline-flex;align-items:center;gap:4px;margin:2px 10px 2px 0;font-size:.8rem"><i style="width:12px;height:3px;background:' + PAL[k % PAL.length] + ';display:inline-block"></i>' + esc(s.name) + '</span>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Biểu đồ xu hướng" style="max-width:' + W + 'px">' + g + xl + ls + '</svg><div>' + lg + '</div>';
  }
  window.tdTrendRun = function () {
    var el = document.getElementById('trend-body'); if (!el) return;
    var metric = (document.getElementById('trend-metric') || {}).value || 'duno', by = (document.getElementById('trend-by') || {}).value || 'total';
    var P = periods(); window._tdTrendLast = { P: P, metric: metric, by: by };
    if (P.length < 2) { el.innerHTML = '<div style="padding:14px;color:#555">Mới có <b>' + P.length + '</b> mốc. Cần ≥ 2 kỳ để vẽ xu hướng — nhập thêm tệp dư nợ các kỳ khác (tên tệp có ngày, vd 31.05.2026.xlsx); mỗi tệp tạo một mốc theo ngày dữ liệu.</div>'; return; }
    var S = TD.trend.seriesFor(P, by, metric, 8); window._tdTrendLast.S = S;
    var tot = S.series.length === 1 ? S.series[0] : null, rows = S.labels.map(function (l, i) {
      return '<tr><td style="text-align:left">' + esc(l) + '</td>' + S.series.map(function (s) { return '<td style="text-align:right">' + fmt(s.values[i], metric) + '</td>'; }).join('') + (tot ? '<td style="text-align:right;color:' + (i && tot.values[i] < tot.values[i - 1] ? '#b91c1c' : '#15803d') + '">' + (i ? (tot.values[i] - tot.values[i - 1] >= 0 ? '+' : '') + fmt(tot.values[i] - tot.values[i - 1], metric) + ' (' + (tot.values[i - 1] ? ((tot.values[i] / tot.values[i - 1] - 1) * 100).toFixed(1) + '%' : '—') + ')' : '—') + '</td>' : '') + '</tr>'; }).join('');
    el.innerHTML = '<div style="font-size:.85rem;color:#555;margin:2px 0 8px"><b>' + P.length + '</b> kỳ: ' + esc(P[0].key) + ' → ' + esc(P[P.length - 1].key) + '</div>' + chart(S, metric) +
      '<div class="table-wrap" style="margin-top:10px;max-height:360px"><table class="data-table"><thead><tr><th>KỲ</th>' + S.series.map(function (s) { return '<th>' + esc(s.name) + '</th>'; }).join('') + (tot ? '<th>THAY ĐỔI SO KỲ TRƯỚC</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  };
  window.tdTrendCsv = function () {
    var L = window._tdTrendLast; if (!L || !L.S) return; var blob = new Blob(['﻿' + TD.trend.csv(L.S)], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'XuHuong_' + L.by + '_' + L.metric + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
})();

/* HM-26: Khách hàng 360° TD.kh360 — hàm thuần, nhúng nguyên văn + Node test.
   Dòng dư nợ: 0 mã KH · 1 tên · 2 số HĐTD · 5 HMTD · 7 đến hạn · 8 lãi suất · 11 dư nợ · 12 CBTD · 13 loại vay · 17 phòng ban · 18 nhóm nợ. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var K = {};
  var n = function (v) { v = +v; return isFinite(v) ? v : 0; };
  function fold(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(); }
  K.fold = fold;
  K.key = function (r) { var m = String(r && r[0] != null ? r[0] : '').trim(); return m ? 'M:' + m : 'N:' + String(r && r[1] || '').trim().replace(/\s+/g, ' ').toUpperCase(); };
  function rank(v) { var m = /\d+/.exec(String(v == null ? '' : v)); return m ? parseInt(m[0], 10) : 0; }
  /* find(rows, q, limit): KH khớp mã (chuỗi số) hoặc tên (không dấu); chỉ KH có dư nợ > 0 trước */
  K.find = function (rows, q, limit) {
    var f = fold(q), d = String(q || '').replace(/\D/g, ''), m = new Map();
    if (!f) return [];
    (rows || []).forEach(function (r) {
      if (!r) return; var k = K.key(r), hit = (d.length >= 3 && String(r[0] || '').indexOf(d) >= 0) || fold(r[1]).indexOf(f) >= 0 || fold(r[2]).indexOf(f) >= 0;
      if (!hit) return; var o = m.get(k); if (!o) m.set(k, o = { key: k, ma: r[0], ten: r[1], duno: 0, hs: 0 }); o.duno += n(r[11]); o.hs++;
    });
    return Array.from(m.values()).sort(function (a, b) { return (b.duno > 0) - (a.duno > 0) || b.duno - a.duno; }).slice(0, limit || 12);
  };
  /* history(snaps, key): [{key: dayKey, date, duno, nhom, hs}] theo ngày tăng; snaps đã lọc autoDaily */
  K.history = function (snaps, key, parse) {
    var byDay = {};
    (snaps || []).forEach(function (s) {
      if (!s || !s.dayKey || !Array.isArray(s.reportData)) return; var d = parse(s.dayKey); if (!d) return;
      var o = { key: s.dayKey, date: d, duno: 0, nhom: 0, hs: 0 };
      s.reportData.forEach(function (r) { if (r && K.key(r) === key && n(r[11]) > 0) { o.duno += n(r[11]); o.hs++; o.nhom = Math.max(o.nhom, rank(r[18])); } });
      byDay[s.dayKey] = o;
    });
    return Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a.date - b.date; });
  };
  /* build(ctx): ctx = {key, rows, tsbd:{rows,keyFn,dedupe,value,isVND}|null, snaps, parse, today, hoso:[{id,ten,loai,ngay}]} */
  K.build = function (ctx) {
    var mine = (ctx.rows || []).filter(function (r) { return r && K.key(r) === ctx.key; });
    var act = mine.filter(function (r) { return n(r[11]) > 0; });
    var h = { key: ctx.key, ma: mine[0] ? mine[0][0] : '', ten: mine[0] ? mine[0][1] : '', cbtd: mine[0] ? mine[0][12] : '', pb: mine[0] ? mine[0][17] : '', duno: 0, hmtd: 0, nhom: 0, nKhoan: act.length, nHDTD: 0 };
    var hd = {}; mine.forEach(function (r) { h.hmtd += n(r[5]); });
    act.forEach(function (r) { h.duno += n(r[11]); h.nhom = Math.max(h.nhom, rank(r[18])); hd[String(r[2] || '')] = 1; }); h.nHDTD = Object.keys(hd).length;
    // HMTD: cộng một lần cho mỗi HĐTD (hồ sơ có nhiều khế ước cùng HMTD)
    var seen = {}, hm = 0; mine.forEach(function (r) { var k = String(r[2] || ''); if (k && !seen[k]) { seen[k] = 1; hm += n(r[5]); } }); h.hmtd = hm;
    var khoan = mine.slice().sort(function (a, b) { return n(b[11]) - n(a[11]); }).map(function (r) {
      var d = ctx.parse ? ctx.parse(r[7]) : null, days = d && ctx.today ? Math.round((d - ctx.today) / 864e5) : null;
      return { sohd: r[2], loai: r[13], hmtd: n(r[5]), duno: n(r[11]), ls: r[8], den: r[7], days: days, nhom: r[18] };
    });
    var ts = null;
    if (ctx.tsbd && ctx.tsbd.rows) {
      var list = ctx.tsbd.rows.filter(function (t) { return ctx.tsbd.keyFn(t.maKH) === ctx.tsbd.mdig; });
      var u = ctx.tsbd.dedupe(list).unique, gt = 0, fx = 0;
      u.forEach(function (t) { if (ctx.tsbd.isVND(t)) gt += ctx.tsbd.value(t); else fx++; });
      ts = { n: u.length, gt: gt, fx: fx, ratio: h.duno > 0 ? gt / h.duno : null, list: u.slice(0, 50).map(function (t) { return { soTS: t.soTS, loai: t.loaiTS, gt: ctx.tsbd.isVND(t) ? ctx.tsbd.value(t) : 0, tienTe: t.tienTe, han: t.ngayHetHan, dg: t.ngayDinhGia, dc: t.diaChiTS }; }) };
    }
    return { header: h, khoan: khoan, ts: ts, history: K.history(ctx.snaps, ctx.key, ctx.parse), hoso: ctx.hoso || [] };
  };
  TD.kh360 = K;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* ───────── HM-26: giao diện Khách hàng 360° ───────── */
(function () {
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (v) { return Math.round(Number(v) || 0).toLocaleString('vi-VN'); };
  var tyd = function (v) { v = Number(v) || 0; return (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ'; };
  var st = { key: null, tab: 'khoan' };
  function noteKey(h) { return 'td_kh_note_' + (h.ma || h.key); }
  function snaps() { var a = []; try { (_archiveReportList || []).forEach(function (x) { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) a.push(x); }); } catch (e) {} return a; }
  function hoso(ma) {
    var out = []; try {
      var links = hsvvLinkGetAll(), recs = hosoGetAll(), m = String(ma || '').trim(); if (!m) return out;
      Object.keys(links).forEach(function (id) { var v = String(links[id] || ''); if (v.split('|')[0] === m && recs[id]) out.push({ id: id, ten: (recs[id]._meta && recs[id]._meta.tenKH) || '', sohd: v.split('|')[1] || '', loai: (recs[id]._meta && (recs[id]._meta.loai || recs[id]._meta.loaiHS)) || '', ngay: (recs[id]._meta && (recs[id]._meta.updated || recs[id]._meta.ngay)) || '' });
      });
    } catch (e) {} return out;
  }
  function compute() {
    var K = TD.kh360, t = { rows: null };
    var tsbd = null;
    try { if (window.TSBD && TSBD.rows && TSBD.rows.length && window.TSBD_mdig) { var row = (DATA.qltd || []).filter(function (r) { return r && K.key(r) === st.key; })[0]; tsbd = { rows: TSBD.rows, keyFn: TSBD_mdig, mdig: TSBD_mdig(row ? row[0] : ''), dedupe: TD.tsbd.dedupe, value: TD.tsbd.value, isVND: TD.tsbd.isVND }; } } catch (e) {}
    var row0 = (DATA.qltd || []).filter(function (r) { return r && K.key(r) === st.key; })[0];
    return K.build({ key: st.key, rows: DATA.qltd || [], tsbd: tsbd, snaps: snaps(), parse: parseVNDate, today: todayMidnight(), hoso: hoso(row0 ? row0[0] : '') });
  }
  function bars(H) {
    if (!H.length) return '<div style="padding:12px;color:#555">Chưa có mốc nào chứa khách hàng này — nhập thêm tệp dư nợ các kỳ.</div>';
    var W = 760, Hh = 240, L = 60, B = 40, T = 12, mx = Math.max.apply(null, H.map(function (x) { return x.duno; })) || 1, bw = Math.min(54, (W - L - 10) / H.length - 8);
    var svg = H.map(function (x, i) { var h = (Hh - T - B) * x.duno / mx, cx = L + (W - L - 10) * (i + .5) / H.length; return '<rect x="' + (cx - bw / 2) + '" y="' + (Hh - B - h) + '" width="' + bw + '" height="' + Math.max(h, x.duno ? 1 : 0) + '" rx="3" fill="' + (x.nhom >= 2 ? '#b45309' : '#0d5c1e') + '"><title>' + esc(x.key) + ': ' + money(x.duno) + ' đ · ' + x.hs + ' khoản · Nhóm ' + x.nhom + '</title></rect><text x="' + cx + '" y="' + (Hh - B + 14) + '" text-anchor="middle" font-size="10" fill="#475569" transform="rotate(-25 ' + cx + ' ' + (Hh - B + 14) + ')">' + esc(x.key.slice(0, 5) + '/' + x.key.slice(8)) + '</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" style="max-width:' + W + 'px"><line x1="' + L + '" x2="' + (W - 10) + '" y1="' + (Hh - B) + '" y2="' + (Hh - B) + '" stroke="#cbd5e1"/><text x="' + (L - 6) + '" y="' + (T + 8) + '" text-anchor="end" font-size="10.5" fill="#475569">' + tyd(mx) + '</text><text x="' + (L - 6) + '" y="' + (Hh - B) + '" text-anchor="end" font-size="10.5" fill="#475569">0</text>' + svg + '</svg><div style="font-size:.78rem;color:#555">Cột cam = có nhóm nợ ≥ 2 ở kỳ đó.</div>';
  }
  function render() {
    var box = document.getElementById('kh360-view'); if (!box) return;
    if (!st.key) { box.innerHTML = '<div style="padding:16px;color:#555">Gõ tên / mã KH / số HĐTD vào ô tìm kiếm phía trên (hoặc dùng Ctrl+K).</div>'; return; }
    var B = compute(), h = B.header;
    if (!h.nKhoan && !B.khoan.length) { box.innerHTML = '<div style="padding:16px;color:#b91c1c">Không tìm thấy khách hàng trong dữ liệu đang nạp.</div>'; return; }
    var card = function (t, v, sub, cls) { return '<div style="flex:1 1 190px;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;background:#fff"><div style="font-size:.75rem;color:#566579">' + t + '</div><div style="font-size:1.5rem;font-weight:800;' + (cls || '') + '">' + v + '</div><div style="font-size:.78rem;color:#566579">' + sub + '</div></div>'; };
    var use = h.hmtd > 0 ? (h.duno / h.hmtd * 100).toFixed(1) + '% hạn mức' : '—';
    var tsHtml = B.ts ? card('TSBĐ (khử trùng clno)', tyd(B.ts.gt), B.ts.n + ' tài sản' + (B.ts.ratio != null ? ' · ' + B.ts.ratio.toFixed(2) + '× dư nợ' : '') + (B.ts.fx ? ' · ' + B.ts.fx + ' ngoại tệ' : '')) : card('TSBĐ', '—', 'chưa nạp sao kê TSBĐ');
    var tabs = [['khoan', 'Khoản vay'], ['ts', 'Tài sản bảo đảm'], ['ls', 'Lịch sử các kỳ'], ['hs', 'Hồ sơ vay'], ['gc', 'Ghi chú']];
    var note = ''; try { note = localStorage.getItem(noteKey(h)) || ''; } catch (e) {}
    var body = {
      khoan: '<div class="table-wrap"><table class="data-table"><thead><tr><th>SỐ HĐTD</th><th>LOẠI</th><th style="text-align:right">HMTD</th><th style="text-align:right">DƯ NỢ</th><th>L/S %</th><th>ĐẾN HẠN</th><th>NHÓM</th></tr></thead><tbody>' + B.khoan.map(function (k) { return '<tr><td>' + esc(k.sohd) + '</td><td>' + esc(k.loai) + '</td><td style="text-align:right">' + money(k.hmtd) + '</td><td style="text-align:right"><b>' + money(k.duno) + '</b></td><td>' + esc(k.ls) + '</td><td>' + esc(k.den) + (k.days != null ? ' <small style="color:' + (k.days < 0 ? '#b91c1c' : k.days <= 30 ? '#b45309' : '#555') + '">(' + (k.days < 0 ? 'quá ' + (-k.days) + 'd' : 'còn ' + k.days + 'd') + ')</small>' : '') + '</td><td>' + esc(k.nhom) + '</td></tr>'; }).join('') + '</tbody></table></div>',
      ts: B.ts ? (B.ts.n ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>SỐ TS</th><th>LOẠI</th><th style="text-align:right">GIÁ TRỊ (VND)</th><th>HẾT HẠN</th><th>ĐỊNH GIÁ</th><th>ĐỊA CHỈ</th></tr></thead><tbody>' + B.ts.list.map(function (t) { return '<tr><td>' + esc(t.soTS) + '</td><td>' + esc(t.loai) + '</td><td style="text-align:right">' + (t.tienTe && String(t.tienTe).toUpperCase() !== 'VND' ? esc(t.tienTe) + ' (chưa quy đổi)' : money(t.gt)) + '</td><td>' + esc(t.han) + '</td><td>' + esc(t.dg) + '</td><td style="text-align:left">' + esc(t.dc) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div style="padding:12px;color:#555">Không có tài sản bảo đảm nào theo mã KH này trong sao kê (có thể đứng tên bên thứ ba).</div>') : '<div style="padding:12px;color:#555">Chưa nạp sao kê TSBĐ — vào trang Tài sản bảo đảm để nhập.</div>',
      ls: bars(B.history),
      hs: B.hoso.length ? '<div class="table-wrap"><table class="data-table"><thead><tr><th>TÊN TRÊN HỒ SƠ</th><th>SỐ HĐ</th><th>LOẠI</th><th></th></tr></thead><tbody>' + B.hoso.map(function (x) { return '<tr><td style="text-align:left">' + esc(x.ten) + '</td><td>' + esc(x.sohd) + '</td><td>' + esc(x.loai) + '</td><td><button class="btn btn-green btn-sm" onclick="hsvvOpenLinked(\'' + esc(x.id) + '\')">Mở hồ sơ</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div style="padding:12px;color:#555">Chưa có hồ sơ vay vốn (HSVV) liên kết với mã KH này.</div>',
      gc: '<textarea id="kh360-note" rows="6" style="width:100%;max-width:760px;padding:8px;border:1px solid #cbd5e1;border-radius:6px" placeholder="Ghi chú theo khách hàng (lưu trên máy này, theo mã KH)…">' + esc(note) + '</textarea><div id="kh360-note-st" style="font-size:.78rem;color:#555;margin-top:4px"></div>'
    };
    box.innerHTML = '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:flex-end"><div><div style="font-size:1.4rem;font-weight:800">' + esc(h.ten) + '</div><div style="font-size:.85rem;color:#566579">Mã KH ' + esc(h.ma || '(không có)') + ' · CBTD ' + esc(h.cbtd) + ' · ' + esc(h.pb) + '</div></div><div><button class="btn btn-ghost btn-sm" onclick="tdKh360InQltd()">Xem trong Dư nợ</button></div></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0">' + card('Dư nợ', tyd(h.duno), h.nKhoan + ' khoản · ' + h.nHDTD + ' HĐTD') + card('Hạn mức', tyd(h.hmtd), 'dùng ' + use) + tsHtml + card('Nhóm nợ', 'Nhóm ' + (h.nhom || 1), h.nhom >= 2 ? 'cần theo dõi' : 'bình thường', h.nhom >= 2 ? 'color:#b45309' : '') + '</div>' +
      '<div style="display:flex;gap:4px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;flex-wrap:wrap">' + tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" class="kh360-tab' + (st.tab === t[0] ? ' on' : '') + '" onclick="tdKh360Tab(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('') + '</div><div id="kh360-body">' + body[st.tab] + '</div>';
    var ta = document.getElementById('kh360-note'); if (ta) { var tm = 0; ta.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { try { localStorage.setItem(noteKey(h), ta.value); document.getElementById('kh360-note-st').textContent = '✅ Đã lưu ' + new Date().toLocaleTimeString('vi-VN'); } catch (e) { document.getElementById('kh360-note-st').textContent = '⚠️ Không lưu được'; } }, 400); }); }
  }
  window.tdKh360Tab = function (t) { st.tab = t; render(); };
  window.tdKh360Run = function () { render(); };
  window.tdKh360Open = function (ma, ten) {
    var K = TD.kh360, rows = DATA.qltd || [], r = rows.filter(function (x) { return x && (String(x[0] || '').trim() === String(ma || '').trim()) && String(ma || '').trim(); })[0] || rows.filter(function (x) { return x && ten && String(x[1] || '').trim() === String(ten).trim(); })[0];
    if (r) st.key = K.key(r); st.tab = 'khoan'; showPage('khachhang');
    var inp = document.getElementById('kh360-q'); if (inp && r) inp.value = r[1];
  };
  window.tdKh360Search = function (q) {
    var res = document.getElementById('kh360-res'); if (!res) return; var L = TD.kh360.find(DATA.qltd || [], q, 12);
    res.innerHTML = L.map(function (x) { return '<div class="kh360-hit" onclick="tdKh360Pick(\'' + esc(x.key).replace(/'/g, '') + '\')"><b>' + esc(x.ten) + '</b> <small>' + esc(x.ma) + ' · dư nợ ' + tyd(x.duno) + '</small></div>'; }).join('') || (q ? '<div style="padding:6px 10px;color:#555">Không có kết quả</div>' : '');
    window._kh360hits = L;
  };
  window.tdKh360Pick = function (key) { var L = window._kh360hits || [], x = L.filter(function (y) { return y.key.replace(/'/g, '') === key; })[0]; if (!x) return; st.key = x.key; st.tab = 'khoan'; document.getElementById('kh360-res').innerHTML = ''; document.getElementById('kh360-q').value = x.ten; render(); };
  window.tdKh360InQltd = function () { var inp; showPage('qltd'); setTimeout(function () { inp = document.getElementById('search-qltd'); var r = (DATA.qltd || []).filter(function (x) { return x && TD.kh360.key(x) === st.key; })[0]; if (inp && r) { inp.value = r[1]; inp.dispatchEvent(new Event('input')); } }, 200); };
})();

/* HM-23: Trung tâm nhập dữ liệu TD.hub — hàm thuần: nhận dạng loại tệp, lập kế hoạch nhập nhiều tệp (theo ngày), kiểm tra quy tắc. Nhúng nguyên văn + Node test. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var H = {};
  /* kind(name): 'tsbd' nếu tên gợi ý sao kê tài sản bảo đảm, ngược lại 'duno' (dư nợ msit80). Phần mở rộng không hợp lệ ⇒ 'bo-qua'. */
  H.kind = function (name) {
    var n = String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    if (!/\.(xls|xlsx|xlsm|csv)$/.test(n)) return 'bo-qua';
    if (/(tai san|taisan|tsbd|sao ke|saoke|collateral)/.test(n)) return 'tsbd';
    return 'duno';
  };
  /* sniffKind(hdrRow): nhận dạng theo TIÊU ĐỀ cột (hàng đầu): sao kê TSBĐ IPCAS có clno + clcustno/plgcustno ⇒ 'tsbd'; không nhận ra ⇒ null (giữ kết quả theo tên tệp). P07 */
  H.sniffKind = function (hdr) {
    var h = (hdr || []).map(function (x) { return String(x == null ? '' : x).trim().toLowerCase(); });
    return h.indexOf('clno') >= 0 && (h.indexOf('clcustno') >= 0 || h.indexOf('plgcustno') >= 0) ? 'tsbd' : null;
  };
  var parseVn = function (s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
  /* plan(files, dateOf): dateOf(name) → 'dd/mm/yyyy'|null. Dư nợ nhập theo ngày TĂNG (tệp cuối = mới nhất sẽ là dữ liệu hiện hành);
     chỉ nhập tệp TSBĐ MỚI NHẤT; bỏ tệp trùng (cùng loại + cùng ngày); trả kèm cảnh báo. */
  H.plan = function (files, dateOf) {
    var items = (files || []).map(function (f, i) { var k0 = H.kind(f.name), k = k0 === 'bo-qua' ? k0 : (f.kind || k0), d = k === 'bo-qua' ? null : dateOf(f.name); return { idx: i, name: f.name, size: f.size, kind: k, date: d, warn: [], skip: null, exclude: !!f.exclude }; });
    var seen = {};
    items.forEach(function (it) {
      if (it.kind === 'bo-qua') { it.skip = 'Định dạng không hỗ trợ'; return; }
      if (it.exclude) { it.skip = 'Đã loại khỏi lần nhập (theo lựa chọn)'; return; } // P08: tệp bị loại không tham gia chống trùng / chọn TSBĐ mới nhất
      var key = it.kind + '|' + (it.date || it.name);
      if (seen[key]) { it.skip = 'Trùng loại + ngày với "' + seen[key] + '"'; return; } seen[key] = it.name;
      if (!it.date) it.warn.push('Tên tệp không có ngày ⇒ dùng hôm nay làm ngày dữ liệu');
    });
    var ts = items.filter(function (x) { return x.kind === 'tsbd' && !x.skip; }).sort(function (a, b) { return (parseVn(a.date) || 0) - (parseVn(b.date) || 0); });
    ts.slice(0, -1).forEach(function (x) { x.skip = 'Chỉ nhập sao kê TSBĐ mới nhất (' + ts[ts.length - 1].name + ')'; });
    var dn = items.filter(function (x) { return x.kind === 'duno' && !x.skip; }).sort(function (a, b) { var da = parseVn(a.date), db = parseVn(b.date); return (da ? +da : Infinity) - (db ? +db : Infinity); });
    var last = dn.length ? dn[dn.length - 1] : null, tsLast = ts.length ? ts[ts.length - 1] : null;
    if (last && tsLast && last.date && tsLast.date && parseVn(tsLast.date) < parseVn(last.date)) tsLast.warn.push('Sao kê TSBĐ (' + tsLast.date + ') cũ hơn dư nợ mới nhất (' + last.date + ')');
    var order = dn.concat(ts.filter(function (x) { return !x.skip; })); order.forEach(function (x, i) { x.order = i + 1; });
    return { items: items, order: order, nImport: order.length, nSkip: items.filter(function (x) { return x.skip; }).length };
  };
  H.fmtBytes = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
  H.hex = function (buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2); return s; };
  TD.hub = H;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* ───────── HM-23: giao diện Trung tâm nhập dữ liệu ───────── */
(function () {
  var LOGK = 'td_hub_log_v1', files = [], plan = null, running = false;
  var esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (v) { return Math.round(Number(v) || 0).toLocaleString('vi-VN'); };
  function actor() { try { return localStorage.getItem('td_audit_actor_v1') || ''; } catch (e) { return ''; } }
  function logGet() { try { return JSON.parse(localStorage.getItem(LOGK) || '[]'); } catch (e) { return []; } }
  function logAdd(o) { try { var a = logGet(); a.unshift(o); localStorage.setItem(LOGK, JSON.stringify(a.slice(0, 300))); } catch (e) {} }
  function dateOf(n) { return TD.dataDate.fromFileName(n); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function until(fn, ms, step) { var t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(step || 150); } return false; }
  /* P10 (T10): đọc nội dung mỗi tệp MỘT lần cho cả chuỗi nhận dạng tiêu đề → SHA-256 → đọc dữ liệu (trước: 3 lần). Giữ trong bộ nhớ đến khi
     tệp đó nhập xong / bị gỡ khỏi danh sách; tổng giữ > 256 MB thì không giữ thêm (đọc lại khi nhập). parseXLS_legacy/TSBĐ dùng f.__tdBuf nếu có. */
  var BUF_MAX = 256 * 1048576;
  function bufHeld() { return files.reduce(function (s, f) { return s + (f.__tdBuf ? f.size : 0); }, 0); }
  function fileBuf(f, keep) { if (f.__tdBuf) return f.__tdBuf; var p = f.arrayBuffer(); if (keep && bufHeld() + f.size <= BUF_MAX) f.__tdBuf = p; return p; }
  function bufDrop(f) { if (f) delete f.__tdBuf; }
  async function sha(file) { try { if (window.crypto && crypto.subtle) return TD.hub.hex(await crypto.subtle.digest('SHA-256', await fileBuf(file, true))); } catch (e) {} return ''; }
  function render() {
    var el = document.getElementById('hub-plan'); if (!el) return;
    plan = TD.hub.plan(files.map(function (f) { return { name: f.name, size: f.size, kind: f.kind, exclude: f._exclude }; }), dateOf);
    window._tdHubPlan = plan;
    if (!files.length) el.innerHTML = '<div style="padding:10px;color:#555">Chưa chọn tệp nào.</div>';
    else el.innerHTML = '<div class="table-wrap"><table class="data-table"><thead><tr><th>NHẬP</th><th>THỨ TỰ</th><th>TỆP</th><th>LOẠI</th><th>NGÀY DỮ LIỆU</th><th>KÍCH THƯỚC</th><th>GHI CHÚ</th><th>TRẠNG THÁI</th></tr></thead><tbody>' +
      plan.items.slice().sort(function (a, b) { return (a.order || 999) - (b.order || 999) || a.idx - b.idx; }).map(function (it) {
        return '<tr data-idx="' + it.idx + '"><td><input type="checkbox" class="hub-inc" title="Bỏ chọn để loại tệp này khỏi lần nhập"' + (it.exclude ? '' : ' checked') + (it.kind === 'bo-qua' || running ? ' disabled' : '') + ' onchange="tdHubToggle(' + it.idx + ',this.checked)"></td><td>' + (it.order || '—') + '</td><td style="text-align:left">' + esc(it.name) + ' <button type="button" class="btn btn-outline hub-pv" style="padding:1px 6px;font-size:.75rem" onclick="tdHubPreview(' + it.idx + ')">👁 Xem trước</button></td><td>' + (it.kind === 'duno' ? 'Dư nợ (msit80)' : it.kind === 'tsbd' ? 'Sao kê TSBĐ' : '—') + '</td><td>' + esc(it.date || '(không có)') + '</td><td>' + TD.hub.fmtBytes(it.size) + '</td><td style="text-align:left;font-size:.8rem;color:#92400e">' + esc(it.skip || it.warn.join(' · ')) + '</td><td class="hub-st" style="font-weight:600">' + (it.skip ? '<span style="color:#6b7280">Bỏ qua</span>' : 'Chờ nhập') + '</td></tr>';
      }).join('') + '</tbody></table></div><div style="margin:8px 0;font-size:.85rem;color:#555">Sẽ nhập <b>' + plan.nImport + '</b> tệp, bỏ qua <b>' + plan.nSkip + '</b>.</div>';
    var b = document.getElementById('hub-run'); if (b) b.disabled = !plan || !plan.nImport || running;
  }
  function setSt(idx, html) { var r = document.querySelector('#hub-plan tr[data-idx="' + idx + '"] .hub-st'); if (r) r.innerHTML = html; }
  function renderLog() {
    var el = document.getElementById('hub-log'); if (!el) return; var L = logGet();
    el.innerHTML = L.length ? '<div class="table-wrap" style="max-height:340px"><table class="data-table"><thead><tr><th>GIỜ</th><th>NGƯỜI</th><th>TỆP</th><th>LOẠI</th><th>NGÀY DL</th><th>SHA-256</th><th>KẾT QUẢ</th></tr></thead><tbody>' + L.map(function (x) { return '<tr><td>' + esc(x.at) + '</td><td>' + esc(x.who || '(chưa đặt tên)') + '</td><td style="text-align:left">' + esc(x.name) + '</td><td>' + esc(x.kind === 'duno' ? 'Dư nợ' : 'TSBĐ') + '</td><td>' + esc(x.date || '') + '</td><td title="' + esc(x.sha) + '" style="font-family:monospace">' + esc((x.sha || '').slice(0, 12)) + '</td><td style="text-align:left">' + esc(x.result) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div style="padding:10px;color:#555">Chưa có lần nhập nào được ghi.</div>';
  }
  /* P07: nhận dạng theo TIÊU ĐỀ cột — sao kê TSBĐ đặt tên không có từ khoá vẫn không bị nhập nhầm thành dư nợ (sẽ THAY dữ liệu hiện hành) */
  async function sniff(f) {
    try {
      if (!window.XLSX || !/\.(xls|xlsx|xlsm)$/i.test(f.name)) return;
      /* P10 (T3): đọc tiêu đề trong worker — sao kê TSBĐ 27 MB đọc trên luồng chính là longtask 1,1 s ngay khi thêm tệp */
      var buf = await fileBuf(f, true), o = { rows: 2, raw: true };
      var hd = await TD.readRows('head', buf, function () { return TD.xlsrows.head(XLSX, buf, o); }, { o: o });
      var k = TD.hub.sniffKind(hd.rows[0] || []);
      if (k && TD.hub.kind(f.name) !== k) { f.kind = k; f._sniffed = true; render(); }
    } catch (e) {}
  }
  window.tdHubAdd = function (list) { Array.prototype.forEach.call(list || [], function (f) { if (!files.some(function (x) { return x.name === f.name && x.size === f.size; })) { files.push(f); sniff(f); } }); render(); };
  window.tdHubClear = function () { if (running) return; files.forEach(bufDrop); files = []; var pv = document.getElementById('hub-preview'); if (pv) pv.remove(); render(); };
  /* P08: loại/đưa lại một tệp khỏi kế hoạch nhập; xem trước tiêu đề + vài dòng đầu (chỉ đọc 7 dòng, không nhập gì) */
  window.tdHubToggle = function (idx, on) { if (running || !files[idx]) return; files[idx]._exclude = !on; if (!on) bufDrop(files[idx]); render(); };
  window.tdHubPreview = async function (idx) {
    var f = files[idx], el = document.getElementById('hub-plan'); if (!f || !el) return;
    var pv = document.getElementById('hub-preview'); if (!pv) { pv = document.createElement('div'); pv.id = 'hub-preview'; pv.style.cssText = 'margin:8px 0;padding:8px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;overflow:auto'; el.parentNode.insertBefore(pv, el.nextSibling); }
    pv.innerHTML = '<span style="color:#2563eb">⏳ Đang đọc ' + esc(f.name) + '…</span>';
    try {
      var buf = await fileBuf(f, false), o = { rows: 7, raw: false, defval: '' }; // P10 (T3): đọc trong worker
      var hd = await TD.readRows('head', buf, function () { return TD.xlsrows.head(XLSX, buf, o); }, { o: o }), wb = { SheetNames: [hd.sheet] };
      var rows = hd.rows.slice(0, 6), nc = Math.min(14, rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0));
      pv.innerHTML = '<div style="margin-bottom:4px"><b>Xem trước:</b> ' + esc(f.name) + ' — trang "' + esc(wb.SheetNames[0]) + '", ' + (rows.length ? 'tiêu đề + ' + (rows.length - 1) + ' dòng đầu' : 'không có dữ liệu') + ' <button type="button" class="btn btn-outline" style="padding:1px 6px;font-size:.75rem" onclick="document.getElementById(\'hub-preview\').remove()">✕ Đóng</button></div>' +
        (rows.length ? '<table class="data-table" style="font-size:.78rem"><tbody>' + rows.map(function (r, i) { var t = i ? 'td' : 'th', h = ''; for (var c = 0; c < nc; c++) h += '<' + t + '>' + esc(r[c]) + '</' + t + '>'; return '<tr>' + h + '</tr>'; }).join('') + '</tbody></table>' : '');
    } catch (e) { pv.innerHTML = '<span style="color:#b91c1c">Không đọc được tệp: ' + esc(e && e.message || e) + '</span>'; }
  };
  window.tdHubDrop = function (e) { e.preventDefault(); var z = document.getElementById('hub-drop'); if (z) z.classList.remove('over'); tdHubAdd(e.dataTransfer && e.dataTransfer.files); };
  window.tdHubRun = async function () {
    if (running || !plan || !plan.nImport) return;
    if (!window.confirm('Nhập ' + plan.nImport + ' tệp theo thứ tự ngày.\nDữ liệu dư nợ hiện tại sẽ được THAY bằng tệp mới nhất; mỗi tệp dư nợ tạo một mốc lưu trữ. Tiếp tục?')) return;
    running = true; document.getElementById('hub-run').disabled = true;
    window.__TD_SAVE_DEFER = (window.__TD_SAVE_DEFER || 0) + 1; window.__TD_SAVE_PENDING = false; // P10 (T5): lưu 1 lần cho cả đợt
    try { if (plan.order.some(function (x) { return x.kind === 'duno'; })) { window._tdHubUndo = { at: new Date().toLocaleString('vi-VN'), rows: (window.structuredClone ? structuredClone(DATA.qltd || []) : JSON.parse(JSON.stringify(DATA.qltd || []))), n: (DATA.qltd || []).length }; } } catch (e) { window._tdHubUndo = null; } // P06: điểm hoàn tác (chỉ dư nợ, trong bộ nhớ đến khi tải lại trang)
    var oc = window.confirm, oa = window.alert, msgs = []; window.confirm = function () { return true; }; window.alert = function (m) { msgs.push(String(m)); };
    var ok = 0, fail = 0;
    try {
      for (var k = 0; k < plan.order.length; k++) {
        var it = plan.order[k], file = files[it.idx], t0 = Date.now(), res = '', stat = '';
        setSt(it.idx, '<span style="color:#2563eb">⏳ Đang nhập…</span>'); await sleep(50);
        try {
          var h = await sha(file);
          if (it.kind === 'duno') {
            var prev = null; try { (_archiveReportList || []).forEach(function (x) { if (x && x.autoDaily && x.dayKey) { var d = parseVNDate(x.dayKey), cd = it.date ? parseVNDate(it.date) : null; if (d && cd && d < cd && (!prev || d > prev.d)) prev = { d: d, tot: x.totalBalance, k: x.dayKey }; } }); } catch (e) {}
            try { pendingImportRows = null; } catch (e) {}
            await processImportFile(file);
            if (!(await until(function () { try { return !!pendingImportRows && pendingImportRows.length; } catch (e) { return false; } }, 180000))) throw new Error('không đọc được dòng dữ liệu' + (msgs.length ? ' — ' + msgs[msgs.length - 1].slice(0, 90) : ''));
            var n = pendingImportRows.length; doImport(); await sleep(800); completeImportToDataArchive(); await sleep(3000);
            var tot = (DATA.qltd || []).reduce(function (s2, r) { return s2 + (Number(r[11]) || 0); }, 0), kh = TD.metrics.countCustomers(DATA.qltd || []);
            var snapOk = it.date ? (_archiveReportList || []).some(function (x) { return x && x.autoDaily && x.dayKey === it.date; }) : true;
            res = n.toLocaleString('vi-VN') + ' dòng · ' + kh.toLocaleString('vi-VN') + ' KH · dư nợ ' + money(tot) + ' đ' + (prev && prev.tot ? ' · so ' + prev.k + ': ' + (tot - prev.tot >= 0 ? '+' : '') + money(tot - prev.tot) + ' đ' : '') + (snapOk ? '' : ' · ⚠ chưa thấy mốc ' + it.date);
            stat = '<span style="color:#15803d">✅ ' + res + '</span>';
          } else {
            await window.tsbdImportFile({ files: [file], value: '' });
            if (!(await until(function () { return window.TSBD && TSBD.src === file.name && TSBD.rows && TSBD.rows.length; }, 240000))) throw new Error('không đọc được tài sản');
            var sm = TD.tsbd.summarize(TSBD.rows); res = TSBD.rows.length.toLocaleString('vi-VN') + ' dòng · ' + sm.unique.toLocaleString('vi-VN') + ' TS (khử trùng) · giá trị VND ' + money(sm.giaTriTS_VND) + ' đ'; stat = '<span style="color:#15803d">✅ ' + res + '</span>';
          }
          logAdd({ at: new Date().toLocaleString('vi-VN'), who: actor(), name: it.name, kind: it.kind, date: it.date || '', size: it.size, sha: h, result: res, ms: Date.now() - t0 }); ok++;
        } catch (err) {
          res = 'LỖI: ' + (err && err.message || err); stat = '<span style="color:#b91c1c">❌ ' + esc(res) + '</span>'; fail++;
          logAdd({ at: new Date().toLocaleString('vi-VN'), who: actor(), name: it.name, kind: it.kind, date: it.date || '', size: it.size, sha: '', result: res, ms: Date.now() - t0 });
        }
        bufDrop(file); // P10 (T10): nhập xong tệp này ⇒ nhả bộ nhớ
        setSt(it.idx, stat); renderLog();
      }
    } finally {
      window.confirm = oc; window.alert = oa;
      window.__TD_SAVE_DEFER = Math.max(0, (window.__TD_SAVE_DEFER || 1) - 1);
      if (!window.__TD_SAVE_DEFER && window.__TD_SAVE_PENDING) { window.__TD_SAVE_PENDING = false; try { await saveData(true); } catch (e) { console.error('[P10] lưu cuối đợt nhập', e); } }
      running = false; var b = document.getElementById('hub-run'); if (b) b.disabled = false;
    }
    updUndo();
    try { showToast('✅ Nhập xong: ' + ok + ' tệp' + (fail ? ' · ' + fail + ' lỗi' : ''), fail ? 'orange' : 'green'); } catch (e) {}
    try { rebuildAll(); } catch (e) {}
  };
  window.tdHubLogCsv = function () {
    var L = logGet(), q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = ['Giờ,Người,Tệp,Loại,Ngày dữ liệu,Kích thước,SHA-256,Kết quả,ms'].concat(L.map(function (x) { return [x.at, x.who, x.name, x.kind, x.date, x.size, x.sha, x.result, x.ms].map(q).join(','); })).join('\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'NhatKyNhap.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  window.tdHubUndoRun = function () {
    var U = window._tdHubUndo; if (running || !U) return;
    if (!window.confirm('Hoàn tác lần nhập gần nhất?\nDữ liệu dư nợ sẽ trở về trạng thái trước khi nhập (' + U.n.toLocaleString('vi-VN') + ' dòng, lúc ' + U.at + ').\nLưu ý: các MỐC LƯU TRỮ đã tạo khi nhập vẫn còn (xoá ở trang Lưu trữ nếu không cần); sao kê TSBĐ không được hoàn tác.')) return;
    DATA.qltd = U.rows; window._tdHubUndo = null;
    try { saveData(); } catch (e) {} try { rebuildAll(); } catch (e) {}
    logAdd({ at: new Date().toLocaleString('vi-VN'), who: actor(), name: '(hoàn tác lần nhập)', kind: 'duno', date: '', size: 0, sha: '', result: 'Khôi phục ' + U.n.toLocaleString('vi-VN') + ' dòng dư nợ', ms: 0 });
    renderLog(); updUndo(); try { showToast('↩ Đã hoàn tác lần nhập (dư nợ)', 'green'); } catch (e) {}
  };
  function updUndo() { var b = document.getElementById('hub-undo'); if (b) { b.disabled = !window._tdHubUndo; b.title = window._tdHubUndo ? 'Khôi phục dư nợ về trước lần nhập lúc ' + window._tdHubUndo.at : 'Chưa có lần nhập nào để hoàn tác (chỉ giữ đến khi tải lại trang)'; } }
  window.tdHubRender = function () { render(); renderLog(); updUndo(); };
})();

/* HM-28 (P04d): ghi .xlsx CÓ ĐỊNH DẠNG cho báo cáo chuẩn TD.xlsx — hàm thuần (dựng XML), đóng gói bằng JSZip đã nhúng; nhúng nguyên văn vào app + Node test.
   SheetJS bản cộng đồng không ghi được kiểu ô (đậm, màu nền, viền) nên báo cáo Excel trước đây trơn. Đầu vào là khuôn TD.report.sheets:
   [{name, widths, money:[cột], pct:[cột], rows:[[...]]}]. Vai trò dòng suy từ nội dung: dòng 0 tiêu đề; dòng 1 ô chữ IN HOA = đề mục;
   dòng toàn chữ (≥3 ô) ngay trên dòng dữ liệu = hàng tiêu đề cột; ô đầu "TỔNG…" = dòng tổng; [nhãn, giá trị] = thông tin. */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var X = {};
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); };
  var isStr = function (v) { return typeof v === 'string' && v !== ''; };
  var isNum = function (v) { return typeof v === 'number' && isFinite(v); };
  X.col = function (i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  /* chỉ số kiểu (khớp thứ tự cellXfs trong X.styles) */
  X.S = { text: 0, title: 1, section: 2, head: 3, label: 4, int: 5, money: 6, pct: 7, totText: 8, totInt: 9, totMoney: 10, totPct: 11, ok: 12, bad: 13, cell: 14 };
  X.rowKind = function (rows, i) {
    var r = rows[i] || [], ne = r.filter(function (v) { return v !== '' && v != null; });
    if (!ne.length) return 'blank';
    if (i === 0) return 'title';
    if (ne.length === 1 && isStr(r[0]) && r[0] === r[0].toUpperCase() && /[A-ZÀ-Ỹ]/.test(r[0])) return 'section';
    if (/^TỔNG/.test(String(r[0]))) return 'total';
    var nx = rows[i + 1] || [];
    if (ne.length >= 3 && ne.every(isStr) && nx.some(function (v) { return v !== '' && v != null; })) return 'head';
    if (r.length === 2 && isStr(r[0])) return 'info';
    return 'data';
  };
  X.styleOf = function (sh, kind, c, v) {
    var m = (sh.money || []).indexOf(c) >= 0, p = (sh.pct || []).indexOf(c) >= 0;
    if (kind === 'title') return X.S.title;
    if (kind === 'section') return X.S.section;
    if (kind === 'head') return X.S.head;
    if (kind === 'info') return c === 0 ? X.S.label : X.S.text;
    if (kind === 'total') return isNum(v) ? (p ? X.S.totPct : m ? X.S.totMoney : X.S.totInt) : X.S.totText;
    if (isNum(v)) return p ? X.S.pct : m ? X.S.money : X.S.int;
    if (v === 'KHỚP') return X.S.ok;
    if (v === 'LỆCH') return X.S.bad;
    return X.S.cell;
  };
  X.sheetXml = function (sh) {
    var rows = sh.rows || [], ncol = Math.max(1, (sh.widths || []).length, rows.reduce(function (a, r) { return Math.max(a, (r || []).length); }, 0)), out = [], merges = [], headRow = -1;
    rows.forEach(function (r, i) {
      var kind = X.rowKind(rows, i); if (kind === 'head' && headRow < 0) headRow = i;
      var cells = [], wide = kind === 'title' || kind === 'section';
      (r || []).forEach(function (v, c) {
        if (v === '' || v == null) { if (kind === 'head' || kind === 'total' || kind === 'data') cells.push('<c r="' + X.col(c) + (i + 1) + '" s="' + (kind === 'head' ? X.S.head : kind === 'total' ? X.S.totText : X.S.cell) + '"/>'); return; }
        var a = X.col(c) + (i + 1), s = X.styleOf(sh, kind, c, v);
        cells.push(isNum(v) ? '<c r="' + a + '" s="' + s + '"><v>' + v + '</v></c>' : '<c r="' + a + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>');
      });
      if (kind === 'head' || kind === 'total') for (var c = (r || []).length; c < ncol; c++) cells.push('<c r="' + X.col(c) + (i + 1) + '" s="' + (kind === 'head' ? X.S.head : X.S.totText) + '"/>');
      if (wide && ncol > 1) merges.push('A' + (i + 1) + ':' + X.col(ncol - 1) + (i + 1));
      out.push('<row r="' + (i + 1) + '"' + (kind === 'title' ? ' ht="24" customHeight="1"' : kind === 'head' ? ' ht="30" customHeight="1"' : '') + '>' + cells.join('') + '</row>');
    });
    var cols = (sh.widths || []).map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('');
    var pane = headRow >= 0 ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + (headRow + 1) + '" topLeftCell="A' + (headRow + 2) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      pane + (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + out.join('') + '</sheetData>' +
      (merges.length ? '<mergeCells count="' + merges.length + '">' + merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '') +
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
  };
  X.styles = function () {
    var font = function (b, sz, color) { return '<font>' + (b ? '<b/>' : '') + '<sz val="' + sz + '"/>' + (color ? '<color rgb="' + color + '"/>' : '') + '<name val="Times New Roman"/><family val="1"/></font>'; };
    var fill = function (rgb) { return '<fill><patternFill patternType="solid"><fgColor rgb="' + rgb + '"/><bgColor indexed="64"/></patternFill></fill>'; };
    var B = '<border><left style="thin"><color rgb="FF94A3B8"/></left><right style="thin"><color rgb="FF94A3B8"/></right><top style="thin"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border>';
    /* font: 0 thường · 1 tiêu đề · 2 đậm · 3 đậm trắng · 4 đậm xanh lá · 5 đậm đỏ;  fill: 2 navy · 3 xám nhạt · 4 xanh nhạt;  border: 1 viền mảnh */
    var xf = function (numFmt, fontId, fillId, borderId, h, wrap) { return '<xf numFmtId="' + numFmt + '" fontId="' + fontId + '" fillId="' + fillId + '" borderId="' + borderId + '" xfId="0"' + (numFmt ? ' applyNumberFormat="1"' : '') + ' applyFont="1"' + (fillId ? ' applyFill="1"' : '') + (borderId ? ' applyBorder="1"' : '') + ' applyAlignment="1"><alignment vertical="center"' + (h ? ' horizontal="' + h + '"' : '') + (wrap ? ' wrapText="1"' : '') + '/></xf>'; };
    var cellXfs = [xf(0, 0, 0, 0), xf(0, 1, 0, 0, 'center'), xf(0, 2, 4, 0), xf(0, 3, 2, 1, 'center', 1), xf(0, 2, 0, 0), xf(3, 0, 0, 1), xf(3, 0, 0, 1), xf(164, 0, 0, 1),
      xf(0, 2, 3, 1), xf(3, 2, 3, 1), xf(3, 2, 3, 1), xf(164, 2, 3, 1), xf(0, 4, 0, 1, 'center'), xf(0, 5, 0, 1, 'center'), xf(0, 0, 0, 1, null, 1)];
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>' +
      '<fonts count="6">' + font(0, 12) + font(1, 14, 'FF0F2A5C') + font(1, 12) + font(1, 12, 'FFFFFFFF') + font(1, 12, 'FF15803D') + font(1, 12, 'FFB91C1C') + '</fonts>' +
      '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + fill('FF1A2540') + fill('FFE2E8F0') + fill('FFE8F5EC') + '</fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + B + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + cellXfs.length + '">' + cellXfs.join('') + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  };
  X.safeName = function (n, used) { var s = String(n || 'Sheet').replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Sheet', b = s, k = 2; while (used[s.toLowerCase()]) { s = b.slice(0, 28) + ' ' + k++; } used[s.toLowerCase()] = 1; return s; };
  /* files(sheets): { đường dẫn trong gói: nội dung } — đủ để mở bằng Excel/LibreOffice */
  X.files = function (sheets) {
    var used = {}, names = sheets.map(function (s) { return X.safeName(s.name, used); }), f = {};
    f['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>';
    f['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    f['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      names.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>';
    f['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    f['xl/styles.xml'] = X.styles();
    sheets.forEach(function (s, i) { f['xl/worksheets/sheet' + (i + 1) + '.xml'] = X.sheetXml(s); });
    return f;
  };
  /* build(sheets, JSZip) ⇒ Promise<Blob|Uint8Array> */
  X.build = function (sheets, JSZip) {
    var z = new JSZip(), f = X.files(sheets); Object.keys(f).forEach(function (k) { z.file(k, f[k]); });
    return z.generateAsync({ type: typeof window !== 'undefined' ? 'blob' : 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };
  TD.xlsx = X;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* HM-28: mẫu báo cáo chuẩn TD.report — dựng các trang tính (mảng-của-mảng) từ TD.metrics + đối soát + xu hướng + cảnh báo; nhúng nguyên văn + Node test.
   inp: { dataDate:'dd/mm/yyyy'|'', summary: TD.metrics.summarize(...), checks: TD.doisoat.checks(...)|null, periods: TD.trend.build(...)|[], warn: TD.warn.compute(...).sections|null, by:'' , at:'' } */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var R = {};
  var pct = function (a, b) { return b ? a / b : 0; };
  var LOAI_NH = { nganhan: 1, thauchi: 1 }, LOAI_TDH = { trunghan: 1, daihan: 1 };
  R.sheets = function (inp) {
    var S = inp.summary, T = S.totals, out = [];
    out.push({ name: 'Tổng hợp', widths: [34, 16, 14, 24, 10], money: [3], pct: [4], rows: [
      ['BÁO CÁO TỔNG HỢP DƯ NỢ'], ['Ngày dữ liệu', inp.dataDate || '(không rõ)'], ['Lập lúc', inp.at || ''], ['Người lập', inp.by || ''], [],
      ['Chỉ tiêu', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%'], ['TỔNG CỘNG', T.kh, T.hs, T.duno, 1], [],
      ['THEO LOẠI VAY'], ['Loại vay', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%']].concat(S.byLoai.filter(function (g) { return g.hs || g.key !== 'khac'; }).map(function (g) { return [g.name, g.kh, g.hs, g.duno, pct(g.duno, T.duno)]; })).concat([[],
      ['THEO NHÓM NỢ'], ['Nhóm nợ', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%']]).concat(S.byNhom.filter(function (g) { return g.hs || g.key !== 'Không rõ nhóm'; }).map(function (g) { return [g.key, g.kh, g.hs, g.duno, pct(g.duno, T.duno)]; })) });
    var pb = S.byPB.slice().sort(function (a, b) { return b.duno - a.duno; });
    out.push({ name: 'Theo phòng ban', widths: [28, 16, 14, 24, 10], money: [3], pct: [4], rows: [['DƯ NỢ THEO PHÒNG BAN'], [], ['Phòng ban', 'Số khách hàng', 'Số khoản', 'Dư nợ (đồng)', '%']].concat(pb.map(function (g) { return [g.key, g.kh, g.hs, g.duno, pct(g.duno, T.duno)]; })).concat([['TỔNG CỘNG', T.kh, T.hs, T.duno, 1]]) });
    var cb = S.byCBTD.map(function (g) { var nh = 0, td = 0; g.rows.forEach(function (r) { var k = TD.metrics.classifyLoai(r[13]); if (LOAI_NH[k]) nh += +r[11] || 0; else if (LOAI_TDH[k]) td += +r[11] || 0; }); return { g: g, nh: nh, td: td }; }).sort(function (a, b) { return b.g.duno - a.g.duno; });
    out.push({ name: 'Theo CBTD', widths: [28, 22, 14, 12, 22, 22, 24, 10], money: [4, 5, 6], pct: [7], rows: [['DƯ NỢ THEO CÁN BỘ TÍN DỤNG'], [], ['CBTD', 'Phòng ban', 'Số khách hàng', 'Số khoản', 'Ngắn hạn + thấu chi', 'Trung-dài hạn', 'Dư nợ (đồng)', '%']].concat(cb.map(function (x) { return [x.g.key, x.g.pb, x.g.kh, x.g.hs, x.nh, x.td, x.g.duno, pct(x.g.duno, T.duno)]; })).concat([['TỔNG CỘNG', '', T.kh, T.hs, cb.reduce(function (s, x) { return s + x.nh; }, 0), cb.reduce(function (s, x) { return s + x.td; }, 0), T.duno, 1]]) });
    if (inp.checks) {
      var lab = { khop: 'KHỚP', lech: 'LỆCH', bo_qua: 'CHƯA CÓ DỮ LIỆU' };
      out.push({ name: 'Biên bản đối soát', widths: [8, 62, 24, 24, 20, 18, 46], money: [2, 3, 4], rows: [['BIÊN BẢN ĐỐI SOÁT SỐ LIỆU'], ['Ngày dữ liệu', inp.dataDate || ''], [], ['Mã', 'Chỉ tiêu', 'Tính lại', 'Màn hình / nguồn', 'Chênh', 'Kết quả', 'Ghi chú']].concat(inp.checks.map(function (c) { return [c.id, c.name, c.expected == null ? '' : c.expected, c.actual == null ? '' : c.actual, c.expected != null && c.actual != null ? c.actual - c.expected : '', lab[c.status], c.note || '']; })) });
    }
    if (inp.periods && inp.periods.length >= 2) out.push({ name: 'Xu hướng các kỳ', widths: [14, 24, 16, 14, 24], money: [1, 4], rows: [['XU HƯỚNG DƯ NỢ CÁC KỲ ĐÃ NHẬP'], [], ['Kỳ (ngày dữ liệu)', 'Dư nợ (đồng)', 'Số khách hàng', 'Số khoản', 'Thay đổi so kỳ trước (đồng)']].concat(inp.periods.map(function (p, i) { return [p.key, p.totals.duno, p.totals.kh, p.totals.hs, i ? p.totals.duno - inp.periods[i - 1].totals.duno : '']; })) });
    if (inp.warn) out.push({ name: 'Cảnh báo sớm', widths: [64, 14, 14, 24], money: [3], rows: [['CẢNH BÁO SỚM'], ['Ngày dữ liệu', inp.dataDate || ''], [], ['Mục', 'Số dòng', 'Số KH', 'Dư nợ liên quan (đồng)']].concat(inp.warn.map(function (s) { return [s.title, s.skipped ? 'chưa đủ dữ liệu' : s.count, s.skipped ? '' : s.kh, s.skipped ? '' : s.duno]; })) });
    return out;
  };
  TD.report = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = TD;
})(typeof window !== 'undefined' ? window : globalThis);

/* HM-28b: báo cáo Word TD.reportdocx — dựng .docx từ CÙNG các trang tính của TD.report (một nguồn số với Excel/màn hình); hàm thuần theo thư viện docx truyền vào, nhúng nguyên văn + Node test.
   sheets: [{name,widths,money:[cột],pct:[cột],rows:[[...]]}] (khuôn TD.report.sheets). opts: {dataDate, periodLabel, at, by, signers:[tên chức danh…]|null, title} */
(function (root) {
  'use strict';
  var TD = root.TD = root.TD || {};
  var X = {};
  var NAVY = '1A2540', YEL = 'FFF3B0', GRY = 'EEF2F7', RED = 'B91C1C', GRN = '15803D';
  X.fmtInt = function (n) { return Math.round(+n || 0).toLocaleString('vi-VN'); };
  X.fmtPct = function (p) { return ((+p || 0) * 100).toFixed(1).replace('.', ',') + '%'; };
  /* tách các dòng của một trang tính thành khối: title / kv / section / table{head,rows} */
  X.blocks = function (rows) {
    var out = [], cur = null, first = true;
    var flush = function () { if (cur) { out.push(cur); cur = null; } };
    rows.forEach(function (r) {
      if (!r.length) { flush(); return; }
      if (r.length >= 3) { if (!cur) cur = { kind: 'table', head: r, rows: [] }; else cur.rows.push(r); return; }
      flush();
      if (r.length === 1) { out.push({ kind: first ? 'title' : 'section', text: String(r[0]) }); first = false; }
      else out.push({ kind: 'kv', k: String(r[0]), v: r[1] == null ? '' : String(r[1]) });
    });
    flush();
    return out;
  };
  X.cellText = function (sheet, ci, v) {
    if (typeof v !== 'number') return v == null ? '' : String(v);
    if ((sheet.pct || []).indexOf(ci) >= 0) return X.fmtPct(v);
    return X.fmtInt(v);
  };
  X.build = function (lib, sheets, opts) {
    opts = opts || {};
    var D = lib, sections = [];
    var run = function (t, o) { o = o || {}; return new D.TextRun({ text: t, bold: !!o.bold, color: o.color, size: o.size || 20, font: 'Arial' }); };
    var para = function (children, o) { o = o || {}; return new D.Paragraph({ children: children, alignment: o.align, spacing: { before: o.before || 0, after: o.after == null ? 80 : o.after }, keepNext: !!o.keepNext }); };
    var cell = function (text, w, o) {
      o = o || {};
      return new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, shading: o.fill ? { type: D.ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 }, verticalAlign: D.VerticalAlign ? D.VerticalAlign.CENTER : undefined,
        children: [para([run(text, { bold: o.bold, color: o.color })], { align: o.right ? D.AlignmentType.RIGHT : (o.center ? D.AlignmentType.CENTER : D.AlignmentType.LEFT), after: 0 })] });
    };
    sheets.forEach(function (sh, si) {
      var wide = sh.widths.length >= 7;
      var pageW = wide ? 14570 : 9638, sum = sh.widths.reduce(function (a, b) { return a + b; }, 0);
      var colW = sh.widths.map(function (w) { return Math.max(500, Math.floor(w / sum * pageW)); });
      var kids = [];
      X.blocks(sh.rows).forEach(function (b) {
        if (b.kind === 'title') kids.push(para([run(b.text, { bold: true, size: 30, color: NAVY })], { align: D.AlignmentType.CENTER, after: 120 }));
        else if (b.kind === 'section') kids.push(para([run(b.text, { bold: true, size: 24, color: NAVY })], { before: 200, after: 80, keepNext: true }));
        else if (b.kind === 'kv') kids.push(para([run(b.k + ': ', { bold: true }), run(b.v)], { after: 40 }));
        else {
          var n = b.head.length, isNum = function (ci) { return (sh.money || []).indexOf(ci) >= 0 || (sh.pct || []).indexOf(ci) >= 0 || b.rows.some(function (r) { return typeof r[ci] === 'number'; }); };
          var trs = [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.head.map(function (h, ci) { return cell(String(h), colW[ci] || 1000, { fill: NAVY, bold: true, color: 'FFFFFF', center: true }); }) })];
          b.rows.forEach(function (r) {
            var lech = r.some(function (v) { return v === 'LỆCH'; }), total = /^TỔNG/.test(String(r[0]));
            trs.push(new D.TableRow({ cantSplit: true, children: b.head.map(function (h, ci) {
              var v = r[ci], t = X.cellText(sh, ci, v), o = { right: typeof v === 'number', bold: total, fill: lech ? YEL : (total ? GRY : undefined) };
              if (v === 'LỆCH') { o.bold = true; o.color = RED; o.center = true; } else if (v === 'KHỚP') { o.bold = true; o.color = GRN; o.center = true; }
              return cell(t, colW[ci] || 1000, o);
            }) }));
          });
          kids.push(new D.Table({ width: { size: pageW, type: D.WidthType.DXA }, columnWidths: colW, rows: trs }));
          kids.push(para([run('')], { after: 60 }));
        }
      });
      if (si === sheets.length - 1 && opts.signers && opts.signers.length) {
        var sw = Math.floor(pageW / opts.signers.length), none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        kids.push(para([run('')], { before: 240 }));
        kids.push(new D.Table({ width: { size: pageW, type: D.WidthType.DXA }, columnWidths: opts.signers.map(function () { return sw; }),
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: [new D.TableRow({ cantSplit: true, children: opts.signers.map(function (s) { return new D.TableCell({ width: { size: sw, type: D.WidthType.DXA }, children: [
            para([run(s, { bold: true })], { align: D.AlignmentType.CENTER, after: 0 }), para([run('(Ký, ghi rõ họ tên)', { size: 18 })], { align: D.AlignmentType.CENTER, after: 900 }) ] }); }) })] }));
      }
      sections.push({ properties: { page: { size: { orientation: wide ? D.PageOrientation.LANDSCAPE : D.PageOrientation.PORTRAIT, width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        footers: { default: new D.Footer({ children: [para([run('QLTD PRO · ' + (opts.periodLabel || (opts.dataDate ? 'Ngày dữ liệu ' + opts.dataDate : '')) + ' · Trang ', { size: 16 }), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, font: 'Arial' })], { align: D.AlignmentType.CENTER, after: 0 })] }) },
        children: kids });
    });
    return new D.Document({ creator: opts.by || 'QLTD PRO', title: opts.title || 'Báo cáo QLTD PRO', styles: { default: { document: { run: { font: 'Arial', size: 20 } } } }, sections: sections });
  };
  TD.reportdocx = X;
  })(typeof window !== 'undefined' ? window : globalThis);

/* ───────── HM-28: xuất báo cáo chuẩn Excel ───────── */
async function tdReportExport() {
  try {
    const rows = (DATA.qltd || []).filter(isActualCreditRow);
    if (!rows.length) { showToast('⚠️ Chưa có dữ liệu dư nợ để lập báo cáo', 'red'); return; }
    try { renderDashboard(); } catch (e) {}
    const today = todayMidnight(), dd = TD.dataDate.get();
    const snaps = []; try { (_archiveReportList || []).forEach(x => { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) snaps.push(x); }); } catch (e) {}
    let checks = null, warn = null; try { checks = tdDoiSoatCompute().checks; } catch (e) {} try { warn = tdWarnCompute().res.sections; } catch (e) {}
    const sheets = TD.report.sheets({ dataDate: dd ? TD.dataDate.vn(dd) : '', summary: TD.metrics.summarize(rows, { today: today }), checks: checks, periods: TD.trend.build(snaps, TD.metrics.summarize), warn: warn, at: new Date().toLocaleString('vi-VN'), by: (localStorage.getItem('td_audit_actor_v1') || '') });
    const name = 'BaoCao_' + (dd ? TD.dataDate.vn(dd).replace(/\//g, '-') : 'hom-nay') + '.xlsx';
    await tdReportSaveXlsx(sheets, name);
    showToast('✅ Đã xuất báo cáo: ' + name + ' (' + sheets.length + ' trang)', 'green');
  } catch (e) { console.error('[report]', e); showToast('❌ Không xuất được báo cáo: ' + e.message, 'red'); }
}
window.tdReportExport = tdReportExport;
/* HM-28 (P04d): lưu báo cáo .xlsx CÓ định dạng (TD.xlsx + JSZip nhúng); thiếu JSZip ⇒ SheetJS như cũ (không định dạng) */
async function tdReportSaveXlsx(sheets, name) {
  if (!window.JSZip && typeof window.TD_ensureVendors === 'function') { try { await window.TD_ensureVendors(); } catch (e) {} }
  for (let i = 0; i < 20 && !window.JSZip; i++) await new Promise(r => setTimeout(r, 250)); // thư viện nạp lúc rảnh
  if (window.JSZip && TD.xlsx) {
    const blob = await TD.xlsx.build(sheets, window.JSZip), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return 'styled';
  }
  if (typeof _ensureXLSX === 'function') await _ensureXLSX(); if (!window.XLSX) throw new Error('Chưa nạp xong thư viện Excel');
  const wb = XLSX.utils.book_new();
  sheets.forEach(sh => { const ws = XLSX.utils.aoa_to_sheet(sh.rows); ws['!cols'] = sh.widths.map(w => ({ wch: w }));
    Object.keys(ws).forEach(a => { if (a[0] === '!') return; const c = XLSX.utils.decode_cell(a), v = ws[a].v; if (typeof v !== 'number') return; ws[a].z = (sh.pct || []).indexOf(c.c) >= 0 ? '0.0%' : '#,##0'; });
    XLSX.utils.book_append_sheet(wb, ws, sh.name); });
  XLSX.writeFile(wb, name); return 'plain';
}

/* ───────── HM-28b: báo cáo chuẩn Word + chọn kỳ ───────── */
function tdReportSnaps() { // các mốc đã lưu, ngày tăng dần
  const a = []; try { (_archiveReportList || []).forEach(x => { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) a.push(x); }); } catch (e) {}
  const k = x => { const m = /^(\d+)\/(\d+)\/(\d+)$/.exec(x.dayKey); return m ? +m[3] * 1e4 + +m[2] * 100 + +m[1] : 0; };
  return a.sort((x, y) => k(x) - k(y));
}
function tdReportBuild(periodKey) { // periodKey '' = dữ liệu hiện hành; 'dd/mm/yyyy' = mốc đã lưu
  const snaps = tdReportSnaps(), by = (localStorage.getItem('td_audit_actor_v1') || ''), at = new Date().toLocaleString('vi-VN');
  const periods = TD.trend.build(snaps, TD.metrics.summarize);
  if (periodKey) {
    const sn = snaps.filter(x => x.dayKey === periodKey)[0]; if (!sn) throw new Error('Không có mốc ' + periodKey);
    const m = /^(\d+)\/(\d+)\/(\d+)$/.exec(periodKey), today = new Date(+m[3], +m[2] - 1, +m[1]);
    const rows = sn.reportData.filter(r => r && (Number(r[11]) || 0) > 0);
    return { dateStr: periodKey, label: 'Kỳ ' + periodKey + ' (mốc đã lưu)', sheets: TD.report.sheets({ dataDate: periodKey, summary: TD.metrics.summarize(rows, { today: today }), checks: null, periods: periods, warn: null, at: at, by: by }) };
  }
  const rows = (DATA.qltd || []).filter(isActualCreditRow); if (!rows.length) throw new Error('Chưa có dữ liệu dư nợ để lập báo cáo');
  try { renderDashboard(); } catch (e) {}
  const dd = TD.dataDate.get(); let checks = null, warn = null; try { checks = tdDoiSoatCompute().checks; } catch (e) {} try { warn = tdWarnCompute().res.sections; } catch (e) {}
  const ds = dd ? TD.dataDate.vn(dd) : '';
  return { dateStr: ds, label: 'Hiện hành' + (ds ? ' (ngày dữ liệu ' + ds + ')' : ''), sheets: TD.report.sheets({ dataDate: ds, summary: TD.metrics.summarize(rows, { today: todayMidnight() }), checks: checks, periods: periods, warn: warn, at: at, by: by }) };
}
async function tdReportExportWord(periodKey, signers) {
  for (let i = 0; i < 40 && !window.docx; i++) await new Promise(r => setTimeout(r, 250)); // thư viện nạp lúc rảnh
  if (!window.docx) { try { await TD.net.ensureLib('docx'); } catch (e) {} } // HM-27: bản nhúng lỗi ⇒ thư viện dự phòng có SRI (nếu người dùng đã bật)
  if (!window.docx) throw new Error('Thư viện Word chưa sẵn sàng — thử lại sau vài giây');
  const B = tdReportBuild(periodKey);
  const doc = TD.reportdocx.build(window.docx, B.sheets, { dataDate: B.dateStr, periodLabel: B.label, signers: signers && signers.length ? signers : null, by: (localStorage.getItem('td_audit_actor_v1') || ''), title: 'Báo cáo QLTD PRO ' + B.dateStr });
  const blob = await window.docx.Packer.toBlob(doc), name = 'BaoCao_' + (B.dateStr ? B.dateStr.replace(/\//g, '-') : 'hom-nay') + '.docx';
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return { name: name, sheets: B.sheets.length };
}
async function tdReportExportPeriodXlsx(periodKey) {
  const B = tdReportBuild(periodKey), name = 'BaoCao_' + (B.dateStr ? B.dateStr.replace(/\//g, '-') : 'hom-nay') + '.xlsx';
  const fmt = await tdReportSaveXlsx(B.sheets, name); return { name: name, sheets: B.sheets.length, styled: fmt === 'styled' };
}
function tdReportDialog() {
  let d = document.getElementById('td-report-dlg'); if (d) d.remove();
  const snaps = tdReportSnaps().slice().reverse(), dd = TD.dataDate.get(), cur = 'Hiện hành' + (dd ? ' — ngày dữ liệu ' + TD.dataDate.vn(dd) : '');
  d = document.createElement('div'); d.id = 'td-report-dlg'; d.className = 'no-print';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:var(--z-3,2000);display:flex;align-items:center;justify-content:center';
  d.innerHTML = `<div style="background:#fff;color:#111;border-radius:10px;padding:18px 20px;width:min(460px,94vw);box-shadow:0 10px 40px rgba(0,0,0,.3);font:14px/1.5 system-ui">
    <div style="font-weight:800;font-size:1.05rem;margin-bottom:10px">📝 Xuất báo cáo chuẩn</div>
    <label style="display:block;font-weight:600">Kỳ báo cáo</label>
    <select id="td-rp-period" style="width:100%;padding:6px;margin:4px 0 10px"><option value="">${cur}</option>${snaps.map(x => `<option value="${x.dayKey}">Mốc đã lưu ${x.dayKey}</option>`).join('')}</select>
    <div style="font-weight:600">Định dạng</div>
    <label><input type="radio" name="td-rp-fmt" value="docx" checked> Word (.docx) — định dạng, in được</label><br>
    <label><input type="radio" name="td-rp-fmt" value="xlsx"> Excel (.xlsx)</label>
    <div style="margin:10px 0 4px"><label><input type="checkbox" id="td-rp-sign"> Thêm khối chữ ký (Word)</label></div>
    <input id="td-rp-signers" value="Người lập, Kiểm soát, Giám đốc" style="width:100%;padding:6px" title="Chức danh, cách nhau bằng dấu phẩy">
    <div style="font-size:.8rem;color:#555;margin-top:8px">Mốc đã lưu: chỉ có tổng hợp theo loại/nhóm/phòng/CBTD và xu hướng; biên bản đối soát và cảnh báo chỉ có ở kỳ hiện hành.</div>
    <div id="td-rp-msg" style="min-height:20px;margin-top:6px;font-weight:600"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn btn-ghost" onclick="document.getElementById('td-report-dlg').remove()">Đóng</button><button class="btn btn-green" id="td-rp-go">Xuất</button></div></div>`;
  document.body.appendChild(d);
  document.getElementById('td-rp-go').onclick = async () => {
    const msg = document.getElementById('td-rp-msg'), per = document.getElementById('td-rp-period').value, fmt = document.querySelector('input[name=td-rp-fmt]:checked').value;
    const sg = document.getElementById('td-rp-sign').checked ? document.getElementById('td-rp-signers').value.split(',').map(x => x.trim()).filter(Boolean) : null;
    msg.style.color = '#555'; msg.textContent = '⌛ Đang lập báo cáo…';
    try { const r = fmt === 'docx' ? await tdReportExportWord(per, sg) : await tdReportExportPeriodXlsx(per); msg.style.color = '#15803d'; msg.textContent = '✅ Đã xuất ' + r.name + ' (' + r.sheets + ' phần)'; }
    catch (e) { console.error('[HM-28b]', e); msg.style.color = '#dc2626'; msg.textContent = '⛔ ' + e.message; }
  };
}
window.tdReportDialog = tdReportDialog; window.tdReportExportWord = tdReportExportWord; window.tdReportBuild = tdReportBuild;

/* ───────── HM-27: chế độ có mạng (tuỳ chọn) ───────── */
TD.net.version = 'v22.3-P04d';
TD.net.state = function () { return TD.net.load(localStorage); };
TD.net.getKey = function () { try { return localStorage.getItem(TD.net.AIKEY) || ''; } catch (e) { return ''; } };
TD.net.setKey = function (k) { try { k ? localStorage.setItem(TD.net.AIKEY, k) : localStorage.removeItem(TD.net.AIKEY); } catch (e) {} };
TD.net.getLog = function () { try { return JSON.parse(localStorage.getItem(TD.net.LOGKEY) || '[]'); } catch (e) { return []; } };
TD.net.log = function (feature, url, bytes) { try { const a = TD.net.getLog(); a.push({ t: new Date().toLocaleString('vi-VN'), f: feature, h: TD.net.origin(url) || String(url), b: bytes || 0 }); localStorage.setItem(TD.net.LOGKEY, JSON.stringify(a.slice(-50))); } catch (e) {} };
TD.net.checkVersion = async function () {
  const s = TD.net.state(); if (s.mode !== 'on' || !s.versionUrl) throw new Error('Chưa bật chế độ có mạng hoặc chưa khai báo địa chỉ kiểm tra bản mới');
  const r = await fetch(s.versionUrl, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }); // chỉ GET: không gửi dữ liệu nào
  if (!r.ok) throw new Error('HTTP ' + r.status); const j = await r.json(); TD.net.log('kiểm tra bản mới', s.versionUrl, 0);
  return { local: TD.net.version, remote: String(j.version || ''), newer: TD.net.cmpVersion(TD.net.version, j.version) < 0, url: String(j.url || ''), notes: String(j.notes || '') };
};
TD.net.ensureLib = function (g) { // thư viện dự phòng: chỉ khi bật mạng + bật mục dự phòng + entry có băm SRI
  if (window[g]) return Promise.resolve(window[g]);
  const f = TD.net.fallbackFor(g), s = TD.net.state();
  if (!f || s.mode !== 'on' || !s.cdn) return Promise.reject(new Error('Thư viện ' + g + ' chưa sẵn sàng và không có bản dự phòng được phép'));
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = f.url; sc.integrity = f.sri; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer';
    sc.onload = () => { if (window[g]) { TD.net.log('thư viện dự phòng ' + f.name, f.url, 0); res(window[g]); } else rej(new Error('Tải xong nhưng không thấy ' + g)); };
    sc.onerror = () => rej(new Error('Không tải được hoặc băm SRI không khớp: ' + f.name)); document.head.appendChild(sc); });
};
TD.net.aiBuild = function () {
  const rows = (DATA.qltd || []).filter(isActualCreditRow); if (!rows.length) throw new Error('Chưa có dữ liệu dư nợ');
  const dd = TD.dataDate.get(), snaps = (typeof tdReportSnaps === 'function') ? tdReportSnaps() : [];
  return TD.net.aiPayload(TD.metrics.summarize(rows, { today: todayMidnight() }), { dataDate: dd ? TD.dataDate.vn(dd) : '', periods: TD.trend.build(snaps, TD.metrics.summarize) });
};
TD.net.askAI = async function (text) {
  const s = TD.net.state(), key = TD.net.getKey(); if (s.mode !== 'on' || !s.ai.enabled) throw new Error('AI chưa được bật'); if (!key) throw new Error('Chưa nhập khoá AI');
  const body = JSON.stringify({ model: s.ai.model, max_tokens: 1024, messages: [{ role: 'user', content: text }] });
  const r = await fetch(s.ai.endpoint, { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: body });
  TD.net.log('hỏi AI (số tổng hợp)', s.ai.endpoint, body.length);
  if (!r.ok) throw new Error('AI trả lỗi HTTP ' + r.status); const j = await r.json();
  return (j.content || []).map(c => c.text || '').join('\n').trim() || '(không có nội dung)';
};
function tdNetDialog() {
  let d = document.getElementById('td-net-dlg'); if (d) d.remove();
  const s = TD.net.state(), esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hosts = []; if (s.mode === 'on') { const a = TD.net.origin(s.versionUrl); if (a) hosts.push(a); if (s.ai.enabled) hosts.push(TD.net.origin(s.ai.endpoint)); }
  const libs = TD.net.FALLBACKS.map(f => f.name + (f.sri ? '' : ' (chưa có băm SRI — không dùng)')).join(', ');
  d = document.createElement('div'); d.id = 'td-net-dlg'; d.className = 'no-print';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:var(--z-3,2000);display:flex;align-items:center;justify-content:center;overflow:auto';
  d.innerHTML = `<div style="background:#fff;color:#111;border-radius:10px;padding:18px 20px;width:min(560px,94vw);max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);font:14px/1.5 system-ui">
  <div style="font-weight:800;font-size:1.05rem;margin-bottom:6px">🌐 Chế độ có mạng (tuỳ chọn)</div>
  <div id="td-net-status" style="padding:8px 10px;border-radius:8px;margin-bottom:10px;font-weight:600;${s.mode === 'on' ? 'background:#fffbeb;border:1px solid #f59e0b;color:#78350f' : 'background:#f0fdf4;border:1px solid #86efac;color:#166534'}">${s.mode === 'on' ? '⚠️ ĐANG BẬT — chỉ được kết nối tới: ' + (hosts.map(esc).join(', ') || '(chưa khai báo địa chỉ nào)') : '✅ ĐANG TẮT (mặc định) — trình duyệt chặn mọi kết nối ra ngoài; dữ liệu không rời máy.'}</div>
  <label style="display:block;margin:6px 0"><input type="checkbox" id="td-net-on" ${s.mode === 'on' ? 'checked' : ''}> <b>Cho phép kết nối mạng</b> (áp dụng sau khi tải lại trang)</label>
  <div style="margin:8px 0 2px;font-weight:600">Kiểm tra bản mới</div>
  <input id="td-net-ver" value="${esc(s.versionUrl)}" placeholder="https://…/version.json  ({&quot;version&quot;:&quot;v22.4&quot;,&quot;url&quot;:&quot;…&quot;})" style="width:100%;padding:6px"> <button class="btn btn-ghost" id="td-net-chk" style="margin-top:4px">Kiểm tra ngay</button> <span id="td-net-chkr"></span>
  <label style="display:block;margin:8px 0 2px"><input type="checkbox" id="td-net-cdn" ${s.cdn ? 'checked' : ''}> Tải thư viện dự phòng khi bản nhúng lỗi (có băm SRI): <span style="font-size:.85rem;color:#555">${esc(libs)}</span></label>
  <div style="margin:10px 0 2px;font-weight:600">AI (tuỳ chọn — bạn tự nhập khoá; chỉ gửi SỐ TỔNG HỢP, không có thông tin khách hàng)</div>
  <label><input type="checkbox" id="td-net-ai" ${s.ai.enabled ? 'checked' : ''}> Bật AI</label>
  <input id="td-net-aiep" value="${esc(s.ai.endpoint)}" style="width:100%;padding:6px;margin:4px 0" placeholder="Địa chỉ API">
  <div style="display:flex;gap:6px"><input id="td-net-aimodel" value="${esc(s.ai.model)}" style="flex:1;padding:6px" placeholder="Mô hình"><input id="td-net-aikey" type="password" value="${esc(TD.net.getKey())}" style="flex:2;padding:6px" placeholder="Khoá API (chỉ lưu trên máy này, không nằm trong sao lưu)"></div>
  <button class="btn btn-ghost" id="td-net-askb" style="margin-top:6px">🤖 Nhận xét số liệu bằng AI… (xem trước nội dung sẽ gửi)</button>
  <div id="td-net-ai-box" style="display:none;margin-top:8px"><div style="font-weight:600">Nội dung SẼ được gửi tới <span id="td-net-ai-host"></span>:</div><textarea id="td-net-ai-pl" readonly style="width:100%;height:160px;font:12px/1.4 monospace"></textarea><button class="btn btn-green" id="td-net-ai-send">Đồng ý — Gửi</button> <pre id="td-net-ai-out" style="white-space:pre-wrap;margin-top:8px;font:13px/1.5 system-ui"></pre></div>
  <details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Nhật ký gửi ra ngoài (${TD.net.getLog().length})</summary><div style="font-size:.82rem;max-height:120px;overflow:auto">${TD.net.getLog().slice(-10).reverse().map(l => esc(l.t + ' · ' + l.f + ' → ' + l.h + (l.b ? ' · ' + l.b + ' ký tự' : ''))).join('<br>') || 'Chưa có lần nào.'}</div></details>
  <div id="td-net-msg" style="min-height:20px;margin-top:6px;font-weight:600"></div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn btn-ghost" onclick="document.getElementById('td-net-dlg').remove()">Đóng</button><button class="btn btn-green" id="td-net-save">Lưu</button></div></div>`;
  document.body.appendChild(d);
  const $ = id => document.getElementById(id), msg = (t, c) => { $('td-net-msg').textContent = t; $('td-net-msg').style.color = c || '#555'; };
  $('td-net-save').onclick = () => {
    const before = TD.net.cspApplied;
    TD.net.setKey($('td-net-aikey').value.trim());
    const n = TD.net.save(localStorage, { mode: $('td-net-on').checked ? 'on' : 'off', versionUrl: $('td-net-ver').value, cdn: $('td-net-cdn').checked, ai: { enabled: $('td-net-ai').checked, endpoint: $('td-net-aiep').value, model: $('td-net-aimodel').value } });
    if (TD.net.csp(n) !== before) { msg('✅ Đã lưu — đang tải lại trang để áp dụng chính sách mạng mới…', '#15803d'); setTimeout(() => location.reload(), 900); } else msg('✅ Đã lưu', '#15803d');
  };
  $('td-net-chk').onclick = async () => { const r = $('td-net-chkr'); r.textContent = '⌛'; try { const v = await TD.net.checkVersion(); r.style.color = v.newer ? '#b45309' : '#15803d'; r.textContent = v.newer ? '⬆ Có bản mới ' + v.remote + (v.url ? ' — ' + v.url : '') : '✅ Đang dùng bản mới nhất (' + v.local + ')'; } catch (e) { r.style.color = '#dc2626'; r.textContent = '⛔ ' + (/Failed to fetch|NetworkError/.test(e.message) ? 'Không kết nối được (chế độ mạng tắt, địa chỉ chưa lưu, hoặc không có mạng)' : e.message); } };
  $('td-net-askb').onclick = () => { try { const P = TD.net.aiBuild(); $('td-net-ai-pl').value = P.text; $('td-net-ai-host').textContent = TD.net.origin($('td-net-aiep').value) || '(địa chỉ không hợp lệ)'; $('td-net-ai-box').style.display = 'block'; $('td-net-ai-out').textContent = ''; msg('Kiểm tra nội dung rồi bấm "Đồng ý — Gửi" (cần Lưu trước nếu vừa đổi cài đặt).'); } catch (e) { msg('⛔ ' + e.message, '#dc2626'); } };
  $('td-net-ai-send').onclick = async () => { $('td-net-ai-out').textContent = '⌛ Đang hỏi AI…'; try { const t = await TD.net.askAI($('td-net-ai-pl').value); $('td-net-ai-out').textContent = t + '\n\n(Nội dung do AI sinh ra — hãy kiểm tra lại trước khi dùng.)'; } catch (e) { $('td-net-ai-out').textContent = '⛔ ' + (/Failed to fetch|NetworkError/.test(e.message) ? 'Không kết nối được (chưa bật/đã lưu AI, hoặc không có mạng)' : e.message); } };
}
window.tdNetDialog = tdNetDialog;
/* P10 (T6): danh sách cán bộ theo phòng ban — cấu hình người dùng (lưu ở trình duyệt này; tệp phát hành không chứa tên cán bộ).
   Chưa cấu hình ⇒ tự học từ dữ liệu dư nợ đã nhập. Dùng cho thứ tự Phòng ban → CBTD ở mọi bảng, báo cáo theo CBTD, cán bộ mặc định ở bộ lọc. */
function tdRosterDialog() {
  let d = document.getElementById('td-roster-dlg'); if (d) d.remove();
  const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const R = TD_SXCB.roster(), n = TD.roster.count(R.cfg);
  d = document.createElement('div'); d.id = 'td-roster-dlg'; d.className = 'no-print';
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:var(--z-3,2000);display:flex;align-items:center;justify-content:center;overflow:auto';
  d.innerHTML = `<div role="dialog" aria-label="Danh sách cán bộ" style="background:#fff;color:#111;border-radius:10px;padding:18px 20px;width:min(640px,94vw);max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);font:14px/1.5 system-ui">
  <div style="font-weight:800;font-size:1.05rem;margin-bottom:6px">👥 Danh sách cán bộ theo phòng ban</div>
  <div id="td-roster-src" style="padding:8px 10px;border-radius:8px;margin-bottom:8px;font-weight:600;${R.src === 'config' ? 'background:#f0fdf4;border:1px solid #86efac;color:#14532d' : 'background:#eff6ff;border:1px solid #93c5fd;color:#1e3a8a'}">${R.src === 'config' ? 'Đang dùng danh sách anh/chị đã lưu' : 'Chưa lưu danh sách — đang tự học từ dữ liệu dư nợ đã nhập'} (${n} cán bộ). Danh sách chỉ lưu trên trình duyệt này, không nằm trong tệp ứng dụng.</div>
  <div style="font-size:.85rem;color:#444;margin-bottom:4px">Mỗi dòng: <code>Phòng ban | Họ tên | Vai trò</code>. Tên trong tệp IPCAS viết tắt (Lê Thị H Mai) hoặc khác họ tự khớp. Dòng <code>Mặc định | Họ tên</code>: cán bộ chọn sẵn ở bộ lọc thông báo.</div>
  <textarea id="td-roster-txt" spellcheck="false" style="width:100%;height:300px;font:13px/1.45 ui-monospace,monospace;padding:8px">${esc(TD_SXCB.configText())}</textarea>
  <div id="td-roster-msg" style="min-height:20px;margin-top:6px;font-weight:600"></div>
  <div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-top:8px">
    <span><button class="btn btn-ghost" id="td-roster-learn" title="Điền lại theo dữ liệu dư nợ hiện có (chưa lưu)">↻ Học từ dữ liệu</button> <button class="btn btn-ghost" id="td-roster-clear" title="Xoá danh sách đã lưu, quay về tự học">🗑 Xoá danh sách đã lưu</button></span>
    <span><button class="btn btn-ghost" onclick="document.getElementById('td-roster-dlg').remove()">Đóng</button> <button class="btn btn-green" id="td-roster-save">Lưu</button></span></div></div>`;
  document.body.appendChild(d);
  const $ = id => document.getElementById(id), msg = (t, c) => { $('td-roster-msg').textContent = t; $('td-roster-msg').style.color = c || '#555'; };
  const after = () => { try { rebuildAll(); } catch (e) {} };
  $('td-roster-save').onclick = () => { const r = TD_SXCB.setConfig($('td-roster-txt').value); if (r.errors.length) { msg('⚠ Chưa lưu — ' + r.errors.slice(0, 3).map(e => 'dòng ' + e.line + ': ' + e.msg).join('; '), '#b91c1c'); return; } msg('✅ Đã lưu ' + TD.roster.count(r.cfg) + ' cán bộ', '#15803d'); after(); };
  $('td-roster-learn').onclick = () => { const l = TD.roster.learn(DATA.qltd || []); l.def = TD_SXCB.defaultCbtd(); $('td-roster-txt').value = TD.roster.format(l); msg('Đã điền ' + TD.roster.count(l) + ' cán bộ theo dữ liệu — bấm Lưu để giữ', '#1e3a8a'); };
  $('td-roster-clear').onclick = () => { TD_SXCB.setConfig(''); $('td-roster-txt').value = TD_SXCB.configText(); msg('Đã xoá — quay về tự học từ dữ liệu', '#555'); after(); };
}
window.tdRosterDialog = tdRosterDialog;

function tdRenderDateChip() { // HM-07
  try {
    var c = document.getElementById('td-datechip'); if (!c || !window.TD || !TD.dataDate) return;
    var l = TD.dataDate.label();
    c.textContent = l.text; c.title = l.title;
    c.className = l.mode === 'today' ? 'today' : (l.stale ? 'stale' : '');
  } catch (e) {}
}
function tdToggleDataDate() { // HM-07: chuyển Dữ liệu ⇄ Hôm nay rồi tính lại toàn app
  if (!TD.dataDate.get()) { try { showToast('Chưa có ngày dữ liệu (tên tệp không chứa ngày) — đang dùng hôm nay', 'warn'); } catch (e) {} tdRenderDateChip(); return; }
  TD.dataDate.setMode(TD.dataDate.mode() === 'data' ? 'today' : 'data');
  tdRenderDateChip();
  try { rebuildAll(); } catch (e) { console.warn('[HM-07] rebuildAll', e); }
}
window.tdToggleDataDate = tdToggleDataDate; window.tdRenderDateChip = tdRenderDateChip;
(function () {
  function hook() {
    try { if (typeof rebuildAll === 'function' && !rebuildAll.__tdDate) { var o = rebuildAll; window.rebuildAll = rebuildAll = function () { var r = o.apply(this, arguments); tdRenderDateChip(); return r; }; rebuildAll.__tdDate = 1; } } catch (e) {}
    tdRenderDateChip();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
  window.addEventListener('load', function () { setTimeout(hook, 1500); });
})();
function realTodayMidnight() { // HM-07: hôm nay thật
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function todayMidnight() { // HM-07: "hôm nay" của nghiệp vụ = ngày dữ liệu của tệp (hoặc hôm nay nếu người dùng chọn)
  try { if (window.TD && TD.dataDate) return TD.dataDate.effective(); } catch (e) {}
  return realTodayMidnight();
}
function monthYearLabel(d = new Date()) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function customerKey(r) {
  const ma = String(r?.[0] || '').trim();
  const ten = String(r?.[1] || '').trim().replace(/\s+/g, ' ').toUpperCase(); // FIX: /\s+/ not /s+/
  if (ma) return `M:${ma}`;
  if (ten) return `N:${ten}`;
  return '';
}
function isActualCreditRow(r) {
  return !!customerKey(r) && (Number(r?.[11]) || 0) > 0;
}
function countRealCustomers(rows) {
  const m = new Map();
  rows.forEach(r => {
    const k = customerKey(r);
    if (!k) return;
    m.set(k, (m.get(k) || 0) + (Number(r[11]) || 0));
  });
  let n = 0;
  m.forEach(v => { if (v > 0) n++; });
  return n;
}
function updateTableTopScrollbars() {
  // HM-18: chỉ trang đang hiển thị; 3 pha (tạo → đọc → ghi) để chỉ ép layout một lần; trang khác được cập nhật khi vào trang (TD.router)
  const wraps = Array.from(document.querySelectorAll('.table-wrap')).filter(w => !w.closest('.page:not(.active)'));
  wraps.forEach(wrap => {
    if (!wrap.previousElementSibling || !wrap.previousElementSibling.classList.contains('table-scroll-top')) {
      const top = document.createElement('div');
      const spacer = document.createElement('div');
      top.className = 'table-scroll-top';
      spacer.className = 'table-scroll-spacer';
      top.appendChild(spacer);
      wrap.parentNode.insertBefore(top, wrap);
      wrap.classList.add('with-top-scroll');
      let lock = false;
      top.addEventListener('scroll', () => {
        if (lock) return;
        lock = true;
        wrap.scrollLeft = top.scrollLeft;
        lock = false;
      });
      wrap.addEventListener('scroll', () => {
        if (lock) return;
        lock = true;
        top.scrollLeft = wrap.scrollLeft;
        lock = false;
      });
    }
  });
  const meas = [];
  wraps.forEach(wrap => { // pha đọc
    const top = wrap.previousElementSibling;
    const table = wrap.querySelector('table');
    const spacer = top && top.querySelector('.table-scroll-spacer');
    if (!top || !table || !spacer) return;
    meas.push({ top: top, spacer: spacer, width: Math.max(table.scrollWidth, wrap.scrollWidth), cw: wrap.clientWidth, sl: wrap.scrollLeft });
  });
  meas.forEach(m => { // pha ghi
    m.spacer.style.width = m.width + 'px';
    m.top.style.display = m.width > m.cw + 1 ? 'block' : 'none';
    m.top.scrollLeft = m.sl;
  });
}

/* ═══════════════════════════════════════════════════════════════
   DD/MM/YYYY DATE INPUT HELPERS — vĩnh viễn dạng hiển thị này
   ═══════════════════════════════════════════════════════════════ */
// Chấp nhận các biến thể: "1/1/26", "01-01-2026", "01.01.2026", "01/01/2026"
// Chuẩn hoá về "dd/mm/yyyy"
function normalizeDateString(s) {
  if (!s) return '';
  const raw = String(s).trim().replace(/[-.]/g, '/');
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const dd = +m[1], mm = +m[2];
  let yyyy = +m[3];
  if (m[3].length === 2) yyyy = 2000 + yyyy;
  // Validate ngày/tháng hợp lệ
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;
  // Check exact date is valid (reject 31/02/2026 etc.)
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${yyyy}`;
}
// Mark input visual state (xanh nếu valid, đỏ nếu sai)
function markDateInputState(el, ok) {
  el.classList.remove('valid', 'invalid');
  if (el.value.trim() === '') return;
  el.classList.add(ok ? 'valid' : 'invalid');
}
function filterDateInput(el, key) {
  const v = el.value.trim();
  if (v === '') { markDateInputState(el, true); filterTable(key); return; }
  const norm = normalizeDateString(v);
  if (norm) {
    markDateInputState(el, true);
    filterTable(key);
  } else {
    markDateInputState(el, false);
    // Không filter khi chưa hợp lệ — chờ user gõ xong
  }
}
function normalizeDateInput(el) {
  const v = el.value.trim();
  if (!v) { markDateInputState(el, true); return; }
  const norm = normalizeDateString(v);
  if (norm) {
    el.value = norm;
    markDateInputState(el, true);
  } else {
    markDateInputState(el, false);
  }
}


/* ═══════════════════════════════════════════════════════════════
   CÔNG THỨC TÍNH LÃI CHUẨN AGRIBANK — CƠ SỞ 365 NGÀY
   Nguồn: Thông tư 14/2017/TT-NHNN, Điều 4
   Kiểm chứng: Chứng từ Agribank 17/04/2026, KH KH mẫu
   HĐTD 3201-LAV-000000000 — 500.000.000đ × 8%/năm × 2 ngày / 365 = 219.178đ ✓
   ═══════════════════════════════════════════════════════════════ */

// Hằng số công thức (có thể dùng khi muốn hiển thị / tra cứu)
const CONG_THUC_TINH_LAI = {
  version: '1.0',
  nguonCanCu: 'Thông tư 14/2017/TT-NHNN, Điều 4',
  coSoNgay: 365,
  congThucChinh: 'Tiền lãi = Dư nợ gốc × Lãi suất năm × Số ngày vay ÷ 365',
  cachTinhSoNgay: 'Số ngày vay = Ngày trả nợ − Ngày giải ngân (ngày GN tính lãi, ngày trả không tính)',
  heSoLaiQuaHan: 1.5,           // 150% lãi suất trong hạn
  laiChamTraLaiNamMacDinh: 10,  // 10%/năm cho lãi chậm trả
};

/**
 * Tính số ngày vay theo quy tắc ngân hàng.
 * Ngày giải ngân TÍNH lãi; ngày trả KHÔNG tính lãi.
 * → số ngày = ngayTra - ngayGN (kiểu Excel B-A).
 * @param {Date|string} ngayGN  ngày giải ngân (dd/mm/yyyy hoặc Date)
 * @param {Date|string} ngayTra ngày trả nợ/tất toán (dd/mm/yyyy hoặc Date)
 * @returns {number} số ngày vay (tối thiểu 0)
 */
function tinhSoNgayVay(ngayGN, ngayTra) {
  const d1 = ngayGN instanceof Date ? ngayGN : parseVNDate(ngayGN);
  const d2 = ngayTra instanceof Date ? ngayTra : parseVNDate(ngayTra);
  if (!d1 || !d2) return 0;
  const diff = Math.round((d2 - d1) / 86400000);
  return Math.max(0, diff);
}

/**
 * 🧮 Tính tiền lãi TRONG HẠN theo cơ sở 365 ngày.
 * CÔNG THỨC: Lãi = Dư nợ gốc × LS năm × Số ngày ÷ 365
 *
 * @param {number} duNoGoc   Dư nợ gốc (đồng)
 * @param {number} lsNam     Lãi suất năm, dạng %, ví dụ 8 cho 8%/năm
 * @param {Date|string} ngayGN   Ngày giải ngân (dd/mm/yyyy)
 * @param {Date|string} ngayTra  Ngày trả nợ (dd/mm/yyyy)
 * @returns {{soNgay:number, tienLai:number, tongThu:number, chiTiet:string}}
 *
 * Kiểm chứng với chứng từ Agribank (KH mẫu):
 *   tinhLai365(500000000, 8, '15/04/2026', '17/04/2026')
 *   → { soNgay: 2, tienLai: 219178, tongThu: 500219178 } ✓
 */
function tinhLai365(duNoGoc, lsNam, ngayGN, ngayTra) {
  const goc = Number(duNoGoc) || 0;
  const rate = Number(lsNam) || 0;
  const soNgay = tinhSoNgayVay(ngayGN, ngayTra);
  // Công thức chuẩn: làm tròn đến đồng gần nhất (Math.round), theo kiểu Agribank để khớp chứng từ
  // Lưu ý: comment cũ ghi "làm tròn xuống (FLOOR)" nhưng code dùng Math.round — đã sửa comment cho đúng thực tế code (2026-08-29 QA)
  const laiRaw = goc * (rate / 100) * soNgay / 365;
  const tienLai = Math.round(laiRaw);
  return {
    soNgay,
    tienLai,
    tongThu: goc + tienLai,
    chiTiet: `${fmtNum(goc)} × ${rate}%/năm × ${soNgay} ngày ÷ 365 = ${fmtNum(tienLai)} đ`
  };
}

/**
 * 🔴 Tính tiền lãi QUÁ HẠN (150% lãi suất trong hạn).
 * CÔNG THỨC: Lãi quá hạn = Dư nợ quá hạn × (LS năm × 1.5) × Số ngày ÷ 365
 *
 * @param {number} duNoQuaHan  Dư nợ gốc đã quá hạn (đồng)
 * @param {number} lsNam       Lãi suất TRONG HẠN năm (%), hệ thống tự ×1.5
 * @param {Date|string} ngayBatDauQH Ngày bắt đầu tính quá hạn (thường = ngày đến hạn gốc)
 * @param {Date|string} ngayTra      Ngày trả nợ
 * @param {number} [heSo=1.5]  Hệ số quá hạn (mặc định 1.5 = 150%)
 */
function tinhLaiQuaHan(duNoQuaHan, lsNam, ngayBatDauQH, ngayTra, heSo) {
  const h = heSo != null ? Number(heSo) : 1.5;
  const goc = Number(duNoQuaHan) || 0;
  const lsQH = Number(lsNam) * h;
  const soNgay = tinhSoNgayVay(ngayBatDauQH, ngayTra);
  const lai = Math.round(goc * (lsQH / 100) * soNgay / 365);
  return {
    soNgay,
    lsQuaHan: lsQH,
    tienLai: lai,
    chiTiet: `${fmtNum(goc)} × ${lsQH.toFixed(2)}%/năm × ${soNgay} ngày ÷ 365 = ${fmtNum(lai)} đ`
  };
}

/**
 * 🟠 Tính tiền lãi CHẬM TRẢ LÃI (theo LS 10%/năm theo Luật Dân sự).
 * CÔNG THỨC: Lãi chậm trả = Tiền lãi chưa trả × 10%/năm × Số ngày chậm ÷ 365
 *
 * @param {number} tienLaiChuaTra  Số tiền lãi đã quá hạn chưa thu
 * @param {Date|string} ngayBatDau Ngày bắt đầu tính chậm trả (thường = ngày đến hạn trả lãi)
 * @param {Date|string} ngayTra    Ngày trả thực tế
 * @param {number} [lsCham=10]     Lãi suất chậm trả (%), mặc định 10%/năm
 */
function tinhLaiChamTra(tienLaiChuaTra, ngayBatDau, ngayTra, lsCham) {
  const ls = lsCham != null ? Number(lsCham) : 10;
  const goc = Number(tienLaiChuaTra) || 0;
  const soNgay = tinhSoNgayVay(ngayBatDau, ngayTra);
  const lai = Math.round(goc * (ls / 100) * soNgay / 365);
  return {
    soNgay,
    tienLai: lai,
    chiTiet: `${fmtNum(goc)} × ${ls}%/năm × ${soNgay} ngày ÷ 365 = ${fmtNum(lai)} đ`
  };
}

/**
 * 💰 Tính TỔNG THU (gốc + lãi trong hạn + lãi quá hạn + lãi chậm trả).
 * Dùng cho tất toán 1 khoản vay có đầy đủ các loại lãi.
 * 
 * @param {object} opts
 * @param {number} opts.goc       Dư nợ gốc
 * @param {number} opts.lsNam     Lãi suất năm %
 * @param {Date|string} opts.ngayGN     Ngày giải ngân
 * @param {Date|string} opts.ngayDenHan Ngày đến hạn (bắt đầu tính quá hạn)
 * @param {Date|string} opts.ngayTra    Ngày trả nợ thực tế
 * @param {number} [opts.laiChuaTra=0]  Lãi trong hạn chưa trả (nếu có)
 * @returns {object} breakdown đầy đủ
 */
function tinhTongThuKhoanVay(opts) {
  const { goc, lsNam, ngayGN, ngayDenHan, ngayTra, laiChuaTra = 0 } = opts;
  const ngayTraD = ngayTra instanceof Date ? ngayTra : parseVNDate(ngayTra);
  const ngayDenHanD = ngayDenHan instanceof Date ? ngayDenHan : parseVNDate(ngayDenHan);
  const daQuaHan = ngayDenHanD && ngayTraD && ngayTraD > ngayDenHanD;

  // 1. Lãi trong hạn: từ GN đến min(ngày trả, ngày đến hạn)
  const endTrongHan = daQuaHan ? ngayDenHanD : ngayTraD;
  const laiTrongHan = tinhLai365(goc, lsNam, ngayGN, endTrongHan);

  // 2. Lãi quá hạn: từ ngày đến hạn đến ngày trả (nếu quá hạn)
  let laiQH = { tienLai: 0, soNgay: 0, chiTiet: 'Không quá hạn' };
  if (daQuaHan) {
    laiQH = tinhLaiQuaHan(goc, lsNam, ngayDenHan, ngayTra);
  }

  // 3. Lãi chậm trả lãi (nếu có lãi chưa trả từ trước)
  let laiCham = { tienLai: 0, soNgay: 0, chiTiet: 'Không có lãi chậm trả' };
  if (laiChuaTra > 0 && daQuaHan) {
    laiCham = tinhLaiChamTra(laiChuaTra, ngayDenHan, ngayTra);
  }

  const tongLai = laiTrongHan.tienLai + laiQH.tienLai + laiCham.tienLai;
  const tongThu = (Number(goc) || 0) + tongLai;

  return {
    goc: Number(goc) || 0,
    laiTrongHan, laiQuaHan: laiQH, laiChamTra: laiCham,
    tongLai, tongThu,
    daQuaHan
  };
}


/* ═══════════════════════════════════════════════════════════════
   LZ-STRING COMPRESSION  (self-contained, ~3 KB)
   Tăng dung lượng lưu trữ ~4–6× so với JSON thuần
   ═══════════════════════════════════════════════════════════════ */
const LZS = (window.__TD_LZS_FACTORY = () => { // P10 (T3): giữ hàm tạo để worker nén dùng cùng mã
  const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  function _compress(uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return '';
    let i, value, ctxDictionary = {}, ctxDictionaryToCreate = {}, ctxC = '', ctxWC = '', ctxW = '';
    let ctxEnlargeIn = 2, ctxDictSize = 3, ctxNumBits = 2, ctxData = [], ctxDataVal = 0, ctxDataPos = 0;
    for (let ii = 0; ii < uncompressed.length; ii++) {
      ctxC = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(ctxDictionary, ctxC)) {
        ctxDictionary[ctxC] = ctxDictSize++; ctxDictionaryToCreate[ctxC] = true;
      }
      ctxWC = ctxW + ctxC;
      if (Object.prototype.hasOwnProperty.call(ctxDictionary, ctxWC)) { ctxW = ctxWC; }
      else {
        if (Object.prototype.hasOwnProperty.call(ctxDictionaryToCreate, ctxW)) {
          if (ctxW.charCodeAt(0) < 256) {
            for (i = 0; i < ctxNumBits; i++) { ctxDataVal = (ctxDataVal << 1); if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
            value = ctxW.charCodeAt(0);
            for (i = 0; i < 8; i++) { ctxDataVal = (ctxDataVal << 1) | (value & 1); value >>= 1; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
          } else {
            value = 1;
            for (i = 0; i < ctxNumBits; i++) { ctxDataVal = (ctxDataVal << 1) | value; value = 0; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
            value = ctxW.charCodeAt(0);
            for (i = 0; i < 16; i++) { ctxDataVal = (ctxDataVal << 1) | (value & 1); value >>= 1; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
          }
          ctxEnlargeIn--;
          if (ctxEnlargeIn == 0) { ctxEnlargeIn = Math.pow(2, ctxNumBits); ctxNumBits++; }
          delete ctxDictionaryToCreate[ctxW];
        } else {
          value = ctxDictionary[ctxW];
          for (i = 0; i < ctxNumBits; i++) { ctxDataVal = (ctxDataVal << 1) | (value & 1); value >>= 1; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
        }
        ctxEnlargeIn--;
        if (ctxEnlargeIn == 0) { ctxEnlargeIn = Math.pow(2, ctxNumBits); ctxNumBits++; }
        ctxDictionary[ctxWC] = ctxDictSize++; ctxW = String(ctxC);
      }
    }
    if (ctxW !== '') {
      if (Object.prototype.hasOwnProperty.call(ctxDictionaryToCreate, ctxW)) {
        if (ctxW.charCodeAt(0) < 256) {
          for (i = 0; i < ctxNumBits; i++) { ctxDataVal = (ctxDataVal << 1); if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
          value = ctxW.charCodeAt(0);
          for (i = 0; i < 8; i++) { ctxDataVal = (ctxDataVal << 1) | (value & 1); value >>= 1; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
        } else {
          value = 1;
          for (i = 0; i < ctxNumBits; i++) { ctxDataVal = (ctxDataVal << 1) | value; value = 0; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
          value = ctxW.charCodeAt(0);
          for (i = 0; i < 16; i++) { ctxDataVal = (ctxDataVal << 1) | (value & 1); value >>= 1; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
        }
        ctxEnlargeIn--;
        if (ctxEnlargeIn == 0) { ctxEnlargeIn = Math.pow(2, ctxNumBits); ctxNumBits++; }
        delete ctxDictionaryToCreate[ctxW];
      } else {
        value = ctxDictionary[ctxW];
        for (i = 0; i < ctxNumBits; i++) { ctxDataVal = (ctxDataVal << 1) | (value & 1); value >>= 1; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
      }
      ctxEnlargeIn--;
      if (ctxEnlargeIn == 0) { ctxEnlargeIn = Math.pow(2, ctxNumBits); ctxNumBits++; }
    }
    value = 2;
    for (i = 0; i < ctxNumBits; i++) { ctxDataVal = (ctxDataVal << 1) | (value & 1); value >>= 1; if (ctxDataPos == bitsPerChar - 1) { ctxDataPos = 0; ctxData.push(getCharFromInt(ctxDataVal)); ctxDataVal = 0; } else ctxDataPos++; }
    while (true) { ctxDataVal = (ctxDataVal << 1); if (ctxDataPos == bitsPerChar - 1) { ctxData.push(getCharFromInt(ctxDataVal)); break; } else ctxDataPos++; }
    return ctxData.join('');
  }
  function _decompress(length, resetValue, getNextValue) {
    const dictionary = []; let next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = '', result = [], w, bits, resb, maxpower, power, c, data = { val: getNextValue(0), position: resetValue, index: 1 };
    for (let i = 0; i < 3; i++) dictionary[i] = i;
    bits = 0; maxpower = Math.pow(2, 2); power = 1;
    while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
    switch (next = bits) {
      case 0: bits = 0; maxpower = Math.pow(2, 8); power = 1; while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } c = String.fromCharCode(bits); break;
      case 1: bits = 0; maxpower = Math.pow(2, 16); power = 1; while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } c = String.fromCharCode(bits); break;
      case 2: return '';
    }
    dictionary[3] = c; w = c; result.push(c);
    while (true) {
      if (data.index > length) return '';
      bits = 0; maxpower = Math.pow(2, numBits); power = 1;
      while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
      switch (c = bits) {
        case 0: bits = 0; maxpower = Math.pow(2, 8); power = 1; while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } dictionary[dictSize++] = String.fromCharCode(bits); c = dictSize - 1; enlargeIn--; break;
        case 1: bits = 0; maxpower = Math.pow(2, 16); power = 1; while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } dictionary[dictSize++] = String.fromCharCode(bits); c = dictSize - 1; enlargeIn--; break;
        case 2: return result.join('');
      }
      if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      if (dictionary[c]) entry = dictionary[c]; else { if (c === dictSize) entry = w + w.charAt(0); else return null; }
      result.push(entry); dictionary[dictSize++] = w + entry.charAt(0); enlargeIn--;
      if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      w = entry;
    }
  }
  return {
    compressToBase64(input) {
      if (input == null) return '';
      const res = _compress(input, 6, a => keyStr.charAt(a));
      switch (res.length % 4) { case 0: return res; case 1: return res + '==='; case 2: return res + '=='; case 3: return res + '='; }
      return res;
    },
    decompressFromBase64(input) {
      if (input == null) return ''; if (input == '') return null;
      return _decompress(input.length, 32, idx => {
        const v = keyStr.indexOf(input.charAt(idx));
        return v === -1 ? 0 : v;
      });
    }
  };
})();

/* ═══════════════════════════════════════════════════════════════
   STORAGE — IndexedDB primary (nén LZ) + localStorage fallback
   Dung lượng tăng ~4–6×. Lưu đủ tất cả mảng DATA.
   Schema v2: store 'chunks' cho mảng lớn, 'snapshots' cho meta
   ═══════════════════════════════════════════════════════════════ */
function openIDB() {
  return new Promise((res, rej) => {
    if (_idb) return res(_idb);
    let tried = false;
    const tryOpen = (ver) => {
      const req = indexedDB.open(IDB_NAME, ver);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        if (!db.objectStoreNames.contains(IDB_CHUNKS)) db.createObjectStore(IDB_CHUNKS);
      };
      req.onsuccess = e => { _idb = e.target.result; res(_idb); };
      req.onerror = () => {
        const err = req.error;
        /* PATCH v13.8.1: nếu IDB ở version cao hơn → mở đúng version đó */
        if (err && err.name === 'VersionError' && !tried) {
          tried = true;
          const probe = indexedDB.open(IDB_NAME);
          probe.onsuccess = ev => {
            const curVer = ev.target.result.version;
            ev.target.result.close();
            tryOpen(curVer);
          };
          probe.onerror = () => rej(err);
        } else { rej(err); }
      };
    };
    tryOpen(IDB_VER);
  });
}

/* HM-04: băm nhanh (cyrb53) để phát hiện chunk hỏng/cắt dở */
function _hm04Hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
/* P09: nén có nhớ theo NỘI DUNG chuỗi (khoá = chính chuỗi ⇒ không thể trả nhầm). Mỗi lần nhập tệp gọi saveData 3 lần và mỗi lần nén cùng
   dữ liệu 2 lần (localStorage + IndexedDB) ≈ 4,8 s trên luồng chính (đo trên 3.848 dòng thật); dữ liệu không đổi ⇒ dùng lại kết quả. */
const _lzMemoMap = new Map();
function _lzMemo(str) {
  if (typeof str !== 'string' || str.length < 20000) return LZS.compressToBase64(str);
  let v = _lzMemoMap.get(str);
  if (v === undefined) { v = LZS.compressToBase64(str); _lzMemoSet(str, v); }
  return v;
}
function _lzMemoSet(str, v) { _lzMemoMap.set(str, v); while (_lzMemoMap.size > 12) _lzMemoMap.delete(_lzMemoMap.keys().next().value); }
/* P10 (T3): nén TRƯỚC trong Web Worker các chuỗi lớn mà lần lưu sắp nén (kết quả vào bộ nhớ đệm theo nội dung ⇒ saveToLS/idbSaveAll trúng đệm,
   luồng chính chỉ còn JSON.stringify; ~0,9 s nén mỗi kỳ trên dữ liệu thật). Không có worker ⇒ không làm gì, nén đồng bộ như cũ. */
async function _lzPrefetch(strs) {
  const need = strs.filter((x, i) => typeof x === 'string' && x.length >= 20000 && !_lzMemoMap.has(x) && strs.indexOf(x) === i);
  if (!need.length || window.__TD_NO_WORKER || !window.TD || !TD.xlsWorker || !TD.xlsWorker.alive()) return 0;
  try { const out = await TD.xlsWorker.call('lz', { strs: need }); need.forEach((x, i) => { if (typeof out[i] === 'string') _lzMemoSet(x, out[i]); }); return need.length; }
  catch (e) { return 0; }
}
function _saveStrings(arrays) { // đúng các chuỗi saveToLS + _hm04Pack sẽ nén
  const out = [JSON.stringify(DATA.qltd), JSON.stringify(DATA.hdv), JSON.stringify(DATA.macb || [])];
  Object.keys(arrays).forEach(k => { const a = arrays[k] || [], n = Math.ceil(a.length / 2000) || 1; for (let i = 0; i < n; i++) out.push(JSON.stringify(a.slice(i * 2000, (i + 1) * 2000))); });
  return out;
}
function _hm04Pack(arr) {
  const CHUNK = 2000; // số phần tử / chunk
  const total = Math.ceil(arr.length / CHUNK) || 1;
  const chunks = [], sums = [];
  for (let i = 0; i < total; i++) {
    const c = _lzMemo(JSON.stringify(arr.slice(i * CHUNK, (i + 1) * CHUNK)));
    chunks.push(c); sums.push(_hm04Hash(c));
  }
  return { meta: { totalChunks: total, length: arr.length, sums: sums, ts: Date.now(), v: 2 }, chunks: chunks };
}
/* HM-04: đánh dấu dữ liệu lưu cục bộ bị hỏng — saveData/saveToLS sẽ không ghi đè khoá này */
function _hm04MarkCorrupt(key, reason, expected) {
  window.__storageCorrupt = window.__storageCorrupt || {};
  window.__storageCorrupt[key] = { reason: reason, expected: expected };
  console.error('[HM-04] Dữ liệu lưu cục bộ "' + key + '" bị hỏng: ' + reason + ' (kỳ vọng ' + expected + ' phần tử). Đã chặn ghi đè.');
}
window.__storageClearCorrupt = function () {
  window.__storageCorrupt = null;
  try { const b = document.getElementById('storage-corrupt-banner'); if (b) b.remove(); } catch (_) {}
};
window.showStorageCorruptBanner = function () {
  try {
    const c = window.__storageCorrupt; if (!c || !Object.keys(c).length || document.getElementById('storage-corrupt-banner')) return;
    const div = document.createElement('div');
    div.id = 'storage-corrupt-banner';
    div.style.cssText = 'position:sticky;top:0;z-index:calc(var(--z-7,99990) + 4);background:#fee2e2;border-bottom:2px solid #b91c1c;color:#7f1d1d;padding:10px 16px;font-weight:600;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
    div.innerHTML = '⛔ Dữ liệu lưu trên máy bị hỏng (' + Object.keys(c).map(k => k + ': ' + c[k].reason).join('; ') + '). Đã DỪNG tự động lưu để không ghi đè. Hãy khôi phục từ tệp sao lưu hoặc nhập lại tệp IPCAS. '
      + '<button onclick="try{importBackup()}catch(e){}" style="background:#b91c1c;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer">Khôi phục từ sao lưu</button>';
    (document.body || document.documentElement).insertBefore(div, document.body ? document.body.firstChild : null);
  } catch (_) {}
};

/* HM-04: ghi meta + mọi mảng lớn trong MỘT giao dịch (hoặc ghi hết, hoặc không ghi gì); xoá chunk thừa */
async function idbSaveAll(payload, arrays) {
  const db = await openIDB();
  const packed = {};
  Object.keys(arrays).forEach(k => { packed[k] = _hm04Pack(arrays[k]); });
  const mainC = payload ? LZS.compressToBase64(JSON.stringify(payload)) : null;
  return new Promise((res, rej) => {
    const tx = db.transaction([IDB_STORE, IDB_CHUNKS], 'readwrite');
    const st = tx.objectStore(IDB_CHUNKS);
    if (mainC !== null) tx.objectStore(IDB_STORE).put(mainC, 'main');
    Object.keys(packed).forEach(key => {
      const p = packed[key];
      const rq = st.get(`${key}__meta`);
      rq.onsuccess = () => {
        const old = rq.result;
        const oldTotal = old && old.totalChunks ? old.totalChunks : 0;
        for (let i = p.chunks.length; i < oldTotal; i++) st.delete(`${key}__${i}`);
        p.chunks.forEach((c, i) => st.put(c, `${key}__${i}`));
        st.put(p.meta, `${key}__meta`);
      };
    });
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('Giao dịch IndexedDB bị huỷ'));
  });
}
async function idbSetChunked(key, arr) {
  const o = {}; o[key] = arr;
  return idbSaveAll(null, o);
}

async function idbGetChunked(key) {
  try {
    const db = await openIDB();
    const meta = await new Promise(res => {
      const tx = db.transaction(IDB_CHUNKS, 'readonly');
      const req = tx.objectStore(IDB_CHUNKS).get(`${key}__meta`);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => res(null);
    });
    if (!meta) return [];
    const parts = await Promise.all(
      Array.from({ length: meta.totalChunks }, (_, i) =>
        new Promise(res => {
          const tx = db.transaction(IDB_CHUNKS, 'readonly');
          const req = tx.objectStore(IDB_CHUNKS).get(`${key}__${i}`);
          req.onsuccess = () => {
            const raw = req.result;
            if (typeof raw !== 'string') return res({ bad: 'thiếu chunk ' + i });
            if (meta.sums && meta.sums[i] && _hm04Hash(raw) !== meta.sums[i]) return res({ bad: 'chunk ' + i + ' sai checksum' });
            try {
              const a = JSON.parse(LZS.decompressFromBase64(raw) || '');
              if (!Array.isArray(a)) return res({ bad: 'chunk ' + i + ' không phải mảng' });
              res({ a: a });
            } catch (e) { res({ bad: 'chunk ' + i + ' không giải nén được' }); }
          };
          req.onerror = () => res({ bad: 'chunk ' + i + ' lỗi đọc' });
        })
      )
    );
    let bad = (parts.find(p => p.bad) || {}).bad;
    const arr = bad ? [] : parts.flatMap(p => p.a);
    if (!bad && typeof meta.length === 'number' && arr.length !== meta.length) bad = 'số phần tử ' + arr.length + ' khác ' + meta.length;
    if (bad) { _hm04MarkCorrupt(key, bad, meta.length); return []; }
    return arr;
  } catch (e) { console.warn('[HM-04] idbGetChunked', key, e); return []; }
}

/* Lưu meta nhỏ (status objects) vào store chính, đã nén */
async function idbSet(payload) {
  try {
    const db = await openIDB();
    const compressed = LZS.compressToBase64(JSON.stringify(payload));
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(compressed, 'main');
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) { return false; }
}

async function idbGet() {
  try {
    const db = await openIDB();
    return new Promise(res => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('main');
      req.onsuccess = () => {
        if (!req.result) return res(null);
        try {
          // Hỗ trợ cả format cũ (object) và mới (compressed string)
          if (typeof req.result === 'string') {
            res(JSON.parse(LZS.decompressFromBase64(req.result)));
          } else {
            res(req.result); // legacy object từ v1
          }
        } catch { res(null); }
      };
      req.onerror = () => res(null);
    });
  } catch (e) { return null; }
}

async function idbClear() {
  try {
    const db = await openIDB();
    await new Promise(res => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete('main');
      tx.oncomplete = () => res();
    });
    await new Promise(res => {
      const tx = db.transaction(IDB_CHUNKS, 'readwrite');
      tx.objectStore(IDB_CHUNKS).clear();
      tx.oncomplete = () => res();
    });
  } catch (e) {}
}

function getPayload() {
  return {
    v: 2, ts: Date.now(),
    denhanStatus: DATA.denhanStatus,
    laidongStatus: DATA.laidongStatus,
    phidvExtra: DATA.phidvExtra || [],   // ✅ PRO-31: lưu phí thủ công
    phidvStatus: DATA.phidvStatus || {}, // ✅ PRO-32: trạng thái báo phí
    chlmStatus: DATA.chlmStatus || {},   // ✅ CHLM: trạng thái chuyển hạn mức
      hdvSnapshots: DATA.hdvSnapshots || {}, // ✅ HDV PRO
      hdvCurrentPeriod: DATA.hdvCurrentPeriod || '', // ✅ HDV PRO
    hosovay: DATA.hosovay || {},         // ✅ P0-1 FIX: persist hosovay
    khmoiExclude: DATA.khmoiExclude || { camco:{}, newcust:{} }, // ✅ KHMOI: loại trừ thủ công
    // qltd & hdv lưu riêng dạng chunked — không nhúng vào meta
  };
}

/* localStorage: chỉ lưu meta + qltd nén (fallback) */
function saveToLS() {
  if (window.__storageCorrupt && Object.keys(window.__storageCorrupt).length) return; // HM-04: giữ nguyên bản dự phòng
  try {
    const small = {
      v: 2, ts: Date.now(),
      denhanStatus: DATA.denhanStatus,
      laidongStatus: DATA.laidongStatus,
      qltd_lz: _lzMemo(JSON.stringify(DATA.qltd)),
      hdv_lz:  _lzMemo(JSON.stringify(DATA.hdv)),
      hdvSnapshots: DATA.hdvSnapshots || {}, // ✅ HDV PRO
      hdvCurrentPeriod: DATA.hdvCurrentPeriod || '', // ✅ HDV PRO
      macb_lz: _lzMemo(JSON.stringify(DATA.macb || [])),
      phidvExtra: DATA.phidvExtra || [],  // ✅ PRO-31: phí thủ công (nhỏ, không nén)
      phidvStatus: DATA.phidvStatus || {}, // ✅ PRO-32: trạng thái báo phí
      chlmStatus: DATA.chlmStatus || {},   // ✅ CHLM
      hosovay: DATA.hosovay || {},         // ✅ P0-1 FIX
      khmoiExclude: DATA.khmoiExclude || { camco:{}, newcust:{} }, // ✅ KHMOI
    };
    localStorage.setItem(LS_KEY, JSON.stringify(small));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Lần 2: bỏ macb, hdv
      try {
        const mini = {
          v: 2, ts: Date.now(),
          denhanStatus: DATA.denhanStatus,
          laidongStatus: DATA.laidongStatus,
          qltd_lz: _lzMemo(JSON.stringify(DATA.qltd)),
        };
        localStorage.setItem(LS_KEY, JSON.stringify(mini));
      } catch (_) {
        // Lần 3: chỉ status, bỏ hết mảng lớn
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({
            v: 2, ts: Date.now(),
            denhanStatus: DATA.denhanStatus,
            laidongStatus: DATA.laidongStatus,
          }));
        } catch (_) {}
      }
    }
  }
}

async function saveData(silent = false) {
  /* P10 (T5): đang nhập theo đợt (Trung tâm nhập) ⇒ chỉ ghi nhận "cần lưu", lưu MỘT lần khi đợt kết thúc. Dữ liệu dư nợ mỗi tệp bị tệp sau thay thế
     nên chỉ trạng thái cuối cần lưu; trong lúc đó hasUnsaved vẫn bật ⇒ đóng tab giữa chừng vẫn ghi bản dự phòng (beforeunload). */
  if (window.__TD_SAVE_DEFER > 0) { window.__TD_SAVE_PENDING = true; return true; }
  clearTimeout(autoSaveTimer); // lưu ngay bây giờ ⇒ bỏ lần lưu tự động đang hẹn (trước đây chạy thêm 1 lần lưu đầy đủ 8 s sau mỗi lần nhập)
  // HM-04: một giao dịch cho meta + mảng lớn; khoá đang bị đánh dấu hỏng thì không ghi đè
  const _blocked = window.__storageCorrupt ? Object.keys(window.__storageCorrupt) : [];
  try { const a0 = { qltd: DATA.qltd, hdv: DATA.hdv || [], macb: DATA.macb || [], list: DATA.list || [] }; _blocked.forEach(k => { delete a0[k]; }); await _lzPrefetch(_saveStrings(a0)); } catch (e) {} // P10 (T3)
  saveToLS();
  const _arrays = { qltd: DATA.qltd, hdv: DATA.hdv || [], macb: DATA.macb || [], list: DATA.list || [] };
  _blocked.forEach(k => { delete _arrays[k]; });
  let ok = false;
  try { ok = await idbSaveAll(getPayload(), _arrays); }
  catch (e) {
    console.error('[HM-04] Lưu IndexedDB thất bại:', e);
    try { showToast('⚠ Không lưu được vào IndexedDB — hãy xuất sao lưu ngay (Tiện ích → Backup).', 'red'); } catch (_) {}
  }
  if (_blocked.length) window.showStorageCorruptBanner();
  hasUnsaved = false;
  const ts = $('save-ts');
  if (ts) {
    const d = new Date();
    ts.textContent = `✅ Lưu ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    ts.className = 'save-status saved';
  }
  if (!silent) showToast('💾 Đã lưu dữ liệu ' + (ok ? '(IndexedDB nén + LocalStorage)' : '(LocalStorage nén)'), 'green');
  return ok;
}

function markUnsaved() {
  hasUnsaved = true;
  const ts = $('save-ts');
  if (ts) { ts.textContent = '⏳ Chưa lưu'; ts.className = 'save-status unsaved'; }
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => { const run = () => saveData(true); if (window.requestIdleCallback) requestIdleCallback(run, {timeout: 2000}); else run(); }, 8000); /* PATCH 2026-06-10: idle */
}

function applyPayload(p) {
  if (!p) return false;
  // Arrays — có thể đã giải nén hoặc là raw array
  function arr(field, lz_field) {
    if (Array.isArray(p[field]) && p[field].length) return p[field];
    if (p[lz_field]) {
      try { const a = JSON.parse(LZS.decompressFromBase64(p[lz_field])); if (Array.isArray(a)) return a; } catch {}
    }
    return null;
  }
  const qltd = arr('qltd', 'qltd_lz');
  const hdv  = arr('hdv',  'hdv_lz');
  const macb = arr('macb', 'macb_lz');
  const list = arr('list', 'list_lz');
  if (qltd) DATA.qltd = qltd;
  if (hdv)  DATA.hdv  = hdv;
  if (macb) DATA.macb = macb;
  if (list) DATA.list = list;
  if (p.hosovay && typeof p.hosovay === 'object') DATA.hosovay = p.hosovay;  // P0-1 FIX
  if (p.denhanStatus  && typeof p.denhanStatus  === 'object') DATA.denhanStatus  = p.denhanStatus;
  if (p.laidongStatus && typeof p.laidongStatus === 'object') DATA.laidongStatus = p.laidongStatus;
  if (Array.isArray(p.phidvExtra)) DATA.phidvExtra = p.phidvExtra;  // ✅ PRO-31
  if (p.phidvStatus && typeof p.phidvStatus === 'object') DATA.phidvStatus = p.phidvStatus; // ✅ PRO-32
  if (p.chlmStatus && typeof p.chlmStatus === 'object') DATA.chlmStatus = p.chlmStatus;       // ✅ CHLM
  if (p.hdvSnapshots && typeof p.hdvSnapshots === 'object') DATA.hdvSnapshots = p.hdvSnapshots; // ✅ HDV PRO
  if (p.hdvCurrentPeriod) DATA.hdvCurrentPeriod = p.hdvCurrentPeriod; // ✅ HDV PRO
  if (p.khmoiExclude && typeof p.khmoiExclude === 'object') DATA.khmoiExclude = Object.assign({ camco:{}, newcust:{} }, p.khmoiExclude); // ✅ KHMOI
  return true;
}

async function loadData() {
  // 1. Thử IndexedDB chunked (ưu tiên — dung lượng lớn nhất)
  let [idbMeta, qltdArr, hdvArr, macbArr, listArr] = await Promise.all([
    idbGet(),
    idbGetChunked('qltd'),
    idbGetChunked('hdv'),
    idbGetChunked('macb'),
    idbGetChunked('list'),
  ]);
  // HM-04: meta (hosovay, chlmStatus, hdvSnapshots…) luôn được khôi phục, kể cả khi mảng lớn trống
  if (idbMeta) {
    if (idbMeta.denhanStatus && typeof idbMeta.denhanStatus === 'object') DATA.denhanStatus = idbMeta.denhanStatus;
    if (idbMeta.laidongStatus && typeof idbMeta.laidongStatus === 'object') DATA.laidongStatus = idbMeta.laidongStatus;
    if (Array.isArray(idbMeta.phidvExtra)) DATA.phidvExtra = idbMeta.phidvExtra;
    if (idbMeta.phidvStatus && typeof idbMeta.phidvStatus === 'object') DATA.phidvStatus = idbMeta.phidvStatus;
    if (idbMeta.chlmStatus && typeof idbMeta.chlmStatus === 'object') DATA.chlmStatus = idbMeta.chlmStatus;
    if (idbMeta.hdvSnapshots && typeof idbMeta.hdvSnapshots === 'object') DATA.hdvSnapshots = idbMeta.hdvSnapshots;
    if (idbMeta.hdvCurrentPeriod) DATA.hdvCurrentPeriod = idbMeta.hdvCurrentPeriod;
    if (idbMeta.hosovay && typeof idbMeta.hosovay === 'object') DATA.hosovay = idbMeta.hosovay;
    if (idbMeta.khmoiExclude && typeof idbMeta.khmoiExclude === 'object') DATA.khmoiExclude = Object.assign({ camco:{}, newcust:{} }, idbMeta.khmoiExclude);
  }
  // HM-04: chunk IndexedDB hỏng -> thử phục hồi từ bản LocalStorage (cùng lần lưu)
  if (window.__storageCorrupt && Object.keys(window.__storageCorrupt).length) {
    try {
      const rawLS = localStorage.getItem(LS_KEY);
      if (rawLS) {
        const pLS = JSON.parse(rawLS);
        const fromLS = (k) => { try { if (Array.isArray(pLS[k]) && pLS[k].length) return pLS[k]; if (pLS[k + '_lz']) { const a = JSON.parse(LZS.decompressFromBase64(pLS[k + '_lz'])); if (Array.isArray(a) && a.length) return a; } } catch (_) {} return null; };
        const rec = [];
        Object.keys(window.__storageCorrupt).slice().forEach(k => {
          const a = fromLS(k);
          if (!a) return;
          if (k === 'qltd') qltdArr = a; else if (k === 'hdv') hdvArr = a; else if (k === 'macb') macbArr = a; else if (k === 'list') listArr = a;
          delete window.__storageCorrupt[k]; rec.push(k);
        });
        if (rec.length) {
          console.warn('[HM-04] Đã phục hồi từ LocalStorage:', rec.join(', '));
          setTimeout(function () { try { showToast('🩹 Dữ liệu IndexedDB bị hỏng đã được phục hồi từ bản dự phòng: ' + rec.join(', '), 'gold'); } catch (_) {} }, 1500);
          setTimeout(function () { try { saveData(true); } catch (_) {} }, 3000); // ghi lại bản sạch vào IndexedDB
        }
      }
    } catch (e) { console.warn('[HM-04] Không đọc được bản dự phòng LocalStorage', e); }
    if (!Object.keys(window.__storageCorrupt).length) window.__storageCorrupt = null;
    else setTimeout(window.showStorageCorruptBanner, 1200);
  }
  if (qltdArr && qltdArr.length) {
    DATA.qltd = qltdArr;
    /* PATCH 2026-06-14: removed migrate setTimeout — không tự đụng L/S% */
    if (hdvArr  && hdvArr.length)  DATA.hdv  = hdvArr;
    if (macbArr && macbArr.length) DATA.macb = macbArr;
    if (listArr && listArr.length) DATA.list = listArr;
    if (idbMeta) {
      if (idbMeta.denhanStatus)  DATA.denhanStatus  = idbMeta.denhanStatus;
      if (idbMeta.laidongStatus) DATA.laidongStatus = idbMeta.laidongStatus;
      if (Array.isArray(idbMeta.phidvExtra)) DATA.phidvExtra = idbMeta.phidvExtra;
      if (idbMeta.phidvStatus && typeof idbMeta.phidvStatus === 'object') DATA.phidvStatus = idbMeta.phidvStatus;
      if (idbMeta.khmoiExclude && typeof idbMeta.khmoiExclude === 'object') DATA.khmoiExclude = Object.assign({ camco:{}, newcust:{} }, idbMeta.khmoiExclude); // ✅ KHMOI
    }
    return 'idb';
  }
  // 2. Fallback: meta trong IDB snapshots (có thể có qltd nhúng từ v1)
  if (idbMeta && Array.isArray(idbMeta.qltd) && idbMeta.qltd.length) {
    applyPayload(idbMeta);
    /* PATCH 2026-06-14: removed migrate setTimeout — không tự đụng L/S% */
    return 'idb-legacy';
  }
  // 3. Fallback: localStorage (nén hoặc cũ)
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      applyPayload(JSON.parse(raw));
      /* PATCH 2026-06-14: removed migrate setTimeout — không tự đụng L/S% */
      return 'ls';
    }
  } catch (e) {}
  return null;
}


/* ═══ PATCH 2026-06-14: RATE HELPERS — đồng bộ với v56 CHUẨN, KHÔNG /100 ═══ */
window.__TD_RATE_VALID_MAX = 50;
window.__TD_RATE_VALID_MIN = -50;
// Chỉ parse, KHÔNG chia 100 — tin tưởng tuyệt đối giá trị đã đọc từ sprd
window.normalizeRateValue = function(v){
  if (v === '' || v == null) return '';
  const s = String(v).replace(/%\s*$/, '').replace(/,/g,'.').trim();
  if (s === '') return '';
  const n = parseFloat(s);
  if (!isFinite(n)) return '';
  if (n === 0) return 0;
  return Math.round(n * 10000) / 10000;
};
window.formatRateDisplay = function(v){
  if (window.HSVRate && window.HSVRate.format) return window.HSVRate.format(v);
  const n = window.normalizeRateValue(v);
  if (n === '' || typeof n !== 'number' || !isFinite(n)) return '';
  return n.toFixed(1) + '%';
};
window.formatRateValue = function(v){
  const n = window.normalizeRateValue(v);
  if (n === '') return '';
  return (typeof n === 'number') ? n.toFixed(1) : String(n);
};

/* ═══ PATCH 2026-06-17 v13.8.8: HSVRate SSOT — SPRD-only, không cộng INTRT ═══ */
window.HSVRate = {
  toNum: function(v) {
    if (v === '' || v == null) return NaN;
    var s = String(v).replace(/%\s*$/, '').replace(/,/g, '.').trim();
    if (s === '') return NaN;
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  },
  coercePercent: function(v) {
    var n = this.toNum(v);
    if (!isFinite(n)) return '';
    if (n === 0) return 0;
    var sign = n < 0 ? -1 : 1;
    n = Math.abs(n);
    // Excel percent cells may arrive as 0.085; old broken migrate stored 19 as 1900/190.
    if (n > 0 && n < 1) n = n * 100;
    var guard = 0;
    while (n > 100 && guard++ < 4) n = n / 100;
    if (n > 30 && n <= 100 && n / 10 >= 3 && n / 10 <= 30) n = n / 10;
    return Math.round(sign * n * 10000) / 10000;
  },
  compose: function(intrt, sprd) {
    /* v13.8.8 ROOT FIX: compose() được giữ để tương thích call-site cũ,
       nhưng KHÔNG BAO GIỜ cộng INTRT+SPRD cho IPCAS msit80.
       SPRD là lãi suất thật; INTRT/pnintrt chỉ là tham chiếu. */
    var i = this.coercePercent(intrt);
    var s = this.coercePercent(sprd);
    var hasI = (i !== '' && isFinite(i));
    var hasS = (s !== '' && isFinite(s));
    if (hasS && s >= 0 && s <= 30) return Math.round(s * 100) / 100;
    if (hasS) return Math.round(s * 100) / 100;
    if (hasI && i >= 0 && i <= 30) return Math.round(i * 100) / 100;
    if (hasI) return Math.round(i * 100) / 100;
    return '';
  },
  parseSprd: function(raw) {
    return this.coercePercent(raw);
  },
  normalize: function(v) {
    return this.coercePercent(v);
  },
  format: function(v, r) {
    var n = this.normalize(v);
    if (n === '' || !isFinite(n)) return '<span style="color:var(--red,#b91c1c)" title="L/S chưa sẵn sàng">—</span>';
    var s = n.toFixed(1) + '%';
    if (r && typeof r[8] === 'string' && r[8] !== n && isFinite(this.toNum(r[8]))) r[8] = n; // HM-03: chỉ chuẩn hoá chuỗi → số
    if (r && r._rateStale) s += ' <span style="color:orange;font-size:10px" title="L/S% cũ — cần re-import IPCAS">⚠</span>';
    return s;
  },
  isPlausible: function(v) {
    var n = this.normalize(v);
    return n !== '' && isFinite(n) && n >= 0 && n <= 30;
  },
  fingerprint: function(row, raw, type) {
    if (!row) return;
    if (type === 'intrt') row._intrtRaw = raw;
    if (type === 'sprd') row._sprdRaw = raw;
    if (type === 'intrt+sprd') { row._intrtRaw = raw[0]; row._sprdRaw = raw[1]; }
  },
  healOnLoad: function(dryRun) {
    // ✅ FIX v13.8.8: reload localStorage luôn ưu tiên SPRD-only; loại bỏ mọi nhánh cộng INTRT+SPRD.
    var healed = 0, cleared = 0, stale = 0;
    var rows = (window.DATA && window.DATA.qltd) || DATA.qltd || [];
    rows.forEach(function(r) {
      if (!r) return;
      if (r._rateManual === true) return;
      var v = '';
      if (window.__getSprdTarget) v = window.__getSprdTarget(r, { allowVerified: true });
      if (v === '' && r._sprdRaw !== undefined) v = window.HSVRate.parseSprd(r._sprdRaw);
      if (v === '') v = window.HSVRate.normalize(r[8]);
      if (v !== '' && isFinite(v) && Math.abs((parseFloat(r[8]) || 0) - Number(v)) > 0.001 && window.__rateMayOverwrite(r, false)) {
        if (!dryRun) { r[8] = Math.round(Number(v) * 100) / 100; if (window.__clearRateLegacyFlags) window.__clearRateLegacyFlags(r); }
        healed++;
      } else if (v === '' && r._sprdRaw !== undefined) { r._rateStale = true; stale++; }
    });
    return { healed: healed, cleared: cleared, stale: stale };
  }
};

/* ═══ PATCH v13.8.6 (2026-06-17): __healSprdFromFingerprint ═══
   Một-lần dọn dữ liệu cũ đã bị compose() đè 19% — không cần re-import IPCAS
   nếu fingerprint _sprdRaw vẫn còn trong localStorage.                       */
window.__healSprdFromFingerprint = function(force){
  try {
    if (!window.DATA || !Array.isArray(DATA.qltd)) return 0;
    var healed = 0, scanned = 0, fromRaw = 0, fromVerified = 0, manual = 0;
    DATA.qltd.forEach(function(r){
      if (!r) return;
      var target = window.__getSprdTarget ? window.__getSprdTarget(r, { allowVerified: true }) : '';
      if (target === '' && r._sprdRaw !== undefined && window.HSVRate) target = window.HSVRate.parseSprd(r._sprdRaw);
      if (target === '' || !isFinite(target)) return;
      if (r._sprdRaw !== undefined && r._sprdRaw !== '' && r._sprdRaw !== null) fromRaw++; else fromVerified++;
      scanned++;
      var cur = parseFloat(String(r[8]).replace(/,/g,'.'));
      var composed = (window.HSVRate && r._intrtRaw !== undefined && r._sprdRaw !== undefined) ? (window.HSVRate.coercePercent(r._intrtRaw) + window.HSVRate.coercePercent(r._sprdRaw)) : NaN;
      var looksComposed = isFinite(composed) && Math.abs(cur - composed) <= 0.001 && Math.abs(cur - target) > 0.001;
      // force=true ghi đè cả _rateManual; auto cũng sửa nếu nhận diện đúng lỗi cộng INTRT+SPRD.
      if (!force && r._rateManual === true && !looksComposed) { manual++; return; }
      if (force !== true && !looksComposed && !window.__rateMayOverwrite(r, false)) return; // HM-03
      if (!isFinite(cur) || Math.abs(cur - target) > 0.001) {
        r[8] = Math.round(Number(target) * 100) / 100;
        if (force || looksComposed) delete r._rateManual;
        if (window.__clearRateLegacyFlags) window.__clearRateLegacyFlags(r);
        healed++;
      }
    });
    if (healed) {
      try { if (typeof saveData === 'function') saveData(true); } catch(_e){}
      try { if (typeof renderTable === 'function') ['qltd','kd','td','denhan','laidong'].forEach(function(k){ try{ renderTable(k); }catch(e){} }); } catch(_e){}
      try { if (typeof showToast === 'function') showToast('🩹 Đã khôi phục ' + healed + '/' + scanned + ' dòng L/S từ SPRD gốc.', 'green'); } catch(_e){}
      console.info('[SPRD-HEAL v13.8.8] khôi phục ' + healed + '/' + scanned + ' dòng L/S từ SPRD.', { fromRaw: fromRaw, fromVerified: fromVerified, manualSkipped: manual });
    } else if (force) {
      try { if (typeof showToast === 'function') showToast('✓ Mọi dòng đã khớp SPRD gốc (' + scanned + ' dòng kiểm tra).', 'green'); } catch(_e){}
    }
    return healed;
  } catch(e){ console.warn('__healSprdFromFingerprint', e); return 0; }
};
// Auto-run mỗi lần boot — idempotent, chỉ ghi khi r[8] khác parseSprd(_sprdRaw).
(function(){
  var tries = 0;
  var t = setInterval(function(){
    tries++;
    if (window.DATA && Array.isArray(DATA.qltd) && DATA.qltd.length) {
      clearInterval(t);
      setTimeout(function(){ try { window.__healSprdFromFingerprint(false); } catch(e){} }, 400);
    } else if (tries > 40) clearInterval(t);
  }, 300);
})();


window.__normalizeAllRates = function(reason, silent) {
  try {
    var res = (window.HSVRate && window.HSVRate.healOnLoad) ? window.HSVRate.healOnLoad(false) : { healed: 0 };
    if (res.healed > 0) {
      console.info('[RATE-NORMALIZE v13.8.4] ' + reason + ': đã sửa ' + res.healed + ' dòng L/S sai đơn vị.');
      try { if (typeof saveData === 'function') saveData(true); } catch(_e){}
      if (!silent) try { if (typeof showToast === 'function') showToast('✅ Đã tự sửa ' + res.healed + ' dòng L/S sai đơn vị (1900%→19%).', 'green'); } catch(_e){}
    }
    return res.healed || 0;
  } catch(e){ console.warn('__normalizeAllRates', e); return 0; }
};

// No-op: không đụng vào r[8] sau import (giữ tên hàm cho call-site cũ)
window.sanitizeAllRates = function(){ return 0; };

/* ═══ PATCH v13.8.0 (2026-06-15): Verified IPCAS SPRD map — sửa tận gốc L/S=0% cũ ═══
   Nguồn xác minh: 04.06.2026.xlsx (msit80) — cột dsbsseq + sprd.
   Chỉ dùng để khôi phục dữ liệu cũ bị bản migrate trước ghi đè về 0/trống;
   các lần import mới vẫn lấy trực tiếp từ cột sprd qua transformIPCAS(). */
window.__IPCAS_RATE_SOURCE = '';
window.__IPCAS_SPRD_PIPE = ''; // HM-03: đã gỡ bảng lãi suất cứng 04/06/2026 — lãi suất chỉ lấy từ tệp IPCAS đang nhập
window.__getVerifiedSprdMap = function(){
  if (window.__IPCAS_SPRD_BY_DSBSSEQ) return window.__IPCAS_SPRD_BY_DSBSSEQ;
  var m = Object.create(null);
  try {
    String(window.__IPCAS_SPRD_PIPE || '').split('|').forEach(function(pair){
      if (!pair) return;
      var p = pair.split(':');
      if (p.length !== 2) return;
      var v = parseFloat(p[1]);
      if (p[0] && isFinite(v)) m[p[0]] = Math.round(v * 100) / 100;
    });
  } catch(e) { console.warn('[REPAIR-LS] Không đọc được verified SPRD map', e); }
  window.__IPCAS_SPRD_BY_DSBSSEQ = m;
  return m;
};
window.__clearRateLegacyFlags = function(r){
  if (!r) return;
  delete r._rateOverflowFixed;
  delete r._rateOverflowCleared;
  delete r._derivedFromIntAmt;
  delete r._rateAutoHealed;
  delete r._rateStale;
};
/* HM-03: cổng ghi đè L/S. Sửa tự động chỉ được thay giá trị không hợp lệ (trống, <1, >30);
   giá trị trông hợp lệ chỉ bị ghi đè khi người dùng chủ động (force===true) hoặc khi nhập tệp IPCAS mới. */
window.__rateMayOverwrite = function(r, force){
  if (force === true) return true;
  if (!r) return false;
  var cur = window.HSVRate ? window.HSVRate.toNum(r[8]) : parseFloat(String(r[8]).replace(/,/g, '.'));
  return !isFinite(cur) || cur < 1 || cur > 30;
};
window.__getSprdTarget = function(r, opts){
  opts = opts || {};
  if (!r) return '';
  var v = '';
  if (r._sprdRaw !== undefined && r._sprdRaw !== '' && r._sprdRaw !== null && window.HSVRate) {
    v = window.HSVRate.parseSprd(r._sprdRaw);
  }
  if ((v === '' || !isFinite(v)) && opts.allowVerified) {
    var map = (typeof window.__getVerifiedSprdMap === 'function') ? window.__getVerifiedSprdMap() : {};
    var dsbsseq = String(r[20] || '').trim();
    if (dsbsseq && map && map[dsbsseq] !== undefined) v = map[dsbsseq];
  }
  return (v !== '' && isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 30) ? Math.round(Number(v) * 100) / 100 : '';
};

/* ═══ PATCH v13.7.9 (2026-06-15): repairSprdRatesOnLoad ═══
   Phát hiện dữ liệu lãi suất cũ bị ghi đè 0 (do migrate cũ deriveRateFromIntAmt
   chạy khi DATA chưa load xong). Không tự bịa giá trị — chỉ đánh dấu _rateStale
   và hiện banner nhắc user re-import IPCAS để khôi phục L/S từ cột `sprd`. */
window.repairSprdRatesOnLoad = function(force){
  try {
    if (!window.DATA || !Array.isArray(DATA.qltd) || !DATA.qltd.length) return { repaired:0, stale:0 };
    var map = (typeof window.__getVerifiedSprdMap === 'function') ? window.__getVerifiedSprdMap() : {};
    var repaired = 0, stale = 0, fromRaw = 0, fromVerified = 0;
    DATA.qltd.forEach(function(r){
      if (!r) return;
      var cur = window.HSVRate ? window.HSVRate.toNum(r[8]) : parseFloat(String(r[8]).replace(/,/g,'.'));
      var zeroOrBad = !isFinite(cur) || Math.abs(cur) < 0.0001 || cur < 0 || cur > 30;
      var suspectFlag = !!(r._rateStale || r._rateAutoHealed || r._derivedFromIntAmt || r._rateOverflowFixed || r._rateOverflowCleared);
      var fixed = window.__getSprdTarget ? window.__getSprdTarget(r, { allowVerified: true }) : '';
      if (fixed !== '') {
        if (r._sprdRaw !== undefined && r._sprdRaw !== '' && r._sprdRaw !== null) fromRaw++; else fromVerified++;
      }
      if (fixed !== '' && isFinite(Number(fixed)) && Number(fixed) > 0 && Number(fixed) <= 30) {
        var composed = (window.HSVRate && r._intrtRaw !== undefined && r._sprdRaw !== undefined) ? (window.HSVRate.coercePercent(r._intrtRaw) + window.HSVRate.coercePercent(r._sprdRaw)) : NaN;
        var looksComposed = isFinite(composed) && Math.abs(cur - composed) <= 0.001 && Math.abs(cur - fixed) > 0.001;
        if (force === true || looksComposed || window.__rateMayOverwrite(r, false)) { // HM-03
          r[8] = Math.round(Number(fixed) * 100) / 100;
          if (looksComposed) delete r._rateManual;
          if (window.__clearRateLegacyFlags) window.__clearRateLegacyFlags(r);
          if (r._sprdRaw === undefined) r._sprdRaw = r[8];
          if (r._intrtRaw === undefined) r._intrtRaw = '';
          repaired++;
        }
      } else if ((zeroOrBad || suspectFlag) && (Number(r[11]) || 0) > 0) {
        r._rateStale = true;
        stale++;
      }
    });
    if (repaired > 0) {
      console.warn('[REPAIR-LS] Đã khôi phục ' + repaired + ' dòng L/S từ SPRD nguồn (' + fromRaw + ' raw, ' + fromVerified + ' verified ' + (window.__IPCAS_RATE_SOURCE || '') + ').');
      try { if (typeof saveData === 'function') saveData(true); } catch(_){ }
      try { if (typeof showToast === 'function') showToast('✅ Đã tự khôi phục ' + repaired + ' dòng L/S từ cột sprd IPCAS', 'green'); } catch(_){ }
      try { if (typeof renderTable === 'function') ['qltd','kd','td','denhan','laidong'].forEach(function(k){ try { renderTable(k); } catch(__){} }); } catch(_){ }
    }
    if (stale > 0) {
      console.warn('[REPAIR-LS] Còn ' + stale + ' dòng L/S không có nguồn SPRD để khôi phục.');
      try { window.__lsStaleCount = stale; showRepairRateBanner(stale); } catch(_){}
    } else {
      try { var b = document.getElementById('repair-ls-banner'); if (b) b.remove(); } catch(_){ }
    }
    return { repaired:repaired, stale:stale };
  } catch(e){ console.error('repairSprdRatesOnLoad', e); return { repaired:0, stale:0 }; }
};

window.showRepairRateBanner = function(n){
  if (document.getElementById('repair-ls-banner')) return;
  var div = document.createElement('div');
  div.id = 'repair-ls-banner';
  div.style.cssText = 'position:sticky;top:0;z-index:calc(var(--z-5,9900) + 6);background:linear-gradient(90deg,#fef3c7,#fde68a);border-bottom:2px solid #f59e0b;color:#78350f;padding:10px 16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.08)';
  div.innerHTML = '⚠ Còn <b>' + n + '</b> dòng L/S = 0% chưa có mã giải ngân trong nguồn xác minh. Nhập lại file IPCAS msit80 để khôi phục nốt từ cột <code>sprd</code>. '
    + '<button onclick="try{openImportModal()}catch(e){}" style="background:#c75e10;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer">📂 Nhập IPCAS ngay</button>'
    + '<button onclick="this.parentNode.remove()" style="background:transparent;border:none;color:#78350f;font-size:18px;cursor:pointer;margin-left:6px" title="Đóng">×</button>';
  (document.body || document.documentElement).insertBefore(div, document.body ? document.body.firstChild : null);
};
// One-shot: xoá mọi cờ migrate cũ để các migrate cũ không tự chạy lại
try {
  ['td_rate_migrated_v1','td_rate_migrated_v2','td_rate_migrated_v3',
   'td_rate_migrated_v2_safe','td_rate_migrated_v3_safe']
    .forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
} catch(e){}
/* ═══ PATCH 2026-06-14c: AUTO-REPAIR L/S bị phóng đại ×100 — chạy đúng SAU loadData
   Triệu chứng: r[8] = 1900 (đúng 19%), 850 (đúng 8.5%), 750 (đúng 7.5%)…
   Bản b trước có thể đặt cờ khi DATA.qltd còn rỗng, nên dữ liệu thật chưa được sửa.
   Bản c idempotent: luôn quét dữ liệu đã load, chỉ chia khi |L/S| > 100, không đụng 18–30%. ═══ */
window.__autoFixRateX100 = function(force){
  try{
    if (!Array.isArray(DATA.qltd) || DATA.qltd.length === 0) return 0;
    let n = 0;
    DATA.qltd.forEach(r => {
      if (!r) return;
      let v = parseFloat(String(r[8]).replace(/%\s*$/, '').replace(/,/g,'.'));
      if (!isFinite(v) || v === 0) return;
      let target = window.__getSprdTarget ? window.__getSprdTarget(r, { allowVerified: true }) : '';
      if (target !== '' && isFinite(target) && Math.abs(v - target) > 0.001) {
        let composed = (window.HSVRate && r._intrtRaw !== undefined && r._sprdRaw !== undefined)
          ? (window.HSVRate.coercePercent(r._intrtRaw) + window.HSVRate.coercePercent(r._sprdRaw)) : NaN;
        let looksComposed = isFinite(composed) && Math.abs(v - composed) <= 0.001;
        if (r._rateManual === true && !looksComposed) return;
        if (force !== true && !looksComposed && !window.__rateMayOverwrite(r, false)) return; // HM-03
        r[8] = Math.round(Number(target) * 100) / 100;
        if (looksComposed) delete r._rateManual;
        if (window.__clearRateLegacyFlags) window.__clearRateLegacyFlags(r);
        n++;
        return;
      }
      let changed = false, guard = 0;
      while (Math.abs(v) > 100 && guard++ < 3) { v = v / 100; changed = true; }
      if (changed) {
        r[8] = parseFloat(v.toFixed(4));
        n++;
      }
    });
    if (n) {
      try { localStorage.setItem('td_rate_autofix_x100_v2', '1'); } catch(e){}
      console.info('[AUTO-FIX v2] Sửa ' + n + ' dòng L/S bị phóng đại ×100 (vd 1900%→19%).');
      if (typeof saveData === 'function') saveData(true);
    }
    return n;
  } catch(e){ console.warn('autoFixRateX100', e); return 0; }
};
/* ═══ PATCH 2026-06-17 v13.8.8: AUTO-HEAL constant-rate corruption — SPRD-only ═══
   Không còn xoá trắng L/S đồng loạt. Nếu phát hiện dữ liệu cũ bị đè 19%,
   luôn khôi phục trực tiếp từ _sprdRaw hoặc verified dsbsseq→sprd map. */
window.__autoHealConstantRate = function(force){
  try {
    return (window.__healSprdFromFingerprint ? window.__healSprdFromFingerprint(!!force) : 0) || 0;
  } catch(e){ console.warn('__autoHealConstantRate', e); return 0; }
};

/* ═══ PATCH 2026-06-17 (v13.8.3): Wire-up auto-fix L/S ×100 vào pipeline boot ═══
   Lý do: __autoFixRateX100 + __autoHealConstantRate được định nghĩa nhưng KHÔNG
   được gọi ở đâu → dữ liệu legacy r[8]=1900 (×100 từ migrate cũ) vẫn nguyên
   sau khi loadData, khiến mọi dòng hiển thị 1900.0%. Hook này chạy 1 lần sau
   khi DATA.qltd có dữ liệu, tự chia 100 (idempotent, chỉ khi |v|>100).        */
(function wireRateAutoFixOnBoot(){
  var done = false;
  function runOnce(){
    if (done) return true;
    try {
      if (!window.DATA || !Array.isArray(window.DATA.qltd) || !window.DATA.qltd.length) return false;
      done = true;
      var n = (window.__autoFixRateX100 && window.__autoFixRateX100()) || 0;
      try { if (window.__autoHealConstantRate) window.__autoHealConstantRate(); } catch(_){}
      if (n) {
        try {
          if (typeof renderAll === 'function') renderAll();
          else if (typeof renderTable === 'function') ['qltd','kd','td'].forEach(function(k){ try{ renderTable(k); }catch(_){} });
        } catch(_){}
        try { if (typeof showToast === 'function') showToast('✅ Đã tự sửa ' + n + ' dòng L/S bị ×100 (vd 1900%→19%).', 'green'); } catch(_){}
      }
      return true;
    } catch(e){ console.warn('[boot-autofix-rate]', e); return false; }
  }
  if (!runOnce()) {
    var tries = 0;
    var t = setInterval(function(){ if (runOnce() || ++tries > 40) clearInterval(t); }, 250);
  }
  // Backup: chạy lại sau khi DOM ready (đề phòng loadData được gọi muộn)
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(runOnce, 500); });
    window.addEventListener && window.addEventListener('load', function(){ setTimeout(runOnce, 800); });
  }
})();
// Windowed render: số dòng hiển thị ban đầu, sẽ tăng dần khi cuộn / bấm
window.__TD_PAGE_SIZE = 250;
window.__TD_RENDER_LIMIT = {}; // key -> limit
window.__TDExpandRender = function(key){
  window.__TD_RENDER_LIMIT[key] = (window.__TD_RENDER_LIMIT[key] || window.__TD_PAGE_SIZE) + window.__TD_PAGE_SIZE;
  try { renderTable(key); } catch(e){}
};
window.__TDResetRenderLimit = function(key){
  window.__TD_RENDER_LIMIT[key] = window.__TD_PAGE_SIZE;
};
/* HM-17b: phân trang theo trang cho 5 bảng dữ liệu — cơ chế duy nhất (thay nút "Hiển thị thêm" + pager ẩn dòng + virtual-scroll) */
window.__TD_PG_KEYS = ['qltd','kd','td','denhan','laidong'];
window.__TD_PG = {};
window.__TD_PG_SIZES = [50, 100, 250, 500, 0]; // 0 = tất cả
window.__TDPgSize = function(){ var v = 100; try { v = parseInt(localStorage.getItem('td_pg_size_v1'), 10); } catch(e){} return window.__TD_PG_SIZES.indexOf(v) >= 0 ? v : 100; };
window.__TDPgState = function(key, total){
  var st = window.__TD_PG[key] || (window.__TD_PG[key] = { page: 1, size: window.__TDPgSize(), last: -1 });
  if (st.last !== total) { st.page = 1; st.last = total; } // bộ lọc đổi số dòng ⇒ về trang 1
  var pages = st.size > 0 ? Math.max(1, Math.ceil(total / st.size)) : 1;
  st.page = Math.max(1, Math.min(st.page, pages)); st.pages = pages;
  return st;
};
/* P09: thanh trang dùng chung (Dư nợ/…/Phí DV). shown>0 ⇒ ghi "(đang xem n)"; colspan = số cột của bảng */
window.__TDPgBarHtml = function(key, pg, total, shown, colspan){
  var bt = function(t, p, dis){ return '<button type="button" class="td-pg-btn" ' + (dis ? 'disabled' : '') + ' onclick="window.__TDPgGo(\'' + key + '\',' + p + ')" style="padding:3px 10px;border:1px solid #94a3b8;background:' + (dis ? '#f1f5f9' : '#fff') + ';border-radius:6px;cursor:' + (dis ? 'default' : 'pointer') + ';font-weight:600">' + t + '</button>'; };
  var opts = window.__TD_PG_SIZES.map(function(n){ return '<option value="' + n + '" ' + (n === pg.size ? 'selected' : '') + '>' + (n ? n + '/trang' : 'Tất cả (' + fmtNum(total) + (total > 1000 ? ', chậm' : '') + ')') + '</option>'; }).join('');
  return '<tr class="row-more td-pg-bar" data-key="' + key + '"><td colspan="' + colspan + '" style="text-align:center;padding:8px;background:#f8fafc;border-top:1px solid #cbd5e1">' +
    bt('«', 1, pg.page <= 1) + ' ' + bt('‹', pg.page - 1, pg.page <= 1) +
    '<span class="td-pg-info" style="margin:0 8px;font-weight:600">Trang ' + pg.page + '/' + pg.pages + ' · ' + fmtNum(total) + ' dòng' + (shown ? ' (đang xem ' + fmtNum(shown) + ')' : '') + '</span>' +
    bt('›', pg.page + 1, pg.page >= pg.pages) + ' ' + bt('»', pg.pages, pg.page >= pg.pages) +
    '<input type="number" class="td-pg-jump" min="1" max="' + pg.pages + '" placeholder="Trang…" style="width:70px;margin-left:8px;padding:3px 6px" onkeydown="if(event.key===\'Enter\'){window.__TDPgGo(\'' + key + '\',this.value)}">' +
    '<select class="td-pg-size" style="margin-left:6px;padding:3px 6px" onchange="window.__TDPgSetSize(\'' + key + '\',this.value)">' + opts + '</select></td></tr>';
};
/* P10 (T1/T2): phân trang cho bảng phụ (Dashboard, Trả nợ) — đổi trang chỉ dựng lại đúng bảng đó (renderTable(key) → __TD_PAGED[key]) */
window.__TD_PAGED = {};
window.__TDPagedTbody = function(key, tbodyId, rows, rowHtml, emptyHtml, colspan){
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var re = window.__TD_PAGED[key] = function(){ window.__TDPagedTbody(key, tbodyId, rows, rowHtml, emptyHtml, colspan); };
  re.tbodyId = tbodyId; re.rows = rows; re.rowHtml = rowHtml;
  if (!rows.length) { tbody.innerHTML = emptyHtml || ''; return; }
  var pg = window.__TDPgState(key, rows.length);
  var start = pg.size > 0 ? (pg.page - 1) * pg.size : 0;
  var vis = pg.size > 0 ? rows.slice(start, start + pg.size) : rows;
  tbody.innerHTML = vis.map(function(r, j){ return rowHtml(r, start + j); }).join('') +
    (rows.length > window.__TD_PG_SIZES[0] ? window.__TDPgBarHtml(key, pg, rows.length, rows.length > vis.length ? vis.length : 0, colspan) : '');
};
/* bản sao bảng có ĐỦ mọi dòng (không thanh trang) — cho xuất Excel đọc DOM */
window.__TDPagedFullClone = function(tableId, key){
  var t = document.getElementById(tableId); if (!t) return null;
  var c = t.cloneNode(true), m = window.__TD_PAGED[key];
  if (m && m.rows.length) { var tb = c.querySelector('#' + m.tbodyId); if (tb) tb.innerHTML = m.rows.map(function(r, i){ return m.rowHtml(r, i); }).join(''); }
  return c;
};
window.__TDPgGo = function(key, p){ var st = window.__TD_PG[key]; if (!st) return; st.page = Math.max(1, Math.min(+p || 1, st.pages || 1)); try { renderTable(key); } catch(e){} };
window.__TDPgSetSize = function(key, v){ v = parseInt(v, 10); try { localStorage.setItem('td_pg_size_v1', String(v)); } catch(e){} Object.keys(window.__TD_PG).forEach(function(k){ window.__TD_PG[k].size = v; window.__TD_PG[k].page = 1; }); try { renderTable(key); } catch(e){} };
window.__TDExpandRender = function(key){ var st = window.__TD_PG[key]; window.__TDPgGo(key, (st ? st.page : 1) + 1); }; // tương thích tên cũ

/* ═══ PATCH 2026-06-14: migrateRateOnce → no-op (gây sai L/S%) ═══ */
function migrateRateOnce(force) { return 0; }
// ✅ FIX 2026-06-13: deriveRateFromIntAmt đã bị vô hiệu hoá — công thức sai gây ra 19%
// L/S% chỉ lấy từ cột sprd khi nhập IPCAS. Không còn cần derive.
window.deriveRateFromIntAmt = function(r){ return null; }; // disabled
window.migrateRateOnceV2    = function(){ return {fixed:0, warn:0, skip:0}; }; // disabled
/* ═══ PATCH 2026-06-10 v3 (SAFE): chỉ xoá lãi > 18% để render hiển thị cảnh báo, không thay bằng số khác ═══ */
window.migrateRateOnceV3 = function(force){ return {fixed:0, cleared:0, skip:0}; /* DISABLED 2026-06-14 */ };
window._migrateRateOnceV3_OLD = function(force){
  try {
    if (!force && localStorage.getItem('td_rate_migrated_v3_safe') === '1') return {fixed:0, cleared:0, skip:0};
    if (!Array.isArray(DATA.qltd)) return {fixed:0, cleared:0, skip:0};
    let fixed = 0, cleared = 0, skip = 0;
    DATA.qltd.forEach(r => {
      if (!r) return;
      if (r._rateManual === true) { skip++; return; }
      const cur = parseFloat(r[8]);
      if (!isFinite(cur) || cur <= 18) return; // PATCH v4: ngưỡng nghi vấn 18% thay vì 30%
      var target = window.__getSprdTarget ? window.__getSprdTarget(r, { allowVerified: true }) : '';
      if (target === '' || !isFinite(target)) return;
      r[8] = Math.round(Number(target) * 100) / 100;
      if (window.__clearRateLegacyFlags) window.__clearRateLegacyFlags(r);
      cleared++;
    });
    localStorage.setItem('td_rate_migrated_v3_safe', '1');
    if (cleared) {
      console.info('[MIGRATE-v3-safe] Khôi phục ' + cleared + ' dòng L/S > 18% từ SPRD gốc.');
      if (typeof saveData === 'function') saveData(true);
    }
    return {fixed, cleared, skip};
  } catch(e){ console.warn('migrateRateOnceV3', e); return {fixed:0, cleared:0, skip:0}; }
};
/* ═══ PATCH v13.8.8: REVERT/ROLLBACK L/S now restores from SPRD, never blanks rates ═══ */
window.revertRateMigration = function(){ return (window._revertRateMigration_OLD ? window._revertRateMigration_OLD() : 0); };
window._revertRateMigration_OLD = function(){
  try {
    if (!Array.isArray(DATA.qltd)) return 0;
    var n = 0;
    DATA.qltd.forEach(function(r){
      if (!r) return;
      var target = window.__getSprdTarget ? window.__getSprdTarget(r, { allowVerified: true }) : '';
      if (target === '' || !isFinite(target)) return;
      var cur = window.HSVRate ? window.HSVRate.normalize(r[8]) : parseFloat(r[8]);
      var composed = (window.HSVRate && r._intrtRaw !== undefined && r._sprdRaw !== undefined)
        ? (window.HSVRate.coercePercent(r._intrtRaw) + window.HSVRate.coercePercent(r._sprdRaw)) : NaN;
      var suspect = r._rateOverflowFixed || r._derivedFromIntAmt || r._rateBulkCleared ||
        r._rateOverflowCleared || r._rateAutoHealed || r._rateStale || !isFinite(cur) ||
        cur > 30 || (isFinite(composed) && Math.abs(cur - composed) <= 0.001 && Math.abs(cur - target) > 0.001);
      if (suspect || Math.abs(cur - target) > 0.001) {
        if (r._rateManual === true && !suspect) return;
        r[8] = Math.round(Number(target) * 100) / 100;
        if (suspect) delete r._rateManual;
        if (window.__clearRateLegacyFlags) window.__clearRateLegacyFlags(r);
        n++;
      }
    });
    ['td_rate_migrated_v1','td_rate_migrated_v2','td_rate_migrated_v3',
     'td_rate_migrated_v2_safe','td_rate_migrated_v3_safe'].forEach(function(k){ try { localStorage.removeItem(k); } catch(_e){} });
    if (n && typeof saveData === 'function') saveData(true);
    if (typeof renderTable === 'function') ['qltd','kd','td','denhan','laidong'].forEach(function(k){ try { renderTable(k); } catch(e){} });
    if (typeof showToast === 'function') showToast('🔄 Đã khôi phục ' + n + ' dòng L/S từ SPRD gốc', n ? 'green' : 'blue');
    console.info('[REVERT-SPRD v13.8.8] Đã khôi phục ' + n + ' dòng L/S từ SPRD.');
    return n;
  } catch(e){ console.warn('revertRateMigration', e); return 0; }
};

/* ═══ PATCH v13.8.5 (2026-06-16): __detectUniformBadRate — auto-dọn rác từ migrate cũ ═══
   Nếu ≥70% dòng có cùng 1 giá trị L/S ≥18% → đó là tồn dư của deriveRateFromIntAmt cũ
   (đã disabled v13.7.x nhưng dữ liệu xấu vẫn còn trong localStorage). Idempotent qua key
   td_uniform_rate_cleaned_v1; bỏ qua dòng _rateManual; người dùng phải re-import IPCAS sau đó. */
window.__detectUniformBadRate = function(force){
  try {
    if (!force && localStorage.getItem('td_uniform_rate_cleaned_v1') === '1') return 0;
    if (!window.DATA || !Array.isArray(DATA.qltd)) return 0;
    var rows = DATA.qltd.filter(function(r){ return r && isFinite(parseFloat(r[8])); });
    if (rows.length < 20) return 0;
    var freq = {};
    rows.forEach(function(r){ var k = parseFloat(r[8]).toFixed(1); freq[k] = (freq[k]||0)+1; });
    var entries = Object.keys(freq).map(function(k){ return [k, freq[k]]; }).sort(function(a,b){ return b[1]-a[1]; });
    if (!entries.length) return 0;
    var topVal = entries[0][0], topCnt = entries[0][1];
    var ratio = topCnt / rows.length;
    if (ratio >= 0.70 && parseFloat(topVal) >= 18) {
      var healed = 0;
      try { if (window.__healSprdFromFingerprint) healed = window.__healSprdFromFingerprint(false) || 0; } catch(_e){}
      try { localStorage.setItem('td_uniform_rate_cleaned_v1', '1'); } catch(_e){}
      if (healed) {
        console.warn('[UNIFORM-RATE-HEAL v13.8.8] healed=' + healed + ' topVal=' + topVal + '% ratio=' + Math.round(ratio*100) + '% total=' + rows.length);
        return healed;
      }
      console.warn('[UNIFORM-RATE-HEAL v13.8.8] Phát hiện L/S đồng loạt ' + topVal + '% nhưng chưa có SPRD raw/map để khôi phục; không xoá dữ liệu.');
      try { if (typeof showToast === 'function') showToast('⚠ ' + Math.round(ratio*100) + '% khoản có cùng L/S ' + topVal + '% — nghi lỗi nhập cũ. Hãy nhập lại tệp IPCAS (.xls/.xlsx) để lấy đúng lãi suất.', 'red'); } catch(_e){}
      return 0;
    }
    console.info('[UNIFORM-RATE-CLEAN v13.8.5] OK — top value ' + topVal + '% chiếm ' + Math.round(ratio*100) + '% (' + topCnt + '/' + rows.length + '), không cần dọn.');
    return 0;
  } catch(e){ console.warn('__detectUniformBadRate', e); return 0; }
};
// chạy sau khi DATA.qltd đã load xong
(function(){
  var tries = 0;
  var t = setInterval(function(){
    tries++;
    if (window.DATA && Array.isArray(DATA.qltd) && DATA.qltd.length >= 20) {
      clearInterval(t);
      setTimeout(function(){ try { window.__detectUniformBadRate(false); } catch(e){} }, 300);
    } else if (tries > 40) {
      clearInterval(t);
    }
  }, 300);
})();
window.TD_recalcRate = function () {
  let n = 0;
  try { if (window.sanitizeAllRates) window.sanitizeAllRates(); } catch(e){}
  try { n += (window.__healSprdFromFingerprint && window.__healSprdFromFingerprint(true)) || 0; } catch(e){}
  try { n += (window.repairSprdRatesOnLoad && (window.repairSprdRatesOnLoad(true).repaired || 0)) || 0; } catch(e){}
  if (typeof renderTable === 'function') ['qltd','kd','td','denhan','laidong'].forEach(k => { try { renderTable(k); } catch(e){} });
  if (typeof showToast === 'function') {
    showToast(n ? ('✅ Đã khôi phục ' + n + ' dòng L/S từ SPRD gốc') : '✓ L/S đã khớp SPRD gốc', n ? 'green' : 'blue');
  }
  return n;
};


/* ═══════════════════════════════════════════════════════════════
   BACKUP / RESTORE
   ═══════════════════════════════════════════════════════════════ */
function _hm04BackupBody(p) {
  return JSON.stringify([p.qltd, p.hdv, p.hdvSnapshots, p.hdvCurrentPeriod, p.macb, p.list, p.denhanStatus, p.laidongStatus, p.chlmStatus, p.hosovay, p.phidvExtra, p.phidvStatus, p.khmoiExclude]);
}
function exportBackup() {
  const p = {
    v: 3, schemaVersion: 3, app: 'QLTD_PRO', ts: Date.now(),
    exportedAt: new Date().toLocaleString('vi-VN'),
    qltd: DATA.qltd,
    hdv:  DATA.hdv  || [],
    hdvSnapshots: DATA.hdvSnapshots || {},      // ✅ HDV PRO
    hdvCurrentPeriod: DATA.hdvCurrentPeriod || '', // ✅ HDV PRO
    macb: DATA.macb || [],
    list: DATA.list || [],
    denhanStatus:  DATA.denhanStatus,
    laidongStatus: DATA.laidongStatus,
    chlmStatus:    DATA.chlmStatus || {},  // ✅ CHLM
    hosovay:       DATA.hosovay || {},          // HM-04: trước đây không được sao lưu
    phidvExtra:    DATA.phidvExtra || [],
    phidvStatus:   DATA.phidvStatus || {},
    khmoiExclude:  DATA.khmoiExclude || { camco:{}, newcust:{} },
  };
  p.counts = { qltd: p.qltd.length, hdv: p.hdv.length, macb: p.macb.length, list: p.list.length };
  p.chk = _hm04Hash(_hm04BackupBody(p));
  const blob = new Blob([JSON.stringify(p)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  a.href = URL.createObjectURL(blob);
  a.download = `qltd_backup_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  const sz = (blob.size / 1024).toFixed(1);
  showToast(`📤 Xuất backup thành công (${sz} KB — ${p.qltd.length} hồ sơ)`, 'green');
}
function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const txt = await f.text();
      const saved = JSON.parse(txt);
      if (!Array.isArray(saved.qltd)) { alert('File không hợp lệ - không tìm thấy DATA.qltd'); return; }
      if (saved.chk && saved.chk !== _hm04Hash(_hm04BackupBody(saved))) {
        if (!confirm('⚠ Tệp sao lưu có checksum KHÔNG khớp (có thể bị sửa hoặc hỏng).\nBạn vẫn muốn khôi phục?')) return;
      }
      if (!confirm(`Khôi phục ${saved.qltd.length} bản ghi từ ${f.name}?\nNgày xuất: ${saved.exportedAt || 'N/A'}\n\n⚠️ Dữ liệu hiện tại sẽ bị thay thế hoàn toàn.`)) return;
      if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04
      applyPayload(saved);
      try { if(window.sanitizeAllRates) window.sanitizeAllRates(); } catch(e){}
      try { if(window.__healSprdFromFingerprint) window.__healSprdFromFingerprint(false); } catch(e){}
      try { if(window.repairSprdRatesOnLoad) window.repairSprdRatesOnLoad(); } catch(e){}
      await saveData(true);
      rebuildAll();
      showToast(`✅ Khôi phục thành công ${DATA.qltd.length} bản ghi!`, 'green');
    } catch (err) {
      alert('Lỗi đọc file: ' + err.message);
    }
  };
  inp.click();
}
async function resetAllData() {
  if (!confirm('⚠️ XÁC NHẬN XÓA TOÀN BỘ DỮ LIỆU?\n\nHành động này sẽ:\n  • Xóa toàn bộ hồ sơ tín dụng\n  • Xóa IndexedDB + LocalStorage\n  • Danh sách IPCAS sẽ trống (nhập lại từ file)\n\nKhông thể hoàn tác. Tiếp tục?')) return;
  await idbClear();
  if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04
  localStorage.removeItem(LS_KEY);
  DATA.qltd = JSON.parse(JSON.stringify(SAMPLE_QLTD));
  if (typeof applyTKSTTMapping === 'function') applyTKSTTMapping();
  if (typeof injectTKSTTPlaceholders === 'function') injectTKSTTPlaceholders();
  DATA.denhanStatus = {};
  DATA.laidongStatus = {};
  DATA.phidvExtra = [];    // ✅ PRO-31: xóa phí thủ công khi reset
  DATA.phidvStatus = {};   // ✅ PRO-32: xóa trạng thái báo phí khi reset
  DATA.khmoiExclude = { camco:{}, newcust:{} }; // ✅ KHMOI: reset loại trừ thủ công
  hasUnsaved = false;
  rebuildAll();
  showToast('🔄 Đã xóa toàn bộ dữ liệu. Nhập file IPCAS để bắt đầu.', 'gold');
}

/* ═══════════════════════════════════════════════════════════════
   HARDCORE RESET — Xóa TOÀN BỘ để nhập IPCAS sạch
   ═══════════════════════════════════════════════════════════════ */
async function hardcoreReset() {
  const ans = prompt(
    '☢️ XÓA CỨNG — CẢNH BÁO!\n\n' +
    'Hành động này sẽ XÓA SẠCH HOÀN TOÀN:\n' +
    '  • QUẢN LÝ TÍN DỤNG (toàn bộ hồ sơ)\n' +
    '  • NGẮN HẠN / TRUNG HẠN\n' +
    '  • LỊCH TRẢ NỢ / LÃI ĐỌNG\n' +
    '  • CHUYỂN HẠN MỨC / TRẢ NỢ-XUẤT TSĐB\n' +
    '  • PHÍ GIẢI NGÂN (kể cả phí thủ công)\n' +
    '  • Toàn bộ IndexedDB + tất cả khóa LocalStorage\n\n' +
    'Mục đích: nhập file IPCAS sạch, tránh sai số liệu.\n\n' +
    'Gõ XOA để xác nhận:'
  );
  if ((ans || '').trim().toUpperCase() !== 'XOA') {
    showToast('↩ Đã hủy thao tác xóa cứng.', '');
    return;
  }
  try { await idbClear(); } catch(e) {}
  if (window.__storageClearCorrupt) window.__storageClearCorrupt(); // HM-04
  try {
    await new Promise(resolve => {
      const r = indexedDB.deleteDatabase(IDB_NAME);
      r.onsuccess = r.onerror = r.onblocked = resolve;
    });
  } catch(e) {}
  // Xóa IDB của HSVV
  try {
    const hname = (typeof _IDB_NAME !== 'undefined') ? _IDB_NAME : 'QLTDHoSoDB';
    await new Promise(resolve => {
      const r = indexedDB.deleteDatabase(hname);
      r.onsuccess = r.onerror = r.onblocked = resolve;
    });
  } catch(e) {}
  localStorage.clear();
  DATA.qltd          = [];
  DATA.denhanStatus  = {};
  DATA.laidongStatus = {};
  DATA.chlmStatus    = {};
  DATA.phidvExtra    = [];
  DATA.phidvStatus   = {};
  hasUnsaved = false;
  _idb = null;
  try { rebuildAll(); } catch(e) {}
  showToast('☢️ Đã XÓA CỨNG toàn bộ. Vui lòng nhập file nguồn IPCAS.', 'red');
  setTimeout(() => alert(
    '✅ XÓA CỨNG THÀNH CÔNG!\n\n' +
    '• Tất cả bảng tín dụng đã xóa sạch\n' +
    '• IndexedDB + LocalStorage đã xóa hoàn toàn\n\n' +
    '→ Nhấn "Nhập IPCAS" để tải dữ liệu mới.'
  ), 400);
}

/* ═══════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════ */
function showToast(msg, cls = '') { return TD.toast(msg, cls); } // HM-16c: cùng một hệ toast

/* ═══════════════════════════════════════════════════════════════
   PRO-37: CLICK-TO-COPY for MÃ KH & SỐ TK cells
   ═══════════════════════════════════════════════════════════════ */
function copyCellValue(el, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  const txt = (el.textContent || el.innerText || '').trim();
  if (!txt) return;
  
  // Visual feedback: flash green briefly
  const originalBg = el.style.backgroundColor;
  el.style.transition = 'background-color 0.2s';
  el.style.backgroundColor = '#4caf72';
  el.style.color = '#fff';
  
  const resetStyle = () => {
    el.style.backgroundColor = originalBg;
    el.style.color = '';
  };
  
  // Copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => {
      showToast(`📋 Đã copy: ${txt}`, 'green');
      setTimeout(resetStyle, 400);
    }).catch(err => {
      // Fallback for older browsers
      copyFallback(txt);
      setTimeout(resetStyle, 400);
    });
  } else {
    copyFallback(txt);
    setTimeout(resetStyle, 400);
  }
}

function copyFallback(txt) {
  const ta = document.createElement('textarea');
  ta.value = txt;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`📋 Đã copy: ${txt}`, 'green');
  } catch (e) {
    showToast(`❌ Không thể copy`, 'red');
  }
  document.body.removeChild(ta);
}

/* ═══════════════════════════════════════════════════════════════
   HELPERS — loại vay matching
   ═══════════════════════════════════════════════════════════════ */
/* ── normalizeLntpcd: chuẩn hoá mã lntpcd từ IPCAS → tên đầy đủ tiếng Việt ──
   IPCAS có thể xuất: "S","211","NH","SHORT" → "Vay ngắn hạn (TK 211)"
                       "M","212","TH","MEDIUM" → "Vay trung hạn (TK 212)"
                       "L","213","DH","LONG"   → "Vay dài hạn (TK 213)"
                       "OD","TC","OVERDRAFT"   → "Thấu chi trên TK khách hàng"
   Nếu đã là tên đầy đủ tiếng Việt thì giữ nguyên.
──────────────────────────────────────────────────────────────────────────── */
function normalizeLntpcd(raw) {
  const v = String(raw || '').trim();
  if (!v) return v;
  if (/ngắn\s*hạn|trung\s*hạn|dài\s*hạn|thấu\s*chi/i.test(v)) return v;
  const u = v.toUpperCase().replace(/[\s_\-\.]+/g, '');
  if (/^(S|SNH|SHORT|NH|211|NGANHAN|NGAN)$/.test(u) || /^TK?211/.test(u)) return 'Vay ngắn hạn (TK 211)';
  if (/^(M|STH|MEDIUM|TH|212|TRUNGHAN|TRUNG)$/.test(u) || /^TK?212/.test(u)) return 'Vay trung hạn (TK 212)';
  if (/^(L|SDL|LONG|DH|DAI|213|DAIHAN)$/.test(u)       || /^TK?213/.test(u)) return 'Vay dài hạn (TK 213)';
  if (/^(OD|ODTK|OVERDRAFT|TC|THAUCHI|THAU)$/.test(u))                       return 'Thấu chi trên TK khách hàng';
  if (/^211/.test(u)) return 'Vay ngắn hạn (TK 211)';
  if (/^212/.test(u)) return 'Vay trung hạn (TK 212)';
  if (/^213/.test(u)) return 'Vay dài hạn (TK 213)';
  return v;
}

const isNganHan  = v => /ngắn\s*hạn|tk\s*211|thấu\s*chi/i.test(v || '');
const isTrungHan = v => /trung\s*hạn|dài\s*hạn|tk\s*21[23]/i.test(v || '');
const isThauChi  = v => /thấu\s*chi/i.test(v || '');

/* ═══════════════════════════════════════════════════════════════
   BÁO CÁO (BCKH) — Editable tables mirroring Excel tabs
   ═══════════════════════════════════════════════════════════════ */

// ─── CBTD theo phòng (P10/T6: không nhúng tên — lấy từ TD_SXCB: cấu hình người dùng hoặc tự học từ dữ liệu) ─────────────────
const BCKH_PHONG = {
  hoiso: { label: 'PHÒNG KHÁCH HÀNG', roman: 'I',   color: '#2471a3', get members() { return window.TD_SXCB ? TD_SXCB.members('Hội Sở') : []; } },
  hbt:   { label: 'PGD HBT',          roman: 'II',  color: '#6b21a8', get members() { return window.TD_SXCB ? TD_SXCB.members('PGD Hai Bà Trưng') : []; } },
  s2:    { label: 'PGD Số 2',         roman: 'III', color: '#c9962e', get members() { return window.TD_SXCB ? TD_SXCB.members('PGD Số 2') : []; } }
};
const BCKH_PHONG_KEYS = ['hoiso', 'hbt', 's2'];

          // TH — computed amber
          // CT — editable gold
         // TL% — computed %
 // Δ — computed


/* ═══════════════════════════════════════════════════════════════════════
   🔄 AUTO-FILL ENGINE — Đồng bộ Bảng II–V từ snapshot đã tag
   ───────────────────────────────────────────────────────────────────────
   Mapping CBTD (DATA.qltd[r][12]) → row-id của bảng:
     hoiso_0..N-1 → BCKH_PHONG.hoiso.members[i].name
     hbt_0..N-1   → BCKH_PHONG.hbt.members[i].name
     s2_0..N-1    → BCKH_PHONG.s2.members[i].name
   Đơn vị bảng = "Triệu đồng" → chia 1.000.000 trước khi đổ vào ô.

   Logic phân loại loại vay (cho Bảng IV — chỉ TDH):
     - isNganHan(r[13])  → ngắn hạn + thấu chi (Bảng II)
     - isTrungHan(r[13]) → trung + dài hạn   (Bảng IV)

   Logic phân loại KHDN/KHCN (cho Bảng III) — TẠM THỜI nhận diện theo tên:
     Tên KH chứa: "Công ty", "TNHH", "TNHH MTV", "DNTN", "HTX", "CTCP",
                  "Cty", "Cong ty" → KH Doanh nghiệp
   (Sẽ chỉnh lại khi user xác nhận quy tắc chính xác)
   ═══════════════════════════════════════════════════════════════════════ */

// Build map: tên CBTD chuẩn hoá → rowId trong bảng BCKH
// ── Bí danh tên CBTD (tên IPCAS viết tắt / đổi họ → tên chuẩn): P10 (T6) bỏ bảng tên nhúng cứng; TD_SXCB.match() khớp tự động
//    (viết tắt 1 ký tự, khác họ trùng tên đệm + tên). Giữ hằng rỗng để mã cũ tham chiếu không lỗi.
const BCKH_CBTD_ALIASES = {};

function bckhBuildCBTDMap() {
  const map = {};
  BCKH_PHONG_KEYS.forEach(pk => {
    BCKH_PHONG[pk].members.forEach((m, i) => {
      map[bckhNormName(m.name)] = `${pk}_${i}`;
    });
  });
  // Thêm alias: tên trong IPCAS → cùng rowId với tên chuẩn
  Object.entries(BCKH_CBTD_ALIASES).forEach(([alias, canonical]) => {
    if (map[canonical]) map[alias] = map[canonical];
  });
  // P10 (T6): mọi tên CBTD có trong dữ liệu (hiện hành + mốc) khớp mờ với danh sách ⇒ cùng rowId (thay bảng bí danh nhúng cứng)
  try {
    const seen = {};
    const addName = n => { const k = bckhNormName(n); if (!k || seen[k] || map[k]) return; seen[k] = 1; const m = TD_SXCB.match(n); if (m && map[bckhNormName(m.name)]) map[k] = map[bckhNormName(m.name)]; };
    (DATA.qltd || []).forEach(r => r && r[12] && addName(r[12]));
    (window._archiveReportList || []).forEach(s => (s && s.reportData || []).forEach(r => r && r[12] && addName(r[12])));
  } catch (e) {}
  return map;
}

function bckhNormName(s) {
  return String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/\./g, ' ')          // FIX: tách dấu chấm dính chữ ("h.giang" → "h giang")
    .replace(/\s+/g, ' ').trim();
}

// Phân loại KH Doanh nghiệp theo tên (heuristic, sẽ refine theo phản hồi user)
function bckhIsKHDN(name, ma) {
  // ⚡ FIX PRO-49: phân loại KHDN rộng hơn (Cty., CP, XN, Trang trại, HKD, Trường, UBND, …)
  // + tín hiệu phụ: mã KH (CIF) chứa ký tự chữ cái → coi là KHDN
  // + loại trừ false-positive: token dễ trùng họ/tên người Việt (đoan/hội/sơ/cp/tt/cn/xn)
  //   chỉ tính khi đứng đầu chuỗi đã chuẩn hoá, không tính khi nằm giữa tên.
  const rawName = String(name || '');
  // Chuẩn hoá: lower-case, bỏ dấu, đ→d, đổi [./_-] thành space, gộp khoảng trắng
  const norm = rawName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[._\/\-]+/g, ' ')
    .replace(/&/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!norm) {
    // Không có tên → fallback theo mã KH
    const m = String(ma || '').trim();
    return /[a-z]/i.test(m);
  }

  // Cụm chỉ thị doanh nghiệp xuất hiện ở BẤT KỲ vị trí nào trong tên
  // (đầy đủ, ít rủi ro trùng tên người)
  const strongAnywhere = /(doanh nghiep|co phan|hop tac xa|ho kinh doanh|to hop tac|lien doanh|hop danh|ngan hang tmcp|tong cong ty|tap doan|chi cuc|chi nhanh|trung tam|trang trai|nha may|nong truong|lam truong|nong lam truong|khach san|sieu thi|benh vien|tram y te|cong an huyen|cong an tinh|quy tin dung|quy tdnd|truong mam non|truong tieu hoc|truong thcs|truong thpt|truong cao dang|truong dai hoc|ban quan ly|van phong cong chung|thuong mai dich vu|san xuat|xay dung|thuong mai|dich vu)/;
  if (strongAnywhere.test(norm)) return true;

  // Prefix tổ chức (chỉ match khi đứng ĐẦU chuỗi đã chuẩn hoá → tránh nhầm họ tên người)
  // Lưu ý: dấu chấm đã được đổi thành space, nên "Cty." → "cty", "C.ty" → "c ty"
  const ORG_PREFIX = /^(cty|c ty|cong ty|tnhh|mtv|ctcp|cp|dntn|htx|hkd|tht|xn|xnk|nha may|nong lam truong|nong truong|lam truong|trang trai|trung tam|chi nhanh|quy tdnd|quy tin dung|nh|nh tmcp|nhtmcp|truong (mn|mam non|th|tieu hoc|thcs|trung hoc co so|thpt|trung hoc pho thong|cd|cao dang|dh|dai hoc|trung cap|day nghe|nghe)|mn|thcs|thpt|cd|dh|ubnd|bql|ban ql|benh vien|tram y te|khach san|sieu thi|cong an|lien doanh|hop danh|vpcc|chi cuc|tong cong ty|tap doan|tmdv|tm dv|sxtm|sx tm|xay dung|thuong mai|dich vu|tt|cn)\b/;
  if (ORG_PREFIX.test(norm)) return true;

  // Tín hiệu phụ: mã KH (CIF) chứa ký tự chữ cái → coi là KHDN
  if (ma && /[a-z]/i.test(String(ma))) return true;

  return false;
}

// Aggregate dư nợ + số KH từ 1 dataset (DATA.qltd hoặc snapshot.reportData)
// Trả về { rowId: { dnAll, dnNH, dnTDH, dnDN, khAll, khNH, khTDH, khDN } } theo từng CBTD row
// ⚡ FIX PRO-47: Đồng bộ công thức đếm KH với countRealCustomers() trong QLTD:
//   1. Dùng customerKey (ưu tiên mã r[0], fallback tên r[1]) thay vì chỉ r[0]
//   2. Chỉ đếm KH có tổng dư nợ > 0 (loại trừ hồ sơ đã tất toán / dư nợ = 0)
function bckhAggregateData(dataset) {
  const cbtdMap = bckhBuildCBTDMap();
  const result = {}; // rowId → aggregator

  // Init aggregators (kể cả CBTD không có data, để đổ 0)
  Object.values(cbtdMap).forEach(rowId => {
    result[rowId] = {
      dnAll: 0, dnNH: 0, dnTDH: 0, dnDN: 0,
      // Map: customerKey → { dnAll, dnNH, dnTDH, dnDN } để lọc theo dư nợ > 0
      khMapAll: new Map(), khMapNH: new Map(), khMapTDH: new Map(), khMapDN: new Map()
    };
  });
  // Không có "Vay online" catch-all nữa — dữ liệu không khớp CBTD sẽ được bỏ qua
  // (sau khi fix alias, không còn CBTD nào bị lạc)

  if (!Array.isArray(dataset)) return result;

  for (const r of dataset) {
    if (!r) continue;
    const cbtdName = String(r[12] || '').trim();
    const dn = Number(r[11]) || 0;
    // ⚡ FIX: dùng customerKey — ưu tiên mã KH, fallback tên KH (giống QLTD)
    const ma  = String(r[0] || '').trim();
    const ten = String(r[1] || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const ck  = ma ? `M:${ma}` : (ten ? `N:${ten}` : '');
    const isNH  = (typeof isNganHan  === 'function') ? isNganHan(r[13])  : /ngắn|thấu/i.test(r[13]||'');
    const isTDH = (typeof isTrungHan === 'function') ? isTrungHan(r[13]) : /trung|dài/i.test(r[13]||'');
    const isDN  = bckhIsKHDN(r[1], r[0]);

    // Tìm rowId — dùng alias nếu cần; bỏ qua nếu không khớp
    let rowId = cbtdMap[bckhNormName(cbtdName)];
    if (!rowId) {
      // DEBUG: lưu tên CBTD không khớp để dễ phát hiện alias còn thiếu
      // Mở Console gõ: [...window._bckhUnmapped] để xem danh sách
      if (cbtdName) (window._bckhUnmapped ||= new Set()).add(cbtdName);
      // HM-09: không bỏ im lặng — gom vào "Chưa phân CBTD" để báo cáo nêu rõ phần nằm ngoài bảng
      const u = (result.__chuaphan ||= { hs: 0, duno: 0, names: new Set(), khs: new Set() });
      u.hs++; u.duno += dn; u.names.add(cbtdName || '(trống)'); if (ck) u.khs.add(ck);
      continue; // CBTD không khớp → không nằm trong bảng theo CBTD
    }
    const agg = result[rowId];
    if (!agg) continue;

    agg.dnAll += dn;
    if (isNH)  agg.dnNH  += dn;
    if (isTDH) agg.dnTDH += dn;
    if (isDN)  agg.dnDN  += dn;

    // ⚡ FIX: Tích lũy dư nợ theo customerKey vào Map (gộp nhiều HĐ cùng KH)
    if (ck) {
      agg.khMapAll.set(ck, (agg.khMapAll.get(ck) || 0) + dn);
      if (isNH)  agg.khMapNH.set(ck,  (agg.khMapNH.get(ck)  || 0) + dn);
      if (isTDH) agg.khMapTDH.set(ck, (agg.khMapTDH.get(ck) || 0) + dn);
      if (isDN)  agg.khMapDN.set(ck,  (agg.khMapDN.get(ck)  || 0) + dn);
    }
  }
  // ⚡ FIX: Convert Map → count chỉ KH có tổng dư nợ > 0 (giống countRealCustomers)
  Object.values(result).forEach(a => {
    if (!a.khMapAll) return; // HM-09: bỏ qua __chuaphan
    let cAll=0, cNH=0, cTDH=0, cDN=0;
    a.khMapAll.forEach(v => { if (v > 0) cAll++; }); a.khAll = cAll; delete a.khMapAll;
    a.khMapNH.forEach(v  => { if (v > 0) cNH++;  }); a.khNH  = cNH;  delete a.khMapNH;
    a.khMapTDH.forEach(v => { if (v > 0) cTDH++; }); a.khTDH = cTDH; delete a.khMapTDH;
    a.khMapDN.forEach(v  => { if (v > 0) cDN++;  }); a.khDN  = cDN;  delete a.khMapDN;
  });
  return result;
}


/* ═══════════════════════════════════════════════════════════════════════
   📦 PHÂN BỔ KH NĂM → KH QUÝ / KH TUẦN cho từng CBTD
   ───────────────────────────────────────────────────────────────────────
   Logic:
     - Lấy "KH tăng trưởng" (Bảng I col 2) cho từng CBTD theo rowId
     - Phân bổ:
         • Bảng II col 8 (Kế hoạch Quý)        = KH năm / 4
         • Bảng IV col 8 (KH Quý)              = KH năm / 4
         • Bảng III col 9 (Đăng ký KH tuần)    = KH năm / 52
     - Bảng V không có cột target (col 8 là delta tự tính)
     - Chỉ ghi đè khi ô đang trống HOẶC option overwrite=true
   ═══════════════════════════════════════════════════════════════════════ */


 // trạng thái ẩn hiện tại


/* ═══════════════════════════════════════════════════════════════════════
   📊 DASHBOARD TỔNG QUAN — TÌNH HÌNH THỰC HIỆN
   3 mode: month / quarter / year — so sánh DATA.qltd hiện tại với snapshot
   tương ứng (đầu tháng / đầu quý / đầu năm).
   ═══════════════════════════════════════════════════════════════════════ */

 // mặc định: so với đầu quý
  // 'all' | 'phong' | 'cbtd'
     // phong key hoặc tên CBTD


function bckhFmtMoney(n) {
  if (!n || isNaN(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + ' tỷ';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + ' tr';
  if (abs >= 1e3) return (n / 1e3).toFixed(0) + ' nghìn';
  return Math.round(n).toLocaleString('vi-VN');
}


/* ═══════════════════════════════════════════════════════════════════════
   🔍 DRILL-DOWN: Click ô "+/- biến động" → xem chi tiết KH thay đổi
   ───────────────────────────────────────────────────────────────────────
   Khi click ô +/- (cột 4/5/6) ở 1 dòng CBTD trong bảng II/III/IV/V,
   modal hiện danh sách KH:
     • KH MỚI:    có ở DATA.qltd nhưng không có trong snapshot
     • KH ĐI:     có ở snapshot nhưng không còn ở DATA.qltd
     • TĂNG:      cùng KH, dư nợ tăng
     • GIẢM:      cùng KH, dư nợ giảm
   ═══════════════════════════════════════════════════════════════════════ */


 // v2: schema 23 cột (năm 2026)


/* ═══════════════════════════════════════════════════════════════
   PAGE NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

/* ── Tree toggle QUẢN LÝ TÍN DỤNG ── */
let _hsvTreeOpen = false;
function hsvTreeToggle(e, el) {
  const arrow    = document.getElementById('nav-hsv-arrow');
  const children = document.getElementById('nav-hsv-children');
  const clickedArrow = e.target.closest('.nav-tree-toggle');
  _hsvTreeOpen = !_hsvTreeOpen;
  if (_hsvTreeOpen) {
    children.classList.add('open');
    arrow.classList.add('open');
  } else {
    children.classList.remove('open');
    arrow.classList.remove('open');
    const active = children.querySelector('.nav-child-item.active');
    if (active) { active.classList.remove('active'); el.classList.add('active'); }
  }
  if (!clickedArrow && _hsvTreeOpen && !children.querySelector('.nav-child-item.active')) {
    showPage('hmtd', children.querySelector('[data-page="hmtd"]'));
  }
}

let _qltdTreeOpen = false;
function qltdTreeToggle(e, el) {
  const arrow    = document.getElementById('nav-qltd-arrow');
  const children = document.getElementById('nav-qltd-children');
  // Nếu click vào mũi tên → chỉ toggle, không navigate
  const clickedArrow = e.target.closest('.nav-tree-toggle');
  _qltdTreeOpen = !_qltdTreeOpen;
  if (_qltdTreeOpen) {
    children.classList.add('open');
    arrow.classList.add('open');
  } else {
    children.classList.remove('open');
    arrow.classList.remove('open');
    // Ẩn con → active trả về parent nếu đang ở kd/td
    const active = document.querySelector('.nav-child-item.active');
    if (active) {
      active.classList.remove('active');
      el.classList.add('active');
    }
  }
  // Chỉ navigate sang qltd khi KHÔNG click vào mũi tên
  if (!clickedArrow) {
    showPage('qltd', el);
  }
}

const PAGE_TITLES = {
  dashboard: ['TỔNG QUAN', 'Phòng KHKD · Agribank Nam Định'],
  qltd: ['DƯ NỢ', 'Dữ liệu IPCAS msit80 — toàn bộ hồ sơ tín dụng'],
  kd: ['DƯ NỢ NGẮN HẠN', 'Vay ngắn hạn (TK 211) + Thấu chi — quản lý hạn mức tín dụng'],
  td: ['DƯ NỢ TRUNG-DÀI HẠN', 'Vay trung hạn (TK 212) + dài hạn (TK 213) — tiêu dùng'],
  qcamco: ['DƯ NỢ CẦM CỐ', 'Vay cầm cố sổ tiết kiệm từ IPCAS'],
  denhan: ['NỢ ĐẾN HẠN', 'Theo dõi các khoản đến hạn thu nợ'],
  laidong: ['LÃI ĐỌNG', 'Các khoản lãi phải thu'],
  chlm:    ['CHUYỂN HẠN MỨC', 'Theo dõi HĐTD đến hạn chuyển hạn mức trong tháng'],
  tranop: ['TRẢ NỢ / XUẤT TÀI SẢN', 'Theo dõi giảm dư nợ và tất toán tài sản đảm bảo'],
  phidv: ['GIẢI NGÂN', 'Tính phí trên các lần giải ngân'],
  khmoi: ['KHÁCH HÀNG MỚI', 'Tổng hợp khách hàng vay mới & vay cầm cố theo phòng/CBTD'],
  hdv: ['HUY ĐỘNG VỐN', 'Đăng ký huy động vốn theo cán bộ'],
  baocao: ['BÁO CÁO IPCAS', 'Danh mục báo cáo phải nộp'],
  hmtd: ['HỒ SƠ HẠN MỨC TÍN DỤNG', 'Tạo hồ sơ vay vốn hạn mức tín dụng'],
  tieudung: ['HỒ SƠ TIÊU DÙNG', 'Tạo hồ sơ vay tiêu dùng'],
  camco: ['HỒ SƠ CẦM CỐ', 'Tạo hồ sơ vay cầm cố sổ tiết kiệm'],
  hsvv: ['FORM HỒ SƠ VAY VỐN', 'APC Credit Application Form — Agribank Nam Định'],
  giadat: ['GIÁ ĐẤT & HỆ SỐ K, H', 'Bảng giá đất Nam Định 2026'],
  macb: ['CÁN BỘ / LƯƠNG', 'Danh sách cán bộ Phòng KHKD'],
  archive: ['LƯU TRỮ FILE', 'Quản lý lưu trữ dữ liệu và báo cáo'],
  tsbd: ['TÀI SẢN BẢO ĐẢM', 'Danh mục TSBĐ từ IPCAS đối chiếu trạng thái dư nợ khách hàng'],
  doisoat: ['ĐỐI SOÁT SỐ LIỆU', 'Tính lại độc lập từ dữ liệu và so với các màn hình'],
  nhap: ['TRUNG TÂM NHẬP DỮ LIỆU', 'Nhập nhiều tệp dư nợ / tài sản bảo đảm · so kỳ trước · nhật ký'],
  khachhang: ['KHÁCH HÀNG 360°', 'Khoản vay · tài sản bảo đảm · lịch sử các kỳ · hồ sơ vay · ghi chú'],
  xuhuong: ['XU HƯỚNG NHIỀU KỲ', 'Dư nợ · khách hàng · khoản của các mốc đã nhập'],
  canhbao: ['CẢNH BÁO SỚM', 'Đến hạn · chuyển nhóm · lãi suất bất thường · TSBĐ — theo ngày dữ liệu'],
  ctkh: ['CHỈ TIÊU KẾ HOẠCH', 'Theo dõi tiến độ thực hiện chỉ tiêu kinh doanh năm · Phòng KHKD'],
  fhs: ['FORM HỒ SƠ (FHS)', 'Chọn loại hồ sơ → Nhập → Xuất Word'],
};
/* HM-13b: MỘT sổ đăng ký việc chạy sau khi đổi trang, thay cho các lớp bọc window.showPage = function(){…} rải ở 10 khối.
   Hook chạy đồng bộ ở cuối showPage, MỖI lần gọi (kể cả mở lại cùng trang) — đúng ngữ nghĩa các lớp bọc cũ. */
TD.pageHooks = TD.pageHooks || [];
TD.onShowPage = function (fn) { if (typeof fn === 'function' && TD.pageHooks.indexOf(fn) < 0) TD.pageHooks.push(fn); return fn; };
/* P10 (T9): rời một trang NẶNG (> 2.500 nút) ⇒ lúc rảnh gỡ nội dung các bảng của nó (trước đây duyệt hết trang giữ ~150.000 nút DOM).
   CHỈ áp cho trang mà showPage luôn dựng lại bảng khi vào lại (danh sách dưới) ⇒ không mất trạng thái, không tốn thêm khi quay lại.
   Không áp cho trang có ô nhập/biểu mẫu giữ trạng thái trong DOM (Hồ sơ vay, FHS, TSBĐ, Lưu trữ…). */
window.__TD_TRIM = new Set(['dashboard', 'qltd', 'kd', 'td', 'macb', 'denhan', 'laidong', 'chlm', 'phidv', 'tranop', 'doisoat', 'canhbao', 'xuhuong', 'khachhang', 'giadat']);
window.__TD_TRIM_MIN = 2500;
window.__TDTrimPage = function (el) {
  const key = el && el.id && el.id.slice(5);
  if (!key || !window.__TD_TRIM.has(key)) return;
  const run = () => {
    if (el.classList.contains('active') || el.getElementsByTagName('*').length < window.__TD_TRIM_MIN) return; // đã quay lại / không nặng
    el.querySelectorAll('tbody').forEach(tb => { if (tb.firstChild) tb.textContent = ''; });
    el.dataset.tdTrimmed = String(Date.now());
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 3000 }); else setTimeout(run, 500);
};
function showPage(name, el) {
  // ① Nếu đang ở trang HSVV và có dữ liệu chưa lưu → auto-save khi chuyển trang
  if (typeof activeTable !== 'undefined' && activeTable === 'hsvv' &&
      typeof _hosoDirty !== 'undefined' && _hosoDirty &&
      typeof _hosoCurrentId !== 'undefined' && _hosoCurrentId &&
      name !== 'hsvv') {
    try { hosoSilentSave(); } catch {}
    showToast('💾 Đã tự động lưu hồ sơ khi chuyển trang', 'green');
  }
  const __prevPage = document.querySelector('.page.active'); // P10 (T9)
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-item,.nav-item-parent,.nav-child-item').forEach(n => n.classList.remove('active'));
  $('page-' + name)?.classList.add('active');
  if (__prevPage && __prevPage.id !== 'page-' + name) window.__TDTrimPage(__prevPage);
  if (el) el.classList.add('active');
  else document.querySelector(`[data-page="${name}"]`)?.classList.add('active');

  // Tree view: khi vào hmtd / tieudung / camco → tự mở nhánh HSV
  if (name === 'hmtd' || name === 'tieudung' || name === 'camco') {
    const arrow    = document.getElementById('nav-hsv-arrow');
    const children = document.getElementById('nav-hsv-children');
    if (children && !_hsvTreeOpen) {
      _hsvTreeOpen = true;
      children.classList.add('open');
      if (arrow) arrow.classList.add('open');
    }
    if (!el) {
      const childEl = document.querySelector(`.nav-child-item[data-page="${name}"]`);
      if (childEl) childEl.classList.add('active');
    }
  }
  // Khi vào hsv → reset active trên child items
  if (name === 'hsv') {
    document.querySelectorAll('#nav-hsv-children .nav-child-item').forEach(n => n.classList.remove('active'));
  }

  // Tree view: khi vào kd / td / qcamco → tự mở nhánh con, giữ parent highlight nhạt
  if (name === 'kd' || name === 'td' || name === 'qcamco') {
    const arrow    = document.getElementById('nav-qltd-arrow');
    const children = document.getElementById('nav-qltd-children');
    if (children && !_qltdTreeOpen) {
      _qltdTreeOpen = true;
      children.classList.add('open');
      if (arrow) arrow.classList.add('open');
    }
    // Đảm bảo child item đúng được active (el đã được set ở trên, fallback tìm lại)
    if (!el) {
      const childEl = document.querySelector(`.nav-child-item[data-page="${name}"]`);
      if (childEl) childEl.classList.add('active');
    }
  }
  // Khi vào qltd → reset active trên child items
  if (name === 'qltd') {
    $$('.nav-child-item').forEach(n => n.classList.remove('active'));
  }

  const [title, sub] = PAGE_TITLES[name] || [name, ''];
  $('page-title').textContent = title;
  { // P05: đường dẫn "Nhóm › Trang" lấy từ cây menu (nhóm = tiêu đề .sidebar-section đứng trước mục menu)
    let crumb = '', navEl = document.querySelector('#sidebar [data-page="' + name + '"]');
    for (let e = navEl; e && !crumb; e = e.previousElementSibling) if (e.classList && e.classList.contains('sidebar-section')) crumb = e.textContent.trim();
    if (!crumb && navEl) { const par = navEl.closest('#sidebar > *'); for (let e = par; e && !crumb; e = e.previousElementSibling) if (e.classList && e.classList.contains('sidebar-section')) crumb = e.textContent.trim(); }
    if (crumb.toUpperCase() === String(title).toUpperCase()) crumb = '';
    const subEl = $('page-sub'); subEl.textContent = crumb ? crumb + ' › ' + title : sub; subEl.dataset.crumb = crumb ? '1' : '';
  }
  activeTable = name;

  // Đóng modal-kh-search và inline FHS dropdown khi chuyển trang
  try { var _mo = document.getElementById('modal-kh-search'); if (_mo) _mo.style.display = 'none'; } catch(e){}
  try { if (typeof fhsInlineSearchClose === 'function') fhsInlineSearchClose(); } catch(e){}

  // Ẩn Bulk Bar khi chuyển trang
  clearBulkSelection();

  // Toolbar buttons per page
  const hasExport = ['qltd', 'kd', 'td', 'denhan', 'laidong', 'phidv', 'macb'].includes(name);
  const hasAdd = ['qltd', 'kd', 'td'].includes(name);
  $('btn-export').style.display = hasExport ? 'inline-flex' : 'none';
  $('btn-add').style.display = hasAdd ? 'inline-flex' : 'none';

  // Cập nhật nút fullscreen theo trang
  if (typeof pageFsUpdateBtn === 'function') pageFsUpdateBtn(name);

  // Trigger renders
  if (name === 'tsbd') { try { if (typeof tsbdInit === 'function') tsbdInit(); } catch(e) { console.error(e); } }
  if (name === 'doisoat') { try { tdDoiSoatRun(); } catch (e) { console.error('[doisoat]', e); } }
  if (name === 'canhbao') { try { tdWarnRun(); } catch (e) { console.error('[canhbao]', e); } }
  if (name === 'xuhuong') { try { tdTrendRun(); } catch (e) { console.error('[xuhuong]', e); } }
  if (name === 'khachhang') { try { tdKh360Run(); } catch (e) { console.error('[khachhang]', e); } }
  if (name === 'nhap') { try { tdHubRender(); } catch (e) { console.error('[nhap]', e); } }
  if (name === 'dashboard') renderDashboard();
  else if (name === 'laidong') {
    // Mặc định: LÃI ĐỌNG — ngày thu lãi cuối cùng (r[23]) TRƯỚC ngày đầu tháng hiện tại
    if (!window._laidongInitialized) {
      window._laidongInitialized = true;
      // Theo dõi TẤT CẢ CBTD (không lọc mặc định theo 1 cán bộ)
      const _cbEl = $('filter-laidong-cbtd');
      if (_cbEl) _cbEl.value = '';
      // Mặc định sắp xếp theo ngày đọng lãi lâu nhất (ĐÃ THU LÃI ĐẾN tăng dần = cũ nhất trước)
      // v14.12: giữ mặc định CHUẨN (Phòng ban → CBTD), ngày thu lãi là khoá phụ
      sortState['laidong'] = { col: null, asc: true };
      setDateRange('laidong', 'overdueInterest'); // lọc r[23] < ngày 01 tháng hiện tại
      // Cập nhật icon tiêu đề cột sau khi DOM render xong
      requestAnimationFrame(() => {
        const thead = $('table-laidong')?.querySelector('thead');
        if (thead) {
          thead.querySelectorAll('th').forEach(th => {
            const si = th.querySelector('.sort-icon');
            if (!si) return;
            const onc = th.getAttribute('onclick') || '';
            if (onc.includes("sortTable('laidong',23)")) {
              th.classList.add('sorted');
              si.textContent = '↑';
            } else {
              si.textContent = '↕';
            }
          });
        }
      });
    } else {
      renderTable('laidong');
    }
  }
  else if (name === 'denhan') {
    // Mặc định: LỊCH TRẢ NỢ — Tháng này (từ ngày 01 đến cuối tháng hiện tại)
    if (!window._denhanInitialized) {
      window._denhanInitialized = true;
      setDateRange('denhan', 'month'); // Tháng này
    } else {
      renderTable('denhan');
    }
  }
  else if (name === 'phidv') {
    // ✅ PRO-31 / FIX: Mặc định CBTD = cán bộ mặc định, Từ = 01 tháng hiện tại, Đến = cuối tháng hiện tại
    // Mỗi lần mở lại trang đều reset filter về tháng hiện tại (không dùng _phidvInitialized cứng)
    phidvSetDefaultFilter();
    renderTable('phidv');
    // ✅ PRO-39 FIX #1: Reset flag sau khi đã render lại
    window._phidvNeedsRefresh = false;
  }
  else if (['qltd','kd','td','macb'].includes(name)) renderTable(name);
  else if (name === 'chlm') {
    // CHLM: mặc định tháng hiện tại theo NGÀY HĐTD, CBTD mặc định = cán bộ mặc định
    if (!window._chlmInitialized) {
      window._chlmInitialized = true;
      sortState['chlm'] = { col: null, asc: true }; // v14.12: mặc định CHUẨN Phòng ban → CBTD, ngày đến hạn là khoá phụ
      setDateRange('chlm', 'month');
      // Set default CBTD tracking button active
      chlmApplyTrackButton();
    } else {
      renderTable('chlm');
    }
  }
  else if (name === 'tranop') renderTranop();
  else if (name === 'hdv') { hdvInitPage(); renderHDV(); }
  else if (name === 'baocao') renderBaoCao();
  else if (name === 'giadat') renderGiaDat();
  else if (name === 'archive') {
    // ✅ FIX: làm mới danh sách archive mỗi lần mở trang
    if (typeof archiveRenderDataList === 'function') archiveRenderDataList();
    if (typeof archiveRenderReportList === 'function') archiveRenderReportList();
  }
  else if (name === 'list') renderList();
  setTimeout(updateTableTopScrollbars, 0);
  TD.pageHooks.forEach(h => { try { h(name, el); } catch (e) { console.error('[showPage hook]', e); } }); // HM-13b
}
function showSub(id, btn) {
  const parent = btn.parentElement;
  parent.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.sub-section').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ═══════════════════════════════════════════════════════════════
   BADGES in sidebar
   ═══════════════════════════════════════════════════════════════ */
function refreshBadges() {
  const actualRows = DATA.qltd.filter(isActualCreditRow);
  const total = DATA.qltd.length;
  const kdCount = DATA.qltd.filter(r => isNganHan(r[13])).length;
  const tdCount = DATA.qltd.filter(r => isTrungHan(r[13])).length;
  const today = todayMidnight();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
  const denhanCount = actualRows.filter(r => {
    const d = parseVNDate(r[7]);
    return d && d >= monthStart && d <= monthEnd;
  }).length;
  const laidongCount = actualRows.filter(r => {
    if (Number(r[10]) <= 0) return false;
    const s = DATA.laidongStatus[laidongKey(r)] || {};
    if (s.dathu) return false;
    const d = parseVNDate(r[23]);
    return !d || d <= prevMonthEnd;
  }).length;
  /* PATCH v13.8.1: guard null cho mọi badge — UI có thể chưa mount khi init */
  var __setBadge = function(id, v){ var el = $(id); if (el) el.textContent = fmtNum(v); };
  __setBadge('badge-qltd', total);
  __setBadge('badge-kd', kdCount);
  __setBadge('badge-td', tdCount);
  __setBadge('badge-denhan', denhanCount);
  __setBadge('badge-laidong', laidongCount);
  __setBadge('badge-macb', DATA.macb.length);
  // CHLM badge: số HĐ có NGÀY ĐẾN HẠN trong tháng hiện tại chưa chuyển
  const chlmCount = DATA.qltd.filter(r => {
    const dateStr = r[24] || r[7]; // ✅ FIX: fallback r[7]
    if (!dateStr) return false;
    const d = parseVNDate(dateStr);
    if (!d || d < monthStart || d > monthEnd) return false;
    return !(DATA.chlmStatus[chlmKey(r)]||{}).dachuyen;
  }).length;
  const chlmBadge = $('badge-chlm');
  if (chlmBadge) chlmBadge.textContent = fmtNum(chlmCount);
}

/* ═══════════════════════════════════════════════════════════════
   FILTER/SORT UTILITIES
   ═══════════════════════════════════════════════════════════════ */
function sortTable(key, col) {
  const st = sortState[key] || {};
  const asc = st.col === col ? !st.asc : true;
  sortState[key] = { col, asc };
  renderTable(key);
  // Update header indicator
  const thead = $('table-' + key)?.querySelector('thead');
  if (thead) {
    thead.querySelectorAll('th').forEach(th => th.classList.remove('sorted'));
    const ths = thead.querySelectorAll('th');
    // col index is logical column inside row data - not the display th index
    // We use onclick args for column index, so find the th whose onclick references the col
    ths.forEach(th => {
      const onc = th.getAttribute('onclick') || '';
      if (onc.includes(`sortTable('${key}',${col})`)) {
        th.classList.add('sorted');
        const si = th.querySelector('.sort-icon');
        if (si) si.textContent = asc ? '↑' : '↓';
      } else {
        const si = th.querySelector('.sort-icon');
        if (si) si.textContent = '↕';
      }
    });
  }
}

function filterTable(key) {
  renderTable(key);
}

function toggleSelectAll(key, chk) {
  $$(`#tbody-${key} input[type=checkbox][data-row]`).forEach(c => c.checked = chk.checked);
  onSelectionChange(key);
}

/* ═══════════════════════════════════════════════════════════════
   BULK ACTION — Chọn nhiều hàng & thao tác hàng loạt
   ═══════════════════════════════════════════════════════════════ */
let _bulkActiveKey = '';

function onSelectionChange(key) {
  _bulkActiveKey = key;
  const checkboxes = Array.from($$(`#tbody-${key} input[type=checkbox][data-row]`));
  const checked = checkboxes.filter(c => c.checked);
  const n = checked.length;

  // Cập nhật Bulk Action Bar
  const bar = $('bulk-bar');
  const cnt = $('bulk-count');
  if (bar && cnt) {
    cnt.textContent = n;
    if (n > 0) bar.classList.add('show');
    else bar.classList.remove('show');
  }

  // Trạng thái checkbox header: indeterminate / checked / unchecked
  const allChk = $('chk-all-' + key);
  if (allChk) {
    if (n === 0) { allChk.checked = false; allChk.indeterminate = false; }
    else if (n === checkboxes.length) { allChk.checked = true; allChk.indeterminate = false; }
    else { allChk.checked = false; allChk.indeterminate = true; }
  }

  // Highlight hàng được chọn
  checkboxes.forEach(c => {
    const tr = c.closest('tr');
    if (tr) tr.classList.toggle('row-selected', c.checked);
  });
}

function getSelectedIndices(key) {
  return Array.from($$(`#tbody-${key} input[type=checkbox][data-row]:checked`))
    .map(c => parseInt(c.dataset.row, 10))
    .filter(i => !isNaN(i));
}

function deleteSelectedRows() {
  const key = _bulkActiveKey;
  if (!key) return;
  const indices = getSelectedIndices(key);
  if (!indices.length) { showToast('Chưa chọn hồ sơ nào', ''); return; }
  const names = indices.slice(0, 3).map(i => DATA.qltd[i]?.[1] || '').filter(Boolean);
  const preview = names.join(', ') + (indices.length > 3 ? ` ... và ${indices.length - 3} hồ sơ khác` : '');
  if (!confirm(`Xoa ${indices.length} ho so da chon?\n\n${preview}\n\nKhong the hoan tac!`)) return;
  // Xóa theo thứ tự ngược để index không bị dịch
  indices.sort((a, b) => b - a);
  indices.forEach(i => DATA.qltd.splice(i, 1));
  markUnsaved();
  clearBulkSelection();
  rebuildAll();
  showToast(`Da xoa ${indices.length} ho so`, 'red');
}

function exportSelectedRows() {
  const key = _bulkActiveKey;
  if (!key) return;
  const indices = getSelectedIndices(key);
  if (!indices.length) { showToast('Chua chon ho so nao', ''); return; }
  const rows = indices.map(i => DATA.qltd[i]).filter(Boolean);
  const hdr = ['Ma KH','Ten KH','So HDTD','Ngay HD','Ngay HDTD','HMTD','Ngay GN','Ngay tra no','LS %','So tien GN','Tien lai','Du no','CBTD','Loai vay','Dia chi','Muc dich','Goc tra','Phong ban','Nhom no','So ho so','So TK'];
  const lines = [hdr.join(',')];
  rows.forEach(r => {
    lines.push([r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10],r[11],r[12],r[13],r[14],r[15],r[16],r[17],r[18],r[19],r[20]].map(csvEscape).join(','));
  });
  const csv = '\ufeff' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  a.href = URL.createObjectURL(blob);
  a.download = `qltd_chonloc_${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Xuat ${rows.length} ho so da chon`, 'green');
}

function clearBulkSelection() {
  ['qltd','kd','td','denhan','laidong'].forEach(k => {
    $$(`#tbody-${k} input[type=checkbox][data-row]`).forEach(c => {
      c.checked = false;
      const tr = c.closest('tr');
      if (tr) tr.classList.remove('row-selected');
    });
    const allChk = $('chk-all-' + k);
    if (allChk) { allChk.checked = false; allChk.indeterminate = false; }
  });
  const bar = $('bulk-bar');
  if (bar) bar.classList.remove('show');
  _bulkActiveKey = '';
}

function setDateRange(key, mode) {
  const from = $(`${key}-from`), to = $(`${key}-to`);
  const today = todayMidnight();
  let fromD = null, toD = null;
  switch(mode) {
    case 'week':
      fromD = new Date(today.getTime() - 6 * 86400000);
      toD = new Date(today.getTime() + 6 * 86400000);
      break;
    case 'month':
      if (key === 'laidong') {
        // LÃI ĐỌNG – "Tháng này": hiện tất cả KH chưa thu lãi tháng này
        // = ĐÃ THU LÃI ĐẾN < ngày 01 tháng hiện tại (tức ≤ ngày cuối tháng trước)
        fromD = null; // không giới hạn biên dưới
        toD = new Date(today.getFullYear(), today.getMonth(), 0); // ngày 0 = ngày cuối tháng trước
      } else if (key === 'phidv') {
        // PHÍ GIẢI NGÂN – "Tháng này": từ ngày 01 tháng hiện tại đến hôm nay
        fromD = new Date(today.getFullYear(), today.getMonth(), 1);
        toD = today;
      } else if (key === 'chlm') {
        // CHUYỂN HẠN MỨC – "Tháng này": từ HÔM NAY → cuối tháng hiện tại
        fromD = today;
        toD = new Date(today.getFullYear(), today.getMonth()+1, 0);
      } else {
        // mặc định (denhan, tranop…): đầu tháng → cuối tháng
        fromD = new Date(today.getFullYear(), today.getMonth(), 1);
        toD = new Date(today.getFullYear(), today.getMonth()+1, 0);
      }
      break;
    case 'quarter':
      const q = Math.floor(today.getMonth() / 3);
      if (key === 'chlm') {
        // CHUYỂN HẠN MỨC – "Quý này": từ HÔM NAY → cuối quý hiện tại
        fromD = today;
        toD = new Date(today.getFullYear(), q*3+3, 0);
      } else {
        fromD = new Date(today.getFullYear(), q*3, 1);
        toD = new Date(today.getFullYear(), q*3+3, 0);
      }
      break;
    case 'next30':
      fromD = today;
      if (key === 'chlm' || key === 'denhan') {
        // "Tháng tới": từ hôm nay → ngày cuối cùng của tháng tới
        // new Date(year, month+2, 0) → ngày 0 = ngày cuối của tháng trước đó = cuối tháng tới
        // Xử lý đúng tháng 28 (Feb), 29 (Feb nhuận), 30, 31 ngày
        toD = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      } else {
        toD = new Date(today.getTime() + 30 * 86400000);
      }
      break;
    case 'overdue':
      fromD = new Date(2020, 0, 1);
      toD = new Date(today.getTime() - 86400000);
      break;
    case 'overdueInterest':
      // LÃI ĐỌNG: chỉ lấy KH có "đã thu lãi đến" ≤ ngày cuối tháng trước
      // (loại KH đã thu lãi trong tháng hiện tại)
      fromD = new Date(2015, 0, 1);  // biên dưới xa (tuỳ tuổi dữ liệu)
      toD = new Date(today.getFullYear(), today.getMonth(), 0); // ngày 0 = ngày cuối tháng trước
      break;
    case 'currentMonthToday':
      // LỊCH TRẢ NỢ mặc định: từ ngày 01 tháng hiện tại đến hôm nay
      fromD = new Date(today.getFullYear(), today.getMonth(), 1);
      toD = today;
      break;
    case 'all':
      from.value = ''; to.value = '';
      filterTable(key);
      return;
  }
  if (fromD) from.value = fmtVNDate(fromD);
  else from.value = "";
  if (toD) to.value = fmtVNDate(toD);
  markDateInputState(from, !!fromD);
  markDateInputState(to, !!toD);
  filterTable(key);
}

/* ═══════════════════════════════════════════════════════════════
   STATUS KEYS (denhan/laidong)
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   📊 PHÂN KỲ TRẢ GỐC — Trung hạn / Dài hạn
   ═══════════════════════════════════════════════════════════════ */

const PHANKY_AMT_KEY = 'phanky_amt_v1';
const PHANKY_THANG_KEY = 'phanky_thang_v1';

function phankyLoadAmts() {
  try { return JSON.parse(localStorage.getItem(PHANKY_AMT_KEY) || '{}'); }
  catch(e) { return {}; }
}

function phankySaveAmt(ma, hd, val) {
  const amts = phankyLoadAmts();
  amts[`${ma}|${hd}`] = val;
  try { localStorage.setItem(PHANKY_AMT_KEY, JSON.stringify(amts)); }
  catch(e) {}
}

function phankyGetAmt(ma, hd) {
  return phankyLoadAmts()[`${ma}|${hd}`] || '';
}

function phankyLoadThangs() {
  try { return JSON.parse(localStorage.getItem(PHANKY_THANG_KEY) || '{}'); }
  catch(e) { return {}; }
}

function phankySaveThang(ma, hd, val) {
  const thangs = phankyLoadThangs();
  const key = `${ma}|${hd}`;
  if (val === '' || val === null) { delete thangs[key]; }
  else { thangs[key] = val; }
  try { localStorage.setItem(PHANKY_THANG_KEY, JSON.stringify(thangs)); }
  catch(e) {}
}

function phankyGetThang(ma, hd, autoVal) {
  const saved = phankyLoadThangs()[`${ma}|${hd}`];
  return (saved !== undefined && saved !== '') ? saved : (autoVal || '');
}

/* Tính số tháng chênh lệch giữa hai ngày DD/MM/YYYY */
function monthsDiff(dateStr1, dateStr2) {
  const p1 = parseVNDate(dateStr1), p2 = parseVNDate(dateStr2);
  if (!p1 || !p2) return '';
  const d1 = new Date(p1), d2 = new Date(p2);
  const diff = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  return diff > 0 ? diff : '';
}

function togglePhanKy(on) {
  const sec = document.getElementById('section-phanky');
  const wrap = document.getElementById('phanky-cbtd-wrap');
  if (sec) sec.style.display = on ? 'block' : 'none';
  if (wrap) wrap.style.display = on ? 'flex' : 'none';
  if (on) {
    renderPhanKy();
    renderTable('denhan'); // re-render main table to merge trung hạn rows
  } else {
    renderTable('denhan'); // re-render without trung hạn rows
  }
  // Style chip
  const lbl = document.getElementById('chip-phanky-label');
  if (lbl) {
    lbl.style.background = on ? '#4338ca' : '#eef2ff';
    lbl.style.color = on ? '#fff' : '#4338ca';
    lbl.style.borderColor = on ? '#4338ca' : '#6366f1';
  }
}

function isPhanKyOn() {
  const cb = document.getElementById('chip-phanky');
  return cb && cb.checked;
}

function renderPhanKy() {
  if (!DATA.qltd || !DATA.qltd.length) return;

  // Populate CBTD dropdown
  const cbSel = document.getElementById('phanky-filter-cbtd');
  if (cbSel) {
    const cbtds = window.TD_SXCB.sortNames([...new Set(DATA.qltd.map(r => r[12]).filter(Boolean))]);
    const cur = cbSel.value;
    cbSel.innerHTML = '<option value="">— Tất cả —</option>' +
      cbtds.map(c => `<option value="${escapeHtml(c)}"${c===cur?' selected':''}>${escapeHtml(c)}</option>`).join('');
    // Theo dõi TẤT CẢ CBTD (không mặc định 1 cán bộ)
    if (!cbSel.dataset.inited) cbSel.dataset.inited = '1';
  }
  const filterCbtd = cbSel ? cbSel.value : '';

  // Lọc: trung hạn + dài hạn có nxtrpmtschddt (r[25])
  const rows = DATA.qltd.filter(r => {
    if (filterCbtd && r[12] !== filterCbtd) return false;
    if (!isTrungHan(r[13])) return false;
    return !!(r[25] && String(r[25]).trim()); // có ngày trả gốc kế tiếp
  });

  const amts = phankyLoadAmts();
  const thangs = phankyLoadThangs();
  const sub = document.getElementById('phanky-sub');
  if (sub) sub.textContent = `${rows.length} khoản trung hạn có ngày trả gốc kế tiếp`;

  document.getElementById('tbody-phanky').innerHTML = rows.length ? rows.map((r, i) => {
    const ma = r[0], hd = r[2];
    const ngayVay = r[3] || '';
    const ngayTraGoc = r[25] || '';
    const autoThang = monthsDiff(ngayVay, ngayTraGoc);
    const savedThang = thangs[`${ma}|${hd}`];
    const curThang = (savedThang !== undefined && savedThang !== '') ? savedThang : (autoThang || '');
    const isOverride = (savedThang !== undefined && savedThang !== '') && String(savedThang) !== String(autoThang);
    const curAmt = amts[`${ma}|${hd}`] || '';
    return `<tr>
      <td class="date">${i+1}</td>
      <td style="padding-left:6px;font-weight:600">${escapeHtml(r[1]||'')}</td>
      <td class="copy-cell date" onclick="copyCellValue(this,event)">${escapeHtml(ma)}</td>
      <td class="date" style="font-size:10px">${escapeHtml(hd)}</td>
      <td class="date">${escapeHtml(ngayVay)}</td>
      <td class="date" style="font-weight:700;color:#4338ca">${escapeHtml(ngayTraGoc)}</td>
      <td style="padding:3px 6px;text-align:center">
        <div style="display:flex;align-items:center;gap:4px;justify-content:center">
          <input type="text" class="phanky-amt-input"
            value="${curThang}"
            placeholder="—"
            data-ma="${escapeHtml(ma)}" data-hd="${escapeHtml(hd)}" data-auto="${autoThang}"
            title="${autoThang ? 'Tự tính: ' + autoThang + ' tháng. Xóa trắng để khôi phục.' : 'Nhập số tháng phân kỳ'}"
            onchange="phankySaveThang(this.dataset.ma,this.dataset.hd,this.value.replace(/[^0-9]/g,''));renderTable('denhan');renderPhanKy()"
            style="width:52px;padding:4px 5px;border:1.5px solid ${isOverride ? '#f59e0b' : '#c7d2fe'};border-radius:5px;font-family:inherit;font-size:11px;text-align:center;font-weight:700;color:${isOverride ? '#92400e' : '#7c3aed'};background:${isOverride ? '#fffbeb' : '#fff'}">
          <span style="font-size:10px;color:var(--gray-500);white-space:nowrap">tháng</span>
        </div>
        ${isOverride ? `<div style="font-size:9px;color:#b45309;margin-top:2px" title="Tự tính: ${autoThang} tháng">✏ tự nhập</div>` : ''}
      </td>
      <td style="padding:3px 6px">
        <input type="text" class="phanky-amt-input"
          value="${curAmt}"
          placeholder="Nhập số tiền..."
          data-ma="${escapeHtml(ma)}" data-hd="${escapeHtml(hd)}"
          onchange="phankySaveAmt(this.dataset.ma,this.dataset.hd,this.value.replace(/[^0-9]/g,''));renderTable('denhan')"
          style="width:100%;padding:4px 6px;border:1.5px solid #c7d2fe;border-radius:5px;font-family:inherit;font-size:11px;text-align:right">
      </td>
      <td class="money">${fmtMoney(r[11])}</td>
      <td>${escapeHtml(r[12]||'')}</td>
    </tr>`;
  }).join('') :
  `<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--gray-500)">
    Không có khoản trung hạn nào có ngày trả gốc kế tiếp (nxtrpmtschddt).
    ${!DATA.qltd[0]?.[25] ? '<br><span style="color:var(--orange)">⚠ Cần import lại file IPCAS để cập nhật cột nxtrpmtschddt.</span>' : ''}
   </td></tr>`;

  document.getElementById('tfoot-phanky').innerHTML = '';
}

/* Tạo các dòng trung hạn phân kỳ để merge vào tbody-denhan */
function getPhanKyRows() {
  if (!isPhanKyOn() || !DATA.qltd) return [];
  const cbSel = document.getElementById('phanky-filter-cbtd');
  const filterCbtd = cbSel ? cbSel.value : '';
  const amts = phankyLoadAmts();

  return DATA.qltd
    .filter(r => {
      if (filterCbtd && r[12] !== filterCbtd) return false;
      return isTrungHan(r[13]) && r[25] && String(r[25]).trim();
    })
    .map(r => {
      // Tạo row clone với NGÀY TRẢ NỢ = nxtrpmtschddt (r[25])
      const clone = r.slice();
      clone._phanky = true;           // flag để nhận diện
      clone._ngayTraNo = r[25];       // ngày trả gốc kế tiếp
      clone._soTienTra = Number(amts[`${r[0]}|${r[2]}`]) || 0;
      return clone;
    });
}

function denhanKey(r) { return `${r[0]}|${r[2]}|${r[7]}`; }
function laidongKey(r) { return `${r[0]}|${r[2]}`; }
function chlmKey(r)    { return `${r[0]}|${r[2]}|${r[4]}`; } // ✅ CHLM: MãKH|SốHĐTD|NgàyHĐTD

function toggleDaThu(key, r, chk) {
  const k = key === 'denhan' ? denhanKey(r) : laidongKey(r);
  const bucket = key === 'denhan' ? DATA.denhanStatus : DATA.laidongStatus;
  if (!bucket[k]) bucket[k] = {};
  bucket[k].dathu = chk.checked;
  bucket[k].ts = Date.now();
  markUnsaved();
  const tr = chk.closest('tr');
  if (tr) {
    tr.classList.toggle('row-da-thu', chk.checked);
    // Đồng bộ select TRẠNG THÁI nếu có
    if (key === 'denhan') {
      const sel = tr.querySelector('select.denhan-tt');
      if (sel) {
        sel.value = chk.checked ? 'dathu' : 'chua';
        _styleDenhanSel(sel, chk.checked);
      }
    }
  }
}
function _styleDenhanSel(sel, isDaThu) {
  sel.style.border = '1.5px solid ' + (isDaThu ? 'var(--red)' : 'var(--gray-300)');
  sel.style.background = isDaThu ? '#fde8e6' : '#fff';
  sel.style.fontWeight = isDaThu ? '700' : '500';
  sel.style.color = isDaThu ? 'var(--red)' : 'var(--gray-700)';
}
function setDenhanTrangThai(r, sel) {
  const k = denhanKey(r);
  if (!DATA.denhanStatus[k]) DATA.denhanStatus[k] = {};
  const isDaThu = sel.value === 'dathu';
  DATA.denhanStatus[k].dathu = isDaThu;
  DATA.denhanStatus[k].ts = Date.now();
  markUnsaved();
  const tr = sel.closest('tr');
  if (tr) {
    tr.classList.toggle('row-da-thu', isDaThu);
    _styleDenhanSel(sel, isDaThu);
    // Đồng bộ checkbox ✅ THU
    const chk = tr.querySelector('td:nth-child(3) input[type=checkbox]');
    if (chk) chk.checked = isDaThu;
  }
  updateBadges();
}
function setLaidongTrangThai(r, sel) {
  const k = laidongKey(r);
  if (!DATA.laidongStatus[k]) DATA.laidongStatus[k] = {};
  DATA.laidongStatus[k].dathu = (sel.value === 'dathu');
  DATA.laidongStatus[k].ts = Date.now();
  markUnsaved();
  const tr = sel.closest('tr');
  if (tr) {
    tr.classList.toggle('row-da-thu', sel.value === 'dathu');
    // Cập nhật style select ngay lập tức
    const isDaThu = sel.value === 'dathu';
    sel.style.border = '1.5px solid ' + (isDaThu ? 'var(--red)' : 'var(--gray-300)');
    sel.style.background = isDaThu ? '#fde8e6' : '#fff';
    sel.style.fontWeight = isDaThu ? '700' : '500';
    sel.style.color = isDaThu ? 'var(--red)' : 'var(--gray-700)';
    // Cập nhật ô TÊN KH
    const nameTd = tr.cells[2];
    if (nameTd) {
      const strong = nameTd.querySelector('strong');
      if (strong) {
        const nameText = strong.querySelector('span')?.textContent || strong.textContent.replace(/^✅\s*/, '');
        strong.innerHTML = isDaThu
          ? '✅ <span style="text-decoration:line-through">' + nameText + '</span>'
          : '<span>' + nameText + '</span>';
      }
    }
  }
  updateBadges();
}

/* ═══════════════════════ CHUYỂN HẠN MỨC — STATUS & CBTD TRACKING ═══════════════════════ */
function setChlmStatus(r, val) {
  const k = chlmKey(r);
  if (!DATA.chlmStatus[k]) DATA.chlmStatus[k] = {};
  DATA.chlmStatus[k].dachuyen = (val === 'dachuyen');
  DATA.chlmStatus[k].ts = Date.now();
  markUnsaved();
  // Cập nhật row style ngay lập tức — không cần re-render toàn bộ
  const sel = event?.target || document.querySelector(`[onchange*="setChlmStatus"][onchange*="${r[0]}"]`);
  if (sel) {
    const tr = sel.closest('tr');
    const isDaChuyen = val === 'dachuyen';
    if (tr) tr.className = isDaChuyen ? 'row-da-chuyen' : '';
    sel.style.border     = '1.5px solid ' + (isDaChuyen ? 'var(--red)' : 'var(--gray-300)');
    sel.style.background = isDaChuyen ? '#fde8e6' : '#fff';
    sel.style.fontWeight = isDaChuyen ? '700' : '500';
    sel.style.color      = isDaChuyen ? 'var(--red)' : 'var(--gray-700)';
  }
  // Refresh tfoot counts
  clearTimeout(window._chlmTfootT);
  window._chlmTfootT = setTimeout(() => {
    const rows = getFilteredData('chlm');
    renderTfoot('chlm', rows);
    const countEl = $('count-chlm');
    if (countEl) countEl.textContent = fmtNum(rows.length);
  }, 200);
  updateBadges();
}

function chlmToggleCBTD() {
  const btn = $('chlm-cbtd-track-btn');
  const cbSel = $('filter-chlm-cbtd');
  if (!btn || !cbSel) return;
  const isActive = btn.classList.contains('active');
  if (isActive) {
    // Tắt: bỏ lọc → tất cả CBTD
    btn.classList.remove('active');
    cbSel.value = '';
  } else {
    // Bật: lọc theo DEFAULT_CBTD
    btn.classList.add('active');
    if ([...cbSel.options].some(o => o.value === DEFAULT_CBTD)) cbSel.value = DEFAULT_CBTD;
  }
  filterTable('chlm');
}

function chlmApplyTrackButton() {
  const btn   = $('chlm-cbtd-track-btn');
  const cbSel = $('filter-chlm-cbtd');
  const lbl   = $('chlm-cbtd-track-label');
  if (!btn || !cbSel) return;
  if (lbl) lbl.textContent = DEFAULT_CBTD;
  // Theo dõi TẤT CẢ CBTD mặc định (nút tắt sẵn; người dùng tự bật để lọc riêng)
  cbSel.value = '';
  btn.classList.remove('active');
}
function setNote(key, r, val) {
  const k = key === 'denhan' ? denhanKey(r) : laidongKey(r);
  const bucket = key === 'denhan' ? DATA.denhanStatus : DATA.laidongStatus;
  if (!bucket[k]) bucket[k] = {};
  bucket[k].note = val;
  bucket[k].ts = Date.now();
  markUnsaved();
}

/* ───────── P05/P06: thẻ KPI đầu Bảng điều khiển (đề án 8.1, mockup H.10/H.12) — dùng CHUNG engine TD.metrics với các bảng bên dưới ───────── */
function tdKpiStrip() {
  const pg = document.getElementById('page-dashboard'); if (!pg) return;
  const rows = (typeof getDashFilteredData === 'function' ? getDashFilteredData() : DATA.qltd || []).filter(isActualCreditRow);
  let d = document.getElementById('td-kpi-strip');
  if (!d) {
    d = document.createElement('div'); d.id = 'td-kpi-strip';
    const ref = document.getElementById('td-warn-strip') || document.getElementById('td-doisoat-strip');
    pg.insertBefore(d, ref ? ref.nextSibling : pg.firstChild);
  }
  if (!rows.length) { d.style.display = 'none'; return; } d.style.display = '';
  const S = TD.metrics.summarize(rows, { today: todayMidnight(), pastDue: (window.TD_PASTDUE && TD_PASTDUE.map) || {}, parseDate: parseVNDate });
  const ty = v => (Math.abs(v) >= 1e9 ? (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ' : Math.round(v / 1e6).toLocaleString('vi-VN') + ' tr');
  const x2 = S.byNhom.filter(g => /[2-5]$/.test(g.key)).reduce((s, g) => s + g.duno, 0);
  let per = []; try { const sn = []; (_archiveReportList || []).forEach(x => { if (x && x.autoDaily && x.dayKey && Array.isArray(x.reportData)) sn.push(x); }); per = TD.trend.build(sn, TD.metrics.summarize); } catch (e) {}
  const vals = per.map(p => p.totals.duno), last = vals.length ? vals[vals.length - 1] : 0, prev = vals.length > 1 ? vals[vals.length - 2] : null;
  let spark = '';
  if (vals.length >= 2) {
    const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), W = 120, H = 32, pts = vals.map((v, i) => (i * W / (vals.length - 1)).toFixed(1) + ',' + (H - 3 - (mx === mn ? 0.5 : (v - mn) / (mx - mn)) * (H - 6)).toFixed(1));
    spark = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="32" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="#0d5c1e" stroke-width="2" points="' + pts.join(' ') + '"/></svg>';
  }
  const tile = (go, ico, lbl, val, sub, cls) => '<button type="button" class="td-kpi ' + (cls || '') + '" onclick="showPage(\'' + go + '\')" title="Mở ' + escapeHtml(lbl) + '"><span class="td-kpi-l">' + ico + ' ' + escapeHtml(lbl) + '</span><span class="td-kpi-v">' + val + '</span><span class="td-kpi-s">' + sub + '</span></button>';
  const dv = prev != null ? vals[vals.length - 1] - prev : null;
  d.innerHTML =
    tile('qltd', '💰', 'Tổng dư nợ', ty(S.totals.duno), (dv == null ? S.totals.hs.toLocaleString('vi-VN') + ' hồ sơ' : (dv >= 0 ? '▲ ' : '▼ ') + ty(Math.abs(dv)) + ' so kỳ trước')) +
    tile('khachhang', '👥', 'Khách hàng', S.totals.kh.toLocaleString('vi-VN'), S.totals.hs.toLocaleString('vi-VN') + ' hồ sơ vay') +
    tile('canhbao', '🛡️', 'Nhóm 2–5', ty(x2), (S.totals.duno ? (x2 / S.totals.duno * 100).toFixed(2) : '0') + '% dư nợ', x2 ? 'warn' : '') +
    tile('denhan', '⏰', 'Quá hạn', S.overdue.length.toLocaleString('vi-VN') + ' khoản', ty(S.overdueDN), S.overdue.length ? 'bad' : '') +
    '<button type="button" class="td-kpi td-kpi-trend" onclick="showPage(\'xuhuong\')" title="Mở Xu hướng nhiều kỳ"><span class="td-kpi-l">📈 Xu hướng ' + (per.length ? per.length + ' kỳ' : '') + '</span>' + (spark || '<span class="td-kpi-s">Cần ≥2 mốc đã lưu</span>') + '</button>';
}
window.tdKpiStrip = tdKpiStrip;
