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
- HM-06d DAT_V3: chế độ khoá phiên nhớ bền + xoá bản lâu dài (landgis_key_session_pref). Kế tiếp: HM-06 (SRI/ghim; phần Supabase/SheetJS cần người dùng).
- HM-06 CHO_NGUOI_DUNG (phần mã xong): SRI + ghim phiên bản + cảnh báo khoá; còn SheetJS và RLS (VIEC_CUA_BAN 5–6). Kế tiếp: HM-06c (cần HM-06 → làm phần SQL/hướng dẫn, đánh CHO_NGUOI_DUNG), HM-04.
- HM-06c CHO_NGUOI_DUNG (phần mã xong, test giả lập): OTP + token + xoá mềm/Thùng rác; SQL ở handover/supabase/06c_auth_rls.sql. Kế tiếp: HM-04.
- HM-04 DAT_V3: một lõi hình học (lgCoreArea → LGCore.Geometry) + một định nghĩa proj4 + API bắc/đông có kiểm phạm vi. Kế tiếp: HM-43, HM-04b.
- HM-43 DAT_V3: LGCore.Geometry.validate + hồ sơ chỉ ghi HỢP LỆ khi qua hết; gỡ nốt ngưỡng diện tích rời (LG.compare, checkAgainstBook). Kế tiếp: HM-04b.
- HM-04b DAT_V3: KTT theo địa bàn cũ sau sáp nhập + hỏi người dùng khi không rõ + ưu tiên dòng KTT trên sổ. Kế tiếp: HM-08a.
- HM-08a DAT_V3: token --lg-dock-clear + 1 toast/lớp + theme FAB nằm trên dock; chạm 5 nút dock luôn trúng (360/390/430). Còn: thang z-index thống nhất, gộp 2 lớp toast. Kế tiếp: HM-07a.
- HM-07a DAT_V3: LG_TIMERS (đăng ký bộ đếm/observer/GPS), ẩn app thì ngủ, DOM nhàn rỗi −69%. Kế tiếp: HM-07b (rail/dock).
- HM-07b DAT_V3: rail 128→0, dock 75→0 thay đổi DOM khi nhàn rỗi (sửa gốc thực hiện ở HM-07a). Kế tiếp: HM-07c.
- HM-07c DAT_V3: gom observer (24→2 thật), cssMerge tắt mặc định, hudAutoHide gộp. Kế tiếp: HM-08b (điều hướng mới — cần đối chiếu mockup).
- HM-08b DAT_V3: dock 5 mục mới (Bản đồ/Thửa/＋Nhập sổ/Hồ sơ/Thêm), gỡ tab ngang + nút nổi, 13 đường vào cũ có test. Kế tiếp: HM-08i.
- HM-08i DAT_V3: Màn Thửa mới (ảo hoá 500 thửa, tìm, lọc Đạt/Không đạt/Chưa GCN, đồng bộ). Kế tiếp: HM-08c.
- HM-08c DAT_V3: màn Bản đồ mới (ô tìm, chip, 2 nút tròn, thẻ thửa sheet, không chồng lớp nửa dưới). Kế tiếp: HM-08d (luồng Nhập sổ 3 bước), HM-08e.
- HM-08d DAT_V3: luồng Nhập bảng kê 3 bước (Mẫu A/B hết luồng 390 px, footer không bị che). Phần ảnh/camera chưa nối vào bước 2. Kế tiếp: HM-08e.
- HM-08g DAT_V3: xoá có Hoàn tác 6 s + Thùng rác 30 ngày bền + xoá tất cả 2 bước. Kế tiếp theo thứ tự: HM-08e (M), HM-09, HM-09b, HM-10…
- HM-09 DAT_V3: tự đổi lớp nền tối đa 3 lần rồi dừng + báo; ngoại tuyến không đổi. Kế tiếp: HM-09b (XS).
- HM-09b DAT_V3: ghi nguồn bản đồ hiện lại (ⓘ Nguồn). 

