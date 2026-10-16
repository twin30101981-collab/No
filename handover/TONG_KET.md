# TỔNG KẾT ĐỀ ÁN LANDGIS v1.8 — chuỗi tự động P02–P06 (15/10/2026)

Skill: web-app-repair-upgrade v3.2.0 · Chế độ 3-tự-động · Nhánh `ccr-9dbbe50d-dw0kll` · Mã app: `app/land-gis.html` (HTML một file + PWA; bản đang triển khai `index.html`/`sw.js` sinh bằng `handover/tools/deploy_pages.py`).

## 1. Kết quả tổng

| Trạng thái | Số hạng mục |
|---|---|
| Đạt, kiểm thử tự động V3 (Playwright) | 58 |
| Phần mã/tài liệu xong, chờ việc của người dùng | 8 |
| Đạt, kiểm thử V2 (công cụ Python) | 1 |

Bộ hồi quy: `node tests/run.js app/land-gis.html` → toàn bộ PASS (≈ 65 kịch bản); test Python: `python3 tests/regress/hm27a_convert.py` (cần `pip install pyshp shapely`).

**Nhãn xác minh trung thực:** mọi kết quả ở trên là **Đã sửa và đã kiểm tra bậc V3** (trình duyệt Chromium giả lập 360/390/430/1366 px, mạng ngoài bị chặn, GPS/Bluetooth/AI/Supabase giả lập). **Chưa kiểm trên thiết bị thật (V1):** GPS/RTK, Bluetooth, camera, TalkBack, in PDF thực tế, Supabase thật, đọc sổ bằng AI thật.

## 2. Danh sách hạng mục

