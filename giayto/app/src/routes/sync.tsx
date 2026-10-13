import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CloudDownload, CloudUpload, RefreshCw, Smartphone, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useDocs } from "@/lib/db";
import { useUser } from "@/lib/auth";
import { cloudStatus, deleteAccountData, lastSyncAt, type Resolutions, syncAll, type SyncRow } from "@/lib/cloud-sync";
import { confirmDialog } from "@/lib/dialog";
import { showError } from "@/lib/errors";

export const Route = createFileRoute("/sync")({
  head: () => ({ meta: [
    { title: "Đồng bộ đám mây — Ghi Nhanh" },
    { name: "description", content: "Xem trạng thái đồng bộ, xử lý xung đột giữa máy và đám mây, xoá tài khoản." },
    { property: "og:title", content: "Đồng bộ đám mây — Ghi Nhanh" },
    { property: "og:description", content: "Xem trạng thái đồng bộ, xử lý xung đột giữa máy và đám mây, xoá tài khoản." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: SyncPage,
});

const LABEL: Record<SyncRow["state"], string> = {
  same: "Giống nhau", "local-only": "Chỉ có trên máy", "cloud-only": "Chỉ có trên mây",
  "local-newer": "Máy mới hơn", "cloud-newer": "Mây mới hơn", conflict: "Xung đột",
};
const t = (n?: number) => (n ? new Date(n).toLocaleString("vi-VN") : "—");

function SyncPage() {
  const { docs, trash } = useDocs();
  const { user } = useUser();
  const nav = useNavigate();
  const [rows, setRows] = useState<SyncRow[] | null>(null);
  const [busy, setBusy] = useState("");
  const [res, setRes] = useState<Resolutions>({});
  const all = [...docs, ...trash];

  const refresh = useCallback(async () => {
    try { setRows(await cloudStatus([...docs, ...trash])); } catch (e) { showError(e, "Chưa xem được trạng thái"); }
  }, [docs, trash]);
  useEffect(() => { if (user) void refresh(); }, [user, refresh]);

  if (!user) return (
    <AppShell title="Đồng bộ" action={<Back />}>
      <section className="px-5 pt-4 text-sm"><Link to="/auth" className="font-semibold text-primary">Đăng nhập</Link> để đồng bộ.</section>
    </AppShell>
  );

  const conflicts = rows?.filter((r) => r.state === "conflict") ?? [];
  const count = (s: SyncRow["state"]) => rows?.filter((r) => r.state === s).length ?? 0;
  const pending = conflicts.filter((c) => !res[c.id]).length;

  async function run() {
    setBusy("Đang chuẩn bị…");
    try {
      const r = await syncAll(all, setBusy, res);
      if (r.failed.length) toast.error(`Chưa đồng bộ được ${r.failed.length} tài liệu`, { description: r.failed.slice(0, 3).join(", ") });
      else toast.success(`Đã tải về ${r.received} · tải lên ${r.sent} tài liệu`);
      setRes({}); await refresh();
    } catch (e) { showError(e, "Chưa đồng bộ được"); } finally { setBusy(""); }
  }

  async function removeAccount() {
    if (!(await confirmDialog("Xoá tài khoản và dữ liệu trên mây?", { message: "Tài liệu trên máy này vẫn giữ nguyên. Dữ liệu trên mây và tài khoản bị xoá hẳn.", okText: "Xoá tài khoản", danger: true }))) return;
    setBusy("Đang xoá…");
    try { await deleteAccountData(); toast("Đã xoá tài khoản"); void nav({ to: "/me" }); }
    catch (e) { showError(e, "Chưa xoá được tài khoản"); } finally { setBusy(""); }
  }

  return (
    <AppShell title="Đồng bộ" action={<Back />}>
      <section className="space-y-4 px-5 pb-28 pt-2">
        <p className="text-xs text-muted-foreground">{user.email} · lần đồng bộ trước: {t(lastSyncAt())}</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {(["same", "local-newer", "cloud-newer", "local-only", "cloud-only", "conflict"] as const).map((s) => (
            <div key={s} className="rounded-xl border bg-card p-3"><div className="text-xl font-bold">{rows ? count(s) : "…"}</div><div className="text-xs text-muted-foreground">{LABEL[s]}</div></div>
          ))}
        </div>

        {conflicts.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><TriangleAlert className="size-4 text-destructive" /> Sửa ở cả hai nơi — chọn bản giữ lại</h2>
            {conflicts.map((c) => (
              <div key={c.id} className="rounded-xl border bg-card p-3 text-sm">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">Máy: {t(c.localAt)} · Mây: {t(c.cloudAt)}</div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant={res[c.id] === "local" ? "default" : "outline"} onClick={() => setRes({ ...res, [c.id]: "local" })}><Smartphone /> Bản trên máy</Button>
                  <Button size="sm" variant={res[c.id] === "cloud" ? "default" : "outline"} onClick={() => setRes({ ...res, [c.id]: "cloud" })}><CloudDownload /> Bản trên mây</Button>
                </div>
              </div>
            ))}
            {pending > 0 && <p className="text-xs text-muted-foreground">Chưa chọn {pending} tài liệu — sẽ dùng bản sửa sau cùng.</p>}
          </div>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={!!busy} onClick={run}><CloudUpload /> {busy || "Đồng bộ ngay"}</Button>
          <Button variant="outline" disabled={!!busy} onClick={refresh} aria-label="Làm mới"><RefreshCw /></Button>
        </div>

        <div className="border-t pt-4">
          <Button variant="outline" className="w-full text-destructive" disabled={!!busy} onClick={removeAccount}><Trash2 /> Xoá tài khoản</Button>
        </div>
      </section>
    </AppShell>
  );
}

function Back() {
  return <Link to="/me" aria-label="Về trang Tôi" className="grid size-10 place-items-center rounded-full"><ArrowLeft className="size-5" /></Link>;
}
