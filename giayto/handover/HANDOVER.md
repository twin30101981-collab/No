# BÀN GIAO — GIAYTO — Phiên P19 — 2026-10-13 (P18 bên dưới giữ nguyên)

## P19 bổ sung (đọc trước): HM-21 + PR
- TD-44 làm xong (HM-21, ĐẠT V3): từ 1024 px Trang chủ/Công cụ/Tôi dùng khung 880 px (lối tắt 8 ô/hàng, 'Gần đây' 2 cột, Tôi 2 cột); dưới 1024 px giữ 430 px.
- Phần chưa xác minh của HM-20 đã kiểm: giao diện tối + 3 màn × 5 viewport (script kiem-td44-td46.mjs). Phát hiện và sửa lỗi có từ trước: nút Xóa/Chia sẻ lộ sau hàng tài liệu khi nghỉ.
- theme-color/manifest = #006F59; icon giữ #00BFA5 (chưa đổi, cần thiết kế nếu muốn đồng bộ).
- HM-22: bẫy 'nhập lần 2 không mở tài liệu' = importer dùng window.confirm (bị tự đóng = từ chối) + báo nhầm lỗi. Đã chuyển sang confirmDialog, báo 'đã bỏ qua ảnh trùng'. Bẫy trong mục Công thức môi trường không còn.
- HM-23: đồng bộ hồ sơ (R6.2 xong; TD-11/12 đóng; S11f/l/n/q = chấp nhận Q5=a). Mọi việc còn lại cần người dùng: de-an/VIEC_CAN_NGUOI_DUNG_P19.docx (15 việc: 4 máy/ảnh/AI thật, 6 quyết định, 3 tài liệu, 2 xác nhận).
- HM-24 (P1, ĐẠT V3): lỗi máy thật 'chụp xong không chụp tiếp, không Đóng được'. Gốc: bgQueue.flush treo vòng microtask (Xong lúc ảnh đang hoàn thiện → treo cứng); màn cắt bật từ nền đè lên ngón tay (chạm rơi vào 'Chụp lại' → mất ảnh); toast phủ nút Đóng; Xong im lặng 10–30 s. Sửa: flush chờ việc đang chạy; ảnh chưa chắc mép → dấu 'Kiểm mép' trên ảnh thu nhỏ; toast dưới hàng nút đầu (64 px); Đóng hỏi trước khi bỏ trang; Xong hiện 'Đang lưu…'. Kiểm: scripts/playwright/kiem-quy-trinh-chup.mjs (camera giả từ ảnh người dùng, tao-camera-gia.py). Nợ mới TD-47: lưu chậm.
- PR: mở từ nhánh ccr-76ce5c62-g29arh vào main (không đính kèm ZIP vào cây mã).

## P19 tóm tắt (đọc trước)
Người dùng giao "thực hiện theo đề xuất tối ưu toàn bộ". Quyết định đã chốt P19:
- TD-46 = làm đậm primary (sáng oklch(0.48 0.1 174); tối giữ teal cũ + chữ tối) — HM-20 ĐẠT V3, 191 tệp/879 đạt.
- TD-28 = GIỮ 60 lượt/giờ/IP, bộ đếm bộ nhớ (không đổi schema Supabase khi chưa có yêu cầu).
- TD-44 (bố cục màn rộng cho Trang chủ/Công cụ/Tôi) = KHÔNG làm (cần duyệt thiết kế); PR = chưa tạo; đề án v1.2 coi như xác nhận ngầm.
- HM-14/TD-26/TD-01/TD-16 vẫn cần máy thật/ảnh thật/AI thật — trợ lý không làm được.
- Chưa kiểm: giao diện tối và các màn sau khi đổi màu; theme-color #00BFA5 và icon PWA chưa đồng bộ màu mới.

# BÀN GIAO — GIAYTO — Phiên P18 — 2026-10-13 (phần P17 bên dưới giữ nguyên làm lịch sử)

