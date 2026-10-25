# P04b — dùng dữ liệu thật người dùng gửi (22/10/2026)
Dữ liệu: 11 kỳ dư nợ (31/12/2025–20/10/2026), sao kê TSBĐ 30/09 + 20/10/2026, PL01/PL02/NQ38 — giải nén vào /tmp/claude-0/real/data (NGOÀI repo, không commit, không đóng gói).

## 1. Hồi quy trên dữ liệu thật (bản P04a, trước khi sửa)
| Kiểm | Kết quả |
|---|---|
| tests/run.js --real (td_pl02 trên PL02.docx thật) | 20/20 nhóm, td_pl02 6/6 |
| hm09b_real.js (TD_AUDIT / đối soát, 20/10) | 0 vấn đề; 1.865 KH; Σ dư nợ 2.160.375.016.661 khớp ở Dashboard, mốc lưu, báo cáo CBTD |
| hm17b_test.js (phân trang, 3.848 dòng) | bản mới 12/12 (dòng "FAIL CŨ" là phép kỳ vọng bản cũ có lỗi — bản so sánh HM27a cũng đã sửa nên không còn lỗi để tái hiện) |
| hm28b_real.js + hm28b_check.py (Word/Excel ↔ tính lại bằng Python từ XLS) | 15/15 |
| real10.js (TSBĐ 20/10: 19.133 dòng, 19.067 TS khử trùng) | 0 pageerror; USD 103 / EUR 42 tách riêng; 1.858/1.865 KH có TS |

## 2. HM-17b — chọn cột cho Chuyển HM, TSBĐ, Giá đất
Khảo sát trên dữ liệu thật: KHÔNG có chồng cơ chế phân trang ở 3 bảng này (Chuyển HM 35 nhóm KH — không cần trang; TSBĐ 1 thanh trang 100/trang, 192 trang; Giá đất 1 thanh trang 50/trang). Vấn đề thật là TRÀN NGANG ở 1366 px (Chuyển HM 1.570/1.288 px, TSBĐ 2.159/1.288, Giá đất 1.998/1.294; TSBĐ và Giá đất tràn cả ở 1920).
Làm: TD.cols nhận đặc tả bảng (TD.cols.SPECS: số cột logic, cột luôn hiện, mẫu riêng; mặc định "Đầy đủ" — KHÔNG tự ẩn cột nào ⇒ không đổi giao diện khi người dùng chưa chọn); TD.cols.grid/span tính lại colspan cho tiêu đề gộp ô (Giá đất: VT1–VT4 × Cao/Thấp/UBND) và dòng tổng gộp ô (Chuyển HM, tfoot dựng lại mỗi lần lọc ⇒ gọi lại tdColsBuild). Mẫu "Gọn 1366" chọn theo bề rộng đo trên dữ liệu thật: Chuyển HM ẩn Phòng ban/Ngày BĐ HĐ/Loại vay (1.235 px); TSBĐ ẩn Tên chủ TS/Mã KH chủ TS/Địa chỉ/Số GCN/Ngày TC/CBTD (1.262 px); Giá đất "Chỉ giá UBND (NQ38)" (1.256 px) và "Chỉ VT1". Lưu lựa chọn theo bảng (td_cols_v1_<bảng>). Bảng Dư nợ/Ngắn hạn/Trung-dài (HM-17) giữ nguyên hành vi.
Kiểm chứng: td_cols.test.js 23/23 (+9 ca); hm17c_real.js 24/24 trên dữ liệu thật (mặc định không ẩn; mẫu Gọn hết tràn; tiêu đề/dòng tổng lệch ≤1 px so với thân bảng; tự chọn cột; lọc lại; tải lại giữ lựa chọn; HM-17 không đổi; 0 pageerror). Đối chứng: bản HM27a thất bại; đột biến "không đặt lại colspan" ⇒ 13 phép thất bại; e2e thêm bước W (Giá đất, không cần dữ liệu) + đột biến trong tests/mutation.js.
Giới hạn: bề rộng cột phụ thuộc nội dung (đo ở kỳ 20/10); chưa có ghim cột cho 3 bảng này.

## 3. HM-22 — fixture ẩn danh theo định dạng thật
- 20.10.2026.XLS (BIFF8, xlwt) — e2e bước Y: 244 khoản, lãi suất/dư nợ/ngày đến hạn từng khoản = tệp.
- Sao kê TSBĐ ẩn danh 39 cột (make_tsbd_fixture.py) — e2e bước X (HM-10): 145 dòng / 135 TS / 10 dòng trùng, Σ VND, USD/EUR tách riêng, clholdcd, trạng thái đối chiếu, bên thứ ba, KH còn nợ chưa có TS = 10 — khớp đáp số tính độc lập. Đột biến "bỏ khử trùng clno" bị phát hiện.

## 4. Phát hành
QLTD_PRO_v2026-10-22_v22.3-P04b.html (TD.net.version v22.3-P04b). tests/run.js --mutation --real: xem evidence/p04b_run_full.txt.
