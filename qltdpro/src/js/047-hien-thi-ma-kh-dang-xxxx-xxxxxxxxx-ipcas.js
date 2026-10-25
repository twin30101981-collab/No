
/* ═══════════════════════════════════════════════════════════════
   TKSTT MAPPING — từ TK_so_tap.xlsx (82 mappings)
   Key: "<mã KH đã chuẩn hoá chỉ còn số>|<tên KH UPPERCASE>"
   Value: [số tập, số tài khoản, loại (KD/TD)]
   Chỉ áp dụng khi khớp ĐÚNG CẢ tên và mã (lệnh thực thi)
   ═══════════════════════════════════════════════════════════════ */
const TKSTT_MAP = (function(){
  const raw = [];
  const m = {};
  for (const r of raw) m[r[0] + "|" + r[1]] = { sotap: r[2], sotk: r[3], loai: r[4] };
  return m;
})();

function normMaDigits(ma){ return String(ma||"").replace(/[^0-9]/g, ""); }
// Hiển thị mã KH dạng xxxx-xxxxxxxxx (IPCAS format)
function fmtMaKH(v) {
  const s = String(v||"").trim();
  if (s.length === 13 && /^\d{13}$/.test(s)) return s.slice(0,4) + "-" + s.slice(4);
  return s; // giữ nguyên nếu không phải 13 chữ số
}
function normNameUpper(n){ return String(n||"").trim().replace(/\s+/g, " ").toUpperCase(); }
function lookupTKSTT(ma, ten){
  const k = normMaDigits(ma) + "|" + normNameUpper(ten);
  return TKSTT_MAP[k] || null;
}
// Áp dụng mapping cho toàn bộ DATA.qltd — set r[21]=sotk, r[22]=sotap
function applyTKSTTMapping(){
  let matched = 0;
  DATA.qltd.forEach(r => {
    const m = lookupTKSTT(r[0], r[1]);
    if (m) {
      r[21] = m.sotk;   // SỐ TÀI KHOẢN
      r[22] = m.sotap;  // SỐ TẬP
      matched++;
    } else {
      // Preserve if user has edited manually; otherwise set empty
      if (r[21] === undefined) r[21] = "";
      if (r[22] === undefined) r[22] = "";
    }
  });
  console.info("[TKSTT] Matched", matched, "of", DATA.qltd.length, "records");
  return matched;
}

// ═══ Req 4: Tự động cấp SỐ TẬP cho KH phát sinh mới ═══
// KD pool (ngắn hạn + thấu chi) dùng đếm riêng, TD pool (trung/dài hạn) đếm riêng.
function getSotapPool(loaiVay) {
  if (!loaiVay) return 'KD';
  if (/trung\s*hạn|dài\s*hạn/i.test(loaiVay)) return 'TD';
  return 'KD';
}
function getMaxSotap(pool) {
  // Tính max số tập hiện có trong DATA.qltd theo pool tương ứng
  let max = 0;
  (DATA.qltd || []).forEach(r => {
    if (!r[22]) return;
    const rowPool = getSotapPool(r[13]);
    if (rowPool !== pool) return;
    const n = parseInt(String(r[22]).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  // Cross-check với TKSTT_MAP (tránh conflict với mapping gốc)
  for (const key in TKSTT_MAP) {
    const m = TKSTT_MAP[key];
    if (m.loai === pool) {
      const n = parseInt(String(m.sotap).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max;
}
function nextSotap(loaiVay) {
  const pool = getSotapPool(loaiVay);
  return String(getMaxSotap(pool) + 1);
}

// ═══════════════════════════════════════════════════════════════
// TKSTT PLACEHOLDER ROWS — KH từ TK_so_tap.xlsx nhưng chưa có trong IPCAS
// Thêm vào cuối DATA.qltd với thông tin sẵn có (số tập, số TK, tên, mã)
// HMTD / SỐ TIỀN VAY / DƯ NỢ / SỐ TIỀN GN / TIỀN LÃI = 0
// CBTD = CBTD A, Phòng ban = Hội Sở
// ═══════════════════════════════════════════════════════════════
// ✅ PATCH v20: Xóa 3 placeholder KH đã tất toán (dư nợ = 0, không còn trong IPCAS):
// (đã ẩn) (3201000000000), (đã ẩn) (3201000000000), (đã ẩn) (3201000000000)
// Chỉ giữ lại KH còn hoạt động: (đã ẩn)
const TKSTT_PLACEHOLDERS = JSON.parse(`[]`);

// Hàm thêm placeholder rows vào DATA.qltd (gọi sau khi load dữ liệu gốc)
// Dùng cờ _tkstt_placeholder=true để đánh dấu row — KHÔNG coi là KH mới khi cấp sotap
function injectTKSTTPlaceholders() {
  // Nếu đã có (vd. từ backup), bỏ qua để tránh duplicate
  const existingKeys = new Set();
  DATA.qltd.forEach(r => {
    if (r && r[0] && r[1]) {
      existingKeys.add(normMaDigits(r[0]) + '|' + normNameUpper(r[1]));
    }
  });
  let added = 0;
  TKSTT_PLACEHOLDERS.forEach(ph => {
    const key = normMaDigits(ph[0]) + '|' + normNameUpper(ph[1]);
    if (existingKeys.has(key)) return;
    // Clone to avoid mutation
    const row = ph.slice();
    // Đánh dấu ngầm: đây là placeholder từ TKSTT, không trigger auto-increment sotap
    // Dùng property riêng trên array (non-standard but works)
    Object.defineProperty(row, '_tkstt_placeholder', { value: true, enumerable: false });
    DATA.qltd.push(row);
    added++;
  });
  if (added > 0) console.info('[TKSTT] Added', added, 'placeholder rows from TK_so_tap file');
  return added;
}

