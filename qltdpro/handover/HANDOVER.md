# BÀN GIAO — QLTDPRO — Phiên P10 — luỹ kế HM-01…HM-28b (xem bảng mục 2)
**P10 (25/10/2026)** — làm TẤT CẢ tồn đọng T1→T10 của P09 trên dữ liệu thật (báo cáo đầy đủ: **evidence/p10_result.md**). **Nhánh `ccr-266ec07a-kxmt78`: người dùng đã cho phép xoá nhưng phiên KHÔNG thêm được repo Land-gis (`add_repo` bị bộ phân loại quyền từ chối) ⇒ CHƯA XOÁ** — xem mục 0. Khoá API lộ ở P09: đã nhắc thu hồi, không dùng/ghi.
- Kết quả: audit_p09 **34→37/37**, audit_p09b 13/13; Dashboard 864→277 ms, Trả nợ 741→238 ms; nhập 11 kỳ: longtask lớn nhất 1.301→328 ms, tổng 23,3→4,0 s, nén luồng chính 8,4 s→0, lưu đầy đủ 12→1; DOM sau khi duyệt hết trang 56.206→38.297; Trung tâm nhập đọc tệp 6→2 lần/2 tệp.
- Mới: Web Worker blob (`td_xlsrows.js`) cho đọc Excel + nén (chạy được file://; worker bị chặn ⇒ luồng chính); bộ đọc IPCAS dense, nhánh cứu lãi suất theo mảng (11/11 kỳ thật giống hệt); danh sách cán bộ thành cấu hình người dùng (`td_roster.js`, Tiện ích → 👥) — **tệp phát hành không còn tên cán bộ trong ROSTER/BCKH/bí danh**; `node tools/real-run.mjs --data <dir>` chạy 12 kịch bản dữ liệu thật bằng 1 lệnh (12/12).
- 2 lỗi tiềm ẩn sửa: xuất Excel bảng đã phân trang chỉ ra trang đang xem; ô lãi suất lẻ bị định dạng ngày mất thập phân.
- Kiểm thử: `node tests/run.js` **23/23, e2e 121/121** (mốc 21/21, 97/97); đột biến 59 (17 mới) — evidence/p10_mutation_full.txt.
- App: app/QLTD_PRO_v2026-10-25_v22.3-P10.html (SHA-256 7909c1d4a3fa89a2faee1b556ee1339e5223675d6fc0c5b0ec55c2bdbbc08c16). Bản P08 đã gỡ khỏi app/.
- **Làm sạch trước khi push (quyết định người dùng):** gỡ `DATA.macb` (49 hồ sơ cán bộ), che tên khách hàng/cán bộ thật còn sót (quét bằng 7.301 họ tên + 41.646 mã từ dữ liệu thật, danh sách ngoài repo), dựng lại `pii-allow.json` (107 → 10 băm placeholder), làm mờ mạnh 2 ảnh; gộp lịch sử cục bộ thành 1 commit rồi push lên `No` (evidence/p10_result.md mục 3b).
- **Cần quyết định:** `index.html` + `hsv-react-phien16.zip` (có sẵn trên remote công khai từ trước, không thuộc P10) chứa họ tên người thật — gỡ khỏi lịch sử cần force-push.
---
# BÀN GIAO — QLTDPRO — Phiên P09 — luỹ kế HM-01…HM-28b (xem bảng mục 2)
**P09 (24/10/2026)** — người dùng gửi lại dữ liệu thật (11 kỳ dư nợ, 2 sao kê TSBĐ, GIÁ ĐẤT) và yêu cầu kiểm chứng Playwright toàn bộ để tìm điểm nghẽn/hạn chế/lỗi tồn đọng và tiềm ẩn. Báo cáo đầy đủ: **evidence/p09_result.md** (số đo trước/sau, 8 lỗi/điểm nghẽn đã sửa, 10 tồn đọng T1–T10). Nhánh `ccr-266ec07a-kxmt78` KHÔNG đụng. **Bốn chuỗi giống khoá API xuất hiện trong lời nhắn — KHÔNG dùng/ghi; người dùng cần thu hồi.**
- Sửa: Phí DV phân trang (5,8 s→0,55 s); nén có nhớ khi lưu (−3 s mỗi kỳ); đọc TSBĐ dense (6,7→2,3 s); TD_SXCB rank/norm nhớ (1.000→171 ms); TD.trend nhớ tóm tắt mốc; `body.modal-open` chưa từng hoạt động (đã sửa, dock ẩn khi mở hộp thoại) + gỡ vòng quét vô tác dụng; lỗi Promise chưa bắt khi IndexedDB bị chặn (Web Vitals, TSBĐ).
- Công cụ mới trong evidence/scripts: audit_p09.js (37 phép kiểm), audit_p09b.js (13 phép kiểm lỗi tiềm ẩn), prof_p09.js, import_stages_p09.js, hm18_measure.js, hm17b_all.js. Dựng môi trường dữ liệu thật: xem evidence/p09_result.md mục 1 và `tests/README.md`.
- Kiểm thử: `node tests/run.js` 21/21, e2e 97/97 (mốc đầu phiên 21/21, 91/91); 12 kịch bản dữ liệu thật đạt (hm15 còn 1 lỗi tiêu chí cũ T7); audit 34/37 (3 là giới hạn T1–T3), lỗi tiềm ẩn 13/13. Đột biến: 42/42 bị phát hiện (evidence/p09_mutation_full.txt).
- App: app/QLTD_PRO_v2026-10-23_v22.3-P08.html (SHA-256 db82e4b069c1d49ce4d30a556ed17cd94700c4feeda10a8b82fe3224bce44e7c).
- Việc tiếp theo: T1–T10 (evidence/p09_result.md mục 5); mục A (quyết định/tệp từ người dùng) như P08.
---
# BÀN GIAO — QLTDPRO — Phiên P08 — luỹ kế HM-01…HM-28b (xem bảng mục 2)
**P08 (23/10/2026)** — PROMPT để trống quyết định ⇒ chỉ làm việc kỹ thuật không cần quyết định (evidence/p08_result.md). Nhánh ccr-266ec07a-kxmt78 KHÔNG đụng (vẫn còn trên GitHub).
- **HM-17**: ghim cột đến Tên KH cho Chuyển HM và TSBĐ (tuỳ chọn, mặc định tắt); Giá đất không ghim.
- **HM-17b**: "Tất cả" >600 dòng dựng dần (400 dòng đầu ngay; đo: tuyến tính ≈2,5 ms/dòng). **HM-23**: Trung tâm nhập có ô "Nhập" (loại tệp) + "Xem trước". **HM-18**: ĐÃ ĐO — observer/interval không tốn đáng kể ⇒ không gỡ. **HM-21**: phân tích, không đổi mã (80/80 khối script xen kẽ HTML). **HM-27 SRI SheetJS**: vẫn bị chặn mạng (403).
- Kiểm thử: `node tests/run.js` 21/21, e2e 91/91 (mốc đầu phiên 21/21, 86/86). Đột biến đầy đủ: 33/33 bị phát hiện (evidence/p08_mutation_full.txt).
- App: app/QLTD_PRO_v2026-10-23_v22.3-P08.html (SHA-256 acf604f1c6fbe893fc2c725c5f7e67e4fa7fdb4cb8dcb7da56f154996fdbc92f).
- Còn lại: SRI SheetJS (cần mạng), HM-21 (cần quyết định viết lại cấu trúc), mục A (quyết định/tệp từ người dùng).
---
# BÀN GIAO — QLTDPRO — Phiên P07 — luỹ kế HM-01…HM-28b (xem bảng mục 2)
**P07 (23/10/2026)** — quyết định người dùng: không đụng nhánh ccr-266ec07a-kxmt78 (VẪN CÒN trên GitHub); giao diện P06 ổn + BẬT ghim cột Tên KH mặc định; làm rà escape TSBĐ/hồ sơ vay + HM-18 + HM-23 (evidence/p07_result.md). HM-11/HM-27/tệp bổ sung: để trống ⇒ không làm.
- **Lỗi bảo mật SỬA (có e2e + 2 đột biến)**: ngày TSBĐ và toàn bộ danh sách/so sánh/tìm kiếm hồ sơ vay chưa escape ⇒ dữ liệu/JSON nhập chứa thẻ HTML chạy được; đã sửa trong src/js/153, 071, 073.
- **HM-17**: ghim cột đến Tên KH bật mặc định (≥1280 px) khi chưa chọn gì. **HM-23**: nhận dạng TSBĐ theo tiêu đề cột. **HM-18**: thêm phép kiểm hộp thoại khi trang cuộn; chưa gỡ observer.
- App: app/QLTD_PRO_v2026-10-23_v22.3-P07.html (SHA-256 bb31a5e9bde37a333b737fd95b3a813c4bc94a19fad736978c32ba64d80e9d5f). Bản P05/P06: SHA 9ab44f16…3204.
---
# BÀN GIAO — QLTDPRO — Phiên P05 — luỹ kế HM-01…HM-28b, HM-16c, HM-20 (giai đoạn A), HM-22, HM-27, P05-CSS
**P05 (23/10/2026) — nhánh `ccr-c8312b7d-xdaqyo` của repo land-gis, thư mục `qltdpro/`** (nhập nguyên văn từ nhánh P04 `ccr-45c0b8ef-riyvtt`; không chứa dữ liệu thật). PROMPT để trống quyết định ⇒ hỏi trong phiên (evidence/p05_result.md):
- **Lỗi CSS nền — SỬA**: đóng 5 chú thích CSS không đóng (MOBILE RESPONSIVE, PAGE HSVV, GD2, PRO-TIP, THÔNG BÁO NỢ, PAGE-FHS) + gỡ 1 khối khai báo mất bộ chọn. Menu bên **CỐ ĐỊNH ở ≥1440 px**; dưới 1440 px (laptop 1366, điện thoại) vẫn là ngăn kéo ☰ (người dùng chọn sau khi hồi quy dữ liệu thật thấy bảng "Gọn" tràn ở 1366). Topbar gọn HM-15 giữ nguyên. Bảng Giá đất cho tên đường xuống dòng.
- **HM-09 — gỡ mã mồ côi bckh\*** (không khôi phục trang KHKD): 73 khai báo JS (~2.300 dòng) + 69 quy tắc CSS; giữ 8 khai báo còn dùng (bckhAggregateData…). App 5,88 → 5,76 MB.
- **HM-21 — KHÔNG làm tiếp** (theo quyết định).
- **Sự cố nhánh `ccr-266ec07a-kxmt78`: VẪN CÒN trên GitHub** (kiểm 23/10/2026) — người dùng không chọn cách xử lý ⇒ không đụng.
- **Sau rà soát đề án (cùng ngày; handover/BAO_CAO_RA_SOAT_DE_AN_P05.docx):** sửa bảng Dư nợ tràn ở 1920 (mẫu cột tự lùi), nút ↶/↷ vào topbar, breadcrumb, Xuất CSV/Thêm mới xuống thanh công cụ trang, escape dữ liệu nhập (e2e bảo mật); đo zoom 125% + Tab/Enter. Còn lại cần duyệt giao diện: dải biểu tượng 64 px, lưới 12 cột + thẻ KPI, KPI 2×2 điện thoại, ngăn chi tiết 380 px (báo cáo .docx, Mục 6).
- **P06 (sau khi người dùng phê duyệt toàn bộ — evidence/p05_result.md mục 5):** dải biểu tượng 64 px (1280–1439 px) + nhóm menu thu/mở; thẻ KPI đầu Bảng điều khiển + lưới 2 cột ≥1600 px; topbar 1 hàng + KPI 2×2 trên điện thoại; ngăn chi tiết 380 px; hoàn tác lần nhập (dư nợ); escape tên mốc lưu trữ; bẫy Tab cho hộp thoại. KHÔNG xoá nhánh dữ liệu thật (chưa được phép rõ ràng).
- Kiểm thử: `tests/run.js --mutation` 22/22 nhóm, e2e 82/82, 26 đột biến; dữ liệu thật: hm17c 24/24, hm09b 0 vấn đề, real10 TSBĐ, real12 đối soát 10/10, hm28b 15/15, td_pl02 6/6.

Chế độ: TỰ ĐỘNG thực thi liên tục theo quyết định của người dùng. P04 làm trên nhánh `ccr-45c0b8ef-riyvtt` của repo `land-gis`, thư mục `qltdpro/` (nhập từ ZIP P03 — nhánh này KHÔNG chứa commit dữ liệu thật). Nhánh P03 `ccr-266ec07a-kxmt78` vẫn còn sự cố ở mục 0.

**P04 (22/10/2026):** PROMPT gửi lên còn để trống các quyết định ⇒ chỉ làm mục 4B không cần quyết định (evidence/p04_result.md): 4 đột biến mới HM-02…05 + phép kiểm e2e HM-03 mạnh hơn (đột biến HM-03 trước đó lọt); CI GitHub Actions; SRI cho PizZip; xoá khối `--apc-*` chết. Bản phát hành P04a. KHÔNG force-push, KHÔNG HM-21, KHÔNG đổi giao diện.

**P04b (22/10/2026):** người dùng gửi lại dữ liệu thật (để ở /tmp/claude-0/real/data, ngoài repo) ⇒ hồi quy trên dữ liệu thật đạt (HM-09b, HM-17b, HM-28b, TSBĐ, PL02); HM-17b xong: chọn cột cho Chuyển HM/TSBĐ/Giá đất (mặc định Đầy đủ — không tự ẩn); fixture ẩn danh .XLS và sao kê TSBĐ theo định dạng thật (evidence/p04b_result.md).

**P04d (22/10/2026) — làm theo quyết định của người dùng** (evidence/p04d_result.md): HM-16 xong (thanh mục Giá đất, tab nền tối); HM-25 giữ ngưỡng; HM-28 Excel CÓ định dạng (TD.xlsx, không thêm thư viện); HM-13b một showPage + sổ hook, gỡ bộ phím cũ; HM-21 phạm vi nhỏ: gộp CSS trùng (0 khác biệt giá trị CSS tính ra). KHÔNG làm được: xoá nhánh git (phiên không có quyền — người dùng tự xoá), HM-09 (trang Bảng II–V không tồn tại), HM-11 (tệp NQ38 không có Phụ lục I).

**P04c (22/10/2026):** CI GitHub xanh (2 lần chạy); hồi quy dữ liệu thật trên P04b cho HM-07/12/23/24/25/26 đều đạt; đo chế độ "Tất cả" — nguyên nhân là style/layout lần đầu, không sửa (evidence/p04c_result.md). Không đổi app.
## 0. VIỆC KHẨN — sự cố dữ liệu thật trong lịch sử git (xem backlog.json → quyet_dinh_cho_chot[0])
Ở P03 tôi (Claude) đã VÔ TÌNH commit thư mục làm việc `scratchpad/` vào repo Land-gis (commit 649fdb2, đẩy lên remote, nhánh `ccr-266ec07a-kxmt78`): 11 tệp dư nợ IPCAS, 2 sao kê TSBĐ, PL01/PL02/NQ38 — DỮ LIỆU KHÁCH HÀNG THẬT. Đã gỡ khỏi cây (8835ea2) nhưng còn trong lịch sử.
**P10 (25/10/2026):** người dùng CHO PHÉP Claude xoá đúng nhánh này (`git push origin --delete`, không force-push). Kết quả: **CHƯA XOÁ ĐƯỢC** — repo Land-gis không có trong phiên và lệnh thêm repo (`add_repo`, quyền push) bị bộ phân loại quyền của phiên từ chối; Claude không vòng tránh. Nhánh vẫn còn (chưa xác minh lại được vì không truy cập repo).
Việc cần làm: (a) tự xoá: GitHub → Land-gis → Branches → thùng rác cạnh `ccr-266ec07a-kxmt78` (KHÔNG xoá `ccr-45c0b8ef-riyvtt`, `ccr-c8312b7d-xdaqyo`); hoặc (b) cho phép công cụ `mcp__claude-code-remote__add_repo` trong cài đặt quyền rồi mở phiên mới để Claude làm. Sau khi xoá: liên hệ GitHub Support nhờ dọn commit mồ côi 649fdb2 + bộ nhớ đệm (Claude không tự làm được).
Quy tắc: không bao giờ `git add -A` ở thư mục chứa scratchpad; kiểm `git status` + `node tools/scan-pii.mjs` trước mỗi commit; dữ liệu thật chỉ để ngoài repo (`tools/real-run.mjs` từ chối thư mục dữ liệu nằm trong repo).
Ngoài ra: 5 số CCCD dạng thật làm placeholder đã được thay (bản HM27a) — bản HM27 cũ không nên lưu hành; 16 tên KH trong evidence/scripts/apply_hm05.py đã che.
## 1. Dự án và môi trường
HTML5 MỘT TỆP mở bằng file://, nay được DỰNG TỪ `src/` (xem src/README.md). Sửa trong src/, dựng `node tools/build.mjs` (cổng: biên dịch thử, check-vendor, scan-pii), phát hành `node tools/build.mjs --release`, kiểm `node tests/run.js` (tầng 0–4; `--mutation` thêm tầng 5; `--no-e2e` chạy nhanh). Không còn dùng chuỗi apply_hm*.py (lịch sử) — không cần bản gốc v22.3.
App hiện hành: app/QLTD_PRO_v2026-10-25_v22.3-P10.html — SHA-256 7909c1d4a3fa89a2faee1b556ee1339e5223675d6fc0c5b0ec55c2bdbbc08c16 (= build từ src/; 5,82 MB). (Trước: P08 db82e4b0…, P05 9ab44f16…) Bản trước: P04d (ceb71b8b…4dc4), P04b (ac0631a2…f088), P04a (9fab2cc0…1432), HM27a (95bbb132…e971). Bản gốc v22.3 (13,98 MB, SHA e51038ee…7fbb37) do người dùng giữ, KHÔNG đóng gói.
Dữ liệu lưu: IndexedDB QLTDProDB v3 (+TWIN_Archive_v1, QLTDProTSBD), localStorage (td_net_v1, td_ai_key_v1 — cấu hình/khoá AI chỉ ở trình duyệt, không nằm trong sao lưu).
Kiểm thử không cần dữ liệu thật: tests/fixtures (320 dòng IPCAS giả). **P10: dữ liệu thật chạy bằng MỘT lệnh `node tools/real-run.mjs --data <thư mục>` (12 kịch bản, xem tests/README.md).** Trước P10: kiểm thử dữ liệu thật (evidence/scripts/hm*_real.js, hm17b_test.js, hm28b_real.js + hm28b_check.py, td_pl02.test.js) cần người dùng gửi lại: 11 kỳ dư nợ, sao kê TSBĐ 30/09 + 20/10, GIÁ ĐẤT 2026 (PL01/PL02/NQ38) — để ở /tmp/claude-0/real/data, NGOÀI repo.
Kết quả lần chạy cuối (P04d): tests/run.js --mutation --real = 23/23 nhóm; e2e 61/61; 16 đột biến đều bị phát hiện (evidence/p04d_run_full.txt). Hồi quy dữ liệu thật trên P04d: hm17c 24/24, hm23 15/15, hm24 22/22, hm25 17/17, hm26 18/18, hm15 18/18, đối soát 10/10, TSBĐ, HM-09b — đạt.
## 2. Trạng thái hạng mục (khớp backlog.json)
| HM | Tên | Ưu tiên | Trạng thái | Bậc |
|---|---|---|---|---|
| HM-01 | Sửa thư viện SheetJS nhúng bị hỏng | P0 | DA_BAN_GIAO | V3 |
| HM-02 | Bộ đọc .xlsx không biến số thành ngày | P0 | DA_BAN_GIAO | V3 |
| HM-03 | Chặn ghi đè lãi suất khi khởi động | P0 | DA_BAN_GIAO | V3 |
| HM-04 | Lưu trữ toàn vẹn và sao lưu đầy đủ | P0 | DA_BAN_GIAO | V3 |
| HM-05 | Gỡ dữ liệu cứng và dữ liệu cá nhân nhúng trong tệp | P0 | DA_BAN_GIAO | V3 |
| HM-06 | Một module số/ngày dùng chung (TD.num, TD.date) | P1 | DA_BAN_GIAO | V3 |
| HM-07 | "Ngày dữ liệu" là nguồn sự thật | P1 | DAT_V3 | V3 |
| HM-08 | Engine KPI duy nhất (TD.metrics) – phần 1: lõi + Dashboard | P1 | DAT_V3 | V3 |
| HM-09 | TD.metrics – phần 2: Báo cáo, snapshot, so sánh kỳ | P1 | DAT_V3 | V3 (trang KHKD không khôi phục — P05 gỡ mã mồ côi) |
| HM-09b | TD.metrics phan con lai: TDCMP, TDUP5, TD_AUDIT, dong Chua phan CBTD trong BCKH | P1 | DAT_V3 | V3 |
| HM-10 | Đối soát Tài sản bảo đảm | P1 | DAT_V3 | V3 |
| HM-11 | Giá đất: khoá tra cứu, lỗi dữ liệu, nối hồ sơ vay | P1 | DAT_MOT_PHAN | V3 |
| HM-11b | Nhap PL02 .docx moi ngay trong app + bo sung gia NQ38 theo ten duong | P2 | DAT_V3 | V3 |
| HM-12 | Trang Đối soát số liệu | P1 | DAT_V3 | V3 |
| HM-13 | Một router duy nhất thay 10 lớp bọc showPage | P1 | DAT_V3 | V3 |
| HM-13b | Gop 12 lop boc showPage thanh mot duong + hook onPageEnter | P2 | DAT_V3 | V3 |
| HM-14 | Cây menu mới, đưa HSVV/FHS/mẫu biểu vào menu | P1 | DAT_V3 | V3 |
| HM-15 | Topbar gọn, 1 bảng lệnh (Ctrl K), 1 bộ phím tắt | P2 | DAT_V3 | V3 |
| HM-16 | Một bộ design token, font offline, chế độ tối chuẩn | P2 | DAT_V3 | V3 |
| HM-16b | Thang z-index <=8 bac, gop :root/toast/tab, hoan thien giao dien toi | P2 | DAT_V3 | V3 |
| HM-17 | Một hệ bảng dữ liệu cho màn hình rộng | P2 | DAT_MOT_PHAN | V3 |
| HM-17b | Go 3 co che phan trang chong nhau + ap chon cot cho cac bang khac | P2 | DAT_V3 | V3 |
| HM-18 | Hiệu năng: gỡ observer, interval, content-visibility gây lỗi | P2 | DAT_MOT_PHAN | V3 |
| HM-19 | Giao diện điện thoại | P3 | DAT_V3 | V3 |
| HM-20 | Tách nguồn src/ và công cụ build ra 1 tệp HTML | P2 | DAT_MOT_PHAN | V3 |
| HM-21 | Chuyển dần mã sang module và gỡ lớp vá | P2 | DAT_MOT_PHAN (dừng theo quyết định P05) |  |
| HM-22 | Bộ kiểm thử hồi quy Node + Playwright | P2 | DAT_V3 | V3 |
| HM-23 | Trung tâm nhập dữ liệu (wizard nhiều tệp) | P2 | DAT_V3 | V3 |
| HM-24 | Xu hướng nhiều kỳ | P3 | DAT_V3 | V3 |
| HM-25 | Cảnh báo sớm | P2 | DAT_V3 | V3 |
| HM-26 | Hồ sơ khách hàng 360° | P3 | DAT_V3 | V3 |
| HM-27 | Chế độ có mạng (tuỳ chọn) | P3 | DAT_V3 | V3 |
| HM-28 | Mẫu báo cáo chuẩn xuất Word/Excel | P3 | DAT_V3 | V3 |
| HM-28b | Bao cao Word (.docx) + ky tuy chon + dinh dang | P3 | DAT_V3 | V3 |
| HM-16c | Giao dien thong nhat: token, toast, tab, go che do toi | P2 | DAT_V3 | V3 |
| P05-CSS | Lỗi CSS nền: chú thích không đóng; menu bên cố định ≥1440 px | P2 | DAT_V3 | V3 |
## 3. Kết quả đã đóng
- **HM-01 — Sửa thư viện SheetJS nhúng — ĐẠT-V3 (21/10/2026)** (evidence/hm01_result.md)
- **HM-02 — Bộ đọc .xlsx không biến số thành ngày — ĐẠT-V3 (21/10/2026)** (evidence/hm02_result.md)
- **HM-03 — Chặn ghi đè lãi suất khi khởi động — ĐẠT-V3 (21/10/2026)** (evidence/hm03_result.md)
- **HM-04 — Lưu trữ toàn vẹn và sao lưu đầy đủ — ĐẠT-V3 (21/10/2026)** (evidence/hm04_result.md)
- **HM-05 — Gỡ dữ liệu cứng và dữ liệu cá nhân khỏi tệp phát hành — ĐẠT-V3 (21/10/2026)** (evidence/hm05_result.md)
- **HM-06 — Module số/ngày dùng chung (TD.num, TD.date) — ĐẠT-V3 (21/10/2026)** (evidence/hm06_result.md)
- **HM-07 — "Ngày dữ liệu" là nguồn sự thật — ĐẠT-V3 (21/10/2026)** (evidence/hm07_result.md)
- **HM-08 — Engine KPI duy nhất TD.metrics (lõi + Dashboard) — ĐẠT-V3 (21/10/2026)** (evidence/hm08_result.md)
- **HM-09 — TD.metrics phần 2: snapshot & báo cáo — ĐẠT MỘT PHẦN, V3 tổng hợp (21/10/2026)** (evidence/hm09_result.md)
- **HM-09b — TDCMP / TD_AUDIT / TDUP5 dùng chung nguồn số liệu — ĐẠT-V3 (22/10/2026)** (evidence/hm09b_result.md)
- **HM-10 — Đối soát Tài sản bảo đảm — ĐẠT-V3 trên dữ liệu thật (21/10/2026)** (evidence/hm10_result.md)
- **HM-11 — Giá đất: khoá tra cứu, lỗi dữ liệu, nối hồ sơ vay — ĐẠT-V3 (một phần: chưa nhập PL02 .docx mới) (21/10/2026)** (evidence/hm11_result.md)
- **HM-11b — Nhập PL02 .docx mới ngay trong app — ĐẠT-V3 (22/10/2026)** (evidence/hm11b_result.md)
- **HM-12 — Trang Đối soát số liệu — ĐẠT-V3 trên dữ liệu thật (21/10/2026)** (evidence/hm12_result.md)
- **HM-13 (phần 1) — Router hash + lịch sử — ĐẠT-V3 một phần (21/10/2026)** (evidence/hm13_result.md)
- **HM-14 — Cây menu mới, đưa Hồ sơ vay vào menu — ĐẠT-V3 (21/10/2026)** (evidence/hm14_result.md)
- **HM-15 — Topbar gọn, một bảng lệnh (Ctrl K), một bộ phím tắt — ĐẠT-V3 (21/10/2026)** (evidence/hm15_result.md)
- **HM-16 (phần 1, an toàn) — Tương phản màu + giao diện mặc định sáng — ĐẠT-V3 một phần (22/10/2026)** (evidence/hm16_result.md)
- **HM-16b (phần z-index) — Thang z-index 8 bậc — ĐẠT-V3 một phần (22/10/2026)** (evidence/hm16b_result.md)
- **HM-16c — Giao diện thống nhất: token, toast, tab, gỡ chế độ tối — ĐẠT-V3 (22/10/2026)** (evidence/hm16c_result.md)
- **HM-17 (phần 1) — Chọn cột bảng dữ liệu cho màn hình rộng — ĐẠT-V3 một phần (22/10/2026)** (evidence/hm17_result.md)
- **HM-17b — Một cơ chế phân trang cho bảng dữ liệu — ĐẠT-V3 một phần (22/10/2026)** (evidence/hm17b_result.md)
- **HM-18 — Hiệu năng chuyển trang / nền — ĐẠT-V3 một phần (21/10/2026)** (evidence/hm18_result.md)
- **HM-19 — Giao diện điện thoại (≤600 px) — ĐẠT-V3 (22/10/2026)** (evidence/hm19_result.md)
- **HM-20 (bước sau giai đoạn A) — Gỡ 5 số CCCD dạng thật còn sót trong placeholder — ĐÃ XỬ LÝ (22/10/2026)** (evidence/hm20_pii_result.md)
- **HM-20 — Tách nguồn src/ + công cụ build — giai đoạn A ĐẠT-V3 (22/10/2026)** (evidence/hm20_result.md)
- **HM-22 — Bộ kiểm thử hồi quy một lệnh — ĐẠT-V3 một phần (22/10/2026)** (evidence/hm22_result.md)
- **HM-23 — Trung tâm nhập dữ liệu (nhiều tệp) — ĐẠT-V3 trên dữ liệu thật (22/10/2026)** (evidence/hm23_result.md)
- **HM-24 — Xu hướng nhiều kỳ — ĐẠT-V3 trên 11 kỳ dữ liệu thật (22/10/2026)** (evidence/hm24_result.md)
- **HM-25 — Cảnh báo sớm — ĐẠT-V3 trên dữ liệu thật (22/10/2026)** (evidence/hm25_result.md)
- **HM-26 — Khách hàng 360° — ĐẠT-V3 trên dữ liệu thật (22/10/2026)** (evidence/hm26_result.md)
- **HM-27 — Chế độ có mạng (tuỳ chọn) — ĐẠT-V3 (22/10/2026)** (evidence/hm27_result.md)
- **HM-28 — Mẫu báo cáo chuẩn xuất Excel — ĐẠT-V3 một phần (22/10/2026)** (evidence/hm28_result.md)
- **HM-28b — Báo cáo Word + chọn kỳ + định dạng — ĐẠT-V3 (22/10/2026)** (evidence/hm28b_result.md)
- **P04 — đột biến HM-02…05, e2e HM-03, CI, SRI PizZip, gỡ --apc-* — ĐẠT (22/10/2026)** (evidence/p04_result.md)
- **P05 — Lỗi CSS nền (menu bên cố định ≥1440 px), gỡ mã mồ côi bckh\* — ĐẠT-V3 (23/10/2026)** (evidence/p05_result.md)
- **P04d — HM-16, HM-25, HM-28 (Excel có định dạng), HM-13b, HM-21 phạm vi nhỏ (gộp CSS) — ĐẠT-V3 (22/10/2026)** (evidence/p04d_result.md)
- **P04b — HM-17b chọn cột Chuyển HM/TSBĐ/Giá đất, fixture .XLS + TSBĐ ẩn danh, hồi quy dữ liệu thật — ĐẠT-V3 (22/10/2026)** (evidence/p04b_result.md)
## 4. HẠNG MỤC CÒN LẠI
### A. Cần NGƯỜI DÙNG quyết định / cung cấp (sau P05)
0. **P10 — cần quyết định:** (a) gỡ `index.html` + `hsv-react-phien16.zip` (có tên người thật) khỏi lịch sử repo công khai `No` (force-push)? (b) giữ cách xếp cán bộ cũ? (dán `danh_sach_can_bo_cu.txt` vào Tiện ích → Danh sách cán bộ). `DATA.macb` đã gỡ; mã đã push lên `No` sau khi làm sạch.
1. **Nhánh ccr-266ec07a-kxmt78 (chứa dữ liệu khách hàng thật, commit 649fdb2) VẪN CÒN trên GitHub** (P10 được phép xoá nhưng không thêm được repo — mục 0): anh/chị tự xoá (GitHub → Branches → thùng rác) rồi nhờ GitHub Support dọn commit mồ côi/cache — HOẶC ghi rõ trong PROMPT "cho phép Claude xoá nhánh" để phiên sau thử `git push origin --delete` (không đảo ngược). Thu hồi khoá API đã lộ trong ảnh chat.
2. **Xem giao diện P05**: menu bên cố định ở màn ≥1440 px; HSVV có khung nền/lề; FHS nhãn–ô nhập nằm ngang trên máy tính — ổn hay chỉnh?
3. **HM-11**: gửi Phụ lục I của NQ38 (bảng giá đất ở tại đô thị).
4. **HM-27**: thử khoá AI thật; cần nhà cung cấp AI khác không.
5. **Tệp**: mẫu .docx chuẩn của cơ quan (HM-28b), Past Due thật (TDUP5).
### B. Kỹ thuật còn lại (làm tự động được, không cần quyết định lớn)
- **HM-17b/HM-17**: "Tất cả" 3.848 dòng dựng 2,5–6 s (đã đo ở P04c: do style/layout lần đầu; chỉ còn cách dựng dần theo đợt — rủi ro); ghim cột cho Chuyển HM/TSBĐ/Giá đất (chưa có). (Chọn cột 3 bảng này xong ở P04b.)
- **HM-18**: gỡ 8 MutationObserver/interval; Dashboard còn ~500–600 ms layout (DOM lớn).
- **HM-27**: băm SRI cho SheetJS 0.20.3 (cần mạng tới cdn.sheetjs.com — bị chặn ở P04); docxtemplater (bản dựng riêng) và mammoth (không khớp bản npm) không có bản CDN tương ứng; dịch vụ cập nhật thật. (PizZip đã có SRI ở P04.)
## 5. Việc dở dang: xem backlog.json (ghi_chu_ban_giao của từng HM).
## 6. Quyết định đã chốt: xem backlog.json → quyet_dinh_da_chot; quyết định chờ chốt: quyet_dinh_cho_chot.
## 7. Lỗi nền / ngoài phạm vi: xem backlog.json → loi_nen_ngoai_pham_vi (PDF NQ38 là ảnh scan; LS=19% của dữ liệu cũ phải nhập lại; TWIN_Archive_v1 chưa có checksum).
## 8. Việc người dùng cần làm
1. Trả lời mục 4A (nhất là mục 1: sự cố dữ liệu); thu hồi khoá API đã lộ trong ảnh chat.
2. Mở app P05, kiểm tay trên dữ liệu thật: nhập kỳ mới nhất → chip "Dữ liệu dd/mm/yyyy"; Dashboard, Đối soát, báo cáo Word/Excel; thử Chế độ có mạng (Tiện ích → 🌐).
3. Gửi lại dữ liệu thật + mẫu .docx + Past Due khi phiên sau cần.
## 9. Đường lui: git của nhánh (mỗi HM một commit rõ); hoặc ZIP P02 (app HM28) / bản gốc v22.3 do người dùng giữ.
## 10. File đã chạm: app/ (dựng từ src/), src/, tools/, tests/, evidence/, handover/. KHÔNG chứa dữ liệu thật trong ZIP này.
