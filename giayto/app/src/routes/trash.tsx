import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { purgeDocs, restoreDocs, useDocs } from "@/lib/db";
import { confirmDialog } from "@/lib/dialog";
import { leftLabel, TRASH_DAYS } from "@/lib/trash";

export const Route = createFileRoute("/trash")({
  head: () => ({ meta: [
    { title: "Thùng rác — Ghi Nhanh" },
    { name: "description", content: "Khôi phục tài liệu đã xóa hoặc xóa hẳn. Tài liệu tự xóa sau 30 ngày." },
    { property: "og:title", content: "Thùng rác — Ghi Nhanh" },
    { property: "og:description", content: "Khôi phục tài liệu đã xóa hoặc xóa hẳn. Tài liệu tự xóa sau 30 ngày." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: TrashPage,
});

function TrashPage() {
  const { trash, ready } = useDocs();
  const items = [...trash].sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));

  async function purge(ids: string[], label: string) {
    if (!(await confirmDialog(label, { message: "Không thể khôi phục sau khi xóa hẳn.", okText: "Xóa hẳn", danger: true }))) return;
    await purgeDocs(ids); toast(`Đã xóa hẳn ${ids.length} tài liệu`);
  }

  return (
    <AppShell title="Thùng rác" action={<Link to="/me" aria-label="Về trang Tôi" className="grid size-10 place-items-center rounded-full"><ArrowLeft className="size-5" /></Link>}>
      <section className="space-y-3 px-5 pb-28 pt-2">
        <p className="text-xs text-muted-foreground">Tài liệu đã xóa được giữ {TRASH_DAYS} ngày rồi tự xóa hẳn.</p>
        {items.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={async () => { const ids = items.map((d) => d.id); await restoreDocs(ids); toast(`Đã khôi phục ${ids.length} tài liệu`); }}><RotateCcw /> Khôi phục tất cả</Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => purge(items.map((d) => d.id), `Dọn sạch ${items.length} tài liệu?`)}><Trash2 /> Dọn sạch</Button>
          </div>
        )}
        {ready && !items.length && <div className="document-row rounded-[16px] p-6 text-center text-sm text-muted-foreground">Thùng rác trống</div>}
        {items.map((d) => (
          <div key={d.id} className="document-row flex items-center gap-3 rounded-[16px] p-3">
            {d.pages[0] && <img src={d.pages[0].thumb ?? d.pages[0].src} alt="" className="size-12 shrink-0 rounded-[10px] object-cover opacity-70" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.name}</p>
              <p className="text-xs text-muted-foreground">{d.pages.length} trang · {leftLabel(d.deletedAt!)}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Khôi phục" onClick={async () => { await restoreDocs([d.id]); toast("Đã khôi phục", { description: d.name }); }}><RotateCcw /></Button>
            <Button variant="ghost" size="icon" aria-label="Xóa hẳn" className="text-destructive" onClick={() => purge([d.id], `Xóa hẳn “${d.name}”?`)}><Trash2 /></Button>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