## 12. ĐÓNG PHIÊN P02 (ngữ cảnh ≈ 70%)
Đã xong 26 hạng mục (xem backlog `chuoi_phien.nhat_ky`). Bộ hồi quy: `node tests/run.js app/land-gis.html` = 27/27 PASS. Việc dở dang: không. Kế tiếp trong thu_tu_thuc_thi: HM-42 (cần HM-10 — làm HM-10 trước, S), HM-08e (M), HM-10 (S), HM-39 (M), HM-33 (S) … HM-06/06c/…: CHO_NGUOI_DUNG (xem VIEC_CUA_BAN.md). Lưu ý: get_session.context_usage không cập nhật (đứng ở 124894) — tự ước lượng bằng total_tokens.

## 13. Phiên P03
- S-OPEN phiên 3 (P03, 15/10/2026). Môi trường: Playwright /opt/node-tools OK; `cd tests && npm install` OK. Mở HM-10.
- HM-10 DAT_V3: danh mục `LG_AI_MODELS` (mặc định claude-opus-5-5; sonnet-5-5, haiku-5-5), bỏ ID cũ + haiku-3-5 OpenRouter; max_tokens 16000, kiểm stop_reason (max_tokens/refusal), 404 → model kế + báo; structured outputs khi có schema; khoá Gemini qua header x-goog-api-key. Test tests/regress/hm10_models.js. Kế tiếp: HM-42 (HM-10 xong).
- HM-42 DAT_V3: một lời nhắc theo loại trang + một lần gọi/ảnh (callGeminiSupplementAPI = callGemini25FlashAPI = lgAiExtractRaw; quét lượt 2 bị bỏ qua khi có schema); Claude structured outputs (LG_AI_SCHEMA); khối phụ `khoi_phu`; độ tin cậy từng số (<90% tô vàng, `so_phai_ra_soat`); giáp ranh có cấu trúc `giap_ranh[]` (cho HM-35). Test tests/regress/hm42_ai.js. Chưa làm (cần V1): hiệu chỉnh trên ảnh thật, vẽ vùng ảnh, Gemini responseSchema, nhập khối phụ thành thửa. Kế tiếp: HM-08e (M), HM-39 (M), HM-33 (S).

## 14. ĐÓNG PHIÊN P03 (ngữ cảnh ≈ 70%)
Đã xong HM-10, HM-42 (cả hai DAT_V3). `node tests/run.js app/land-gis.html` = PASS (lưu ý: hm07c_observers `nap_50_thua_duoi_2s` sát ngưỡng ở môi trường này, 1,87–2,1 s — đo lại một mình nếu FAIL do tải CPU; đừng chạy 2 bộ test song song). Việc dở dang: không. Kế tiếp: HM-08e (M), HM-39 (M), HM-33 (S), HM-26… Nhánh từ xa có thêm HM-06e (bỏ nhập Excel, chỉ giữ xuất) do người dùng thêm — kiểm tra backlog.

