# Lộ trình thực hiện đề án "Chụp trước – Xử lý sau" v4

Quy tắc phiên: mỗi hạng mục ≤ 4 credit; xong mục → hồi quy nhanh → đóng gói ZIP (app, DOCX, LO-TRINH.md, TIEP-THEO.md). Mục đã xong gạch ngang ~~ ~~.

## P0 – Nền tảng
- ~~P0.1 Chuẩn hoá tien-do.json về mảng buoc; sửa app-tien-do.html bỏ cache localStorage (TD-19)~~ — xong 10/10/2026: 66 bước, 7 nhóm trạng thái chuẩn, trang tiến độ đọc mới từ tệp, hiện đủ S11p→S13d, 0 lỗi console.
- ~~P0.2 Script đóng gói dong-goi.sh xuất ZIP chuẩn (không node_modules/.git)~~ — xong 10/10/2026: scripts/dong-goi.sh kiểm LO-TRINH.md + TIEP-THEO.md, ZIP sạch node_modules/.git/dist.
- ~~P0.3 Khung Playwright dùng chung + bộ ảnh vàng~~ — xong 10/10/2026: scripts/playwright/khung-chung.py chạy xanh 2 viewport (390×844, 1280×800), 0 lỗi console; ảnh chụp tại kiem-chung/P0.3/.
- ~~P0.4 Ghi số hồi quy mới~~ — xong 10/10/2026: 146 tệp / 561 kiểm thử đạt, build OK, đã ghi vào tien-do.json (mục P0); TD-21 đã đóng. TD-20 (đồng bộ DOCX) chờ bằng chứng G1–G6 theo đúng ghi chú nợ kỹ thuật.

## P1 – Chụp nhanh
- P1.1 Baseline perf-stats trên 3 bộ ảnh
- P1.2 Chụp liên tục + cảnh báo mờ/rung/thiếu sáng (focus-gate, quality)
- ~~P1.3 Bắt khung 4 góc thời gian thực trên ảnh nhỏ 320–480 px~~ — xong 10/10/2026: marker 4 góc trên khung ngắm (sáng mạnh khi khoá), bản dò tự leo 320→480 khi mất khung ≥6 nhịp, về 320 khi khoá; live-detect.test.ts 5/5; hồi quy 148 tệp / 569 kiểm thử đạt; build OK.
- ~~P1.4 Cảnh báo chất lượng khi chụp~~ — xong 10/10/2026: capture-quality.ts gộp chỉ số khung ngắm thành 1 cảnh báo ưu tiên (tối/lóa/mờ reject; nghiêng/xa/hơi tối/hơi mờ warn), bấm chụp hiện đúng nguyên nhân; tự chụp chặn khi tối nặng; capture-quality.test.ts 7/7; hồi quy 149 tệp / 576 kiểm thử đạt; build OK.

## P2 – Hàng đợi xử lý nền
- ~~P2 Hàng đợi xử lý nền~~ — xong 10/10/2026: bg-queue.ts hàng đợi bền trên IndexedDB (ghi việc trước khi chạy, running→queued khi tải lại, thử lại 1 lần khi lỗi, huỷ theo trang); màn chụp dùng cho việc dựng bản đầy đủ 300 dpi, khôi phục phiên xếp lại việc dở; bg-queue.test.ts 7/7; hồi quy 150 tệp / 583 kiểm thử đạt.
## P3 – Cắt & tinh chỉnh (song song P4)
- P3.1 Khung cắt an toàn — xong-phan-1 10/10/2026: crop-quad.ts (checkQuad chặn khung chéo/lõm, < 5% ảnh, góc trong < 30°; tidyQuad tự sắp lại ↖↗↘↙ khi kéo góc vượt nhau; snapCorner hút góc ≤ 2% về góc dò tự động/góc ảnh khi thả tay); màn Cắt báo lý do và khoá Áp dụng khi khung hỏng; crop-quad.test.ts 8/8; hồi quy 151 tệp / 591 kiểm thử đạt; kiểm kiểu sạch.
- P3.2 Hút cạnh + xoay mịn — xong 10/10/2026: thả tay nút cạnh → tinh chỉnh trên ảnh gốc (refineQuadOnSrc), chỉ nhận 2 góc của cạnh khi dời ≤ 3% và khung vẫn hợp lệ (acceptEdgeRefine); xoay mịn ±5° bước 0,5° bằng xoay khung theo pixel thật (rotateQuad) — đóng TD-08 mà không sửa renderGeometry; crop-quad.test.ts 13/13; hồi quy 151 tệp / 596 kiểm thử đạt; tsgo sạch.
## P4 – Nắn phẳng / dewarp (song song P3)
- ~~P4 Gợi ý nắn cong + độ tin cậy (TD-09)~~ — xong 10/10/2026: dewarp-suggest.ts gộp 2 tín hiệu (võng mép giấy edgeCurves + võng dòng chữ buildPageCurve), ngưỡng đề xuất 0,35; PageEdit.flatten (tự động/bật/tắt) luồng qua renderGeometry → warp (tắt = chỉ nắn phối cảnh thẳng); màn Chỉnh tay hiện thẻ “Trang hơi cong (độ tin cậy ~X%)” với nút Nắn phẳng / Giữ nguyên / Tự động; dewarp-suggest.test.ts 4/4; hồi quy 152 tệp / 600 kiểm thử đạt; tsgo sạch; build OK.
## P5 – Bộ lọc & chất lượng
- ~~P5 Gợi ý bộ lọc theo chất lượng trang~~ — xong 10/10/2026: filter-suggest.ts gợi ý bộ lọc từ chỉ số chất lượng (ưu tiên chói > tối > tương phản > mờ; chói→shadow, tối nặng→magic, hơi tối→bright, chữ nhạt→auto, mờ nhẹ→sharp) kèm độ tin cậy 0–1; màn Bộ lọc đo checkQuality một lần và hiện thẻ “Gợi ý: … (độ tin cậy ~X%)”, bấm để chọn; chỉ hiện khi khác bộ lọc đang chọn và tin cậy ≥ 0,4; filter-suggest.test.ts 10/10; hồi quy 153 tệp / 610 kiểm thử đạt; tsgo sạch; build OK.
## P6 – Danh sách trang & Thêm
- ~~P6.1 Dán ảnh / HEIC~~ — xong 10/10/2026: nút dán và sự kiện paste ở 3 màn; HEIC/HEIF chuyển JPEG trên máy, nhận cả MIME rỗng; giữ dán chữ bình thường, báo lỗi quyền/bộ nhớ tạm; 689 kiểm thử, kiểm kiểu và build đạt; HEIC thật và trang dán tồn tại sau tải lại đã kiểm chứng trên Chromium.
- P6.2 Phát hiện ảnh trùng — chưa thực hiện, ngoài phạm vi P6.1.
## P7 – Xuất PDF/Word/JPG/ZIP
## P8 – Tự động hoá sau chụp/thêm (v4)

