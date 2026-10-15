// HM-28 — lõi Edge Function sign-pack: cấp link tải CÓ HẠN (signed URL) cho gói dữ liệu địa chính nằm trong bucket RIÊNG TƯ 'goi-dia-chinh'.
// Thuần (không phụ thuộc Deno) để kiểm thử bằng Node: node --experimental-strip-types.
// Quy ước: gói có id ví dụ "xa-hoa-lu" nằm ở  goi/<id>/pack.lgpk.gz  trong bucket. App gửi {id} + JWT đăng nhập; hàm kiểm quyền rồi trả {url, expires_in}.
export interface Deps {
  env: { PACK_URL_TTL?: string; PACK_OPEN_TO_ALL_USERS?: string };
  getUser: (jwt: string) => Promise<{ id: string } | null>;                      // xác thực JWT với Supabase Auth
  hasEntitlement: (userId: string, packId: string) => Promise<boolean>;         // bảng goi_quyen (user_id, pack_id, het_han)
  sign: (objectPath: string, ttlSeconds: number) => Promise<string | null>;     // storage createSignedUrl
  log: (userId: string, packId: string) => Promise<void>;                       // ghi nhật ký tải
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export async function handle(req: Request, d: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: { type: 'lg_method', message: 'Chỉ nhận POST' } });
  const m = /^Bearer (.+)$/.exec(req.headers.get('authorization') || '');
  const user = m ? await d.getUser(m[1]) : null;
  if (!user) return json(401, { error: { type: 'lg_auth', message: 'Cần đăng nhập' } });
  let body: any; try { body = JSON.parse(await req.text()); } catch { return json(400, { error: { type: 'lg_bad_json', message: 'Thân yêu cầu không phải JSON' } }); }
  const id = String(body && body.id || '');
  if (!ID_RE.test(id) || id.includes('..')) return json(400, { error: { type: 'lg_bad_id', message: 'Mã gói không hợp lệ' } });
  const open = d.env.PACK_OPEN_TO_ALL_USERS === '1';
  if (!open && !(await d.hasEntitlement(user.id, id))) return json(403, { error: { type: 'lg_forbidden', message: 'Tài khoản chưa được cấp quyền tải gói này' } });
  const ttl = Math.max(60, Math.min(Number(d.env.PACK_URL_TTL || 3600) || 3600, 86400));
  const url = await d.sign('goi/' + id + '/pack.lgpk.gz', ttl);
  if (!url) return json(404, { error: { type: 'lg_not_found', message: 'Chưa có gói này trên máy chủ' } });
  await d.log(user.id, id);
  return json(200, { url, expires_in: ttl });
}
