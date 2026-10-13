# Rà soát 13 mục S/V cũ còn dở (HM-13, 13/10/2026)

Nguồn: `de-an-nang-cap-scan/tien-do.json` (đã cập nhật: trường `trang_thai`, `trang_thai_cu`, `ket_luan_hm13`). Cách rà: đối chiếu từng mục với các bước SAU đó, với mã hiện tại (tìm theo chức năng) và, riêng nhóm S11, **đo lại trên 3 ảnh thật** bằng trình duyệt (xem mục cuối). Mức kiểm chứng: V1 (rà tài liệu/mã) + một phép đo V3.

| Mã | Trước | Kết luận | Lý do |
|---|---|---|---|
| S1 | đang làm | **Xong** | R2.5 đã hoàn tất baseline (30 mẫu, 0 lỗi, RAM 60–70 MB). Phần “đóng băng Q1–Q6” cần ảnh lỗi thật của người dùng → HM-14 |
| S7d | đã đo chưa đạt | **Hủy** | Nhiều làn PDF không đạt −30%; thay bằng S7e/S7f, R2.2, R5.1 |
| S10d | đã đo chưa đạt | **Xong** | Thay bởi S10c/S10e và nghiệm thu S10l (0 lỗi Q1–Q3) |
| S10g | đã đo chưa đạt | **Xong** (trung gian) | 367/367 kiểm thử; gộp vào S10h…S10m |
| S11f, S11l, S11n, S11q | đã đo chưa đạt | **Chờ quyết (Q5)** → thẻ HM-16 | Chuỗi nắn dòng chữ; S11r + S15c đã có trong mã (có kiểm thử) nhưng số đo cấp ô vẫn > 0,5° (bảng dưới) |
| V0 | đã đo chưa đạt | **Chuyển HM-14** | Cần ảnh 12 MP gốc + máy thật Android/iPhone |
| S12c | đang làm | **Chuyển HM-14 / TD-01** | Hồi quy đầy đủ đã chạy (860/860); còn AI thật, kiểm UI, 4 quyết định chủ dự án (TD-15) |
| S13 | đang làm | **Xong** | edit-session/edit-view đang dùng ở AdjustEditor; 22 kiểm thử |
| S13b | đang làm | **Xong** | Đã nối doc.$id.tsx; 6 kiểm thử thành phần; build + hồi quy trình duyệt OK (chưa máy thật → HM-14) |
| S13c | đang làm | **Xong** | Cảnh báo cắt bằng OCR đã nối (S13d, R1.5); còn TD-07 (hộp chữ ký/bảng) mở ở NO-KY-THUAT.md |

Kết quả: 6 xong, 1 hủy, 6 chờ (S11f/l/n/q → Q5; V0, S12c → HM-14). Không còn mục “đang làm” hay “đã đo chưa đạt”.

## Đo lại độ nghiêng dòng chữ (nhóm S11) — 13/10/2026
Cách đo: nhập từng ảnh gốc `bo-anh-Q/goc/*.jpg` vào app (bản build hiện tại), bấm “Tự dò góc”, chờ dựng bản đầy đủ, lấy ảnh kết quả và chạy đúng hàm `lineSkewMap` của app (12 ô: 6 dải × 2 nửa). Chỉ tiêu cũ: |góc| ≤ 0,5°.

| Ảnh | Nửa trên: max |góc| | Nửa dưới: max |góc| | Ghi chú |
|---|---|---|---|
| …555 | 2,25° (ô trên-phải, mực 860) | 1,25° | Nửa trái ≈ −0,25° |
| …556 | 1,75° (ô trên-trái) | 1,00° | |
| …557 | 0,75° | 1,00° | |

Giới hạn: kịch bản đo của các phiên trước không có trong gói (thư mục progress/ vắng) nên số này **không so sánh trực tiếp** được với 0,25°/1,75° cũ; dải tìm của hàm chỉ ±3°; ô ít mực (vd …555 d1P, mực 44) không đáng tin. Nhìn ảnh …555 sau xử lý thì dòng chữ thẳng, chỉ dòng tiêu đề bên phải hơi cụp. Cần bạn quyết (Q5): (a) chấp nhận (nới chỉ tiêu ≤1° với ô mực ≥ 500), (b) tiếp tục cải thiện thuật toán nắn, hoặc (c) bỏ chỉ tiêu này.
