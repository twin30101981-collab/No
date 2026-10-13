# R6.3c – Chạy lại nghiệm thu R6.3 trên bản build R6.1d

Ngày: 2026-10-11 · Bản thử: build từ mã nguồn sau R6.1d (183 tệp / 830 kiểm thử đạt, tsc không lỗi).

## Kết quả: 5/5 tiêu chí đạt (ket-qua.json, bao-cao.md, tc1-danh-sach-20-trang.png)

| Chỉ số | R6.3b (trước R6.1d) | R6.3c (sau R6.1d) | Ngân sách |
|---|---|---|---|
| 20 trang, tổng thời gian | 1,3 s | 5,8 s | — |
| Giây / trang | 0,06 | 0,29 | ≤ 10 |
| RAM đỉnh (heap JS) | 19,6 MB | 22,0 MB | ≤ 512 |
| Lỗi console | 0 | 0 | 0 |

Hai lần chạy khác máy, chưa tách được nguyên nhân: thời gian/trang tăng ~4,8 lần có thể do máy chạy (Chromium không GPU trong sandbox) hoặc do hai lượt `inkDeepen` mới của R6.1d. Cả hai đều còn rất xa ngân sách 10 s/trang. Muốn kết luận phải đo cùng máy trước/sau (việc của R6.4 trên máy thật).

## Điều kiện chạy (trung thực)
- Sandbox không có internet. Lần chạy đầu (không cờ) chỉ đạt 1/5, và lỗi console duy nhất là
  `ERR_NAME_NOT_RESOLVED` của `https://fonts.googleapis.com/css2?family=Manrope…&family=Sora…`
  (khai báo ở `src/routes/__root.tsx`, dòng 111–113). Không có yêu cầu nào khác thất bại.
- Vì vậy `scripts/playwright/nghiem-thu.py` có thêm cờ môi trường **`NGHIEM_THU_CHAN_FONT=1`**
  (mặc định TẮT) để trả CSS rỗng cho phông Google. Kết quả 5/5 ở trên là lần chạy có cờ này.
  Trên máy có mạng, chạy không cờ như cũ.
- Cài thư viện bằng npm (không có bun) nên phiên bản thư viện có thể lệch `bun.lock`; npm cần thêm
  `@testing-library/dom` (peer dependency, không khai báo trong package.json) mới chạy được 4 tệp kiểm thử giao diện.
- Build của môi trường này ra `.output/` (nitro 3.0.260603-beta), không phải `dist/` như ghi trong
  `wrangler.local.jsonc`. Chạy thử: `npx wrangler dev -c .output/server/wrangler.json --port 4174`.
- Chưa chạy lại cổng chất lượng R6.1 (`scripts/kiem-chung-r61.py`, 221 ca) trong phiên này; số 221/221 là của báo cáo R6.1d.
