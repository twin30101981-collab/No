# Báo cáo R2.5 — Baseline S1/P1.1 so ngân sách 17.1

Ngày đo: 2026-10-11 (sau R2.2 bể worker chung đợt 2).
Cách đo: `python3 scripts/do-chuan-s1.py 10 http://localhost:8080 <video.mjpeg>` — video camera giả
dựng từ bộ ảnh vàng V1 (12 ảnh), V13 (2 ảnh), Q (3 ảnh), lặp đổi trang liên tục; mỗi bộ chụp 10 trang
→ tổng 30 mẫu dựng trang (≥ 10 mẫu/bộ theo tiêu chí kiểm chứng).
Ngân sách: xem `ngan-sach-17.1.json`.

| Bộ | Công đoạn | Số mẫu | Median (ms) | P90 (ms) | Ngân sách median/p90 | Kết quả |
|---|---|---|---|---|---|---|
| V1 | grab | 28 | 10 | 15 | 50/150 | ĐẠT |
| V1 | detect1 | 1 | 225 | 225 | 400/800 | ĐẠT |
| V1 | normalize | 1 | 39 | 39 | 500/1000 | ĐẠT |
| V1 | detect2 | 1 | 45 | 45 | 400/800 | ĐẠT |
| V1 | release | 10 | 126 | 187 | 300/600 | ĐẠT |
| V1 | TỔNG 10 trang | 10 | 1786 | — | 10000 | ĐẠT |
| V1 | RAM đỉnh (MB) | — | 62.7 | — | 250 | ĐẠT |
| V1 | Lỗi trang | — | 0 | — | 0 | ĐẠT |
| V13 | grab | 27 | 8 | 14 | 50/150 | ĐẠT |
| V13 | detect1 | 1 | 172 | 172 | 400/800 | ĐẠT |
| V13 | normalize | 1 | 37 | 37 | 500/1000 | ĐẠT |
| V13 | detect2 | 1 | 49 | 49 | 400/800 | ĐẠT |
| V13 | release | 10 | 118 | 186 | 300/600 | ĐẠT |
| V13 | TỔNG 10 trang | 10 | 1573 | — | 10000 | ĐẠT |
| V13 | RAM đỉnh (MB) | — | 61.6 | — | 250 | ĐẠT |
| V13 | Lỗi trang | — | 0 | — | 0 | ĐẠT |
| Q | grab | 27 | 8 | 13 | 50/150 | ĐẠT |
| Q | detect1 | 1 | 182 | 182 | 400/800 | ĐẠT |
| Q | normalize | 1 | 31 | 31 | 500/1000 | ĐẠT |
| Q | detect2 | 1 | 42 | 42 | 400/800 | ĐẠT |
| Q | release | 10 | 123 | 182 | 300/600 | ĐẠT |
| Q | TỔNG 10 trang | 10 | 1596 | — | 10000 | ĐẠT |
| Q | RAM đỉnh (MB) | — | 60.4 | — | 250 | ĐẠT |
| Q | Lỗi trang | — | 0 | — | 0 | ĐẠT |

## Kết luận

- Cả 3 bộ: 10/10 trang thành công, 0 lỗi trang, RAM đỉnh 60–70 MB (trần 250 MB).
- Nhả nút tường (release) median ~117–130 ms, p90 ≤ 235 ms — trong ngân sách 300/600.
- Tổng 10 trang 1.6–1.8 s — xa dưới trần 10 s (cải thiện rõ so baseline cũ 3.9–6.2 s nhờ R2.2).
- Ảnh kiểm chứng: `V1_sau-10-trang.png`, `V13_sau-10-trang.png`, `Q_sau-10-trang.png`.
- Kết quả tổng: **ĐẠT toàn bộ ngân sách 17.1**.

Lưu ý: đo trên Chromium headless trong sandbox; số trên điện thoại thật cần đo lại khi có máy.
