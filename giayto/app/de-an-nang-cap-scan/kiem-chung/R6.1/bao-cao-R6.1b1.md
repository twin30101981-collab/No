# Báo cáo R6.1b-1 – Đo nền 221 ca (mục con 1 của R6.1b)

Ngày: 2026-10-11

## Chia nhỏ R6.1b thành 3 mục con

- **R6.1b-1 (mục con này) — ĐÃ XONG**: dựng môi trường, chạy lại
  `scripts/kiem-chung-r61.py` (221 ca) để đo nền sau tinh chỉnh R6.1a.
- **R6.1b-2 (chưa làm)**: phân tích các ca trượt theo bộ lọc; tinh chỉnh
  đường cong mực/nền cho auto, gray, ink, eco và nhóm auto+deshadow/denoise.
- **R6.1b-3 (chưa làm)**: chạy lại kiểm chứng 221 ca, xác nhận ≥ 95% đạt
  cổng, viết báo cáo kết luận R6.1b.

## Kết quả đo nền

- Tổng: **40/221 ca đạt (18,1%)** — cải thiện so với đợt 2 (9,5%) nhưng còn
  xa mục tiêu ≥ 95%.
- Không có lỗi trang (loi_trang rỗng); 17 ảnh × 13 cấu hình chạy trọn vẹn.

| Cấu hình | Đạt / Tổng |
|---|---|
| magic | 13/17 |
| auto | 1/17 |
| sharp | 7/17 |
| mono | 12/17 |
| gray | 1/17 |
| ink | 0/17 |
| eco | 0/17 |
| auto+deshadow1/2/3 | 1/17 mỗi cấp |
| auto+denoise1/2/3 | 1/17 mỗi cấp |

## Nhận định ban đầu (đầu vào cho R6.1b-2)

- Lỗi chủ đạo vẫn là **ΔL < 60** (mực chưa đủ đậm so với nền), kể cả sau khi
  R6.1a tăng boost — cần đo lại trung vị mực thực tế trên các ca trượt.
- ink và eco trượt toàn bộ: kiểm tra lại đường cong eco (t = (y−30)/175) và
  ngưỡng Sauvola của ink trên ảnh thật; cân nhắc flatten nền trước khi lọc.
- Nhóm auto+deshadow/denoise kế thừa đường cong auto nên trượt theo auto.

## Môi trường chạy

- Máy chủ dev chạy ở cổng 8090 (cổng 8080 bị chiếm trong môi trường này);
  đã sửa `B` trong `scripts/kiem-chung-r61.py` thành `http://127.0.0.1:8090`.
- Kết quả đầy đủ: `de-an-nang-cap-scan/kiem-chung/R6.1/ket-qua.json`.
