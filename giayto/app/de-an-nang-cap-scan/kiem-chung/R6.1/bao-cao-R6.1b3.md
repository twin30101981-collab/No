# Báo cáo R6.1b-3 – Chạy lại kiểm chứng 221 ca & kết luận (mục con 3 của R6.1b)

Ngày: 2026-10-11 · Đầu vào: bộ lọc sau tinh chỉnh R6.1b-2 + bước mới cornerShadowLift.

## Việc đã làm

1. Thêm `cornerShadowLift` (src/lib/paper-mask.ts), bước cuối của EDGE_CLEAN_STEPS:
   - Thành phần tối (luma < 60) trong vùng góc 6 % mà **chạm mép ảnh** = nền ngoài
     tờ giấy sau nắn khung → tô màu giấy (kèm quầng xám 2 px).
   - **Khối đen đặc** không chạm mép (lấp đầy > 70 % khung bao, cạnh 0,5–8 % cạnh
     ngắn — khối marker/vật lạ) → tô giấy. Nét chữ/con dấu loang (không đặc) giữ nguyên.
2. Kiểm thử mới `src/test/r61b3-corner-shadow.test.ts`; toàn bộ **826/826 kiểm thử đạt** (182 tệp).
3. Chạy lại `scripts/kiem-chung-r61.py` (17 ảnh × 13 cấu hình = 221 ca).

## Kết quả

- **163/221 đạt (73,8 %)** — chưa tới mục tiêu 95 %.
- ink 17/17; magic/eco 13/17; còn lại 12/17.
- Cải thiện rõ ở ca nặng nhất: IMG_…093601 góc tối 5,9 % → ~2 % (khối đen đặc đã bị xoá).
- Lỗi còn lại: 58 ca, gần như toàn bộ là **góc tối 0,35–4,3 %** (riêng 093540 kèm ΔL 51–56 < 60).

## Kết luận & đề xuất

Kiểm tra trực tiếp ảnh đầu ra cho thấy các vùng góc tối còn lại là **nội dung thật**
(chữ in sát mép giấy, ví dụ "…a kiểm"/"…ay sau" ở góc trên phải 093601), không phải
bóng nền hay vật lạ. Xoá tiếp để đạt cổng 0,2 % sẽ phá nội dung tài liệu.

⇒ Đề xuất cho R6.1c (chờ quyết định): hoặc nới cổng góc tối 17.4 từ 0,2 % lên ~5 %
(kèm điều kiện "không xoá nội dung"), hoặc đo góc tối chỉ trên vùng nền đã xác nhận
không có chữ. Riêng 093540 (ΔL 51) là ảnh nền xám đậm bất thường — cân nhắc loại
khỏi bộ vàng hoặc xử lý riêng bằng flattenLight mạnh hơn.
