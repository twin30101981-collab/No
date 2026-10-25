# P04c — hồi quy V3 trên dữ liệu thật cho bản P04b, CI, đo "Tất cả" (22/10/2026)
App: QLTD_PRO_v2026-10-22_v22.3-P04b.html (không đổi mã ở bước này). Dữ liệu thật ở /tmp/claude-0/real/data (ngoài repo).

## 1. CI GitHub Actions (HM-22)
qltdpro-tests chạy trên GitHub: run #1 (commit 3490ef3) và #2 (commit 0c23192) — cả hai **success**.

## 2. Hồi quy trên dữ liệu thật (bổ sung cho p04b_result.md)
| Script | HM | Kết quả |
|---|---|---|
| hm23_test.js (12 tệp hợp lệ + 3 bỏ qua: bản trùng, PDF; 11 mốc) | HM-23 | 15/15 |
| hm24_test.js (xu hướng 11 kỳ ↔ trend_indep.py) | HM-24 | 22/22 |
| hm25_test.js (cảnh báo sớm 20/10 + TSBĐ) | HM-25 | 17/17 |
| hm26_test.js (KH 360° ↔ kh360_indep.py) | HM-26 | 18/18 |
| real12.js (trang Đối soát, biên bản) | HM-12 | 10/10 chỉ tiêu khớp; cố ý sửa 1 khoản +1 tr ⇒ báo đúng 1 chỉ tiêu lệch |
| real07.js (ngày dữ liệu 30/06, 20/10, 31/05) | HM-07 | đúng ngày, mốc lưu đúng; đến hạn tính theo ngày dữ liệu |
0 pageerror ở mọi script.

## 3. "Tất cả" 3.848 dòng (HM-17) — đo nguyên nhân, KHÔNG sửa
CPU profile: JS dựng bảng 0,25–0,9 s; phần còn lại là trình duyệt tính kiểu (≈2,1 s cho ~120.000 phần tử) và layout lần đầu (bảng table-layout:auto phải đo mọi ô). Layout lại sau đó chỉ ~15 ms (dòng đã có content-visibility:auto).
Thử 7 biến thể CSS (table-layout:fixed, bỏ position/z-index trên ô, bỏ content-visibility, nowrap, bỏ text-transform…), mỗi biến thể 3 lần: số đo dao động 2,5–8,5 s theo lần chạy (lần đầu chậm nhất), không biến thể nào ổn định tốt hơn bản gốc ⇒ CSS không phải nguyên nhân quyết định.
Cách nhanh hơn thật sự là dựng dần theo đợt; nhưng "chọn tất cả", xuất, lọc cột, dòng tổng đang giả định đủ dòng ngay sau renderTable ⇒ rủi ro hồi quy lớn hơn lợi ích cho một chế độ đã ghi nhãn "chậm" (mặc định 100 dòng/trang dựng ~50 ms). Giữ nguyên.
