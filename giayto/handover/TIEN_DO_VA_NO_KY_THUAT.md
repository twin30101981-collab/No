# Tiến độ và nợ kỹ thuật — GIAYTO — 13/10/2026, phiên P18 (đọc file này trước)

## Tiến độ
- Đề án nâng cấp v1.2: 14/18 hạng mục đạt, 3 hủy, 1 chờ (HM-14). P18 thêm HM-19 = xử lý nợ kỹ thuật còn lại → ĐẠT V3.
- P18 đóng 16 nợ: TD-04, 13, 14, 17, 19, 22, 27, 30, 32, 33, 34, 37, 38, 40, 42, 45 (chi tiết: app/docs/NO-KY-THUAT.md mục "P18").
- Kiểm thử: 190 tệp / 877 đạt, `npm run check` thoát 0; CI GitHub Actions chạy cùng lệnh khi đẩy mã.
- Mã: nhánh claude/tieu-tuc-thuc-thi-de-an-k1h8nz, thư mục giayto/. Chưa tạo PR.

## Lỗi thật P18 tìm và sửa (người dùng nên biết)
1. Ký số: chứng thư tạo trong app với tên có dấu KHÔNG mở lại được → không ký được; thêm 5 lỗi (tên vỡ mã, lý do ký mất dấu, PDF reader không tìm ra người ký, ~1/256 chữ ký báo sai, serial âm).
2. Màn Lọc: dải chọn bộ lọc (Màu gốc/Thần kỳ…) bị bóp còn 4 px — gần như vô hình.
3. Màn Cắt trên điện thoại thấp (640 px): nút "Áp dụng" nằm ngoài màn hình.
4. Thanh trượt Độ sáng: hiện 55 nhưng lưu 0 nếu cử chỉ bị hệ thống hủy.
5. Liên kết chia sẻ có mật khẩu: cho thử không giới hạn → nay 10 lần sai/15 phút.
6. Script đồng bộ tiến độ ghi đè TIEP-THEO.md (50 → 11 dòng) và lùi ngày cập nhật.

## Đang chờ (việc của người dùng)
| Mã | Việc | Mức |
|---|---|---|
| HM-14 / TD-26 / TD-01 / TD-16 | Thử máy thật Android/iPhone, ảnh 12 MP thật, AI thật, ảnh lỗi thật | Cao |
| TD-46 (mới) | Tương phản màu thương hiệu: chữ trắng trên xanh primary 2,40 (chuẩn 4,5) — giữ / làm đậm primary / chữ tối | Trung |
| TD-28 | Giới hạn AI: giữ 60/giờ? bộ đếm bền (bảng Supabase)? miễn trừ người đăng nhập? | Trung |
| TD-15, 11, 12, 31, 36, 44, 05–07 | Quyết định chủ dự án / thiết kế | Thấp–Trung |
| TD-20, TD-41 | Gửi đề án nền v4 nếu muốn làm R6.5 | Thấp |
| — | Xác nhận đề án v1.2; tạo PR | — |

## Cách bắt đầu phiên sau
1. Giải nén ZIP; đọc handover/HANDOVER.md (đầu tệp = P18) + backlog.json; kiểm MANIFEST.sha256.
2. `cd app && npm install --legacy-peer-deps && npm run check` (phải thoát mã 0).
3. Hỏi người dùng 1 câu: kết quả HM-14 / quyết TD-46, TD-28 / tạo PR.
