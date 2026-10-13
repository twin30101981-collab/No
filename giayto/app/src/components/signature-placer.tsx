import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, PenLine, Plus, Trash2, X } from "lucide-react";
import { pickFiles } from "@/lib/importer";
import { signatureFromPhoto } from "@/lib/signature-photo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addSignature, applySignatures, clampPlacement, type Handle, pinchBy, removeSignature, resizeBy, clampBox, type Rotated, type Signature, trimCanvas, useSignatures } from "@/lib/signatures";
import { confirmDialog } from "@/lib/dialog";
import { showError } from "@/lib/errors";
import { anchorTo, detectRuleLines, grayOf, suggestSignSpots, type LabelWord, type SignSpot } from "@/lib/sign-lines";

type Placed = { key: string; sig: Signature; at: Rotated };
const EDGE: Record<Exclude<Handle, "se">, string> = { n: "left-1/2 -top-2.5 -translate-x-1/2 h-2.5 w-6 cursor-ns-resize", s: "left-1/2 -bottom-2.5 -translate-x-1/2 h-2.5 w-6 cursor-ns-resize", e: "top-1/2 -right-2.5 -translate-y-1/2 w-2.5 h-6 cursor-ew-resize", w: "top-1/2 -left-2.5 -translate-y-1/2 w-2.5 h-6 cursor-ew-resize" };

