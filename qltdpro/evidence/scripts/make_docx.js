const fs = require('fs');
const path = require('path');
const d = require('docx');
const { items, DOT, sumBy } = require('./backlog.js');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, ImageRun, PageBreak, Footer, Header, PageNumber, LevelFormat, BorderStyle, PageOrientation,
  TableLayoutType,
} = d;

const OUT = process.argv[2];
const IMG = path.join(__dirname, 'img');
const FONT = 'Arial';
const CW = 9638; // A4 portrait content width (2 cm margins)
const CWL = 14570; // landscape
const C = { brand: '0F5132', navy: '16324F', head: 'E8F0EC', alt: 'F7F9FA', bad: 'B42318', warn: '8A5A0B', good: '1E7B4A', muted: '6B7785', note: 'FFF8DB', info: 'EAF2FB' };

// ---------- helpers ----------
function runs(text, base = {}) {
  // **bold** markup
  const out = [];
  String(text).split(/(\*\*[^*]+\*\*)/).forEach((s) => {
    if (!s) return;
    if (s.startsWith('**')) out.push(new TextRun({ text: s.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: s, ...base }));
  });
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), spacing: { after: 100, line: 276 }, alignment: o.align, ...(o.p || {}) });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: true });
const H1n = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, lvl = 0) => new Paragraph({ numbering: { reference: 'bul', level: lvl }, children: runs(t), spacing: { after: 60, line: 264 } });
const N = (t) => new Paragraph({ numbering: { reference: 'num', level: 0 }, children: runs(t), spacing: { after: 60, line: 264 } });
const PB = () => new Paragraph({ children: [new PageBreak()] });

function cell(text, w, o = {}) {
  const paras = String(text).split('\n').map((line) => new Paragraph({
    children: runs(line, { size: o.size || 18, bold: o.bold, color: o.color }),
    alignment: o.align, spacing: { after: 0, line: 252 },
  }));
  return new TableCell({
    children: paras, width: { size: w, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
  });
}
function table(headers, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const num = o.num || [];
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: o.headFill || C.head, size: 18, align: num.includes(i) ? AlignmentType.RIGHT : undefined })) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((v, i) => {
        let color; let bold;
        if (o.status && i === o.status) {
          if (/^P0|ĐỎ|Hỏng|✗/.test(v)) { color = C.bad; bold = true; } else if (/^P1|⚠/.test(v)) { color = C.warn; bold = true; } else if (/^✓|^OK/.test(v)) { color = C.good; bold = true; }
        }
        return cell(v, widths[i], { fill: ri % 2 ? C.alt : undefined, align: num.includes(i) ? AlignmentType.RIGHT : undefined, color, bold, size: o.size });
      }) })),
    ],
  });
}
function box(lines, fill = C.note, w = CW) {
  return new Table({
    width: { size: w, type: WidthType.DXA }, columnWidths: [w],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: w, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill },
      margins: { top: 110, bottom: 110, left: 160, right: 160 },
      children: lines.map((l) => new Paragraph({ children: runs(l, { size: 20 }), spacing: { after: 50, line: 264 } })),
    })] })],
  });
}
let figNo = 0;
function fig(file, caption, widthPx = 640) {
  const buf = fs.readFileSync(path.join(IMG, file));
  // read jpeg size
  let w = 0; let h = 0; let i = 2;
  while (i < buf.length) { if (buf[i] !== 0xFF) { i++; continue; } const m = buf[i + 1]; const len = buf.readUInt16BE(i + 2); if (m >= 0xC0 && m <= 0xC3) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; } i += 2 + len; }
  const width = Math.min(widthPx, w); const height = Math.round((h * width) / w);
  figNo += 1;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, keepNext: true, children: [new ImageRun({ type: 'jpg', data: buf, transformation: { width, height }, altText: { title: caption, description: caption, name: file } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: `Hình ${figNo}. ${caption}`, italics: true, size: 18, color: C.muted })] }),
  ];
}
const sp = () => new Paragraph({ children: [], spacing: { after: 80 } });
const fmt = (n) => n.toLocaleString('vi-VN');

// ---------- data ----------
const months = [
  ['31/12/2025', 'xlsx', 3684, 1838, '1.992.328.798.064', 0], ['31/01/2026', 'xlsx', 3650, 1827, '1.993.239.268.588', 1],
  ['28/02/2026', 'xlsx', 3644, 1816, '1.961.130.280.676', 2], ['31/03/2026', 'xlsx', 3694, 1831, '2.027.414.801.180', 1],
  ['30/04/2026', 'xlsx', 3667, 1822, '2.003.499.665.557', 0], ['31/05/2026', 'xlsx', 3642, 1816, '2.009.209.975.285', 10],
  ['30/06/2026', 'XLS', 3763, 1844, '2.064.987.992.653', 1], ['31/07/2026', 'XLS', 3847, 1861, '2.087.197.590.749', 1],
  ['31/08/2026', 'XLS', 3822, 1857, '2.147.734.201.142', 2], ['30/09/2026', 'XLS', 3881, 1880, '2.180.310.962.058', 1],
  ['20/10/2026', 'XLS', 3918, 1871, '2.160.375.016.661', 4],
];
const coreCost = sumBy((i) => i.dot < 5); const allCost = sumBy(() => true);

const S = []; // body

// ---------- 0. Bìa ----------
S.push(
  new Paragraph({ spacing: { before: 1800, after: 120 }, children: [new TextRun({ text: 'ĐỀ ÁN NÂNG CẤP', bold: true, size: 30, color: C.muted })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'QUẢN LÝ TÍN DỤNG PRO (QLTD PRO)', bold: true, size: 52, color: C.brand })] }),
  new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: 'Phân tích sâu điểm nghẽn, lỗi gốc rễ, độ đồng nhất số liệu, giao diện – điều hướng, tối ưu desktop; đề xuất nâng cấp, tính năng mới, mockup và lộ trình thực hiện', size: 26 })] }),
  table(['Mục', 'Nội dung'], [
    ['Ứng dụng khảo sát', 'QLTD_PRO_v2026-10-20_v22.3-FIX-GIA-DAT.html (13,98 MB · 59.535 dòng)\nSHA-256: e51038ee…7fbb37'],
    ['Dữ liệu kèm theo', 'Dư nợ IPCAS 11 kỳ (31/12/2025 → 20/10/2026) · Sao kê TSBĐ 30/09 và 20/10/2026 · Giá đất 2026 (PL01, PL02, NQ 38)'],
    ['Phiên bản đề án', 'v1.0 · ngày 21/10/2026 · phiên S0 (khảo sát, chưa sửa mã)'],
    ['Trạng thái', 'CHỜ DUYỆT'],
    ['Quy trình áp dụng', 'Skill web-app-repair-upgrade v3.2.0 – chế độ 1 (S0), Phụ lục G (10 tầng) và H (đề án)'],
    ['Mức kiểm chứng đã dùng', 'V3 (Playwright + Chromium thật, 3 kích thước màn hình, nhập thử tệp IPCAS thật) và V2 (Node phân tích mã, tính trên dữ liệu)'],
  ], [2600, 7038]),
  sp(),
  box(['**Lưu ý bảo mật:** đề án chỉ chứa số tổng hợp. Mọi ảnh chụp app đã làm mờ vùng dữ liệu khách hàng; mọi mockup dùng tên giả “KH Mẫu …”. Tệp HTML gốc và dữ liệu Excel KHÔNG được đóng vào gói bàn giao.'], C.info),
);

// ---------- Mục lục tĩnh ----------
S.push(H1('Mục lục'));
['1. Tóm tắt điều hành', '2. Phạm vi, giả định và độ phủ phân tích', '3. Hiện trạng kỹ thuật', '4. Kiểm kê chức năng', '5. Phát hiện và nguyên nhân gốc rễ', '6. Giao diện, bố cục, điều hướng, tối ưu desktop', '7. Dữ liệu đầu vào, hiệu năng, offline, bảo mật', '8. Đề xuất nâng cấp, tính năng mới và mockup', '9. Lộ trình nâng cấp', '10. Chiến lược kiểm chứng', '11. Vận hành nhiều phiên và bàn giao', '12. Rủi ro và đường lui', '13. Tiêu chí nghiệm thu tổng', '14. Quyết định cần bạn chốt', '15. Phụ lục A–E'].forEach((t) => S.push(P(t, { p: { spacing: { after: 70 } } })));

