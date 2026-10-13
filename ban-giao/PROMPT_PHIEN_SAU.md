Áp dụng skill web-app-repair-upgrade v3.2.0 cho phiên P23 của đề án GIAYTO (đề án v2.0 = báo cáo rà soát lộ trình; mã hạng mục CS/BL/AI/TF/FX).

NGUỒN (phiên mới không có tệp tải lên — lấy từ repo):
- Repo `twin30101981-collab/No`, nhánh `ccr-981d2f3e-vfhva8`, thư mục `ban-giao/`:
  - `GIAYTO_P22_DONGPHIEN_20261013.zip` = ZIP bàn giao MỚI NHẤT (điểm làm tiếp)
  - `Web-app-repair-upgrade-skill-v3.2.0.md` = skill (đọc Mục 1–13; phụ lục chỉ khi cần)

QUYỀN NGƯỜI DÙNG ĐÃ CHỐT (P21, giữ nguyên):
- TỰ CHẠY các hạng mục kế tiếp theo đề xuất, KHÔNG hỏi lại người dùng giữa các hạng mục cho tới hết phiên.
- Mỗi hạng mục xong: ZIP riêng → SendUserFile → commit + push ZIP vào `ban-giao/` (thay ZIP cũ). Không tạo pull request.
- Đóng phiên theo skill ở ~80% ngữ cảnh (hoặc sớm hơn khi đã rất nhiều lượt công cụ): ZIP đóng phiên → commit + push → tự mở phiên mới (create_session, cùng repo/nhánh) với prompt này đã cập nhật → phiên mới tiếp tục tự chạy.
- Vẫn PHẢI dừng hỏi nếu: nguy cơ mất dữ liệu không có đường lui; đổi schema/API/xác thực ngoài phạm vi đề án; lộ bí mật; cần thêm thư viện mới (vd. @anthropic-ai/sdk cho AI-01/AI-04 — chưa được duyệt).

VIỆC CẦN LÀM:
1. Checkout nhánh; giải nén ZIP mới nhất vào scratchpad, đọc `handover/HANDOVER.md` (ĐẦU TỆP = P22) và `handover/backlog.json`, xác minh `handover/MANIFEST.sha256`. Ghi "Phiên P23" vào HANDOVER.
2. `cd app && rm -f tsconfig.tsbuildinfo && npm install --legacy-peer-deps && npm run check` (mốc P22: 209 tệp / 993 đạt, lint 0 lỗi, thoát 0). Kiểm môi trường 1 lần: Chromium /opt/pw-browsers/chromium-1194; cài playwright-core@1.56.0 và wrangler@4 ở THƯ MỤC RIÊNG; chép kịch bản Playwright cạnh node_modules của playwright-core để chạy.
3. Hạng mục kế tiếp (tự chạy, mỗi hạng mục: tái hiện bằng chạy thật → sửa → kiểm V3/V2 → ZIP → push):
   BL-05 (L — CHIA NHỎ trước: BL-05a một cửa mutateDocs cho mọi nơi saveDoc trang/tài liệu — tái hiện ghi đè giữa nhiều nơi saveDoc (vd. Xem lại CS-06 + việc nền + đặt tên tự động cùng lúc); BL-05b đồng bộ xoá + thu hồi liên kết chia sẻ; tài liệu khoá theo QD-5)
   → CS-09b (dựng bản đầy đủ 2 lần khi công thức đổi bộ lọc, S) → LN-P22-01 (ca "Đóng → hỏi" chập chờn trong kiem-quy-trinh-chup) → CS-17 → CS-03b/CS-04b (+ CS-07 ở CPU 4×).
   AI-01/AI-04/AI-05 (và phần còn lại của FX-01 = AI-02) cần thư viện mới → chỉ làm khi người dùng duyệt.
4. BẪY MÔI TRƯỜNG: camera giả dùng đường dẫn TUYỆT ĐỐI; tạo ảnh nguồn bằng PIL (tờ giấy sáng trên nền tối) rồi `SO_KHUNG=12 tao-camera-gia.py`; kịch bản có tên tệp tiếng Việt chạy với `LANG=C.UTF-8`; sau khi sửa tệp phải khởi động lại vite trước kịch bản `import("/src/lib/…")`; đo tốc độ trên BẢN BUILD (`vite build` + `wrangler dev -c .output/server/wrangler.json`); giết tiến trình theo PID ở lệnh riêng. MỚI P22: vitest KHÔNG kiểm kiểu → chạy `npm run typecheck` sau khi thêm test; ảnh thử phải giống ảnh chụp thật (nhiễu + đổ sáng + mờ nhẹ) nếu không sẽ bị phân loại "chụp màn hình"; ảnh thử cùng bố cục kích hoạt hộp "Vẫn thêm" của bộ chống trùng; nút "Chụp" phải chọn đúng tên (exact) — tránh trúng "Chụp liên tục".
5. Theo dõi ngưỡng ngữ cảnh, giữ dự trữ đóng gói 15%; chỉ trả lời tiếng Việt, ngắn gọn.
