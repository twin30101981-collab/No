// HM-10b — lõi xử lý của Edge Function ai-proxy (thuần, kiểm thử được bằng Node: node --experimental-strip-types).
// Trình duyệt gửi đúng phần thân yêu cầu /v1/messages của Anthropic + JWT đăng nhập; khoá Anthropic chỉ nằm ở máy chủ (ANTHROPIC_API_KEY).
export interface Deps {
  env: { ANTHROPIC_API_KEY?: string; AI_LIMIT_PER_HOUR?: string; AI_ALLOWED_MODELS?: string; AI_MAX_BODY_BYTES?: string };
  fetch: (url: string, init?: any) => Promise<Response>;
  getUser: (jwt: string) => Promise<{ id: string } | null>;           // xác thực JWT với Supabase Auth
  countLastHour: (userId: string) => Promise<number>;                  // số lượt gọi trong 1 giờ qua
  record: (userId: string) => Promise<void>;                          // ghi 1 lượt
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status: number, body: unknown, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });
const DEFAULT_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];

export async function handle(req: Request, d: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: { type: 'lg_method', message: 'Chỉ nhận POST' } });
  const m = /^Bearer (.+)$/.exec(req.headers.get('authorization') || '');
  const user = m ? await d.getUser(m[1]) : null;
  if (!user) return json(401, { error: { type: 'lg_auth', message: 'Cần đăng nhập' } });
  const maxBytes = Number(d.env.AI_MAX_BODY_BYTES || 12_000_000);
  const raw = await req.text();
  if (raw.length > maxBytes) return json(413, { error: { type: 'lg_too_large', message: 'Ảnh quá lớn' } });
  let body: any; try { body = JSON.parse(raw); } catch { return json(400, { error: { type: 'lg_bad_json', message: 'Thân yêu cầu không phải JSON' } }); }
  const allowed = (d.env.AI_ALLOWED_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean); const list = allowed.length ? allowed : DEFAULT_MODELS;
  if (!list.includes(body.model)) return json(400, { error: { type: 'lg_model', message: 'Model không được phép: ' + body.model } });
  if (!d.env.ANTHROPIC_API_KEY) return json(500, { error: { type: 'lg_config', message: 'Máy chủ chưa cấu hình ANTHROPIC_API_KEY' } });
  const limit = Number(d.env.AI_LIMIT_PER_HOUR || 30);
  if ((await d.countLastHour(user.id)) >= limit) return json(429, { error: { type: 'lg_rate_limit', message: 'Hết ' + limit + ' lượt AI trong giờ này — thử lại sau' } }, { 'Retry-After': '3600' });
  await d.record(user.id);
  const payload = { model: body.model, max_tokens: Math.min(Number(body.max_tokens) || 4096, 16000), messages: body.messages, ...(body.output_config ? { output_config: body.output_config } : {}), ...(body.system ? { system: body.system } : {}) };
  const up = await d.fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': d.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(payload) });
  return new Response(await up.text(), { status: up.status, headers: { 'Content-Type': 'application/json', ...CORS } });
}
