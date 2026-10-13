# Bước kế tiếp (cập nhật sau R6.2, 11/10/2026)

## Cập nhật theo đề án nâng cấp (12–13/10/2026, xem de-an/DE_AN_GIAYTO_v1.1.docx và handover/HANDOVER.md)
- **HM-11 (13/10, Q3=a):** `ink-deepen.ts` giữ khối màu bão hoà-tối Ở MÉP (edgeSaturatedMask + SAT_FLOOR 0,6); gray/mono/magic dùng cùng mặt nạ. Cổng R6.1 (`scripts/playwright/kiem-cong-r61.mjs`, cần chạy máy chủ phát triển cổng 8081): 221 ca cũ 221/221 (không hồi quy); ảnh NB 1/13 → 8/13. 5 ca NB còn trượt vì app không dò được mép giấy (quad = null) nên góc trên-trái là MẶT BÀN tối, không phải khối màu (câu hỏi Q6).
- **Q2 (13/10):** package.json thêm devDependency `@testing-library/dom` ^10.4.2 và script `typecheck` / `lint:src` / `check`; bun.lock khớp (`bun install --frozen-lockfile` báo no changes).
- **HM-13 (13/10):** đã rà 13 mục S/V cũ → `docs/RA-SOAT-MUC-CU-HM13.md` (6 xong, 1 hủy, 6 chờ). Đo lại độ nghiêng dòng chữ: chưa đạt ≤0,5°/ô nhưng người dùng chấp nhận (Q5=a).
- **HM-06 (12/10):** lint thật = `npx eslint . --rule 'prettier/prettier: off'` (hoặc `npm run lint:src`): kỳ vọng 0 lỗi + 10 cảnh báo react-refresh (chỉ ảnh hưởng tải nóng khi dev). Không chạy `prettier --write` toàn dự án (7.518 dòng lệch định dạng).
- **HM-01 (12/10):** `npx vitest run` thoát **mã 0** (trước đó 830 đạt nhưng mã 1 do app-routing.test thiếu IndexedDB). Khi chạy kiểm thử luôn kiểm cả mã thoát, không chỉ số đạt.
- Không chạy `scripts/dong-bo-tien-do.py` khi chưa đọc: nó ghi đè TIEP-THEO.md.

Gói R: 24/27 xong, **R6.2 làm một phần (chưa gạch)**. Còn R6.2 (phần 2), R6.4, R6.5 — đều chờ người dùng.

## Vừa làm: R6.2 — bộ ảnh NB + kịch bản so OCR
- Dựng `kiem-chung/bo-anh-NB/` (ảnh gốc từ PDF, chữ chuẩn 4.082 ký tự do trợ lý chép — **cần người dùng rà**), thư mục `cam/` đang trống.
- `scripts/kiem-chung-r62/chay-app.py` (pipeline thật, 8 bộ lọc, đo cổng R6.1) và `so-ocr.py` (đúng ký tự / CER, mốc đối chứng, nhánh Cam jpg/png/pdf).
- Kết quả + giới hạn: `de-an-nang-cap-scan/kiem-chung/R6.2/bao-cao.md`.
- **Chưa gạch** vì: (1) chưa có ảnh CamScanner cùng trang; (2) máy phiên này chỉ có tesseract `eng` → số OCR chỉ tham chiếu.
- Không chạy được vitest/tsc/build/Playwright (npm bị chặn). Mã nguồn app không đổi.

## Việc cần quyết / làm tiếp (theo thứ tự)
1. **R6.1e (đề xuất, chưa làm):** cổng R6.1 trên ảnh thật NB đạt 1/8 – góc tối 13–15% ở auto/sharp/mono/gray do khối đỏ số trang và logo bị đẩy đen
   (đo góc dưới trái auto: 40,6%). Chọn: (a) bộ lọc giữ khối màu bão hoà ở mép, hoặc (b) cổng bỏ điểm bão hoà cao khi đo góc tối.
   Sau khi sửa phải chạy lại 830 kiểm thử + `kiem-chung-r61.py` (nay gồm cả ảnh NB vì cùng thư mục `bo-anh-*/goc/IMG_*.jpg`; kỳ vọng 221 + 8 ca).
