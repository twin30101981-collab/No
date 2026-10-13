# CS-00 — Số đo GỐC hành trình chụp 10 trang → Xong → Xuất (mã P19 + BL-00/BL-01, vite dev)

Đo bằng `scripts/playwright/kiem-hanh-trinh-cs.mjs` (Chromium headless, camera giả từ ảnh IMG_NB_01.jpg 1920×2622, màn 412×915 cảm ứng). **Không phải số đo máy thật**: chạy vite dev (chưa nén), CPU giả lập chậm bằng CDP; dùng để SO TRƯỚC/SAU giữa các hạng mục, không dùng làm cam kết tốc độ.

| CPU | Chế độ | bấm→trang vào khay (trung vị, ms) | cả vòng chụp 10 trang (ms) | Xong→thấy tài liệu (ms) | Xuất PDF (ms) | JS heap đỉnh (MB) | số đo lưu / tra cứu / trúng (G-05) | bộ lọc các trang | trang có chữ OCR sau 12 s | dấu Kiểm mép |
|---|---|---|---|---|---|---|---|---|---|---|
| 1× | cho-rảnh | 1317 | 14170 | 529 | 5986 | 43 | 2 / 10 / 0 | {"auto": 10} | 0/10 | 10/10 |
| 1× | xong-ngay-dồn300 | — | 13212 | 477 | 5113 | 43 | 2 / 10 / 0 | {"auto": 10} | 0/10 | 10/10 |
| 1× | xong-ngay | 1394 | 15635 | 661 | 3490 | 43 | 2 / 10 / 0 | {"auto": 10} | 0/10 | 10/10 |
| 6× | xong-ngay-dồn300 | — | 65573 | 11730 | 7580 | 45 | 2 / 10 / 0 | {"auto": 10} | 0/10 | 10/10 |
| 6× | xong-ngay | 9621 | 106537 | 4728 | 6563 | 42 | 2 / 10 / 0 | {"auto": 10} | 0/10 | 10/10 |

## Kết luận so với báo cáo (nhãn: Đã xác minh bằng chạy thật)

- **G-01 — XÁC NHẬN.** Trang chỉ vào khay sau ~1,3 s (CPU 1×) và ~9,6 s (CPU 6×); mục tiêu đề án ≤ 0,3–0,5 s.
- **G-02 — XÁC NHẬN MỘT PHẦN.** Xong→thấy tài liệu: 0,5–0,7 s ở CPU 1×; 4,7 s (6×, chụp từng trang) và 11,7 s (6×, chụp dồn 300 ms/lần) với 10 trang — khớp TD-47 trên máy chậm; ở máy khoẻ thì không chậm. Mục tiêu ≤ 1 s với 20 trang ở CPU 6×.
- **G-05 — XÁC NHẬN.** Sau khi lưu, app tra cứu số đo chất lượng 10 lần và **trúng 0 lần** (khoá tra theo `p.src`, số đo lưu theo ảnh gốc) → chế độ Tự động không chọn được bộ lọc; mọi trang ra cùng một bộ lọc (`auto`). **Phát hiện thêm:** chỉ **2/10** trang có số đo được lưu (số đo tính lười trong `GradeBadge` cho ô đang hiển thị) — nên ngay cả khi sửa khoá tra, 8/10 trang vẫn không có số đo (giả thuyết nguyên nhân; xử lý ở CS-05).
- **G-03 — CHƯA KẾT LUẬN.** Nhãn “Đang xử lý…” không xuất hiện ở màn Tài liệu, nhưng trong các lần đo khay đã xử lý xong trước khi bấm Xong (pendingJobsAtLastTap = 0) nên chưa thử được ca còn việc nền khi rời màn chụp. Đọc mã vẫn cho thấy `bgQueue.cancelAll()` khi rời màn (scan.tsx:186) — cần ca thử riêng ở CS-02.
- **Dấu “Kiểm mép” 10/10 trang** với ảnh này (đã gặp ở HM-24): máy coi mọi trang là chưa chắc mép — theo dõi ở máy thật.
- OCR nền: 0/10 trang có chữ sau 12 s ở mọi cấu hình — không dùng làm số đo (giả thuyết, chưa xác minh: gói ngôn ngữ nhận chữ không tải được trong sandbox).
- Không có `pageerror`; hành trình hoàn tất ở mọi cấu hình; không mất lần bấm nào khi chụp dồn 300 ms/lần.

## Mục tiêu đề án để so (mục 16 báo cáo)

| Chỉ tiêu | Gốc (CPU 1× / 6×) | Mục tiêu |
|---|---|---|
| bấm → trang vào khay | 1,3 s / 9,6 s | ≤ 0,3–0,5 s |
| Xong → thấy tài liệu (10 trang) | 0,5–0,7 s / 4,7–11,7 s | ≤ 1 s (20 trang, CPU 6×) |
| Số đo G-05 trúng khi tra | 0/10 | 10/10 |

## Chạy lại

 ```
python3 -I scripts/playwright/tao-camera-gia.py de-an-nang-cap-scan/kiem-chung/bo-anh-NB/goc/IMG_NB_01.jpg canh.y4m
npx vite dev --port 8081 --host 127.0.0.1
Y4M=canh.y4m RATE=6 XONG_NOW=1 TAP_GAP_MS=300 N=10 OUT=./out node scripts/playwright/kiem-hanh-trinh-cs.mjs http://127.0.0.1:8081
 ```
