# BÀN GIAO — LANDGIS — Phiên P01 (S0) — 2026-10-15
Skill: web-app-repair-upgrade v3.2.0 | Chế độ: 1 (khảo sát S0) | Lý do đóng phiên: đề án đã lập, chờ duyệt

## 1. Dự án và môi trường
Loại app: HTML đơn + PWA | Chạy: mở file / localhost (SW cần localhost) | Build: không có | Test: chưa có (HM-01 sẽ dựng)
Dữ liệu lưu ở: localStorage (+lớp lược đồ v119), sessionStorage, IndexedDB, Supabase (LG172)
Playwright (V3) khả dụng: CÓ — playwright 1.56.1 tại /opt/node-tools, Chromium 1194; mạng ra ngoài BỊ CHẶN (tile, AI, Supabase không kiểm được)
Quy ước dự án: style chỉ trong <style>; không sửa chuỗi JS khi đổi font/style; sửa theo vùng, sao lưu .orig; không format cả file.

## 2. Đề án và trạng thái (khớp backlog.json)
Đề án: v1.8 — CHO_DUYET — de-an/DE_AN_LANDGIS_v1.8.docx
Điều chỉnh lộ trình: v1.1 quyết định; v1.2 chỉ-mobile; v1.3 rà soát sâu: P0 HM-00, HM-06c, HM-11b, Đợt 4–5 tính năng HM-15..21
Ước tính: 6–8 phiên (Đợt 0–3, 302%) · 11–14 phiên cả Đợt 4–6 (536%) · 66 hạng mục
v1.8 P1: F-43 autoAdjust (L35464) dịch toạ độ sổ; F-44 AI gộp khối phụ; F-45 tên chủ = mã thửa; F-38 tự đổi lớp khi mất mạng. Tái hiện: tools/e2e3.js (+ libs/ jspdf, html2canvas cục bộ; giả lập Gemini tools/e2e_mock*.json), tools/layers.js
v1.7: giáp ranh/tứ cận theo cạnh + đối chiếu mốc chung (HM-35..38); thử nghiệm tools/adjacency_proto.js (Mẫu B: Tây 130, Đông 132, Nam đường; mốc 8 lệch 0,12 m phát hiện đúng)
Đợt 6 (v1.6): bản đồ địa chính ngoại tuyến tỉnh Ninh Bình mới — gói vector theo xã giữ VN-2000 gốc + chỉ mục tờ/thửa + tìm theo hình dạng (thử nghiệm tools/shape_proto.js: top-1 đúng, 8,8 ms/20k thửa). Phụ thuộc HM-26 (người dùng xin dữ liệu từ Sở).
P1 mới v1.5: F-31 KTT sau sáp nhập (tools/ktt.js), F-32 nhập dự án Thay thế xoá dữ liệu, F-33 model AI (claude-haiku-3-5 không hợp lệ), F-34 khoá 'chỉ trong phiên' (tools/keytest.js)
**P0 #2 ĐÃ XÁC MINH (F-24):** killReplit (L22868, observer L22886–22892) quét toàn trang mỗi nút DOM thêm → 50 thửa mở app 70,5 s; bản thử experiment/no_killreplit.html: 2,1 s. Tái hiện: tools/prof.js <html> 50.
**P0 ĐÃ XÁC MINH (F-17):** bộ nhớ đầy → lớp v119 xoá land_gis_v18_cache (kho thửa). Tái hiện: tools/quota.js → evidence/quota_dataloss.json. Sửa: gỡ khoá khỏi PRUNABLE (L117) và di trú <119 (L196).
| ID | Tên | Ưu tiên | Effort | Trạng thái |
|----|-----|---------|--------|------------|
| HM-00 | CHẶN MẤT DỮ LIỆU khi bộ nhớ đầy | P0 | S | CHUA_LAM |
| HM-00b | CHẶN TREO APP: gỡ killReplit | P0 | XS | CHUA_LAM |
| HM-01 | Hạ tầng kiểm thử (Playwright + 2 sổ mẫu ẩn danh) | P1 | S | CHUA_LAM |
| HM-02 | parseBookText nhận nhiều khối | P1 | M | CHUA_LAM |
| HM-03 | Một quy tắc đối chiếu diện tích | P1 | M | CHUA_LAM |
| HM-04 | Một lõi hình học / VN-2000 | P2 | M | CHUA_LAM |
| HM-05 | Gỡ dữ liệu cá nhân LG_AUDIT | P1 | S | CHUA_LAM |
| HM-06 | Thư viện, khoá API, RLS Supabase | P1 | M | CHUA_LAM |
| HM-07a/b | Chạy nền, rail/dock dựng lại | P2 | M+M | CHUA_LAM |
| HM-08a | Khung layout mobile + toast không chặn dock | P1 | S | CHUA_LAM |
| HM-08b..e | Điều hướng mới, Bản đồ, Nhập sổ 3 bước, Hồ sơ/Thêm | P2 | M×4 | CHUA_LAM |
| HM-08f | Gỡ bố cục desktop/CSS chồng lớp | P3 | M | CHUA_LAM |
| HM-09 | Vòng đổi lớp nền | P2 | S | CHUA_LAM |
| HM-10 | Danh mục model AI | P2 | S | CHUA_LAM |
| HM-11 | Triển khai repo + PWA | P2 | S | CHUA_LAM |
| HM-12a | Dọn LGCore 07–08 | P3 | M | CHUA_LAM |
| HM-13/14 | Đề xuất: trang IV biến động; che CMND | P3 | M/S | CHUA_LAM |

