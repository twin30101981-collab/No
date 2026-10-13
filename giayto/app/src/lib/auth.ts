// G3-02: đăng nhập tùy chọn — app vẫn chạy đầy đủ khi chưa đăng nhập.
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { detectInAppBrowser } from "@/lib/in-app-browser";
import { rememberAuthNext } from "@/lib/auth-callback";

/** Có cấu hình đám mây chưa — thiếu thì mọi tính năng trên máy vẫn chạy, chỉ ẩn phần cần đăng nhập. */
export const cloudReady = (): boolean =>
  !!(import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);
export const NO_CLOUD = "Chưa kết nối máy chủ đám mây — tính năng này cần Lovable Cloud.";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!cloudReady()) { setReady(true); return; }
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setUser(s?.user ?? null); setReady(true); });
    supabase.auth.getSession().then(({ data: d }) => { setUser(d.session?.user ?? null); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, ready };
}

/** Lỗi đăng nhập -> câu tiếng Việt dễ hiểu. */
export function authMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Sai email hoặc mật khẩu";
  if (m.includes("email not confirmed")) return "Email chưa xác nhận — mở thư xác nhận trong hộp thư";
  if (m.includes("already registered")) return "Email này đã có tài khoản — hãy đăng nhập";
  if (m.includes("password") && (m.includes("6") || m.includes("short") || m.includes("weak"))) return "Mật khẩu quá yếu (ít nhất 6 ký tự)";
  if (m.includes("rate limit")) return "Thử quá nhiều lần, đợi một lát rồi thử lại";
  if (m.includes("fetch") || m.includes("network")) return "Mất mạng — kiểm tra kết nối rồi thử lại";
  // Lỗi của bộ đăng nhập Google (thư viện @lovable.dev/cloud-auth-js + bộ trung gian) — GG-05, GG-07
  if (m.includes("popup was blocked")) return "Trình duyệt chặn cửa sổ đăng nhập — cho phép cửa sổ bật lên cho trang này rồi thử lại, hoặc mở app ở tab riêng";
  if (m.includes("sign in was cancelled") || m.includes("access_denied") || m.includes("user cancelled")) return "Đăng nhập Google chưa hoàn tất (đã huỷ hoặc không được cho phép) — bấm lại để thử";
  if (m.includes("not supported in preview mode")) return "Không đăng nhập được trong khung xem trước — mở app ở tab trình duyệt mới rồi đăng nhập";
  if (m.includes("state is invalid")) return "Phiên đăng nhập đã hết hạn hoặc bị mở ở tab khác — bấm đăng nhập lại";
  if (m.includes("no tokens received")) return "Google đã xác nhận nhưng app chưa nhận được phiên — thử lại; nếu vẫn lỗi hãy đăng nhập bằng email";
  if (m.includes("timed out")) return "Đăng nhập quá lâu không phản hồi — kiểm tra mạng rồi thử lại";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "Đăng nhập Google chưa được bật cho ứng dụng này — dùng email, hoặc nhờ chủ ứng dụng bật Google trong phần Xác thực";
  if (m.includes("disallowed_useragent")) return "Google không cho đăng nhập trong trình duyệt của ứng dụng này — mở liên kết bằng Chrome hoặc Safari";
  if (m.includes("redirect") && (m.includes("not allowed") || m.includes("mismatch") || m.includes("invalid"))) return "Địa chỉ quay về chưa được phép — nhờ chủ ứng dụng thêm địa chỉ này vào danh sách chuyển hướng";
  if (m.includes("sign in failed")) return "Đăng nhập Google không thành công — thử lại hoặc dùng email";
  return msg;
}

export async function signInEmail(email: string, password: string) {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authMessage(error.message));
}
export async function signUpEmail(email: string, password: string) {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/me" } });
  if (error) throw new Error(authMessage(error.message));
  return { needConfirm: !data.session };
}
/** `next`: màn cần quay lại sau khi đăng nhập (mặc định /me). Bị chặn trong trình duyệt nhúng vì Google trả 403 disallowed_useragent. */
export async function signInGoogle(next = "/me") {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const app = detectInAppBrowser();
  if (app) throw new Error(authMessage("disallowed_useragent"));
  rememberAuthNext(next);
  const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (r.error) throw new Error(authMessage(String((r.error as Error).message ?? r.error)));
  return r;
}
export async function signOut() { if (!cloudReady()) return; await supabase.auth.signOut(); }