## P18 tóm tắt (đọc trước)
Yêu cầu người dùng: "Thực thi xử lý phần nợ kỹ thuật còn lại, trừ phần chụp ảnh thật". Skill v3.2.0, chế độ 3.
- Mã: nhánh **claude/tieu-tuc-thuc-thi-de-an-k1h8nz** (fast-forward từ claude/read-content-continue-progress-1a7044), thư mục giayto/. Chưa tạo PR.
- Đóng 16 nợ (chi tiết + mức kiểm: app/docs/NO-KY-THUAT.md mục "P18"): TD-04, 13, 14, 17, 19, 22, 27, 30, 32, 33, 34, 37, 38, 40, 42, 45.
- Lỗi thật đáng chú ý đã sửa: chứng thư tạo trong app với tên có dấu không mở lại được (không ký được) + 5 lỗi ký số khác;
  dải chọn bộ lọc màn Lọc bị bóp còn 4 px; nút Áp dụng màn Cắt ngoài đáy ở màn 640 px; thanh trượt hiện 55 lưu 0 khi cử chỉ bị hủy;
  liên kết chia sẻ cho đoán mật khẩu không giới hạn; script đồng bộ tiến độ ghi đè TIEP-THEO.md.
- Kiểm: npm run check 190 tệp / 877 đạt; bun run check cũng đạt; CI GitHub Actions mới (.github/workflows/giayto-check.yml).
- MỚI: TD-46 tương phản màu thương hiệu (chủ dự án quyết). Còn mở: HM-14/TD-26/TD-01/TD-16 (máy thật, ảnh thật, AI thật), TD-28, TD-15… (quyết định).
- Môi trường P18: apt-get dùng được (đã cài tesseract-ocr-vie, poppler-utils); bun 1.4.2 có sẵn; playwright-core/wrangler cài ở thư mục riêng.
  Bẫy mới: `pgrep -f "mẫu"`/`pkill -f` khớp chính lệnh bash → mã 144; dùng `pgrep -f "[m]ẫu"` hoặc `pgrep -x`.

Skill: web-app-repair-upgrade v3.2.0 | Chế độ: 3 (theo đề án) | Lý do đóng phiên: người dùng yêu cầu đóng phiên + bàn giao (P17 đã làm HM-10, Q6, HM-12)

## 1. Dự án và môi trường
App: Ghi Nhanh — Quét tài liệu (giayto-scan): React 19 + TanStack Start (SSR, Cloudflare) + Tailwind 4 + PWA, dự án Lovable (không viết lại lịch sử git).
Dữ liệu: IndexedDB ("ghi-nhanh" v2, "ghi-nhanh-jobs", "ghi-nhanh-journal") + localStorage + Supabase khi đăng nhập. Playwright (V3) khả dụng: CÓ.
Quy ước: chỉnh style chỉ ở lớp Tailwind/styles.css; không format hàng loạt; không đổi chuỗi JS khi đổi font; AGENTS.md (BgQueue, image-input.ts).
## Công thức môi trường (đã chạy được ở phiên này — tiết kiệm thời gian cho phiên sau)
- Cài đặt: `npm install --legacy-peer-deps` (KHÔNG dùng `bun install` ngoài Lovable: registry trong bun.lock trả 403). Kiểm tổng: `npm run check` (typecheck + vitest + lint:src) phải thoát mã 0.
- Chạy bản build bằng wrangler (app build cho Cloudflare): `npx vite build` → `npx wrangler@4 dev -c .output/server/wrangler.json --port <cổng> --ip 127.0.0.1`. Cài wrangler/playwright-core Ở THƯ MỤC RIÊNG (không vào dự án). Wrangler thỉnh thoảng lỗi mạng thoáng qua khi khởi động → thử lại tối đa 3 lần.
- Chromium có sẵn: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (Playwright Node, `executablePath`). Đặt `LANG=C.UTF-8` nếu kiểm tên tệp tải về có dấu.
- Localhost tắt service worker: dùng `?sw=on` khi thử ngoại tuyến.
- Thử gọi AI trong sandbox cần build với `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` giả và `--var SUPABASE_URL:... SUPABASE_PUBLISHABLE_KEY:...` cho wrangler (nếu không, lệnh gọi không tới máy chủ).
- Cổng R6.1: `npx vite dev --port 8081` rồi `node scripts/playwright/kiem-cong-r61.mjs ...` (xem đầu tệp).
- Bẫy đã gặp: (1) `pkill -f "mẫu"` tự khớp chính lệnh bash chứa mẫu đó → dừng giữa chừng (mã 144) — dùng `pgrep -x workerd`/`kill` theo PID; (2) lệnh `str.replace` không khớp thì im lặng → luôn `assert` trước khi thay; (3) chép từ thư mục làm việc đè lên bản đóng gói làm mất ghi chú (đã xảy ra với TIEP-THEO.md); (4) xoá phần tử toast bằng script làm sập thư viện toast — đọc, đừng xoá.
- Sandbox P17: vite dev cần `--host 127.0.0.1` (không IPv6); playwright PYTHON phải đúng bản (`pip install playwright==1.56.0` cho chromium-1194); không có tesseract → dùng shim tesseract.js (npm tesseract.js@7.0.0 + @tesseract.js-data/vie, cùng cách TD-42); `pkill -f vite` làm chết chính lệnh bash (mã 144) — dùng pgrep/kill theo PID.
- Mọi script kiểm chứng nằm ở `app/scripts/playwright/` (kiem-*.mjs); đầu mỗi tệp có cách chạy.

