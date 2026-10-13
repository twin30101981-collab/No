import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RotateCcw, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Quad } from "@/lib/db";
import { PAPER_LABEL, type Paper } from "@/lib/detect";
import { compress, detectQuadInfo, refineQuadOnSrc } from "@/lib/image";
import { aiPaperCorners } from "@/lib/ai.functions";
import { pickQuad, shouldAskAi } from "@/lib/quad-fallback";
import { useQueuedServerFn } from "@/lib/ai-queue";
import { parseAiQuad } from "@/lib/ai-quad";
import { halfQuad, isLandscapeSpread } from "@/lib/spread-page";
import { loupePlacement, LOUPE_SIZE, LOUPE_ZOOM } from "@/lib/loupe";
import { acceptEdgeRefine, checkQuad, clampTilt, MAX_TILT, rotateQuad, snapCorner, snapTargets, tidyQuad, TILT_STEP } from "@/lib/crop-quad";
import { recognizeWordBoxes } from "@/lib/ocr";
import { boxFromOcrWord } from "@/lib/edit-view";
import { edgeCutCheck, type ContentBox } from "@/lib/edit-session";

const CORNERS = ["↖", "↗", "↘", "↙"] as const;

/** On-device detector first; AI corners (refined on the original) when local is unsure. */
export function useFindQuad() {
  const aiFn = useQueuedServerFn(aiPaperCorners, "Dò mép giấy");
  return async (src: string): Promise<{ q: Quad | null; how: "local" | "ai" | "none"; msg?: string | undefined }> => {
    const local = await detectQuadInfo(src);
    const online = typeof navigator === "undefined" || navigator.onLine !== false;
    if (!shouldAskAi(local, online)) return { ...pickQuad(local, null), msg: online ? undefined : "Đang mất mạng — dùng bộ dò trên máy, hãy kiểm tra lại các góc" };
    const res = await aiFn({ data: { image: await compress(src, 1024, 0.7) } }).catch(() => null);
    const aq = res?.ok ? parseAiQuad(res.data) : null;
    const pick = pickQuad(local, aq ? await refineQuadOnSrc(src, aq).catch(() => aq) : null);
    return { ...pick, msg: res && !res.ok ? res.message : undefined };
  };
}

