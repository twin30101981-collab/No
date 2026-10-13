import { useRef, useState } from "react";
import { Loader2, Undo2, Wand2, X } from "lucide-react";
import { recognizeWords } from "@/lib/ocr";
import { loadImg } from "@/lib/image";
import { findSensitive, summarize } from "@/lib/sensitive";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rectFromPoints, type Region, tooSmall } from "@/lib/region";
import { applyRedactions } from "@/lib/redact";
import { confirmDialog } from "@/lib/dialog";
import { showError } from "@/lib/errors";

/** Drag black boxes over sensitive info; on save they are burned into the image for good. */
export function RedactEditor({ src, onClose, onApply }: { src: string; onClose: () => void; onApply: (src: string) => Promise<void> | void }) {
  const box = useRef<HTMLDivElement>(null); const start = useRef<{ x: number; y: number } | null>(null);
  const [boxes, setBoxes] = useState<Region[]>([]); const [cur, setCur] = useState<Region | null>(null); const [busy, setBusy] = useState(false); const [finding, setFinding] = useState(false);
  const pt = (e: React.PointerEvent) => { const b = box.current!.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }; };
  const all = cur ? [...boxes, cur] : boxes;
  return (
    <div className="scan-screen fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" className="scan-icon" onClick={onClose}><X /> Hủy</Button>
        <p className="font-display text-sm font-semibold">Che thông tin</p>
        <Button variant="ghost" className="scan-icon" disabled={!boxes.length} onClick={() => setBoxes((b) => b.slice(0, -1))}><Undo2 /> Hoàn tác</Button>
      </header>
      <div className="grid min-h-0 flex-1 place-items-center p-4">
        <div ref={box} className="relative touch-none select-none"
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); start.current = pt(e); }}
          onPointerMove={(e) => { if (start.current) setCur(rectFromPoints(start.current, pt(e))); }}
          onPointerUp={() => { start.current = null; if (cur && !tooSmall(cur)) setBoxes((b) => [...b, cur]); setCur(null); }}>
          <img src={src} alt="Trang" draggable={false} className="block max-h-[62dvh] max-w-full" />
          {all.map((r, i) => <div key={i} className="pointer-events-none absolute bg-foreground" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />)}
        </div>
      </div>
      <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="mb-2 text-xs opacity-80">Kéo khung lên số CCCD, số tài khoản, địa chỉ… Khối đen được in hẳn vào ảnh, không gỡ ra được.</p>
        <Button variant="glass" className="mb-2 w-full" disabled={finding || busy} onClick={async () => {
          setFinding(true);
          try {
            const [{ words }, img] = await Promise.all([recognizeWords(src), loadImg(src)]);
            const found = findSensitive(words, img.naturalWidth, img.naturalHeight);
            if (!found.length) { toast("Không thấy số CCCD, điện thoại hay tài khoản — kéo khung thủ công nếu cần"); return; }
            setBoxes((b) => [...b, ...found.map((f) => f.region)]);
            toast.success(`Đã đánh dấu ${summarize(found)} — kiểm tra lại rồi bấm Che`);
          } catch (e) { showError(e, "Tự tìm thông tin nhạy cảm"); } finally { setFinding(false); }
        }}>{finding ? <Loader2 className="animate-spin" /> : <Wand2 />} {finding ? "Đang đọc trang…" : "Tự tìm số CCCD, điện thoại, tài khoản"}</Button>
        <Button className="w-full" disabled={!boxes.length || busy} onClick={async () => {
          if (!(await confirmDialog(`Che vĩnh viễn ${boxes.length} vùng?`, { message: "Ảnh gốc của trang cũng bị thay; chữ đã nhận của trang sẽ được xóa để không lộ thông tin.", okText: "Che", danger: true }))) return;
          setBusy(true); try { await onApply(await applyRedactions(src, boxes)); toast.success("Đã che thông tin"); } catch (e) { showError(e, "Che thông tin"); } finally { setBusy(false); }
        }}>{busy ? <Loader2 className="animate-spin" /> : null} Che {boxes.length ? `${boxes.length} vùng` : ""}</Button>
      </div>
    </div>
  );
}
