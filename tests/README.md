# Kiểm thử Land GIS (V3 — Playwright + Chromium có sẵn)
Chuẩn bị: `cd tests && npm install` (thư viện để giả lập CDN). Playwright: `/opt/node-tools/node_modules/playwright`.
Mọi script nhận đường dẫn HTML làm tham số đầu, chặn mạng ngoài và giả lập khi cần.

| Script | Việc | Ví dụ |
|---|---|---|
| tools/smoke.js | khói 390/1366, pageerror | `node tests/tools/smoke.js app/land-gis.html /tmp/out` |
| tools/samples.js, s1full.js | Mẫu A/B qua parseBookText/checkBook (F-01, F-02) | `node tests/tools/samples.js app/land-gis.html` |
| tools/quota.js | bộ nhớ đầy xoá thửa (F-17, P0) | `node tests/tools/quota.js app/land-gis.html` |
| tools/prof.js | thời gian nạp theo số thửa (F-24, P0) | `node tests/tools/prof.js app/land-gis.html 50` |
| tools/layers.js | 3 kịch bản mạng lớp nền (F-38) | |
| tools/e2e3.js | đọc sổ (giả lập Gemini) → dựng thửa → PDF (F-43…F-48) | `node tests/tools/e2e3.js app/land-gis.html tests/fixtures/anh-bang-ke-gia-lap.jpg /tmp/out tests/fixtures/ai-mock-B.json tests` |
| tools/ktt.js, keytest.js, qrtest.js | KTT sau sáp nhập, khoá trong phiên, QR | |
| tools/shape_proto.js, adjacency_proto.js | thử nghiệm Đợt 6 / giáp ranh | `node tests/tools/shape_proto.js` |
Fixtures: `fixtures/so-mau-A.json`, `so-mau-B.json` (chỉ toạ độ/diện tích, đã ẩn danh); `ai-mock-*.json` (câu trả lời AI giả lập); ảnh bảng kê giả lập (không phải sổ thật).
Ghi chú: e2e*.js chờ thư viện trong `tests/node_modules` (tham số cuối = thư mục chứa node_modules).
