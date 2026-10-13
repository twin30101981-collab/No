// BL-00 / GG-01, GG-07, GG-08: tiếp nhận kết quả đăng nhập khi bộ trung gian OAuth quay về app.
// Lỗi gốc: redirect_uri = trang chủ, nhưng trang chủ không khởi tạo Supabase (client tạo lười), mà thư viện chỉ đọc mã phiên
// trên URL đúng lúc khởi tạo → mã bị bỏ lỡ, mất khi đổi màn, người dùng vẫn "chưa đăng nhập". Nay __root gọi hàm này khi URL có mã.

export const AUTH_NEXT_KEY = "gn-auth-next";
/** Chỉ nhận kết quả đăng nhập ở các đường này (redirect_uri = gốc app; thư xác nhận email về /me). */
const AUTH_PATHS = ["/", "/auth", "/me"];

export type AuthCallbackKind = "tokens" | "code" | "error";
export type AuthCallbackInfo = { kind: AuthCallbackKind; error: string | null; accessToken: string | null; refreshToken: string | null };

type Loc = Pick<Location, "pathname" | "hash" | "search">;

const paramsOf = (l: Loc) => {
  const h = new URLSearchParams(l.hash.replace(/^#/, ""));
  const s = new URLSearchParams(l.search);
  const get = (k: string) => h.get(k) ?? s.get(k);
  return get;
};

/** URL hiện tại có phải là lượt quay về của đăng nhập không — null nếu không. */
export function parseAuthCallback(l: Loc = window.location): AuthCallbackInfo | null {
  if (!AUTH_PATHS.includes(l.pathname)) return null;
  const get = paramsOf(l);
  const err = get("error_description") ?? get("error") ?? get("error_code");
  const access = get("access_token"), refresh = get("refresh_token");
  if (access && refresh) return { kind: "tokens", error: null, accessToken: access, refreshToken: refresh };
  if (err) return { kind: "error", error: err, accessToken: null, refreshToken: null };
  if (get("code") && (l.pathname === "/" || l.pathname === "/auth")) return { kind: "code", error: null, accessToken: null, refreshToken: null };
  return null;
}
export const hasAuthCallback = (l: Loc = window.location): boolean => parseAuthCallback(l) !== null;

/** Chỉ cho đường nội bộ ("/me", "/sync"…): chặn "//evil", "http://…", "/\\evil" (chuyển hướng ra ngoài). */
export function safeNext(v: string | null | undefined, fallback = "/me"): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  return v;
}
export function rememberAuthNext(path: string, storage: Pick<Storage, "setItem"> | undefined = safeSession()): void {
  try { storage?.setItem(AUTH_NEXT_KEY, safeNext(path)); } catch { /* chế độ riêng tư: bỏ qua, về /me */ }
}
export function takeAuthNext(storage: Pick<Storage, "getItem" | "removeItem"> | undefined = safeSession()): string {
  try { const v = storage?.getItem(AUTH_NEXT_KEY); storage?.removeItem(AUTH_NEXT_KEY); return safeNext(v); } catch { return "/me"; }
}
function safeSession(): Storage | undefined { try { return typeof sessionStorage === "undefined" ? undefined : sessionStorage; } catch { return undefined; } }

type AuthClient = { auth: { getSession: () => Promise<{ data: { session: { user: { email?: string | null } | null } | null }; error?: unknown }>; setSession: (t: { access_token: string; refresh_token: string }) => Promise<{ data: { session: { user: { email?: string | null } | null } | null }; error?: unknown }> } };
export type AuthCallbackResult = { user: { email?: string | null } | null; error: string | null; next: string };

/**
 * Hoàn tất đăng nhập: khởi tạo Supabase (tự đọc mã trên URL), xác nhận có phiên, xoá mã khỏi thanh địa chỉ.
 * Ghi chú: mã vẫn bị xoá khỏi URL cả khi lỗi — để không nằm lại trong lịch sử/ảnh chụp màn hình.
 */
export async function completeAuthCallback(opts: {
  loc?: Loc; replaceUrl?: (path: string) => void; getClient?: () => Promise<AuthClient>; next?: () => string;
} = {}): Promise<AuthCallbackResult> {
  const loc = opts.loc ?? window.location;
  const info = parseAuthCallback(loc);
  const replaceUrl = opts.replaceUrl ?? ((p: string) => window.history.replaceState(window.history.state, "", p));
  const next = (opts.next ?? takeAuthNext)();
  if (!info) return { user: null, error: null, next };
  const clean = () => replaceUrl(loc.pathname);
  if (info.kind === "error") { clean(); return { user: null, error: info.error, next }; }
  try {
    const client = await (opts.getClient ?? (async () => (await import("@/integrations/supabase/client")).supabase as unknown as AuthClient))();
    // Khởi tạo client đã đọc mã trên URL; getSession() chờ xong bước đó.
    let { data, error } = await client.auth.getSession();
    // Dự phòng: nếu thư viện không tự nhận (cấu hình khác), nạp thẳng cặp mã đã đọc được.
    if (!data.session && info.accessToken && info.refreshToken) ({ data, error } = await client.auth.setSession({ access_token: info.accessToken, refresh_token: info.refreshToken }));
    clean();
    const user = data.session?.user ?? null;
    return { user, error: user ? null : (error ? String((error as Error).message ?? error) : "No tokens received"), next };
  } catch (e) {
    clean();
    return { user: null, error: e instanceof Error ? e.message : String(e), next };
  }
}

let inflight: Promise<AuthCallbackResult> | null = null;
/** Gọi từ __root: chạy đúng một lần cho một lượt quay về (StrictMode chạy effect hai lần). */
export function runAuthCallbackOnce(): Promise<AuthCallbackResult> | null {
  if (inflight) return inflight;
  if (!hasAuthCallback()) return null;
  inflight = completeAuthCallback().finally(() => { setTimeout(() => { inflight = null; }, 0); });
  return inflight;
}