// ---------- 1. Tóm tắt ----------
S.push(H1('1. Tóm tắt điều hành'));
S.push(P('**Hiện trạng.** QLTD PRO là ứng dụng HTML một tệp chạy offline cho Phòng KHKD, gồm 21 trang (dư nợ, đến hạn, lãi đọng, TSBĐ, giá đất, hồ sơ vay…). Tệp đã lớn tới 13,98 MB với 74 khối script, khoảng 40 lớp vá chồng lên nhau qua các phiên bản v13 → v22.3. Tổng dư nợ và số khách hàng trên Bảng điều khiển khớp tệp gốc khi nhập được, nhưng nhiều luồng khác cho số sai hoặc không chạy.'));
S.push(P('**5 phát hiện nghiêm trọng nhất (đã xác minh trên trình duyệt thật):**'));
S.push(B('**Nhập tệp .XLS và mọi chức năng xuất Excel đang hỏng:** thư viện SheetJS nhúng không biên dịch được vì một khối CSS bị chèn nhầm vào giữa mã thư viện. Nhập 20.10.2026.XLS báo “XLSX không có sẵn (bundle offline lỗi)”.'));
S.push(B('**Nhập tệp .xlsx làm sai toàn bộ lãi suất:** nhập 31.05.2026.xlsx cho 3.642/3.642 khoản lãi suất **19%** (thực tế 9%: 1.322 khoản; 8,5%: 750; 9,5%: 476…). Đây là gốc rễ của chuỗi bản vá “1900% / 19%”.'));
S.push(B('**Lãi suất bị “chữa” bằng bảng cứng ngày 04/06/2026 mỗi lần mở app:** sau khi tải lại, phần lớn khoản trở về đúng **chỉ vì trùng bảng cũ**; 52 khoản (≈ 25,6 tỷ đồng dư nợ) vẫn giữ 19%. Lãi suất đổi sau tháng 6 hoặc sửa tay sẽ bị ghi đè.'));
S.push(B('**Dữ liệu cứng và dữ liệu cá nhân thật nằm sẵn trong tệp** (TSBĐ ngày 18/08: 2.243 tài sản; 8 khoản quá hạn ngày 23/06; số liệu đến hạn; mốc lưu trữ cũ) và tự chen vào số liệu trên máy mới.'));
S.push(B('**Trang lõi Hồ sơ vay (HSVV, ~560 KB) cùng 5 trang khác không có lối vào từ menu;** số liệu cùng một chỉ tiêu được tính ở ≥ 6 nơi khác nhau (đếm khách hàng theo tên ở nơi này, theo mã ở nơi khác – lệch ~13%).'));
S.push(P('**Hướng nâng cấp.** Sửa theo thứ tự: (1) ổn định dữ liệu → (2) một nguồn sự thật cho số liệu (“ngày dữ liệu”, một engine KPI, trang Đối soát) → (3) giao diện desktop mới (một router, menu 6 nhóm, bảng thích ứng 1366/1920, điện thoại) → (4) tách mã nguồn + build ra một tệp HTML như cũ → (5) tính năng mới (Trung tâm nhập dữ liệu, Cảnh báo sớm, Khách hàng 360°, Xu hướng 11 kỳ).'));
S.push(table(['Chỉ số lộ trình', 'Giá trị'], [
  ['Số đợt / hạng mục', `5 đợt · ${items.length} hạng mục (${items.filter((i) => i.uu_tien === 'P0').length} P0, ${items.filter((i) => i.uu_tien === 'P1').length} P1, ${items.filter((i) => i.uu_tien === 'P2').length} P2, ${items.filter((i) => i.uu_tien === 'P3').length} P3)`],
  ['Chi phí ước tính (theo % ngữ cảnh một phiên)', `Đợt 1–4: ${coreCost}% · cả đợt 5: ${allCost}%`],
  ['Số phiên thực thi ước tính', 'Đợt 1–4: 5–6 phiên · thêm đợt 5: 7–8 phiên (khoảng, không phải cam kết; hiệu chỉnh sau 2 hạng mục đầu)'],
  ['Mốc dùng được giữa chừng', 'M1 số liệu đúng (sau đợt 1) · M2 báo cáo khớp (sau đợt 2) · M3 giao diện mới · M4 kiến trúc mới'],
], [3800, 5838]));
S.push(sp());
S.push(box(['**Cần bạn duyệt:** ① Duyệt, bắt đầu HM-01 · ② Điều chỉnh (nêu rõ) · ③ Dừng. Ba quyết định cần chốt ở Mục 14.'], C.note));

// ---------- 2. Phạm vi ----------
S.push(H1('2. Phạm vi, giả định và độ phủ phân tích'));
S.push(H2('2.1. Mục tiêu'));
['Số liệu trên mọi màn hình và báo cáo khớp tệp gốc IPCAS/TSBĐ, có bằng chứng đối soát.', 'Loại bỏ lỗi gốc rễ gây sai, mất dữ liệu; chặn tái diễn bằng kiểm thử.', 'Giao diện, cây menu, bố cục tối ưu cho PC 1920×1080 và laptop 1366×768, dùng được trên điện thoại.', 'Giữ cách dùng hiện tại: mở một tệp HTML, chạy offline; có thêm tiện ích khi có mạng.'].forEach((t) => S.push(B(t)));
S.push(H2('2.2. Trong / ngoài phạm vi'));
S.push(table(['Trong phạm vi', 'Ngoài phạm vi (không làm nếu chưa duyệt thêm)'], [
  ['Toàn bộ 21 trang, luồng nhập dư nợ/TSBĐ/giá đất, lưu trữ, sao lưu, xuất báo cáo', 'Kết nối trực tiếp IPCAS / máy chủ ngân hàng'],
  ['Giao diện desktop + điện thoại, điều hướng, phím tắt', 'Đăng nhập nhiều người dùng, phân quyền phía máy chủ'],
  ['Tách mã nguồn và công cụ build (đầu ra vẫn 1 tệp HTML)', 'Đổi sang framework (React/Vue…)'],
  ['Tính năng mới ở Đợt 5 sau khi được duyệt từng mục', 'Thay đổi quy định nghiệp vụ (cách phân nhóm nợ, công thức giá đất) khi chưa có xác nhận'],
], [4819, 4819]));
S.push(H2('2.3. Ràng buộc và giả định'));
['Người dùng chủ yếu dùng PC 1920×1080 và laptop 1366×768, có dùng điện thoại (đã xác nhận).', 'Chạy chủ yếu offline bằng tệp HTML trên Chrome/Edge; vẫn cần chức năng khi có mạng (đã xác nhận).', 'Giả định: định dạng tệp IPCAS giữ nguyên 87 cột như 11 kỳ đã cung cấp; sao kê TSBĐ 39 cột.', 'Giả định: “ngày dữ liệu” lấy từ tên tệp (dd.mm.yyyy) là đúng ngày chốt số liệu.', 'Giả định: mã khách hàng nằm ở cột “brcd”, mã chi nhánh ở cột “custseq” (tên cột IPCAS bị đảo nghĩa – đã kiểm trên cả 11 tệp).'].forEach((t) => S.push(B(t)));
S.push(H2('2.4. Độ phủ phân tích'));
S.push(table(['Vùng', 'Độ phủ', 'Ghi chú'], [
  ['74 khối script', 'Đọc kỹ vùng lõi · lấy mẫu vùng vá', 'Cả 74 khối đã được biên dịch thử bằng Node; vendor (SheetJS, docx, mammoth…) chỉ kiểm parse'],
  ['Luồng nhập dư nợ, lưu trữ, KPI', 'Đọc kỹ + chạy thật (V3)', 'Nhập 31.05.2026.xlsx và 20.10.2026.XLS trên Chromium'],
  ['TSBĐ, giá đất, hồ sơ vay', 'Đọc kỹ đường dữ liệu · lấy mẫu giao diện', 'HSVV (560 KB) chủ yếu lấy mẫu'],
  ['CSS / bố cục', 'Rà tĩnh + ảnh chụp 1920/1366/390 + chế độ tối', ''],
  ['11 tệp dư nợ, 2 tệp TSBĐ, 3 tài liệu giá đất', 'Đọc toàn bộ cấu trúc, tính tổng', 'PDF NQ 38 là ảnh scan, không có lớp chữ – chưa đọc nội dung'],
], [2700, 3000, 3938]));

