# BÀN GIAO ĐÓNG PHIÊN — GIAYTO — Phiên P16 — 2026-10-13
Skill: web-app-repair-upgrade v3.2.0 | Chế độ: 3 (theo đề án) | Lý do đóng phiên: người dùng yêu cầu bàn giao tiến độ + nợ kỹ thuật cho phiên sau

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
- Mọi script kiểm chứng nằm ở `app/scripts/playwright/` (kiem-*.mjs); đầu mỗi tệp có cách chạy.

## 2. Đề án và trạng thái (khớp backlog.json)
Đề án: v1.2 (v1.0 duyệt 12/10; v1.1 xác nhận 13/10; v1.2 chờ xác nhận) — de-an/DE_AN_GIAYTO_v1.2.docx. Kết quả: 12/18 đạt, 2 hủy (HM-02, HM-16), 4 chờ/hoãn.
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
| HM-12 | R6.2 phần 2: so OCR với CamScanner | P2 | Chưa làm | — |
| HM-13 | Rà 13 mục S/V cũ đang dở | P3 | Đạt V1 | GIAYTO_P12_HM13_20261013.zip |
| HM-14 | R6.4 UAT máy thật + R6.5 đề án cuối | P2 | Chưa làm | — |
| HM-15 | App không bắt lỗi khi IndexedDB không dùng được | P2 | Đạt V3 | GIAYTO_P04_HM15_20261012.zip |
| HM-16 | Độ nghiêng dòng chữ cấp ô ≤0,5° trên ảnh Q (từ S11f/l/n/q) | P3 | Hủy | — |
| HM-17 | Q2: khai báo @testing-library/dom + script check, bun.lock khớp | P2 | Đạt V2 | GIAYTO_P14_Q2_20261013.zip |
| HM-18 | Dò mép giấy cho ảnh tạp chí có mặt bàn tối (NB: quad = null) | P3 | Hoãn | — |

## 3. Việc đã làm (tóm tắt; chi tiết trong ghi_chu_ban_giao của từng hạng mục)
Bộ kiểm thử thoát mã 0 (189 tệp/864); bắt lỗi IndexedDB; giới hạn AI 60/giờ/IP; thanh công cụ 1 hàng; vùng chạm ≥40 px (78→1); dọn lint; báo rõ khi không tải được gói nhận chữ; service worker theo bản build (giữ gói OCR); bỏ nạp sớm 0,7 MB ở màn Công cụ; giữ khối màu mép (cổng R6.1: NB 1→8/13, 221 ca cũ không hồi quy); package.json/script check; rà 13 mục cũ. Hủy HM-02 (phát hiện sai F-03).

## 4. Hạng mục kế tiếp (đủ để làm ngay khi có dữ liệu/quyết định)
Không còn hạng mục nào trợ lý làm một mình ngoài HM-10 (tùy chọn, bố cục màn rộng).
1. **Q6** (HM-18): 5 ca ảnh NB còn trượt cổng R6.1 vì app không dò được mép giấy (quad=null, góc trên-trái là mặt bàn tối): (a) chấp nhận [đề xuất] / (b) HM-18 cải thiện dò mép (cỡ M) / (c) nới cổng.
2. **HM-12**: cần ảnh CamScanner cùng trang (JPG/PDF; Auto + Magic Color + Original) vào `de-an-nang-cap-scan/kiem-chung/bo-anh-NB/cam/` và máy có tesseract tiếng Việt: `python3 scripts/kiem-chung-r62/chay-app.py` rồi `so-ocr.py` (ngưỡng OCR ≥ Cam − 2%).
3. **HM-14**: người dùng thử máy thật Android/iPhone theo 12 tình huống B13; gộp V0 (ảnh 12 MP), S12c (AI thật 3 lời gọi, kiểm UI Chẩn đoán), TD-01, TD-15 (4 quyết định chủ dự án). Đặc biệt xem: bố cục sau khi Button cao hơn (TD-27), có gặp lỗi dò khung như NB không.
4. Cho phép **commit/đẩy lên nhánh `claude/web-app-upgrade-o0g6az`** (TD-39) — trợ lý sẽ commit từ ZIP mới nhất.
5. Khi chốt: phát hành đề án bản cuối (R6.5/báo cáo tổng) — chú ý gói R6.5 cũ cần đề án nền v4 (không có trong ZIP).

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
- Q5 = (a): chấp nhận độ nghiêng dòng chữ hiện tại; chỉ tiêu mới ≤1° ở ô mực ≥500 làm thông tin, không phải cổng. LƯU Ý: số đo 13/10 vẫn vượt ở 2 ô (…555 d0P 2,25°, …556 d0T 1,75°) — chấp nhận theo quyết định vì nhìn thẳng.
- HM-11: chọn bảo vệ khối màu ở DẢI MÉP (không toàn trang) vì toàn trang làm ΔL tụt; hướng 'khôi phục theo toạ độ nguồn' bị loại (hình học dịch chuyển).
- Đóng phiên P16: không đổi mã app so với P15; chỉ cập nhật tien-do.json, LO-TRINH.md, docs/NO-KY-THUAT.md, đề án v1.2, hồ sơ bàn giao.

## 7. Lỗi nền / nợ kỹ thuật
Đầy đủ ở `app/docs/NO-KY-THUAT.md` (mục 0 cập nhật 13/10: đã đóng + TD-26…TD-41 còn mở) và tóm tắt ở `handover/TIEN_DO_VA_NO_KY_THUAT.md`. Nhắc các nợ quan trọng nhất: TD-26 (chưa máy thật/Cloudflare/AI thật), TD-27 (Button cao hơn toàn app), TD-28 (giới hạn AI trong bộ nhớ), TD-29 (5 ca NB), TD-30 (SW: chưa thử nâng cấp từ SW cũ thật; đặt BUILD_ID), TD-39 (chưa commit).

## 8. Việc người dùng cần làm
Xác nhận đề án v1.2 • Q6 • mức 60 lượt AI/giờ có phù hợp • cho phép đẩy GitHub • gửi ảnh Cam + chạy tesseract tiếng Việt (HM-12) • thử máy thật (HM-14) • đặt BUILD_ID khi build (tuỳ chọn).

## 9. Đường lui
Mã app = ZIP P15 (P16 chỉ thêm tài liệu/tiến độ). Hoàn tác từng hạng mục: dùng ZIP của hạng mục trước (bảng ở Mục 2 + de-an Mục 10). Bản gốc: GIAYTO_P01_KHOITAO_20261012.zip (checksum baseline/BASELINE.sha256 trong ZIP đó).

## 10. File đã chạm trong phiên P16
de-an-nang-cap-scan/tien-do.json (+18 mục HM-xx), LO-TRINH.md (bảng đếm), docs/NO-KY-THUAT.md (mục 0 mới), de-an/DE_AN_GIAYTO_v1.2.docx, handover/*.

## 11. Nhật ký ngắn
- Đề án P01–P15: S0 → 15 ZIP hạng mục (xem Mục 2).
- P16: cập nhật tiến độ, nợ kỹ thuật, đề án v1.2, hồ sơ bàn giao; kiểm ZIP bằng MANIFEST.

- P17 (13/10/2026): HM-10 xong — /documents 2 cột từ 1024 px (AppShell prop wide). Mã đã commit lên nhánh claude/read-content-continue-progress-1a7044 (thư mục giayto/); TD-39 đóng.
