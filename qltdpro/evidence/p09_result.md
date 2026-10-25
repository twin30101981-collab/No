# P09 — Kiểm chứng Playwright toàn bộ quá trình chỉnh sửa/nâng cấp trên DỮ LIỆU THẬT (24/10/2026)
Dữ liệu (ngoài repo, `/tmp/claude-0/real/data`): 11 kỳ dư nợ 31/12/2025–20/10/2026 (3.642–3.918 dòng/kỳ), 2 sao kê TSBĐ (19.133 dòng), PL01/PL02/NQ38. Báo cáo chỉ có số liệu tổng hợp, không có tên/mã khách hàng.

## 1. Phương pháp
1. Mốc: ZIP P08 nguyên vẹn (MANIFEST 0 lỗi), `node tests/run.js` 21/21, e2e 91/91.
2. Chạy lại 12 kịch bản dữ liệu thật đã có (hm17c, hm23, hm24, hm25, hm26, hm09b, real10, real12, hm28b, td_pl02, hm15, hm19) — dựng lại môi trường (HTTP :8765, tệp đối chiếu độc lập, `real/extra`, xlrd).
3. **Mới** `evidence/scripts/audit_p09.js` (37 phép kiểm): khởi động, nhập 13 tệp qua Trung tâm nhập, toàn vẹn dữ liệu, mở 26 trang (lỗi/NaN/tràn/thời gian/longtask), bảng (sắp xếp 19 cột, tìm, lọc, phân trang, "Tất cả", xuất Excel), sửa ô, tải lại, sao lưu→khôi phục (băm trùng), 3 khung hình, rò rỉ khi chuyển trang.
4. **Mới** `evidence/scripts/audit_p09b.js` (13 phép kiểm lỗi tiềm ẩn): 6 loại tệp hỏng, nhập trùng, đua thao tác, 4 múi giờ, IndexedDB bị chặn, đồng hồ hệ thống tại 29/02, 31/12 23:59:30, 01/01 00:00:10.
5. **Mới** `prof_p09.js`, `import_stages_p09.js`, `hm18_measure.js`, `hm17b_all.js`: CPU profile (CDP) theo trang/giai đoạn nhập.

## 2. Số đo trước → sau (cùng máy, dữ liệu thật)
| Mục | Trước | Sau |
|---|---|---|
| Mở trang Phí DV | 5.817 ms (longtask 3.213) | **547 ms** |
| Mở Dashboard | 3.343 ms (longtask 1.915) | 1.446 ms (718) |
| Mở Tài sản bảo đảm | 1.475 ms | 833 ms |
| Mở Đối soát | 1.194 ms | 743 ms |
| Nhập 12 tệp (Trung tâm nhập) | 92,8 s | 84,5 s |
| Longtask lớn nhất khi nhập | 7.397 ms | 3.934 ms |
| Lưu mốc 1 kỳ (giai đoạn archive) | 5,3 s | 3,2 s (CPU nén 4,2→1,3 s) |
| Đọc sao kê TSBĐ 19.133 dòng | 6,7 s | 2,3 s |
| Sắp xếp 20.000 dòng theo cán bộ/phòng | 1.000 ms | 171 ms |
| "Tất cả" 3.848 dòng: khung hình đầu / dựng đủ | 946 ms / 14,3 s | 609 ms / 13,4 s |
Kết quả audit: 31/37 → 34/37; lỗi tiềm ẩn: 13/13 (sau khi sửa lỗi chưa bắt khi IndexedDB bị chặn).

## 3. Lỗi và điểm nghẽn ĐÃ SỬA (đều có e2e/unit + đột biến)
1. **Trang Phí DV dựng cả 3.850 dòng (69.000 nút DOM), layout ~7 s** → phân trang 100 dòng (bộ phân trang chung `__TDPgBarHtml`); tổng/"Đã báo phí" vẫn tính trên cả tập lọc; "Chọn tất cả" áp cho cả tập lọc (không chỉ trang đang hiện).
2. **Mỗi lần nhập kỳ, `saveData` chạy 3 lần × nén cùng dữ liệu 2 lần (localStorage + IndexedDB) ≈ 4,8 s** → nén có nhớ theo NỘI DUNG chuỗi (`_lzMemo`, khoá = chính chuỗi nên không thể trả nhầm).
3. **Đọc TSBĐ/xem trước bằng SheetJS chế độ mặc định chậm** → `dense:true, cellText:false` (đầu ra `sheet_to_json(raw)` y hệt, kiểm trên dữ liệu thật). KHÔNG áp cho `parseXLS_legacy` (nhập IPCAS) vì nhánh cứu lãi suất cần `ws[addr]`/`.w`.
4. **`TD_SXCB.rank/norm` chuẩn hoá chuỗi NFD lặp trong vòng sắp xếp** → bộ nhớ đệm (kết quả giữ nguyên).
5. **`TD.trend.build` tóm tắt lại 11 mốc lưu trữ mỗi lần mở Dashboard/Đối soát** → nhớ theo mốc, kèm tổng kiểm các cột dùng nên sửa tại chỗ vẫn tính lại.
6. **Lỗi tiềm ẩn: `body.modal-open` KHÔNG BAO GIỜ được đặt** (hộp thoại là `position:fixed` ⇒ `offsetParent=null`; bộ chọn thiếu `.modal-overlay.open`) nên quy tắc CSS ẩn thanh dock khi có hộp thoại chưa từng hoạt động. Đã sửa (điều kiện hình học trong khung nhìn — loại ngăn kéo đóng `tdup2-drawer` để dock không bị ẩn vĩnh viễn) + gỡ vòng quét lớp phủ vô tác dụng (quét mọi div/section/aside + `getComputedStyle`, ~0,5 s mỗi lần đổi DOM/bấm/phím).
7. **IndexedDB bị chặn (chế độ riêng tư/chính sách)**: lỗi Promise chưa bắt `no-idb` (ghi nhật ký Web Vitals) và `TypeError` (module TSBĐ); chuỗi khởi tạo TSBĐ hỏng toàn bộ → đã chịu lỗi, TSBĐ vẫn nạp trong phiên và người dùng được cảnh báo "Không lưu được".
8. Sửa các phép kiểm sai của chính bộ audit (cột ngày, khoá trùng, sửa ô bằng bàn phím thật, múi giờ, tải tệp tên tiếng Việt qua bộ nhớ vì sandbox không đọc đường dẫn có dấu).