// ---------- 3. Hiện trạng ----------
S.push(H1('3. Hiện trạng kỹ thuật'));
S.push(H2('3.1. Nhận diện ứng dụng'));
S.push(table(['Hạng mục', 'Hiện trạng'], [
  ['Loại app', 'HTML5 một tệp, không có bước build; mở bằng file:// trên Chrome/Edge'],
  ['Kích thước', '13,98 MB · 59.535 dòng · 74 khối <script> · ~62.000 phần tử DOM sau khi tải'],
  ['Thư viện nhúng', 'SheetJS 0.20.3 (hỏng), docx, docxtemplater, PizZip, JSZip, FileSaver, mammoth – tải trễ bằng Blob sau lần vẽ đầu'],
  ['Lưu trữ', 'IndexedDB QLTDProDB v3 (snapshots + chunks 2.000 dòng), TWIN_Archive_v1, QLTDProTSBD; localStorage dự phòng và nhiều khoá giao diện'],
  ['Mô hình dữ liệu dư nợ', 'DATA.qltd = mảng các mảng (r[0] mã KH … r[8] lãi suất, r[11] dư nợ, r[17] phòng, r[18] nhóm nợ, r[20] số khoản vay)'],
  ['Lịch sử phiên bản', 'Ghi v1.7 (chân menu), v19 (hướng dẫn), v22.3 (tên tệp) – không thống nhất'],
], [2400, 7238]));
S.push(H2('3.2. Kiến trúc và luồng dữ liệu hiện tại'));
S.push(P('Dữ liệu đi qua 3 bộ đọc khác nhau (CSV, .xlsx tự viết, .xls dùng SheetJS), chuẩn hoá bằng nhiều phiên bản hàm số/ngày, lưu IndexedDB, rồi lại bị “chữa” khi khởi động bằng dữ liệu cứng, trước khi được ≥ 6 nơi tính KPI theo cách riêng (Hình 1).'));
S.push(...fig('d_flow.jpg', 'Luồng dữ liệu hiện tại (trên) và đề xuất (dưới)'));
S.push(H2('3.3. Lớp vá chồng (monkey-patch)'));
S.push(P('Hàm chuyển trang showPage được gán lại 10 lần ở 10 vị trí; mỗi lần chuyển trang kích hoạt khoảng 5 bộ hẹn giờ và 8 MutationObserver. Lớp bọc tại L11840 không có tác dụng vì chạy trước khi hàm gốc tồn tại; các lớp trong khối trì hoãn bgdat (L42638, L46828) lại thành lớp ngoài cùng dù nằm trước trong tệp.'));
S.push(table(['Thứ tự', 'Vị trí', 'Thêm hành vi'], [
  ['gốc', 'L27795', 'showPage gốc'], ['1', 'L50251', 'hsvInitPage'], ['2', 'L50330 (DOMContentLoaded)', 'nút toàn màn hình (trùng lệnh gốc)'],
  ['3', 'L51386 (DOMContentLoaded)', 'ctkhInit (cờ _ctkhWrapped mất tác dụng khi bị bọc tiếp)'], ['4', 'L51612', 'injectPrintButtons sau 80 ms'],
  ['5', 'L51977', 'scanTables sau 200 ms (desktop-patch)'], ['6', 'L52890', 'bật/tắt thanh lọc sau 200 ms'], ['7', 'L55574', 'TDCMP trên trang tranop'],
  ['8', 'L42638 (bgdat)', 'ufsInit sau 200 ms, bỏ giá trị trả về'], ['9', 'L46828 (bgdat)', 'fhs init, không kiểm tra hàm gốc'], ['—', 'L11840', 'không có tác dụng (chạy quá sớm)'],
], [1100, 3000, 5538]));

// ---------- 4. Kiểm kê chức năng ----------
S.push(H1('4. Kiểm kê chức năng'));
S.push(table(['Trang (id)', 'Nhãn menu → tiêu đề', 'Lối vào', 'Tình trạng'], [
  ['dashboard', 'Tổng quan → “Dashboard – Tổng quan”', 'Menu', '✓ Chạy; bảng chỉ dùng ~40% bề ngang 1920'],
  ['ctkh', 'Chỉ tiêu kế hoạch', 'Menu', '✓ Chạy; modal có thể bị cắt (content-visibility) [GT]'],
  ['qltd / kd / td', 'Dư nợ / Ngắn hạn / Trung-dài hạn → “QUẢN LÝ TÍN DỤNG / HẠN MỨC / TIÊU DÙNG”', 'Menu', '⚠ Nhãn lệch tiêu đề; bảng 20 cột rộng 2.123 px'],
  ['denhan', 'Nợ đến hạn → “LỊCH TRẢ NỢ”', 'Menu', '⚠ Tính theo đồng hồ máy; số tiền đến hạn dựa bảng cứng'],
  ['laidong, chlm, tranop', 'Lãi đọng · Chuyển hạn mức · Trả nợ/Xuất TS', 'Menu', '✓ Chạy'],
  ['phidv', 'Giải ngân → “PHÍ GIẢI NGÂN”', 'Menu', '⚠ Nhãn lệch'],
  ['khmoi', 'Khách hàng mới', 'Menu', '✓ Chạy'],
  ['baocao', 'Báo cáo IPCAS', 'Menu + Tiện ích', '⚠ Bỏ dòng CBTD chưa ánh xạ → tổng thấp hơn Dashboard'],
  ['tsbd', 'Tài sản bảo đảm', 'Menu', '⚠ Nạp sẵn seed 18/08 (2.243 TS) trên máy mới; cộng lặp dư nợ'],
  ['giadat', 'Giá đất & hệ số K, H', 'Menu', '⚠ Khoá NQ38 thiếu tên đường (54 khoá trùng); font/kiểu riêng'],
  ['archive', 'Lưu trữ file', 'Menu + 5 nơi khác', '⚠ Mốc nhúng sẵn có timestamp lệch 1 năm'],
  ['hsvv', '(Hồ sơ vay – lõi, ~560 KB)', 'Chỉ qua huy hiệu trong bảng QLTD', 'P0 Không có lối vào cho hồ sơ mới'],
  ['fhs, hmtd, tieudung, camco', 'Mẫu biểu', 'Không có', 'P0 Không truy cập được'],
  ['qcamco', '“🚧 Đang xây dựng”', 'Không có', 'Mã dở dang'],
  ['Modal', 'Auto-Sync IPCAS · Thông báo nợ · Hướng dẫn HDSD · Tiện ích', '3 / 1 / chỉ từ hsvv / topbar', '⚠ Trùng lối vào; HDSD gần như mồ côi'],
], [1700, 3300, 1700, 2938], { status: 3 }));