## 2. Đề án và trạng thái (khớp backlog.json)
Đề án: v1.2 (v1.0 duyệt 12/10; v1.1 xác nhận 13/10; v1.2 chờ xác nhận) — de-an/DE_AN_GIAYTO_v1.2.docx. Kết quả (P17): 14/18 đạt, 3 hủy (HM-02, HM-16, HM-18), 1 chờ (HM-14).
| ID | Tên | Ưu tiên | Kết quả | ZIP |
|----|-----|---------|---------|-----|
| HM-01 | Bộ kiểm thử thoát mã 0 + cài đặt tái lập | P1 | Đạt V2 | GIAYTO_P02_HM01_20261012.zip |
| HM-02 | Xin lưu trữ bền vững + hiện dung lượng | P1 | Hủy | GIAYTO_P03_HM02_20261012.zip |
| HM-03 | Bảo vệ server function AI | P1 | Đạt V3 | GIAYTO_P06_HM03_20261012.zip |
| HM-04 | Thanh công cụ màn tài liệu không gãy hàng | P2 | Đạt V3 | GIAYTO_P05_HM04_20261012.zip |
| HM-05 | Vùng chạm và nhãn nút (Tôi, So sánh, Đăng nhập) | P3 | Đạt V3 | GIAYTO_P10_HM05_20261012.zip |
| HM-06 | Rà hook thiếu phụ thuộc + lỗi lint thật | P2 | Đạt V3 | GIAYTO_P09_HM06_20261012.zip |
| HM-07 | OCR: báo rõ khi không tải được gói nhận chữ (không tự lưu gói) | P2 | Đạt V3 | GIAYTO_P07_HM07_20261012.zip |
| HM-08 | Service worker: phiên bản theo build, không nuốt lỗi precache | P2 | Đạt V3 | GIAYTO_P08_HM08_20261012.zip |
| HM-09 | Đo tải trang; bỏ ~0,7 MB nạp sớm ở màn Công cụ | P3 | Đạt V3 | GIAYTO_P11_HM09_20261012.zip |
| HM-10 | Bố cục màn rộng (đề xuất) | P3 | Đạt V3 (P17; chưa đóng ZIP) | — |
| HM-11 | R6.1e: giữ khối màu bão hoà ở mép trang (Q3=a) | P2 | Đạt V3 | GIAYTO_P15_HM11_20261013.zip |
| HM-12 | R6.2 phần 2: so OCR với CamScanner | P2 | Đạt V3 (P17; app 98,68% vs Cam 98,88%) | — |
| HM-13 | Rà 13 mục S/V cũ đang dở | P3 | Đạt V1 | GIAYTO_P12_HM13_20261013.zip |
| HM-14 | R6.4 UAT máy thật + R6.5 đề án cuối | P2 | Chưa làm | — |
| HM-15 | App không bắt lỗi khi IndexedDB không dùng được | P2 | Đạt V3 | GIAYTO_P04_HM15_20261012.zip |
| HM-16 | Độ nghiêng dòng chữ cấp ô ≤0,5° trên ảnh Q (từ S11f/l/n/q) | P3 | Hủy | — |
| HM-17 | Q2: khai báo @testing-library/dom + script check, bun.lock khớp | P2 | Đạt V2 | GIAYTO_P14_Q2_20261013.zip |
| HM-18 | Dò mép giấy cho ảnh tạp chí có mặt bàn tối (NB: quad = null) | P3 | Hủy (Q6=a) | — |

