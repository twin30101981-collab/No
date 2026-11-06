Áp dụng skill web-app-repair-upgrade (bản v3.2.0) cho phiên tiếp theo (P05) của đề án QLTDPRO.
ZIP bàn giao: QLTDPRO_P04_DONGPHIEN_20261106.zip (có sẵn trong repo, thư mục bao-cao/, nhánh ccr-02dfa4e6-2wwto3; giải nén vào thư mục tạm).
Hãy: (1) giải nén, đọc handover/HANDOVER.md (phần đầu "ĐÓNG PHIÊN P04") và backlog.json, xác minh MANIFEST.sha256;
(2) kiểm tra môi trường một lần (pip install playwright==1.63.0 xlrd python-docx pdfplumber; Chromium tại /opt/pw-browsers; pandas, openpyxl);
(3) bản hiện hành app/QLTDPRO_P43/app/QLTDPRO_v24.17.26.html; quyết định Q4–Q6, Q10–Q16 đã chốt, Q7 còn mở.
    Làm hạng mục kế: HM-21 (mọi trang: cán bộ xếp theo phòng như Báo cáo ngày + danh sách dòng cũ → mới — người dùng đã chọn "Cả hai"),
    sau đó HM-07 → HM-08 → HM-10 → HM-09;
(4) chạy hồi quy chung trước và sau: cd app/QLTDPRO_P43 && python3 kiem_thu_chung/chay_hoi_quy.py --app app/QLTDPRO_v24.17.26.html;
(5) kiểm chứng theo thang V3/V2/V1, bàn giao ZIP sau mỗi hạng mục và hỏi tôi trước khi sang hạng mục kế;
(6) theo dõi ngưỡng ngữ cảnh, giữ dự trữ đóng gói, đóng phiên bằng ZIP khi chạm vùng Đỏ.
Không đưa dữ liệu khách hàng thật vào repo hay ZIP. Chỉ trả lời bằng tiếng Việt, ngắn gọn.
