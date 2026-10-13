import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openSharedDoc } from "@/lib/share-view.functions";

export const Route = createFileRoute("/s/$token")({
  head: () => ({
    meta: [
      { title: "Tài liệu được chia sẻ — Ghi Nhanh" },
      { name: "description", content: "Xem tài liệu được chia sẻ qua Ghi Nhanh." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Tài liệu được chia sẻ — Ghi Nhanh" },
      { property: "og:description", content: "Xem tài liệu được chia sẻ qua Ghi Nhanh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SharedView,
});

type Res = { ok: true; name: string; images: string[] } | { ok: false; code: string; message: string };

function SharedView() {
  const { token } = Route.useParams();
  const open = useServerFn(openSharedDoc);
  const [res, setRes] = useState<Res | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(true);
  const load = async (password = "") => {
    setBusy(true);
    if (!/^[A-Za-z0-9_-]{22}$/.test(token)) { setRes({ ok: false, code: "missing", message: "Liên kết không tồn tại." }); setBusy(false); return; }
    try { setRes(await open({ data: { token, password } })); }
    catch { setRes({ ok: false, code: "missing", message: "Không mở được liên kết. Kiểm tra mạng rồi thử lại." }); }
    finally { setBusy(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- HM-06: load chỉ dùng token (đã có trong deps) và hàm gọi máy chủ ổn định; mật khẩu chỉ gửi khi người dùng bấm
  useEffect(() => { void load(); }, [token]);

  if (busy && !res) return <div className="grid min-h-dvh place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (res && !res.ok) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="w-full max-w-sm">
          {res.code === "password" ? <Lock className="mx-auto size-8 text-primary" /> : null}
          <p className="mt-3 font-display font-semibold">{res.message}</p>
          {res.code === "password" ? (
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void load(pw); }}>
              <Input className="h-11" type="password" autoFocus placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)} />
              <Button disabled={busy || !pw}>{busy ? <Loader2 className="animate-spin" /> : "Mở"}</Button>
            </form>
          ) : <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">Về Ghi Nhanh</Link>}
        </div>
      </main>
    );
  }
  if (!res?.ok) return null;
  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="font-display text-lg font-semibold">{res.name || "Tài liệu"}</h1>
      <p className="text-xs text-muted-foreground">{res.images.length} trang · chỉ xem</p>
      <div className="mt-4 space-y-3">{res.images.map((u, i) => <img key={u} src={u} alt={`Trang ${i + 1}`} loading="lazy" className="w-full rounded-lg border border-border" />)}</div>
    </main>
  );
}