## 3. Việc đã làm (tóm tắt; chi tiết trong ghi_chu_ban_giao của từng hạng mục)
Bộ kiểm thử thoát mã 0 (189 tệp/864); bắt lỗi IndexedDB; giới hạn AI 60/giờ/IP; thanh công cụ 1 hàng; vùng chạm ≥40 px (78→1); dọn lint; báo rõ khi không tải được gói nhận chữ; service worker theo bản build (giữ gói OCR); bỏ nạp sớm 0,7 MB ở màn Công cụ; giữ khối màu mép (cổng R6.1: NB 1→8/13, 221 ca cũ không hồi quy); package.json/script check; rà 13 mục cũ. Hủy HM-02 (phát hiện sai F-03).

## 4. Hạng mục kế tiếp
Trợ lý không còn hạng mục nào làm một mình. Còn lại:
1. **HM-14**: người dùng thử máy thật Android/iPhone theo 12 tình huống B13; gộp V0 (ảnh 12 MP), S12c (AI thật 3 lời gọi, kiểm UI Chẩn đoán), TD-01, TD-15 (4 quyết định chủ dự án). Xem: bố cục sau khi Button cao hơn (TD-27), màn Tài liệu 2 cột (HM-10), có gặp lỗi dò khung như NB không.
2. Người dùng xác nhận đề án v1.2; mức 60 lượt AI/giờ giữ hay đổi (TD-28).
3. Tạo PR từ nhánh claude/read-content-continue-progress-1a7044 nếu muốn (chưa tạo).
4. Khi chốt: phát hành đề án bản cuối (R6.5/báo cáo tổng) — gói R6.5 cũ cần đề án nền v4 (không có trong ZIP; TD-41).
5. Tùy chọn: mở rộng bố cục màn rộng sang Trang chủ/Công cụ/Tôi (cần duyệt thiết kế, TD-44); chạy lại so-ocr.py bằng tesseract gốc (TD-42); thêm trang mẫu OCR (TD-43).

## 5. Việc dở dang chính xác
Không có. Mọi hạng mục đã đóng trọn hoặc hoãn có chủ đích.

