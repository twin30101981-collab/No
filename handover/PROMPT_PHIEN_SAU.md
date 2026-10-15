Tiếp tục dự án LANDGIS ở chế độ CHẠY TỰ ĐỘNG NHIỀU PHIÊN (người dùng đã yêu cầu ngày 15/10/2026; đề án v1.8 đã duyệt).
Repo đã checkout ở nhánh ccr-9dbbe50d-dw0kll. Làm ngay, không hỏi người dùng:
1. Đọc handover/AUTORUN.md (quy tắc bắt buộc), rồi handover/HANDOVER.md và handover/backlog.json (thu_tu_thuc_thi). Skill: handover/skill/web-app-repair-upgrade-v3.2.0.md (Mục 1–13).
2. Kiểm tra môi trường 1 lần: Playwright tại /opt/node-tools/node_modules/playwright; cd tests && npm install. Ghi vào HANDOVER.
3. Ghi "S-OPEN phiên N" vào HANDOVER, commit+push.
3b. Từ P05: mỗi lần sửa app/land-gis.html chạy `python3 handover/tools/deploy_pages.py` trước khi chạy test (xem HANDOVER §17).
4. Thực hiện tuần tự các hạng mục theo AUTORUN.md §2–4: sửa tận gốc, kiểm thử V3, commit+push sau mỗi hạng mục, cập nhật backlog/HANDOVER/TIEN_DO.
5. Theo dõi ngữ cảnh bằng get_session sau mỗi hạng mục; ≥ 70% → đóng phiên và sinh phiên kế bằng create_session theo AUTORUN.md §5 (prompt = file này).
Trả lời người dùng bằng tiếng Việt, ngắn gọn. Repo công khai: không commit dữ liệu cá nhân hay khoá API.
