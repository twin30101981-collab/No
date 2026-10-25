# HM-01 — Sửa thư viện SheetJS nhúng — ĐẠT-V3 (21/10/2026)
Nguyên nhân gốc: 2 khối <style> (td-global-font, fix-nut-noi-density) bị chèn vào chuỗi JS `yb='<html><head>…'` của SheetJS 0.20.3; khối thứ hai có xuống dòng thật → script td-vendor-xlsx không biên dịch → window.XLSX không có.
Sửa: khôi phục chuỗi gốc `<html><head><meta charset="utf-8"/><title>SheetJS Table Export</title></head><body>` (1 vùng, −1.171 byte). Script tái lập: build/apply_hm01.py.
Chống tái diễn: build/check_scripts.js biên dịch thử mọi khối <script> (bản gốc: 1/74 lỗi → bản mới: 0/74). Chạy trước mỗi lần phát hành.
Kiểm chứng V3 (Playwright + Chromium, 1920×1080 và 1366×768):
| Kiểm tra | Kết quả |
|---|---|
| XLSX.version | 0.20.3 (cả 2 kích thước) |
| pageerror / console.error khi tải | 0 |
| Xuất .xlsx rồi đọc lại (chuỗi “Việt”) | Đạt |
| Nhập 20.10.2026.XLS | 3.918 dòng · Σ 2.160.375.016.661 đ · 1.865 KH dư nợ>0 · lãi suất khớp tệp 3.918/3.918 |
| Nhập 30.06.2026.XLS | 3.763 dòng · Σ 2.064.987.992.653 đ · 1.839 KH · lãi suất khớp 3.763/3.763 |
| Giao diện | Không đổi (CSS trong 2 khối chưa từng có hiệu lực) |
Giới hạn: chưa kiểm nhập .xlsx (lỗi 19% thuộc HM-02); chưa kiểm trên Edge/Windows thật.
SHA-256 bản mới: b9f6c2838c97e0ca76e7b2fb214f117d50200a8d497a60e34df48076ebffa724
