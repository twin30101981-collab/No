import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Download, FileSpreadsheet, FileType2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { download, safeName } from "@/lib/files";
import { recordConversion } from "@/lib/history";
import { buildReview, clean, countUnsure, fmtSize, isUnsure, type Review } from "@/lib/review";

const cellCls = (s: string) =>
  "w-full min-w-[84px] rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring " +
  (isUnsure(s) ? "border-warning-foreground/40 bg-warning text-warning-foreground" : "border-border bg-background");

function Grid({ rows, onChange }: { rows: string[][]; onChange: (r: number, c: number, v: string) => void }) {
  const n = Math.max(1, ...rows.map((r) => r.length));
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="text-xs"><tbody>
        {rows.slice(0, 200).map((r, ri) => (
          <tr key={ri}>{Array.from({ length: n }, (_, ci) => (
            <td key={ci} className="p-0.5"><input aria-label={`Hàng ${ri + 1} cột ${ci + 1}`} className={cellCls(r[ci] ?? "") + (ri === 0 ? " font-semibold" : "")} value={r[ci] ?? ""} onChange={(e) => onChange(ri, ci, e.target.value)} /></td>
          ))}</tr>
        ))}
      </tbody></table>
    </div>
  );
}

/** Preview + edit before download. Highlights cells the reader was unsure about. */
export function ExportReview({ review, onClose }: { review: Review | null; onClose: () => void }) {
  const [r, setR] = useState<Review | null>(review);
  const [tab, setTab] = useState(0);
  useEffect(() => { setR(review); setTab(0); }, [review]);
  const blob = useMemo(() => (r ? buildReview(r) : null), [r]);
  const unsure = r ? countUnsure(r) : 0;
  if (!r) return null;

  const setCell = (bi: number, ri: number, ci: number, v: string) => setR((p) => {
    if (!p) return p; const c = structuredClone(p);
    const rows = c.kind === "word" ? c.blocks[bi].rows : c.sheets[bi].rows;
    while (rows[ri].length <= ci) rows[ri].push(""); rows[ri][ci] = v; return c;
  });
  const setText = (bi: number, v: string) => setR((p) => { if (!p || p.kind !== "word") return p; const c = structuredClone(p); c.blocks[bi].text = v; return c; });
  const acceptAll = () => setR((p) => {
    if (!p) return p; const c = structuredClone(p);
    if (c.kind === "word") c.blocks.forEach((b) => { b.text = clean(b.text); b.rows = b.rows.map((x) => x.map(clean)); });
    else c.sheets.forEach((s) => { s.rows = s.rows.map((x) => x.map(clean)); });
    return c;
  });
  const save = () => {
    if (!blob || !review) return;
    const name = `${safeName(r.title)}.${r.kind === "word" ? "docx" : "xlsx"}`;
    download(blob, name); toast.success(r.kind === "word" ? "Đã lưu Word" : "Đã lưu Excel");
    recordConversion(review, r, blob, name).catch((e) => console.error("history", e));
    onClose();
  };
  const Icon = r.kind === "word" ? FileType2 : FileSpreadsheet;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] max-w-[96vw] flex-col gap-3 rounded-[18px] sm:max-w-[720px]">
        <DialogHeader><DialogTitle className="flex items-center gap-2 font-display"><Icon className="size-5 text-primary" /> Xem lại trước khi lưu</DialogTitle></DialogHeader>
        <input aria-label="Tên tệp" className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium" value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">Dung lượng ước tính: {blob ? fmtSize(blob.size) : "…"}</span>
          {r.kind === "excel" && <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{r.sheets.length} trang tính</span>}
          {unsure > 0
            ? <span className="flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-warning-foreground"><AlertTriangle className="size-3.5" /> {unsure} ô đọc chưa chắc — hãy kiểm tra ô tô vàng</span>
            : <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">Không có ô nghi ngờ</span>}
        </div>
        {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
        {r.kind === "excel" && r.sheets.length > 1 && (
          <div className="flex gap-1 overflow-x-auto">{r.sheets.map((s, i) => (
            <Button key={i} size="sm" variant={i === tab ? "default" : "glass"} onClick={() => setTab(i)}>{s.name}{s.rows.flat().some(isUnsure) ? " •" : ""}</Button>
          ))}</div>
        )}
        <div className="min-h-0 flex-1 space-y-2 overflow-auto">
          {r.kind === "excel"
            ? (r.sheets[tab]?.rows.length ? <Grid rows={r.sheets[tab].rows} onChange={(ri, ci, v) => setCell(tab, ri, ci, v)} /> : <p className="text-sm text-muted-foreground">Trang này không có dữ liệu.</p>)
            : r.blocks.map((b, bi) => b.kind === "table"
              ? <Grid key={bi} rows={b.rows} onChange={(ri, ci, v) => setCell(bi, ri, ci, v)} />
              : <textarea key={bi} aria-label={`Đoạn ${bi + 1}`} rows={Math.min(6, Math.max(1, Math.ceil(b.text.length / 60)))} value={b.text} onChange={(e) => setText(bi, e.target.value)}
                  className={cellCls(b.text) + " resize-y text-sm" + (b.kind === "heading" ? " font-display font-semibold" : "")} />)}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {unsure > 0 && <Button variant="glass" onClick={acceptAll}>Bỏ đánh dấu tất cả</Button>}
          <Button variant="glass" onClick={onClose}>Huỷ</Button>
          <Button onClick={save}><Download /> Lưu tệp</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
