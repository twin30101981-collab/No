// G3-06/07: tạo, liệt kê và thu hồi liên kết chia sẻ; người nhận xem tại /s/<mã>.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Copy, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Doc } from "@/lib/db";
import { useUser } from "@/lib/auth";
import { uploadAll } from "@/lib/cloud-sync";
import { createShareLink, listShareLinks } from "@/lib/share.functions";
import { revokeShareLink } from "@/lib/share-view.functions";
import { confirmDialog } from "@/lib/dialog";
import { checkPassword, EXPIRY_OPTIONS, linkStatus, shareUrl, type ExpiryId } from "@/lib/share-links";
import { showError } from "@/lib/errors";

export function ShareLinkPanel({ doc }: { doc: Doc }) {
  const { user, ready } = useUser();
  const create = useServerFn(createShareLink);
  const [expiry, setExpiry] = useState<ExpiryId>("7d");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const pwErr = checkPassword(pw);
  const list = useServerFn(listShareLinks); const revoke = useServerFn(revokeShareLink);
  const [links, setLinks] = useState<Awaited<ReturnType<typeof listShareLinks>>>([]);
  const refresh = () => list({ data: { localId: doc.id } }).then(setLinks).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- HM-06: refresh chỉ phụ thuộc doc.id (đã có trong deps) và hàm gọi máy chủ ổn định; không muốn gọi lại mỗi lần render
  useEffect(() => { if (user) void refresh(); }, [user, doc.id]);
  async function doRevoke(id: string) {
    if (!(await confirmDialog("Thu hồi liên kết?", { message: "Người đang có liên kết sẽ không xem được nữa.", okText: "Thu hồi", danger: true }))) return;
    const r = await revoke({ data: { id } }).catch(() => ({ ok: false as const, message: "Chưa thu hồi được, thử lại sau." }));
    if (r.ok) { toast.success("Đã thu hồi"); void refresh(); } else showError(new Error(r.message), r.message);
  }

  async function make() {
    setBusy(true); setUrl("");
    try {
      const up = await uploadAll([doc]);
      if (up.failed.length) throw new Error("Chưa tải được tài liệu lên mây. Kiểm tra mạng rồi thử lại.");
      const r = await create({ data: { localId: doc.id, expiry, password: pw } });
      if (!r.ok) throw new Error(r.message);
      const u = shareUrl(window.location.origin, r.token); setUrl(u);
      await navigator.clipboard?.writeText(u).catch(() => {});
      toast.success("Đã tạo và chép liên kết"); void refresh();
    } catch (e) { showError(e, "Chưa tạo được liên kết"); } finally { setBusy(false); }
  }

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4 text-primary" /> Chia sẻ bằng liên kết</p>
      {!ready ? null : !user ? (
        <p className="mt-1 text-xs text-muted-foreground">Cần đăng nhập để tạo liên kết. <Link to="/auth" className="font-semibold text-primary">Đăng nhập</Link></p>
      ) : (<>
        <p className="mt-1 text-xs text-muted-foreground">Tài liệu được tải lên mây; ai có liên kết (và mật khẩu, nếu đặt) xem được đến khi hết hạn.</p>
        <div className="mt-2 flex flex-wrap gap-2">{EXPIRY_OPTIONS.map((o) => <Button key={o.id} size="sm" variant={expiry === o.id ? "default" : "glass"} onClick={() => setExpiry(o.id)}>{o.label}</Button>)}</div>
        <Input className="mt-2 h-11" type="password" autoComplete="new-password" placeholder="Mật khẩu (không bắt buộc)" value={pw} onChange={(e) => setPw(e.target.value)} />
        {pwErr ? <p className="mt-1 text-xs text-destructive">{pwErr}</p> : null}
        <Button className="mt-2 w-full" disabled={busy || !!pwErr} onClick={make}>{busy ? <Loader2 className="animate-spin" /> : <Link2 />} Tạo liên kết</Button>
        {url ? (
          <div className="mt-2 flex gap-2">
            <Input className="h-11" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="glass" aria-label="Chép liên kết" onClick={() => navigator.clipboard?.writeText(url).then(() => toast.success("Đã chép"))}><Copy /></Button>
          </div>
        ) : null}
        {links.length ? <ul className="mt-3 space-y-2">{links.map((l) => { const st = linkStatus(l, Date.now()); return (
          <li key={l.id} className="flex items-center gap-2 text-xs">
            <span className="min-w-0 flex-1 truncate">…/s/{l.token.slice(0, 6)} · {st === "active" ? (l.expires_at ? `hết hạn ${new Date(l.expires_at).toLocaleString("vi-VN")}` : "không hết hạn") : st === "expired" ? "đã hết hạn" : "đã thu hồi"}{l.hasPassword ? " · có mật khẩu" : ""}</span>
            {st === "active" ? <Button size="sm" variant="glass" className="text-destructive" onClick={() => doRevoke(l.id)}>Thu hồi</Button> : null}
          </li>); })}</ul> : null}
      </>)}
    </div>
  );
}
