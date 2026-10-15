// Edge Function sign-pack (Deno). Triển khai: supabase functions deploy sign-pack   (xem handover/VIEC_CUA_BAN.md mục HM-28)
// Secrets (tuỳ chọn):  supabase secrets set PACK_URL_TTL=3600 PACK_OPEN_TO_ALL_USERS=0
import { handle } from './handler.ts';
// @ts-ignore Deno global
const env = (k: string) => Deno.env.get(k);
const URL_ = env('SUPABASE_URL')!, SERVICE = env('SUPABASE_SERVICE_ROLE_KEY')!, ANON = env('SUPABASE_ANON_KEY')!;
const H = { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' };
// @ts-ignore Deno global
Deno.serve((req: Request) => handle(req, {
  env: { PACK_URL_TTL: env('PACK_URL_TTL'), PACK_OPEN_TO_ALL_USERS: env('PACK_OPEN_TO_ALL_USERS') },
  getUser: async (jwt) => { const r = await fetch(URL_ + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + jwt } }); if (!r.ok) return null; const u = await r.json(); return u && u.id ? { id: u.id } : null; },
  hasEntitlement: async (uid, pid) => { const now = encodeURIComponent(new Date().toISOString()); const r = await fetch(URL_ + '/rest/v1/goi_quyen?select=pack_id&user_id=eq.' + uid + '&pack_id=eq.' + encodeURIComponent(pid) + '&or=(het_han.is.null,het_han.gt.' + now + ')', { headers: H }); if (!r.ok) return false; const a = await r.json(); return Array.isArray(a) && a.length > 0; },
  sign: async (path, ttl) => { const r = await fetch(URL_ + '/storage/v1/object/sign/goi-dia-chinh/' + path, { method: 'POST', headers: H, body: JSON.stringify({ expiresIn: ttl }) }); if (!r.ok) return null; const j = await r.json(); return j && j.signedURL ? URL_ + '/storage/v1' + j.signedURL : null; },
  log: async (uid, pid) => { await fetch(URL_ + '/rest/v1/goi_tai', { method: 'POST', headers: H, body: JSON.stringify({ user_id: uid, pack_id: pid }) }); },
}));