Chi tiết từng hạng mục: xem đề án DOCX mục 18 và phần bổ sung v4.
- 2026-10-10T10:31:38+00:00 P0: Hoàn tất P0: nền tảng tiến độ + đóng gói + khung kiểm chứng
- 2026-10-10T11:34:55+00:00 P1.4: Cảnh báo chất lượng khi chụp: capture-quality.ts, báo đúng nguyên nhân khi bấm, tự chụp chặn tối nặng; 149 tệp / 576 kiểm thử đạt, build OK
- 2026-10-10T11:46:21+00:00 P2: Hàng đợi xử lý nền bền: bg-queue.ts trên IndexedDB, resume sau tải lại, thử lại 1 lần, huỷ theo trang; 150 tệp / 583 kiểm thử đạt, build OK
- 2026-10-10T12:11:26+00:00 P3.2: Hút cạnh + xoay mịn ±5°, 596 kiểm thử đạt
- 2026-10-10T12:19:47+00:00 P4: Gợi ý nắn cong + độ tin cậy (TD-09), 600 kiểm thử đạt
- 2026-10-10T12:52:09+00:00 P6: P6 danh sách trang & Thêm: page-list.ts, nhân bản trang, chèn sau trang hiện tại; 154 tệp / 620 kiểm thử đạt
- 2026-10-10T13:20:55+00:00 P8: P8 – Tự động hoá sau chụp/thêm: tự nhận chữ nền sau lưu bản quét, AI đặt tên tài liệu mới, công tắc trong Tôi; 156 tệp / 629 kiểm thử đạt
- 2026-10-10T13:45:00+00:00 P8.2: Nhận loại tài liệu từ chữ OCR: doc-type.ts chấm điểm từ khoá + mẫu định dạng (biển số/MST/số GPLX) theo 6 mẫu VN_TEMPLATES, bỏ dấu bền lỗi OCR, trả null khi không đủ chắc; P8.1 xác nhận đã có dưới tên page-grade.ts (B12); 157 tệp / 638 kiểm thử đạt
- 2026-10-10T13:52:00+00:00 P8.3: Bộ chọn công thức xử lý + tự kiểm: recipe.ts (pickRecipe + selfCheck lùi về an toàn/ảnh gốc); 158 tệp / 646 kiểm thử đạt
- 2026-10-10T14:00:26+00:00 P8.4: Tự áp công thức xử lý cho trang mới sau khi quét; 159 tệp / 650 kiểm thử đạt
- 2026-10-10T14:20:00+00:00 P8.5: Áp dụng cho trang tương tự: similar-pages.ts + nút trong màn Bộ lọc; 160 tệp / 654 kiểm thử đạt
- 2026-10-10T15:40:16+00:00 P4.3–P4.6/P3.1/P3.4: Công cụ 3 mức + kính lúp + trang báo ngang; 161 tệp / 664 kiểm thử đạt
