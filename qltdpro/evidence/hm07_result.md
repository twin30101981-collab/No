# HM-07 — "Ngày dữ liệu" là nguồn sự thật — ĐẠT-V3 (21/10/2026)
Nguyên nhân gốc: todayMidnight() luôn lấy đồng hồ máy ⇒ mở tệp cũ vẫn tính đến hạn/quá hạn theo hôm nay; mốc snapshot hàng ngày lấy ngày bấm nhập (2 tệp khác ngày nhập cùng ngày ghi đè nhau); regex tên tệp dùng \b nên "DUNO_18.08.2026", "msit80_30_06_2026" (gạch dưới là ký tự từ) không nhận; lần nhập đầu (dữ liệu trống) không ghi ngày tệp.
Sửa (apply_hm07.py + td_datadate.js — nguồn module duy nhất, nhúng nguyên văn + Node nạp để kiểm thử):
- TD.dataDate: fromFileName (30.06.2026 · 30_06_2026 · DUNO_18.08.2026 · msit80_30_06_2026 · 2026-06-30 · 20260630 · 30062026; từ chối ngày không tồn tại), get/set (localStorage _currentFileDate), mode (data|today, nhớ qua tải lại), effective, label.
- todayMidnight() = ngày dữ liệu (mặc định) hoặc hôm nay; realTodayMidnight() cho khoá "việc hôm nay" và tên tệp xuất.
- Mốc hàng ngày (ipcasUpsertDailySnapshot): dayKey/timestamp theo ngày dữ liệu; nhập lại cùng ngày dữ liệu = ghi đè; ghi thêm importedAt.
- Tên tệp không có ngày ⇒ xoá ngày cũ, dùng hôm nay (không để ngày tệp trước trôi sang tệp sau). _captureOldDunoSnapshot ghi ngày cả khi dữ liệu trống.
- Chip topbar "📅 Dữ liệu dd/mm/yyyy" (vàng nếu cũ >1 ngày) ⇄ "📅 Hôm nay"; bấm để chuyển và tính lại toàn app (rebuildAll). 390 px: chip thu nhỏ, không tràn ngang.
Kiểm chứng:
- V2 Node: td_datadate.test.js 26/26 (16 mẫu tên tệp, chế độ, ngày sai, 2 ngày ⇒ 2 khoá).
- V3 Chromium (hm07_test.js) 20/20: 6 mẫu tên qua processImportFile thật; nhập DUNO_18.08.2026 ⇒ _currentFileDate=18/08/2026, todayMidnight=18/08/2026, chip vàng; thêm msit80_30_06_2026 ⇒ 2 mốc riêng (18/08, 30/06); nhập lại 18/08 ⇒ vẫn 2 mốc; chuyển "hôm nay" ⇒ số quá hạn/đến hạn đổi; tải lại giữ chế độ; tên không ngày ⇒ hôm nay; vẽ 12 trang không pageerror; 390 px không tràn.
- check_scripts 74/74, 0 lỗi. smoke 1920/1366/390: errs = [].
Giới hạn: KHÔNG có tệp IPCAS thật phiên này ⇒ V3 dùng CSV tổng hợp 30 dòng (đủ cột msit80); đường .xls/.xlsx không đổi mã đọc (chỉ đổi cách nhận ngày từ tên tệp). Chưa gom các nơi tự dùng new Date() cho nghiệp vụ khác ngoài todayMidnight (để HM-08/09). Chưa thử Edge/Windows. 390 px: 1 nút topbar tràn phải (đã có từ trước, thuộc HM-15/19).
SHA-256: 9b7806e6cf62dcbd000261642f5e9bd245ab6ac41e14b6748d1ff36ab7c7699e (5977862 byte)
