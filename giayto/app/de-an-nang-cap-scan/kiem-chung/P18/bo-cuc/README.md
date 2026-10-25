# TD-27 (P18, 13/10/2026): soi bố cục từng màn sau khi Button/Input cao hơn (HM-05)

Công cụ: scripts/playwright/kiem-bo-cuc-p18.mjs (Chromium, 360×640 và 390×844; 14 trạng thái/khổ: 4 trang chính, Quét với camera giả,
hộp thoại Ký số, màn Tài liệu, Cắt, Chỉnh tay (+ cuộn cuối), Ký/Vẽ, Nhận chữ, Tùy chọn). Đo: tràn ngang, nút ra ngoài mép,
nút dưới đáy không cuộn tới, nhãn bị cắt, nút chồng nhau, dải cuộn ngang bị bóp cao, tương phản chữ < 3.

Lỗi thật tìm thấy và đã sửa:
1. Chỉnh tay/Lọc: dải chọn bộ lọc (Màu gốc/Thần kỳ/…) bị bóp còn 4/44 px — gần như vô hình, bị thẻ phía trên che
   (cột flex cuộn + overflow-x → min-height 0). Sửa: shrink-0. Ảnh sau sửa: bc_390_Ch-nh-tay-cu-n-cu-i-.jpg.
2. Cắt ở 360×640: hàng "Tự động / Toàn ảnh / Áp dụng" và dải khổ giấy nằm ngoài đáy, không bấm được
   (ảnh cố định 62dvh). Sửa: vùng ảnh co giãn theo chỗ trống (flex-1 min-h-0 + ResizeObserver). Ảnh: bc_360_C-t.jpg;
   kiem-cat-man-thap.mjs: mã cũ không bấm được Áp dụng (hết giờ chờ), mã mới kéo góc + Áp dụng lưu quad — ĐẠT.
3. Chỉnh tay: thẻ "Phương án khác", khung "Chẩn đoán AI", nút "Xuất số đo" tương phản 1,02–1,50 (chữ sáng của màn tối trên nền sáng).
   Sửa: đặt màu chữ theo nền (text-foreground/text-card-foreground).

Sau sửa: 0 vấn đề bố cục ở cả 2 khổ. Còn lại (KHÔNG sửa, cần chủ dự án quyết — TD-46): chữ trắng trên màu thương hiệu primary
(nút chính, chip đang chọn) tương phản 2,40; chữ màu primary/muted nhỏ trên nền sáng 2,07–2,31 (WCAG AA cần 4,5; chữ lớn 3).
Báo giả đã loại: nền mờ của Sheet (nút "Đóng" phủ toàn màn), nội dung cuộn dưới thanh dưới cố định.
Chưa kiểm: máy thật, Safari/Firefox, chữ lớn (html.large-text), giao diện tối toàn app.
