import { useState } from "react";
import { Download, FileText, Languages, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { type Doc, saveDoc } from "@/lib/db";
import { dataUrlToBlob, download, imagesToPdf, safeName } from "@/lib/files";
import { showError } from "@/lib/errors";

/** G3-15: dịch đè bản dịch lên ảnh trang, xem trước và xuất ảnh/PDF. */
export function TranslateOverlayPanel({ doc, page, lang }: { doc: Doc; page: number; lang: string }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const base = `${safeName(doc.name)}-trang-${page + 1}-dich`;

  async function run() {
    setBusy(true); setOut(null);
    try {
      const { translateImage, renderOverlay } = await import("@/lib/translate-overlay");
      const src = doc.pages[page].src;
      const r = await translateImage(src, lang);
      if (r.error) toast.error(r.error);
      if (r.blocks.length) setOut(await renderOverlay(src, r.blocks));
    } catch (e) { showError(e); } finally { setBusy(false); }
  }

  async function addPage() {
    if (!out) return;
    const pages = [...doc.pages];
    pages.splice(page + 1, 0, { id: crypto.randomUUID(), src: out, orig: out, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } });
    await saveDoc({ ...doc, pages }); toast.success("Đã thêm trang dịch ngay sau trang gốc");
  }

  return (
    <div className="mt-3 rounded-[12px] border border-border p-3">
      <Button variant="glass" size="sm" className="w-full" disabled={busy} onClick={() => void run()}>
        {busy ? <Loader2 className="animate-spin" /> : <Languages />} {busy ? "Đang đọc chữ và dịch…" : `Dịch đè lên ảnh trang ${page + 1}`}
      </Button>
      {out && (
        <>
          <img src={out} alt="Trang đã dịch đè" className="mt-3 w-full rounded-[10px] border border-border" />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button variant="glass" size="sm" onClick={() => void dataUrlToBlob(out).then((b) => download(b, `${base}.jpg`))}><Download /> Ảnh</Button>
            <Button variant="glass" size="sm" onClick={() => void imagesToPdf([out], { name: base }).then((b) => download(b, `${base}.pdf`))}><FileText /> PDF</Button>
            <Button variant="glass" size="sm" onClick={() => void addPage()}><Plus /> Thêm trang</Button>
          </div>
        </>
      )}
    </div>
  );
}
