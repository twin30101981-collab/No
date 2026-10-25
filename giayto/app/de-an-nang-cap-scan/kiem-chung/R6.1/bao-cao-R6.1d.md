# Báo cáo R6.1d – Xử lý nốt ảnh mực nhạt IMG_20261002_093540

Ngày: 2026-10-11

## Vấn đề
Sau R6.1c còn 9/221 ca trượt, tất cả của ảnh 093540 (nền xám, mực nhạt):
ΔL 51 (auto, auto+khử bóng/khử nhiễu), 56 (sharp, gray) < 60.

## Thay đổi (src/lib/image.ts)
- Bộ lọc auto/sharp: thêm `inkDeepen(d, 170, 2.2)` sau docchain — chỉ làm đậm
  vùng tối hơn gối 170, nền giấy giữ nguyên. Lần thử đầu dùng (200, 3.0) làm sharp
  vượt ngưỡng góc tối (5,71%) nên đổi sang đường cong dịu hơn.
- Bộ lọc gray: thêm lượt thứ hai `inkDeepen(d, 160, 2.2)`.

## Kết quả
- Kiểm chứng 17 ảnh × 13 cấu hình: **221/221 đạt (100%)**, trước đó 212/221 (95,9%). Không có lỗi trang.
- 093540: ΔL auto 76, sharp 81,6, gray 81,7; góc tối cao nhất 4,8% (≤ 5%).
- Kiểm thử: 830/830 đạt (183 tệp); tsgo không lỗi.
- Kịch bản kiem-chung-r61.py dùng cổng 8081.
