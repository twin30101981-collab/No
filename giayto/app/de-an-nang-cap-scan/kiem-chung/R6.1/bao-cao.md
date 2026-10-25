# Báo cáo R6.1 – Tinh chỉnh 7 bộ lọc + Khử bóng/Khử nhiễu 3 cấp (chỉ số 17.4)

Ngày: 2026-10-11 (đợt 2)

## Đã làm

- Sửa lỗi thật trong `src/lib/worker-pool.ts`: hàm `pump()` nhét cả đối tượng Slot
  (chứa Worker) vào payload `postMessage` → `DataCloneError: Worker object could
  not be cloned`, làm mọi việc dựng trang qua bể worker văng lỗi. Sửa: lưu slot
  trên bản ghi hàng đợi (`j.slot`), không gửi kèm payload. Kiểm thử bể worker
  8/8 đạt; warp qua bể chạy tốt.
- Kịch bản kiểm chứng mới `scripts/kiem-chung-r61.py`: dựng 17 ảnh mẫu
  (bộ Q/V1/V13) qua pipeline thật (`renderPage`) với 7 bộ lọc cải thiện
  (magic, auto, sharp, mono, gray, ink, eco) + Khử bóng 3 cấp + Khử nhiễu 3 cấp
  (trên nền auto), đo cổng chất lượng `quality-gate.ts` ngay trong trang.
  Kết quả: `kiem-chung/R6.1/ket-qua.json` (221 ca, 0 lỗi trang).

## Kết quả đo (221 ca)

- Đạt toàn cổng: 21/221 (9,5%).
- Theo tiêu chí: Độ lệch nền ≤ 8% — chỉ 1 ca trượt; Góc tối ≤ 0,2% — 26 ca trượt;
  **ΔL ≥ 60 — 186/221 ca trượt** (nút thắt chính).
- Bộ lọc mono (Đen trắng) đạt 12/17; các bộ lọc giữ mực xám (auto, sharp, magic,
  gray, ink, eco) có ΔL 24–50, chưa tới 60 vì nét chữ còn nhạt.

## Còn lại (đợt 3)

- Tinh chỉnh đường cong mực của 6 bộ lọc giữ xám/màu (auto, sharp, magic, gray,
  ink, eco): đậm hoá nét tối (kéo median mực xuống để ΔL ≥ 60) mà không cháy nền;
  giảm góc tối cho eco/gray/ink.
- Chạy lại `kiem-chung-r61.py`, mục tiêu ≥ 95% ca đạt cổng.
- Chạy lại R6.3 (5 tiêu chí mục 9) — lần trước trượt 0/5 do timeout điều hướng
  môi trường kiểm thử (localhost:8090 không có sẵn), cần chạy lại trên cổng 8080.
