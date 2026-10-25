# P10 — Làm tồn đọng T1→T10 của P09 trên DỮ LIỆU THẬT (25/10/2026)
Dữ liệu (ngoài repo, `/tmp/claude-0/real/data`): 11 kỳ dư nợ 31/12/2025–20/10/2026, 2 sao kê TSBĐ, PL01/PL02/NQ38. Báo cáo chỉ có số tổng hợp, không có tên/mã khách hàng/cán bộ.
App: `app/QLTD_PRO_v2026-10-25_v22.3-P10.html` (thay bản P08). Mốc đầu phiên: MANIFEST 535/535 OK; `node tests/run.js` 21/21, e2e 97/97; audit_p09 34/37; audit_p09b 13/13.

## 0. Việc đầu phiên theo quyết định người dùng
- **Xoá nhánh `ccr-266ec07a-kxmt78` (repo Land-gis): CHƯA LÀM ĐƯỢC.** Repo Land-gis không nằm trong phiên; lệnh thêm repo (`add_repo`, quyền push) bị **bộ phân loại quyền của phiên từ chối** ⇒ không xác minh/xoá được, không vòng tránh. Nhánh vẫn còn. Cách làm: (a) anh/chị tự xoá trên GitHub (Land-gis → Branches → thùng rác cạnh `ccr-266ec07a-kxmt78`), hoặc (b) cho phép công cụ `add_repo` trong cài đặt quyền rồi mở phiên mới để Claude xoá bằng `git push origin --delete ccr-266ec07a-kxmt78`. Sau khi xoá: nhờ GitHub Support dọn commit mồ côi `649fdb2` + bộ nhớ đệm (Claude không làm được).
- Khoá API lộ trong lời nhắn P09: đã nhắc thu hồi; KHÔNG dùng/ghi ở đâu.
- Repo của phiên (`twin30101981-collab/No`) là **công khai** ⇒ trước khi push đã làm sạch dữ liệu cá nhân và gộp lịch sử (mục 3b).

## 1. Số đo trước → sau (cùng máy, dữ liệu thật)
| Mục | Trước (P08/P09) | Sau (P10) |
|---|---|---|
| audit_p09 (37 phép kiểm) | 34/37 | **37/37** |
| audit_p09b (lỗi tiềm ẩn) | 13/13 | 13/13 |
| Mở Dashboard (trung vị 3 lần) | 864 ms, 26.929 nút DOM | **277 ms, 2.055 nút** |
| Mở Trả nợ | 741 ms (audit: 1.780 ms), 22.152 nút | **238 ms, 4.496 nút** |
| Nhập 12 tệp (audit HUB-4): longtask lớn nhất / tổng | 2.034 ms / 33,5 s | **532 ms / 5,5 s** |
| Nhập 11 kỳ (p10_savecount): longtask lớn nhất / tổng | 1.301 ms / 23,3 s | **328 ms / 4,0 s** |
| Nén trên luồng chính khi nhập 11 kỳ | 8,4 s (34 lần) | **0** (trong worker) |
| Lưu đầy đủ khi nhập 11 kỳ / ghi localStorage bản dư nợ | 12 / 12 | **1 / 1** |
| Nhập 1 kỳ 20.10.2026.XLS: đọc tệp / lưu mốc | 1.315 / 1.449 ms (longtask 1.218 + 1.219) | **800 / 427 ms** (longtask ≤ 303) |
| Thêm sao kê TSBĐ 27 MB vào Trung tâm nhập | longtask 1.129 ms | **0** |
| Số lần đọc nội dung tệp (Trung tâm nhập, 2 tệp) | 6 | **2** |
| DOM sau khi duyệt hết 26 trang | 56.206 (P09 trước sửa: ~150.000) | **38.297** (mở app: ~34.000) |
| Lưu mỗi kỳ (audit HUB-3) | 5,4–6,5 s | 4,7–5,0 s |
| Đọc IPCAS (Node, 11 kỳ) | 1,2–2,3 s/kỳ | 0,9–1,4 s/kỳ (dense) |
Chi tiết: `p10_bench.txt`, `p10_savecount.txt`, `p10_audit_truoc/sau.txt`, `p10_auditb_truoc/sau.txt`.

