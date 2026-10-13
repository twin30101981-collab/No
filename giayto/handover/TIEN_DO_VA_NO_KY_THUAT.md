# Tiến độ và nợ kỹ thuật — GIAYTO — 13/10/2026, đóng phiên P17 (đọc file này trước)

## Tiến độ
- Đề án nâng cấp v1.2: 14/18 hạng mục đạt (V3×11, V2×2, V1×1), 3 hủy (HM-02, HM-16, HM-18), 1 chờ (HM-14).
- P17: HM-10 (màn Tài liệu 2 cột từ 1024 px) đạt V3; Q6=(a) chấp nhận 5 ca NB trượt → HM-18 hủy; HM-12 (so OCR với CamScanner) đạt V3: app Auto 98,68% vs Cam tốt nhất 98,88% (chênh −0,2, ngưỡng −2; chữ chuẩn đã rà lại, không sai khác).
- Gói R cũ: còn R6.4 (= HM-14) và R6.5 (đề án cuối). R6.2 xong.
- Kiểm thử: 189 tệp / 864 đạt, `npm run check` thoát mã 0 (chạy cuối sau HM-10).
- Mã đã nằm trên GitHub: nhánh claude/read-content-continue-progress-1a7044, thư mục giayto/ (TD-39 đóng). Chưa tạo PR.

## Đang chờ (việc của người dùng)
- **HM-14** R6.4 UAT máy thật + R6.5 đề án cuối — gộp V0 (ảnh 12 MP), S12c (AI thật), TD-01, TD-15.
- Xác nhận đề án v1.2; mức 60 lượt AI/giờ; tùy chọn: rà chữ chuẩn NB, tạo PR, mở rộng màn rộng cho màn khác.

## Nợ kỹ thuật quan trọng (đủ bảng ở app/docs/NO-KY-THUAT.md mục 0.2)
| Mã | Nợ | Mức |
|---|---|---|
| TD-26 | Chưa kiểm trên máy thật/Cloudflare/Safari/Firefox/AI thật (chỉ Chromium + localhost) | Cao |
| TD-27 | Button/Input cao hơn 4–8 px toàn app; chưa soi từng màn | Trung |
| TD-28 | Giới hạn AI đếm trong bộ nhớ; chưa miễn trừ người đăng nhập; 60 là con số tạm | Trung |
| TD-29 | 5 ca NB trượt cổng R6.1 (quad=null) — ĐÃ CHẤP NHẬN (Q6=a) | Trung→chấp nhận |
| TD-30 | SW theo build: chưa thử nâng cấp từ SW cũ thật; đặt BUILD_ID | Trung |
| TD-42 | HM-12 chấm bằng shim tesseract.js, không phải tesseract gốc | Thấp |
| TD-43 | Chữ chuẩn 1 trang NB, trợ lý tự rà; nhãn Cam "Thần kỳ"=magic là suy đoán | Thấp |
| TD-44 | HM-10 chỉ màn Tài liệu; kiểm vite dev + Chromium | Thấp |
| TD-45 | Mã ở thư mục giayto/ của repo; mẹo môi trường sandbox (IPv6, playwright python) | Thấp |
| TD-31…38, 40, 41 | OCR lần đầu cần mạng; OCR nền im lặng; ký số chưa kiểm .p12; F-05; lint tệp tự sinh; độ nghiêng dòng chữ; nhập ảnh không tự dò khung; bun.lock sửa tay; script đồng bộ tiến độ; đề án nền v4 | Thấp |
| TD-01, 07, 15, 16 (cũ) | S12c AI thật; hộp chữ ký/bảng; 4 quyết định chủ dự án; ảnh lỗi thật Q/loi | Cao/Trung |
(TD-39 đã đóng.)

## Cách bắt đầu phiên sau
1. Giải nén ZIP; đọc handover/HANDOVER.md + backlog.json; kiểm MANIFEST.sha256.
2. `cd app && npm install --legacy-peer-deps && npm run check` (phải thoát mã 0).
3. Hỏi người dùng đúng 1 câu: làm tiếp việc nào trong Mục 4 HANDOVER (HM-14 / xác nhận đề án / mở rộng màn rộng / PR).
4. Công thức môi trường và các bẫy đã gặp: HANDOVER Mục 1.
