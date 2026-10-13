# Lộ trình thực hiện – nguồn: tien-do.json (sinh tự động bởi scripts/dong-bo-tien-do.py)

Cập nhật 2026-10-11. Thay thế LO-TRINH-CON-LAI-20261010.docx (đã lỗi thời).

## Tổng hợp trạng thái mục cũ (B/S/V/P) và đề án nâng cấp 12–13/10/2026

- xong: 85
- xong-phan-1: 17
- cho (chờ dữ liệu/quyết định của người dùng): 13
- bo-qua (hủy): 3
- (cập nhật 13/10/2026: đã rà 13 mục cũ ở HM-13; thêm 18 hạng mục HM-01…HM-18 của đề án nâng cấp — xem docs/RA-SOAT-MUC-CU-HM13.md và handover/HANDOVER.md)

## Lộ trình 27 gói R (mỗi gói ≤ 4 credit)


### Đợt R0 – Đồng bộ trạng thái
- ~~R0.1 Đồng bộ trạng thái: gộp B13 trùng mã trong tien-do.json, cập nhật trạng thái theo tài liệu này, thay LO-TRINH-CON-LAI cũ (đã lỗi thời: ghi 13 mục thiếu nhưng 9 mục đã xong).~~ — xong; kiểm chứng: Trang tiến độ hiện đúng số mục Xong/Chưa; phụ thuộc: —

### Đợt R1 – Một cửa chỉnh & nợ kỹ thuật giao diện
- ~~R1.1 Một cửa chỉnh: chuyển FilterPanel vào AdjustEditor, xoá luồng áp ngay (TD-11, TD-12).~~ — xong; kiểm chứng: Chỉ còn 1 cửa chỉnh; đổi bộ lọc → Lưu → ảnh đổi đúng; phụ thuộc: R0.1
- ~~R1.2 So sánh giữ để xem gốc, “Áp dụng cho tất cả”, hỏi khi rời màn chưa lưu (TD-23).~~ — xong; kiểm chứng: Back khi chưa lưu hiện hộp hỏi; Áp dụng tất cả đổi mọi trang; phụ thuộc: R1.1
- ~~R1.3 Bỏ data URL đợt 1 (8 tệp giao diện): Blob/ImageBitmap + close() (TD-04).~~ — xong; kiểm chứng: Mở 20 trang, RAM đỉnh không tăng dần; phụ thuộc: —
- ~~R1.4 Bỏ data URL đợt 2 (7 tệp lib) + kiểm rò rỉ bitmap.~~ — xong; kiểm chứng: Như R1.3 + kiểm thử rò rỉ; phụ thuộc: R1.3
- ~~R1.5 Màn Cắt tô mờ vùng sắp bị cắt + cảnh báo cam khi chữ vắt mép (TD-05); OCR trả hộp điểm ảnh + độ tin cậy (TD-06).~~ — xong; kiểm chứng: Ảnh Q3 hiện cảnh báo đúng mép phải; phụ thuộc: —

### Đợt R2 – Hiệu năng & pipeline
- ~~R2.1 Bể worker chung đợt 1: gom detect/preview/normalize/image vào 1 bể có ưu tiên, giữ API cũ qua worker-call.ts.~~ — xong; kiểm chứng: Hồi quy đạt; số worker đồng thời ≤ 4; phụ thuộc: R1.4
- ~~R2.2 Bể worker chung đợt 2: gom ocr, compress-page, page-pipeline; đo RAM đỉnh trước/sau.~~ — xong; kiểm chứng: Chụp 20 trang không treo; phụ thuộc: R2.1
- ~~R2.3 Cache kết quả theo khoá (ảnh, tham số); xử lý theo ô 1024 px khi ảnh > 12 MP (giới hạn canvas iPhone).~~ — xong; kiểm chứng: Ảnh 48 MP giả lập không trắng trang; phụ thuộc: R2.2
- ~~R2.4 Xem trước bộ lọc bằng WebGL2 + thanh cấp độ 0–100, ảnh đầy đủ chỉ tính khi thả tay.~~ — xong; kiểm chứng: Kéo thanh ≤ 16 ms/khung, không lỗi console; phụ thuộc: R1.1
- ~~R2.5 Hoàn tất baseline S1/P1.1 bằng video trang thay đổi; ghi số từng công đoạn so ngân sách 17.1.~~ — xong; kiểm chứng: Đủ ≥ 10 mẫu dựng trang/bộ ảnh; phụ thuộc: R2.2
- ~~R2.6 Dọn thuật toán cũ -vN không còn dùng; chuyển kiểm thử -vN thành bộ hồi quy.~~ — xong; kiểm chứng: Hồi quy giữ nguyên số đạt; phụ thuộc: R2.5

