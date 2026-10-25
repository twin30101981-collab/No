# src/ — mã nguồn tách từ tệp phát hành (HM-20, giai đoạn A)

`app/QLTD_PRO_….html` là **kết quả build** từ thư mục này; hai bên luôn phải giống hệt (kiểm bằng SHA-256).

```
src/manifest.json     thứ tự các đoạn + chuỗi thuộc tính <script>/<style> gốc + tên tệp phát hành (release)
src/html/NNN.html     các đoạn HTML nguyên văn nằm giữa các khối script/style
src/css/NNN-<tên>.css 4 khối <style>
src/js/NNN-<tên>.js   73 khối <script> của ứng dụng (đặt tên theo id, data-tag hoặc dòng chú thích/hàm đầu)
src/vendor/<tên>.js   7 thư viện nhúng (băm ghi ở src/vendor/VENDORS.json)
tools/                build.mjs · split.mjs · check-vendor.mjs · scan-pii.mjs · pii-allow.json
```

## Cách làm việc
1. Sửa tệp trong `src/` (đừng sửa tệp trong `app/`).
2. `node tools/build.mjs` → `dist/<release>` (không commit `dist/`). Build tự chạy 3 cổng: **biên dịch thử** mọi khối JS, **check-vendor** (thư viện không bị sửa), **scan-pii** (không có chuỗi giống dữ liệu cá nhân ngoài danh sách đã duyệt).
3. `node tests/run.js` kiểm hồi quy toàn bộ. Phát hành: đổi `release` trong `manifest.json` nếu đặt phiên bản mới, rồi `node tools/build.mjs --release` (ghi vào `app/`), xoá tệp cũ, chạy lại `tests/run.js`.
4. Nâng cấp thư viện nhúng có chủ đích: thay `src/vendor/<tên>.js` rồi `node tools/check-vendor.mjs --update` (xem lại diff trước).
5. Danh sách chuỗi dữ liệu cá nhân đã duyệt (`tools/pii-allow.json`, lưu băm) chỉ đổi bằng `node tools/scan-pii.mjs --approve` **sau khi người có thẩm quyền xem xét** — không tự duyệt để vượt cổng.

## Lưu ý
- Đây vẫn là các khối script cổ điển dùng chung phạm vi toàn cục (hơn 900 hàm toàn cục, 3.000+ xử lý `onclick=` nội tuyến). Chưa chuyển sang ES module — đó là giai đoạn B (HM-21), làm dần từng module.
- Các mô-đun thuần `td_*.js` vẫn có nguồn kiểm thử ở `evidence/scripts/` và được nhúng nguyên văn vào các khối trong `src/js/` (tầng 3 của `tests/run.js` kiểm hai bên giống nhau).
- Các script `evidence/scripts/apply_hm*.py` là lịch sử vá từ bản gốc v22.3; từ nay không dùng nữa.
