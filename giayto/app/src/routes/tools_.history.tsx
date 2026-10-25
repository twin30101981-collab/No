import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Download, FileArchive, FileSpreadsheet, FileText, FileType2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ExportReview } from "@/components/export-review";
import { confirmDialog } from "@/lib/dialog";
import { download } from "@/lib/files";
import { deleteConversions, MAX_ITEMS, useConversions, type Conversion } from "@/lib/history";
import { fmtSize, type Review } from "@/lib/review";

export const Route = createFileRoute("/tools_/history")({
  head: () => ({ meta: [
    { title: "Lịch sử chuyển đổi — Ghi Nhanh" },
    { name: "description", content: "Xem lại các lần chuyển PDF, ảnh, Excel sang Word/Excel; tải lại tệp và sửa các ô chưa chắc." },
    { property: "og:title", content: "Lịch sử chuyển đổi — Ghi Nhanh" },
    { property: "og:description", content: "Xem lại các lần chuyển PDF, ảnh, Excel sang Word/Excel; tải lại tệp và sửa các ô chưa chắc." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: HistoryPage,
});

const when = (t: number) => new Date(t).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

function HistoryPage() {
  const items = useConversions();
  const [filter, setFilter] = useState("all");
  const [review, setReview] = useState<Review | null>(null);
  const kinds = useMemo(() => [...new Set((items ?? []).map((c) => c.kind))], [items]);
  const shown = (items ?? []).filter((c) => filter === "all" || c.kind === filter);

  const reopen = (c: Conversion) => c.review && setReview({ ...c.review, source: { historyId: c.id, kind: c.kind, name: c.sourceName } } as Review);
  const remove = async (c: Conversion) => { if (await confirmDialog("Xoá mục này?", { okText: "Xoá", danger: true })) { await deleteConversions([c.id]); toast("Đã xoá"); } };
  const clearAll = async () => { if (items?.length && await confirmDialog(`Xoá toàn bộ ${items.length} mục lịch sử?`, { okText: "Xoá hết", danger: true })) { await deleteConversions(items.map((c) => c.id)); toast("Đã xoá lịch sử"); } };

  return (
    <AppShell title="Lịch sử chuyển đổi" action={<Link to="/tools" aria-label="Về Công cụ" className="grid size-10 place-items-center rounded-full"><ArrowLeft className="size-5" /></Link>}>
      <section className="space-y-3 px-5 pb-28 pt-2">
        <p className="text-xs text-muted-foreground">Giữ {MAX_ITEMS} lần gần nhất (tối đa 200 MB) trên máy này. Mục cũ tự xoá.</p>
        {kinds.length > 1 && (
          <div className="flex gap-1 overflow-x-auto">
            {["all", ...kinds].map((k) => <Button key={k} size="sm" variant={filter === k ? "default" : "glass"} onClick={() => setFilter(k)}>{k === "all" ? "Tất cả" : k}</Button>)}
          </div>
        )}
        {items === null ? <p className="text-sm text-muted-foreground">Đang tải…</p>
          : !shown.length ? <p className="py-10 text-center text-sm text-muted-foreground">Chưa có lần chuyển đổi nào. Kết quả sẽ hiện ở đây sau khi bạn bấm Lưu tệp.</p>
          : shown.map((c) => {
            const total = c.pages.reduce((n, p) => n + p.unsure.length, 0);
            const Icon = c.outputName.endsWith(".xlsx") ? FileSpreadsheet : c.outputName.endsWith(".zip") ? FileArchive : c.outputName.endsWith(".pdf") ? FileText : FileType2;
            return (
              <article key={c.id} className="document-row space-y-2 rounded-[16px] p-4">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.outputName}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.kind} · {c.sourceName} · {when(c.at)} · {fmtSize(c.outputBlob.size)}</p>
                  </div>
                </div>
                {!!c.details?.length && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Chi tiết ({c.details.length})</summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">{c.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
                  </details>
                )}
                {c.warnings.map((w, i) => <p key={i} className="text-xs text-muted-foreground">{w}</p>)}
                {!c.review ? null : total > 0
                  ? <p className="flex flex-wrap items-center gap-1 text-xs text-warning-foreground"><AlertTriangle className="size-3.5" /> {total} ô chưa sửa: {c.pages.filter((p) => p.unsure.length).map((p) => `trang ${p.index + 1} (${p.unsure.length})`).join(", ")}</p>
                  : <p className="text-xs text-muted-foreground">Không còn ô chưa chắc</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => download(c.outputBlob, c.outputName)}><Download /> Tải lại</Button>
                  {c.sourceBlob && <Button size="sm" variant="glass" onClick={() => download(c.sourceBlob!, c.sourceName)}><Download /> Tệp gốc</Button>}
                  {c.review && <Button size="sm" variant="glass" onClick={() => reopen(c)}><Pencil /> Sửa</Button>}
                  <Button size="sm" variant="glass" aria-label="Xoá" onClick={() => remove(c)}><Trash2 /></Button>
                </div>
              </article>
            );
          })}
        {!!items?.length && <Button variant="glass" className="w-full" onClick={clearAll}><Trash2 /> Xoá toàn bộ lịch sử</Button>}
      </section>
      <ExportReview review={review} onClose={() => setReview(null)} />
    </AppShell>
  );
}