// ---------- 5. Phát hiện ----------
S.push(H1('5. Phát hiện và nguyên nhân gốc rễ'));
S.push(P('Nhãn: **[XM-V3]** đã tái hiện trên Chromium thật; **[XM-V2]** đã xác minh bằng đọc mã/chạy Node/tính trên dữ liệu; **[GT]** giả thuyết cần kiểm thêm. Vị trí “L…” là số dòng trong tệp 59.535 dòng.'));
S.push(H2('5.1. Mức P0 – sai, mất số liệu hoặc chức năng lõi hỏng'));
const p0 = [
  ['P0-1', 'Nhập .XLS và xuất Excel hỏng; XLSX = undefined; pageerror “Invalid or unexpected token” ở mọi lần tải', '[XM-V3]', 'Khối <style id="td-global-font"> và "fix-nut-noi-density" bị chèn vào chuỗi JS yb=\'<html>…\' trong SheetJS (byte ~2.072.116, L11304–11306). Hệ quả phụ: font 13px và bản sửa density chưa từng có hiệu lực.', 'Nhập .xls, 51 điểm gọi XLSX, xuất Excel'],
  ['P0-2', 'Nhập .xlsx: mọi khoản 19%; số < 100.000 thành 0', '[XM-V3]', 'parseXLSX tự viết (L32108–32116) đổi mọi số 1–100.000 thành chuỗi ngày (8,5 → “1900-01-07”); coercePercent đọc 1900 → /100 → 19%. Không kiểm tra định dạng ô.', 'Lãi suất, lãi, số dư nhỏ, nhóm nợ dạng số'],
  ['P0-3', 'Lãi suất bị ghi đè theo bảng 04/06/2026 khi khởi động; 52 khoản (≈25,6 tỷ) vẫn 19% sau tải lại', '[XM-V3]', 'Cờ _rateManual/_sprdRaw gắn lên mảng bị mất khi JSON.stringify; __autoFixRateX100 (L24646) và healOnLoad (L24433) chạy mỗi lần mở app, ghi đè r[8] theo __IPCAS_SPRD_PIPE (3.682 khoản, L24520) rồi lưu.', 'Lãi, tính lãi quá hạn, báo cáo lãi suất'],
  ['P0-4', 'Máy mới tự có 2.243 TS (18/08), 8 khoản quá hạn (23/06), số đến hạn cũ', '[XM-V3]', 'Seed nhúng: tsbd-seed-data (L58459, ~1,4 MB) ghi vào IndexedDB như “current”; TD_PASTDUE (L55952–55994) áp lại khi localStorage trống; denhan-amt-data (L23238).', 'Dashboard quá hạn, TSBĐ, đến hạn; lộ dữ liệu cá nhân'],
  ['P0-5', 'Một chunk IndexedDB lỗi làm mất dòng vĩnh viễn', '[XM-V2]', 'idbGetChunked (L24122) bắt lỗi giải nén bằng res([]) và không so meta.length; lần lưu tự động (8 s) ghi đè. saveData dùng 5 giao dịch rời; chunk thừa không xoá.', 'Toàn bộ dữ liệu dư nợ'],
  ['P0-6', 'Hồ sơ vay, trạng thái CHLM bị ghi {} sau tải lại', '[XM-V2]', 'loadData nhánh IndexedDB (L24313–24324) không khôi phục hosovay, chlmStatus, hdvSnapshots, hdvCurrentPeriod; lần lưu kế tiếp ghi rỗng. exportBackup (L24856) thiếu các trường này; TD_BACKUP (schema 42) là mã chết nằm trong template in.', 'Hồ sơ vay, CHLM, sao lưu'],
  ['P0-7', 'Trang lõi HSVV và fhs/hmtd/tieudung/camco/qcamco không vào được từ menu', '[XM-V2]', 'Không có mục menu/data-page; hsvTreeToggle trỏ tới #nav-hsv-children không tồn tại; lối vào duy nhất là huy hiệu hồ sơ đã liên kết.', 'Lập hồ sơ mới, mẫu biểu, hướng dẫn'],
];
S.push(table(['Mã', 'Triệu chứng', 'Nhãn', 'Nguyên nhân gốc (vị trí)', 'Lan truyền'], p0, [700, 2300, 850, 3888, 1900], { size: 17 }));
S.push(sp());
S.push(H3('Bằng chứng nhập thử tệp thật (V3, Chromium, 21/10/2026)'));
S.push(table(['Phép thử', 'Tệp gốc', 'App', 'Kết luận'], [
  ['Nhập 31.05.2026.xlsx – phân bố lãi suất', '9%: 1.322 · 8,5%: 750 · 9,5%: 476 · 10%: 210 · 8%: 205…', '19%: 3.642/3.642 khoản', '✗ Sai toàn bộ'],
  ['Σ dư nợ / số dòng có dư nợ / số KH', '2.009.209.975.285 đ · 3.639 · 1.815', '2.009.209.975.285 đ · 3.639 · 1.815', '✓ Khớp'],
  ['Tải lại trang sau khi nhập', '—', '3.587 khoản về đúng (nhờ bảng 04/06); 52 khoản vẫn 19% (Σ dư nợ 25.567.890.134 đ)', '✗ Phụ thuộc dữ liệu cứng'],
  ['Nhập 20.10.2026.XLS', '3.918 dòng', 'Hộp thoại “Lỗi đọc file: XLSX không có sẵn (bundle offline lỗi)”', '✗ Không nhập được'],
  ['Tải trang trống', '—', 'pageerror “Failed to execute appendChild… Invalid or unexpected token” (L56348)', '✗ Lỗi mỗi lần tải'],
], [2500, 2500, 2900, 1738], { status: 3, size: 17 }));
S.push(H2('5.2. Mức P1 – số liệu lệch giữa các màn hình'));
const p1 = [
  ['P1-1', 'Cùng chỉ tiêu, nhiều cách tính', '[XM-V2]', '≥ 6 nơi tính KPI: renderDashboard (L31228), bckhAggregateData (L25521), TDCMP (L54999), snapshot ngày (L32869), TDUP5 đọc DOM (L54655), TD_AUDIT (L56151). TD_AUDIT so tổng nhóm với chính tổng đó nên luôn “đạt”.'],
  ['P1-2', 'Số khách hàng lệch ~13%', '[XM-V2]', 'Dashboard/báo cáo đếm theo mã KH; snapshot ngày/báo cáo/dữ liệu (L32869, L32989, L33047) đếm theo tên (r[1]). Mốc 07/08 nhúng: 1.851 theo mã vs 1.608 theo tên.'],
  ['P1-3', 'Báo cáo IPCAS thấp hơn Dashboard', '[XM-V2]', 'bckhAggregateData bỏ dòng có CBTD chưa ánh xạ (L25556), chỉ ghi vào window._bckhUnmapped. Bảng I: loại vay không khớp regex bị loại khỏi dòng con nhưng vẫn ở tổng, chân bảng vẫn ghi 100%.'],
  ['P1-4', 'Đến hạn/quá hạn theo đồng hồ máy', '[XM-V2]', 'todayMidnight() (L31234) thay vì ngày của tệp; mở tệp cũ thì mọi khoản quá ngày đáo hạn thành “quá hạn”; danh sách đến hạn lấy theo tháng hiện tại; hai tập chồng nhau.'],
  ['P1-5', 'Mốc lưu trữ sai ngày', '[XM-V2]', 'Snapshot ngày dùng new Date() (L32859) chứ không dùng ngày tệp; nhập 2 tệp cùng ngày ghi đè nhau. Regex tên tệp (L31993) không nhận “_30_06_2026”, “DUNO_18.08.2026”. _PRE_SNAPS nhúng lệch 1 năm (L34437–34440) và thiếu cột phòng/nhóm.'],
  ['P1-6', 'Top-10 KH hiển thị sai nhóm nợ', '[XM-V2]', 'Regex /d+/ thiếu dấu “\\” (L31514) → luôn bằng 0 → lấy nhóm của hợp đồng cuối thay vì nhóm xấu nhất.'],
  ['P1-7', 'Đọc số tiền sai 10⁶ lần', '[XM-V2]', 'parseNum (L54612, L55931) xoá mọi “.” và đổi “,” đầu tiên thành dấu thập phân: “300,000,000” → 300. Dùng khi dán số liệu quá hạn từ inpd01.'],
  ['P1-8', 'Ngày bị đọc sai năm', '[XM-V2]', '3 bản parseVNDate (L23592, L54604, L54840) khác nhau; bản TDUP5 không neo đầu chuỗi: “2026-05-31” → 26/05/2031. Cả 3 chấp nhận 31/02.'],
  ['P1-9', 'Lưu giá trị tiền bị nhân 100; TSBĐ tự ghi đè', '[XM-V2]', 'groupDigits/stripDots (rootfix v6, L59042) bỏ dấu thập phân và dấu âm. Mở form sửa tự chạy syncTSBDFromHsvv(true) (L59227) ghi đè tsbdGiaTri bằng Σ plgamt (có thể từ seed).'],
  ['P1-10', 'Số tiền đến hạn = toàn bộ dư nợ khi số dư đổi', '[XM-V2]', 'getDenhanAmt tra bảng cứng theo khoá “mã|ngày|dư nợ” (L23238); không khớp thì trả toàn bộ dư nợ.'],
  ['P1-11', 'Giá đất NQ38 sai đường', '[XM-V2]', 'Khoá bgd_UBND = phường|từ|đến, thiếu tên đường (L34065): 54 khoá dùng chung giữa các đường (vd. Hoàng Văn Thụ và Hàng Cau cùng [35.000; 15.000; 7.500; 3.800]); 78/985 dòng N/A. Dữ liệu: TB ≠ (cao+thấp)/2 (Vũ Xuân Thiều), 15 ô giá NQ38 > giá thấp nhất; 40 ô “#DIV/0!/Chưa hoàn thiện” trong PL02.'],
  ['P1-12', 'TSBĐ cộng lặp, lẫn trạng thái', '[XM-V2]', 'tsbdReconcile (L58630) ghép theo KH và gán toàn bộ dư nợ KH cho từng tài sản; không lọc clholdcd (3.647 dòng đã giải chấp ở 20/10), TS hết hạn (11.353 dòng), USD/EUR (145 dòng), clno lặp (66); KPI cộng clamt còn form cộng plgamt.'],
];
S.push(table(['Mã', 'Triệu chứng', 'Nhãn', 'Nguyên nhân gốc (vị trí)'], p1, [700, 2300, 850, 5788], { size: 17 }));
S.push(H2('5.3. Mức P2–P3'));
[
  '**P2** Ba cơ chế phân trang/cuộn ảo xung đột (core 250 dòng; desktop-patch > 80 dòng, pager cũ sau khi render lại; tdup2 > 1.000 dòng). [XM-V2]',
  '**P2** Observer của modal (L56407) bỏ sót overlay cố định (offsetParent = null) và chạy getComputedStyle trên mọi div ở mỗi thay đổi; observer v10 (L52836) đo lại mọi bảng sticky ở mỗi thay đổi chữ. [XM-V2]',
  '**P2** Phím tắt trùng: Ctrl+S có 4 bộ xử lý, Ctrl+E 3, Ctrl+K 2, “?” mở 2 cửa sổ; bảng phím tắt quảng cáo Ctrl+cuộn zoom đã bị gỡ. [XM-V2]',
  '**P2** fixSwappedDates (L33913) đảo một lần mọi ngày mơ hồ khi có cờ cũ – kể cả bản nhập đã đúng. [GT]',
  '**P2** Bộ hẹn giờ và nạp trễ: nhập .xls trước khi thư viện nạp xong báo lỗi; ipcasUpsertDailySnapshot trả null im lặng khi danh sách lưu trữ chưa nạp. [XM-V2]',
  '**P2** 252 khối catch rỗng; các mặc định âm thầm (Number(x)||0, nhóm trống → “Nhóm 1”, cột thiếu → 0). [XM-V2]',
  '**P3** Hai bộ tính hệ số giá đất trùng lặp (kh_getCoeff, bgd_getK2); paRecalc dựa chỉ số dòng; KPI TSBĐ làm tròn tỷ; chú thích cột lỗi thời (r[20]). [XM-V2]',
].forEach((t) => S.push(B(t)));
S.push(H2('5.4. Năm nguyên nhân gốc chung'));
S.push(table(['Gốc rễ', 'Biểu hiện', 'Hạng mục xử lý'], [
  ['G1. Không có lớp đọc/chuẩn hoá dữ liệu thống nhất', 'P0-1, P0-2, P1-7, P1-8, P1-9', 'HM-01, HM-02, HM-06'],
  ['G2. Không có “một nguồn sự thật” cho số liệu và ngày dữ liệu', 'P1-1 → P1-5, P1-10', 'HM-07, HM-08, HM-09, HM-12'],
  ['G3. Dữ liệu cứng chen vào dữ liệu thật', 'P0-3, P0-4, P1-5, P1-10', 'HM-03, HM-05'],
  ['G4. Sửa bằng cách vá chồng (monkey-patch, catch rỗng, mặc định âm thầm)', 'P0-6, P1-9, mục 3.3, 5.3', 'HM-13, HM-18, HM-21'],
  ['G5. Làm việc trực tiếp trên tệp 13 MB, không build, không kiểm thử', 'Lỗi chèn CSS vào SheetJS lọt qua mọi bản phát hành', 'HM-20, HM-22'],
], [3600, 3000, 3038]));

