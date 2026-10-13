# Báo cáo R6.1b-2 – Phân tích ca trượt & tinh chỉnh bộ lọc (mục con 2 của R6.1b)

Ngày: 2026-10-11 · Đầu vào: kết quả đo nền R6.1b-1 (40/221 đạt, 18,1%).

## Phân tích ca trượt (từ ket-qua.json)

| Cấu hình | ΔL min / trung vị / max | Lỗi chính |
|---|---|---|
| magic | 63 / 66 / 93 | Góc tối 4 ca |
| auto (+deshadow/denoise ×6) | 31 / 52 / 92 | ΔL 15 ca, góc tối 4 |
| sharp | 32 / 59 / 92 | ΔL 9, góc tối 3 |
| mono | 100 | Góc tối 5 |
| gray | 35 / 48 / 92 | ΔL 15, lệch nền 42% (1 ca), góc tối 4 |
| ink | **51 / 51 / 51** | ΔL 17/17 |
| eco | 36 / 42 / 51 | ΔL 17, góc tối 2 |

Nguyên nhân gốc:
- **ink**: ΔL cố định 51 vì mực được gán cứng 45 → L*(45) = 49. Không phụ thuộc ảnh.
- **auto/sharp/gray/eco**: đường cong mức đẩy nét về xám giữa (độ sáng ~45–100);
  cổng cần trung vị mực ≤ ~27 (L* ≤ 38) khi nền ở 248.
- Nhóm auto+deshadow/denoise cho số liệu **trùng khớp** auto → sửa auto là sửa cả 6.
- gray không chuẩn hoá nền trước khi xám hoá → 1 ca lệch nền 42%.

## Tinh chỉnh đã làm

1. Mô-đun mới `src/lib/ink-deepen.ts`: đường cong đậm mực dưới gối 200,
   gamma 3,0 (nền ≥ 200 giữ nguyên ⇒ không làm lệch nền; mực màu giữ sắc độ).
2. auto/sharp: gọi `inkDeepen` cuối `docChain`.
3. gray: thêm `flattenLight` trước xám hoá + `inkDeepen` sau `autoLevel`.
4. eco: áp `inkCurve` lên đường cong eco.
5. ink: mực 45 → 24 (ΔL lý thuyết ≈ 63).

## Kiểm thử

- Thêm `src/lib/ink-deepen.test.ts` (3 ca: giữ nền, nét 100 → ≤ 27, trang mẫu đạt ΔL ≥ 60).
- Cập nhật `pixels.test.ts` (mực 24) và `s15e-docchain.test.ts` (thêm bước inkDeepen).
- Toàn bộ: **825/825 kiểm thử đạt** (181 tệp).

## Còn lại cho R6.1b-3

- Chạy lại `scripts/kiem-chung-r61.py` 221 ca trên ảnh thật để xác nhận ≥ 95%.
- Lỗi **góc tối** (2–5 ca/bộ lọc, cả magic/mono) chưa xử lý ở mục này — nếu
  R6.1b-3 còn trượt do góc, cần tăng cường `edgeCornerClean`.
