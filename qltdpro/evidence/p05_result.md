# P05 (23/10/2026) — Lỗi CSS nền + gỡ mã mồ côi bckh* — bản P05

Quyết định của người dùng (hỏi trong phiên, PROMPT để trống): lỗi CSS nền = **SỬA**, rồi khi thấy hệ quả thì chọn **menu bên CỐ ĐỊNH trên máy tính**, sau hồi quy dữ liệu thật (bảng Chuyển HM/TSBĐ "Gọn" tràn ngang ở 1366 px) chọn **cố định từ ≥1440 px**; HM-21 = **KHÔNG làm**; HM-09 = **không khôi phục trang KHKD, gỡ mã mồ côi bckh\***; sự cố nhánh ccr-266ec07a-kxmt78 = không chọn ⇒ không đụng (nhánh VẪN còn trên GitHub).

## 1. Lỗi CSS nền (src/css/009-td-perfa-content-vis.css)
Nguyên nhân gốc: 5 chú thích `/* ═══ … ` không đóng nuốt quy tắc ngay sau, và 1 khối khai báo mất bộ chọn:
| Chỗ | Hậu quả trước P05 |
|---|---|
| `MOBILE RESPONSIVE — max-width: 768px` | nuốt dòng `@media(max-width:768px){` ⇒ ~45 quy tắc điện thoại áp MỌI độ rộng: menu bên trượt ra ngoài màn hình, nút ☰ hiện trên máy tính, hàng FHS xếp dọc, modal 96 %; dấu `}` thừa làm mất `#btn-mob-menu{display:none}` |
| `PAGE HSVV` | mất `#page-hsvv{padding:0}` và `.hsvv-wrap` (khung nền, lề 20/24 px) |
| `GD2 — MODULE HỒ SƠ VAY` | mất `#page-hmtd,#page-tieudung,#page-camco{padding:0}` |
| `PRO-TIP` | mất 38 dòng kiểu tooltip `#pro-tip-popup` |
| `ENHANCED THONG BAO NO` | mất 41 dòng kiểu thanh mẫu thông báo nợ |
| `PAGE-FHS` | mất `#page-fhs{display:flex;…}` |
| khối khai báo không bộ chọn (sau `.sf-valid-ico`) | trình duyệt gộp với quy tắc sau ⇒ mất `.hsv-nu{position:relative}` (đơn vị nhập liệu định vị sai) |

Sửa: đóng 5 chú thích; gỡ khối không bộ chọn; viết lại khối responsive:
- **mọi độ rộng**: topbar gọn của HM-15 (giữ nguyên: 6 nút, tiêu đề 13 px), menu bên rộng 252 px;
- **≥1440 px**: menu bên CỐ ĐỊNH, `#main{margin-left:252px}`, KHÔNG có nút ☰ (chế độ Toàn màn hình vẫn ẩn menu — quy tắc `body.page-fs/ufs-open #main` mạnh hơn);
- **<1440 px** (laptop 1366, máy tính bảng, điện thoại): menu bên là ngăn kéo mở bằng ☰ + lớp phủ (như trước P05); bấm mục menu tự đóng ngăn kéo (trước chỉ ≤768 px);
- **≤768 px**: thêm các quy tắc điện thoại (lề trang, FHS xếp dọc, modal 96 %…).
- Hệ quả đã xử lý: bảng Giá đất ở 1366 px tràn ngang (vùng nội dung hẹp đi 252 px) vì `.table-wrap td{white-space:nowrap !important}` đè quy tắc gốc cho xuống dòng cột tên đường ⇒ thêm quy tắc riêng `.bgdat-frame .table-wrap …` (tên đường xuống dòng, bảng vừa khung khi đủ chỗ).

Đo (evidence/scripts/p05_css_diff.js, fixture ẩn danh, 26 trang × 1500/390 px, 61.687 phần tử, so từng thuộc tính CSS tính ra) — tóm tắt ở evidence/p05_css_diff.txt, ảnh ở evidence/p05_anh/:
- **390 px**: topbar, menu bên, nút ☰ GIỐNG HỆT bản cũ; chỉ khác trang HSVV (khung nền + lề 20/24 px theo quy tắc gốc) và FHS (`display:flex` theo quy tắc gốc).
- **1500 px** (đo trước khi đổi ngưỡng 1440, vẫn đúng vì 1500 ≥ 1440): menu bên hiện cố định, nội dung lùi 252 px, ☰ ẩn; FHS hàng nhãn–ô nhập nằm ngang (không còn xếp dọc), chips HSVV không cuộn; các thay đổi còn lại chỉ là kích thước/vị trí do vùng nội dung hẹp đi.

