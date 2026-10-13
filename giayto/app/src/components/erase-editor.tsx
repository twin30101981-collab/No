import { useEffect, useRef, useState } from "react";
import { Brush, Eraser, Hand, Loader2, PenLine, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadImg } from "@/lib/image";
import { canvasToPageUrl, canvasToTempUrl, revokeTemp } from "@/lib/canvas-url";
import { handMask } from "@/lib/stroke-width";
import { inpaint, maskArea, suggestFingers, type Pt, type Stroke, strokesToMask } from "@/lib/erase-mask";
import { showError } from "@/lib/errors";

const SIZES = [0.01, 0.025, 0.05];

/** Paint over smudges, fingers or stray marks; the painted area is filled with the paper colour around it. */
export function EraseEditor({ src, onClose, onApply }: { src: string; onClose: () => void; onApply: (src: string) => Promise<void> | void }) {
  const box = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]); const [cur, setCur] = useState<Stroke | null>(null);
  const [size, setSize] = useState(1); const [erase, setErase] = useState(false); const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<{ mask: Uint8Array; w: number; h: number; url: string; kind: "finger" | "hand" } | null>(null); const [finding, setFinding] = useState(false);
  const hintRef = useRef(hint); hintRef.current = hint;
  useEffect(() => () => revokeTemp(hintRef.current?.url), []);
  const pt = (e: React.PointerEvent): Pt => { const b = box.current!.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) }; };
  const all = cur ? [...strokes, cur] : strokes;
  const painted = !!hint || strokes.some((s) => !s.erase);
  return (
    <div className="scan-screen fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" className="scan-icon" onClick={onClose}><X /> Hủy</Button>
        <p className="font-display text-sm font-semibold">Tẩy vết</p>
        <Button variant="ghost" className="scan-icon" disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))}><Undo2 /> Hoàn tác</Button>
      </header>
      <div className="grid min-h-0 flex-1 place-items-center p-4">
        <div ref={box} className="relative touch-none select-none"
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setCur({ pts: [pt(e)], r: SIZES[size], erase }); }}
          onPointerMove={(e) => { if (cur) setCur({ ...cur, pts: [...cur.pts, pt(e)] }); }}
          onPointerUp={() => { if (cur) setStrokes((s) => [...s, cur]); setCur(null); }}>
          <img src={src} alt="Trang" draggable={false} className="block max-h-[62dvh] max-w-full" />
          {hint && <img src={hint.url} alt="" className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <defs><mask id="erase-m" maskUnits="userSpaceOnUse"><rect width="1000" height="1000" fill="black" />
              {all.map((s, i) => <polyline key={i} points={s.pts.map((p) => `${p.x * 1000},${p.y * 1000}`).join(" ")} fill="none" stroke={s.erase ? "black" : "white"} strokeWidth={s.r * 2000} strokeLinecap="round" strokeLinejoin="round" vectorEffect="none" />)}
            </mask></defs>
            <rect width="1000" height="1000" className="fill-destructive" opacity={0.5} mask="url(#erase-m)" />
          </svg>
        </div>
      </div>
      <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <p className="mb-2 text-xs opacity-80">Tô đỏ lên vết bẩn, ngón tay hay nét thừa. Vùng tô sẽ được lấp nền liền mạch theo vùng xung quanh.</p>
        <div className="mb-2 flex items-center gap-2">
          <Button variant={erase ? "glass" : "default"} size="sm" onClick={() => setErase(false)}><Brush /> Tô</Button>
          <Button variant={erase ? "default" : "glass"} size="sm" onClick={() => setErase(true)}><Eraser /> Bỏ tô</Button>
          <div className="ml-auto flex gap-1" aria-label="Cỡ cọ">
            {SIZES.map((_, i) => <button key={i} aria-label={`Cỡ ${i + 1}`} onClick={() => setSize(i)} className={`grid h-8 w-8 place-items-center rounded-full border ${size === i ? "border-primary" : "border-transparent"}`}><span className="rounded-full bg-current" style={{ width: 6 + i * 6, height: 6 + i * 6 }} /></button>)}
          </div>
        </div>
        {(["finger", "hand"] as const).map((kind) => (hint && hint.kind !== kind) ? null : (
        <Button key={kind} variant="glass" className="mb-2 w-full" disabled={finding || busy} onClick={async () => {
          if (hint) { revokeTemp(hint.url); setHint(null); return; }
          setFinding(true);
          try {
            const img = await loadImg(src); const k = Math.min(1, (kind === "hand" ? 1600 : 800) / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
            const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h);
            const m = kind === "hand" ? handMask(data) : suggestFingers(data.data, w, h);
            if (!m) { toast(kind === "hand" ? "Không thấy chữ viết tay khác chữ in — tô tay nếu cần" : "Không thấy ngón tay ở mép trang — tô tay nếu cần"); return; }
            const o = ctx.createImageData(w, h); for (let i = 0; i < m.length; i++) if (m[i]) o.data.set([230, 40, 40, 255], i * 4);
            ctx.putImageData(o, 0, 0); const hintUrl = await canvasToTempUrl(c); setHint((old) => { revokeTemp(old?.url); return { mask: m, w, h, url: hintUrl, kind }; });
            toast.success(kind === "hand" ? "Đã đánh dấu chữ viết tay — Tô để thêm, Bỏ tô để giữ lại, rồi bấm Tẩy" : "Đã đánh dấu ngón tay — dùng Bỏ tô để sửa rồi bấm Tẩy");
          } catch (e) { showError(e, kind === "hand" ? "Tìm chữ viết tay" : "Tìm ngón tay"); } finally { setFinding(false); }
        }}>{finding ? <Loader2 className="animate-spin" /> : kind === "hand" ? <PenLine /> : <Hand />} {hint ? (kind === "hand" ? "Bỏ gợi ý chữ viết tay" : "Bỏ gợi ý ngón tay") : (kind === "hand" ? "Tự tìm chữ viết tay (tạo bản đề sạch)" : "Tự tìm ngón tay ở mép sách")}</Button>
        ))}
        <Button className="w-full" disabled={!painted || busy} onClick={async () => {
          setBusy(true);
          try {
            const img = await loadImg(src); const w = img.naturalWidth, h = img.naturalHeight;
            const m = strokesToMask(strokes, w, h);
            if (hint) { // scale suggestion up, then let later eraser strokes still win
              for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hint.mask[Math.min(hint.h - 1, (y * hint.h / h) | 0) * hint.w + Math.min(hint.w - 1, (x * hint.w / w) | 0)]) m[y * w + x] = 1;
              const er = strokesToMask(strokes.filter((s) => s.erase).map((s) => ({ ...s, erase: false })), w, h);
              for (let i = 0; i < m.length; i++) if (er[i]) m[i] = 0;
            }
            if (!maskArea(m)) { toast("Chưa tô vùng nào"); return; }
            const c = document.createElement("canvas"); c.width = w; c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, w, h); inpaint(data.data, w, h, m); ctx.putImageData(data, 0, 0);
            await onApply(await canvasToPageUrl(c, "image/jpeg", 0.92)); toast.success("Đã tẩy vùng tô");
          } catch (e) { showError(e, "Tẩy vết"); } finally { setBusy(false); }
        }}>{busy ? <Loader2 className="animate-spin" /> : null} Tẩy vùng đã tô</Button>
      </div>
    </div>
  );
}
