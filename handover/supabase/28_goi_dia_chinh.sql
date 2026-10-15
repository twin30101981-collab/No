-- HM-28 — kho gói dữ liệu địa chính RIÊNG TƯ (Supabase Storage) + quyền tải theo tài khoản + nhật ký tải.
-- Cách chạy: Supabase → SQL Editor → dán toàn bộ → Run (1 lần). Sau đó tải gói lên bằng Storage (xem VIEC_CUA_BAN.md mục HM-28).

-- 1) Bucket riêng tư: KHÔNG ai tải được nếu không có link ký (signed URL) do Edge Function sign-pack cấp.
insert into storage.buckets (id, name, public) values ('goi-dia-chinh', 'goi-dia-chinh', false) on conflict (id) do update set public = false;
-- Không tạo chính sách nào trên storage.objects cho bucket này ⇒ vai trò anon/authenticated bị chặn đọc/ghi; chỉ service role (Edge Function / bạn qua Dashboard) truy cập.

-- 2) Ai được tải gói nào
create table if not exists public.goi_quyen (
  user_id uuid not null,
  pack_id text not null,
  het_han timestamptz,
  primary key (user_id, pack_id)
);
alter table public.goi_quyen enable row level security;
revoke all on public.goi_quyen from anon;
create policy goi_quyen_doc_cua_minh on public.goi_quyen for select to authenticated using (user_id = auth.uid());
-- Cấp quyền: insert into public.goi_quyen (user_id, pack_id) values ('<UUID người dùng>', 'xa-hoa-lu');   -- UUID: Authentication → Users

-- 3) Nhật ký tải (chỉ Edge Function ghi bằng service role)
create table if not exists public.goi_tai (id bigserial primary key, user_id uuid not null, pack_id text not null, at timestamptz not null default now());
alter table public.goi_tai enable row level security;   -- không có policy ⇒ anon/authenticated bị chặn hoàn toàn
-- Cách đơn giản hơn nếu mọi người dùng đã đăng nhập đều được tải mọi gói: supabase secrets set PACK_OPEN_TO_ALL_USERS=1 (không cần bảng goi_quyen).
