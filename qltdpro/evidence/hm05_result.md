# HM-05 — Gỡ dữ liệu cứng và dữ liệu cá nhân khỏi tệp phát hành — ĐẠT-V3 (21/10/2026)
Nguyên nhân gốc: dữ liệu thật của chi nhánh bị nhúng thẳng vào tệp HTML (và tự ghi vào trình duyệt khi mở) để "chạy thử", nên máy mới thấy số liệu cũ và mọi lần chia sẻ tệp là chia sẻ dữ liệu khách hàng.
Đã gỡ (apply_hm05.py): tsbd-seed-data 1,43 MB (2.243 tài sản, nguồn 18/08), _PRE_SNAPS 5,72 MB (10 mốc lưu trữ nhúng), denhan-amt-data 153 KB (3.253 khoản), TKSTT_MAP (82 cặp tên KH–số TK/số tập) và TKSTT_PLACEHOLDERS, TD_PASTDUE.SEED (8 khoản quá hạn 23/06; mục seed cũ đã lưu trong trình duyệt được xoá, dữ liệu người dùng tự dán được giữ); che mã KH/số TK/tên khách hàng trong chú thích, ví dụ, placeholder, dữ liệu mẫu.
Kích thước tệp: 13.913.946 → 5.965.850 byte (−7,9 MB, −57%).
Kết quả V3 (Chromium, trang mới, 15 trang, rồi nhập 20.10.2026.XLS, rồi tải lại):
| | Trước (HM-04) | Sau (HM-05) |
|---|---|---|
| Trang mới: TSBĐ / quá hạn / mốc lưu trữ / TKSTT / số tiền đến hạn | 2.243 / 8 / 10 / 82 / 3.253 | 0 / 0 / 0 / 0 / 0 |
| Trang TSBĐ khi chưa nhập | "Nguồn 18.08.2026-TS.XLS · 2.243 TS" | "Chưa có dữ liệu tài sản — bấm Nhập TS từ IPCAS" |
| Nhập 20.10.2026.XLS rồi tải lại | 3.848 khoản, lưu trữ 11 mốc | 3.848 khoản, lưu trữ 1 mốc (của bạn) |
| pageerror khi mở 15 trang trước và sau nhập | 0 | 0 |
| Người dùng cũ: 8 khoản seed + 1 khoản tự dán trong trình duyệt | — | còn đúng 1 khoản tự dán |
Quét PII (3 kỳ dư nợ: 1.868 tên KH ≥10 ký tự, 11.056 mã KH/số khoản vay): mã KH/số khoản vay còn trong app = 0. Tên trùng còn lại 28 (ngoài DATA.macb): tên cán bộ trong danh sách phân công CBTD, tên đường phố trong bảng giá đất, vài tên trong chú thích về cán bộ.
Giới hạn và quyết định treo:
- GIỮ DATA.macb (danh sách cán bộ: họ tên, mã CB, chức vụ, hệ số lương, số TK lương) và danh sách phân công CBTD theo phòng — cần cho báo cáo theo CBTD nhưng là dữ liệu nhân sự. Cần bạn quyết: để nguyên / bỏ số TK / chuyển thành tệp cấu hình riêng.
- Số tiền đến hạn trước đây tra từ bảng cứng (3.253 khoản, chính xác theo kỳ gốc/lãi); nay không còn bảng nên dùng dư nợ hiện tại làm số tiền đến hạn (mã gốc đã có sẵn nhánh dự phòng này). Với khoản trả góp, số "đến hạn" sẽ lớn hơn thực tế cho tới khi có nguồn lịch trả nợ (đề xuất: nhập tệp lịch trả nợ — Đợt 5).
- Số TK/số tập (TKSTT) trống cho tới khi có cách nhập bảng ánh xạ riêng (đề xuất ở Trung tâm nhập dữ liệu).
- Lưu trữ lịch sử không còn 10 mốc nhúng: người dùng nhập lại tệp các kỳ cần so sánh. Dữ liệu đã lưu sẵn trong trình duyệt người dùng không bị xoá.
- Bản app trong gói này đã sạch dữ liệu khách hàng nhưng vẫn còn nhóm cán bộ nêu trên; tệp vẫn nên chia sẻ nội bộ.
SHA-256: 137bdb300459dd002f7b057ea41410029af9848ec47e73800423108668c3bbb6