// ---------- 6. UI ----------
S.push(H1('6. Giao diện, bố cục, điều hướng, tối ưu desktop'));
S.push(H2('6.1. Ảnh chụp hiện trạng (V3)'));
S.push(P('Ảnh chụp bằng Playwright trên Chromium, vùng dữ liệu khách hàng đã làm mờ.'));
S.push(...fig('1920_dashboard.jpg', 'Hiện trạng 1920×1080 – sidebar bị ẩn sau ☰, bảng chỉ dùng ~40% bề ngang; thanh Compact/Normal/Comfortable đè lên nút ở góc phải'));
S.push(...fig('1366_qltd.jpg', 'Hiện trạng 1366×768 – topbar 14 nút xuống 2 hàng, thanh density đè lên nút “Tính lãi” và tên người dùng; bảng dư nợ rộng 2.123 px phải cuộn ngang'));
S.push(...fig('1366_tsbd.jpg', 'Hiện trạng trang TSBĐ trên máy mới – tự nạp 2.243 tài sản từ seed “18.08.2026-TS.XLS” nhúng trong tệp'));
S.push(...fig('1366_giadat.jpg', 'Hiện trạng trang Giá đất – phông chữ và kiểu thành phần khác phần còn lại của app'));
S.push(...fig('390_qltd.jpg', 'Hiện trạng trên điện thoại 390×844 – topbar xếp dọc ~350 px, đẩy nội dung xuống dưới', 260));
S.push(...fig('1920_dark_dashboard.jpg', 'Chế độ tối “tự động” theo hệ điều hành – chỉ một phần nền chuyển tối, topbar và chữ giữ màu sáng'));
S.push(H2('6.2. Đo đạc bố cục'));
S.push(table(['Chỉ số (Playwright)', '1920×1080', '1366×768', '390×844'], [
  ['Số nút hiển thị trên topbar', '14', '14 (2 hàng)', '11 (dàn dọc, 1 nút tràn)'],
  ['Độ rộng bảng Dư nợ (px)', '2.123', '2.123', '2.043'],
  ['Độ rộng bảng TSBĐ (px)', '2.211', '2.211', '2.240'],
  ['Sidebar', 'Ẩn sau ☰', 'Ẩn sau ☰', 'Ẩn'],
  ['Thời gian tải đến sự kiện load', '1,6 s', '0,6 s', '0,6 s'],
  ['Số phần tử DOM sau khi tải', '62.479', '62.479', '62.114'],
], [3238, 2100, 2100, 2200]));
S.push(H2('6.3. Danh sách vấn đề giao diện'));
[
  '**Cây menu:** nhóm “HỒ SƠ VAY” không chứa hồ sơ vay; 6 trang không có lối vào; Lưu trữ có 6 lối vào, Auto-Sync 3, Báo cáo 2; menu là thẻ div nên không dùng phím Tab được.',
  '**Nhãn lệch tiêu đề:** Dư nợ → “QUẢN LÝ TÍN DỤNG”, Ngắn hạn → “QUẢN LÝ HẠN MỨC”, Trung-dài hạn → “QUẢN LÝ TIÊU DÙNG”, Nợ đến hạn → “LỊCH TRẢ NỢ”, Giải ngân → “PHÍ GIẢI NGÂN”.',
  '**Không có địa chỉ trang:** F5 luôn về Dashboard; nút Back của trình duyệt thoát khỏi app.',
  '**Lớp nổi chồng nhau:** dock (z-index 60) nằm dưới topbar (80); density bar z-index 99.989; 60 giá trị z-index khác nhau, cao nhất 2.147.483.601.',
  '**Thiết kế không thống nhất:** 9 bộ biến :root, 2 hệ mật độ, 3 bảng lệnh, ≥ 5 kiểu thông báo, ~12 kiểu tab; Times New Roman ở TSBĐ/khách hàng mới, Be Vietnam Pro ở nơi khác; trộn tiếng Anh (Dashboard, Backup, Archive, Density, Desktop ON/OFF).',
  '**Desktop:** chỉ có 1 điểm ngắt cho desktop (≥ 1024 px, chuột); không có quy tắc cho ≥ 1600 px; biến zoom --ux-zoom nhắm sai phần tử (#main không nằm trong danh sách).',
  '**Hiệu năng giao diện:** content-visibility trên .page/.card/.table-wrap khiến modal position:fixed bên trong trang bị tính theo trang [GT]; setInterval quét bảng mỗi 2,5 s; 8 MutationObserver.',
].forEach((t) => S.push(B(t)));
S.push(...fig('d_menu.jpg', 'Cây điều hướng hiện tại (trái) và đề xuất (phải)'));

// ---------- 7. Dữ liệu, hiệu năng, bảo mật ----------
S.push(H1('7. Dữ liệu đầu vào, hiệu năng, offline, bảo mật'));
S.push(H2('7.1. Dư nợ IPCAS – 11 kỳ'));
S.push(P('Cả 11 tệp có cùng 87 cột, cùng thứ tự, tiêu đề ở dòng 1, một sheet, không có dòng tổng. Tệp T12–T5 là .xlsx; T6–T10 là .XLS (BIFF8). Tệp 30.09 nhỏ hơn chỉ do cách mã hoá số, không thiếu dữ liệu.'));
S.push(table(['Kỳ', 'Định dạng', 'Số dòng', 'Số KH', 'Σ dư nợ (đ)', 'Nhóm 2'], months.map((m) => [m[0], m[1], fmt(m[2]), fmt(m[3]), m[4], String(m[5])]), [1500, 1100, 1100, 1100, 3538, 1300], { num: [2, 3, 4, 5] }));
S.push(sp());
S.push(P('**Các điểm bộ nhập phải xử lý (đã kiểm trên dữ liệu thật):**'));
[
  'Tên cột đảo nghĩa: “brcd” chứa mã khách hàng 13 số, “custseq” chứa mã chi nhánh 3201 → ánh xạ theo nội dung, có từ điển cột.',
  'Ngày trong tương lai so với ngày chốt: tệp 31.12.2025 có 24 khoản giải ngân và 115 HĐ phê duyệt sau 31/12/2025; tệp 31.03 có 17 và 40 → nghi tệp được trích lại về sau; cần cảnh báo khi nhập.',
  'Dư nợ > số tiền giải ngân: 45 dòng (T12), 38 dòng (T3); lãi dự thu âm 2–124 dòng/kỳ; 3–70 dòng dư nợ = 0/kỳ; intamt ≠ intrpmtamt ~260 dòng/kỳ.',
  'Khoảng trắng đệm ở tên CBTD, mã quận, mã trống; tỉnh ghi hai kiểu (“TP Hà Nội”/“Thành phố Hà Nội”).',
  'Nhóm nợ ở cột AQCCDFIN dạng “Nhóm 1”/“Nhóm 2”; 4 KH có > 1 CBTD; 3 KH thuộc > 1 phòng.',
].forEach((t) => S.push(B(t)));
S.push(H2('7.2. Sao kê tài sản bảo đảm'));
S.push(table(['Chỉ số', '30/09/2026', '20/10/2026'], [
  ['Số dòng / số KH (clcustno)', '2.239 / 2.019', '19.133 / 9.434'],
  ['Phạm vi', 'Bản trích: chỉ TS đang giữ của 18 CBTD trong phòng', 'Toàn chi nhánh: có TS đã giải chấp (3.647), TS hết hạn (11.353), KH không còn vay (7.608)'],
  ['Σ clamt (đ)', '5.734.867.413.032', '20.879.074.485.436'],
  ['Ngoại tệ', '0', '103 USD · 42 EUR'],
  ['Khoá liên kết với dư nợ', 'clcustno/plgcustno = mã KH (brcd); apprno chỉ có ở cầm cố “Specific”', 'Như bên trái; 942 dòng bên thứ ba'],
  ['Tỷ lệ KH vay có TSBĐ', '—', '1.826 / 1.871 KH'],
], [2600, 3400, 3638]));
S.push(P('Kết luận: không thể so trực tiếp hai tệp; app phải lọc theo trạng thái nắm giữ, hiệu lực, tiền tệ và phạm vi CBTD trước khi tính, và chỉ ghép ở mức khách hàng.'));
S.push(H2('7.3. Giá đất 2026'));
[
  '**PL01** (Cách xác định đơn giá): G = Đơn giá lựa chọn × K × H. K1 số mặt tiền (1,05–1,3), K2 diện tích đất ở (1→0,5), K3 diện tích đất nông nghiệp (1→0,5), K4 chiều rộng mặt tiền (0,9–1,2), K5 hình dáng (0,7–1,02), H1 lợi thế (≤ 1,2), H2 bất lợi (≥ 0,8). Hệ số là cận trên/dưới, không được vượt tối đa. Bảng gốc ghi sai mã (dòng K3 ghi K2.x, K4 ghi K3.x).',
  '**PL02** (TP Nam Định cũ, nay thuộc Ninh Bình): 8 phường, 1.007 dòng, đơn vị nghìn đồng/m², VT1–VT4 × (cao nhất, thấp nhất, trung bình); có ô gộp dọc, dòng tiêu đề con, 40 ô chữ “#DIV/0!”/“Chưa hoàn thiện”.',
  '**NQ 38** (HĐND tỉnh Ninh Bình, sao y 17/12/2025): PDF 10 trang dạng ảnh scan, chưa có lớp chữ → cần OCR hoặc bảng số do người dùng cung cấp nếu muốn đối chiếu tự động.',
  'App hiện có 985 dòng bảng giá (W, L34051) và 871 khoá NQ38; công thức app nhân đơn giá × K × H theo m², chưa nhân diện tích và không nối sang hồ sơ vay.',
].forEach((t) => S.push(B(t)));
S.push(H2('7.4. Hiệu năng và offline'));
[
  'Tệp 13,98 MB, trong đó thư viện ~3,3 MB và dữ liệu nhúng ~1,6 MB (seed TSBĐ, bảng lãi suất, số liệu đến hạn) cùng 6 MB khối bgdat trì hoãn.',
  'Thời gian đến sự kiện load: 0,6–1,6 s; nhưng các khối trì hoãn và thư viện nạp sau đó, tạo “cửa sổ” mà nhập tệp có thể lỗi.',
  'Không có service worker/manifest: app chỉ là tệp HTML; khi có mạng hiện không có cơ chế kiểm tra bản mới hay tải thư viện dự phòng.',
].forEach((t) => S.push(B(t)));
S.push(H2('7.5. Bảo mật và riêng tư'));
[
  '**Dữ liệu cá nhân thật nhúng trong tệp phát hành** (tên, mã KH, số GCN, số tài khoản cán bộ) – mỗi lần chia sẻ tệp là chia sẻ dữ liệu khách hàng. [XM-V2] → HM-05.',
  'innerHTML được dùng 319 lần; có helper escapeHtml nhưng không dùng thống nhất – rủi ro chèn mã khi dữ liệu nhập chứa ký tự đặc biệt. [GT]',
  'Thư viện nhúng không có kiểm tra toàn vẹn; lỗi chèn CSS vào SheetJS cho thấy cần bước kiểm tra tự động trước khi phát hành.',
].forEach((t) => S.push(B(t)));

