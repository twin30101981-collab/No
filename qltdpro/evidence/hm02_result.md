# HM-02 — Bộ đọc .xlsx không biến số thành ngày — ĐẠT-V3 (21/10/2026)
Nguyên nhân gốc: parseXLSX tự viết đổi MỌI số 1<x<100000 thành chuỗi ngày (không xét định dạng ô) → lãi suất 8,5 thành "1900-01-07" → coercePercent đọc 19%; dư nợ <100.000 đ thành 0. Ngoài ra regex ô nuốt ô kế tiếp khi gặp <c .../>, và luôn đọc sheet1.xml.
Sửa tại: parseXLSX (L32050→): ưu tiên SheetJS (cùng đường .xls); bộ đọc cũ đổi tên parseXLSX_fallback và sửa 3 điểm (chỉ đổi ngày theo định dạng ô trong styles.xml; xử lý <c/>; sheet đầu theo workbook.xml); loadSheetJS chờ thư viện trì hoãn (P2-6). Script: build/apply_hm02.py.
Chống tái diễn: build/hm02_test.js + hm02_compare.py (nhập qua giao diện, so từng khoản vay với tệp gốc). Thất bại với mã cũ (3.642/3.642 sai LS), đạt với mã mới.
Kết quả V3 (Chromium; 2 đường: SheetJS và dự phòng khi XLSX=undefined) — xem evidence/hm02_compare.txt:
| Tệp | Mã cũ: sai lãi suất | Mã mới: sai LS / dư nợ / ngày |
|---|---|---|
| 31.05.2026.xlsx (3.642 khoản) | 3.642 (toàn bộ 19%) | 0 / 0 / 0 (cả 2 đường) |
| 31.12.2025.xlsx (3.684) | 3.684 | 0 / 0 / 0 (cả 2 đường) |
| synthetic.xlsx (3 dòng: LS 8,5 và 5; dư nợ 50.000 và 99.999; ô ngày; ô trống có kiểu; sheet đầu ≠ sheet1) | 3/3 LS sai, dư nợ sai 2 | 0 / 0 / 0 (cả 2 đường) |
| 20.10.2026.XLS (hồi quy) | 0 | 0 / 0 / 0 |
Không có pageerror, console.error, hộp thoại lỗi. Σ dư nợ khớp tệp ở mọi tệp.
Giới hạn: kiểm 2/6 tháng .xlsx thật (T12, T5) + tệp tổng hợp; chưa kiểm Edge/Windows; tải lại trang vẫn bị bảng lãi suất 04/06 ghi đè (HM-03); nhóm nợ trống vẫn mặc định "Nhóm 1" (HM-08); dòng apprdt = 1900-01-01 chưa xử lý riêng.
SHA-256 bản mới: 4786ea70fdcba01e67ca94c43ba3e91f382519b2280547dbe3e002f344c730a0
