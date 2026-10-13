// G3-02: đăng nhập tùy chọn — app vẫn chạy đầy đủ khi chưa đăng nhập.
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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
export async function signInGoogle() {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  if (r.error) throw new Error(authMessage(String((r.error as Error).message ?? r.error)));
  return r;
}
export async function signOut() { if (!cloudReady()) return; await supabase.auth.signOut(); }
