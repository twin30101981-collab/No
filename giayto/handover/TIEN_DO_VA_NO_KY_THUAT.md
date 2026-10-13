# Tiến độ và nợ kỹ thuật — GIAYTO — 13/10/2026 (đọc file này trước)

## Tiến độ
- Đề án nâng cấp v1.2: 12/18 hạng mục đạt (V3×9, V2×2, V1×1), 2 hủy, 4 chờ.
- Gói R cũ: 24/27 xong (theo TIEP-THEO.md); còn R6.2 (phần 2 = HM-12), R6.4 (= HM-14), R6.5 (đề án cuối).
- Kiểm thử: 189 tệp / 864 đạt, thoát mã 0; `npm run check` xanh. Cổng R6.1: 221 ca cũ 221/221; ảnh NB 8/13.

## Đang chờ (việc của người dùng)
- **HM-10** Bố cục màn rộng (đề xuất) — Từ phát hiện F-08
- **HM-12** R6.2 phần 2: so OCR với CamScanner — Từ phát hiện F-13
- **HM-14** R6.4 UAT máy thật + R6.5 đề án cuối — Từ phát hiện F-13
- **HM-18** Dò mép giấy cho ảnh tạp chí có mặt bàn tối (NB: quad = null) — Tạo từ HM-11: 5 ca NB còn trượt do quad=null. HOAN chờ Q6.
- Cho phép đẩy lên GitHub (TD-39); xác nhận đề án v1.2; mức 60 lượt AI/giờ.

## Nợ kỹ thuật quan trọng (đủ bảng ở app/docs/NO-KY-THUAT.md mục 0.2)
| Mã | Nợ | Mức |
|---|---|---|
| TD-26 | Chưa kiểm trên máy thật/Cloudflare/Safari/Firefox/AI thật (chỉ Chromium + localhost) | Cao |
| TD-27 | Button/Input cao hơn 4–8 px toàn app; chưa soi từng màn | Trung |
| TD-28 | Giới hạn AI đếm trong bộ nhớ; chưa miễn trừ người đăng nhập; 60 là con số tạm | Trung |
| TD-29 | 5 ca NB trượt cổng R6.1 (mặt bàn tối, quad=null) — Q6/HM-18 | Trung |
| TD-30 | SW theo build: chưa thử nâng cấp từ SW cũ thật; đặt BUILD_ID; toast mỗi bản phát hành | Trung |
| TD-39 | Chưa commit/đẩy lên nhánh GitHub | Trung |
| TD-31…38, 40, 41 | OCR lần đầu cần mạng; OCR nền im lặng; ký số chưa kiểm .p12; F-05; lint tệp tự sinh; độ nghiêng dòng chữ; nhập ảnh không tự dò khung; bun.lock sửa tay; script đồng bộ tiến độ; đề án nền v4 | Thấp |
| TD-01, 07, 15, 16 (cũ) | S12c AI thật; hộp chữ ký/bảng; 4 quyết định chủ dự án; ảnh lỗi thật Q/loi | Cao/Trung |

## Cách bắt đầu phiên sau
1. Giải nén ZIP; đọc handover/HANDOVER.md + backlog.json; kiểm MANIFEST.sha256.
2. `cd app && npm install --legacy-peer-deps && npm run check` (phải thoát mã 0).
3. Hỏi người dùng đúng 1 câu: làm tiếp việc nào trong Mục 4 HANDOVER (Q6 / HM-12 / HM-14 / HM-10 / đẩy GitHub).
4. Công thức môi trường và các bẫy đã gặp: HANDOVER Mục 1.
