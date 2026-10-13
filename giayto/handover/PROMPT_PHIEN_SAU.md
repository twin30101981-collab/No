Áp dụng skill web-app-repair-upgrade v3.2.0 (đính kèm file skill) cho phiên tiếp theo của đề án GIAYTO (đề án v2.0 = báo cáo rà soát lộ trình, mã hạng mục CS/BL/AI/TF/FX).
Tôi đính kèm ZIP bàn giao: GIAYTO_P20_BL01_20261013.zip (mã cũng ở repo twin30101981-collab/No, nhánh ccr-9baac120-n3o90c, thư mục giayto/).
Hãy: (1) giải nén, đọc handover/HANDOVER.md (đầu tệp = P20) và backlog.json, xác minh MANIFEST.sha256;
(2) `cd app && rm -f tsconfig.tsbuildinfo && npm install --legacy-peer-deps && npm run check` (mốc: 195 tệp / 913 đạt) và kiểm tra môi trường một lần (Playwright có chạy được không — công thức ở HANDOVER Mục 1 của P18);
(3) xác nhận với tôi hạng mục kế tiếp (CS-00 — đo gốc hành trình chụp + xác minh G-05) bằng một câu hỏi ngắn. Quyết định của tôi: kết quả kiểm tay BL-00 và BL-01 [đạt/không đạt + mô tả]; QD-9 (địa chỉ app, nơi lỗi Google): [...]; QD-1…QD-5, QD-8: [theo khuyến nghị / đổi thành ...]; cho phép đổi schema IndexedDB ở CS-01: [có/không];
(4) thực hiện đúng quy trình: tái hiện phát hiện bằng chạy thật trước khi sửa; kiểm chứng V3/V2/V1; ZIP sau mỗi hạng mục; hỏi tôi trước khi sang hạng mục kế; assert mọi lệnh thay thế văn bản;
(5) theo dõi ngưỡng ngữ cảnh, giữ dự trữ đóng gói, đóng phiên bằng ZIP khi chạm vùng Đỏ.
Chỉ trả lời bằng tiếng Việt, ngắn gọn.
