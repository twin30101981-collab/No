# P04 — mục 4B kỹ thuật (22/10/2026)
Bối cảnh: PROMPT_PHIEN_SAU gửi lên còn để trống các quyết định ⇒ phiên này chỉ làm việc không cần quyết định: KHÔNG force-push/viết lại lịch sử, KHÔNG HM-21, KHÔNG đổi giao diện nhìn thấy.
Kiểm đầu phiên: MANIFEST.sha256 483/483 OK; SHA app HM27a = 95bbb132…e971 khớp; tests/run.js 20/20.

1) HM-22 — đột biến HM-02…05 (tests/mutation.js): HM-02 bỏ SheetJS + bộ đọc tự viết đổi mọi số 1<x<100000 thành ngày; HM-03 cổng __rateMayOverwrite luôn cho đè; HM-04 chunk hỏng bị bỏ qua im lặng; HM-05 nhúng lại seed Past Due.
   Phát hiện lỗ hổng: đột biến HM-03 ban đầu KHÔNG bị bắt (bảng cứng 04/06 đã gỡ nên các hàm tự chữa không có nguồn để đè khi tải lại). Thêm phép kiểm e2e: giả lập nguồn tham chiếu khác tệp (__IPCAS_SPRD_BY_DSBSSEQ = 12,34 cho 20 khoản) rồi chạy repairSprdRatesOnLoad, __healSprdFromFingerprint, __autoFixRateX100, HSVRate.healOnLoad ⇒ lãi suất hợp lệ không đổi. Mã hiện hành đạt, đột biến bị bắt.
2) HM-22 — CI: .github/workflows/qltdpro-tests.yml (Node 22, Playwright 1.56.1 + Chromium, scan-pii, tests/run.js; --mutation khi chạy tay). Chưa chạy trên GitHub.
3) HM-27 — SRI: thêm PizZip 3.1.4 (bản nhúng trùng gói npm pizzip@3.1.4 dist/pizzip.min.js; SRI tính từ gói npm; phương pháp kiểm bằng JSZip 3.10.1 ⇒ ra đúng SRI đã có). Nhập PL02 gọi TD.net.ensureLib('PizZip') khi bản nhúng lỗi. Không làm được: SheetJS 0.20.3 (không có trên npm; cdn.sheetjs.com bị chặn ở môi trường này), docxtemplater (bản dựng webpack riêng), mammoth (không khớp bản npm 1.4.x–1.13).
4) HM-16 — xoá khối `#page-hsvv :root{--apc-*}` (không dùng ở đâu, nằm trong chú thích chưa đóng).
5) Phát hành QLTD_PRO_v2026-10-22_v22.3-P04a.html (TD.net.version v22.3-P04a), SHA-256 9fab2cc09832ee3b03404b17109b580b08fb9028603259930296a38fa67c1432.
Kiểm chứng: node tests/run.js --mutation ⇒ 21/21 nhóm; e2e 49/49; 12/12 đột biến bị phát hiện (evidence/p04_run_full.txt).
Không làm (lý do): HM-17b phần còn lại (Chuyển HM/TSBĐ/Giá đất đã có phân trang riêng; fixture không có dữ liệu các bảng này — cần dữ liệu thật để kiểm), HM-18 gỡ hẳn observer (đã giảm chi phí; gỡ hẳn thuộc HM-21), bgd-snav/tab nền tối (thay đổi nhìn thấy, chờ duyệt HM-16c).
