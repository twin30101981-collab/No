# Báo cáo R6.2 – Bộ ảnh NB + so OCR với Cam (11/10/2026)

## Kết luận
**R6.2 làm được một phần – CHƯA gạch.** Bộ ảnh NB, chữ chuẩn và kịch bản so OCR đã xong và đã chạy trên pipeline thật của app;
nhưng tiêu chí "OCR ≥ bản Cam − 2%" chưa kết luận được vì:
1. Chưa có ảnh xuất CamScanner **cùng trang**: PDF người dùng gửi chỉ chứa 1 ảnh gốc 2197×3000 (do CamScanner bọc, không lọc).
2. Máy chạy phiên này chỉ có tesseract `eng` (không có `vie`; mạng chặn tải) → số OCR bên dưới chỉ để tham chiếu.

Ngoài ra phát hiện một việc cần xử lý ở R6.1 (xem mục "Phát hiện").

## Đã làm
- `kiem-chung/bo-anh-NB/`: ảnh gốc, chữ chuẩn 4.082 ký tự (trợ lý chép, cần người dùng rà), thư mục `cam/` + hướng dẫn.
- `scripts/kiem-chung-r62/chay-app.py`: dựng ảnh qua `renderPage` thật cho 8 bộ lọc (A4 200 dpi, 1713×2339) và đo cổng R6.1.
  Chế độ `vite` (như kiem-chung-r61.py) và chế độ `goi` (đóng gói riêng image.ts bằng esbuild, không cần node_modules).
- `scripts/kiem-chung-r62/so-ocr.py`: chấm OCR (tesseract, psm 3) cho ảnh gốc / 8 bộ lọc / mốc ngưỡng thích ứng OpenCV / ảnh Cam (jpg, png, pdf);
  chỉ số chính `dung_ky_tu` = LCS(chuẩn, OCR)/số ký tự chuẩn; phụ: CER; cả hai có bản bỏ dấu. Kết luận `dat` chỉ ghi khi có Cam và máy có `vie`.
  Đã thử nhánh Cam bằng 1 JPG và 1 PDF giả (xoá sau khi thử): chạy đúng, đọc PDF qua pdftoppm 200 dpi.

## Số đo OCR (tesseract `eng`, THAM CHIẾU – không dùng để gạch mục)
| Nguồn | Đúng ký tự | CER | Đúng ký tự (bỏ dấu) | CER (bỏ dấu) |
| --- | ---: | ---: | ---: | ---: |
| Ảnh gốc chưa xử lý | 76,8% | 27,9% | 92,6% | 12,2% |
| App – auto (mặc định) | 77,7% | 26,8% | 91,9% | 12,6% |
| App – sharp | 77,5% | 26,4% | 91,9% | 12,1% |
| App – magic | 76,6% | 27,7% | 93,1% | 11,2% |
| App – original (chỉ nắn hình) | 76,5% | 26,9% | 92,2% | 11,2% |
| App – eco | 76,3% | 27,6% | 92,7% | 11,2% |
| App – gray | 76,8% | 28,7% | 91,0% | 14,4% |
| App – ink | 75,5% | 27,7% | 91,1% | 12,1% |
| App – mono | 75,4% | 27,9% | 90,8% | 12,5% |
| Mốc ngưỡng thích ứng OpenCV (không phải Cam) | 76,4% | 28,9% | 90,0% | 15,3% |

Đọc số: mô hình `eng` không đọc được dấu tiếng Việt nên "đúng ký tự" chỉ ~77%; bỏ dấu ở cả hai phía thì ~91–93%.
Mọi bộ lọc chênh nhau ≤ 2,3 điểm trên một trang duy nhất – nằm trong sai số, **không kết luận bộ lọc nào hơn**.
Điều duy nhất nói được: app (auto) không làm OCR tệ hơn ảnh gốc (+0,9 điểm) và không kém mốc thuật toán chung (+1,3 điểm).
Trang này vốn sạch (chữ đen đậm trên giấy láng) nên OCR ít phân biệt được; chênh lệch với Cam, nếu có, sẽ nằm ở dấu – cần `vie`.

