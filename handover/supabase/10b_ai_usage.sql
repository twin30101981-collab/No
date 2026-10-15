-- HM-10b — bảng đếm lượt gọi AI theo người dùng (Edge Function ai-proxy ghi bằng service role; người dùng KHÔNG đọc/ghi trực tiếp).
create table if not exists public.ai_usage (
  id bigserial primary key,
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists ai_usage_user_at on public.ai_usage (user_id, at desc);
alter table public.ai_usage enable row level security;   -- không có policy nào ⇒ vai trò anon/authenticated bị chặn hoàn toàn
-- (tuỳ chọn) dọn dữ liệu cũ hằng ngày:  delete from public.ai_usage where at < now() - interval '7 days';