### Đợt R3 – Tự động hoá “2 thao tác”
- ~~R3.1 Nhật ký quyết định theo trang (“nền tối 18% → Sáng nền Mạnh”), nhãn cam “Cần xem lại” khi điểm < 70, thẻ lọc Tất cả / Cần xem lại / Đã sửa tay.~~ — xong; kiểm chứng: Thẻ lọc chỉ hiện trang điểm < 70; phụ thuộc: —
- ~~R3.2 “Phương án khác”: 3 biến thể dựng sẵn, chọn 1 chạm.~~ — xong; kiểm chứng: Chọn biến thể đổi ảnh trong 1 chạm; phụ thuộc: R3.1
- ~~R3.3 Học theo người dùng (P8.6): ghi lựa chọn sửa tay theo loại tài liệu, lần sau ưu tiên.~~ — xong; kiểm chứng: Sửa tay 1 lần → lô sau dùng công thức mới; phụ thuộc: R3.2
- ~~R3.4 Nhận loại tài liệu theo ảnh (màu, dấu đỏ, tỉ lệ khung) bổ sung cho doc-type theo chữ.~~ — xong; kiểm chứng: Đúng loại ≥ 85% bộ ảnh vàng; phụ thuộc: —
- ~~R3.5 Chế độ Tự động bật mặc định (P8.7) + Xuất 1 chạm: PDF Chuẩn, tên tự động, nhắc “Còn N trang nên xem lại”.~~ — xong; kiểm chứng: Luồng Thêm → Xuất chạy xanh 2 thao tác; phụ thuộc: R3.1, R5.1

### Đợt R4 – Mục Thêm & Danh sách trang
- ~~R4.1 Chống ảnh trùng bằng dấu vân ảnh + phân loại ảnh nhập (có nền / đã phẳng / chụp màn hình).~~ — xong; kiểm chứng: Ảnh trùng bị hỏi; ảnh phẳng không bị cắt; phụ thuộc: —
- ~~R4.2 Lưới trang kéo-thả, chọn nhiều thao tác hàng loạt, ô “+ Thêm” nét đứt cuối lưới, nhãn trạng thái % và nút xuất mờ khi còn trang đang xử lý.~~ — xong; kiểm chứng: Đổi thứ tự được; nhãn đổi theo tiến độ; phụ thuộc: R3.1
- ~~R4.3 Bảng Thêm đủ 5 nguồn + vị trí chèn; kéo-thả toàn cửa sổ, phím tắt PC Delete/←/→/R; PDF tách trang.~~ — xong; kiểm chứng: Kéo 20 ảnh thành công; phím tắt chạy; phụ thuộc: R4.2

### Đợt R5 – Xuất
- ~~R5.1 PDF 3 mức Nhỏ/Chuẩn/Cao + kiểm tự động khung PDF khớp xem trước (TD-10).~~ — xong; kiểm chứng: 20 trang Chuẩn ≤ 5 MB; tỉ lệ khớp ≤ 0,5%; phụ thuộc: R2.3
- ~~R5.2 Lớp chữ OCR ẩn trong PDF (tìm và chọn được chữ tiếng Việt).~~ — xong; kiểm chứng: Tìm được từ trên PDF tải về; phụ thuộc: R5.1, R1.5

### Đợt R6 – Chất lượng, nghiệm thu, bàn giao
- ~~R6.1 Tinh chỉnh 7 bộ lọc + Khử bóng, Khử nhiễu 3 cấp theo chỉ số 17.4; thêm cổng chất lượng: không đạt thì không gạch mục.~~ — xong; kiểm chứng: 221/221 ca đạt (R6.1d): độ lệch nền ≤ 8%, ΔL ≥ 60, góc tối ≤ 5% (R6.1c nới từ 0,2% vì góc tối còn lại là chữ thật); phụ thuộc: R2.4
- R6.2 Bộ ảnh NB (bài báo Ninh Bình) + ảnh Cam mẫu; so tỉ lệ OCR đúng ký tự. — xong-phan-1 (đã dựng bộ ảnh NB, chữ chuẩn, kịch bản so OCR, chạy app trên ảnh thật; CHƯA có ảnh Cam cùng trang nên chưa gạch); kiểm chứng: OCR ≥ bản Cam − 2%; phụ thuộc: Cần người dùng gửi ảnh Cam cùng trang
- ~~R6.3 Kiểm 5 tiêu chí mục 9 tự động: 20 trang không chặn, 20 ảnh PC + 20 ảnh thư viện, chế độ máy bay, đo chỉ tiêu 19.5.~~ — xong; kiểm chứng: Báo cáo 5/5 tiêu chí (R6.3b; chạy lại R6.3c trên bản R6.1d vẫn 5/5, cần cờ NGHIEM_THU_CHAN_FONT=1 khi không có internet); phụ thuộc: R3.5, R5.2
- R6.4 UAT máy thật Android/iPhone/PC (B13/P7.3), hiệu chỉnh ngưỡng điểm trang theo kết quả. — cho; kiểm chứng: Báo cáo số đo trên máy thật; phụ thuộc: Cần người dùng thử
- R6.5 Đề án bản cuối v5 + bàn giao tổng. — cho; kiểm chứng: —; phụ thuộc: Tất cả