## 2. Từng mục T (đều có e2e + đột biến; 17 đột biến mới)
| # | Làm gì | Kiểm chứng |
|---|---|---|
| T1 | Dashboard Bảng IV (CBTD), VI (đến hạn), VIII (lãi phải thu — trước dựng hết ~1.250 dòng) phân trang chung `__TDPagedTbody` (dùng `__TDPgBarHtml`); đổi trang chỉ dựng lại đúng bảng | e2e P10-T1, 1 đột biến |
| T2 | Trả nợ: 2 bảng Giảm/Hết dư nợ phân trang; dòng TỔNG tính trên cả tập; Xuất Excel dùng bản sao đủ dòng (`__TDPagedFullClone`) | e2e P10-T2, 2 đột biến |
| (mới) | **Lỗi tiềm ẩn sửa:** `exportTableExcel` (Đến hạn/Lãi đọng/Phí DV) đọc DOM ⇒ từ khi phân trang (HM-17b/P09) chỉ xuất **trang đang xem** (100/1.500 dòng). Nay dựng tạm đủ dòng rồi trả lại trang | e2e P10-EXP, 1 đột biến |
| T3 | MỘT Web Worker tạo từ blob (mã SheetJS nhúng + LZS) — chạy được khi mở bằng file:// (CSP chỉ chặn connect/img). Đọc IPCAS, sao kê TSBĐ, nhận dạng tiêu đề, xem trước, và **nén trước** cho saveData đều trong worker; worker bị chặn ⇒ tự chạy luồng chính (cùng hàm thuần) | module `td_xlsrows.js` 21 unit test; e2e P10-T3 (kết quả worker = luồng chính, Worker bị chặn vẫn nhập đủ); 3 đột biến |
| T4 | Bộ đọc IPCAS bật **dense**; nhánh cứu lãi suất viết lại theo mảng: đọc số thô + định dạng ô, tự đổi ngày bằng `SSF.parse_date_code` (không phụ thuộc múi giờ). **11/11 kỳ thật: đầu ra GIỐNG HỆT bộ đọc cũ** (SHA-256 từng kỳ trùng; kiểm ở UTC, Asia/Ho_Chi_Minh, Los Angeles; múi giờ trong trình duyệt: audit_p09b TZ 4/4). **Lỗi tiềm ẩn sửa:** ô lãi suất LẺ bị định dạng ngày mất thập phân (8,5 → "8"; 0,1 → "31"). Trên dữ liệu thật nhánh cứu chỉ gặp 1 ô/kỳ ở cột `apprdt` (serial 1) — kết quả không đổi | `td_xlsrows.test.js`; e2e P10-T4 (ô 8,x định dạng ngày qua cả chuỗi nhập ra đúng); 1 đột biến; HM-03 e2e vẫn đạt |
| T5 | Trung tâm nhập: `saveData` hoãn trong đợt, lưu **1 lần** cuối đợt; bỏ lần lưu tự động thừa 8 s sau khi đã lưu; hook kiểm toán (163) không sao chép sâu 2× dư nợ ở lần gọi bị hoãn. **Giữ bản sao localStorage** (đường phục hồi HM-04 khi IndexedDB hỏng) — không đổi mức an toàn; nay ghi 1 lần/đợt, nén trong worker | e2e P10-T5 (lưu ngay khi xong đợt, đúng 1 lần, tải lại đủ); 2 đột biến |
| T6 | **Bỏ tên cán bộ nhúng cứng**: ROSTER (037), `BCKH_PHONG` + bảng bí danh `BCKH_CBTD_ALIASES` (051), cán bộ mặc định (061), tên trong chú thích/test/evidence. Module `td_roster.js`: cấu hình người dùng (Tiện ích → 👥 Danh sách cán bộ; lưu ở trình duyệt; dòng `Phòng ban \| Họ tên \| Vai trò`, `Mặc định \| Họ tên`); chưa cấu hình ⇒ **tự học từ dữ liệu** (CBTD r[12] + phòng ban r[17]; mốc lưu trữ bổ sung); khớp tên viết tắt/đổi họ thay bảng bí danh. Dữ liệu thật: 20 cán bộ — 17 giữ phòng cũ, **2 theo phòng ghi trong IPCAS (khác danh sách cũ)**, 1 trước không có phòng nay có | `td_roster.test.js` 14; e2e P10-T6 (không tên nhúng, tự học, cấu hình ưu tiên + lưu bền, hộp thoại); 3 đột biến |
| T7 | Tiêu chí HM-15: topbar ≤ 7 nút (5 gốc + ↶/↷ thêm ở P05); `hm15_test.js` cập nhật (18/18) và nhận đường dẫn app | e2e P10-T7; 1 đột biến |
| T8 | `node tools/real-run.mjs --data <dir>`: dựng môi trường (tệp phụ, xlrd/openpyxl tự cài, máy chủ HTTP cổng ngẫu nhiên, trích + đối chiếu độc lập + SHA-256) và chạy 12 kịch bản; đường dẫn qua `evidence/scripts/_realenv.js|.py` | **12/12 đạt** (`p10_real_run.txt`) |
| T9 | Rời trang nặng (> 2.500 nút) ⇒ lúc rảnh gỡ nội dung bảng; chỉ áp cho 15 trang luôn dựng lại khi vào; không áp cho trang có biểu mẫu (Hồ sơ vay, FHS, TSBĐ, Lưu trữ…) | e2e P10-T9; 2 đột biến |
| T10 | Trung tâm nhập đọc nội dung mỗi tệp 1 lần (nhận dạng → SHA-256 → nhập dùng chung; nhả khi nhập xong/bỏ chọn/xoá; tổng giữ ≤ 256 MB) | e2e P10-T10 (2 lần đọc/2 tệp, SHA-256 nhật ký đúng); 1 đột biến |

