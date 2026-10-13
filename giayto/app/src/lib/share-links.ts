// G3-06: chia sẻ liên kết — mã ngẫu nhiên, hạn dùng, mật khẩu (PBKDF2). Không phụ thuộc trình duyệt/server.
export const EXPIRY_OPTIONS = [
  { id: "1h", label: "1 giờ", ms: 3600_000 },
  { id: "1d", label: "1 ngày", ms: 86400_000 },
  { id: "7d", label: "7 ngày", ms: 7 * 86400_000 },
  { id: "30d", label: "30 ngày", ms: 30 * 86400_000 },
  { id: "never", label: "Không hết hạn", ms: 0 },
] as const;
export type ExpiryId = (typeof EXPIRY_OPTIONS)[number]["id"];

/** Thời điểm hết hạn (ISO) hoặc null nếu không hết hạn. */
export function expiresAt(id: ExpiryId, now: number): string | null {
  const o = EXPIRY_OPTIONS.find((x) => x.id === id);
  if (!o) throw new Error("Hạn dùng không hợp lệ");
  return o.ms ? new Date(now + o.ms).toISOString() : null;
}

const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
/** Mã liên kết 22 ký tự (~132 bit ngẫu nhiên). */
export function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(22));
  return Array.from(b, (x) => B64URL[x & 63]).join("");
}

const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));
const ITER = 100_000;

async function derive(pw: string, salt: Uint8Array, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, key, 256));
}

/** Băm mật khẩu: "pbkdf2$<lặp>$<muối>$<băm>". */
export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${hex(salt)}$${await derive(pw, salt, ITER)}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, it, salt, h] = stored.split("$");
  if (alg !== "pbkdf2" || !it || !salt || !h) return false;
  const got = await derive(pw, unhex(salt), Number(it));
  let diff = got.length ^ h.length;
  for (let i = 0; i < Math.min(got.length, h.length); i++) diff |= got.charCodeAt(i) ^ h.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(pw: string): string | null {
  if (!pw) return null;
  if (pw.length < 4) return "Mật khẩu cần ít nhất 4 ký tự";
  if (pw.length > 64) return "Mật khẩu tối đa 64 ký tự";
  return null;
}

export type LinkState = { expires_at: string | null; revoked_at: string | null };
export function linkStatus(l: LinkState, now: number): "active" | "expired" | "revoked" {
  if (l.revoked_at) return "revoked";
  if (l.expires_at && Date.parse(l.expires_at) <= now) return "expired";
  return "active";
}

export const shareUrl = (origin: string, token: string) => `${origin.replace(/\/$/, "")}/s/${token}`;
