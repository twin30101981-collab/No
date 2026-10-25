# P04d — làm theo quyết định của người dùng (22/10/2026)
Quyết định (chọn qua hộp hỏi trong phiên): sự cố git = XOÁ HẲN nhánh; HM-21 = phạm vi nhỏ (HM-13b + gộp CSS trùng); HM-16c = ổn, gộp nốt phần còn lại;
HM-09 thêm dòng "Chưa phân CBTD"; HM-11 OCR NQ38; HM-28 Excel có định dạng; HM-25 giữ ngưỡng (clholdcd N = đang giữ).

## 1. Sự cố dữ liệu thật trong git — CHƯA xoá được từ phiên này
Không có PR nào từ nhánh ccr-266ec07a-kxmt78. Lệnh `git push origin --delete ccr-266ec07a-kxmt78` bị máy chủ git của phiên từ chối (phiên chỉ được đẩy lên nhánh của chính nó) ⇒ người dùng tự xoá trên GitHub (Branches → thùng rác cạnh nhánh), rồi liên hệ GitHub Support để dọn commit mồ côi/cache (commit 649fdb2).

## 2. HM-16 — gộp nốt tab
- Thanh mục trang Giá đất (`.bgd-snav-btn`) trước đây KHÔNG có CSS (nút mặc định của trình duyệt 13,33px/400) ⇒ đưa vào kiểu A (gạch chân) + khung `.bgd-subnav` có gạch nền.
- Tab nền tối `.lt-tab` (nút) và `.hsv-mob-tab` (gạch chân) dùng chung token `--tab-dk-*` (cỡ chữ, độ đậm, màu, màu đang chọn); gỡ thuộc tính trùng ở khai báo cũ.
- e2e HM-16c: nhóm A thêm `bgd-snav-btn`; phép kiểm mới cho tab nền tối. Bản trước thất bại đúng ở 2 phép.

## 3. HM-25 — giữ ngưỡng (LS 4–13 %, định giá cũ > 36 tháng, TS hết hạn); nhãn thống kê `clholdcd`: "N (đang giữ)". Không đổi số liệu, không dùng để lọc.

## 4. HM-09 — KHÔNG thêm được dòng vào "Bảng II–V": trang đó không tồn tại
Trang Báo cáo KHKD (`#page-bckh`, Bảng II–V) đã không còn trong DOM từ bản gốc v22.3 (HM-14 đã ghi nhận) — chỉ còn mã JS `bckh*` mồ côi; dải cảnh báo HM-09 của nó không bao giờ hiển thị. Báo cáo đang dùng thật (Word/Excel HM-28, trang "Theo CBTD") nhóm theo tên CBTD trong dữ liệu và ĐÃ có dòng "(Chưa phân công)" cho CBTD trống ⇒ phần dư nợ chưa phân không bị bỏ sót. Không dựng lại trang đã bị bỏ — cần người dùng xác nhận nếu muốn khôi phục trang KHKD.
Phát hiện thêm (trong mã mồ côi, không ảnh hưởng người dùng): bckhAutoFillAll gọi bckhRecalc('khachhang') sau khi điền ⇒ ghi đè tổng KH của MỌI cột (mốc cũ) bằng số KH của dữ liệu hiện tại.

## 5. HM-11 — OCR NQ38 (tesseract 5.3.4 + tiếng Việt, 300 dpi, ngoài repo)
Tệp `38-nqhd1-…pdf` chỉ có 10 trang: nghị quyết + Quy định chung (Chương I–III); BẢNG GIÁ THEO TÊN ĐƯỜNG nằm ở Phụ lục I (trang 10 chỉ liệt kê tên các phụ lục) — KHÔNG có trong tệp ⇒ không bổ sung được giá cho 54 khoá trùng. Cần tệp Phụ lục I.
Đối chiếu được: giá đất nông nghiệp Điều 5 (khu vực phường) trong trang "Đất nông nghiệp" của app KHỚP OCR: 80.000 / 85.000 / 30.000 / 70.000 / 110.000 / 30.000 / 25.000 / 40.000 đ/m². Giá khu vực xã (75.000 / 80.000 / 100.000) OCR không đọc được cột ⇒ chưa xác nhận.

## 6. HM-28 — báo cáo Excel CÓ định dạng (không thêm thư viện)
Module thuần `TD.xlsx` (evidence/scripts/td_xlsx.js, nhúng nguyên văn) tự dựng gói .xlsx từ khuôn TD.report.sheets và đóng gói bằng JSZip đã nhúng: tiêu đề đậm 14 gộp ô, đề mục nền xanh nhạt, hàng tiêu đề cột nền navy chữ trắng đậm + viền, dòng TỔNG nền xám đậm, `#,##0` / `0.0%`, KHỚP xanh / LỆCH đỏ, cố định hàng tiêu đề, khổ A4 ngang vừa 1 trang ngang, font Times New Roman 12. Thiếu JSZip ⇒ ghi bằng SheetJS như cũ. App +~13 KB.
Kiểm chứng: td_xlsx.test.js 15/15 (đọc lại bằng openpyxl: giá trị MỌI ô = TD.report.sheets, kiểu ô đúng); e2e HM-28 thêm phép kiểm định dạng + đột biến "quay về SheetJS trơn"; dữ liệu thật hm28b_real + hm28b_check 15/15 (Excel = Python tính lại từ XLS gốc; Word = Excel).

