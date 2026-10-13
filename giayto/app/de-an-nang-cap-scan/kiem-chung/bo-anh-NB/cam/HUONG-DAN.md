# Đặt ảnh Cam vào đây

1. Mở **đúng trang báo** (IMG_NB_01.jpg) bằng CamScanner, chụp lại hoặc nhập ảnh gốc, rồi xuất:
   - chế độ lọc mặc định (Auto / "Tự động"),
   - "Magic Color" (nếu có),
   - tuỳ chọn "Original" (không lọc) để đối chiếu.
   Xuất JPG hoặc PDF, chất lượng cao nhất.
2. Đặt tệp vào thư mục này, tên bắt đầu bằng `IMG_NB_01`, ví dụ:
   `IMG_NB_01_cam-auto.jpg`, `IMG_NB_01_cam-magic.pdf`.
3. Trên máy có `tesseract-ocr-vie`:
   ```
   npx vite dev --port 8081 &            # app chạy
   python3 scripts/kiem-chung-r62/chay-app.py          # dựng lại ảnh app
   python3 scripts/kiem-chung-r62/so-ocr.py            # chấm + so với Cam
   ```
4. Đọc `kiem-chung/R6.2/ket-qua-ocr.json` mục `danh_gia`: `dat: true` thì gạch R6.2.
