# Kiểm tra RLS bảng `thua_dat` (HM-06) — bạn chạy, gửi lại kết quả

Mục đích: xác nhận người chưa đăng nhập KHÔNG đọc/ghi/xoá được bảng `thua_dat`.
Thay `<URL>` = địa chỉ dự án Supabase (https://xxxx.supabase.co), `<ANON>` = khoá `anon` (khoá công khai trong app). Đừng dán khoá `service_role` ở đâu cả.

```bash
# 1) Đọc không đăng nhập — KỲ VỌNG: [] hoặc lỗi 401/403 (KHÔNG được trả về danh sách thửa)
curl -s "<URL>/rest/v1/thua_dat?select=id&limit=3" -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>"
# 2) Ghi không đăng nhập — KỲ VỌNG: lỗi 401/403 (new row violates row-level security)
curl -s -X POST "<URL>/rest/v1/thua_dat" -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>" -H "Content-Type: application/json" -d '{"id":"kiem-tra-rls"}'
# 3) Xoá không đăng nhập — KỲ VỌNG: không xoá dòng nào
curl -s -X DELETE "<URL>/rest/v1/thua_dat?id=eq.kiem-tra-rls" -H "apikey: <ANON>" -H "Authorization: Bearer <ANON>" -H "Prefer: return=representation"
```
Trong SQL Editor của Supabase: `select relrowsecurity from pg_class where relname='thua_dat';` → phải là `true`; `select * from pg_policies where tablename='thua_dat';` → xem chính sách.

Nếu bước 1 trả về dữ liệu thật, hoặc 2/3 thành công → bảng đang MỞ CÔNG KHAI: bật RLS (`alter table thua_dat enable row level security;`) và chờ HM-06c (đăng nhập OTP + chính sách theo người dùng) trước khi dùng dữ liệu thật.