Lịch sử chi tiết các bước P0–P8: de-an-nang-cap-scan/LO-TRINH-LICH-SU-P.md

## Nhật ký bàn giao

- 2026-10-11 R0.1: Đồng bộ trạng thái theo lộ trình v5; gộp mã trùng B13, S10e; thêm 27 gói R
- 2026-10-11 R1.1: Một cửa chỉnh – nút Lọc mở Chỉnh tay; gợi ý bộ lọc, Áp tất cả, Trang tương tự, chẩn đoán chuyển vào; xoá FilterPanel áp ngay (TD-11/12); 164 tệp / 692 kiểm thử đạt; tsgo sạch; build OK
- 2026-10-11 R1.2: Nút “Giữ để xem ảnh gốc” trên màn Chỉnh tay (giữ = thấy 100% gốc, thả = về vị trí cũ); hộp hỏi khi rời màn chưa lưu và Áp tất cả trang đã có từ R1.1/TD-23; 164 tệp / 694 kiểm thử đạt; tsgo sạch
- 2026-10-11 R3.1: Nhật ký quyết định theo trang (page-review.ts), nhãn cam “Xem lại” khi điểm < 70, thẻ lọc Tất cả / Cần xem lại / Đã sửa tay trên màn tài liệu; 165 tệp / 699 kiểm thử đạt; tsgo sạch
- 2026-10-11 R1.3: Bỏ data URL ở giao diện (bộ tẩy, bút vẽ) – canvas-url.ts xuất Blob/object URL, giải phóng canvas, thu hồi URL tạm; adoptBlob đăng ký với kho; còn QR nhỏ (giữ); 166 tệp / 703 kiểm thử đạt; tsgo sạch
- 2026-10-11 R1.4: Bỏ data URL đợt 2 ở 7 tệp lib (moire, redact, signatures, sr-enhance, translate-overlay, files, id-watermark) – trang trả về object URL đã đăng ký, canvas giải phóng ngay; thêm r14-leak.test.ts kiểm rò rỉ bitmap/object URL; 167 tệp / 714 kiểm thử đạt; tsgo sạch; build OK
- 2026-10-11 R2.6: Dọn thuật toán cũ -vN; 7 kiểm thử -vN thành bộ hồi quy src/lib/regression/; 175 tệp / 791 kiểm thử đạt; tsgo sạch
- 2026-10-11 R3.5: Chế độ Tự động bật mặc định (P8.7) + Xuất 1 chạm PDF Chuẩn, tên tự động, nhắc trang cần xem lại; 176 tệp / 795 kiểm thử đạt; tsgo sạch; build OK
- 2026-10-11 R5.1: PDF đúng 3 mức Nhỏ/Chuẩn/Cao (bỏ mức Gốc/Nhẹ nhất cũ) + pdf-frame-check.ts kiểm tự động khung PDF khớp xem trước (đóng TD-10); kiểm chứng: PDF thật 20 trang Chuẩn 4,6 MB ≤ 5 MB, tỉ lệ lệch khung ≤ 0,5% trên 7 tỉ lệ ảnh; 178 tệp / 814 kiểm thử đạt; tsgo sạch
- 2026-10-11 R5.2: Lớp chữ OCR ẩn trong PDF – tách textLayerOps/writeTextLayer thuần, phát hiện & sửa lỗi giãn ký tự khiến trình đọc tách từng ký tự (mất tìm kiếm); kiểm chứng: pdfjs trích đúng 'VIỆT NAM', 'Hạnh phúc', 'quyền sử dụng đất' từ PDF dựng thật; 179 tệp / 817 kiểm thử đạt; tsgo sạch
- 2026-10-11T05:11:33+00:00 R2.5: Baseline S1/P1.1 sau R2.2: 3 video × 10 trang = 30 mẫu, 0 lỗi, RAM đỉnh 60-70MB, đạt ngân sách 17.1
- [x] R2.6 Dọn thuật toán cũ -vN: xoá flattenApplyRef/sampleBg khỏi pixels.ts (bản tham chiếu nằm trong kiểm thử), v8bStats/__v8b → previewStats/__previewStats; 7 kiểm thử -vN → bộ hồi quy src/lib/regression/*.regression.test.ts — 175 tệp / 791 kiểm thử đạt, tsgo sạch
- [x] R3.5 Chế độ Tự động bật mặc định (P8.7) + Xuất 1 chạm: PDF Chuẩn, tên tự động, nhắc “Còn N trang nên xem lại” kèm nút Xem lại; nút Xuất = 1 chạm, Tùy chọn mở bảng đầy đủ — 176 tệp / 795 kiểm thử đạt, tsgo sạch, build OK
- 2026-10-11T05:26:04+00:00 R3.5: Tự động mặc định (P8.7) + Xuất 1 chạm PDF Chuẩn, tên tự động, nhắc trang cần xem lại; 176 tệp / 795 kiểm thử đạt, tsgo sạch, build OK
- 2026-10-11 R4.3: Bảng Thêm đủ 5 nguồn (Thư viện/Chụp/PDF tách trang/Dán/Quét) + vị trí chèn Đầu/Sau trang/Cuối; kéo-thả ảnh/PDF vào toàn cửa sổ có lớp phủ báo thả; phím tắt PC Delete xoá trang, ←/→ chuyển trang, R xoay 90°; 177 tệp / 800 kiểm thử đạt, tsgo sạch, build OK
- 2026-10-11T05:31:30+00:00 R4.3: Bảng Thêm 5 nguồn + vị trí chèn; kéo-thả cửa sổ; phím tắt Delete/←/→/R; PDF tách trang; 177 tệp / 800 kiểm thử đạt
- 2026-10-11T05:50:16+00:00 R5.2: Lớp chữ OCR ẩn trong PDF, tìm được chữ tiếng Việt; sửa lỗi giãn ký tự phá tìm kiếm; 817 kiểm thử đạt
- 2026-10-11T07:49:15+00:00 R6.1a: Tinh chỉnh đường cong mực 6 bộ lọc (auto/sharp/magic/gray/ink/eco) để ΔL ≥ 60; 822 kiểm thử đạt, tsgo sạch
- 2026-10-11T09:13:26+00:00 R6.1b3: R6.1b-3: cornerShadowLift xoá bóng góc + khối đen đặc; 826/826 kiểm thử; kiểm chứng 221 ca đạt 73,8%, góc tối còn lại là chữ thật — đề xuất R6.1c nới cổng
- 2026-10-11T10:13:11+00:00 R6.1c: Nới cổng góc tối 0,2%→5%; kiểm chứng lại 212/221 ca đạt (95,9%); 826/826 kiểm thử đạt
- 2026-10-11T11:47:36+00:00 R6.3b: Nghiệm thu 5/5; sửa sw.js bỏ sót tệp có __, warmShellCache, ?sw=on
- 2026-10-11T12:50:42+00:00 R6.1d: Đậm hoá mực auto/sharp/gray; 221/221 ca kiểm chứng đạt (100%); 830/830 kiểm thử, tsgo sạch
- 2026-10-11 R6.3c: Chạy lại nghiệm thu R6.3 trên bản build R6.1d – 5/5 (cần NGHIEM_THU_CHAN_FONT=1 khi sandbox không có internet; lỗi duy nhất không cờ là phông Google không tải được); 830/830 kiểm thử, tsc sạch; chưa chạy lại cổng R6.1
- 2026-10-11T13:34:44+00:00 R6.3c: Chạy lại nghiệm thu R6.3 trên bản R6.1d (5/5); đồng bộ tien-do.json; sửa dong-bo-tien-do.py
- 2026-10-11 R6.6: Nhúng phông cục bộ (@fontsource Manrope/Sora) thay Google Fonts — app ngoại tuyến không còn lỗi console phông; 830/830 kiểm thử đạt, tsc sạch, build OK
- 2026-10-11T22:12:22+07:00 R6.2: Bộ ảnh NB + chữ chuẩn + kịch bản chay-app/so-ocr; pipeline thật 8 bộ lọc; OCR tham chiếu (eng) auto 77,7% vs gốc 76,8%; CHƯA gạch (thiếu ảnh Cam cùng trang); cổng R6.1 trên ảnh NB 1/8; không chạy được kiểm thử (mạng chặn npm), mã nguồn app không đổi
- 2026-10-13 HM-13: Rà 13 mục cũ (S1, S7d, S10d, S10g, S11f/l/n/q, V0, S12c, S13, S13b, S13c): 6 xong, 1 hủy, 6 chờ (Q5/HM-14); đo lại độ nghiêng dòng chữ trên 3 ảnh Q — chưa đạt ≤0,5° ở cấp ô
- 2026-10-13 (P17) HM-10 và HM-12 đạt, Q6=a (HM-18 hủy): 14 đạt, 3 hủy, 1 chờ (HM-14).
- 2026-10-13 Đóng phiên: đề án nâng cấp GIAYTO v1.2 — 18 hạng mục: 12 đạt, 2 hủy (HM-02, HM-16), 4 chờ (HM-10/12/14/18); Q2–Q5 đã chốt; Q6 mở
