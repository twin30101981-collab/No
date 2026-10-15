# QUY TẮC CHẠY TỰ ĐỘNG NHIỀU PHIÊN — đề án LANDGIS v1.8

Người dùng yêu cầu (15/10/2026): "chuyển dự án sang phiên kế tiếp và thực thi chạy tự động toàn bộ đề án theo phiên, có chuyển tiếp khi đạt giới hạn phiên cho phép".
→ Đề án v1.8 = ĐÃ DUYỆT. Chế độ **3-tự-động**: làm lần lượt mọi hạng mục, **không hỏi giữa các hạng mục**, tự sinh phiên kế tiếp khi gần hết ngữ cảnh.
Skill áp dụng: `handover/skill/web-app-repair-upgrade-v3.2.0.md` (đọc Mục 1–13; phụ lục chỉ khi cần). Quy tắc dưới đây **thay** bước "hỏi người dùng trước hạng mục kế" (Mục 4.4.5, 11).

## 1. Nguồn sự thật
- Mã app: `app/land-gis.html` (HTML một file). Bản tham chiếu bất biến: `baseline/land-gis-v237-da-an.html`.
- Trạng thái: `handover/backlog.json` (thứ tự ở `thu_tu_thuc_thi`). Tường thuật: `handover/HANDOVER.md`. Tiến độ cho người dùng: `handover/TIEN_DO.md`.
- Nhánh duy nhất: `ccr-9dbbe50d-dw0kll`. Đề án: `de-an/DE_AN_LANDGIS_v1.8.docx` (chỉ tra khi cần).

## 2. Vòng mỗi hạng mục (theo skill Mục 4.3–4.4, 7–9)
1. Lấy hạng mục đầu tiên trong `thu_tu_thuc_thi` có trạng thái CHUA_LAM/DANG_LAM và phụ thuộc đã xong (phụ thuộc chưa xong → lấy hạng mục kế; nếu phụ thuộc chỉ là "nên có" thì làm phần độc lập).
2. Ghi trước (write-ahead) vào HANDOVER §11: "mở HM-xx". Sao lưu `app/land-gis.html` → `backup/HM-xx.orig.html` (thư mục backup/ không commit).
3. Tái hiện bằng test (V3 Playwright, giả lập mạng/AI như `tests/tools/*.js`), sửa **tại nguyên nhân gốc**, viết test chống tái diễn vào `tests/` (FAIL trên baseline, PASS sau sửa).
4. Chạy lại: test của hạng mục + bộ hồi quy tối thiểu (khói 360/390 px không pageerror; Mẫu A/B qua tests/fixtures). Không đạt → sửa tiếp (tối đa 2 vòng không tiến triển → BI_CHAN, ghi lý do, sang hạng mục kế).
5. Cập nhật backlog.json (trang_thai DAT_V3/DAT_V2, bang_chung, chi_phi_thuc_te_pct, model_effort_actual), HANDOVER, TIEN_DO.md (1 dòng).
6. `git add` đúng file → commit `HM-xx: <tên ngắn>` (kèm dòng attribution của hệ thống) → `git push -u origin ccr-9dbbe50d-dw0kll` (lỗi mạng: thử lại 2s/4s/8s/16s).
7. Không hỏi; sang hạng mục kế.

## 3. Hạng mục cần người dùng / bên ngoài
Trường `can_nguoi_dung` khác null (HM-06, 06c, 10b, 22, 25, 26, 28): làm hết phần mã/tài liệu/hướng dẫn trong repo, ghi việc người dùng phải làm vào `handover/VIEC_CUA_BAN.md` (từng bước, ngắn), đặt trạng thái `CHO_NGUOI_DUNG`, rồi đi tiếp. Không chờ.

## 4. Dừng phần liên quan (skill Mục 3) — không dừng cả chuỗi
Nguy cơ mất dữ liệu không đường lui, lộ bí mật, đổi kiến trúc ngoài đề án, mâu thuẫn giả định cốt lõi → đặt BI_CHAN + ghi rõ vào VIEC_CUA_BAN.md, sang hạng mục độc lập kế tiếp.

## 5. Ngân sách ngữ cảnh và chuyển phiên
- Sau mỗi hạng mục gọi `get_session` (claude-code-remote, không truyền session_id) → tỉ lệ = context_usage.used_tokens / max_tokens.
- ≥ 0,60: không mở hạng mục M/L mới (chỉ XS/S). ≥ 0,70: **đóng phiên** ngay sau hạng mục đang làm.
- Đóng phiên: cập nhật HANDOVER (việc dở dang chính xác), backlog.json `phien_hien_tai`+1 và `chuoi_phien.nhat_ky` (phiên, session id, hạng mục đã xong), TIEN_DO.md; commit + push.
- Sinh phiên kế: `create_session` với `source_url`=https://github.com/twin30101981-collab/No, `source_revision` và `outcome_branch`=`ccr-9dbbe50d-dw0kll`, `title`="Land GIS — P0N tự động", `prompt`= nội dung `handover/PROMPT_PHIEN_SAU.md`. Không đặt permission_mode "plan".
- Không sinh được phiên (lỗi, giới hạn 8 cấp) → ghi vào TIEN_DO.md "Chuỗi dừng ở phiên N: dán PROMPT_PHIEN_SAU.md vào phiên mới để tiếp tục", kết thúc.

## 6. Kết thúc chuỗi
Dừng (không sinh phiên mới) khi: mọi hạng mục ở DAT_*/DA_BAN_GIAO/CHO_NGUOI_DUNG/BI_CHAN/HUY; hoặc 2 phiên liên tiếp không hoàn thành hạng mục nào. Khi đó viết báo cáo tổng kết `handover/TONG_KET.md` (skill Mục 12) và một bản ZIP không cần (repo là điểm hoàn tác).

## 7. Không bao giờ
Đẩy lên nhánh khác, tạo pull request, force-push, viết lại lịch sử; commit ảnh sổ đỏ thật, họ tên, số CCCD/CMND, số vào sổ/số phát hành thật, khoá API (repo **công khai**); sửa `baseline/`; tắt/bỏ test để "xanh"; khẳng định đã kiểm thử trên thiết bị chưa dùng.