## 6. Quyết định đã chốt (không đảo ngược nếu chưa có bằng chứng mới)
- S0 chỉ đọc: chưa sửa mã nguồn app — theo skill Mục 4.2.
- Kiểm thử dùng npm (không dùng bun.lock) vì registry trong lockfile trả 403 ngoài Lovable.
- Công cụ kiểm thử (playwright-core, wrangler) cài ở thư mục riêng, không thêm vào dự án.
- Người dùng gõ 'HM-01' = duyệt đề án v1.0 + bắt đầu HM-01 (12/10/2026). Q1–Q3 CHƯA trả lời.
- Q2 chưa chốt → mặc định an toàn: không sửa package.json; HM-01 chỉ sửa test + ghi lệnh/mã thoát vào TIEP-THEO.md.
- HM-01 sửa ở test (kho IndexedDB giả rỗng, không thêm thư viện); lỗi phía app ghi thành HM-15, không sửa lén.
- HM-02 đóng HUY: không đổi mã (phát hiện sai).
- HM-15: khi kho IndexedDB không dùng được, app mở với danh sách rỗng + toast riêng 1 lần; không chặn app.
- HM-04: sửa bằng lớp Tailwind trong doc.$id.tsx, không đổi nhãn nút.
- HM-04: sửa bằng lớp Tailwind trong doc.$id.tsx, không đổi nhãn nút.
- Q1 = (b): AI cho dùng khi chưa đăng nhập nhưng giới hạn theo IP mỗi giờ (người dùng chốt 12/10/2026).
- HM-03: mặc định 60 lần/giờ/IP; bộ đếm trong bộ nhớ, chấp nhận giới hạn nêu ở ghi chú; nâng lên bộ đếm bền (cần bảng Supabase) chỉ khi bạn muốn.
- HM-07: chọn phương án 'báo rõ' (thẻ cho phép 'hoặc'), không tự lưu gói OCR; hạng mục đổi tên cho đúng thực tế.
- HM-08: mã bản build đi qua ?v= của địa chỉ đăng ký SW (không sửa sw.js lúc build); gói OCR đổi tên cố định gn-ocr-v1 và được chuyển từ gn-vN-ocr.
- HM-06: giữ có lý do (eslint-disable kèm chú thích) thay vì đổi mã khi cảnh báo là báo giả; không đụng tệp tự sinh; không bật rule lint mới.
- HM-05: ngưỡng vùng chạm 40 px (đề án); tăng kích thước Button dùng chung thay vì chỉ vá từng màn; công tắc dùng vùng chạm vô hình 44 px; liên kết giữa câu là ngoại lệ.
- HM-09: chỉ sửa nơi số đo cho thấy nạp sớm (/tools); không đụng trang chủ/tài liệu; ký số tải trước khi rảnh để giữ ngoại tuyến.
- HM-13: không chạy lại dong-bo-tien-do.py; chỉ cập nhật tien-do.json cho 13 mục; mục chờ dữ liệu giữ trạng thái 'cho'.
- v1.1 là báo cáo tổng + cập nhật đề án; v1.0 vẫn ở ZIP P01–P12 (không còn trong de-an/ của ZIP mới).
- 13/10/2026 người dùng xác nhận đề án v1.1.
- Q2 = có: sửa package.json (devDependency @testing-library/dom, script typecheck/lint:src/check) + bun.lock khớp.
- Q3 = (a): HM-11 sửa BỘ LỌC giữ khối màu bão hòa ở mép (không nới cổng đo).
- Q4 = không: KHÔNG tự lưu gói nhận chữ; giữ 'báo rõ + nút Tải sẵn'.
- Q6 = (a): chấp nhận 5 ca NB trượt (13/10/2026); HM-18 hủy, TD-29 chấp nhận.
- Q5 = (a): chấp nhận độ nghiêng dòng chữ hiện tại; chỉ tiêu mới ≤1° ở ô mực ≥500 làm thông tin, không phải cổng. LƯU Ý: số đo 13/10 vẫn vượt ở 2 ô (…555 d0P 2,25°, …556 d0T 1,75°) — chấp nhận theo quyết định vì nhìn thẳng.
- HM-11: chọn bảo vệ khối màu ở DẢI MÉP (không toàn trang) vì toàn trang làm ΔL tụt; hướng 'khôi phục theo toạ độ nguồn' bị loại (hình học dịch chuyển).
- Đóng phiên P16: không đổi mã app so với P15; chỉ cập nhật tien-do.json, LO-TRINH.md, docs/NO-KY-THUAT.md, đề án v1.2, hồ sơ bàn giao.

## 7. Lỗi nền / nợ kỹ thuật
Đầy đủ ở `app/docs/NO-KY-THUAT.md` (mục 0 cập nhật 13/10: đã đóng + TD-26…TD-41 còn mở) và tóm tắt ở `handover/TIEN_DO_VA_NO_KY_THUAT.md`. Nhắc các nợ quan trọng nhất: TD-26 (chưa máy thật/Cloudflare/AI thật), TD-27 (Button cao hơn toàn app), TD-28 (giới hạn AI trong bộ nhớ), TD-29 (5 ca NB), TD-30 (SW: chưa thử nâng cấp từ SW cũ thật; đặt BUILD_ID), TD-39 (chưa commit).

