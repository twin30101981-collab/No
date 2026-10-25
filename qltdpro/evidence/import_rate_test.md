# Phép thử nhập tệp thật (V3) — 21/10/2026
Môi trường: Playwright + Chromium (/opt/pw-browsers), python3 -m http.server trên bản sao app (SHA-256 e51038ee…7fbb37).
Chỉ ghi số tổng hợp; không chứa dòng dữ liệu khách hàng.

| Phép thử | Tệp gốc | App | Kết luận |
|---|---|---|---|
| Nhập 31.05.2026.xlsx – lãi suất | 9%:1.322 · 8,5%:750 · 9,5%:476 · 10%:210 · 8%:205 | 19%: 3.642/3.642 | Sai toàn bộ (P0-2) |
| Σ dư nợ / dòng >0 / KH | 2.009.209.975.285 · 3.639 · 1.815 | 2.009.209.975.285 · 3.639 · 1.815 | Khớp |
| Tải lại sau nhập | — | 3.587 khoản đúng (nhờ bảng 04/06); 52 khoản vẫn 19% (Σ 25.567.890.134 đ); tải lại lần 2 ổn định | Phụ thuộc dữ liệu cứng (P0-3) |
| Nhập 20.10.2026.XLS | 3.918 dòng | "Lỗi đọc file: XLSX không có sẵn (bundle offline lỗi)" | Không nhập được (P0-1) |
| Tải trang | — | pageerror "Failed to execute 'appendChild'… Invalid or unexpected token" (L56348) | Lỗi mỗi lần tải |
Script: build/smoke.js, build/importtest.js, build/ratetest.js
