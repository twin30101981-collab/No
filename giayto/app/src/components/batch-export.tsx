import { useQueuedServerFn } from "@/lib/ai-queue";
import { useState } from "react";
import { FileArchive, FileSpreadsheet, FileText, FileType2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { aiLayout, aiTable } from "@/lib/ai.functions";
import { batchMerged, batchSeparate, type BatchFormat } from "@/lib/batch";
import { docText, type Doc } from "@/lib/db";
import { showError } from "@/lib/errors";
import { docToPdf, download, imagesToPdf, safeName } from "@/lib/files";
import { recordFile, registerSource } from "@/lib/history";
import type { Review } from "@/lib/review";
import { ExportReview } from "@/components/export-review";

const FORMATS: { id: BatchFormat; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "pdf", label: "PDF", icon: FileText }, { id: "word", label: "Word", icon: FileType2 }, { id: "excel", label: "Excel", icon: FileSpreadsheet },
];

/** Pick format + separate/merged, convert all chosen documents in one go. */
export function BatchExport({ docs, open, onClose, onDone }: { docs: Doc[]; open: boolean; onClose: () => void; onDone: () => void }) {
  const [fmt, setFmt] = useState<BatchFormat>("pdf");
  const [merged, setMerged] = useState(false);
  const [bundle, setBundle] = useState(false);
  const [prog, setProg] = useState<{ done: number; total: number; name: string } | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const layout = useQueuedServerFn(aiLayout, "Đọc bố cục"); const table = useQueuedServerFn(aiTable, "Đọc bảng");
  const fns = { layout, table };
  const ext = fmt === "pdf" ? "pdf" : fmt === "word" ? "docx" : "xlsx";
  const title = `${docs.length} tài liệu`;

  async function runBundle() {
    setProg({ done: 0, total: docs.length, name: "" });
    try {
      const { buildBatchBundle } = await import("@/lib/export-bundle");
      const r = await buildBatchBundle(docs.map((d) => ({ name: safeName(d.name), pdf: () => docToPdf(d), pages: d.pages.map((p) => p.src), text: docText(d) })), (done, total, name) => setProg({ done, total, name }));
      if (!r.blob) throw new Error("Không đóng gói được tài liệu nào");
      const out = `ghi-nhanh-${docs.length}-tai-lieu-goi-day-du.zip`; download(r.blob, out);
      recordFile({ kind: "Hàng loạt → Gói đầy đủ", sourceName: title, outputBlob: r.blob, outputName: out, details: docs.map((d) => `${d.name} (${d.pages.length} trang)`),
        warnings: r.failed.length ? [`${r.failed.length} tài liệu chưa đóng gói được`] : [] }).catch((e) => console.error("history", e));
      toast.success(`Đã đóng gói ${r.count}/${docs.length} tài liệu`);
      if (r.failed.length) toast(`Chưa đóng gói được: ${r.failed.join(", ")}`);
      onDone();
    } catch (e) { showError(e, "Không đóng gói được"); } finally { setProg(null); }
  }

  async function run() {
    if (bundle) return runBundle();
    setProg({ done: 0, total: docs.length, name: "" });
    const onP = (done: number, total: number, name: string) => setProg({ done, total, name });
    const warn = (m: string) => toast(m);
    const names = docs.map((d) => `${d.name} (${d.pages.length} trang)`);
    const kind = `Hàng loạt → ${fmt === "pdf" ? "PDF" : fmt === "word" ? "Word" : "Excel"}`;
    const allPdf = () => imagesToPdf(docs.flatMap((d) => d.pages.map((p) => p.src)), { searchable: true });
    try {
      if (merged) {
        const r = await batchMerged(docs, fmt, fns, onP, warn);
        if (r.kind === "pdf") {
          const out = `gop-${docs.length}-tai-lieu.pdf`; download(r.blob, out); toast.success("Đã lưu PDF gộp");
          recordFile({ kind: `${kind} (gộp)`, sourceName: title, outputBlob: r.blob, outputName: out, details: names }).catch((e) => console.error("history", e));
          onDone();
        } else {
          const source = { kind: `${kind} (gộp)`, name: `${title}.pdf`, lazy: registerSource(allPdf), details: names };
          onClose(); setReview(r.kind === "word" ? { kind: "word", title: `Gộp ${title}`, blocks: r.blocks, source } : { kind: "excel", title: `Gộp ${title}`, sheets: r.sheets, source });
        }
      } else {
        const r = await batchSeparate(docs, fmt, fns, onP, warn);
        if (!r.count) throw new Error("Không chuyển được tài liệu nào");
        const out = `ghi-nhanh-${docs.length}-tai-lieu-${ext}.zip`; download(r.blob, out);
        const ok = docs.filter((d) => !r.failed.includes(d.name)).map((d) => `${d.name} (${d.pages.length} trang)`);
        const src = await allPdf().catch(() => undefined);
        recordFile({ kind: `${kind} (mỗi tài liệu một tệp)`, sourceName: `${title}.pdf`, outputBlob: r.blob, outputName: out, sourceBlob: src && new File([src], `${title}.pdf`, { type: "application/pdf" }),
          details: [...ok, ...r.failed.map((n) => `Bỏ qua: ${n}`)], warnings: r.failed.length ? [`${r.failed.length} tài liệu chưa chuyển được`] : [] }).catch((e) => console.error("history", e));
        toast.success(`Đã chuyển ${r.count}/${docs.length} tài liệu`);
        if (r.failed.length) toast(`Chưa chuyển được: ${r.failed.join(", ")}`);
        onDone();
      }
    } catch (e) { showError(e, "Không chuyển được"); } finally { setProg(null); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && !prog && onClose()}>
        <DialogContent className="max-w-[92vw] rounded-[18px] sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="font-display">Xuất {title}</DialogTitle></DialogHeader>
          <p className="text-xs font-medium text-muted-foreground">Định dạng</p>
          <div className="grid grid-cols-3 gap-2">{FORMATS.map((f) => (
            <Button key={f.id} variant={fmt === f.id ? "default" : "glass"} className="h-16 flex-col gap-1" disabled={!!prog} onClick={() => setFmt(f.id)}><f.icon className="size-5" />{f.label}</Button>
          ))}</div>
          <Button variant={bundle ? "default" : "glass"} className="h-auto justify-start gap-2 whitespace-normal py-2 text-left" disabled={!!prog} onClick={() => setBundle(!bundle)}>
            <FileArchive className="size-5 shrink-0" /><span className="flex flex-col"><span>Gói đầy đủ</span><span className="text-[0.6875rem] font-normal opacity-80">Mỗi tài liệu một thư mục: PDF + ảnh từng trang + chữ</span></span></Button>
          {!bundle && <><p className="text-xs font-medium text-muted-foreground">Cách xuất</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={!merged ? "default" : "glass"} className="h-auto flex-col items-start whitespace-normal py-2 text-left" disabled={!!prog} onClick={() => setMerged(false)}>
              <span>Mỗi tài liệu một tệp</span><span className="text-[0.6875rem] font-normal opacity-80">Gói trong một tệp nén</span></Button>
            <Button variant={merged ? "default" : "glass"} className="h-auto flex-col items-start whitespace-normal py-2 text-left" disabled={!!prog} onClick={() => setMerged(true)}>
              <span>Gộp thành một tệp</span><span className="text-[0.6875rem] font-normal opacity-80">{fmt === "excel" ? "Mỗi tài liệu một trang tính" : "Nối tiếp theo thứ tự"}</span></Button>
          </div></>}
          {!bundle && fmt !== "pdf" && <p className="text-xs text-muted-foreground">Word/Excel dùng AI đọc từng trang nên mất vài giây mỗi trang.</p>}
          {prog && (
            <div className="space-y-1.5">
              <Progress value={(prog.done / Math.max(1, prog.total)) * 100} />
              <p className="truncate text-xs text-muted-foreground">Đang xử lý {Math.min(prog.done + 1, prog.total)}/{prog.total}{prog.name ? ` · ${prog.name}` : ""}</p>
            </div>
          )}
          <Button onClick={run} disabled={!!prog}>{prog ? <Loader2 className="animate-spin" /> : null} Xuất {docs.length} tài liệu</Button>
        </DialogContent>
      </Dialog>
      <ExportReview review={review} onClose={() => { setReview(null); onDone(); }} />
    </>
  );
}
