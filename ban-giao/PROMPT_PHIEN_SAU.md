Áp dụng skill web-app-repair-upgrade v3.2.0 cho phiên P30 của đề án GIAYTO (đề án v2.0 = báo cáo rà soát lộ trình; mã hạng mục CS/BL/AI/TF/FX/LN).

NGUỒN (phiên mới không có tệp tải lên — lấy từ repo):
- Repo `twin30101981-collab/No`, nhánh `ccr-981d2f3e-vfhva8`, thư mục `ban-giao/`:
  - `GIAYTO_P29_DONGPHIEN_20261014.zip` = ZIP bàn giao MỚI NHẤT (điểm làm tiếp)
  - `Web-app-repair-upgrade-skill-v3.2.0.md` = skill (đọc Mục 1–13; phụ lục chỉ khi cần)

QUYỀN NGƯỜI DÙNG ĐÃ CHỐT (P21, giữ nguyên):
- TỰ CHẠY các hạng mục kế tiếp theo đề xuất, KHÔNG hỏi lại người dùng giữa các hạng mục cho tới hết phiên.
- Mỗi hạng mục xong: ZIP riêng → SendUserFile → commit + push ZIP vào `ban-giao/` (thay ZIP cũ). Không tạo pull request.
- Đóng phiên theo skill ở ~80% ngữ cảnh (hoặc sớm hơn khi đã rất nhiều lượt công cụ, ~140+): ZIP đóng phiên → commit + push → tự mở phiên mới (create_session, cùng repo/nhánh) với prompt này đã cập nhật → phiên mới tiếp tục tự chạy.
- Vẫn PHẢI dừng hỏi nếu: nguy cơ mất dữ liệu không có đường lui; đổi schema/API/xác thực ngoài phạm vi đề án; lộ bí mật; cần thêm thư viện mới (vd. @anthropic-ai/sdk cho AI-01/AI-04 — chưa được duyệt).

VIỆC CẦN LÀM:
1. `git pull origin ccr-981d2f3e-vfhva8` (HEAD có thể tách rời: `git checkout -B ccr-981d2f3e-vfhva8 FETCH_HEAD`); giải nén ZIP mới nhất vào scratchpad, đọc `handover/HANDOVER.md` (ĐẦU TỆP = P29) và `handover/backlog.json`, xác minh `handover/MANIFEST.sha256`. Ghi "Phiên P30" vào HANDOVER.
2. `cd app && rm -f tsconfig.tsbuildinfo && npm install --legacy-peer-deps && npm run check` (mốc P29: 221 tệp / 1049 đạt, lint 0 lỗi, thoát 0). Kiểm môi trường 1 lần: Chromium /opt/pw-browsers/chromium-1194; cài playwright-core@1.56.0 và wrangler@4 ở THƯ MỤC RIÊNG; chép kịch bản Playwright cạnh node_modules của playwright-core để chạy. Giữ một bản `app/` CHƯA SỬA (chép trước khi sửa) + symlink node_modules + build riêng để ĐỐI CHIẾU MÃ CŨ.
3. Hạng mục kế tiếp (tự chạy, mỗi hạng mục: tái hiện/đo bằng chạy thật → sửa → kiểm V3/V2 → ZIP → push):
   P29 đã xong: CS-07b ĐẠT-V3 (Áp tất cả: mốc trong trang kiem-cs07b-tach.mjs; qualityCache). CS-17f DANG_SUA — vi chỉnh bão hoà ≈67 % P24; CHỜ NGƯỜI DÙNG chọn (a) chấp nhận/(b) đổi kiến trúc/(c) huỷ → KHÔNG tự làm tiếp.
   CS-16 (S, P2): bỏ phóng to giả — cạnh dài đầu ra = min(mức, ảnh thật), ghi DPI thật (lib/image.ts, lib/capture.ts, routes/scan.tsx). Tiêu chí: dựng đủ nhanh ≥ 1,8×; cổng R6.1 không tụt (tìm kịch bản cổng R6.1 trong app/scripts + evidence). Đổi đầu ra có chủ đích (không trùng byte) → đối chiếu ảnh/điểm cổng với mã cũ cùng máy.
   → CS-13 (S, P3): đo ngân sách §17.1 tự động trong perf-stats, cảnh báo khi vượt. → FX-02 / FX-04 (S, P3).
   AI-01/AI-04/AI-05 (và AI-02) cần thư viện mới → chỉ làm khi người dùng duyệt.
