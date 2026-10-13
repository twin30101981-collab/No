# Bộ kiểm thử hồi quy (R2.6)

Các kiểm thử trong thư mục này bắt nguồn từ các bản thuật toán thử nghiệm `-vN`
(V5d, V5e, V6, V7, V8b, V9, V11). Mã thuật toán đã gộp vào tệp chính; các kiểm
thử được giữ lại dưới tên chuẩn `*.regression.test.ts` để canh hồi quy:

- `edge-dash.regression.test.ts` (V5d) — xoá vệt đứt/xiên mép giấy, khóa tổng kiểm.
- `edge-frame.regression.test.ts` (V5e) — xoá khung xám quanh trang, khóa tổng kiểm.
- `flatten.regression.test.ts` (V6) — `flattenApply` tách trục khớp bản tham chiếu
  (bản tham chiếu cũ được giữ nguyên trong chính tệp kiểm thử này).
- `detect.regression.test.ts` (V7) — đường dò khung từ RGBA khớp đường xám cũ.
- `instant-preview.regression.test.ts` (V8b) — xem trước tức thì rơi về luồng chính
  an toàn khi không có Worker; bộ đếm `previewStats` gắn lên `globalThis.__previewStats`.
- `ocr-orientation.regression.test.ts` (V9) — chọn hướng xoay OCR theo ngưỡng 10 điểm.
- `persist.regression.test.ts` (V11) — xin quyền lưu trữ bền chỉ một lần, không ném lỗi.

Quy ước: kiểm thử hồi quy mới đặt tên `<chức-năng>.regression.test.ts` trong thư
mục này; không thêm hậu tố phiên bản `-vN` vào tên tệp.
