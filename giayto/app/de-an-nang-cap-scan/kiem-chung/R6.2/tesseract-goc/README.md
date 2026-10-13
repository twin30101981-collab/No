# TD-42 (P18, 13/10/2026): chạy lại so-ocr.py bằng tesseract GỐC

- Máy OCR: tesseract 5.3.4 (apt Ubuntu) + tesseract-ocr-vie 1:4.1.0-2 (mô hình chuẩn của gói apt, không phải _best).
- Chạy trên BẢN SAO thư mục kiem-chung (không ghi đè bằng chứng HM-12 dùng shim tesseract.js).
- Kết quả: app Auto 98,68% vs Cam tốt nhất 99,07% (thang-xam) → chênh −0,39 điểm, ngưỡng −2 → ĐẠT. Shim tesseract.js (HM-12): 98,68% vs 98,88% (−0,2).
- Kết luận HM-12 giữ nguyên khi đổi sang động cơ gốc.