2. **Hoàn tất R6.2:** gửi ảnh Cam cùng trang vào `bo-anh-NB/cam/` (xem `cam/HUONG-DAN.md`); trên máy có `tesseract-ocr-vie` chạy
   `python3 scripts/kiem-chung-r62/chay-app.py` rồi `python3 scripts/kiem-chung-r62/so-ocr.py`; `danh_gia.<trang>.dat == true` thì gạch. Nên có ≥ 3 trang NB.
3. Máy đủ mạng: chạy lại bộ kiểm thử + `chay-app.py --che-do vite` để đối chiếu với lượt đóng gói esbuild (Worker tắt) của gói này.

## Đang chờ người dùng
- **R6.2** — còn thiếu ảnh xuất CamScanner **cùng trang NB** (JPG/PDF; Auto + Magic Color + Original) để so tỉ lệ OCR đúng ký tự (ngưỡng: OCR ≥ bản Cam − 2%). Bộ ảnh NB gốc đã có (từ PDF người dùng gửi); nên gửi thêm ≥ 2 trang NB nữa.
- **R6.4** — thử app trên máy thật Android/iPhone/PC theo 12 tình huống B13, chấm Đạt/Không đạt.
- **Xác nhận** chọn PDF Chuẩn (200 dpi, JPEG 82, OCR ẩn) làm hồ sơ mặc định của nút Xuất 1 chạm.
- **R6.5** (Đề án bản cuối v5 + bàn giao tổng) phụ thuộc R6.2 và R6.4. Thêm: gói này KHÔNG chứa tệp đề án .docx nền (v4) — khi làm R6.5 hãy gửi kèm tệp đề án mới nhất để dựng v5 trên đúng bản gốc.

## Lệnh chạy lại (môi trường có npm, không có bun)
```
npm install --legacy-peer-deps      # @testing-library/dom đã khai báo (Q2, 13/10/2026)
npm run check                       # = typecheck + vitest + lint:src (0 lỗi, 10 cảnh báo react-refresh); thoát mã 0
npx vitest run                      # kỳ vọng 183 tệp / 830 kiểm thử
npx tsc --noEmit -p tsconfig.json   # kỳ vọng không lỗi
npx vite build                      # ra .output/ (không phải dist/ như wrangler.local.jsonc ghi)
npx wrangler dev -c .output/server/wrangler.json --port 4174
python3 scripts/playwright/nghiem-thu.py --url http://127.0.0.1:4174      # máy có internet
NGHIEM_THU_CHAN_FONT=1 python3 scripts/playwright/nghiem-thu.py --url http://127.0.0.1:4174   # sandbox không internet
```

## Lưu ý còn mở (chưa xử lý trong phiên này)
- Cổng R6.1 đã nới góc tối 0,2% → 5% (R6.1c); R6.1d đạt 221/221 với góc tối cao nhất 4,8% — sát ngưỡng. Phiên R6.2 đã chạy cổng trên ảnh NB (1/8 đạt, xem mục 1 phía trên) nhưng CHƯA chạy lại `scripts/kiem-chung-r61.py` trên 17 ảnh cũ (cần vite dev).
- Thời gian/trang tăng 0,06 → 0,29 s (R6.3b → R6.3c) nhưng khác máy chạy; chưa tách được nguyên nhân (máy hay hai lượt inkDeepen). Đo cùng máy trong R6.4.
- Còn 13 mục cũ S/V ở trạng thái "đang làm"/"đã đo chưa đạt" (S1, S7d, S10d, S10g, S11f, S11l, S11n, S11q, S12c, S13, S13b, S13c, V0) chưa được rà lại.
- ~~`src/routes/__root.tsx` tải phông từ Google Fonts mỗi lần mở~~ — ĐÃ XỬ LÝ (R6.6, 11/10/2026): nhúng phông cục bộ qua @fontsource (Manrope vietnamese+latin 400–700; Sora latin-ext+latin 500–700 — Sora không có subset vietnamese, giống hệt hành vi Google Fonts trước đây). Phông nằm trong /assets đã được sw.js cache ngoại tuyến. 830/830 kiểm thử đạt, build OK.
