# BÀN GIAO — LANDGIS — đóng Phiên P01 (S0) → mở chuỗi tự động từ P02 — 2026-10-15
Skill: web-app-repair-upgrade v3.2.0 (handover/skill/) | Chế độ: **3-tự-động** (handover/AUTORUN.md) | Lý do đóng P01: người dùng yêu cầu chuyển phiên và chạy tự động toàn bộ đề án

## 1. Dự án và môi trường
Loại app: HTML một file + PWA | Mã: app/land-gis.html (= baseline/land-gis-v237-da-an.html, đã ẩn danh) | Test: tests/ (README)
Dữ liệu: localStorage (kho thửa land_gis_v18_cache), IndexedDB, Supabase | V3 khả dụng: CÓ (Playwright /opt/node-tools, mạng ngoài bị chặn → giả lập)
Quy ước: style chỉ trong <style>; không sửa chuỗi JS khi đổi font/style; sửa theo vùng; không format cả file; repo CÔNG KHAI → không commit dữ liệu cá nhân.

## 2. Đề án và trạng thái
Đề án v1.8 — **DA_DUYET** (15/10/2026) — de-an/DE_AN_LANDGIS_v1.8.docx · 66 hạng mục · thứ tự: backlog.json `thu_tu_thuc_thi`
Ước tính: 6–8 phiên (Đợt 0–3) · 11–14 phiên toàn bộ. Giới hạn chuỗi tự sinh: 8 phiên → có thể phải tiếp tục thủ công bằng PROMPT_PHIEN_SAU.md.
Chờ người dùng: HM-26 (dữ liệu địa chính); phần cấu hình của HM-06, 06c, 10b, 28; thiết bị thật HM-22; biểu mẫu HM-25.

## 3. Hạng mục vừa đóng
Không (S0 chỉ phân tích). Đã chuẩn bị: ẩn danh bản gốc (baseline/redact_baseline.py: 18 họ tên, 16 số CCCD/CMND, LG_AUDIT → []), smoke bản ẩn danh 0 pageerror (390 & 1366).

## 4. Hạng mục kế tiếp: HM-00 (P0) — kho thửa bị xoá khi bộ nhớ đầy
Gốc: lớp v119 (app/land-gis.html ~L100–221) liệt land_gis_v18_cache vào PRUNABLE (L117) và di trú <119 (L196) xoá nếu thiếu chuỗi "v".
Tái hiện: `node tests/tools/quota.js app/land-gis.html` → hiện tại afterReopen.plots = 0 (phải thành 1 sau sửa).
Sau đó HM-00b: gỡ observer killReplit (~L22868–22893); đo `node tests/tools/prof.js app/land-gis.html 50` (70,5 s → mục tiêu ≤ 3 s).

## 5. Việc dở dang chính xác
Không.

## 6. Quyết định đã chốt
Xem backlog.json `quyet_dinh_da_chot` (3 quyết định của người dùng + các mặc định theo đề xuất do người dùng yêu cầu chạy tự động).

## 7. Lỗi nền / ngoài phạm vi
hsv-react-phien16.zip là dự án khác — không động tới. index.html ở gốc repo là bản v43 đang triển khai — chỉ thay ở HM-11.

## 8. Việc người dùng cần làm
handover/VIEC_CUA_BAN.md (gấp: đặt repo về riêng tư).

## 9. Đường lui
Mỗi commit "HM-xx" là một điểm hoàn tác; baseline/ bất biến.

## 10. Nhật ký ngắn
- 03:00–09:50 P01: S0 phân tích, đề án v1.0→v1.8.
- 10:05 người dùng yêu cầu chạy tự động; phát hiện repo công khai → gỡ 2 PDF chứa số GCN, ẩn danh bản gốc trước khi đưa lên; dựng tests/, AUTORUN.md; sinh phiên P02.

## 11. Nhật ký phiên tự động
- S-OPEN phiên 2 (P02, 15/10/2026). Môi trường: Playwright /opt/node-tools OK; `cd tests && npm install` OK. Mở HM-00.
- HM-00 DAT_V3: 2 nguyên nhân gốc (PRUNABLE/di trú v119 + ROTATABLE `_cache$` ở LandGIS.storage L564 cắt nửa/xoá kho khi > 160 KB). Bản sao IndexedDB `landgis_rescue` khi lưu thất bại; test `tests/regress/hm00_quota.js` (baseline FAIL). Mở HM-00b.
- HM-00b DAT_V3: gỡ killReplit + MutationObserver; 50 thửa 59 s → 1,9 s. Test tests/regress/hm00b_perf.js. Model đổi sang Sonnet 5.5 (effort trung bình) theo người dùng. Kế tiếp: HM-01.
- HM-01 DAT_V3: `node tests/run.js app/land-gis.html` (hm00_quota, hm00b_perf, smoke PASS; hm02_mau_a, hm03_mau_b XFAIL — đặc tả cho HM-02/HM-03; xoá khỏi tests/xfail.json khi xong). Kế tiếp: HM-02.
- HM-02 DAT_V3: parseBookText nhiều khối (points/sides=vòng chính; blocks[] khối phụ có ring/area; warnings[]). Tests hm02_mau_a, hm02_parser PASS. Kế tiếp: HM-42 (cần HM-10, chưa xong → làm phần độc lập) rồi HM-03. Theo thứ tự: HM-42 phụ thuộc HM-10 (chưa) → bỏ qua tới sau; làm HM-03.
- HM-03 DAT_V3: một quy tắc `lgAreaVerdict` (0,05√A+0,0003A; trừ phần không cấp GCN) cho checkBook/reconcile/thẻ thửa/PDF/LG142. Mức warn=2×tol là mặc định chọn, chờ người dùng chốt. xfail.json rỗng. Kế tiếp theo thứ tự: HM-42 (cần HM-10, chưa) → HM-41.
- HM-41 DAT_V3: autoAdjust không còn ghi đè toạ độ; chỉ đề xuất (pendingAdjust) → applyPendingAdjust khi người dùng chọn. Kế tiếp: HM-45.
- HM-45 DAT_V3: hồ sơ LG60 sạch (tên chủ trống+ghi chú, toạ độ 2259336,23, KTT 105°30′, kết luận 0,05√A+0,0003A, bỏ nhãn vNN). Kế tiếp: HM-05.
- HM-05 DAT_V3: gỡ LG_AUDIT + mục UI v148; SCHEMA 120 dọn nhật ký cũ một lần (giữ KEEP_KEYS); lgScrub che CCCD/họ tên trong nhật ký. Kế tiếp: HM-00c.
- HM-00c DAT_V3: nhập .landgis kiểm tra trước, báo hợp lệ/không, tự lưu bản sao + Hoàn tác. Kế tiếp theo thứ tự: HM-06 (CHO_NGUOI_DUNG — làm phần mã).
