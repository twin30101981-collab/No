# HM-03 — Chặn ghi đè lãi suất khi khởi động — ĐẠT-V3 (21/10/2026)
Nguyên nhân gốc: (1) cờ _rateManual/_sprdRaw gắn lên mảng nên mất khi lưu JSON; (2) mỗi lần mở app 5 hàm "tự chữa" (__autoFixRateX100, HSVRate.healOnLoad, __healSprdFromFingerprint, repairSprdRatesOnLoad, bộ dò đồng loạt) ghi đè r[8] theo bảng cứng __IPCAS_SPRD_PIPE (3.700 cặp dsbsseq:sprd của tệp 04/06/2026) rồi lưu lại; (3) HSVRate.format ghi ngược số khi vẽ bảng.
Sửa (apply_hm03.py, vùng L24360–24900): gỡ bảng cứng; thêm cổng __rateMayOverwrite — sửa tự động chỉ được thay giá trị KHÔNG hợp lệ (trống, <1, >30), giá trị hợp lệ chỉ bị ghi đè khi người dùng bấm khôi phục (force) hoặc nhập tệp IPCAS mới; bộ dò "L/S đồng loạt" không ép ghi đè mà nhắc nhập lại tệp; HSVRate.format chỉ chuẩn hoá chuỗi→số.
Chống tái diễn: build/hm03_test.js + hm03_compare.py + hm03_unit.js (nhập qua giao diện, tải lại nhiều lần, so từng khoản với tệp gốc).
Kết quả V3 (Chromium) — kịch bản: nhập 30/06 → tải lại → nhập 20/10 → tải lại → sửa tay 5 khoản → tải lại ×2:
| | Mã HM-02 (trước) | Mã HM-03 (sau) |
|---|---|---|
| Sai lãi suất so với tệp 20/10 sau tải lại | 23 khoản bị trả về giá trị cũ của bảng 04/06 | 0 |
| Sửa tay giữ được sau tải lại | 0/5 | 5/5 |
| Ngay sau khi nhập (trong phiên) | 0 sai | 0 sai |
Kiểm đơn vị: 1900→(từ nguồn trong phiên)/850 được sửa; giá trị hợp lệ 8 và 7,5 không bị tự động đè; số 0 được khôi phục; nút "Khôi phục L/S" (force) vẫn đưa 8→9. Không pageerror.
Giới hạn: chỉ 6/1.649 khoản đổi lãi suất giữa 30/06 và 20/10 trong dữ liệu này nên số khoản bị đè là 23 (gồm các khoản đổi từ tháng 6 trở đi); dữ liệu cũ đã lưu với LS=19% do lỗi nhập .xlsx trước HM-02 KHÔNG tự sửa — cần nhập lại tệp (app nhắc khi >70% khoản cùng LS ≥18%); chưa có lớp lưu cờ sửa tay riêng qua nhiều lần NHẬP kỳ mới (nhập mới thay toàn bộ, thuộc HM-23); chưa thử Edge/Windows.
SHA-256 bản mới: 9aa4adc5e18da35bb8363b391c17f9644fe85f28d6c341d64f9b39cf0e77dc05
