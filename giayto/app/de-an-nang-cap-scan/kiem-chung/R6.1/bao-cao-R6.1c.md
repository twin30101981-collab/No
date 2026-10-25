# Báo cáo R6.1c – Nới cổng góc tối 17.4 từ 0,2% lên 5%

Ngày: 2026-10-11

## Quyết định

Người dùng chọn phương án nới cổng (thay vì chỉ đo vùng nền không chữ):
góc tối còn lại sau R6.1b-3 chủ yếu là CHỮ THẬT sát mép giấy, xoá tiếp sẽ phá
tài liệu. Ngưỡng mới: góc tối ≤ 5%.

## Thay đổi

- `src/lib/quality-gate.ts`: `GATE.darkCorner` 0,002 → 0,05; thông báo lỗi
  "Góc tối … > 5%"; chú thích ghi rõ lý do nới.
- `src/lib/quality-gate.test.ts`: ca "góc ố đen" cập nhật theo ngưỡng 5%.
- `scripts/kiem-chung-r61.py`: ngưỡng ghi trong báo cáo đổi thành ≤ 5%;
  sửa cổng máy chủ kiểm thử 8090 → 8080.

## Kết quả

- Kiểm thử: 826/826 đạt (182 tệp).
- Kiểm chứng lại 221 ca (17 ảnh × 13 cấu hình): **212/221 đạt (95,9%)**,
  vượt mục tiêu ≥ 95%. Không lỗi trang.
- 9 ca trượt còn lại đều thuộc 1 ảnh duy nhất (IMG_20261002_093540) do
  ΔL 51–56 < 60 (nét chữ nhạt) trên các cấu hình auto/sharp/gray/deshadow/
  denoise — vấn đề độ đậm mực, không liên quan góc tối.

## Còn lại

- Ảnh IMG_20261002_093540 ΔL < 60: cân nhắc tăng boost mực cho ảnh nền xám
  đặc thù này hoặc chấp nhận (1/17 ảnh).
- R6.3: chạy lại scripts/playwright/nghiem-thu.py trên cổng 8080.
