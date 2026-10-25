import { useRef, useState } from "react";
import { Copy, Loader2, ScanText, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cropRegion, rectFromPoints, type Region, tooSmall } from "@/lib/region";
import { recognize } from "@/lib/ocr";
import { showError } from "@/lib/errors";

/** Full-screen: drag a box on the page, read text only inside it. */
export function RegionOcr({ src, onClose, onAppend }: { src: string; onClose: () => void; onAppend: (text: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [r, setR] = useState<Region | null>(null);
  const [busy, setBusy] = useState(false); const [text, setText] = useState<string | null>(null);
  const pt = (e: React.PointerEvent) => { const b = box.current!.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }; };
  const read = async () => {
    if (!r || tooSmall(r)) { toast("Kéo một khung bao quanh đoạn chữ cần đọc"); return; }
    setBusy(true);
    try { const t = await recognize(await cropRegion(src, r)); setText(t); if (!t) toast("Không thấy chữ trong vùng này — thử khung rộng hơn"); }
    catch (e) { showError(e, "Nhận chữ vùng chọn"); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between gap-2 p-3">
        <Button variant="glass" size="icon" aria-label="Đóng" onClick={onClose}><X /></Button>
        <p className="text-sm font-semibold">Kéo khung quanh đoạn chữ</p>
        <span className="w-10" />
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div ref={box} className="relative max-h-full touch-none select-none"
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); start.current = pt(e); setR(null); setText(null); }}
          onPointerMove={(e) => { if (start.current) setR(rectFromPoints(start.current, pt(e))); }}
          onPointerUp={() => { start.current = null; }}>
          <img src={src} alt="Trang tài liệu" draggable={false} className="block max-h-[60dvh] w-auto rounded-md" />
          {r && <div className="pointer-events-none absolute rounded-sm border-2 border-primary bg-primary/15" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />}
        </div>
      </div>
      <div className="space-y-2 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {text != null && text !== "" && (
          <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="h-28 w-full rounded-[12px] border border-border bg-card p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="glass" onClick={() => { void navigator.clipboard.writeText(text); toast("Đã sao chép"); }}><Copy /> Sao chép</Button>
              <Button variant="glass" onClick={() => { onAppend(text); toast.success("Đã thêm vào chữ của trang"); }}>Thêm vào trang</Button>
            </div>
          </>
        )}
        <Button className="w-full" disabled={busy || !r} onClick={() => void read()}>{busy ? <Loader2 className="animate-spin" /> : <ScanText />} Đọc chữ trong khung</Button>
      </div>
    </div>
  );
}