## 2. HM-09: gỡ mã mồ côi bckh* (trang Báo cáo KHKD không tồn tại từ bản gốc v22.3)
Phân tích tầm với bằng AST (acorn) trên mọi khối script + HTML: chỉ 8 khai báo còn được mã khác dùng thật — GIỮ: `bckhAggregateData` (TD_AUDIT/đối soát B1, BCN snapshot, e2e HM-09), `bckhBuildCBTDMap`, `bckhNormName`, `bckhIsKHDN` (12 chỉ tiêu), `bckhFmtMoney` (Giá đất), `BCKH_PHONG`, `BCKH_PHONG_KEYS`, `BCKH_CBTD_ALIASES`.
GỠ: 73 câu lệnh cấp cao (~2.300 dòng JS: dựng/sửa/lưu bảng II–V, dashboard KHKD, xuất Excel/Word/PDF, drill-down…); điểm vào chết: tiêu đề trang 'bckh', nhánh `showPage('bckh')`, auto-fill khi khôi phục IDB, `PAGE_FS_PAGES`, KPI `db-kpi-bckh`, 6 mục trợ giúp `bckh-*`, modal drill-down trong HTML; 69 quy tắc CSS + 1 bộ chọn chỉ dành cho bckh.
Kiểm chứng: số khai báo cấp cao trước/sau khớp đúng danh sách gỡ (317 → 244); giá trị CSS tính ra trước/sau khi gỡ CSS bckh: 0 khác (ngoài phần tử đổi theo thời gian); e2e đạt. Giữ lại có chủ ý: tuyến router `bckh ↔ #/bao-cao-khkd` trong module td_router (thuần, có kiểm thử khứ hồi; vô hại).
Bản phát hành: 5,88 MB → 5,76 MB.

## 3. Kiểm thử
- `node tests/run.js --mutation` trên bản P05 cuối: xem evidence/p05_run_full.txt (e2e 65/65; 17 đột biến).
- e2e thêm 4 phép kiểm nhóm CSS: 390 px ngăn kéo + ☰ mở được; 1366 px ngăn kéo; 1500 px menu cố định, không ☰, nội dung không bị che. Đột biến mới "CSS": bỏ dòng mở `@media(max-width:1439px)` (tái tạo lỗi gốc: quy tắc ngăn kéo áp mọi độ rộng) ⇒ bị phát hiện. (Lần đầu đột biến "mở lại chú thích" KHÔNG bị phát hiện vì chú thích chỉ nuốt tới `*/` của chú thích P05 ngay sau — đã thay.)
- Hồi quy dữ liệu thật (ngoài repo, /tmp/claude-0/real/data) trên P05: hm17c_real 24/24 (trước khi đổi ngưỡng: 22/24 — 2 bảng "Gọn" tràn ở 1366 px ⇒ hỏi người dùng ⇒ ngưỡng 1440) · hm09b_real 0 vấn đề, TD_AUDIT B1 khớp (bckhAggregateData giữ nguyên) · real10 TSBĐ đạt, 0 pageerror · real12 đối soát 10/10 khớp · hm28b_real + hm28b_check.py 15/15 · td_pl02 6/6 (`run.js --real`).

## 4. Bổ sung sau rà soát đề án (cùng ngày; báo cáo handover/BAO_CAO_RA_SOAT_DE_AN_P05.docx)
Rà lại đề án (Mục 8–15) bằng đo trực tiếp ở 1920/1600/1366/390 px; làm ngay các việc không cần duyệt giao diện:
1. **Bảng Dư nợ tràn ngang ở 1920 (hồi quy P05)**: mẫu cột mặc định tự lùi `Gọn 1920 → Gọn 1600 (mẫu mới, 13 cột) → Gọn 1366` tới khi bảng vừa khung (chỉ áp khi người dùng CHƯA chọn mẫu/cột). Đo: 1920 → 13 cột, 1.590/1.590 px. e2e 1920 + 1600; đột biến (HM-17).
2. **Nút ↶/↷ đè nút Lưu/Tìm trên topbar**: đưa vào `.topbar-right`; e2e ở 1920 (không phần tử topbar bị che); đột biến CSS.
3. **Đường dẫn "Nhóm › Trang"** dưới tên trang trên topbar (lấy từ cây menu; ẩn ≤768 px); **Xuất CSV / Thêm mới** chuyển từ topbar xuống thanh công cụ của trang (Dư nợ/NH/TD/Đến hạn/Chuyển HM; trang khác vẫn ở topbar).
4. **Bảo mật dữ liệu nhập**: tiêm `<img onerror>` vào 10 cột chữ của dư nợ, mở 14 trang + KH 360° ⇒ 0 lần thực thi; escape 4 chỗ innerHTML còn sót (nhãn mốc ở so sánh kỳ, tên/nhãn CBTD-phòng ở 12 chỉ tiêu, nhãn mốc TDCMP); e2e "SEC" + đột biến. Chưa rà: dữ liệu TSBĐ, ghi chú KH, hồ sơ vay; rà tĩnh mẫu HTML nhiều dòng.
5. **Đo zoom 125%** (1.093/1.280/1.536 px, 20 trang): không trang nào cuộn ngang, topbar 58 px; bảng Chuyển HM/Trả nợ/TSBĐ/Giá đất/Đối soát/KH mới cuộn ngang TRONG khung vì mặc định "Đầy đủ" (quyết định P04b — chưa đổi). **Bàn phím**: Tab đi 28 mục menu, Enter chuyển trang đúng, vòng focus 2 px có sẵn (e2e khoá lại).
6. Hạ tầng kiểm thử: `tests/run.js` nâng giới hạn tầng đột biến 1 giờ → 3 giờ (e2e dài hơn nên lần chạy trước bị cắt ở đột biến thứ 20).
Kết quả: e2e 72/72; 20/20 đột biến bị phát hiện (evidence/p05_run_full.txt; HM-27 chạy riêng vì bị cắt giờ); hồi quy dữ liệu thật: xem mục dưới.
Hồi quy dữ liệu thật trên bản cuối (SHA c5ac76f6…720af): hm17c_real 24/24 · hm09b_real 0 vấn đề · real12 đối soát 10 chỉ tiêu (L1…khớp), 0 pageerror · bảng Dư nợ 3.848 dòng thật: 1920 → "Gọn 1600" 1.590/1.590 px; 1600 → "Gọn 1366" 1.270/1.270; 1366 → "Gọn 1366" 1.288/1.288 (không tràn).