## Phát hiện: cổng R6.1 trên ảnh thật NB chỉ đạt 1/8
(TIEP-THEO R6.3c đã dặn chạy lại cổng R6.1 trên ảnh thật của R6.2.)
| Bộ lọc | Lệch nền | ΔL | Góc tối | Kết quả |
| --- | ---: | ---: | ---: | --- |
| original | 15,7% | 29 | 4,5% | trượt (nền, ΔL) |
| magic | 0,5% | 47 | 7,2% | trượt (ΔL, góc) |
| auto | 7,5% | 81 | 15,0% | trượt (góc) |
| sharp | 8,6% | 85 | 15,4% | trượt (nền, góc) |
| mono | 0,0% | 96 | 13,3% | trượt (góc) |
| gray | 3,9% | 89 | 13,7% | trượt (góc) |
| ink | 0,0% | 63 | 0,0% | **đạt** |
| eco | 0,0% | 65 | 7,7% | trượt (góc) |

Nguyên nhân (đo từng góc, ảnh auto): góc dưới trái 40,6% điểm tối – khối **đỏ in** chứa số trang "4" bị đẩy thành đen;
góc dưới phải 10,0%; góc trên trái (logo "Ninh Bình") 9,6% cũng là chữ in. Đây là **nội dung in màu ở mép trang tạp chí**, không phải bóng đổ,
nhưng bộ lọc auto/sharp/mono/gray làm đậm khối màu bão hoà thành đen. Cổng R6.1 hiện được hiệu chỉnh cho giấy trắng chữ đen.
Tách riêng: `original` lệch nền 15,7% do ảnh chụp thiếu sáng đều (lệch xanh bên trái) – các bộ lọc đã xử lý được phần này (auto 7,5%, sát ngưỡng 8%).
Việc app không dò được mép giấy (`quad = null`, trang tràn khung) nên không có cắt/nắn nghiêng; người dùng thật sẽ phải kéo khung tay.

Đề xuất (chưa làm): gói **R6.1e** – hoặc (a) bộ lọc giữ nguyên khối màu bão hoà ở mép (không đẩy đen), hoặc (b) cổng bỏ qua điểm có độ bão hoà cao khi đo góc tối.
Không sửa trong gói này vì không chạy được bộ 830 kiểm thử (xem dưới).

## Giới hạn của lượt chạy này
- Không cài được `node_modules` (npm/pip/GitHub raw bị chính sách mạng chặn 403) → **không chạy được vitest, tsc, build, Playwright 390×844/1280×800**
  như quy tắc bàn giao. Mã nguồn app KHÔNG bị sửa (chỉ thêm thư mục `scripts/kiem-chung-r62/` và dữ liệu `kiem-chung/`), nên không có rủi ro hồi quy,
  nhưng 830/830 kiểm thử của gói trước chưa được chạy lại.
- Pipeline chạy bằng gói esbuild, Worker tắt (đường dự phòng "luồng chính" của worker-call.ts); điểm ảnh cùng thuật toán, nhưng thời gian ms (auto ≈ 3,1 s) không đại diện cho máy thật.
- Chữ chuẩn do trợ lý chép; nếu sai vài ký tự thì sai đều cho mọi bản, ít ảnh hưởng chênh lệch giữa các bản nhưng làm lệch số tuyệt đối.
- Mới có 1 trang; ngưỡng −2% trên 1 trang rất nhạy với nhiễu → nên có ≥ 3 trang NB (gồm 1 trang ít chữ ảnh, 1 trang chụp tối/nghiêng).

## Để gạch R6.2
Gửi 2–3 ảnh CamScanner xuất từ **trang này** (Auto, Magic Color, Original; JPG/PDF) vào `bo-anh-NB/cam/`, rồi trên máy có `tesseract-ocr-vie`
chạy `chay-app.py` và `so-ocr.py` (hướng dẫn trong `bo-anh-NB/cam/HUONG-DAN.md`). `dat: true` → gạch.