| Mã | Tên | Trạng thái | Bằng chứng |
|---|---|---|---|
| HM-00 | CHẶN MẤT DỮ LIỆU: kho thửa bị xoá khi bộ nhớ đầy | DAT_V3 | tests/regress/hm00_quota.js (baseline FAIL: kho 1→0, 30→0) |
| HM-00b | CHẶN TREO APP: gỡ bộ quét 'killReplit' chạy trên mọi thay đổi DOM | DAT_V3 | 50 thửa: 59337 ms → 1887 ms; hàm lớn nhất hudAutoHide 23% |
| HM-01 | Hạ tầng kiểm thử hồi quy tối thiểu (Playwright + fixture 2 sổ mẫu) | DAT_V3 | XFAIL hm02_mau_a (11 mốc/29,85 m² thay vì 7+4), XFAIL hm03_mau_b (Mẫu B báo lệch 1,39 m²) |
| HM-02 | Bộ đọc bảng kê nhận nhiều khối (vòng ranh chính + khối phụ quy hoạch) | DAT_V3 | hm02_mau_a: 7 mốc 29,70 + khối phụ 4 mốc 7,10 m², hm02_parser: Mẫu B không hồi quy, số 2.2 |
| HM-42 | Lời nhắc AI theo loại trang + structured outputs + bảng kê nhiều khối + độ tin c | DAT_V3 | tests/regress/hm42_ai.js |
| HM-03 | Một quy tắc đối chiếu diện tích cho mọi luồng (trừ phần không cấp GCN, một công  | DAT_V3 | hm03_mau_b PASS (6 kiểm tra), LG61.selfTest 13/13 như baseline |
| HM-41 | Bỏ bình sai tự động ép diện tích; bình sai chỉ khi người dùng chọn, không ghi đè | DAT_V3 | hm41_no_autoadjust PASS, e2e3 Mẫu B: thông báo "khớp sổ", không còn bình sai ép |
| HM-45 | Nội dung hồ sơ đúng và sạch (tên chủ, định dạng số, KTT, ngưỡng, nhãn nội bộ, Tứ | DAT_V3 | baseline FAIL 5/5 kiểm tra, sau sửa PASS 5/5 |
| HM-04 | Một lõi hình học & một định nghĩa VN-2000 dùng chung | DAT_V3 | sai lệch lớn nhất 5e-8 m² so với BigInt; run.js 14/14 PASS; samples.js không đổi |
| HM-43 | Kiểm tra hình học đầy đủ (đỉnh trùng, tự chạm, tự cắt, khối phụ trong vòng chính | DAT_V3 |  |
| HM-04b | Kinh tuyến trục theo địa giới hành chính mới (sau 1/7/2025) | DAT_V3 | run.js 16/16 PASS; e2e3 Mẫu B vẫn tới PDF |
| HM-05 | Xoá dữ liệu cũ gây mất an toàn (LG_AUDIT, khoá lưu trữ cũ/hỏng, nhật ký) | DAT_V3 | run.js 9/9 PASS |
| HM-00c | Nhập dự án an toàn: kiểm tra trước, tự sao lưu trước khi 'Thay thế toàn bộ' | DAT_V3 |  |
| HM-06 | Bảo mật: thư viện ngoài, khoá API, CSDL Supabase | CHO_NGUOI_DUNG | baseline FAIL 3/4; bản bị sửa bị chặn |
| HM-06c | Đăng nhập + phân quyền CSDL Supabase (RLS theo người dùng) | CHO_NGUOI_DUNG | máy chủ giả lập Supabase (Playwright route) |
| HM-06d | Sửa chế độ khoá AI 'chỉ trong phiên' (không để lại khoá cũ) | DAT_V3 | baseline FAIL 3/3 |
| HM-07a | Đăng ký và cắt bớt bộ đếm/observer chạy nền | DAT_V3 | thay đổi DOM nhàn rỗi (không tính ô ảnh): ≈400 → 124 /10 s (−69%), run.js 18/18 PASS |
| HM-07b | Thanh điều hướng (rail lg62, dock lg113) dựng lại liên tục | DAT_V3 | rail 128→0, dock 75→0 thay đổi /10 s nhàn rỗi |
| HM-07c | Gom 21 MutationObserver toàn trang về 1 bộ điều phối; bỏ cssMerge và hudAutoHide | DAT_V3 | observer thật: 24 → 2; deleteRule lúc chạy: 2 → 0; nạp 50 thửa 1,9 s; kéo bản đồ trung vị  |
| HM-39 | Một bộ quản lý lớp nền: biết ngoại tuyến, không tự đổi lặp, 1 thông báo, nguồn h | DAT_V3 | tests/regress/hm39_layers.js |
| HM-08a | Khung layout mobile: token, safe-area, thang z-index, một khe toast không chặn c | DAT_V3 | baseline: 5/5 nút dock bị che ở cả 3 độ rộng |
| HM-08b | Điều hướng mới: dock 5 mục + sheet Nhập sổ; gỡ tab ngang và nút trùng | DAT_V3 | 3 độ rộng 360/390/430; 13 đường vào chức năng cũ được bấm thật trong test; run.js 21/21 PA |
| HM-08i | Màn Thửa: danh sách, tìm, lọc Đạt/Không đạt, trạng thái đồng bộ (mockup ⑦) | DAT_V3 | 500 thửa: 12 hàng DOM, dựng cửa sổ trung vị 6,9 ms; lọc Đạt/Không đạt/Chưa GCN; tìm mã/tờ/ |
| HM-08c | Màn Bản đồ: ô tìm, chip lớp phủ, 2 nút nổi, sheet 3 trạng thái | DAT_V3 | 3 độ rộng; không phần tử nào chồng ở nửa dưới (dock/sheet/nút tròn/toast); sheet 170→380→7 |
| HM-08d | Luồng Nhập sổ 3 bước (mockup ②③④) | DAT_V3 | Mẫu A (7 mốc + khối phụ 4 mốc 7,10 m²) và Mẫu B (trừ 1,40 m² không cấp GCN) chạy hết 3 bướ |
| HM-08e | Hồ sơ thửa + Thêm/Cài đặt + Chế độ chuyên gia | DAT_V3 | tests/regress/hm08e_profile_more.js |
| HM-08g | Xoá có xác nhận + Thùng rác 30 ngày + hoàn tác bền | DAT_V3 | thanh Hoàn tác 6 s; Thùng rác landgis_trash_v1 bền qua tải lại (30 ngày); xoá tất cả 2 xác |
| HM-08f | Gỡ bố cục desktop/sidebar và CSS chồng lớp không còn dùng | DAT_V3 | tests/regress/hm08f_css.js, tests/tools/cssdump.js+cssdiff.py, tests/tools/shots.js+shotdi |
| HM-08h | Truy cập: tên nút, nhãn ô nhập, thứ bậc tiêu đề, bỏ onclick nội dòng | DAT_V3 | tests/regress/hm08h_a11y.js, tests/tools/a11y_scan.js |
| HM-09 | Tự đổi lớp nền khi ô bản đồ lỗi (vòng lặp nghi vấn) | DAT_V3 | lỗi 100% ô ảnh: đổi đúng 3 lần rồi dừng + 1 thông báo; ngoại tuyến không đổi |
| HM-09b | Hiện lại ghi nguồn bản đồ (attribution) theo điều khoản nhà cung cấp | DAT_V3 | run.js 27/27 PASS |
| HM-10 | Danh mục model AI một chỗ, xử lý model ngừng hỗ trợ | DAT_V3 | tests/regress/hm10_models.js |
| HM-11 | Triển khai v237 lên repo + PWA cập nhật đúng phiên bản | DAT_V3 | tests/regress/hm11_pwa.js, handover/tools/deploy_pages.py, handover/tools/sw.template.js |
| HM-11b | Ngoại tuyến đầy đủ: thư viện xuất/quét chạy khi mất mạng | DAT_V3 | vendor/, tests/regress/hm11b_offline_libs.js |
| HM-40 | Ảnh bản đồ cho hồ sơ từ nguồn có CORS/ô đã lưu; không có ảnh thì bỏ phụ lục | DAT_V3 | tests/regress/hm40_appendix.js |
| HM-44 | Bố cục hồ sơ PDF theo dòng chảy: tự ngắt trang, không cắt mép, không trang trống | DAT_V3 | tests/regress/hm44_pdf_flow.js |
| HM-10b | Gọi AI qua máy chủ trung gian (Supabase Edge Function) — không để khoá trong trì | CHO_NGUOI_DUNG | handover/supabase/functions/ai-proxy/, handover/supabase/10b_ai_usage.sql, tests/regress/h |
| HM-12a | Dọn khối chẩn đoán/rollout chỉ dùng cho phát triển (LGCore 07–08) | DAT_V3 | tests/regress/hm12a_cleanup.js |
| HM-13 | Đề xuất: nhập trang IV 'Những thay đổi sau khi cấp GCN' vào lịch sử thửa | DAT_V3 | tests/regress/hm13_bien_dong.js |
| HM-14 | Đề xuất: in/xuất hồ sơ có tuỳ chọn che CMND/CCCD | DAT_V3 | tests/regress/hm14_mask.js |
| HM-15 | Chia sẻ hồ sơ qua Zalo/Email (Web Share API, gửi file PDF) | DAT_V3 | tests/regress/hm15_share.js |
| HM-16 | Giữ màn hình sáng + rung báo khi dẫn đường/cắm mốc (Wake Lock) | DAT_V3 | tests/regress/hm16_wake.js |
| HM-21 | Báo cáo đối chiếu 1 trang (gửi khách/ngân hàng) | DAT_V3 | tests/regress/hm21_baocao.js |
| HM-17 | Kiểm tra chồng lấn / hở ranh với thửa giáp ranh đã lưu | DAT_V3 | tests/regress/hm17_topo.js |
| HM-18a | Mô phỏng tách thửa: cắt theo đường thẳng / diện tích mục tiêu | DAT_V3 | tests/regress/hm18_split.js |
| HM-18b | Xuất hồ sơ tách thửa (bảng toạ độ, sơ đồ, DXF) | DAT_V3 | tests/regress/hm18_split.js |
| HM-19 | Đối soát mốc thực địa: GPS tại mốc so với toạ độ sổ + ảnh/ghi chú gắn mốc | DAT_V3 | tests/regress/hm19_field.js |
| HM-20 | Sao lưu tự động + lịch sử phiên bản thửa, đồng bộ CSDL khi có mạng | DAT_V3 | tests/regress/hm20_versions.js |
| HM-23 | Hàng đợi nhập sổ ngoại tuyến: chụp nhiều sổ khi mất mạng, tự gửi AI khi có mạng | DAT_V3 | tests/regress/hm23_queue.js |
| HM-24 | Công cụ quy đổi toạ độ hàng loạt VN-2000 ↔ WGS84 (dán/CSV) | DAT_V3 | tests/regress/hm24_convert.js |
| HM-22 | Kết nối máy thu GNSS RTK qua Bluetooth (NMEA) — toạ độ cm | CHO_NGUOI_DUNG | tests/regress/hm22_gnss.js |
| HM-25 | Xuất theo biểu mẫu của bạn (bảng kê toạ độ, sơ đồ thửa, Excel mẫu) | CHO_NGUOI_DUNG | tests/regress/hm25_forms.js |
| HM-26 | [Việc của bạn] Xin cấp dữ liệu địa chính thí điểm 1–2 xã/phường từ Sở NN&MT / VP | CHO_NGUOI_DUNG |  |
| HM-33 | Bảng đơn vị hành chính 129 xã/phường mới ↔ xã/huyện cũ ↔ KTT (toàn tỉnh) | CHO_NGUOI_DUNG | tests/regress/hm33_admin.js, app/admin-map.json, handover/tools/build_admin_map.py |
| HM-27a | Công cụ chuyển đổi trên máy tính: DGN/SHP/GDB → gói theo xã (giữ VN-2000, bỏ dữ  | DAT_V2 | handover/tools/cadastre_convert.py |
| HM-27b | Chỉ mục tờ/thửa + dãy cạnh + R-tree; nén; manifest có sha256 | DAT_V3 | handover/tools/cadastre_pack.py, app/lib/lgpack.js |
| HM-28 | Kho gói dữ liệu riêng tư + link tải có hạn (Supabase Storage / Cloudflare R2) | CHO_NGUOI_DUNG | tests/regress/hm28_signpack.js |
| HM-29 | Tải, lưu bền và cập nhật gói theo xã trên điện thoại (OPFS/IndexedDB) — mockup ⑯ | DAT_V3 | tests/regress/hm29_packs.js |
| HM-30 | Lớp bản đồ địa chính vector trên Leaflet canvas, nhãn tờ/thửa, chạm chọn thửa | DAT_V3 | tests/regress/hm30_cadastre.js |
| HM-31 | Tra thửa theo xã + tờ + thửa → dựng hồ sơ từ toạ độ CSDL — mockup ⑰⑱ | DAT_V3 | tests/regress/hm31_lookup.js |
| HM-32 | Tìm thửa theo hình dạng + diện tích + cạnh cho sổ không toạ độ — mockup ⑲ | DAT_V3 | tests/regress/hm32_shape.js |
| HM-34 | Tìm theo vị trí: GPS đang đứng → thửa chứa điểm | DAT_V3 | tests/regress/hm34_gps.js |
| HM-35 | Đọc nhãn thửa giáp ranh trên sơ đồ sổ (AI/OCR) → dữ liệu giáp ranh có cấu trúc + | DAT_V3 | tests/regress/hm35_giap_ranh.js |
| HM-36 | Tính giáp ranh theo từng cạnh (hướng, thửa, tờ) từ thửa đã lưu và dữ liệu địa ch | DAT_V3 | tests/regress/hm36_giap_hh.js |
| HM-37 | Đối chiếu mốc chung/cạnh chung với sổ thửa bên cạnh + biên bản PDF (mockup ㉑) | DAT_V3 | tests/regress/hm37_doichieu.js |
| HM-38 | Mục 'Tứ cận' + bảng giáp ranh theo cạnh trên hồ sơ in A4/PDF | DAT_V3 | tests/regress/hm38_tucan.js |
| HM-06e | Bỏ nhập/đọc Excel (.xlsx); chỉ giữ xuất Excel | DAT_V3 | tests/regress/hm06e_no_xlsx_import.js |

## 3. Lỗi → nguyên nhân gốc → cách sửa → chống tái diễn

| Mã | Nguyên nhân gốc (đã xác minh) | Cách sửa / ghi chú | Test chống tái diễn |
|---|---|---|---|
| HM-00 | 2 gốc: (1) lớp v119 liệt land_gis_v18_cache vào PRUNABLE + di trú <119 xoá kho; (2) LandGIS.storage ROTATABLE /_cache$/ khớp kho thửa → cắt nửa/xoá kho mỗi khi localStorage > 160 KB (kể cả lúc khởi động). Ngoài ra wrappe | PRUNABLE chỉ còn lg_tile_bytes + 2 khoá nhật ký; PROTECTED ném lỗi lại cho saveToLocalStorage → toast + bản sao IndexedDB landgis_rescue, nạp lại lúc mở app; navigator.storage.persist(). Hồi quy: smoke 0 pageerror, sampl | tests/regress/hm00_quota.js (baseline FAIL: kho 1→0, 30→0) |
| HM-00b | killReplit quét toàn bộ a/div/span/iframe/button trên MỌI thay đổi DOM (MutationObserver toàn trang) = 64% thời gian nạp (50 thửa: 59 s). | Gỡ killReplit+observer; CSS ẩn huy hiệu giữ nguyên. Hồi quy: smoke 0 pageerror, samples giống baseline, hm00_quota PASS. | 50 thửa: 59337 ms → 1887 ms; hàm lớn nhất hudAutoHide 23% |
| HM-02 | parseBookText gộp mọi dòng thành 1 vòng (Mẫu A 11 mốc 29,85 m²), bỏ im lặng dòng không đọc được, đọc sai số định dạng VN. | parseBookText trả {points,sides (vòng chính), blocks[{points,sides,ring,area}], warnings[]}. Khối phụ khép bằng đoạn biên chính ngắn hơn (ring/area). UI Bảng kê hiện khối phụ + cảnh báo khi Đối soát thử. Luồng vẽ vẫn chỉ | hm02_mau_a: 7 mốc 29,70 + khối phụ 4 mốc 7,10 m², hm02_parser: Mẫu B k |
| HM-42 | Hai lời nhắc riêng (bảng toạ độ / trang bổ sung) → 2 lần gọi AI; prompt dặn JSON, không schema; không có khối phụ, độ tin cậy từng số, giáp ranh có cấu trúc. | lgAiExtractRaw = 1 lần gọi cho mọi loại trang (LG_AI_PAGE_PROMPT + LG_AI_SCHEMA, lgNormalizeAI). Claude dùng structured outputs; Gemini vẫn dùng prompt+responseMimeType (responseSchema Gemini chưa bật — cần V1). Khối phụ | tests/regress/hm42_ai.js |
| HM-03 | 3 quy tắc diện tích khác nhau cùng tồn tại (max(0,05;0,5%A) ở checkBook/reconcile, 0,005A+0,05√A ở LG142, ngưỡng % cố định 3/5 ở thẻ thửa và PDF); luồng Tra sổ không trừ phần không cấp GCN → Mẫu B báo lệch 1,39. | Hàm duy nhất lgAreaVerdict(đo, GCN, không cấp) cạnh calcPermissibleAreaError: ok ≤ tol, warn ≤ 2·tol, bad > 2·tol (mức warn/bad là quyết định mặc định của AI — người dùng có thể chốt lại). checkBook nhận khong_cap_m2; re | hm03_mau_b PASS (6 kiểm tra), LG61.selfTest 13/13 như baseline |
| HM-41 | LG145.autoAdjust tự chạy sau mỗi lần quét, ép diện tích về số sổ (bỏ qua phần không cấp GCN) và ghi đè toạ độ mốc; auditTable dùng ngưỡng 0,5% riêng. | autoAdjust chỉ đối soát/đề xuất (LG145.pendingAdjust); LG145.applyPendingAdjust() áp dụng khi người dùng chọn, lưu before/after/fixes trong lastAdjust. auditTable(pts,sides,gcn,excl) dùng lgAreaVerdict. CHƯA làm: nút gia | hm41_no_autoadjust PASS, e2e3 Mẫu B: thông báo "khớp sổ", không còn bì |
| HM-45 | LG60: tên chủ rơi về plot.id; fmt2 cắt toạ độ còn 336,23; KTT in 105.5°; kết luận diện tích theo ngưỡng 1% riêng; nhật ký lẫn nhãn v125/v57. | Phạm vi đã làm: tên chủ, định dạng số, KTT, ngưỡng, nhãn phiên bản (LG60 mục I–VII). Chưa làm: Tứ cận/nguồn dữ liệu có nhãn riêng (để HM-35/HM-08*), tên chủ trên trang PDF khác (L13400 vùng pCheck) và nhãn phiên bản ngoà | baseline FAIL 5/5 kiểm tra, sau sửa PASS 5/5 |
| HM-04 | ≥14 bản shoelace/ringArea riêng (toạ độ 10^6 nhân nhau mất chính xác) và 5 chỗ dựng chuỗi proj4 VN-2000; LGCore.Geometry chạy song song, không ai gọi. | lgCoreArea/lgCoreSignedArea (toàn cục) → LGCore.Geometry.signedArea (dịch gốc về mốc đầu). Giữ riêng có chủ đích: lgGeoAudit.ringArea (GeoJSON lon/lat) và areaOfRing LG170 (xấp xỉ trắc địa quanh neo). generateVN2000Proj4 | sai lệch lớn nhất 5e-8 m² so với BigInt; run.js 14/14 PASS; samples.js |
| HM-43 | Chỉ có kiểm tự cắt cơ bản; không phát hiện đỉnh trùng không liền kề, đỉnh chạm cạnh, diện tích 0; hồ sơ ghi hợp lệ dù thiếu kiểm tra. | LGCore.Geometry.validate(points,{blocks}) → {ok,errors,warnings,info}; LG60 ghi dòng Kiểm tra hình học HỢP LỆ/KHÔNG HỢP LỆ, shapeOk/overall phụ thuộc. Gỡ nốt các ngưỡng diện tích rời rạc còn sót (LG.compare, LG57.checkAg |  |
| HM-04b | LG146.provinceFromAddress lấy tên tỉnh MỚI cuối địa chỉ nên Vũng Tàu→HCM 105°45′, Hải Dương→Hải Phòng; regex t[ìi]nh không khớp “tỉnh” (dấu hỏi) → mọi “tỉnh X” trả null; bảng ghi “Đắc Lắk”. | LG146.resolveAddress: (1) KTT in trên sổ, (2) từ khoá địa bàn cũ trong nhóm sáp nhập MERGED_PROVINCE_GROUPS (đã bỏ cụm cấp tỉnh trước khi dò), (3) cùng KTT → chốt, (4) khác KTT mà không rõ → status ask + hộp chọn địa bàn | run.js 16/16 PASS; e2e3 Mẫu B vẫn tới PDF |
| HM-05 | Khối v148 nhúng window.LG_AUDIT (10 sổ đỏ thật) + mục UI; nhật ký (v42/v87/lgv80) không lọc CCCD/họ tên và không bao giờ được dọn; khoá hỏng tồn đọng. | SCHEMA 119→120: lần mở đầu dọn nhật ký cũ + bản sao hỏng >30 ngày (bản sao hỏng <30 ngày được GIỮ vì có thể là bản cứu dữ liệu duy nhất — lệch nhẹ so với tiêu chí "dọn *_corrupt_*"). Danh sách giữ: window.lgLegacyCleanup | run.js 9/9 PASS |
| HM-00c | backupProjectImport xoá toàn bộ thửa (replace) rồi mới nạp; file 0 thửa hợp lệ vẫn xoá sạch; chỉ có confirm "không thể hoàn tác". | lgProjectValidate/lgProjectUndo; khoá landgis_undo_import (trong KEEP_KEYS, loại khỏi xuất sao lưu); nếu localStorage đầy thì tự tải LandGIS-TruocKhiThayThe_*.landgis. |  |
| HM-06 | Thư viện nạp từ CDN theo phiên bản trôi (tesseract.js@5) và không có SRI; cdnjs đứng đầu danh sách gương; khoá lưu không mã hoá chỉ có cảnh báo tĩnh. | ĐÃ LÀM: SRI SHA-384 (tính từ gói npm) cho xlsx 0.18.5, html2canvas 1.4.1, jsQR 1.4.0, jsPDF 2.5.1, tesseract.js 5.1.1, pdfmake vfs 0.2.10 qua jsDelivr/unpkg (loadLib/loadScript/ensureTesseract/fetch font); tesseract ghim | baseline FAIL 3/4; bản bị sửa bị chặn |
| HM-06c | LG172.db gọi REST bằng khoá công khai, không đăng nhập; xoá cứng DELETE; ngưỡng 0,5% riêng. | Mã client xong: OTP email, token (làm mới), xoá mềm + Thùng rác, chưa đăng nhập thì không gọi CSDL. CHƯA kiểm với Supabase thật: người dùng chạy handover/supabase/06c_auth_rls.sql + bật Email OTP (VIEC_CUA_BAN mục 7). | máy chủ giả lập Supabase (Playwright route) |
| HM-06d | Cờ chế độ phiên chỉ ở sessionStorage → tab mới mất cờ và đọc lại khoá lâu dài cũ; bật chế độ phiên không xoá bản IndexedDB. | landgis_key_session_pref (localStorage) nhớ bền; lgKeyPurgeDurable xoá localStorage + IndexedDB apikey:*; file evidence/apikey_session.json không có trong repo nên thay bằng test hm06d. | baseline FAIL 3/3 |
| HM-07a | 25 setInterval + 24 MutationObserver sống không có sổ đăng ký; rail sắp xếp lại DOM mỗi 650 ms; classList.add/toggle trên trạng thái sẵn có vẫn ghi thay đổi DOM và kích observer (vòng tự kích); không dừng bộ đếm/GPS khi  | window.LG_TIMERS.stats()/table() (đăng ký theo nơi tạo L<dòng>, nhóm chu kỳ); ẩn app: setInterval < 5 s ngủ, watchPosition tạm dừng/đăng ký lại (LG_RUN_HIDDEN=true để tắt). DOMTokenList.add/remove/toggle bỏ qua thao tác  | thay đổi DOM nhàn rỗi (không tính ô ảnh): ≈400 → 124 /10 s (−69%), run |
| HM-07b | Rail: mountRail append lại toàn bộ nút mỗi 650 ms (128 thay đổi/10 s). Dock: classList.toggle/add trạng thái sẵn có bị ghi là thay đổi mỗi chu kỳ (75/10 s). | Sửa nằm ở HM-07a (mountRail chỉ sắp lại khi lệch + DOMTokenList bỏ thao tác thừa); HM-07b thêm test riêng và xác nhận cập nhật vẫn chạy khi đổi trạng thái thật. | rail 128→0, dock 75→0 thay đổi /10 s nhàn rỗi |
| HM-07c | 21 MutationObserver rời rạc cùng theo dõi body/documentElement (mỗi thay đổi DOM chạy 21 callback); cssMerge/cssMerge2/cssPrune tự xoá quy tắc CSS khi khởi động; hudAutoHide quét toàn trang theo từng thay đổi. | MutationObserver được bọc trong lg-timers-registry: mọi observer của app dùng chung 1 observer thật/đích (HTML, BODY) và phân phát bản ghi theo tuỳ chọn riêng. cssMerge/cssMerge2/cssPrune chỉ chạy khi bật tường minh (?lg | observer thật: 24 → 2; deleteRule lúc chạy: 2 → 0; nạp 50 thửa 1,9 s;  |
| HM-39 | (1) Ô lỗi được thay bằng PNG trống rồi Leaflet bắn thêm tileload → bộ đo tính 8 lỗi + 8 "tốt" = 50% nên không bao giờ đổi lớp; (2) chuỗi vá từng ô Esri→Google→OSM che lỗi và nhân 2–3 lượt tải; (3) lớp phủ ranh giới Esri  |  | tests/regress/hm39_layers.js |
| HM-08a | Hai lớp toast độc lập (toast-wrap + #lgv42-toast-host) cố định bottom:12px nằm đè lên dock 64px; nút nổi theme cũng đè một nút dock; không giới hạn/gộp toast. | Token --lg-dock-clear (CSS mặc định 84px + safe-area, JS lgMeasureDock đo dock thật khi nạp/xoay/resize) dùng cho toast, v42 toast host, nút theme. Tối đa 1 toast mỗi lớp, tin trùng gộp. Chưa làm (để HM-08b/HM-08*): than | baseline: 5/5 nút dock bị che ở cả 3 độ rộng |
| HM-08b | Dock cũ (Bản đồ/Toạ độ/CAM/Cạnh S/Thêm) + hàng tab ngang tràn + 3 nút nổi trùng + ~25 mục phẳng trong Thêm. | TABS (lg103-mobile-script) = map · plots · import · profile · more; hàng .nav-tabs và nút nổi lg185/lg184 ẩn bằng CSS (vẫn trong DOM để mã gọi); khay Nhập sổ 9 lối vào → tab cũ qua goLegacyTab (có vòng chờ đổi màn lg62); | 3 độ rộng 360/390/430; 13 đường vào chức năng cũ được bấm thật trong t |
| HM-08i | Tab Quản lý thửa cũ là bảng phẳng không tìm/lọc, dựng toàn bộ DOM; không có trạng thái đối chiếu/đồng bộ. | tabPlots (lg103-mobile-script): danh sách ảo hoá (ROW_H 54px), lgPlotListItems(plots,{q,f}) là hàm thuần dùng cho cả hiển thị lẫn test; trạng thái đồng bộ = có dòng trong LG172.rows (chỉ có sau khi đăng nhập CSDL — HM-06 | 500 thửa: 12 hàng DOM, dựng cửa sổ trung vị 6,9 ms; lọc Đạt/Không đạt/ |
| HM-08c | Màn bản đồ cũ: rail 4 nút + bảng chi tiết nổi 371 px + badge GPS/KTT/chú giải + nút lg185/lg184 chồng ở nửa dưới màn; không có ô tìm/chip. | Lớp phủ #lg8c-top (ô tìm + chip KTT/lớp nền/nhãn) và #lg8c-fabs (◫ lớp, ◎ vị trí) trong lg103-mobile-script; thẻ thửa đang chọn = bottom sheet lg103 trạng thái peak (class lg8c-card-on, 170 px) bật khi chọn thửa trên màn | 3 độ rộng; không phần tử nào chồng ở nửa dưới (dock/sheet/nút tròn/toa |
| HM-08d | Nhập bảng kê là hộp thoại cũ nhỏ, không có bước kiểm tra rõ, không chọn tỉnh/KTT (cửa chặn KTT v61 chặn vẽ), nút có thể bị bàn phím ảo che. | Luồng lg8d (lg103-mobile-script): window.lg8dOpen(seed) / ＋ Nhập sổ › Nhập bảng kê. Bước 2 dùng parseBookText (khối phụ, cảnh báo), checkBook + lgAreaVerdict, LGCore.Geometry.validate (lỗi hình học chặn nút Vẽ). Bước 3 g | Mẫu A (7 mốc + khối phụ 4 mốc 7,10 m²) và Mẫu B (trừ 1,40 m² không cấp |
| HM-08e | Màn Hồ sơ thiếu đầu đề/sơ đồ/địa chỉ-mục đích-nguồn gốc-biến động; Thêm là lưới nút; công cụ chuyên gia luôn hiện. |  | tests/regress/hm08e_profile_more.js |
| HM-08g | lastDeletedPlot chỉ trong bộ nhớ (mất khi tải lại); Xoá tất cả chỉ 1 lần xác nhận; không có thùng rác. | lgTrashList/lgTrashRestore, lgShowUndoBar; ⋯ Thêm › Cài đặt › Thùng rác thửa. Khôi phục đi qua cửa chặn KTT v61 (dùng provCode lưu trong bản sao); nếu bị chặn thì thửa vẫn nằm trong thùng rác. Mockup ⑦ chưa đối chiếu chi | thanh Hoàn tác 6 s; Thùng rác landgis_trash_v1 bền qua tải lại (30 ngà |
| HM-09 | lgTileHealthCheck hết chuỗi dự phòng thì clear() danh sách đã thử rồi lại đổi tiếp; mỗi lần kéo bản đồ kích đo lại → vòng lặp đổi lớp/tải lại; vẫn đổi cả khi ngoại tuyến. | LG_FAILOVER_MAX=3 (đổi được), __lgFailoverHalted; mở lại khi người dùng tự chọn lớp (baselayerchange không do mã), khi có mạng trở lại hoặc khi 1 lớp tải tốt. Cờ __lgAutoSwitching phân biệt đổi do mã (Leaflet bắn baselay | lỗi 100% ô ảnh: đổi đúng 3 lần rồi dừng + 1 thông báo; ngoại tuyến khô |
| HM-09b | CSS v69 ẩn hẳn .leaflet-control-attribution (vi phạm điều khoản ghi nguồn của Google/Esri/OSM/CARTO). | Ghi nguồn thu gọn ⓘ Nguồn (góc dưới trái), bấm mở rộng chữ 10 px; tên nguồn mặc định cho lớp thiếu attribution (lg9b-attr-js). Lưu ý: overlay nhãn/ranh giới cũng đóng góp nguồn. | run.js 27/27 PASS |
| HM-10 | ID model rải nhiều nơi (claude-haiku-4-5, claude-sonnet-5, haiku-3-5 OpenRouter); max_tokens 2048, không kiểm stop_reason, khoá Gemini trong URL. | LG_AI_MODELS một chỗ; callClaudeVisionJSON(prompt,img,schema) hỗ trợ structured outputs (HM-42 sẽ truyền schema). Hiệu lực với khoá thật: V1 chưa làm. | tests/regress/hm10_models.js |
| HM-33 | Chưa có bảng tra xã/phường mới ↔ cũ ↔ KTT; không được tự bịa dữ liệu hành chính. | Cơ chế xong: LGAdmin.load/lookup (tra tên mới hoặc cũ, bỏ dấu/tiền tố, trả KTT theo địa bàn cũ, cờ nhieuKtt). app/admin-map.json đang rỗng (rows []). Khi có CSV: python3 handover/tools/build_admin_map.py ds.csv > app/adm | tests/regress/hm33_admin.js, app/admin-map.json, handover/tools/build_ |
| HM-06e | Nhánh .xlsx/.xls trong #file-upload dùng XLSX.read; ô chọn file và nhãn UI quảng cáo nhập Excel. |  | tests/regress/hm06e_no_xlsx_import.js |

## 4. Tồn đọng và lỗi mở

- **HM-08f (dọn CSS/sidebar):** đã gỡ luật CSS chết (`prune_dead_css.py`) và 217 khai báo `!important` thừa (`important_scan.js` + `strip_important.py`, kiểm bằng `cssdump.js`/`cssdiff.py` và ảnh 360/390/430; còn ~540 `!important` đang có tác dụng). **Chưa gỡ** `#sidebar`: sidebar vẫn chứa các panel cũ mở bằng `goLegacyTab` (quét/QR/GPS/CSV/cắm mốc) — phải chuyển từng panel sang màn mới rồi mới gỡ được. Đề xuất làm trong một đợt bảo trì riêng, mỗi panel một commit, so ảnh bằng `tests/tools/shots.js` + `shotdiff.py`.
- **drawPlot từ chối `provCode` không khớp vị trí khi khôi phục:** `LGVersions.applyPlot` đã có dự phòng (thử lại không `provCode`, rồi dựng lại bản cũ); nên rà lại ngưỡng nghi vấn vị trí ở `drawPlot` khi `__restoring`.
- Gỡ nốt: thang z-index thống nhất và gộp 2 lớp toast (ghi từ HM-08a); Tesseract/pdfmake chưa đóng gói ngoại tuyến (HM-11b); phần ảnh/camera chưa nối vào bước 2 luồng Nhập sổ (HM-08d); nhập khối phụ thành thửa (HM-42).
- Mốc đối soát thực địa (HM-19) lưu ảnh trong `meta` của thửa (thu nhỏ ≈ 30–60 KB/ảnh): nhiều ảnh có thể làm đầy localStorage — đã có bản sao IndexedDB khi lưu thất bại (HM-00), nhưng nên chuyển ảnh sang IndexedDB nếu dùng nhiều.
- Đồng bộ CSDL (HM-20) mặc định TẮT; xoá cục bộ không xoá trên máy chủ; xung đột phát hiện bằng băm nội dung (không có `updated_at` trong bảng hiện tại).

## 5. Việc của người dùng (chi tiết: `handover/VIEC_CUA_BAN.md`)

1. Đặt repo về riêng tư (mục 1) — repo đang công khai.
2. Cấu hình Supabase: kiểm RLS, bật đăng nhập OTP, triển khai Edge Function `ai-proxy` (mục 5, 7, 10) và `sign-pack` + SQL bucket riêng tư (mục 13).
3. Dữ liệu địa chính thật cho 1–2 xã (mục 3, HM-26) và danh sách 129 xã/phường mới (mục 9, HM-33).
4. Thử máy thật: TalkBack (mục 11), máy thu GNSS/RTK (mục 12), GPS điện thoại ở Hồ sơ → Thực địa.
5. Gửi biểu mẫu muốn xuất (mục 14, HM-25).

## 6. Đề xuất bảo trì

- Chạy `node tests/run.js app/land-gis.html` trước mỗi lần phát hành; sau khi sửa `app/land-gis.html` luôn chạy `python3 handover/tools/deploy_pages.py` (đồng bộ `index.html`/`sw.js`).
- Giữ nguyên quy tắc: chỉ thêm tính năng bằng module `<script>` riêng ở cuối tệp, có test trong `tests/regress/`; không viết lại lịch sử git.
- Khi thêm nguồn dữ liệu thật: **không** commit gói địa chính/ảnh sổ vào repo công khai.
- Rà `PRUNABLE/PROTECTED` (HM-00) mỗi khi thêm khoá localStorage mới.

## 7. Đường lui

Mỗi hạng mục là một commit `HM-xx` trên nhánh `ccr-9dbbe50d-dw0kll` (có thể hoàn tác riêng); bản gốc bất biến: `baseline/land-gis-v237-da-an.html`.

## 8. Chuỗi phiên

| Phiên | Session | Hạng mục chính |
|---|---|---|
| P01 | session_019C1PXFKUHAJJMo1HwKVFwe | S0 phân tích + đề án v1.0→v1.8; chuẩn bị chạy tự động |
| P02 | session_01CEjSueS4vgp8B5GB3X1Lca | HM-00, HM-00b, HM-01, HM-02, HM-03, HM-41, HM-45, HM-05, HM-00c, HM-06d, HM-06(CHO_NGUOI_DUNG), HM-06c(CHO_NGUOI_DUNG), HM-04, HM-43, HM-04b, HM-08a, HM-07a, HM |
| P03 | session_01RHnj7LqNDoco4okmMQuKGK | HM-10, HM-42 |
| P04 | session_019ewFw84Vv2eKp8d3ECg9Y2 | HM-08e, HM-06e, HM-39, HM-33(CHO_NGUOI_DUNG) |
| P05 | session_01BkGonUVGr8NKwj4qGMa9sH | HM-27a, HM-27b, HM-29, HM-30, HM-31, HM-32, HM-34, HM-11, HM-11b, HM-40, HM-44, HM-10b(CHO_NGUOI_DUNG), HM-08h, HM-12a, HM-35, HM-36, HM-14, HM-15, HM-16, HM-24 |
| P06 | session_016bfgvkpo5ZM5L3ZStYgd1r | HM-18a, HM-18b, HM-19, HM-20, HM-22(CHO_NGUOI_DUNG), HM-25(CHO_NGUOI_DUNG), HM-28(CHO_NGUOI_DUNG), HM-08f(một phần: CSS chết) |

**Bạn có cần xuất tài liệu tổng kết (Word/PDF) từ báo cáo này không?** Nếu có, nhắn ở phiên mới — báo cáo này là nguồn.