## 4. ĐÃ KIỂM — không có lỗi
Tệp hỏng/sai định dạng (xlsx cắt nửa, rỗng, văn bản đổi đuôi, PDF đổi đuôi, xls cắt nửa, csv sai cột): dữ liệu hiện có không đổi, không nạp rác, có thông báo, không lỗi JS. Nhập trùng cùng tệp: không nhân đôi dòng/mốc. Bấm Nhập/Lưu mốc 2 lần liên tiếp: không nhân đôi. Múi giờ VN/UTC/Los Angeles/UTC+14: dữ liệu GIỐNG HỆT. Đồng hồ 29/02, 31/12 23:59:30, 01/01 00:00:10: không lỗi/NaN. Toàn vẹn: không NaN dư nợ/HMTD, không âm, ngày đúng dd/mm/yyyy, lãi suất 0–30%, khoá tự nhiên (tài khoản|số GN) không trùng; 3.918 dòng nguồn → 3.848 dòng nhập = 70 dòng dư nợ 0 (đúng thiết kế); tổng dư nợ 2.160.375.016.661 khớp tệp/Dashboard (chênh 0). Tải lại giữ nguyên hồ sơ/mốc/TSBĐ; sao lưu→khôi phục băm trùng; chuyển trang 24 lần: DOM +0,5%, heap +1 MB; không yêu cầu mạng thất bại.

## 5. CÒN TỒN ĐỌNG / HẠN CHẾ (chưa sửa — đề xuất)
| # | Mức | Mô tả | Đề xuất |
|---|---|---|---|
| T1 | TB | Dashboard 1,4 s: layout 2.229 hàng / 8 bảng | giới hạn top-N hoặc phân trang bảng dài |
| T2 | TB | Trả nợ (tranop) 1,4 s: 1.093 hàng / 3 bảng không phân trang | áp bộ phân trang như Phí DV |
| T3 | TB | Nhập: longtask ≤3,9 s (đọc TSBĐ 19k dòng + nén chạy đồng bộ trên luồng chính, UI đơ) | đưa SheetJS + nén vào Web Worker (thay đổi kiến trúc) |
| T4 | TB | Đọc IPCAS .XLS ở chế độ thưa 1,9 s/kỳ; `dense` bị chặn bởi nhánh cứu lãi suất dùng `ws[addr]`/`.w` | viết lại nhánh cứu theo mảng rồi bật dense (~−1,3 s/kỳ), kiểm kỹ HM-03 |
| T5 | TB | `saveToLS` ghi bản sao localStorage nén ~1,4 MB mỗi lần lưu ngoài IndexedDB; nhập gọi `saveData` 3 lần | gộp lưu 1 lần/đợt nhập; cân nhắc bỏ bản sao khi IndexedDB tốt (đổi mức an toàn — cần quyết định) |
| T6 | TB | `037-td-sxcb-standard.js` nhúng cứng danh sách tên cán bộ (ROSTER) ⇒ nhân sự mới/đổi phòng sắp sai; là dữ liệu cá nhân nhúng trong tệp | chuyển thành cấu hình người dùng |
| T7 | Thấp | Tiêu chí HM-15 "≤6 nút topbar" lệch thực tế 7 (thêm ↶/↷) — hm15_test còn 1 lỗi | cập nhật tiêu chí/test |
| T8 | Thấp | Bộ kịch bản cũ trong evidence/scripts phụ thuộc môi trường phiên cũ (`/tmp/claude-0/work1`, `:8765`, `real/extra`, xlrd) | gom thành 1 lệnh dựng môi trường (đã mô tả ở mục 1.2) |
| T9 | Thấp | Sau khi duyệt hết trang DOM ≈150.000 nút (trang không hoạt động vẫn giữ DOM) | gỡ DOM trang không hoạt động khi bộ nhớ thấp |
| T10 | Thấp | Trung tâm nhập đọc mỗi tệp 2 lần (nhận dạng tiêu đề + nhập); nay nhận dạng rẻ hơn nhờ dense | đọc 1 lần, dùng lại |
| T11 | Thông tin | 4 chuỗi giống khoá API xuất hiện trong lời nhắn của phiên — đã KHÔNG dùng/ghi; cần thu hồi | thu hồi khoá |

## 6. Đột biến (tests/mutation.js, toàn bộ): **42/42 bị phát hiện, 0 lọt** (evidence/p09_mutation_full.txt), gồm 9 đột biến mới của P08–P09. Riêng đột biến cache TD.trend được kiểm bằng unit test (td_trend.test.js: 3 phép kiểm lỗi khi bỏ tổng kiểm).
