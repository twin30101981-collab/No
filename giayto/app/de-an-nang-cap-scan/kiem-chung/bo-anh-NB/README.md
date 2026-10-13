# Bộ ảnh NB – trang báo "Ninh Bình hằng tháng" (R6.2, 11/10/2026)

Mục đích: đo tỉ lệ OCR đúng ký tự của đầu ra app so với bản xuất CamScanner **cùng một trang**
(tiêu chí R6.2: OCR ≥ bản Cam − 2%).

## Nội dung
- `goc/IMG_NB_01.jpg` – ảnh chụp gốc 2197×3000 (≈266 ppi, A4), lấy nguyên luồng JPEG từ tệp PDF
  "Ảnh gốc bài báo Ninh Bình" người dùng gửi (tệp PDF do CamScanner bọc, chưa lọc/chưa cắt).
  Trang 4, số 15 (9/2026): tiêu đề hồng, 3 cột chữ, 1 ảnh minh hoạ giữa trang, khối đỏ số trang ở góc dưới trái.
  Chụp hơi nghiêng, ánh sáng không đều (lệch xanh bên trái), trang tràn khung (app không dò được mép giấy).
- `chuan-chu/IMG_NB_01.txt` – chữ chuẩn (658 từ, 4.082 ký tự: tiêu đề, dòng tác giả, dẫn nhập, tiêu đề phụ, 3 cột thân bài).
  **Do trợ lý chép tay từ ảnh**; 13/10/2026 trợ lý rà lại bằng mắt trên bản Cam "Tăng cường" (1271×1800, 3 cột) và đối chiếu đồng thuận với 9 bản OCR: không thấy sai khác (666 từ). Đây là rà của trợ lý, chưa phải người dùng độc lập – người dùng nên đọc rà một lần; không gồm chữ trong ảnh minh hoạ, chú thích ảnh, đầu trang, chân trang.
- `cam/` – nơi đặt ảnh xuất CamScanner cùng trang (đang TRỐNG). Xem `cam/HUONG-DAN.md`.

## Không đưa vào bộ
Ảnh "Biên bản kiểm tra khách hàng" đính kèm cùng đợt: khác trang, có số CCCD/thông tin khách hàng → không dùng, không đưa vào gói.