/** Pick saved signatures, drop them on the page, drag to move and pull the corner to resize. */
export function SignaturePlacer({ src, onClose, onApply, onFreehand }: { src: string; onClose: () => void; onApply: (src: string) => Promise<void> | void; onFreehand: () => void }) {
  const sigs = useSignatures();
  const box = useRef<HTMLDivElement>(null); const img = useRef<HTMLImageElement>(null);
  const [aspect, setAspect] = useState(1.414); // page h/w
  const [placed, setPlaced] = useState<Placed[]>([]); const [sel, setSel] = useState<string | null>(null);
  const [newPad, setNewPad] = useState(sigs.length === 0); const [busy, setBusy] = useState(false);
  const drag = useRef<{ key: string; mode: "move" | Handle; px: number; py: number; at: Rotated } | null>(null);
  // Chụm 2 ngón: theo dõi các ngón đang chạm trên một chữ ký → phóng to/thu nhỏ và xoay quanh tâm.
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ key: string; d: number; a: number; at: Rotated } | null>(null);
  const geo = () => { const [p1, p2] = [...touches.current.values()]; return { d: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1, a: Math.atan2(p2.y - p1.y, p2.x - p1.x) }; };

  const ratioOf = (s: Signature, a = aspect) => (s.h / s.w) / a;
  // Ảnh trang đã có sẵn trong bộ đệm có thể tải xong trước khi gắn onLoad → tỉ lệ kẹt ở 1.414 (sai với trang ngang/khác khổ),
  // làm chữ ký méo và không kéo được tới mép dưới. Đọc tỉ lệ ngay khi ảnh đã hoàn tất, và kẹp lại các chữ ký khi tỉ lệ đổi.
  const syncAspect = (el: HTMLImageElement | null) => {
    if (!el || !el.complete || !el.naturalWidth) return;
    const a = el.naturalHeight / el.naturalWidth;
    setAspect((old) => { if (Math.abs(old - a) < 1e-4) return old; setPlaced((l) => l.map((p) => ({ ...p, at: { ...clampPlacement(p.at, ratioOf(p.sig, a)), r: p.at.r } }))); return a; });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- HM-06: syncAspect nhận tỉ lệ mới qua tham số và setState dạng hàm, không đọc state cũ; chỉ cần chạy khi đổi ảnh nền (src)
  useEffect(() => { syncAspect(img.current); }, [src]);
  // B10: gợi ý chỗ ký — dò đường kẻ ngay khi ảnh sẵn sàng; "Đọc nhãn" thêm OCR để tìm "Ký", "Giám đốc"…
  const [spots, setSpots] = useState<SignSpot[]>([]); const [reading, setReading] = useState(false);
  const scan = (words: LabelWord[] = []) => {
    const el = img.current; if (!el?.complete || !el.naturalWidth) return null;
    const g = grayOf(el, 1000); setSpots(suggestSignSpots(detectRuleLines(g.gray, g.w, g.h), words, g.w, g.h)); return g;
  };
  useEffect(() => { scan(); }, [src]);
  const readLabels = async () => {
    const g = scan(); if (!g) return; setReading(true);
    try {
      const { ocrSession } = await import("@/lib/ocr"); const s = await ocrSession();
      try { const r = await s.words(g.canvas); const ws = r.words.map((t) => ({ str: t.str, x: t.x, y: -t.y - t.h / 2, w: t.w, h: t.h }));
        const out = suggestSignSpots(detectRuleLines(g.gray, g.w, g.h), ws, g.w, g.h); setSpots(out); toast(out.length ? `Tìm thấy ${out.length} chỗ ký` : "Không thấy dòng ký trên trang"); }
      finally { await s.close(); }
    } catch (e) { showError(e, "Đọc nhãn chỗ ký"); } finally { setReading(false); }
  };
  const anchor = (spot: SignSpot) => {
    const cur = placed.find((p) => p.key === sel) ?? placed[placed.length - 1];
    if (cur) { setPlaced((l) => l.map((p) => p.key === cur.key ? { ...p, at: { ...clampBox({ ...anchorTo(spot, ratioOf(p.sig)), r: 0 }, 0.03, aspect) } } : p)); setSel(cur.key); return; }
    const s0 = sigs[0]; if (!s0) { setNewPad(true); return; }
    const key = Math.random().toString(36).slice(2);
    setPlaced((p) => [...p, { key, sig: s0, at: clampBox({ ...anchorTo(spot, ratioOf(s0)), r: 0 }, 0.03, aspect) }]); setSel(key);
  };
  const endDrag = (e?: React.PointerEvent) => { if (e) touches.current.delete(e.pointerId); if (touches.current.size < 2) pinch.current = null; drag.current = null; };
  const put = (sig: Signature) => {
    const key = Math.random().toString(36).slice(2);
    setPlaced((p) => [...p, { key, sig, at: clampPlacement({ x: 0.55, y: 0.75, w: 0.32, h: 0 }, ratioOf(sig)) }]); setSel(key);
  };
  const onDown = (e: React.PointerEvent, p: Placed, mode: "move" | Handle) => {
    e.stopPropagation(); setSel(p.key);
    if (e.pointerType === "touch" && mode === "move") {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) { drag.current = null; pinch.current = { key: p.key, ...geo(), at: p.at }; return; }
    }
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { key: p.key, mode, px: e.clientX, py: e.clientY, at: p.at };
  };
  const onMove = (e: React.PointerEvent) => {
    if (touches.current.has(e.pointerId)) touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pz = pinch.current;
    if (pz && touches.current.size >= 2) { const g = geo(); setPlaced((l) => l.map((p) => p.key !== pz.key ? p : { ...p, at: pinchBy(pz.at, g.d / pz.d, g.a - pz.a, 0.03, aspect) })); return; }
    const d = drag.current; if (!d || !box.current) return;
    const r = box.current.getBoundingClientRect(); const dx = (e.clientX - d.px) / r.width, dy = (e.clientY - d.py) / r.height;
    setPlaced((list) => list.map((p) => p.key !== d.key ? p : { ...p, at: d.mode === "move" ? clampBox({ ...d.at, x: d.at.x + dx, y: d.at.y + dy }, 0.03, aspect) : resizeBy(d.at, d.mode, dx, dy) }));
  };

  return (
    <div className="scan-screen fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" className="scan-icon" onClick={onClose}><X /> Hủy</Button>
        <p className="font-display text-sm font-semibold">Chèn chữ ký</p>
        <Button variant="ghost" className="scan-icon" onClick={onFreehand}><PenLine /> Vẽ tay</Button>
      </header>
      <div className="grid min-h-0 flex-1 place-items-center p-4" onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
        <div ref={box} className="relative touch-none select-none" onPointerDown={() => setSel(null)}>
          <img ref={img} src={src} alt="Trang" draggable={false} onLoad={(e) => { syncAspect(e.currentTarget); scan(); }} className="block max-h-[52dvh] max-w-full" />
          {spots.map((sp, i) => (
            <div key={i} className="sign-spot pointer-events-none absolute" style={{ left: `${sp.x * 100}%`, top: `${sp.y * 100}%`, width: `${sp.w * 100}%`, height: `${sp.h * 100}%` }}>
              <button type="button" data-testid="sign-spot" aria-label={`Neo chữ ký vào chỗ ký ${i + 1}`} className="sign-spot-tag pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); anchor(sp); }}>Ký ở đây</button>
            </div>
          ))}
          {placed.map((p) => (
            <div key={p.key} className={`absolute ${sel === p.key ? "outline outline-2 outline-primary" : ""}`} style={{ left: `${p.at.x * 100}%`, top: `${p.at.y * 100}%`, width: `${p.at.w * 100}%`, height: `${p.at.h * 100}%`, transform: p.at.r ? `rotate(${p.at.r}rad)` : undefined }} data-testid="sig-placed"
              onPointerDown={(e) => onDown(e, p, "move")}>
              <img src={p.sig.src} alt="Chữ ký" draggable={false} className="pointer-events-none h-full w-full" />
              {sel === p.key && <>
                <button aria-label="Bỏ chữ ký này" className="absolute -left-3 -top-3 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground" onPointerDown={(e) => { e.stopPropagation(); setPlaced((l) => l.filter((x) => x.key !== p.key)); }}><X className="size-3.5" /></button>
                <span aria-label="Kéo góc để đổi cỡ giữ tỉ lệ" className="absolute -bottom-3 -right-3 size-6 cursor-nwse-resize rounded-full border-2 border-card bg-primary" onPointerDown={(e) => onDown(e, p, "se")} />
                {(Object.keys(EDGE) as (keyof typeof EDGE)[]).map((h) => <span key={h} aria-label={`Kéo cạnh ${h} để kéo giãn`} className={`absolute rounded-full border border-card bg-primary ${EDGE[h]}`} onPointerDown={(e) => onDown(e, p, h)} />)}
                {p.at.r ? <button aria-label="Bỏ xoay" className="absolute -right-3 -top-3 grid size-6 place-items-center rounded-full bg-card text-[10px] text-card-foreground" onPointerDown={(e) => { e.stopPropagation(); setPlaced((l) => l.map((x) => x.key === p.key ? { ...x, at: { ...x.at, r: 0 } } : x)); }}>0°</button> : null}
              </>}
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="opacity-80">{spots.length ? `${spots.length} chỗ ký gợi ý — chạm khung nét đứt để neo` : "Chưa thấy dòng ký"}</span>
          <Button size="sm" variant="glass" className="ml-auto" disabled={reading} onClick={readLabels}>{reading ? <Loader2 className="animate-spin" /> : null} Đọc nhãn</Button>
        </div>
        <p className="mb-2 text-xs opacity-80">Chạm chữ ký để chèn · kéo để di chuyển · chấm góc: đổi cỡ giữ tỉ lệ · vạch cạnh: kéo giãn · 2 ngón: phóng/xoay</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button className="grid h-16 w-24 shrink-0 place-items-center rounded-[10px] border border-dashed border-border bg-card text-xs text-card-foreground" onClick={() => setNewPad(true)}><Plus className="size-4" />Ký mới</button>
          <button className="grid h-16 w-24 shrink-0 place-items-center rounded-[10px] border border-dashed border-border bg-card text-xs text-card-foreground" disabled={busy} onClick={async () => {
            const [f] = await pickFiles("image/*", false); if (!f) return;
            setBusy(true);
            try { const t = await signatureFromPhoto(f); if (!t) { toast("Không thấy nét mực — chụp chữ ký trên giấy trắng, đủ sáng"); return; } const sig = addSignature(t); toast.success("Đã tách chữ ký và lưu vào kho"); put(sig); }
            catch (e) { showError(e, "Tạo chữ ký từ ảnh"); } finally { setBusy(false); }
          }}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}Từ ảnh chụp</button>
          {sigs.map((s) => (
            <div key={s.id} className="relative shrink-0">
              <button className="grid h-16 w-24 place-items-center rounded-[10px] bg-card p-1.5" onClick={() => put(s)} aria-label="Chèn chữ ký"><img src={s.src} alt="" className="max-h-full max-w-full" /></button>
              <button aria-label="Xóa khỏi kho" className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-1" onClick={async () => { if (await confirmDialog("Xóa chữ ký này khỏi kho?", { okText: "Xóa" })) removeSignature(s.id); }}><Trash2 className="size-3" /></button>
            </div>
          ))}
        </div>
        <Button className="mt-1 w-full" disabled={!placed.length || busy} onClick={async () => {
          setBusy(true); try { await onApply(await applySignatures(src, placed.map((p) => ({ src: p.sig.src, at: p.at })))); } catch (e) { showError(e, "Chèn chữ ký"); } finally { setBusy(false); }
        }}>{busy ? <Loader2 className="animate-spin" /> : null} Lưu vào trang</Button>
      </div>
      {newPad && <NewSignature onClose={() => setNewPad(false)} onSaved={(s) => { setNewPad(false); put(s); }} />}
    </div>
  );
}

function NewSignature({ onClose, onSaved }: { onClose: () => void; onSaved: (s: Signature) => void }) {
  const cv = useRef<HTMLCanvasElement>(null); const last = useRef<[number, number] | null>(null);
  const [color, setColor] = useState("#0A2540");
  useEffect(() => { const c = cv.current; if (c) { c.width = 900; c.height = 360; } }, []);
  const pt = (e: React.PointerEvent): [number, number] => { const c = cv.current!; const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height]; };
  const draw = (e: React.PointerEvent) => {
    if (!last.current) return; const ctx = cv.current!.getContext("2d")!; const p = pt(e);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(...last.current); ctx.lineTo(...p); ctx.stroke(); last.current = p;
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-4">
      <div className="w-full max-w-[400px] rounded-[16px] bg-card p-4 text-card-foreground">
        <p className="font-semibold">Ký vào khung</p>
        <canvas ref={cv} className="mt-3 aspect-[5/2] w-full touch-none rounded-[10px] border border-border bg-background"
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); last.current = pt(e); }} onPointerMove={draw} onPointerUp={() => (last.current = null)} />
        <div className="mt-3 flex items-center gap-2">
          {["#0A2540", "#1D4ED8", "#C1121F"].map((c) => <button key={c} aria-label={`Màu ${c}`} onClick={() => setColor(c)} style={{ background: c }} className={`size-7 rounded-full border-2 ${color === c ? "border-primary" : "border-card"}`} />)}
          <Button size="sm" variant="glass" className="ml-auto" onClick={() => { const c = cv.current; c?.getContext("2d")?.clearRect(0, 0, c.width, c.height); }}>Xóa</Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="glass" onClick={onClose}>Hủy</Button>
          <Button onClick={() => {
            const t = cv.current && trimCanvas(cv.current); if (!t) { toast("Hãy ký vào khung trước"); return; }
            try { onSaved(addSignature(t)); toast.success("Đã lưu vào kho chữ ký"); } catch (e) { showError(e, "Lưu chữ ký"); }
          }}>Lưu vào kho</Button>
        </div>
      </div>
    </div>
  );
}