## 7. HM-13b — một showPage + sổ hook; gỡ bộ phím cũ
- `TD.onShowPage(fn)`: hook chạy đồng bộ ở cuối showPage gốc, MỖI lần gọi (kể cả mở lại cùng trang). 9 lớp bọc `window.showPage = function…` (069, 077, 091, 095, 101, 105, 111, 127; 093 trùng lời gọi có sẵn) chuyển thành đăng ký; lớp ở 031 chưa bao giờ được cài (chạy trước khi showPage tồn tại) ⇒ gỡ.
- Đối chứng hành vi (evidence/scripts/hm13b_trace.js): 28 lần chuyển trang (mọi trang + mở lại) — trang active, tiêu đề, các hàm khởi tạo được gọi, nút in, nút thu gọn bộ lọc, dòng được quét: TRÙNG KHỚP trước/sau (pageFsUpdateBtn 2 → 1 lần, đúng ý đồ).
- Gỡ nhánh Ctrl/⌘+S/E/K cũ ở 6 bộ nghe (043, 055, 105, 107, 115, 149). Bản cũ: Ctrl+Shift+S (không bị TD.keys chặn) gọi hosoSilentSave 2 lần + saveData + "lưu bản nháp"; nay không. Bản nháp TD15 vẫn tự lưu 30 giây; Export Center vẫn trong bảng lệnh. hm15_test.js 18/18.
- e2e bước Z + đột biến "showPage không chạy sổ hook".

## 8. HM-21 (phạm vi nhỏ) — gộp CSS trùng: tools/css-dedupe.mjs
Nguyên lý an toàn: một khai báo ở quy tắc TRƯỚC là thừa nếu một quy tắc SAU, cùng ngữ cảnh @media/@supports và cùng selector, khai báo lại đúng thuộc tính với !important ≥ — bản sau luôn thắng. Chromium xác nhận selector phân tích được và `CSS.supports(thuộc tính, giá trị)`; quy tắc trình duyệt coi là vô hiệu không được tính là "đè".
Kết quả: xoá 23 quy tắc thừa, bỏ 140 khai báo bị đè (42 quy tắc rút gọn) trong 009-td-perfa-content-vis.css.
Kiểm chứng: evidence/scripts/hm21_css_cmp.js — giá trị CSS TÍNH RA (mọi thuộc tính) của 61.637 phần tử, 26 trang × 1500/390 px: 0 khác biệt ngoài nhiễu (2 lần chạy cùng bản lệch 52 vị trí do thời điểm dựng; 1 chênh 12 px chiều cao Tổng quan ở 390 px cũng xuất hiện giữa 2 lần chạy cùng bản).
Lần thử đầu sai 1 phần tử (#btn-mob-menu) vì bộ quét bỏ qua '}' thừa — phát hiện nhờ phép đối chứng; đã sửa bộ quét theo cách trình duyệt xử lý.
PHÁT HIỆN LỖI CSS NỀN (không sửa — thay đổi giao diện, cần người dùng quyết): chú thích `/* ═══ MOBILE RESPONSIVE — max-width: 768px` không đóng nuốt dòng `@media(max-width:768px){` ⇒ ~45 quy tắc "chỉ cho điện thoại" (sidebar trượt, topbar gọn, ẩn nút, bảng FHS xếp dọc, modal 96 %) đang áp ở MỌI độ rộng (bị các quy tắc sau đè một phần); dấu '}' thừa cuối khối làm trình duyệt bỏ quy tắc `#btn-mob-menu{display:none}` ⇒ nút ☰ hiện cả trên máy tính. Chú thích `PAGE HSVV` không đóng (đã ghi ở P04) cũng nuốt 2 quy tắc.

## 9. Phát hành: QLTD_PRO_v2026-10-22_v22.3-P04d.html — xem evidence/p04d_run_full.txt.
Kết quả: tests/run.js --mutation --real = 23/23 nhóm; e2e 61/61; 16/16 đột biến bị phát hiện (evidence/p04d_run_full.txt).
Hồi quy dữ liệu thật trên P04d: hm17c_real 24/24 · hm09b_real 0 vấn đề · real10 TSBĐ (1.865 KH còn nợ) · real12 đối soát 10/10 khớp · hm23 15/15 · hm24 22/22 · hm25 17/17 · hm26 18/18 · hm15 (phím tắt) 18/18 · hm28b_real + check 15/15 (trên bản dựng trước khi gộp CSS); 0 pageerror.