4. CÔNG CỤ ĐO (evidence/CS-17a/KET-QUA.md): chạy TS thẳng bằng `ROOT=$PWD/src node --experimental-strip-types --no-warnings --import <evidence/CS-17a/reg.mjs> <kịch bản>` (số dòng hồ sơ CPU = dòng nguồn; `hotline.js <thư mục prof> <tệp.ts>`); băm trùng byte: evidence/CS-17/bam-buoc-lam-sach.ts + unit cs17a-trung-byte.test.ts (băm vàng) — PHẢI giữ đạt.
5. BẪY MÔI TRƯỜNG: camera giả dùng đường dẫn TUYỆT ĐỐI; ảnh nguồn `evidence/anh-thu/tao-anh-to-giay.py <thư mục ĐÃ TẠO> <số ảnh>` (thư mục phải tồn tại trước; không có hạt cố định) rồi `SO_KHUNG=12 tao-camera-gia.py`; ca "Kiểm mép" dùng `evidence/anh-thu/anh-mep-mo.jpg`. Kịch bản tên tệp tiếng Việt chạy với `LANG=C.UTF-8`; vite dev phải `--host 127.0.0.1` (IPv6 lỗi); khởi bằng setsid thì `$!` KHÔNG phải PID nhóm — lấy PID bằng pgrep rồi kill theo PGID (evidence/CS-17d: wr.sh/vd.sh trong KET-QUA); wrangler cũ còn sống sẽ nạp bản build mới nửa vời (404) → kiểm `ps` trước khi khởi; sau khi sửa tệp phải khởi động lại vite trước kịch bản `import("/src/lib/…")`; đo tốc độ trên BẢN BUILD (`vite build` + `wrangler dev -c .output/server/wrangler.json --compatibility-date 2026-10-13`). Giết tiến trình theo PID GHI LÚC KHỞI (KHÔNG `pkill -f`, KHÔNG `grep "[v]ite --port"` — khớp cả lệnh bash đang chạy); wrangler cũ để lại workerd giữ cổng → kiểm `ps` trước khi khởi. vitest KHÔNG kiểm kiểu → `npm run typecheck` sau khi thêm test; test đọc tệp nguồn dùng đường dẫn tương đối `src/lib/...` (jsdom không nhận URL file). createImageBitmap(img,{colorSpaceConversion:"none"}) giải mã lại ở luồng chính — tránh. kiem-cs09b chọn bộ lọc bright/magic/original (CS-05), không qua docchain. Uint8ClampedArray làm tròn nửa-về-chẵn (v+0,5 làm số lẻ +1) — giữ để trùng byte. Máy P26 chậm hơn P25; máy P25 nhanh hơn P24 → chỉ so cũ/mới CÙNG máy. Lệnh chạy > 10 phút: chạy nền + chờ bằng vòng `until`.
6. Theo dõi ngưỡng ngữ cảnh, giữ dự trữ đóng gói 15%; chỉ trả lời tiếng Việt, ngắn gọn.

8. Bẫy P27: máy P27 chậm hơn P26 và ồn (20 ảnh dao động ±4 s) → đo xen kẽ cũ/mới ≥ 3 lượt. Hồ sơ CPU trên bản build: phần lớn là "(program)" (vẽ video khi CPU 6×). ONLY=x buoc.mjs chỉ chạy 1 lần/bước — đừng dùng để so. Kịch bản chờ dài: dùng vòng `until` trong lệnh nền, không để lệnh foreground quá 10 phút.
7. Bẫy P26: thu nhỏ ảnh <img> (drawImage cỡ nhỏ) ≠ ImageBitmap (giải mã JPEG theo tỉ lệ) → đừng chuyển bước đó sang Worker nếu cần trùng byte. Kịch bản long-task đôi khi lỗi IDB "object stores not found" khi máy chủ chưa sẵn — chạy lại.

9. Bẫy P28: kịch bản Playwright đo từ Node bị cộng độ trễ của tác vụ CDP (evaluate/boundingBox xếp sau việc nền, có thể 1–8 s ở CPU 6×) trong khi chạm thật được ưu tiên → luôn đo kèm mốc trong trang (event.timeStamp, MutationObserver, LoAF) để tách. Bản build không nén tên hàm để hồ sơ: `npx vite build --minify false` trong bản sao riêng. Màn tài liệu sau Xong có thể mở lớp "Xem lại" (CS-06) che nút — đóng trước khi thao tác.

10. Bẫy P29: run.sh của công cụ đo dùng biến R → KHÔNG đặt biến môi trường R (ab.mjs dùng REP). Ảnh vào CS-17 sinh lại mỗi phiên (không có hạt) → luôn chạy mốc mã cũ trên cùng ảnh. Đo "Áp tất cả" bằng mốc trong trang (kiem-cs07b-tach.mjs), dao động ±0,5 s → ≥ 3 lượt xen kẽ.