// ---------- 8. Đề xuất ----------
S.push(H1('8. Đề xuất nâng cấp, tính năng mới và mockup'));
S.push(P('Phân loại: **Cần sửa** (lỗi đã xác minh) · **Nên thêm** (giải quyết vấn đề đã thấy) · **Ý tưởng** (chưa có bằng chứng nhu cầu, chờ bạn duyệt). Số trong mockup là số minh hoạ; riêng tổng dư nợ, số dòng, số KH lấy từ tệp 20.10.2026.'));
S.push(H2('8.1. Khung giao diện mới cho desktop'));
[
  'Topbar 52 px chỉ còn: logo · đường dẫn trang · ô tìm kiếm/bảng lệnh (Ctrl K) · chip “Ngày dữ liệu” · trạng thái lưu · nút Nhập dữ liệu · menu ⋯.',
  'Sidebar 6 nhóm luôn mở ở ≥ 1600 px; thu thành dải biểu tượng 64 px ở 1280–1599 px; thanh 5 mục ở dưới trên điện thoại.',
  'Vùng nội dung lưới 12 cột; ngăn chi tiết 380 px bên phải khi chọn một dòng (1920) hoặc lớp phủ (1366).',
  'Một bộ token màu – chữ – khoảng cách; phông Inter (chữ) + số dạng tabular; chế độ tối là tuỳ chọn, mặc định tắt.',
].forEach((t) => S.push(B(t)));
S.push(...fig('d_grid.jpg', 'Lưới bố cục theo 3 nhóm kích thước màn hình'));
S.push(...fig('m_dash1920.jpg', 'Mockup Bảng điều khiển 1920×1080 – chip ngày dữ liệu, dải đối soát, KPI, xu hướng 11 kỳ, cảnh báo sớm'));
S.push(...fig('m_duno1366.jpg', 'Mockup trang Dư nợ 1366×768 – sidebar thu gọn, preset cột “Gọn 1366”, cột KH ghim trái, dòng tổng theo bộ lọc'));
S.push(...fig('m_mobile.jpg', 'Mockup điện thoại 390×844 – KPI 2×2, việc cần xử lý, thanh điều hướng dưới', 250));
S.push(H2('8.2. Cần sửa – nhóm dữ liệu và số liệu'));
S.push(table(['Đề xuất', 'Giải quyết', 'Loại'], [
  ['Bộ đọc thống nhất (SheetJS đã sửa) cho .xlsx/.xls/.csv; nhận ngày theo định dạng ô; từ điển 87 cột', 'P0-1, P0-2, G1', 'Cần sửa'],
  ['Lớp “sửa tay” lưu riêng theo số khoản vay; gỡ bảng lãi suất cứng; chuẩn hoá chỉ khi nhập', 'P0-3', 'Cần sửa'],
  ['Kho dữ liệu có phiên bản: mốc theo ngày dữ liệu, ghi một giao dịch, kiểm số dòng, sao lưu có checksum', 'P0-5, P0-6, P1-5', 'Cần sửa'],
  ['Gỡ seed/PII; “dữ liệu mẫu ẩn danh” để demo; nút xoá dữ liệu cục bộ', 'P0-4', 'Cần sửa'],
  ['TD.num / TD.date dùng chung, kiểm thử bằng Node', 'P1-7, P1-8, P1-9', 'Cần sửa'],
  ['“Ngày dữ liệu” là nguồn sự thật cho đến hạn/quá hạn/mốc', 'P1-4, P1-5', 'Cần sửa'],
  ['TD.metrics: một engine KPI cho mọi màn hình, KH theo mã, dòng “Chưa phân CBTD”/“Không rõ nhóm”', 'P1-1, P1-2, P1-3, P1-6', 'Cần sửa'],
  ['TSBĐ: lọc trạng thái/hiệu lực/tiền tệ, khử trùng, ghép theo KH một lần', 'P1-12', 'Cần sửa'],
  ['Giá đất: khoá có tên đường, trang lỗi dữ liệu bảng giá, nối sang HSVV', 'P1-11', 'Cần sửa'],
], [5400, 2400, 1838]));
S.push(H2('8.3. Nên thêm – trang Đối soát số liệu'));
S.push(P('Mỗi chỉ tiêu trên màn hình được tính lại độc lập từ tệp gốc đã lưu và hiển thị: giá trị app · giá trị tệp gốc · chênh lệch · trạng thái. Dải trạng thái xuất hiện trên Bảng điều khiển; có thể xuất biên bản đối soát. Đây là cơ chế chống tái diễn cho mọi lỗi “số liệu lệch”.'));
S.push(...fig('m_doisoat.jpg', 'Mockup trang Đối soát số liệu'));
S.push(H2('8.4. Nên thêm – Trung tâm nhập dữ liệu'));
S.push(P('Kéo thả nhiều tệp cùng lúc; app tự nhận loại tệp (dư nợ/TSBĐ/giá đất) và ngày dữ liệu; kiểm tra theo quy tắc (cột bắt buộc, khoảng lãi suất, ngày tương lai, lãi âm, trùng số khoản); so với kỳ trước; tự lưu mốc trước khi ghi để hoàn tác; ghi nhật ký nhập.'));
S.push(...fig('m_import.jpg', 'Mockup Trung tâm nhập dữ liệu – bước Kiểm tra & đối soát'));
S.push(H2('8.5. Tài sản bảo đảm và Giá đất'));
S.push(...fig('m_tsbd.jpg', 'Mockup TSBĐ – KPI sau lọc, ghép theo khách hàng, cảnh báo tỷ lệ thấp/định giá cũ/chưa có TS'));
S.push(...fig('m_giadat.jpg', 'Mockup Giá đất – chọn đoạn đường có tên đường, hệ số PL01, kết quả theo diện tích, đưa sang hồ sơ vay'));
S.push(H2('8.6. Ý tưởng – Khách hàng 360°, Cảnh báo sớm, Xu hướng, Chế độ có mạng'));
S.push(table(['Tính năng', 'Vấn đề giải quyết', 'Giá trị', 'Rủi ro', 'Effort'], [
  ['Khách hàng 360°', 'Thông tin một KH rải ở 5–6 trang', 'Cao', 'Thấp', 'M'],
  ['Cảnh báo sớm (7/15/30 ngày, nhóm 2, TSBĐ)', 'Đến hạn đang tính theo đồng hồ máy, rời rạc', 'Cao', 'Thấp', 'S'],
  ['Xu hướng nhiều kỳ', 'Đã có 11 kỳ dữ liệu nhưng chỉ so được 2 mốc', 'Trung bình', 'Thấp', 'S'],
  ['Chế độ có mạng tuỳ chọn', 'Cần dùng khi có mạng; thư viện lỗi không có dự phòng', 'Trung bình', 'Trung bình (dữ liệu không được rời máy nếu chưa đồng ý)', 'S'],
  ['Mẫu báo cáo chuẩn Word/Excel', 'Báo cáo xuất có thể lệch màn hình', 'Trung bình', 'Thấp', 'M'],
], [2400, 2800, 1200, 2238, 1000]));
S.push(...fig('m_kh360.jpg', 'Mockup Khách hàng 360° – khoản vay, TSBĐ, lịch sử 11 kỳ, ngăn chi tiết khoản vay'));
S.push(H2('8.7. Cây thư mục mã nguồn đề xuất'));
S.push(P('Sửa trong thư mục src/ theo module, chạy công cụ build để gộp ra **một tệp HTML** như hiện nay. Bước build tự kiểm tra từng thư viện biên dịch được và quét dữ liệu cá nhân trước khi phát hành – chặn đúng loại lỗi đã làm hỏng SheetJS.'));
S.push(...fig('d_folder.jpg', 'Cây thư mục mã nguồn đề xuất'));