## 5. P06 — thực thi sau khi người dùng phê duyệt toàn bộ (23/10/2026)
Phê duyệt: "toàn bộ" các việc giao diện (3–6) và kỹ thuật trong báo cáo rà soát. KHÔNG xoá nhánh ccr-266ec07a-kxmt78 (không đảo ngược; chưa được cho phép rõ ràng).
1. **Dải biểu tượng 64 px** ở 1280–1439 px (tooltip, chấm số); <1280 px ngăn kéo ☰; ≥1440 px menu 252 px. Nhóm menu thu/mở (mặc định thu NGHIỆP VỤ + HỆ THỐNG; nhớ trong localStorage; nhóm chứa trang đang xem tự mở). Bảng "Gọn" của Chuyển HM/TSBĐ có mẫu "Gọn 1280" và tự lùi (gon → gon2) khi vẫn tràn; hộp chọn cột tính từ mẫu đang HIỆN (hm17c_real 24/24).
2. **Bảng điều khiển**: 5 thẻ KPI đầu trang (Tổng dư nợ + so kỳ trước, KH, Nhóm 2–5, Quá hạn, xu hướng thu nhỏ) dùng chung TD.metrics; lưới 2 cột ≥1600 px (Bảng I | Bảng II); tabular-nums mọi bảng.
3. **Điện thoại**: topbar 1 hàng 58 px (chỉ biểu tượng), KPI 2×2; bảng → ngăn chi tiết (chưa đổi thành thẻ thật).
4. **Ngăn chi tiết 380 px**: bấm dòng Dư nợ/NH/TD/Đến hạn/Lãi đọng/Chuyển HM/Giải ngân/Trả nợ → liệt kê mọi cột (cả cột ẩn), KH 360°, Sửa; Esc/✕ đóng.
5. **Trung tâm nhập**: nút "Hoàn tác lần nhập (dư nợ)" (khôi phục DATA.qltd; trong bộ nhớ đến khi tải lại; mốc lưu trữ và TSBĐ KHÔNG hoàn tác — có cảnh báo).
6. **Bảo mật**: thêm kiểm thử tiêm chuỗi HTML vào dữ liệu dư nợ, TSBĐ (22 trường), ghi chú KH, tên mốc lưu trữ ⇒ phát hiện và escape 12 chỗ `${item.name}`… ở trang Lưu trữ/so sánh; e2e + đột biến.
7. **Bàn phím**: bẫy Tab cho hộp thoại (trước đây Tab chui ra menu), e2e + đột biến. **Hiệu năng**: không quét bảng định kỳ khi tab ẩn.
Kết quả cuối: `tests/run.js --mutation` 22/22 nhóm; e2e 82/82; 26 đột biến đều bị phát hiện (evidence/p05_run_full.txt). Hồi quy dữ liệu thật: hm17c 24/24, hm09b 0 vấn đề/0 lỗi, real10 + real12 0 lỗi (đối soát 10 chỉ tiêu), bảng Dư nợ 3.848 dòng thật không tràn ở 1920/1600/1366.
Chưa làm (cần ý kiến / máy thật): ghim cột Tên KH mặc định; bảng → thẻ thật; ngăn chi tiết ngay trong KH 360°/TSBĐ; hoàn tác cả TSBĐ/mốc; nhận loại tệp theo tiêu đề cột + xem trước; gỡ 8 observer; "Tất cả" 3.848 dòng dựng dần; escape hồ sơ vay; Edge/Windows/iPhone thật.
