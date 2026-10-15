# VIỆC CẦN BẠN LÀM (các phiên tự động sẽ bổ sung dần)

1. **Đặt repo về riêng tư (khuyến nghị gấp):** GitHub → twin30101981-collab/No → Settings → General → Danger Zone → Change visibility → Private. Lịch sử commit trước 15/10/2026 có 2 tệp PDF chứa số vào sổ GCN của 2 sổ mẫu (đã gỡ ở commit mới nhưng vẫn còn trong lịch sử).
2. **Sao lưu dữ liệu thửa** trên điện thoại (Dự án .landgis / Excel) cho tới khi HM-00 được triển khai.
3. **Dữ liệu địa chính (HM-26):** nộp phiếu yêu cầu cung cấp dữ liệu đất đai cho 1–2 xã/phường thí điểm tại Sở NN&MT / VP Đăng ký đất đai Ninh Bình.
4. Các bước cấu hình Supabase (RLS, đăng nhập OTP, Storage, Edge Function) — phiên tự động sẽ ghi hướng dẫn chi tiết tại đây khi làm tới HM-06/06c/10b/28.

5. **HM-06 — kiểm RLS Supabase:** làm theo `handover/supabase/kiem_tra_RLS.md` (3 lệnh curl + 2 câu SQL), gửi lại kết quả ở phiên sau. Nếu bảng đang mở công khai thì đừng nhập dữ liệu thật.
6. **HM-06 — SheetJS (xlsx 0.18.5) còn lỗ hổng đã biết** (prototype pollution/ReDoS khi đọc file lạ). Bản vá chỉ phát hành tại cdn.sheetjs.com (môi trường tự động không truy cập được nên chưa kiểm chứng/ghim SRI). Việc của bạn: tải `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` về, đưa vào thư mục `vendor/` của repo (hoặc cho biết để phiên sau nhúng), rồi phiên sau sẽ ghim SRI. Trong lúc chờ: chỉ mở file Excel do chính bạn tạo.
