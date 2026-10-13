# Báo cáo R6.1a – Tinh chỉnh đường cong mực 6 bộ lọc (mục con 1 của R6.1 đợt 3)

Ngày: 2026-10-11 (đợt 3, mục con 1)

## Chia nhỏ R6.1 đợt 3

- **R6.1a (mục con này)**: tinh chỉnh đường cong mực của 6 bộ lọc giữ xám/màu
  (auto, sharp, magic, gray, ink, eco) để ΔL ≥ 60 mà không cháy nền.
- **R6.1b (mục con 2, chưa làm)**: chạy lại `scripts/kiem-chung-r61.py` (221 ca),
  mục tiêu ≥ 95% ca đạt cổng; xử lý tiếp góc tối > 0,2% nếu còn.

## Nút thắt từ đợt 2

Cổng 17.4 yêu cầu ΔL ≥ 60: nền giấy ~248 (L* ≈ 97) nên trung vị mực phải ≤ ~53
(L* ≤ 37). Đợt 2 đo được: auto 42, sharp 51, magic 53, gray 25, ink 34, eco 23.

## Đã sửa

| Bộ lọc | Tệp | Thay đổi |
|---|---|---|
| auto | src/lib/pixels.ts (docChain) | boost autoLevel 1 → 1.55 |
| sharp | src/lib/pixels.ts (docChain) | boost autoLevel 1.25 → 1.85 |
| magic | src/lib/image.ts | gamma 1.6 → 2.3; ngưỡng trắng 215 → 205 |
| gray | src/lib/image.ts | sau xám hoá: autoLevel boost 1.7 (nền neo PAPER_TARGET) |
| ink | src/lib/pixels.ts (thresholdPixels) | mực xám đậm 90 → 45 |
| eco | src/lib/pixels.ts (stylePixels) | t = (y−30)/175, v = 255·t^2.2 — đen nhất về 0, giấy vẫn trắng |

Ước tính theo đường cong: mực trung vị ~120 ở đầu vào → ~34–65 sau lọc,
ΔL kỳ vọng 60–75. Nền giấy không đổi (neo 248 / giữ trắng) nên độ lệch nền
và góc tối không xấu đi về lý thuyết.

## Kiểm thử

- Cập nhật 3 kiểm thử phản ánh hằng số cũ (s15e-docchain boost, eco 105→0,
  Sauvola ink 90→45).
- Kết quả: 180 tệp / 822 kiểm thử đạt, tsgo --noEmit sạch.

## Còn lại (R6.1b)

- Chạy lại `scripts/kiem-chung-r61.py` trên cổng 8080 để đo lại 221 ca;
  mục tiêu ≥ 95% đạt cổng (đợt 2: 9,5%).
- Nếu eco/gray/ink vẫn góc tối > 0,2%: cân nhắc flatten nền trước khi lọc gray.