## 3. Kiểm thử
- `node tests/run.js`: **23/23** nhóm, **e2e 121/121** (mốc 21/21, 97/97). Unit: thêm `td_xlsrows` (21), `td_roster` (14).
- Dữ liệu thật: `tools/real-run.mjs` 12/12; audit_p09 37/37; audit_p09b 13/13.
- Đột biến: 59 (42 cũ + 17 mới) — kết quả ở `p10_mutation_full.txt` (chạy cuối phiên, xem mục 6).

## 3b. Làm sạch dữ liệu cá nhân trước khi push (quyết định người dùng 25/10/2026: "gỡ DATA.macb, làm sạch lịch sử rồi push")
- Gỡ `DATA.macb` (49 hồ sơ cán bộ: họ tên, mã CB, số TK, hệ số lương) — cài mới: `autoGenerateMaCB()` sinh danh sách từ dữ liệu dư nợ; người dùng đang dùng vẫn giữ danh sách đã lưu trong IndexedDB.
- Quét toàn bộ tệp đã theo dõi bằng danh sách **7.301 họ tên + 41.646 mã** lấy từ 11 kỳ dư nợ + 2 sao kê thật (danh sách để NGOÀI repo; so theo cụm 2–7 chữ, bỏ dấu): đã che tên khách hàng thật trong `apply_hm05.py` (kịch bản lịch sử), placeholder "người thụ hưởng" (040), mã mẫu hồ sơ mang tên khách hàng (042/069 → `mau-cap-von`), chú thích còn tên cán bộ, `hm28_indep_python.json` (bí danh). Còn lại chỉ là tên phố trong bảng giá đất (văn bản công khai), địa danh, tên phòng ban, cụm từ thường ("nguyên văn từ") và tên giả phổ biến trong test.
- Số trông như thật: placeholder điện thoại, mã KH ví dụ trong chú thích TSBĐ → giá trị giả. `tools/pii-allow.json` dựng lại: 107 → **10** băm (chỉ placeholder/hằng số) — bản cũ chứa băm số TK có tiền tố cố định, đảo ngược được.
- Ảnh: xem từng ảnh (37 + 7 trong docx); làm mờ mạnh thêm vùng dữ liệu của `hm17_qltd_1920_blur.png`, `hm19_390_qltd_blur.png` (lớp mờ cũ còn thấy hình dạng chữ). Các ảnh khác là dữ liệu giả/fixture, không có dữ liệu, hoặc đã mờ đủ.
- Lịch sử: các commit cục bộ (chưa từng push) gộp thành MỘT commit trên `origin/claude/new-session-01tmpj` ⇒ không commit nào được push chứa ROSTER/DATA.macb.
- **Còn trên remote từ trước (do người dùng tải lên, không thuộc P10):** `index.html` và `hsv-react-phien16.zip` ở gốc repo có họ tên trùng người thật (cả tên cán bộ). Gỡ khỏi lịch sử remote cần force-push — chưa làm, cần người dùng quyết định.
- Số tổng hợp của chi nhánh (tổng dư nợ, theo nhóm nợ/phòng ban) vẫn có trong evidence/ảnh — không phải dữ liệu cá nhân nhưng là thông tin nội bộ.