## 3. Hạng mục vừa đóng
Không (S0 chỉ đọc).

## 4. Hạng mục kế tiếp (khi đề án được duyệt): HM-00 + HM-00b (P0), sau đó HM-01
Mục tiêu: tests/ với Playwright; fixture Mẫu A (thửa 501 tờ 10, 7 mốc + khối phụ 8–11, GCN 29,7) và Mẫu B (thửa 131 tờ 10.1, 8 mốc, GCN 89,9, không cấp 1,4) — CHỈ toạ độ, không tên/CMND.
Bước đầu: tái dùng scratchpad tools/samples.js, s1full.js, smoke.js (có trong evidence/ của ZIP dạng kết quả; script ở tools/).
Kỳ vọng trên v237: test F-01 và F-02 phải FAIL.

## 5. Việc dở dang chính xác
Không.

## 6. Quyết định đã chốt
- (15/10) App chỉ tối ưu cho điện thoại cầm dọc 360–430 px; thiết kế theo đề án Mục 6 (mockup tại mockup/mockups.html).
- (15/10) Sai số cho phép DUY NHẤT 0,05√A + 0,0003A; ĐẠT khi |(đo − không cấp GCN) − GCN| ≤ mức này; gỡ ngưỡng nới khác (HM-03).
- (15/10) Xoá hết dữ liệu cũ mất an toàn: gỡ LG_AUDIT + mã phụ thuộc; dọn nhật ký/khoá cũ-hỏng theo allowlist; KHÔNG xoá dữ liệu thửa/cấu hình người dùng (HM-05).
- (15/10) Người dùng có quyền Supabase → kiểm RLS bằng kịch bản V1 (HM-06); làm cả Đợt 4.
- Không viết lại app; sửa theo lớp, có kiểm thử — lý do: app chạy được, rủi ro viết lại cao.
- Bản nguồn = Land-GIS-v237.html người dùng tải lên (repo index.html là v43).

## 7. Lỗi nền / ngoài phạm vi
- Request ô bản đồ lỗi trong S0 do môi trường chặn mạng (không phải lỗi app).
- hsv-react-phien16.zip trong repo là dự án khác — không động tới.

## 8. Việc người dùng cần làm
Chốt 13 câu (đề án Mục 14, thêm 12 lớp nền mặc định, 13 bỏ bình sai tự động; thêm câu 11 về sổ thửa bên cạnh/che tên; thêm 3 câu Đợt 6: nguồn dữ liệu/thí điểm, nơi lưu gói, thứ tự): màn rộng; khoá dọc; làm HM-00/00b trước; model AI mặc định + máy chủ trung gian; địa bàn làm việc; đăng nhập OTP Supabase; chọn tính năng. Duyệt v1.5.
Khuyến cáo ngay: xuất sao lưu (.landgis/Excel) dữ liệu thửa đang có trên điện thoại cho tới khi HM-00 xong.

## 9. Đường lui
baseline/Land-GIS-v237.html (SHA-256 7ab2837e065712de459fea114022552ecb4a1aa6757f584019c6e0d824978b5a)

## 10. File đã chạm trong phiên
Không sửa file app. Thêm: de-an/, handover/, evidence/, tools/.

## 11. Nhật ký ngắn
- 03:00 S-OPEN S0; baseline + checksum
- 03:01 bản đồ mã; quét khói V3 390/1366: 0 pageerror
- 03:05 chạy 2 sổ mẫu: F-01, F-02 xác minh
- 03:08 đo chạy nền: 29 interval, 24 MO, 1561 mutation/10s
- 03:20 dựng đề án v1.0 (15 trang), tự kiểm qua PDF
- 03:30 nhận 3 quyết định; phát hành đề án v1.1, chờ duyệt
- 03:45 khảo sát điều hướng mobile: F-14 toast chặn chạm dock (xác minh), F-15, F-16; dựng 7 mockup; phát hành v1.2
- 04:10 rà soát sâu v1.3: F-17 P0 mất dữ liệu (V3), F-18..F-23; kiểm âm tính XSS, DXF, font PDF; phát hành v1.3
- 04:40 rà soát v1.4: F-24 P0 treo app (profile 5/20/50 thửa), F-25 OCR bỏ dòng âm thầm, F-26..F-30; 9 mockup bộ 2 + sơ đồ luồng; phát hành v1.4
- 05:10 rà soát phần còn lại v1.5: F-31..F-37; đạt: bảng KTT 63 tỉnh, QR 5/5, GeoJSON/KML; phát hành v1.5
- 05:40 v1.6: Đợt 6 địa chính ngoại tuyến; 4 mockup ⑯–⑲ + sơ đồ kiến trúc; thử nghiệm tìm theo hình dạng
- 06:05 v1.7: giáp ranh/tứ cận; 3 mockup ⑳–㉒; thử nghiệm thuật toán cạnh chung/mốc chung
- 06:50 v1.8: phân tích lớp bản đồ (3 kịch bản) + chạy thử đầu–cuối đọc sổ→PDF (Mẫu A, B); F-38..F-50; HM-39..45; mockup ㉓–㉕
