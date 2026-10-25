# P08 (23/10/2026)
PROMPT để trống các quyết định ⇒ chỉ làm việc kỹ thuật không cần quyết định; KHÔNG đụng nhánh ccr-266ec07a-kxmt78, KHÔNG gửi HM-11, KHÔNG dùng khoá AI, KHÔNG gỡ observer HM-18 (thiếu số đo), KHÔNG làm xem trước/loại dòng ở Trung tâm nhập (cần thiết kế).
- Mốc trước khi sửa: sha256sum -c MANIFEST OK; `node tests/run.js` 21/21, e2e 86/86.
- HM-17 (ghim cột): Chuyển HM + TSBĐ có ô "📌 Ghim đến Tên KH" (mặc định TẮT, lưu theo bảng); Giá đất không ghim. Sửa src/js/051 + evidence/scripts/td_cols.js (nhúng nguyên văn). +3 phép kiểm e2e, +1 đột biến.
- Kết quả: `node tests/run.js` 21/21, e2e 89/89. Đột biến HM-17: xem cuối tệp này.
- Bản phát hành: app/QLTD_PRO_v2026-10-23_v22.3-P08.html (SHA ghi trong HANDOVER).
- Đột biến HM-17 (--only HM-17): 3/3 bị phát hiện (gồm đột biến mới 'ô ghim không có tác dụng'). Chưa chạy đủ --mutation 29 đột biến (~3 giờ) — phiên sau chạy nền.

## Phần 2 (theo yêu cầu: thực thi B theo thứ tự 5,2,3,4,6,1)
- **5 — SRI SheetJS 0.20.3: KHÔNG làm được.** cdn.sheetjs.com, jsDelivr: 403 qua proxy; npm chỉ có xlsx ≤0.18.5. Không tạo băm giả. Cần môi trường có mạng tới cdn.sheetjs.com (lệnh: `curl -sS https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js | openssl dgst -sha384 -binary | openssl base64 -A` rồi điền `sri: 'sha384-…'` ở src/js/001).
- **2 — HM-18: đã ĐO, không gỡ.** evidence/p08_hm18_do.json + scripts/hm18_measure.js. Nhàn rỗi 10 s ≈ 0 ms; lượt duyệt 7 trang ≈ 0,2 s (phần lớn là khởi tạo trang thật).
- **3 — HM-17b "Tất cả":** đo tuyến tính ≈2,5 ms/dòng (scripts/hm17b_all.js); làm dựng dần (>600 dòng: 400 dòng đầu ngay, còn lại theo đợt). +1 e2e, +1 đột biến.
- **4 — HM-23 Trung tâm nhập:** ô "Nhập" loại tệp + "Xem trước" tiêu đề/5 dòng đầu. +2 unit, +1 e2e, +2 đột biến (cờ loại bị bỏ qua; xem trước không escape).
- **6 — HM-21:** phân tích, không đổi mã (xem backlog).
- **1 — đột biến:** chạy đủ `tests/mutation.js` (kết quả ở cuối tệp).
- Kiểm thử sau Phần 2: `node tests/run.js` 21/21, e2e 91/91.
- **Đột biến đầy đủ (mục 1): 33/33 bị phát hiện, 0 lọt** (evidence/p08_mutation_full.txt), gồm 5 đột biến mới của P08.
