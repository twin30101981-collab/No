Áp dụng skill web-app-repair-upgrade v3.2.0 cho phiên P25 của đề án GIAYTO (đề án v2.0 = báo cáo rà soát lộ trình; mã hạng mục CS/BL/AI/TF/FX/LN).

NGUỒN (phiên mới không có tệp tải lên — lấy từ repo):
- Repo `twin30101981-collab/No`, nhánh `ccr-981d2f3e-vfhva8`, thư mục `ban-giao/`:
  - `GIAYTO_P25_CS17B_20261014.zip` = ZIP bàn giao MỚI NHẤT (điểm làm tiếp; P25 đã xong CS-17a, CS-17b — nếu P25 bị cắt, làm tiếp từ CS-17d)
  - `Web-app-repair-upgrade-skill-v3.2.0.md` = skill (đọc Mục 1–13; phụ lục chỉ khi cần)

QUYỀN NGƯỜI DÙNG ĐÃ CHỐT (P21, giữ nguyên):
- TỰ CHẠY các hạng mục kế tiếp theo đề xuất, KHÔNG hỏi lại người dùng giữa các hạng mục cho tới hết phiên.
- Mỗi hạng mục xong: ZIP riêng → SendUserFile → commit + push ZIP vào `ban-giao/` (thay ZIP cũ). Không tạo pull request.
- Đóng phiên theo skill ở ~80% ngữ cảnh (hoặc sớm hơn khi đã rất nhiều lượt công cụ, ~140+): ZIP đóng phiên → commit + push → tự mở phiên mới (create_session, cùng repo/nhánh) với prompt này đã cập nhật → phiên mới tiếp tục tự chạy.
- Vẫn PHẢI dừng hỏi nếu: nguy cơ mất dữ liệu không có đường lui; đổi schema/API/xác thực ngoài phạm vi đề án; lộ bí mật; cần thêm thư viện mới (vd. @anthropic-ai/sdk cho AI-01/AI-04 — chưa được duyệt).

VIỆC CẦN LÀM:
1. Checkout nhánh (git pull — nhánh cục bộ có thể đi sau origin); giải nén ZIP mới nhất vào scratchpad, đọc `handover/HANDOVER.md` (ĐẦU TỆP = P24) và `handover/backlog.json`, xác minh `handover/MANIFEST.sha256`. Ghi "Phiên P25" vào HANDOVER.
2. `cd app && rm -f tsconfig.tsbuildinfo && npm install --legacy-peer-deps && npm run check` (mốc P24: 215 tệp / 1017 đạt, lint 0 lỗi, thoát 0). Kiểm môi trường 1 lần: Chromium /opt/pw-browsers/chromium-1194; cài playwright-core@1.56.0 và wrangler@4 ở THƯ MỤC RIÊNG; chép kịch bản Playwright cạnh node_modules của playwright-core để chạy. Giữ một bản `app/` CHƯA SỬA (chép trước khi sửa) + symlink node_modules + build/vite cổng khác để ĐỐI CHIẾU MÃ CŨ.
3. Hạng mục kế tiếp (tự chạy, mỗi hạng mục: tái hiện/đo bằng chạy thật → sửa → kiểm V3/V2 → ZIP → push):
   CS-17a (M: tối ưu bước làm sạch mép/docChain nóng nhất, ảnh ra TRÙNG BYTE — công cụ + mốc ở `evidence/CS-17/HUONG-DAN.md`)
   → CS-17b (M: warp/flatten rời luồng chính) → CS-17c (S: heap + 20 ảnh Thêm < 70 s)
   → CS-03b / CS-04b (+ CS-07 ở CPU 4×).
   AI-01/AI-04/AI-05 (và phần còn lại của FX-01 = AI-02) cần thư viện mới → chỉ làm khi người dùng duyệt.
4. BẪY MÔI TRƯỜNG: camera giả dùng đường dẫn TUYỆT ĐỐI; ảnh nguồn `evidence/anh-thu/tao-anh-to-giay.py <thư mục> <số ảnh>` (không có hạt ngẫu nhiên cố định) rồi `SO_KHUNG=12 tao-camera-gia.py`; ca "Kiểm mép" cần camera MÉP MỜ: dùng `evidence/anh-thu/anh-mep-mo.jpg`. Ảnh 01 hay bị coi "chụp màn hình" (không dựng lại — kiem-cs09b đã tính). Kịch bản tên tệp tiếng Việt chạy với `LANG=C.UTF-8`; sau khi sửa tệp phải khởi động lại vite trước kịch bản `import("/src/lib/…")`; đo tốc độ trên BẢN BUILD (`vite build` + `wrangler dev -c .output/server/wrangler.json --compatibility-date 2026-10-13` — qua nửa đêm UTC build ghi ngày mới mà wrangler chưa hỗ trợ); giết tiến trình theo PID (KHÔNG `pkill -f`). vitest KHÔNG kiểm kiểu → `npm run typecheck` sau khi thêm test. Hộp chọn tệp: truyền buffer. page.evaluate nạp ≥6 ảnh base64 làm trang sập. `saveDoc(doc, false)` không thêm tài liệu MỚI vào bộ đệm. Máy P24 chậm hơn máy P23 ~1,7× → so mã cũ/mới CÙNG máy, không so số tuyệt đối giữa phiên. Lệnh chạy > 10 phút: chạy nền + chờ bằng vòng `until`.
5. Theo dõi ngưỡng ngữ cảnh, giữ dự trữ đóng gói 15%; chỉ trả lời tiếng Việt, ngắn gọn.
