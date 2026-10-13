Áp dụng skill web-app-repair-upgrade v3.2.0 cho phiên P22 của đề án GIAYTO (đề án v2.0 = báo cáo rà soát lộ trình; mã hạng mục CS/BL/AI/TF/FX).

NGUỒN (phiên mới không có tệp tải lên — lấy từ repo):
- Repo `twin30101981-collab/No`, nhánh `ccr-981d2f3e-vfhva8`, thư mục `ban-giao/`:
  - `GIAYTO_P21_DONGPHIEN_20261013.zip` = ZIP bàn giao MỚI NHẤT (điểm làm tiếp)
  - `Web-app-repair-upgrade-skill-v3.2.0.md` = skill (đọc Mục 1–13; phụ lục chỉ khi cần)

QUYỀN NGƯỜI DÙNG ĐÃ CHỐT (P21, giữ nguyên):
- TỰ CHẠY các hạng mục kế tiếp theo đề xuất, KHÔNG hỏi lại người dùng giữa các hạng mục cho tới hết phiên.
- Đóng phiên theo skill ở ~80% ngữ cảnh: ZIP đóng phiên → commit + push vào nhánh trên (`ban-giao/`, thay ZIP cũ) → tự mở phiên mới (create_session, cùng repo/nhánh) với prompt này đã cập nhật → phiên mới tiếp tục tự chạy.
- Vẫn PHẢI dừng hỏi nếu: nguy cơ mất dữ liệu không có đường lui; đổi schema/API/xác thực ngoài phạm vi đề án; lộ bí mật; cần thêm thư viện mới (vd. @anthropic-ai/sdk cho AI-01/AI-04 — chưa được duyệt).

VIỆC CẦN LÀM:
1. Clone/checkout nhánh; giải nén ZIP mới nhất vào thư mục làm việc (scratchpad), đọc `handover/HANDOVER.md` (ĐẦU TỆP = P21) và `handover/backlog.json`, xác minh `handover/MANIFEST.sha256`.
2. `cd app && rm -f tsconfig.tsbuildinfo && npm install --legacy-peer-deps && npm run check` (mốc P21: 203 tệp / 964 đạt, lint 0 lỗi). Kiểm môi trường 1 lần: Chromium ở /opt/pw-browsers/chromium-1194; cài playwright-core@1.56.0 và wrangler@4 ở THƯ MỤC RIÊNG (không vào dự án); kịch bản Playwright chép cạnh node_modules của playwright-core để chạy.
3. Hạng mục kế tiếp (tự chạy theo thứ tự, mỗi hạng mục: tái hiện bằng chạy thật → sửa → kiểm V3/V2 → ZIP → push):
   FX-03 (bảng thông điệp lỗi tập trung, S) → FX-01 (trang Tình trạng tính năng, S) → BL-07 (chuyển PDF scan RAM, S) → CS-08 (nhãn trạng thái trang + nút Xuất "Còn N trang" + hiện lý do autoFilter/loi, M) → CS-06/CS-07 (xem lại & lọc theo lô, M) → CS-09 → BL-05 (một cửa mutateDocs — sửa tận gốc ghi đè giữa nhiều nơi saveDoc, L: chia nhỏ) → CS-03b/CS-04b (tốc độ máy yếu, cần CS-17).
   AI-01/AI-04/AI-05 cần thư viện mới → chỉ làm khi người dùng duyệt.
4. BẪY MÔI TRƯỜNG (đọc HANDOVER P21): camera giả phải dùng đường dẫn TUYỆT ĐỐI và `SO_KHUNG=12 tao-camera-gia.py` cho phép đo tốc độ; kịch bản có tên tệp tiếng Việt chạy với `LANG=C.UTF-8`; sau khi sửa tệp phải khởi động lại vite trước kịch bản `import("/src/lib/…")`; đo tốc độ trên BẢN BUILD (`vite build` + `wrangler dev -c .output/server/wrangler.json`), không dùng `vite preview`; giết tiến trình theo PID ở lệnh riêng (không `pkill -f` cùng lệnh chứa chuỗi khớp).
5. Theo dõi ngưỡng ngữ cảnh, giữ dự trữ đóng gói 15%; chỉ trả lời tiếng Việt, ngắn gọn.