## 15. Phiên P04
- S-OPEN phiên 4 (P04, 15/10/2026). Môi trường: Playwright /opt/node-tools OK; `cd tests && npm install` OK. Mở HM-08e (rồi HM-06e, HM-39, HM-33).
- HM-08e DAT_V3: Hồ sơ có đầu đề + sơ đồ + địa chỉ/mục đích/nguồn gốc/biến động; Thêm dạng danh sách (công tắc giao diện tối); Chế độ chuyên gia bền (localStorage landgis_expert, mặc định tắt) ẩn công cụ V42–V237. Test hm08e_profile_more; hm08b_nav cập nhật theo. Kế tiếp: HM-06e, HM-39, HM-33.
- HM-06e DAT_V3: gỡ nhánh đọc .xlsx/.xls (báo 'Không hỗ trợ nhập Excel'), ô chọn file/nhãn đổi CAD/CSV; xuất Excel giữ nguyên (SheetJS chỉ còn để ghi). Test hm06e_no_xlsx_import. Sửa test hm42_ai chập chờn (đếm cả fetch nền). Kế tiếp: HM-39, HM-33.
- HM-39 DAT_V3: lớp phủ mặc định tắt (khoá overlay v39; 152→88 ô, −42%); ô lỗi PNG trống không tính là tải tốt; bỏ vá từng ô cho lớp nền (đổi cả lớp đúng 1 lần, 1 thông báo); ngoại tuyến: 0 lần đổi, 1 thông báo/lần mất mạng (reset khi online). Test hm39_layers (3 kịch bản). hm42_ai: chỉ đếm POST /messages (hết chập chờn). Kế tiếp: HM-33 (dữ liệu 129 xã — cần danh sách chính thức).
- HM-33 CHO_NGUOI_DUNG (phần mã xong): LGAdmin (tra xã mới/cũ → KTT), app/admin-map.json rỗng, handover/tools/build_admin_map.py (CSV→JSON), test hm33_admin. Cần danh sách chính thức (VIEC_CUA_BAN 9).

