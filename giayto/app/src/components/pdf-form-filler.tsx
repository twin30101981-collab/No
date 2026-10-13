import { useEffect, useState } from "react";
import { CheckSquare, Loader2, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addFreeFields, changedValues, fillFormFields, type FormField, type FreePdfField } from "@/lib/pdf-form";
import { download, pdfToImages, safeName } from "@/lib/files";
import { showError } from "@/lib/errors";

/** Lists the fillable boxes found in a PDF; saves a new PDF with the typed values. */
export function PdfFormFiller({ file, fields, onClose }: { file: Blob & { name?: string }; fields: FormField[]; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.value])));
  const [flatten, setFlatten] = useState(false); const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]); const [page, setPage] = useState(0);
  const [tool, setTool] = useState<"text" | "check">("text"); const [freeFields, setFreeFields] = useState<FreePdfField[]>([]);
  useEffect(() => { let alive = true; pdfToImages(file, 1.1).then((images) => alive && setPreviews(images)).catch((e) => showError(e, "Xem trước PDF")); return () => { alive = false; }; }, [file]);
  const set = (n: string, v: string) => setValues((s) => ({ ...s, [n]: v }));
  const multiPage = fields.some((f) => f.page > 0);
  const n = changedValues(fields, values).length;
  const total = n + freeFields.filter((field) => field.kind === "check" || field.value.trim()).length;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Điền biểu mẫu</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-2">
            <div className="mb-2 flex items-center gap-2">
              <Button type="button" size="sm" variant={tool === "text" ? "default" : "outline"} onClick={() => setTool("text")}><Type /> Chữ</Button>
              <Button type="button" size="sm" variant={tool === "check" ? "default" : "outline"} onClick={() => setTool("check")}><CheckSquare /> Tick</Button>
              {previews.length > 1 && <select aria-label="Trang PDF" value={page} onChange={(e) => setPage(Number(e.target.value))} className="ml-auto h-8 rounded-md border bg-background px-2 text-xs">{previews.map((_, i) => <option key={i} value={i}>Trang {i + 1}</option>)}</select>}
            </div>
            {previews[page] ? (
              <button type="button" aria-label={`Đặt ô ${tool === "text" ? "chữ" : "tick"} trên trang ${page + 1}`} className="relative block w-full overflow-hidden rounded-md border bg-background" onClick={(e) => {
                const box = e.currentTarget.getBoundingClientRect();
                setFreeFields((current) => [...current, { id: crypto.randomUUID(), kind: tool, page, x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height, value: tool === "check" ? "1" : "", fontSize: 14 }]);
              }}>
                <img src={previews[page]} alt={`Trang ${page + 1}`} className="block h-auto w-full" />
                {freeFields.filter((field) => field.page === page).map((field) => <span key={field.id} className="pointer-events-none absolute grid min-h-5 min-w-5 place-items-center border border-primary bg-background/80 px-1 text-xs font-semibold text-primary" style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, transform: "translateY(-50%)" }}>{field.kind === "check" ? "✓" : field.value || "Chữ"}</span>)}
              </button>
            ) : <div className="grid h-36 place-items-center"><Loader2 className="animate-spin" /></div>}
            <p className="mt-2 text-xs text-muted-foreground">Chọn Chữ hoặc Tick, rồi chạm vị trí cần đặt trên trang.</p>
          </div>
          {freeFields.map((field, index) => <div key={field.id} className="flex items-center gap-2 rounded-md border p-2">
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">{field.kind === "text" ? <Type className="size-4" /> : <CheckSquare className="size-4" />} Trang {field.page + 1}</span>
            {field.kind === "text" ? <Input aria-label={`Nội dung ô chữ ${index + 1}`} value={field.value} placeholder="Nhập nội dung" onChange={(e) => setFreeFields((current) => current.map((item) => item.id === field.id ? { ...item, value: e.target.value } : item))} className="h-9" /> : <span className="flex-1 text-xs">Dấu tick</span>}
            <Button type="button" variant="ghost" size="icon" aria-label="Xóa ô tự do" onClick={() => setFreeFields((current) => current.filter((item) => item.id !== field.id))}><Trash2 /></Button>
          </div>)}
          {!fields.length && !freeFields.length && <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">PDF không có ô điền sẵn. Hãy thêm ô chữ hoặc tick trên trang.</p>}
          {fields.map((f, i) => (
            <div key={f.name}>
              {multiPage && (i === 0 || fields[i - 1].page !== f.page) && <p className="mb-1 mt-2 text-xs font-semibold opacity-70">Trang {f.page + 1}</p>}
              {f.kind === "check" ? (
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={f.readOnly} checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked ? "1" : "")} className="h-5 w-5" /> {f.label}</label>
              ) : (
                <>
                  <label className="text-xs font-semibold">{f.label}{f.readOnly ? " (chỉ đọc)" : ""}</label>
                  {f.kind === "text" && (f.multiline
                    ? <textarea disabled={f.readOnly} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} className="mt-1 min-h-20 w-full rounded-md border bg-background p-2 text-sm" />
                    : <Input disabled={f.readOnly} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} className="mt-1 h-11" />)}
                  {(f.kind === "select" || f.kind === "radio") && (
                    <select disabled={f.readOnly} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} className="mt-1 h-11 w-full rounded-md border bg-background px-2 text-sm">
                      <option value="">— Chưa chọn —</option>{f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>)}
                  {f.kind === "other" && <p className="text-xs opacity-70">Ô loại này (chữ ký số, nút bấm) chưa điền được.</p>}
                </>
              )}
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} className="h-5 w-5" /> Khóa nội dung (không sửa được nữa)</label>
          <Button className="w-full" disabled={busy || !total} onClick={async () => {
            setBusy(true);
            try {
              const filled = n ? await fillFormFields(file, fields, values, flatten) : file;
              const out = freeFields.length ? await addFreeFields(filled, freeFields) : filled;
              download(out, `${safeName((file.name ?? "bieu-mau").replace(/\.pdf$/i, ""))}-da-dien.pdf`);
              toast.success(`Đã điền ${total} ô`); onClose();
            } catch (e) { showError(e, "Điền biểu mẫu"); } finally { setBusy(false); }
          }}>{busy && <Loader2 className="animate-spin" />} {total ? `Lưu PDF (${total} ô)` : "Chưa có nội dung để lưu"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
