// Edge Function ai-proxy (Deno). Triển khai: supabase functions deploy ai-proxy   (xem handover/VIEC_CUA_BAN.md mục HM-10b)
// Secrets cần đặt:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (tuỳ chọn: AI_LIMIT_PER_HOUR=30 AI_ALLOWED_MODELS=claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5)
import { handle } from './handler.ts';
// @ts-ignore Deno global
const env = (k: string) => Deno.env.get(k);
const URL_ = env('SUPABASE_URL')!, SERVICE = env('SUPABASE_SERVICE_ROLE_KEY')!, ANON = env('SUPABASE_ANON_KEY')!;
const rest = (path: string, init: any = {}) => fetch(URL_ + '/rest/v1/' + path, { ...init, headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json', ...(init.headers || {}) } });
// @ts-ignore Deno global
Deno.serve((req: Request) => handle(req, {
  env: { ANTHROPIC_API_KEY: env('ANTHROPIC_API_KEY'), AI_LIMIT_PER_HOUR: env('AI_LIMIT_PER_HOUR'), AI_ALLOWED_MODELS: env('AI_ALLOWED_MODELS'), AI_MAX_BODY_BYTES: env('AI_MAX_BODY_BYTES') },
  fetch,
  getUser: async (jwt) => { const r = await fetch(URL_ + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + jwt } }); if (!r.ok) return null; const u = await r.json(); return u && u.id ? { id: u.id } : null; },
  countLastHour: async (uid) => { const since = new Date(Date.now() - 3600_000).toISOString(); const r = await rest('ai_usage?select=id&user_id=eq.' + uid + '&at=gte.' + encodeURIComponent(since), { headers: { Prefer: 'count=exact', Range: '0-0' } }); const cr = r.headers.get('content-range') || ''; return Number(cr.split('/')[1]) || 0; },
  record: async (uid) => { await rest('ai_usage', { method: 'POST', body: JSON.stringify({ user_id: uid }) }); },
}));