// ---------- 9. Lộ trình ----------
S.push(H1('9. Lộ trình nâng cấp'));
S.push(...fig('d_gantt.jpg', 'Lộ trình theo đợt và phiên làm việc (ước tính)'));
for (const dot of [1, 2, 3, 4, 5]) {
  const list = items.filter((i) => i.dot === dot);
  S.push(H2(`Đợt ${dot} – ${DOT[dot]} (${list.length} hạng mục · ${sumBy((i) => i.dot === dot)}%)`));
  S.push(table(['Mã', 'Hạng mục', 'Ưu tiên', 'Effort', 'Phụ thuộc', 'Kiểm chứng'], list.map((i) => [i.id, i.ten, i.uu_tien, `${i.effort} (${i.chi_phi_uoc_tinh_pct}%)`, i.phu_thuoc.join(', ') || '—', i.kiem_chung_du_kien]), [900, 4038, 900, 1200, 1500, 1100], { status: 2, size: 17 }));
}
S.push(H2('Mốc nghiệm thu từng đợt'));
S.push(table(['Mốc', 'Sau đợt', 'Người dùng nhận được'], [
  ['M1 – Số liệu đúng', '1', 'Nhập được cả .xls/.xlsx; lãi suất đúng tệp; không mất dữ liệu khi tải lại; không còn dữ liệu cứng/PII trong tệp'],
  ['M2 – Báo cáo khớp', '2', 'Mọi màn hình và báo cáo cùng một con số; trang Đối soát chứng minh khớp tệp gốc; đến hạn/quá hạn theo ngày dữ liệu'],
  ['M3 – Giao diện mới', '3', 'Menu 6 nhóm, đủ lối vào; F5/Back hoạt động; bảng vừa màn 1366/1920; điện thoại dùng được'],
  ['M4 – Kiến trúc mới', '4', 'Mã nguồn module + build + bộ kiểm thử; phát hành vẫn là 1 tệp HTML'],
  ['M5 – Tính năng mới', '5', 'Theo từng mục được duyệt'],
], [2200, 1000, 6438]));
S.push(P(`**Cách ước tính:** chi phí mỗi hạng mục theo % ngữ cảnh một phiên (XS≈3%, S≈6%, M≈10%, L≈18%); mỗi phiên dùng hữu ích ~60%. Đợt 1–4: ${coreCost}% ⇒ tối thiểu ⌈${coreCost}/60⌉ = 4 phiên; do tệp 13 MB tốn ngữ cảnh khi đọc, dự kiến hệ số hiệu chỉnh 1,3–1,5 ⇒ **5–6 phiên**. Cả đợt 5: ${allCost}% ⇒ **7–8 phiên**. Sẽ hiệu chỉnh sau 2 hạng mục đầu và báo nếu lệch > 25%.`));

// ---------- 10. Kiểm chứng ----------
S.push(H1('10. Chiến lược kiểm chứng'));
S.push(table(['Đợt', 'Bậc', 'Nội dung kiểm thử chính'], [
  ['1', 'V3 + V2', 'Parse 74 khối script; nhập tệp mẫu .xlsx/.xls ẩn danh và tệp thật (chỉ trong máy làm việc); so phân bố lãi suất, Σ dư nợ, số KH với tệp; tải lại 3 lần; giả lập chunk hỏng; sao lưu → khôi phục; quét PII tệp phát hành'],
  ['2', 'V2 + V3', '≥ 40 ca Node cho TD.num/TD.date; TD.metrics trên tệp mẫu (biên: nhóm trống, loại vay lạ, CBTD chưa ánh xạ, dư nợ 0, ngày tương lai); đối chiếu các màn hình với tệp gốc'],
  ['3', 'V3', 'Ảnh chụp 1920/1366/390 + zoom 125%; kiểm tra tràn ngang, chồng lớp, F5/Back, phím tắt, Tab; đo thời gian chuyển trang và cuộn bảng 3.918 dòng'],
  ['4', 'V2 + V3', 'Build từ src cho kết quả tương đương bản trước (cùng bộ e2e); check-vendor, scan-pii trong build'],
  ['5', 'V3', 'Theo tiêu chí từng tính năng'],
], [800, 1400, 7438]));
S.push(P('**Chống tái diễn:** mỗi lỗi P0/P1 có ít nhất một test thất bại với mã cũ và đạt với mã mới; trang Đối soát là cơ chế kiểm tra liên tục khi dùng thật. Không tắt test hay nới điều kiện để “xanh”.'));
S.push(P('**Môi trường đã kiểm (21/10/2026):** Node 22, Playwright + Chromium có sẵn ⇒ V3 khả dụng; LibreOffice có sẵn để kiểm tài liệu.'));

// ---------- 11. Vận hành ----------
S.push(H1('11. Vận hành nhiều phiên và bàn giao'));
[
  'Mỗi hạng mục kết thúc bằng một **ZIP hạng mục** (mã nguồn hiện tại, HANDOVER.md, backlog.json, bằng chứng kiểm thử, đề án) – cũng là điểm hoàn tác.',
  'Cuối phiên hoặc khi ngữ cảnh chạm ~80%: **ZIP đóng phiên** + đoạn lời nhắn để dán vào phiên sau.',
  'Luôn giữ ≥ 15% ngữ cảnh cho đóng gói; không mở hạng mục mới ở vùng vàng nếu không vừa.',
  'Hỏi bạn trước khi chuyển sang hạng mục kế tiếp (① tiếp ② điều chỉnh ③ dừng).',
  'Gói bàn giao không chứa tệp dữ liệu thật; bạn mang theo tệp HTML hiện hành và tệp IPCAS cần dùng khi mở phiên mới.',
].forEach((t) => S.push(B(t)));

// ---------- 12. Rủi ro ----------
S.push(H1('12. Rủi ro và đường lui'));
S.push(table(['Rủi ro', 'Khả năng', 'Tác động', 'Giảm thiểu'], [
  ['Migrate lưu trữ làm mất dữ liệu đang có trên máy người dùng', 'Trung bình', 'Cao', 'Bắt buộc xuất sao lưu trước khi nâng cấp; migrate có kiểm số dòng; giữ dữ liệu cũ đến khi xác nhận'],
  ['Gỡ seed làm mất số liệu người dùng đang dựa vào', 'Trung bình', 'Trung bình', 'Hướng dẫn nhập lại từ tệp gốc; công cụ xuất dữ liệu seed hiện có trước khi gỡ (chỉ trên máy người dùng)'],
  ['Thay router ảnh hưởng chức năng ẩn gắn vào showPage', 'Trung bình', 'Trung bình', 'Lập danh sách 9 hook; test e2e từng trang; giữ lớp tương thích showPage() gọi router'],
  ['Định dạng tệp IPCAS thay đổi', 'Thấp', 'Cao', 'Từ điển cột + kiểm tra cột bắt buộc, báo rõ thay vì gán 0'],
  ['Quy tắc nghiệp vụ hiểu sai (nhóm nợ, đến hạn, giá đất)', 'Trung bình', 'Cao', 'Quy tắc công khai trên trang Đối soát; mọi thay đổi quy tắc hỏi bạn xác nhận'],
  ['Ước tính số phiên lệch', 'Trung bình', 'Thấp', 'Hiệu chỉnh sau 2 hạng mục đầu; báo khi lệch > 25%'],
], [3000, 1200, 1200, 4238]));
S.push(P('**Đường lui:** mỗi ZIP hạng mục là một điểm hoàn tác; tệp v22.3 hiện tại (SHA-256 ghi ở trang bìa) là mốc gốc do bạn giữ.'));

// ---------- 13. Nghiệm thu ----------
S.push(H1('13. Tiêu chí nghiệm thu tổng'));
[
  'Nhập được tất cả 11 tệp dư nợ và 2 tệp TSBĐ đã cung cấp; với mỗi tệp: số dòng, Σ dư nợ, số KH, phân bố lãi suất và nhóm nợ trên app khớp tệp gốc.',
  'Tải lại app 3 lần liên tiếp không làm thay đổi bất kỳ số liệu nào; sửa tay được giữ.',
  'Trang Đối soát: mọi chỉ tiêu “Khớp”, hoặc chênh lệch có lý do hiển thị rõ.',
  'Tệp phát hành không còn dữ liệu cá nhân thật; mọi khối script biên dịch được; không có pageerror khi tải.',
  'Mọi trang có lối vào từ menu; F5/Back hoạt động; không tràn ngang ở 1366 và 1920 với bố cục mặc định; dùng được trên điện thoại 390 px.',
  'Bộ kiểm thử hồi quy chạy bằng một lệnh và đạt.',
].forEach((t) => S.push(N(t)));

