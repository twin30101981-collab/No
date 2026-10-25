# P07 (23/10/2026)
Quyết định: không đụng nhánh ccr-266ec07a-kxmt78; giao diện P06 ổn, bật ghim cột Tên KH mặc định; làm rà escape TSBĐ/hồ sơ vay, HM-18, HM-23.
- SEC: sửa escape ngày TSBĐ + danh sách/tìm kiếm/so sánh hồ sơ vay + gợi ý Mã KH (153, 071, 073). Lỗi xác nhận trên P05 trước khi sửa.
- HM-17: ghim cột Tên KH mặc định (>=1280 px). HM-23: sniffKind theo tiêu đề cột. HM-18: thêm e2e hộp thoại khi cuộn; chưa gỡ observer.
- Kết quả: tests/run.js --mutation 22/22 nhóm, e2e 86/86, 29 đột biến đều bị phát hiện (evidence/p07_run_full.txt).
- App: app/QLTD_PRO_v2026-10-23_v22.3-P07.html — SHA-256 bb31a5e9bde37a333b737fd95b3a813c4bc94a19fad736978c32ba64d80e9d5f (5,79 MB).