## 8. Việc người dùng cần làm
(P18) Còn lại: thử máy thật HM-14 (gồm màn Cắt/Lọc đã sửa bố cục, ký số với chứng thư thật) • quyết TD-46 (màu thương hiệu) • TD-28 (giữ 60/giờ? bộ đếm bền?) • xác nhận đề án v1.2 • tạo PR từ nhánh claude/tieu-tuc-thuc-thi-de-an-k1h8nz nếu muốn.
(P17) Còn lại: xác nhận đề án v1.2 • mức 60 lượt AI/giờ • thử máy thật (HM-14) • tùy chọn: đọc rà chữ chuẩn trang NB, tạo PR. (Danh sách cũ bên dưới đã xử lý: Q6, đẩy GitHub, ảnh Cam.)
Xác nhận đề án v1.2 • Q6 • mức 60 lượt AI/giờ có phù hợp • cho phép đẩy GitHub • gửi ảnh Cam + chạy tesseract tiếng Việt (HM-12) • thử máy thật (HM-14) • đặt BUILD_ID khi build (tuỳ chọn).

## 9. Đường lui
P18: mỗi nhóm là một commit riêng trên nhánh claude/tieu-tuc-thuc-thi-de-an-k1h8nz (git revert từng commit được); ZIP GIAYTO_P18_NOKYTHUAT_20261013.zip. Chứng thư .p12 do app tạo ở bản mới dùng CN UTF8String — bản cũ vẫn đọc được.
Mã app = ZIP P17 (P17 đổi app-shell.tsx + documents.tsx so với P15/P16; hoàn tác HM-10: về ZIP P15/P16). Hoàn tác từng hạng mục: dùng ZIP của hạng mục trước (bảng ở Mục 2 + de-an Mục 10). Bản gốc: GIAYTO_P01_KHOITAO_20261012.zip (checksum baseline/BASELINE.sha256 trong ZIP đó).

## 10. File đã chạm trong phiên P17
src/components/app-shell.tsx, src/routes/documents.tsx (HM-10), scripts/playwright/kiem-man-rong.mjs, de-an-nang-cap-scan/kiem-chung/bo-anh-NB/cam/* (8 PDF Cam) + README, kiem-chung/R6.2/*, tien-do.json, LO-TRINH.md, docs/NO-KY-THUAT.md, handover/*, evidence/hm10*, hm12*.

## 10b. (cũ) File đã chạm trong phiên P16
de-an-nang-cap-scan/tien-do.json (+18 mục HM-xx), LO-TRINH.md (bảng đếm), docs/NO-KY-THUAT.md (mục 0 mới), de-an/DE_AN_GIAYTO_v1.2.docx, handover/*.

## 11. Nhật ký ngắn
- Đề án P01–P15: S0 → 15 ZIP hạng mục (xem Mục 2).
- P16: cập nhật tiến độ, nợ kỹ thuật, đề án v1.2, hồ sơ bàn giao; kiểm ZIP bằng MANIFEST.

- P17 (13/10/2026): HM-10 xong — /documents 2 cột từ 1024 px (AppShell prop wide). Mã đã commit lên nhánh claude/read-content-continue-progress-1a7044 (thư mục giayto/); TD-39 đóng.
- P17: nhận 2 PDF "Ảnh gốc bài báo Ninh Bình": tệp 1 trùng byte với goc/IMG_NB_01.jpg; tệp 2 (2197×3009, đã xử lý) đặt vào cam/IMG_NB_01_cam-chua-ro-che-do.pdf. Sandbox không có tesseract (apt không có gói; tải vie.traineddata bị 403) → HM-12 chưa chấm được; cần máy có tesseract-ocr-vie. 6 PDF + JPG về biên bản thế chấp là SAI trang và có dữ liệu cá nhân — không đưa vào repo.
- P17: nhận thêm 7 PDF "CSN" (đúng trang NB, 1271×1800) đặt vào cam/: thang-xam, sinh-thai, den-trang, khong-bong, than-ky-magic, tang-cuong, lam-sang. Dữ liệu Cam đã đủ; còn thiếu duy nhất tesseract tiếng Việt để chạy chay-app.py + so-ocr.py (HM-12).
- P17: HM-12 chạy xong bằng shim tesseract.js (xem backlog). Kết quả ĐẠT (chênh −0,2 điểm, ngưỡng −2). Nên xác nhận lại trên tesseract CLI gốc nếu muốn chặt chẽ.
- P18 (13/10/2026): xử lý 16 nợ kỹ thuật (xem đầu tệp + NO-KY-THUAT.md mục P18); CI GitHub; ZIP P18.