## 16. ĐÓNG PHIÊN P04 (ngữ cảnh ≈ 70%)
Đã xong: HM-08e, HM-06e, HM-39 (DAT_V3), HM-33 (CHO_NGUOI_DUNG — cơ chế xong, thiếu dữ liệu). Bộ hồi quy `node tests/run.js app/land-gis.html` PASS (hm07c nap_50_thua sát ngưỡng: 1,7–1,8 s khi chạy riêng, ~2,1 s khi nằm trong bộ → nếu FAIL chỉ ở đây thì chạy riêng lại; đừng chạy 2 bộ song song; run.js không có tham số lọc, chạy test lẻ bằng `node tests/regress/<tên>.js app/land-gis.html`). Việc dở dang: không. Kế tiếp theo thu_tu_thuc_thi: HM-26 (CHO_NGUOI_DUNG), HM-27a, HM-27b, HM-28 (CHO_NGUOI_DUNG), HM-29, HM-30 … Lưu ý: get_session.context_usage không cập nhật.
- S-OPEN phiên 5 (P05, 15/10/2026). Môi trường: Playwright /opt/node-tools OK; `cd tests && npm install` OK. Nhánh cục bộ phải ff từ origin trước. Mở HM-27a.
- HM-27a DAT_V2: handover/tools/cadastre_convert.py (SHP/GeoJSON; DGN/GDB qua ogr2ogr nếu có GDAL) → parcels.json + report.json (lệch diện tích, trùng tờ/thửa, lỗi hình tự sửa buffer(0), danh sách trắng trường → loại tên chủ/CCCD). Test tests/regress/hm27a_convert.py (chạy riêng bằng python3, run.js chỉ chạy .js). Cần `pip install pyshp shapely`.
- HM-27b DAT_V3: handover/tools/cadastre_pack.py → pack.lgpk.gz + manifest.json (sha256); app/lib/lgpack.js đọc (get theo tờ/thửa, at(x,y) R-tree STR, edges). Test tests/regress/hm27b_pack.js (20.000 thửa: 485 KB, tra ≈ 0,007 ms). app/land-gis.html không đổi → không chạy lại bộ đầy đủ. Kế tiếp: HM-28 (CHO_NGUOI_DUNG, bỏ qua), HM-29.
- HM-29 DAT_V3: LGPacks (tải tiếp bằng Range, sha256, lưu IndexedDB, báo bản mới, xoá, đồng hồ dung lượng) + màn Thêm → Gói dữ liệu địa chính. Test hm29_packs; bộ đầy đủ 35/35 PASS. Kế tiếp: HM-30 (đọc gói bằng app/lib/lgpack.js, vẽ canvas).
- HM-30 DAT_V3: LGCadastre — lớp vector địa chính canvas (20.000 thửa 4–26 ms), nhãn tờ/thửa, chạm chọn, ngoại tuyến; nút Hiện trên bản đồ. Test hm30_cadastre; bộ đầy đủ PASS. Công cụ convert/pack nhận --ktt/--mui. Kế tiếp: HM-31.
- HM-31 DAT_V3: Tra địa chính (xã cũ/mới + tờ + thửa) → bảng toạ độ → đối chiếu GCN; nguồn ghi vào nguon_toa_do. Test hm31_lookup; bộ đầy đủ PASS. Kế tiếp: HM-32 (M), HM-34 (S).
- HM-32 DAT_V3: Tìm theo hình (cạnh + diện tích) trong Nhập sổ: top-3 + % + lý do, chọn → tra toạ độ. Test hm32_shape; bộ đầy đủ PASS. Kế tiếp: HM-34 (S).
- HM-34 DAT_V3: Thêm → Thửa tại vị trí của tôi (GPS + R-tree, lân cận theo sai số). Test hm34_gps; bộ đầy đủ PASS. Kế tiếp: HM-11 (index.html v43 → bản mới?), HM-11b, HM-40…
- HM-11 DAT_V3: PWA — index.html = bản app v237 (deploy_pages.py), sw.js sinh theo phiên bản (cache shell + thông báo Có bản mới, giữ cache tile), manifest khoá dọc. Test hm11_pwa; bộ đầy đủ PASS. QUY TẮC MỚI (AUTORUN §2 bước 3): chạy deploy_pages.py sau mỗi lần sửa app. Kế tiếp: HM-11b.
- HM-11b DAT_V3: vendor/ (xlsx, html2canvas, jsQR, jsPDF cùng byte với SRI) + SW cache; xuất PDF/Excel, quét QR chạy ngoại tuyến. Tesseract/pdfmake chưa đóng gói. Test hm11b_offline_libs; bộ đầy đủ PASS. Kế tiếp: HM-40.
- HM-40 DAT_V3: phụ lục ảnh bản đồ dùng ô đã lưu/Esri; không có ảnh thì bỏ phụ lục (PDF và Hồ sơ), không in lỗi kỹ thuật. Test hm40_appendix. Lưu ý: hm39_layers có thể FAIL thoáng qua khi tải CPU cao → chạy riêng. Kế tiếp: HM-44 (M).
- HM-44 DAT_V3: PDF hồ sơ theo dòng chảy (Mẫu B 4 trang chính + phụ lục), số trang bằng hộp lề @page (Chromium ≥131). Test hm44_pdf_flow (Chromium page.pdf + pdftotext); bộ đầy đủ PASS. Kế tiếp: HM-10b (CHO_NGUOI_DUNG, phần mã), HM-08f, HM-08h…
- HM-10b CHO_NGUOI_DUNG (phần mã xong): ai-proxy Edge Function + công tắc AI qua máy chủ; VIEC_CUA_BAN mục 10. Test hm10b_proxy; bộ đầy đủ PASS. Kế tiếp: HM-08f (M), HM-08h (S), HM-12a (M), HM-35…
- HM-08h DAT_V3: nhãn/tên cho 29 ô + 1 nút, aria-level sửa nhảy cấp, 29 onclick → uỷ quyền data-lg-call. Test hm08h_a11y; bộ đầy đủ PASS. HM-08f HOÃN (xem backlog ghi_chu). Kế tiếp: HM-12a, HM-35…
- HM-12a DAT_V3: gỡ 18 khối LGCore chạy song song mặc định tắt (v188, v190–v206): −192 KB. Giữ v186/v187/v189. Test hm12a_cleanup; bộ đầy đủ PASS. Kế tiếp: HM-35.
- HM-35 DAT_V3: giáp ranh có cấu trúc (LG35) + form xác nhận ở Hồ sơ; Mẫu A/B đúng; nhãn lạ → chưa rõ. Test hm35_giap_ranh; bộ đầy đủ PASS. Kế tiếp: HM-36, HM-37, HM-13…
- HM-36 DAT_V3: giáp ranh theo hình học từng cạnh (thửa đã lưu + gói địa chính), cảnh báo mâu thuẫn nhãn sổ, tab Giáp ranh + nhãn bản đồ. Test hm36_giap_hh; bộ đầy đủ PASS. Kế tiếp theo thứ tự: HM-37 (cần HM-17 chưa xong → làm phần độc lập hoặc bỏ qua), HM-13, HM-14…
- HM-14, HM-15, HM-16, HM-24, HM-38 DAT_V3 (5 hạng mục S, một lượt): che CCCD/CMND khi in; chia sẻ PDF qua Web Share; Wake Lock + rung khi cắm mốc; quy đổi toạ độ hàng loạt (CSV BOM); mục Tứ cận trên hồ sơ. Tests hm14_mask, hm15_share, hm16_wake, hm24_convert, hm38_tucan; bộ đầy đủ PASS (53 test). hm12a_cleanup đổi ngưỡng kích cỡ < 3,15 MB. Kế tiếp: HM-13 (M), HM-21 (S), HM-23 (M), HM-17 (M), HM-37 (cần HM-17)…
- HM-21 DAT_V3: Báo cáo đối chiếu 1 trang A4 (Hồ sơ → Báo cáo đối chiếu), QR rút gọn thành mã tra cứu khi quá dài. Test hm21_baocao; bộ đầy đủ PASS (54). Kế tiếp: HM-13 (M), HM-23 (M), HM-17 (M)…
- HM-13 DAT_V3 (tab Biến động + in hồ sơ), HM-23 DAT_V3 (hàng đợi nhập sổ ngoại tuyến). Tests hm13_bien_dong, hm23_queue; bộ đầy đủ PASS (56). Kế tiếp: HM-17 (M) rồi HM-37; HM-18a…

