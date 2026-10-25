# HM-04 — Lưu trữ toàn vẹn và sao lưu đầy đủ — ĐẠT-V3 (21/10/2026)
Nguyên nhân gốc: idbGetChunked bắt lỗi bằng res([]) và không so với meta.length ⇒ chunk hỏng thành mảng rỗng, app vẫn nạp phần còn lại như dữ liệu đầy đủ rồi tự lưu đè; idbSetChunked không xoá chunk thừa; saveData chạy 5 ghi rời; loadData chỉ khôi phục 5 trường meta (mất hosovay, chlmStatus, hdvSnapshots, hdvCurrentPeriod); exportBackup thiếu trường, không schema/checksum.
Sửa (apply_hm04.py, vùng L24040–24330 và backup ~L24850): idbSaveAll — 1 giao dịch (meta + mọi mảng, xoá chunk thừa, checksum từng chunk); idbGetChunked kiểm thiếu/sai checksum/không giải nén/sai số phần tử ⇒ đánh dấu hỏng + chặn ghi đè + thử phục hồi từ LocalStorage + banner; loadData luôn khôi phục meta; saveToLS không ghi đè bản dự phòng khi còn hỏng; sao lưu v3 (đủ trường, schemaVersion, counts, checksum), khôi phục kiểm checksum; xoá cờ hỏng chỉ khi người dùng xác nhận thay thế (nhập IPCAS, khôi phục sao lưu, xoá dữ liệu).
Kết quả V3 (dữ liệu tổng hợp 5.000 dòng, Chromium) — trước → sau:
| Kịch bản | HM-03 (trước) | HM-04 (sau) |
|---|---|---|
| T1 lưu 5.000 rồi 1.000 dòng: chunk còn lại | qltd__0,1,2 (thừa 2) | qltd__0 |
| T3 tải lại: hosovay / chlmStatus / hdvCurrentPeriod | mất cả 3 ({} / {} / '') | giữ đủ |
| T4 sao lưu có hosovay, schemaVersion, checksum | không / v2 / không | có / v3 / có |
| T2a chunk hỏng, còn LocalStorage | nạp 3.001 dòng, im lặng mất 2.000 | nạp đủ 5.001 dòng, tự ghi lại bản sạch (chunk 1 và meta khớp) |
| T2b chunk hỏng, mất LocalStorage | nạp 3.001 dòng như dữ liệu thật (sẽ lưu đè) | không nạp, banner đỏ, IndexedDB giữ nguyên (không bị ghi đè) |
| T2b khôi phục từ tệp sao lưu | 5.001 dòng nhưng mất hosovay/chlmStatus | 5.001 dòng + hosovay + chlmStatus, cờ hỏng được xoá |
| T4b tệp sao lưu bị sửa | không phát hiện | hỏi xác nhận (checksum không khớp); chọn Huỷ ⇒ dữ liệu không đổi |
Không có pageerror ở cả hai bản.
Giới hạn: dùng dữ liệu tổng hợp (không dùng dữ liệu thật); chưa thử hết dung lượng thật 3.900 dòng × nhiều kỳ lưu trữ (TWIN_Archive_v1 chưa đụng — thuộc phạm vi lưu trữ lịch sử); đóng tab giữa lúc lưu vẫn dựa vào bản LocalStorage; sao lưu cũ v2 vẫn khôi phục được nhưng không có checksum; chưa thử Edge/Windows.
SHA-256: 1c2632458c9dd95c70e6f19de585bb59e43a05312fa14bf134938731db6348d0