// ---------- 14. Quyết định ----------
S.push(H1('14. Quyết định cần bạn chốt'));
S.push(table(['#', 'Câu hỏi', 'Đề xuất của tôi'], [
  ['1', 'Có chuyển sang làm việc trên mã nguồn tách module + bước build (Đợt 4), hay tiếp tục sửa trực tiếp tệp HTML?', 'Sửa trực tiếp ở Đợt 1–3 cho nhanh; tách nguồn ở Đợt 4 khi số liệu đã đúng'],
  ['2', 'Gỡ toàn bộ dữ liệu cứng và dữ liệu cá nhân khỏi tệp phát hành (seed TSBĐ 18/08, quá hạn 23/06, đến hạn, mốc cũ)?', 'Gỡ; thay bằng dữ liệu mẫu ẩn danh tuỳ chọn'],
  ['3', 'Đến hạn/quá hạn tính theo ngày nào?', '“Ngày dữ liệu” của tệp đang mở (có thể chọn “hôm nay” khi cần)'],
], [500, 5000, 4138]));
S.push(P('**Câu hỏi mở (không chặn bắt đầu):** cách xử lý 40 ô “#DIV/0!/Chưa hoàn thiện” trong PL02; có cần đọc NQ 38 (bản scan) không; TSBĐ chỉ tính TS đang giữ của CBTD trong phòng hay toàn chi nhánh.'));
S.push(sp());
S.push(box(['**Bạn muốn:** ① Duyệt, bắt đầu HM-01 (sửa SheetJS – XS, ~3% phiên) · ② Điều chỉnh (nêu rõ) · ③ Dừng, đóng phiên.'], C.note));

// ---------- 15. Phụ lục (landscape section later) ----------
const A = [];
A.push(H1n('15. Phụ lục'));
A.push(H2('Phụ lục A – Backlog đầy đủ'));
A.push(table(['Mã', 'Đợt', 'Ưu tiên · Effort', 'Hạng mục và phạm vi (vị trí mã)', 'Tiêu chí nghiệm thu', 'Model effort · Rủi ro'],
  items.map((i) => [i.id, String(i.dot), `${i.uu_tien} · ${i.effort} (${i.chi_phi_uoc_tinh_pct}%)`, `**${i.ten}**\n${i.pham_vi}`, i.tieu_chi_nghiem_thu.map((t) => '• ' + t).join('\n'), `${i.model_effort_recommended}\n${i.rui_ro}`]),
  [800, 600, 1300, 5470, 4300, 2100], { size: 16 }));
A.push(H2('Phụ lục B – Bản đồ mã (các khối chính)'));
A.push(table(['Khối', 'Vị trí (byte)', 'Kích thước', 'Vai trò'], [
  ['td-merged-styles + style gộp', '~754 – 727.000', '~726 KB', 'CSS gộp 54 khối cũ + content-visibility'],
  ['td-vendor-pizzip/jszip/docxtemplater/filesaver/docx', '728.942 – 1.471.000', '~743 KB', 'Thư viện xuất Word (trì hoãn)'],
  ['td-vendor-xlsx (SheetJS 0.20.3)', '1.471.947 – 2.182.000', '711 KB', 'HỎNG – chứa CSS chèn nhầm'],
  ['td-vendor-mammoth', '2.203.177', '642 KB', 'Đọc .docx'],
  ['Markup 21 trang + modal', '~2.85 – 4.0 triệu', '~1,1 MB', 'HTML các trang'],
  ['denhan-amt-data', '3.586.328', '153 KB', 'Bảng số tiền đến hạn cứng'],
  ['Lõi app (import, lưu, dashboard, KPI)', '3.738.966', '340 KB', 'L23xxx–L34xxx'],
  ['bgdat-scripts (trì hoãn)', '4.344.088', '6,0 MB', 'Lưu trữ, auto-sync, giá đất, HSVV, xuất'],
  ['desktop-patch, tdup1–5, td15, khmoi-v14…', '10,4 – 11,4 triệu', '~1 MB', '~40 lớp vá giao diện/tính năng'],
  ['tsbd-seed-data', '11.382.454', '1,43 MB', 'Seed TSBĐ 18/08 (dữ liệu thật)'],
  ['tsbd-module, td-rootfix-v6, td-std-toolbar', '12.81 – 12.87 triệu', '~55 KB', 'TSBĐ, bản vá form sửa'],
], [4200, 2300, 1300, 6770]));
A.push(H2('Phụ lục C – Bằng chứng'));
[
  'evidence/smoke.json – kết quả quét khói V3 (3 kích thước màn hình): XLSX = undefined, pageerror, kích thước topbar/bảng, thời gian tải.',
  'evidence/shots/*.png – ảnh chụp hiện trạng (đã làm mờ dữ liệu khách hàng).',
  'evidence/import_rate_test.md – tóm tắt phép thử nhập 31.05.2026.xlsx / 20.10.2026.XLS (chỉ số tổng hợp, không chứa dòng dữ liệu).',
  'Kiểm tra V2: biên dịch thử SheetJS bằng new Function() → “Invalid or unexpected token”.',
].forEach((t) => A.push(B(t)));
A.push(H2('Phụ lục D – Từ điển cột chính'));
A.push(table(['Nguồn', 'Cột', 'Ý nghĩa', 'Ghi chú'], [
  ['Dư nợ', 'brcd', 'Mã khách hàng (13 số)', 'Tên cột đảo nghĩa'], ['Dư nợ', 'custseq', 'Mã chi nhánh (3201)', 'Tên cột đảo nghĩa'],
  ['Dư nợ', 'apprseq / dsbsseq', 'Số HĐTD / số khoản vay (khoá chính)', 'dsbsseq không trùng trong mỗi kỳ'],
  ['Dư nợ', 'dsbsbal', 'Dư nợ (đồng)', ''], ['Dư nợ', 'sprd', 'Lãi suất %/năm (4,5–15)', ''],
  ['Dư nợ', 'AQCCDFIN', 'Nhóm nợ (“Nhóm 1”…)', ''], ['Dư nợ', 'ofcno / ofcnm / Officeruser', 'CBTD', 'Tên có khoảng trắng đầu'],
  ['Dư nợ', 'trctcd / trctnm', 'Phòng: 00 Hội Sở, 01 PGD Hai Bà Trưng, 02 PGD Số 2', ''],
  ['Dư nợ', 'lntpcd / credittype', 'Loại vay (TK211/212/213, thấu chi)', ''], ['Dư nợ', 'acramt / intamt', 'Lãi dự thu / lãi', 'acramt có giá trị âm'],
  ['TSBĐ', 'clno / plgno', 'Mã tài sản / mã hợp đồng bảo đảm', 'clno có thể lặp nhiều plgno'],
  ['TSBĐ', 'clcustno / plgcustno', 'Mã KH chủ TS / KH được bảo đảm', 'Khoá ghép với brcd'],
  ['TSBĐ', 'clamt / plgamt / avblamt', 'Giá trị TS / giá trị bảo đảm / còn khả dụng', 'Không cộng clamt qua nhiều plgno'],
  ['TSBĐ', 'clholdcd / exprdt', 'Trạng thái nắm giữ / ngày hết hiệu lực', '“N” = đang giữ; có ngày giả 1900/9999'],
], [1400, 3200, 5370, 4600]));
A.push(H2('Phụ lục E – Thuật ngữ, nhãn và lịch sử đề án'));
A.push(table(['Thuật ngữ / nhãn', 'Nghĩa'], [
  ['[XM-V3] / [XM-V2] / [GT]', 'Đã xác minh trên trình duyệt thật / đã xác minh bằng mã, Node, dữ liệu / giả thuyết'],
  ['P0 – P3', 'P0 mất/sai dữ liệu, chức năng lõi hỏng · P1 luồng chính sai/lệch · P2 chức năng phụ, bố cục, hiệu năng · P3 tinh chỉnh'],
  ['XS / S / M / L', 'Độ lớn hạng mục (≈3/6/10/18% ngữ cảnh một phiên)'],
  ['Ngày dữ liệu', 'Ngày chốt số liệu của tệp IPCAS đang dùng'],
  ['TD.metrics / TD.num / TD.date', 'Module tính KPI / chuẩn hoá số / chuẩn hoá ngày dùng chung (đề xuất)'],
  ['v1.0 – 21/10/2026', 'Bản đầu, chờ duyệt'],
], [4000, 10570]));

// ---------- document ----------
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Đề án nâng cấp QLTD PRO v1.0 · Trang ', size: 16, color: C.muted }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.muted })] })] });
const doc = new Document({
  creator: 'QLTD PRO – S0', title: 'Đề án nâng cấp QLTD PRO v1.0', description: 'Phân tích và lộ trình nâng cấp',
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FONT, color: C.brand }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FONT, color: C.navy }, paragraph: { spacing: { before: 220, after: 110 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, font: FONT, color: C.navy }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } }, { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 260 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 300 } } } }] },
  ] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, footers: { default: footer }, children: S },
    { properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, footers: { default: footer }, children: A },
  ],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('written', OUT, buf.length, 'bytes; figures', figNo); });
