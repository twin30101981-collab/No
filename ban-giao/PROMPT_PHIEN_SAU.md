Áp dụng skill web-app-repair-upgrade v3.2.0 cho phiên P24 của đề án GIAYTO (đề án v2.0 = báo cáo rà soát lộ trình; mã hạng mục CS/BL/AI/TF/FX/LN).

NGUỒN (phiên mới không có tệp tải lên — lấy từ repo):
- Repo `twin30101981-collab/No`, nhánh `ccr-981d2f3e-vfhva8`, thư mục `ban-giao/`:
  - `GIAYTO_P23_DONGPHIEN_20261013.zip` = ZIP bàn giao MỚI NHẤT (điểm làm tiếp)
  - `Web-app-repair-upgrade-skill-v3.2.0.md` = skill (đọc Mục 1–13; phụ lục chỉ khi cần)

QUYỀN NGƯỜI DÙNG ĐÃ CHỐT (P21, giữ nguyên):
- TỰ CHẠY các hạng mục kế tiếp theo đề xuất, KHÔNG hỏi lại người dùng giữa các hạng mục cho tới hết phiên.
- Mỗi hạng mục xong: ZIP riêng → SendUserFile → commit + push ZIP vào `ban-giao/` (thay ZIP cũ). Không tạo pull request.
- Đóng phiên theo skill ở ~80% ngữ cảnh (hoặc sớm hơn khi đã rất nhiều lượt công cụ, ~140+): ZIP đóng phiên → commit + push → tự mở phiên mới (create_session, cùng repo/nhánh) với prompt này đã cập nhật → phiên mới tiếp tục tự chạy.
- Vẫn PHẢI dừng hỏi nếu: nguy cơ mất dữ liệu không có đường lui; đổi schema/API/xác thực ngoài phạm vi đề án; lộ bí mật; cần thêm thư viện mới (vd. @anthropic-ai/sdk cho AI-01/AI-04 — chưa được duyệt).

VIỆC CẦN LÀM:
1. Checkout nhánh; giải nén ZIP mới nhất vào scratchpad, đọc `handover/HANDOVER.md` (ĐẦU TỆP = P23) và `handover/backlog.json`, xác minh `handover/MANIFEST.sha256`. Ghi "Phiên P24" vào HANDOVER.
2. `cd app && rm -f tsconfig.tsbuildinfo && npm install --legacy-peer-deps && npm run check` (mốc P23: 212 tệp / 1007 đạt, lint 0 lỗi, thoát 0). Kiểm môi trường 1 lần: Chromium /opt/pw-browsers/chromium-1194; cài playwright-core@1.56.0 và wrangler@4 ở THƯ MỤC RIÊNG; chép kịch bản Playwright cạnh node_modules của playwright-core để chạy. Giải nén thêm `app/` của ZIP trước vào thư mục khác + symlink node_modules + vite cổng khác để ĐỐI CHIẾU MÃ CŨ khi kịch bản lỗi.
3. Hạng mục kế tiếp (tự chạy, mỗi hạng mục: tái hiện bằng chạy thật → sửa → kiểm V3/V2 → ZIP → push):
   CS-09b (S: chọn công thức bộ lọc TRƯỚC khi xếp việc dựng bản đầy đủ — đếm số việc finish = số trang; P23 đo 20 ảnh bản đầy đủ 93 s ở CPU 1×)
   → LN-P22-01 (ca "Đóng → hỏi" chập chờn trong kiem-quy-trinh-chup)
   → LN-P23-02 (XS, ghép tài liệu giữ id trang — giả thuyết)
   → CS-17 (L — CHIA NHỎ trước) → CS-03b/CS-04b (+ CS-07 ở CPU 4×).
   AI-01/AI-04/AI-05 (và phần còn lại của FX-01 = AI-02) cần thư viện mới → chỉ làm khi người dùng duyệt.
4. BẪY MÔI TRƯỜNG: camera giả dùng đường dẫn TUYỆT ĐỐI; tạo ảnh nguồn bằng `evidence/anh-thu/tao-anh-to-giay.py <thư mục> <số ảnh>` (PIL, tờ giấy sáng trên nền tối, nhiễu + đổ sáng + mờ) rồi `SO_KHUNG=12 tao-camera-gia.py`; ảnh 01 hay bị coi "chụp màn hình" (ca bộ lọc cs09 lỗi giả). Kịch bản có tên tệp tiếng Việt chạy với `LANG=C.UTF-8`; sau khi sửa tệp phải khởi động lại vite trước kịch bản `import("/src/lib/…")`; đo tốc độ trên BẢN BUILD (`vite build` + `wrangler dev -c .output/server/wrangler.json`); giết tiến trình theo PID ở lệnh riêng (KHÔNG `pkill -f` với mẫu có trong chính lệnh — giết luôn shell). vitest KHÔNG kiểm kiểu → chạy `npm run typecheck` sau khi thêm test (tsconfig noPropertyAccessFromIndexSignature). Hộp chọn tệp: truyền buffer (`setFiles([{name,mimeType,buffer}])`), không truyền đường dẫn thư mục tạm. page.evaluate nạp ≥6 ảnh base64 làm trang thử sập. `saveDoc(doc, false)` không thêm tài liệu MỚI vào bộ đệm. Ca "Kiểm mép" của kiem-quy-trinh-chup cần ảnh camera mép mờ (ảnh P23 mép rõ → lỗi giả, cả mã cũ). Máy thử 4 nhân → nhập ảnh chạy 3 làn.
5. Theo dõi ngưỡng ngữ cảnh, giữ dự trữ đóng gói 15%; chỉ trả lời tiếng Việt, ngắn gọn.
