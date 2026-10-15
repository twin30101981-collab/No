-- HM-06c — đăng nhập email OTP + RLS theo người dùng + xoá mềm cho bảng thua_dat.
-- Cách chạy: Supabase → SQL Editor → dán toàn bộ → Run. (Chạy 1 lần; sao lưu bảng trước: Database → Backups.)
-- Trước đó: Authentication → Providers → Email: bật "Enable Email provider" + "Confirm email"; để gửi MÃ OTP (không phải link),
-- sửa mẫu email "Magic Link"/"Confirm signup" có chứa {{ .Token }}. Authentication → URL Configuration: thêm địa chỉ web của app.

alter table public.thua_dat add column if not exists owner_id uuid default auth.uid();
alter table public.thua_dat add column if not exists deleted_at timestamptz;

-- Dữ liệu cũ chưa có chủ: gán cho tài khoản quản trị (thay UUID bên dưới bằng id người dùng của bạn sau khi đăng nhập lần đầu):
-- update public.thua_dat set owner_id = '<UUID-CUA-BAN>' where owner_id is null;

alter table public.thua_dat enable row level security;
alter table public.thua_dat force row level security;

-- Gỡ mọi chính sách cũ (đang cho phép công khai)
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='thua_dat' loop
    execute format('drop policy %I on public.thua_dat', r.policyname);
  end loop;
end $$;

-- Chỉ người đã đăng nhập, chỉ thấy/sửa thửa của chính mình (anon = không có quyền gì)
create policy thua_dat_select on public.thua_dat for select to authenticated using (owner_id = auth.uid());
create policy thua_dat_insert on public.thua_dat for insert to authenticated with check (owner_id = auth.uid());
create policy thua_dat_update on public.thua_dat for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- KHÔNG tạo chính sách DELETE: app dùng xoá mềm (cập nhật deleted_at), xoá cứng bị chặn.
revoke all on public.thua_dat from anon;
grant select, insert, update on public.thua_dat to authenticated;

-- Kiểm tra sau khi chạy (xem handover/supabase/kiem_tra_RLS.md): không đăng nhập → đọc/ghi/xoá đều bị từ chối.
-- Nhóm nhiều người dùng chung dữ liệu (tuỳ chọn, làm sau): thêm bảng nhom_thanh_vien và đổi điều kiện owner_id thành "owner_id in (select ...)".
