import { useEffect, useRef, useState } from "react";
import { Highlighter, Loader2, MessageSquareText, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addPdfAnnotations, readPdfAnnotations, type PdfAnnotation } from "@/lib/pdf-annotate";
import { download, pdfToImages, safeName } from "@/lib/files";
import { showError } from "@/lib/errors";

type Tool = PdfAnnotation["kind"];
type Point = { x: number; y: number };
const LABEL: Record<Tool, string> = { note: "Ghi chú", underline: "Gạch chân", rectangle: "Hình khối" };

export function PdfAnnotator({ file, onClose }: { file: File; onClose: () => void }) {
  const [previews, setPreviews] = useState<string[]>([]); const [page, setPage] = useState(0);
  const [tool, setTool] = useState<Tool>("note"); const [items, setItems] = useState<PdfAnnotation[]>([]);
  const [busy, setBusy] = useState(false); const [flatten, setFlatten] = useState(false); const [loaded, setLoaded] = useState(0); const start = useRef<Point | null>(null);
  useEffect(() => { let alive = true; pdfToImages(file, 1.1, 0.88, false).then((images) => alive && setPreviews(images)).catch((e) => showError(e, "Xem trước PDF")); readPdfAnnotations(file).then((found) => { if (!alive || !found.length) return; setItems(found); setLoaded(found.length); toast.info(`Đã mở ${found.length} chú thích có sẵn để sửa`); }).catch(() => {}); return () => { alive = false; }; }, [file]);
  const point = (e: React.PointerEvent<HTMLElement>): Point => { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  const add = (from: Point, to: Point) => {
    if (tool === "note") setItems((all) => [...all, { id: crypto.randomUUID(), kind: tool, page, x: from.x, y: from.y, width: 0.45, height: 0.04, text: "" }]);
    else {
      const x = Math.min(from.x, to.x), y = Math.min(from.y, to.y);
      const width = Math.max(0.03, Math.abs(to.x - from.x)), height = Math.max(tool === "underline" ? 0.012 : 0.03, Math.abs(to.y - from.y));
      setItems((all) => [...all, { id: crypto.randomUUID(), kind: tool, page, x, y, width, height }]);
    }
  };
  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Chú thích PDF</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={tool === "note" ? "default" : "outline"} onClick={() => setTool("note")}><MessageSquareText /> Ghi chú</Button>
          <Button size="sm" variant={tool === "underline" ? "default" : "outline"} onClick={() => setTool("underline")}><Highlighter /> Gạch chân</Button>
          <Button size="sm" variant={tool === "rectangle" ? "default" : "outline"} onClick={() => setTool("rectangle")}><Square /> Hình khối</Button>
          {previews.length > 1 && <select aria-label="Trang PDF" value={page} onChange={(e) => setPage(Number(e.target.value))} className="ml-auto h-8 rounded-md border bg-background px-2 text-xs">{previews.map((_, i) => <option key={i} value={i}>Trang {i + 1}</option>)}</select>}
        </div>
        {previews[page] ? <div aria-label={`Trang ${page + 1} để chú thích`} className="relative touch-none overflow-hidden rounded-md border bg-background" onPointerDown={(e) => { start.current = point(e); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={(e) => { if (!start.current) return; add(start.current, point(e)); start.current = null; }}>
          <img src={previews[page]} alt={`Trang ${page + 1}`} className="pointer-events-none block h-auto w-full select-none" />
          {items.filter((item) => item.page === page).map((item) => <span key={item.id} className={`pointer-events-none absolute text-xs font-semibold text-destructive ${item.kind === "rectangle" ? "border-2 border-destructive" : item.kind === "underline" ? "border-b-2 border-destructive" : "bg-background/90 px-1"}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.width * 100}%`, height: `${item.height * 100}%` }}>{item.kind === "note" ? item.text || "Ghi chú" : ""}</span>)}
        </div> : <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" /></div>}
        <p className="text-xs text-muted-foreground">Chạm để đặt ghi chú; kéo trên trang để gạch chân hoặc khoanh vùng.</p>
        {items.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
          <span className="shrink-0 text-xs font-semibold">{LABEL[item.kind]} · Trang {item.page + 1}</span>
          {item.kind === "note" ? <Input aria-label={`Nội dung ghi chú ${index + 1}`} value={item.text ?? ""} placeholder="Nhập ghi chú" onChange={(e) => setItems((all) => all.map((entry) => entry.id === item.id ? { ...entry, text: e.target.value } : entry))} className="h-9" /> : <span className="flex-1" />}
          <Button variant="ghost" size="icon" aria-label="Xóa chú thích" onClick={() => setItems((all) => all.filter((entry) => entry.id !== item.id))}><Trash2 /></Button>
        </div>)}
        <label className="flex items-center justify-between gap-3 rounded-md border p-2 text-xs"><span><span className="font-semibold">Làm phẳng vào trang</span><br /><span className="text-muted-foreground">{flatten ? "Không sửa lại được sau khi lưu." : "Lưu dạng chú thích chuẩn PDF, mở lại để sửa được."}</span></span><Switch checked={flatten} onCheckedChange={setFlatten} aria-label="Làm phẳng chú thích vào trang" /></label>
        <Button className="w-full" disabled={busy || (!loaded && !items.some((item) => item.kind !== "note" || item.text?.trim()))} onClick={async () => { setBusy(true); try { const valid = items.filter((item) => item.kind !== "note" || item.text?.trim()); const out = await addPdfAnnotations(file, valid, { flatten }); download(out, `${safeName(file.name.replace(/\.pdf$/i, ""))}-chu-thich.pdf`); toast.success(`Đã lưu ${valid.length} chú thích`); onClose(); } catch (e) { showError(e, "Chú thích PDF"); } finally { setBusy(false); } }}>{busy && <Loader2 className="animate-spin" />} {items.length ? `Lưu PDF (${items.length} mục)` : loaded ? "Lưu PDF (xóa hết chú thích)" : "Chưa có chú thích"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}