## 17. ĐÓNG PHIÊN P05 (ngữ cảnh ≈ 60%)
Đã xong 26 hạng mục: HM-27a (V2), 27b, 29, 30, 31, 32, 34, 11, 11b, 40, 44, 10b (CHO_NGUOI_DUNG), 08h, 12a, 35, 36, 14, 15, 16, 24, 38, 21, 13, 23, 17, 37. Bộ hồi quy `node tests/run.js app/land-gis.html` = PASS (58 test; hm39_layers/hm07c có thể FAIL thoáng qua khi CPU bận → chạy riêng). Việc dở dang: không.
**Còn lại (CHUA_LAM):** HM-18a (M, tách thửa), HM-18b (M, xuất hồ sơ tách thửa; cần 18a), HM-19 (M, đối soát mốc thực địa; HM-16 đã xong), HM-20 (M, sao lưu tự động + lịch sử phiên bản + đồng bộ CSDL), HM-22 (M, GNSS Bluetooth NMEA — làm phần mã, CHO_NGUOI_DUNG), HM-25 (M, xuất theo biểu mẫu — làm phần mã/khung nạp mẫu, CHO_NGUOI_DUNG), HM-28 (M, Edge Function ký link tải gói địa chính + bucket riêng — làm phần mã, CHO_NGUOI_DUNG; hiện LGPacks.config({headers,resolveUrl}) đã chừa chỗ), HM-08f (M, HOÃN: gỡ sidebar/CSS chồng lớp — cần phiên riêng + so ảnh trước-sau 360/390/430, #sidebar vẫn chứa panel cũ mở bằng goLegacyTab).
**Quy tắc mới cần nhớ:** (1) mỗi lần sửa `app/land-gis.html` chạy `python3 handover/tools/deploy_pages.py` rồi mới chạy bộ test (hm11_pwa kiểm index.html = app); (2) test Python riêng: `python3 tests/regress/hm27a_convert.py` (cần `pip install pyshp shapely`); (3) pip hoạt động trong môi trường; (4) tiện ích tests/tools/a11y_scan.js.
**Việc người dùng cần làm (đã ghi VIEC_CUA_BAN.md):** dữ liệu địa chính thật (HM-26), danh sách xã mới/cũ (HM-33), Supabase RLS/Edge Function (HM-06/06c/10b/28), TalkBack (mục 11), thử máy thật các tính năng GPS/Bluetooth/camera.
- Phiên kế: P06 = session_016bfgvkpo5ZM5L3ZStYgd1r (sinh lúc đóng P05).

## 18. Phiên P06
- S-OPEN phiên 6 (P06, 15/10/2026). Môi trường: Playwright /opt/node-tools OK; `cd tests && npm install` OK; pip pyshp shapely OK. Mở HM-18a.
- HM-18a, HM-18b DAT_V3: LGSplit (Thêm → Mô phỏng tách thửa): cắt theo đường thẳng (2 mốc/2 toạ độ) hoặc diện tích mục tiêu song song cạnh/phương vị; mốc mới N1…; bảng toạ độ + sơ đồ; hồ sơ PDF (phương án + mỗi thửa mới) và DXF từng thửa. Test hm18_split; bộ đầy đủ PASS. Kế tiếp: HM-19.
- HM-19 DAT_V3: LGField (Hồ sơ → Thực địa): đo GPS tại mốc, độ lệch + hướng, ghi chú/ảnh theo mốc, báo cáo đối soát. Test hm19_field (GPS giả lập); bộ đầy đủ PASS. Cần thử máy thật. Kế tiếp: HM-20.
- HM-20 DAT_V3: LGVersions (Thêm → Sao lưu tự động & phiên bản): lịch sử phiên bản từng thửa + khôi phục; sao lưu tự động; đồng bộ CSDL (tuỳ chọn) có hàng chờ ngoại tuyến và xử lý xung đột. Ảnh mốc không gửi lên CSDL. Test hm20_versions; bộ đầy đủ PASS. Kế tiếp: HM-22, HM-25, HM-28 (phần mã).
- HM-22 CHO_NGUOI_DUNG (phần mã xong): LGGnss — máy thu GNSS/RTK qua Bluetooth BLE/Web Serial, NMEA, RTK Fixed/Float, HM-19 dùng GNSS ngoài; test giả lập hm22_gnss. Cần máy thu thật (VIEC_CUA_BAN 12).
- HM-28 CHO_NGUOI_DUNG (phần mã xong): sign-pack (Edge Function + SQL bucket riêng tư/quyền/nhật ký) + app xin link ký cho gói rieng_tu; test hm28_signpack; bộ đầy đủ PASS. Việc của bạn: VIEC_CUA_BAN 13.
- HM-25 CHO_NGUOI_DUNG (phần mã xong): LGForms — nạp biểu mẫu HTML/JSON của bạn, điền dữ liệu thửa, in PDF / Excel / CSV; 3 mẫu có sẵn. Test hm25_forms; bộ đầy đủ PASS. Cần mẫu thật (VIEC_CUA_BAN 14).
- HM-08f DAT_V3 (một phần): gỡ luật CSS chết bằng prune_dead_css.py (−10 luật, −4 !important); ảnh 360/390/430 khớp; test hm08f_css. Sidebar/!important còn sống để lại (xem TONG_KET §4).

## 19. ĐÓNG PHIÊN P06 — KẾT THÚC CHUỖI (ngữ cảnh ≈ 35%)
Đã xong: HM-18a, 18b, 19, 20 (DAT_V3); HM-22, 25, 28 (CHO_NGUOI_DUNG, phần mã xong); HM-08f (một phần, DAT_V3). Không còn hạng mục CHUA_LAM. Bộ hồi quy `node tests/run.js app/land-gis.html` = PASS. Việc dở dang: không. **Không sinh phiên P07** (AUTORUN §6): đã viết handover/TONG_KET.md. Người dùng xem VIEC_CUA_BAN.md (mục 12–14 mới).
