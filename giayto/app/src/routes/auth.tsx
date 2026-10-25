import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { signInEmail, signInGoogle, signUpEmail, useUser } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Đăng nhập — Ghi Nhanh" },
    { name: "description", content: "Đăng nhập tùy chọn bằng email hoặc Google để chuẩn bị đồng bộ tài liệu." },
    { property: "og:title", content: "Đăng nhập — Ghi Nhanh" },
    { property: "og:description", content: "Đăng nhập tùy chọn bằng email hoặc Google để chuẩn bị đồng bộ tài liệu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useUser();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { if (user) nav({ to: "/me" }); }, [user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      if (mode === "in") { await signInEmail(email.trim(), pw); toast.success("Đã đăng nhập"); }
      else { const r = await signUpEmail(email.trim(), pw); toast.success(r.needConfirm ? "Đã gửi thư xác nhận — mở email để kích hoạt" : "Đã tạo tài khoản"); }
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }
  async function google() {
    setErr(""); setBusy(true);
    try { await signInGoogle(); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }

  return (
    <AppShell title={mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}>
      <section className="rise rise-1 mx-auto max-w-sm space-y-4 px-5 pt-4">
        <p className="text-sm text-muted-foreground">Không bắt buộc. App vẫn dùng đầy đủ khi chưa đăng nhập; tài khoản dùng để đồng bộ tài liệu giữa các máy (sắp có).</p>
        <button type="button" disabled={busy} onClick={google} className="document-row flex w-full items-center justify-center gap-2 rounded-[14px] p-3 text-sm font-semibold disabled:opacity-50">
          Tiếp tục với Google
        </button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />hoặc email<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-[12px] border border-input bg-background px-3 py-2.5 text-sm" />
          <input type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Mật khẩu (ít nhất 6 ký tự)" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-[12px] border border-input bg-background px-3 py-2.5 text-sm" />
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-[14px] bg-primary p-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }} className="w-full py-3 text-center text-sm font-semibold text-primary">
          {mode === "in" ? "Chưa có tài khoản? Tạo mới" : "Đã có tài khoản? Đăng nhập"}
        </button>
        <Link to="/me" className="block py-3 text-center text-xs text-muted-foreground">Để sau</Link>
      </section>
    </AppShell>
  );
}
