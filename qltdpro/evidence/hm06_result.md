# HM-06 — Module số/ngày dùng chung (TD.num, TD.date) — ĐẠT-V3 (21/10/2026)
Nguyên nhân gốc: không có lớp chuẩn hoá số/ngày dùng chung; mỗi nơi tự viết một bản: 3 bản parseVNDate (toàn cục không hợp lệ hoá ngày; bản TDUP5 không neo đầu chuỗi; bản phân kỳ không nhận ISO), 2 bản parseNum xoá mọi dấu "." rồi đổi dấu "," ĐẦU TIÊN thành thập phân, groupDigits/stripDots chỉ giữ chữ số.
Sửa (apply_hm06.py + td_numdate.js — nguồn module duy nhất, vừa nhúng vào app vừa được Node nạp để kiểm thử):
- TD.num.parse/toNumber/fmt/groupVND/stripVND; TD.date.parse/find/iso/vn/isValid (hợp lệ hoá ngày, neo chuỗi, chặn "20261"/"26-05-31").
- Các hàm cũ giữ nguyên tên làm vỏ gọi module: parseVNDate (toàn cục, TDUP5 → TD.date.find, phân kỳ), parseNum (TDUP5, quá hạn), groupDigits/stripDots (rootfix v6).
- smartDateToVN chỉ coi là số seri Excel khi chuỗi là số thuần (tránh 2026-02-31 → năm 1905).
Kiểm chứng:
- V2 Node: td_numdate.test.js — 71/71 ca đạt (số: US/VN, thập phân, âm, ngoặc, %, mũ, rỗng, chữ; ngày: 9 định dạng, 31/02, 29/02 nhuận/thường, tháng 13, thừa chữ số, giờ, find trong văn bản).
- Hàm cũ trích nguyên văn từ bản HM-05 sai 5/7 ca đối chứng (hm06_oldnew.txt): "300,000,000"→300; "1,234,567.5"→1,234; ISO TDUP5 "2026-05-31"→2031-05-26; "31/02/2026"→03/03; groupDigits(1234567.89)→123.456.789 (×100); module mới đúng 7/7.
- V3 Chromium: nhập 4 tệp thật (31.05.2026.xlsx, 31.12.2025.xlsx, 20.10.2026.XLS, 30.06.2026.XLS = 15.107 dòng): bản HM-06 so với HM-05 có 0 ô khác nhau ở mọi cột ngày (r3, r6, r7, r23–r26), lãi suất, dư nợ, nhóm nợ. Đặt cố ý ngày 31/02/2026, 2026-02-31, rỗng, "abc" vào cột đến hạn rồi vẽ 12 trang: không pageerror; Lịch trả nợ 154 dòng như trước.
Giới hạn: chưa gom 9 hàm fmt* (định dạng hiển thị) và các nơi tự regex ngày khác (82 lời gọi parseVNDate đều đi qua module nhưng một số đoạn tự parse bằng regex riêng chưa đổi); ngày không tồn tại nay trả null thay vì cuộn sang ngày khác — mã gọi nào không kiểm null sẽ gặp lỗi (đã vẽ 12 trang với ngày sai: không lỗi); quy ước một dấu 3 chữ số "1,234" hiểu là 1234 (hàng nghìn); chưa thử Edge/Windows.
SHA-256: 5278ff793ac34f9553161b46e61c850e983dd04a5c976fade5914acfe5edc50b (5971229 byte)