## 4. CẦN NGƯỜI DÙNG QUYẾT ĐỊNH
1. ~~`DATA.macb`~~ — ĐÃ GỠ (mục 3b). **Mới:** `index.html` + `hsv-react-phien16.zip` (đã có trên remote công khai từ trước) chứa họ tên người thật — gỡ khỏi lịch sử cần force-push: anh/chị quyết định.
2. ~~Push lên đâu~~ — đã làm sạch + push lên `No` (mục 3b).
3. Danh sách cán bộ: muốn giữ cách xếp CŨ thì dán tệp `danh_sach_can_bo_cu.txt` (để ngoài repo, trong thư mục nháp của phiên) vào Tiện ích → Danh sách cán bộ; mặc định nay theo phòng ban ghi trong IPCAS.
4. Như P09: Phụ lục I NQ38 (HM-11), khoá AI thật (HM-27), mẫu .docx cơ quan, Past Due thật, băm SRI SheetJS — giữ nguyên, không làm.

## 5. CÒN TỒN ĐỌNG / HẠN CHẾ
| # | Mức | Mô tả | Đề xuất |
|---|---|---|---|
| U1 | Cao | Nhánh `ccr-266ec07a-kxmt78` (dữ liệu thật) vẫn còn — phiên không được cấp quyền thêm repo | xem mục 0 |
| U2 | Cao | `index.html`, `hsv-react-phien16.zip` (có sẵn trên remote công khai) chứa họ tên người thật | người dùng quyết định gỡ (force-push) |
| U3 | Thấp | Mỗi kỳ nhập vẫn ghi localStorage `_prevDunoSnap` (> 100 KB, 10 lần/11 kỳ) cho nhãn "Vừa trả gốc" | gộp như T5 |
| U4 | Thấp | Longtask còn lại khi nhập ≤ 532 ms (dựng lại giao diện sau mỗi kỳ, đối chiếu TSBĐ 19k dòng) | dựng lại 1 lần cuối đợt |
| U5 | Thông tin | Đổi hành vi T6: 2 cán bộ đổi nhóm phòng theo IPCAS; bộ lọc thông báo không còn chọn sẵn 1 cán bộ trừ khi đặt "Mặc định" | người dùng xác nhận |

## 6. Đột biến
Xem `p10_mutation_full.txt` (cập nhật khi chạy xong).