export function CropEditor({ src, quad, paper: paper0, onClose, onApply, cancelLabel = "Hủy", applyLabel = "Áp dụng" }: { src: string; quad?: Quad | undefined; paper?: Paper | undefined; onClose: () => void; onApply: (q: Quad, paper: Paper) => void; cancelLabel?: string; applyLabel?: string }) {
  const [q, setQ] = useState<Quad>(quad ?? [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96], [0.04, 0.96]]);
  const [paper, setPaper] = useState<Paper>(paper0 ?? "auto");
  const [active, setActive] = useState(-1);
  const [sel, setSel] = useState(0);
  const initial = useRef<Quad>(q);
  const detected = useRef<Quad | null>(quad ?? null); // P3: điểm hút khi thả góc
  // fine-tune the selected corner by 0.5% per tap when dragging is too coarse
  function nudge(dx: number, dy: number) {
    const s = 0.005;
    setQ((cur) => cur.map((p, i) => (i === sel ? [Math.min(1, Math.max(0, p[0] + dx * s)), Math.min(1, Math.max(0, p[1] + dy * s))] : p)) as Quad);
  }
  const [busy, setBusy] = useState(false);
  const find = useFindQuad();
  const findQuad = () => find(src);
  async function auto() {
    setBusy(true);
    try {
      const r = await findQuad();
      if (r.q) { setQ(r.q); detected.current = r.q; }
      if (r.how === "ai") toast("Đã dò mép giấy bằng AI — kiểm tra lại các góc");
      else if (r.how === "none") toast(r.msg ?? "Không tự nhận được mép giấy, hãy kéo góc bằng tay");
      else if (r.msg) toast(r.msg);
    } catch { toast("Không tự nhận được mép giấy, hãy kéo góc bằng tay"); } finally { setBusy(false); }
  }
  const box = useRef<HTMLDivElement>(null); const drag = useRef(-1);
  useEffect(() => { if (quad) return; let live = true; setBusy(true);
    void findQuad().then((r) => { if (live && r.q) { setQ(r.q); initial.current = r.q; detected.current = r.q; } }).catch(() => {}).finally(() => live && setBusy(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, quad]);
  // relative drag: the point moves with the finger delta (finger never hides it); 4..7 = side handles
  const start = useRef<{ x: number; y: number; q: Quad } | null>(null);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  function down(i: number, e: React.PointerEvent) {
    drag.current = i; setActive(i); if (i < 4) setSel(i); start.current = { x: e.clientX, y: e.clientY, q };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function up() {
    const k = drag.current;
    if (k >= 0) setQ((cur) => tidyQuad(k < 4 ? snapCorner(cur, k, snapTargets(detected.current)) : cur));
    if (k >= 4) { // P3.2: hút cạnh theo mép giấy trên ảnh gốc
      const side = k - 4;
      setQ((cur) => { void refineQuadOnSrc(src, cur).then((rf) => setQ((now) => (now === cur ? acceptEdgeRefine(cur, rf, side) : now))).catch(() => {}); return cur; });
    }
    drag.current = -1; setActive(-1); start.current = null;
  }
  const check = checkQuad(q);
  // R1.5 (TD-05/TD-06): OCR nền một lần khi mở màn (ảnh ≤1600px, hủy khi đóng/đổi ảnh) để cảnh báo chữ vắt mép khung cắt.
  const [boxes, setBoxes] = useState<ContentBox[] | null>(null);
  useEffect(() => {
    let live = true;
    void recognizeWordBoxes(src, 1600)
      .then((r) => { if (live) setBoxes(r.words.map((w) => boxFromOcrWord(w, r.size)).filter((b): b is ContentBox => !!b)); })
      .catch(() => { /* đọc lỗi → không cảnh báo */ });
    return () => { live = false; };
  }, [src]);
  const cutCheck = boxes ? edgeCutCheck(q, boxes) : null;
  const [tilt, setTilt] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [spread, setSpread] = useState(false); // P3.4: ảnh ngang 2 trang
  function rotate(step: number) {
    const next = clampTilt(tilt + step); if (next === tilt) return;
    const el = imgRef.current; const W = el?.naturalWidth || 1, H = el?.naturalHeight || 1;
    setQ((cur) => rotateQuad(cur, next - tilt, W, H)); setTilt(next);
  }
  function move(e: React.PointerEvent) {
    const st = start.current; if (drag.current < 0 || !box.current || !st) return; const r = box.current.getBoundingClientRect();
    const dx = (e.clientX - st.x) / r.width, dy = (e.clientY - st.y) / r.height; const k = drag.current;
    const ids = k < 4 ? [k] : [k - 4, (k - 3) % 4];
    setQ(st.q.map((p, i) => (ids.includes(i) ? [clamp(p[0] + dx), clamp(p[1] + dy)] : p)) as Quad);
  }
  const mids = q.map((p, i) => [(p[0] + q[(i + 1) % 4][0]) / 2, (p[1] + q[(i + 1) % 4][1]) / 2]);
  // TD-27 (P18): vùng ảnh co giãn theo chỗ trống còn lại — trước đây ảnh cố định 62dvh đẩy hàng "Áp dụng"
  // ra ngoài đáy trên màn thấp (360×640) và lớp phủ cố định không cuộn được.
  const area = useRef<HTMLDivElement>(null);
  const [areaH, setAreaH] = useState<number | null>(null);
  useEffect(() => {
    const el = area.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setAreaH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const focus = active < 0 ? null : active < 4 ? q[active] : mids[active - 4];
  const bw = box.current?.clientWidth ?? 0, bh = box.current?.clientHeight ?? 0;
  return (
    <div className="scan-screen fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" className="scan-icon" onClick={onClose}><X /> {cancelLabel}</Button>
        <p className="font-display text-sm font-semibold">Kéo góc hoặc cạnh vào mép giấy</p>
        <span className="w-16" />
      </header>
      <div ref={area} data-testid="crop-area" className="grid min-h-0 flex-1 place-items-center p-6">
        <div ref={box} className="relative touch-none" onPointerMove={move} onPointerUp={up}>
          <img ref={imgRef} src={src} alt="Ảnh gốc" className="block max-h-[62dvh] max-w-full select-none" draggable={false}
            style={areaH ? { maxHeight: Math.max(120, areaH - 48) } : undefined} onLoad={(e) => setSpread(isLandscapeSpread(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))} />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            <path data-crop-dim fillRule="evenodd" className="scan-dim" d={`M0,0 H100 V100 H0 Z M${q.map(([x, y]) => `${x * 100},${y * 100}`).join(" L")} Z`} />
            <polygon points={q.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")} className="scan-quad" />
            {cutCheck && !cutCheck.safe && boxes && cutCheck.cut.map((c) => { const bx = boxes[c.index]!; return <rect key={c.index} data-cut x={bx.x * 100} y={bx.y * 100} width={bx.w * 100} height={bx.h * 100} className="fill-destructive/40 stroke-destructive" strokeWidth={0.5} style={{ vectorEffect: "non-scaling-stroke" }} />; })}
          </svg>
          {focus && bw > 0 && (() => { const L = loupePlacement(focus[0], focus[1], bw, bh); const half = LOUPE_SIZE / 2; return (
            <div data-testid="crop-loupe" className="pointer-events-none absolute z-10 overflow-hidden rounded-full border-2 border-primary bg-background shadow-lg"
              style={{ left: L.left, top: L.top, width: LOUPE_SIZE, height: LOUPE_SIZE }}>
              <div className="absolute" style={{ width: bw * LOUPE_ZOOM, height: bh * LOUPE_ZOOM, left: half - focus[0] * bw * LOUPE_ZOOM, top: half - focus[1] * bh * LOUPE_ZOOM }}>
                <img src={src} alt="" className="block h-full w-full" draggable={false} />
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full"><polygon points={q.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")} className="scan-quad" style={{ vectorEffect: "non-scaling-stroke" }} /></svg>
              </div>
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/70" />
              <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-primary/70" />
            </div>
          ); })()}
          {q.map(([x, y], i) => (
            <span key={i} onPointerDown={(e) => down(i, e)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }} className={`crop-handle absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full ${sel === i ? "ring-4 ring-primary/60" : ""}`} />
          ))}
          {mids.map(([x, y], i) => (
            <span key={`m${i}`} aria-label="Kéo cạnh" onPointerDown={(e) => down(i + 4, e)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }} className="crop-handle absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80" />
          ))}
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-between gap-2 px-4 pb-2">
        <div className="flex gap-1" role="group" aria-label="Chọn góc để chỉnh">
          {CORNERS.map((c, i) => (
            <Button key={c} size="sm" variant={sel === i ? "default" : "glass"} className="h-8 rounded-full px-2.5 text-xs" onClick={() => setSel(i)}>{c}</Button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          <span /><Button size="icon" variant="glass" className="size-7" aria-label="Lên" onClick={() => nudge(0, -1)}><ChevronUp /></Button><span />
          <Button size="icon" variant="glass" className="size-7" aria-label="Trái" onClick={() => nudge(-1, 0)}><ChevronLeft /></Button>
          <Button size="icon" variant="glass" className="size-7" aria-label="Đặt lại" onClick={() => setQ(initial.current)}><RotateCcw /></Button>
          <Button size="icon" variant="glass" className="size-7" aria-label="Phải" onClick={() => nudge(1, 0)}><ChevronRight /></Button>
          <span /><Button size="icon" variant="glass" className="size-7" aria-label="Xuống" onClick={() => nudge(0, 1)}><ChevronDown /></Button><span />
        </div>
      </div>
      <div className="shrink-0 flex items-center justify-center gap-2 px-4 pb-2" role="group" aria-label="Xoay mịn">
        <Button size="sm" variant="glass" className="h-8 rounded-full" aria-label="Xoay trái 0,5 độ" disabled={tilt <= -MAX_TILT} onClick={() => rotate(-TILT_STEP)}>↺</Button>
        <span className="w-16 text-center text-xs tabular-nums" aria-live="polite">{tilt.toLocaleString("vi-VN")}°</span>
        <Button size="sm" variant="glass" className="h-8 rounded-full" aria-label="Xoay phải 0,5 độ" disabled={tilt >= MAX_TILT} onClick={() => rotate(TILT_STEP)}>↻</Button>
      </div>
      {spread && (
        <div className="flex items-center justify-center gap-2 px-4 pb-2" role="group" aria-label="Ảnh ngang 2 trang">
          <span className="text-xs opacity-70">Ảnh ngang — giữ 1 trang:</span>
          <Button size="sm" variant="glass" className="h-8 rounded-full" onClick={() => setQ((cur) => tidyQuad(halfQuad(cur, "left")))}>Trang trái</Button>
          <Button size="sm" variant="glass" className="h-8 rounded-full" onClick={() => setQ((cur) => tidyQuad(halfQuad(cur, "right")))}>Trang phải</Button>
        </div>
      )}
      {cutCheck && !cutCheck.safe && (
        <p role="alert" className="scan-warn mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"><AlertTriangle className="size-4 shrink-0" /> Khung cắt đi qua {cutCheck.cut.length} từ ở mép — nới khung ra để không mất chữ.</p>
      )}
      {!check.ok && <p role="alert" className="px-4 pb-2 text-center text-xs text-destructive">{check.message}</p>}
      <div className="shrink-0 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {(Object.keys(PAPER_LABEL) as Paper[]).map((k) => (
          <Button key={k} size="sm" variant={paper === k ? "default" : "glass"} className="shrink-0 rounded-full" onClick={() => setPaper(k)}>{PAPER_LABEL[k]}</Button>
        ))}
      </div>
      <div className="shrink-0 grid grid-cols-3 gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Button variant="glass" disabled={busy} onClick={auto}><Wand2 /> {busy ? "Đang dò…" : "Tự động"}</Button>
        <Button variant="glass" onClick={() => setQ([[0, 0], [1, 0], [1, 1], [0, 1]])}>Toàn ảnh</Button>
        <Button disabled={!check.ok} onClick={() => check.ok && onApply(q, paper)}>{applyLabel}</Button>
      </div>
    </div>
  );
}

