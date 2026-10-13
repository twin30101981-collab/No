import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBlocker } from "@tanstack/react-router";
import { AlertTriangle, Crop, RotateCw, ScanText, Sparkles, X } from "lucide-react";
import { checkQuality } from "@/lib/quality";
import { suggestFilter, shouldSuggest, type FilterSuggestion } from "@/lib/filter-suggest";
import type { TransferEdit } from "@/lib/similar-pages";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { CropEditor } from "@/components/crop-editor";
import { ImageCompare } from "@/components/image-compare";
import { FILTER_LABEL, type Filter, type Page, type PageEdit } from "@/lib/db";
import { loadImg, renderPage, renderPreview } from "@/lib/image";
import { confirmDialog } from "@/lib/dialog";
import { showError } from "@/lib/errors";
import { edgeCutCheck, type ContentBox } from "@/lib/edit-session";
import { recognizeWordBoxes } from "@/lib/ocr";
import { boxFromOcrWord } from "@/lib/edit-view";
import { applyEdit, canRedo, canUndo, isDirty, redo, resetSession, saveSession, startSession, undo } from "@/lib/edit-session";
import { actualScale, centerOn, clampPan, fitScale, type Pan } from "@/lib/edit-view";
import { suggestDewarp, type DewarpSuggestion } from "@/lib/dewarp-suggest";
import { clampLevel, LEVEL_LABEL, TOOL_KEYS, TOOL_LABEL, type ToolLevel } from "@/lib/tool-levels";
import { clampFilterLevel, filterGlSupport, filterPreviewGL, filterShaderParams } from "@/lib/filter-gl";
import { buildVariants, variantActive, type Variant } from "@/lib/variants";
import type { PageMetrics } from "@/lib/page-grade";

/** P4/TD-09: đo độ cong trang trên bản thu nhỏ ≤ 640 px của ảnh gốc (nhanh, không chạm ảnh lớn). */
async function measureCurve(orig: string, quad: number[][]): Promise<DewarpSuggestion | null> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("load")); i.src = orig;
  });
  const s = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(8, Math.round(img.naturalWidth * s)), h = Math.max(8, Math.round(img.naturalHeight * s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return suggestDewarp(ctx.getImageData(0, 0, w, h).data, w, h, quad);
}

/** Xem ảnh đã dựng đầy đủ: vừa khung hoặc 100% (1 điểm ảnh = 1 điểm màn hình), kéo để dịch. */
function ZoomView({ src, loading }: { src: string; loading: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [actual, setActual] = useState(false);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  useEffect(() => {
    const el = frame.current; if (!el) return;
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const scale = actual ? actualScale(dpr) : fitScale(view, nat);
  const at = clampPan(actual ? pan : { x: 0, y: 0 }, view, nat, scale);
  function toggle(next: boolean) {
    setActual(next);
    if (next) setPan(centerOn({ x: 0.5, y: 0.5 }, view, nat, actualScale(dpr)));
  }
  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        <Button size="sm" variant={actual ? "glass" : "default"} className="rounded-full" aria-pressed={!actual} onClick={() => toggle(false)}>Vừa khung</Button>
        <Button size="sm" variant={actual ? "default" : "glass"} className="rounded-full" aria-pressed={actual} onClick={() => toggle(true)}>100%</Button>
        {loading && <span className="self-center text-xs opacity-70">Đang dựng ảnh đầy đủ…</span>}
      </div>
      <div
        ref={frame}
        className="relative h-[44dvh] w-full touch-none select-none overflow-hidden rounded-lg bg-editor"
        onPointerDown={(e) => { if (!actual) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: at.x, py: at.y }; }}
        onPointerMove={(e) => { const d = drag.current; if (d) setPan(clampPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }, view, nat, scale)); }}
        onPointerUp={(e) => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <img
          src={src} alt="Ảnh đã chỉnh, dựng đầy đủ" draggable={false}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="absolute max-w-none"
          style={nat.w > 0 ? { left: at.x, top: at.y, width: nat.w * scale, height: nat.h * scale } : { visibility: "hidden" }}
        />
      </div>
    </div>
  );
}

/** S13b – Chỉnh tay: mọi thay đổi nằm trong bản nháp; chỉ khi bấm Lưu mới ghi vào trang (Hủy/rời màn hình không đổi gì). */
/** R1.1 – Một cửa chỉnh (TD-11/12): bộ lọc, ánh sáng, cắt, xoay, công cụ 3 mức đều ở đây; chỉ ghi khi bấm Lưu / Áp tất cả / Trang tương tự. */
export function AdjustEditor({ page, onClose, onApply, onApplyAll, onApplySimilar, extra }: {
  page: Page; onClose: () => void; onApply: (edit: PageEdit) => void;
  onApplyAll?: ((edit: TransferEdit) => void) | undefined; onApplySimilar?: ((edit: TransferEdit) => void) | undefined; extra?: ReactNode;
}) {
  const [s, setS] = useState(() => startSession(page.edit));
  const [mode, setMode] = useState<"compare" | "zoom">("compare");
  const [holdOriginal, setHoldOriginal] = useState(false);
  const [preview, setPreview] = useState(page.src);
  const [previewing, setPreviewing] = useState(false);
  const [full, setFull] = useState(page.src);
  const [fullBusy, setFullBusy] = useState(false);
  const [crop, setCrop] = useState(false);
  const [live, setLive] = useState<{ b?: number; c?: number; lv?: number }>({});
  const d = s.draft;
  // TD-14: Radix chỉ gọi onValueCommit khi pointerup; pointercancel (cử chỉ hệ thống, chạm
  // đa điểm) bỏ qua bước này → số đang hiện lệch bản nháp. Khi hủy, ghi giá trị đang hiện.
  const liveRef = useRef(live);
  liveRef.current = live;
  function commitLive(key: "b" | "c" | "lv") {
    const v = liveRef.current[key];
    if (v === undefined) return;
    setLive((l) => { const { [key]: _drop, ...rest } = l; return rest; });
    setS((cur) => applyEdit(cur, key === "b" ? { brightness: v } : key === "c" ? { contrast: v } : { level: v }));
  }
  // R2.4: ảnh gốc giải mã sẵn để xem trước WebGL2 tức thì khi kéo thanh cấp độ.
  const glImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    let current = true;
    if (!filterGlSupport().ok) return;
    void loadImg(page.orig).then((img) => { if (current) glImg.current = img; }).catch(() => { /* không có GL preview */ });
    return () => { current = false; glImg.current = null; };
  }, [page.orig]);
  /** Xem trước tức thì trên GPU trong lúc kéo thanh; ảnh đầy đủ chỉ dựng khi thả tay. */
  function glPreview(lv: number) {
    const img = glImg.current;
    if (!img) return;
    const p = filterShaderParams(d.filter, lv, live.b ?? d.brightness, live.c ?? d.contrast);
    if (p.cpuOnly) return;
    const c = filterPreviewGL(img, d.filter, lv, live.b ?? d.brightness, live.c ?? d.contrast);
    if (c) { setPreview(c.toDataURL("image/jpeg", 0.85)); c.width = 0; }
  }
  const [suggest, setSuggest] = useState<FilterSuggestion | null>(null);
  // R3.2: chỉ số trang để dựng 3 biến thể "Phương án khác" phù hợp ảnh.
  const [metrics, setMetrics] = useState<PageMetrics | null>(null);
  useEffect(() => {
    let current = true;
    void checkQuality(page.orig, { cropped: true })
      .then((r) => { if (current) { setMetrics(r.metrics); setSuggest(suggestFilter(r.metrics)); } })
      .catch(() => { /* thiếu chỉ số thì không gợi ý */ });
    return () => { current = false; };
  }, [page.orig]);
  const variants = buildVariants(metrics);
  /** R3.2: chọn biến thể = 1 chạm → áp toàn bộ thông số vào bản nháp. */
  function pickVariant(v: Variant) {
    setLive({});
    setS((cur) => applyEdit(cur, { ...v.edit }));
  }
  const transfer = (): TransferEdit => ({ filter: d.filter, brightness: d.brightness, contrast: d.contrast });

  // TD-23 – chặn rời màn (nút Back của trình duyệt/Android hoặc đổi tuyến) khi còn nháp chưa lưu.
  const dirtyRef = useRef(false);
  dirtyRef.current = isDirty(s);
  const blocker = useBlocker({ shouldBlockFn: () => dirtyRef.current, withResolver: true });
  useEffect(() => {
    if (blocker.status !== "blocked") return;
    void confirmDialog("Bỏ các thay đổi chưa lưu?", { message: "Trang giữ nguyên như đã lưu.", okText: "Bỏ thay đổi", danger: true })
      .then((ok) => (ok ? blocker.proceed?.() : blocker.reset?.()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- HM-06: chỉ dùng status/proceed/reset của blocker (đã liệt kê); không cần chạy lại khi các trường khác của blocker đổi
  }, [blocker.status, blocker.proceed, blocker.reset]);

  useEffect(() => {
    if (mode !== "compare") return;
    let current = true;
    setPreviewing(true);
    const timer = window.setTimeout(() => {
      void renderPreview(page.orig, d)
        .then((src) => { if (current) setPreview(src); })
        .catch((error) => { if (current) showError(error, "Không xem trước được"); })
        .finally(() => { if (current) setPreviewing(false); });
    }, 60);
    return () => { current = false; window.clearTimeout(timer); };
  }, [page.orig, d, mode]);

  useEffect(() => {
    if (mode !== "zoom") return;
    let current = true;
    setFullBusy(true);
    const timer = window.setTimeout(() => {
      void renderPage(page.orig, d)
        .then((src) => { if (current) setFull(src); })
        .catch((error) => { if (current) showError(error, "Không dựng được ảnh đầy đủ"); })
        .finally(() => { if (current) setFullBusy(false); });
    }, 300);
    return () => { current = false; window.clearTimeout(timer); };
  }, [page.orig, d, mode]);

  // S13d – cảnh báo chữ bị khung cắt ngang: OCR ảnh gốc 1 lần khi người dùng bấm, rồi kiểm lại mỗi lần đổi khung (không tốn OCR).
  const [boxes, setBoxes] = useState<ContentBox[] | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  async function scanBoxes() {
    setOcrBusy(true);
    try {
      const r = await recognizeWordBoxes(page.orig);
      setBoxes(r.words.map((w) => boxFromOcrWord(w, r.size)).filter((b): b is ContentBox => !!b));
    } catch (e) { showError(e, "Không đọc được chữ"); } finally { setOcrBusy(false); }
  }
  const cutCheck = boxes ? edgeCutCheck(d.quad, boxes) : null;

  // P4/TD-09: gợi ý nắn phẳng trang cong — đo một lần khi mở màn (chỉ khi có khung 4 góc
  // và người dùng chưa tự quyết). Người dùng bấm Áp dụng/Giữ nguyên → ghi vào bản nháp.
  const [curve, setCurve] = useState<DewarpSuggestion | null>(null);
  useEffect(() => {
    if (!page.edit.quad || page.edit.flatten !== undefined) return;
    let current = true;
    void measureCurve(page.orig, page.edit.quad)
      .then((r) => { if (current && r?.curved) setCurve(r); })
      .catch(() => { /* đo lỗi → không gợi ý */ });
    return () => { current = false; };
  }, [page.orig, page.edit.quad, page.edit.flatten]);

  async function cancel() {
    if (isDirty(s) && !(await confirmDialog("Bỏ các thay đổi chưa lưu?", { message: "Trang giữ nguyên như đã lưu.", okText: "Bỏ thay đổi", danger: true }))) return;
    onClose();
  }
  function save() {
    const r = saveSession(s);
    if (!r.changed) { onClose(); return; }
    onApply(r.edit);
  }
  const b = live.b ?? d.brightness, c = live.c ?? d.contrast;
  const lv = live.lv ?? clampFilterLevel(d.level);

  return (
    <div className="scan-screen fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" className="scan-icon" onClick={() => void cancel()}><X /> Hủy</Button>
        <p className="font-display text-sm font-semibold">Chỉnh tay{isDirty(s) ? " •" : ""}</p>
        <Button onClick={save}>Lưu</Button>
      </header>
      <div className="px-4">
        <div className="mb-2 flex gap-1.5" role="group" aria-label="Kiểu xem">
          <Button size="sm" variant={mode === "compare" ? "default" : "glass"} className="rounded-full" aria-pressed={mode === "compare"} onClick={() => setMode("compare")}>So sánh</Button>
          <Button size="sm" variant={mode === "zoom" ? "default" : "glass"} className="rounded-full" aria-pressed={mode === "zoom"} onClick={() => setMode("zoom")}>Xem chữ nhỏ</Button>
        </div>
        {mode === "compare" ? (
          <div>
            <ImageCompare before={page.orig} after={preview} loading={previewing} holdOriginal={holdOriginal} />
            <Button
              size="sm" variant="glass" className="mt-2 w-full select-none touch-none rounded-full"
              aria-pressed={holdOriginal}
              onPointerDown={() => setHoldOriginal(true)}
              onPointerUp={() => setHoldOriginal(false)}
              onPointerLeave={() => setHoldOriginal(false)}
              onPointerCancel={() => setHoldOriginal(false)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setHoldOriginal(true); }}
              onKeyUp={() => setHoldOriginal(false)}
              onBlur={() => setHoldOriginal(false)}
            >
              Giữ để xem ảnh gốc
            </Button>
          </div>
        ) : <ZoomView src={full} loading={fullBusy} />}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        <Button variant="glass" disabled={!canUndo(s)} onClick={() => setS(undo(s))}>Hoàn tác</Button>
        <Button variant="glass" disabled={!canRedo(s)} onClick={() => setS(redo(s))}>Làm lại</Button>
        <Button variant="glass" disabled={!isDirty(s)} onClick={() => setS(resetSession(s))}>Đặt lại</Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 px-4">
        <Button variant="glass" onClick={() => setCrop(true)}><Crop /> Cắt / 4 góc</Button>
        <Button variant="glass" onClick={() => setS(applyEdit(s, { rotation: (d.rotation + 90) % 360 }))}><RotateCw /> Xoay 90°</Button>
      </div>
      {curve && d.flatten === undefined && (
        <div className="mt-2 px-4" data-testid="dewarp-suggest">
          <div className="rounded-lg bg-muted px-3 py-2 text-xs">
            <p className="font-semibold">Trang hơi cong (độ tin cậy ~{Math.round(curve.confidence * 100)}%)</p>
            <p className="mt-0.5 opacity-70">Nắn phẳng giúp chữ thẳng hàng, dễ đọc và xuất PDF đẹp hơn.</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => { setS((cur) => applyEdit(cur, { flatten: true })); setCurve(null); }}>Nắn phẳng</Button>
              <Button size="sm" variant="glass" onClick={() => { setS((cur) => applyEdit(cur, { flatten: false })); setCurve(null); }}>Giữ nguyên</Button>
            </div>
          </div>
        </div>
      )}
      {d.flatten !== undefined && (
        <div className="mt-2 px-4">
          <p className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
            <span>{d.flatten ? "Đang nắn phẳng trang cong." : "Đã tắt nắn phẳng — giữ độ cong tự nhiên."}</span>
            <Button size="sm" variant="ghost" onClick={() => setS((cur) => applyEdit(cur, { flatten: undefined }))}>Tự động</Button>
          </p>
        </div>
      )}
      <div className="mt-2 px-4" aria-live="polite">
        {!cutCheck ? (
          <Button variant="glass" className="w-full" disabled={ocrBusy} onClick={() => void scanBoxes()}><ScanText /> {ocrBusy ? "Đang đọc chữ…" : "Kiểm chữ bị cắt mép"}</Button>
        ) : cutCheck.safe ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs">Khung cắt không lẹm vào chữ nào ({boxes!.length} từ đã kiểm).</p>
        ) : (
          <>
            <p className="flex items-center gap-2 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive"><AlertTriangle className="size-4 shrink-0" /> Khung cắt đi qua {cutCheck.cut.length} từ ở mép — mở Cắt / 4 góc để nới khung.</p>
            {/* S13e – tô vùng bị cắt trên ảnh gốc: khung hiện tại (viền) + từ bị lẹm (đỏ). */}
            <div className="relative mt-2 overflow-hidden rounded-lg" data-testid="cut-overlay">
              <img src={page.orig} alt="Vị trí chữ bị cắt" className="block w-full" />
              <svg className="absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
                {d.quad && <polygon points={d.quad.map((p) => p.join(",")).join(" ")} fill="none" className="stroke-primary" strokeWidth={0.004} />}
                {cutCheck.cut.map((c) => { const bx = boxes![c.index]!; return <rect key={c.index} data-cut x={bx.x} y={bx.y} width={bx.w} height={bx.h} className="fill-destructive/40 stroke-destructive" strokeWidth={0.003} />; })}
              </svg>
            </div>
          </>
        )}
      </div>
      <div className="mt-3 space-y-2 px-4" data-testid="tool-strip" aria-label="Công cụ 3 mức">
        {TOOL_KEYS.map((k) => {
          const lv = clampLevel(d.tools?.[k]);
          return (
            <div key={k} className="flex items-center justify-between gap-2">
              <span id={`tool-${k}`} className="text-xs font-semibold">{TOOL_LABEL[k]}</span>
              <div className="flex gap-1" role="radiogroup" aria-labelledby={`tool-${k}`}>
                {LEVEL_LABEL.map((name, i) => (
                  <Button key={name} size="sm" role="radio" aria-checked={lv === i} variant={lv === i ? "default" : "glass"} className="h-7 rounded-full px-2.5 text-xs"
                    onClick={() => setS((cur) => applyEdit(cur, { tools: { ...cur.draft.tools, [k]: i as ToolLevel } }))}>{name}</Button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {shouldSuggest(suggest, d.filter) && (
        <div className="mt-3 px-4">
          <button data-testid="filter-suggest" onClick={() => setS((cur) => applyEdit(cur, { filter: suggest!.filter }))}
            className="flex w-full items-center gap-2 rounded-[10px] border border-primary/40 bg-primary/5 px-3 py-2 text-left text-xs">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span>Gợi ý: <b>{FILTER_LABEL[suggest!.filter]}</b> — {suggest!.reason} (độ tin cậy ~{Math.round(suggest!.confidence * 100)}%)</span>
          </button>
        </div>
      )}
      <div className="mt-3 px-4" data-testid="variant-strip">
        <p className="mb-1.5 text-xs font-semibold">Phương án khác — chạm để đổi ngay</p>
        <div className="grid grid-cols-3 gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              data-testid={`variant-${v.id}`}
              aria-pressed={variantActive(v, d)}
              onClick={() => pickVariant(v)}
              className={`rounded-[10px] border px-2 py-2 text-left ${variantActive(v, d) ? "border-primary bg-primary/10" : "border-border bg-muted"}`}
            >
              <span className="block text-xs font-semibold">{v.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug opacity-70">{v.desc}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" data-testid="filter-strip">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={d.filter === f ? "default" : "glass"} className="shrink-0 rounded-full" onClick={() => setS(applyEdit(s, { filter: f }))}>{FILTER_LABEL[f]}</Button>
        ))}
      </div>
      <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <label id="adj-brightness-label" className="mt-4 block text-xs font-semibold">Độ sáng ({b})</label>
        <Slider aria-labelledby="adj-brightness-label" className="mt-2" onPointerCancel={() => commitLive("b")} min={-80} max={80} step={5} value={[b]} onValueChange={([v]) => setLive((l) => ({ ...l, b: v ?? 0 }))} onValueCommit={([v]) => { setLive((l) => { const { b: _drop, ...rest } = l; return rest; }); setS((cur) => applyEdit(cur, { brightness: v ?? 0 })); }} />
        <label id="adj-contrast-label" className="mt-4 block text-xs font-semibold">Tương phản ({c})</label>
        <Slider aria-labelledby="adj-contrast-label" className="mt-2" onPointerCancel={() => commitLive("c")} min={-80} max={80} step={5} value={[c]} onValueChange={([v]) => setLive((l) => ({ ...l, c: v ?? 0 }))} onValueCommit={([v]) => { setLive((l) => { const { c: _drop, ...rest } = l; return rest; }); setS((cur) => applyEdit(cur, { contrast: v ?? 0 })); }} />
        <label id="adj-level-label" className="mt-4 block text-xs font-semibold">Cấp độ bộ lọc ({lv})</label>
        <Slider
          aria-labelledby="adj-level-label" className="mt-2" min={0} max={100} step={5} value={[lv]}
          data-testid="filter-level"
          onPointerCancel={() => commitLive("lv")}
          onValueChange={([v]) => { const n = clampFilterLevel(v); setLive((l) => ({ ...l, lv: n })); glPreview(n); }}
          onValueCommit={([v]) => { const n = clampFilterLevel(v); setLive((l) => { const { lv: _drop, ...rest } = l; return rest; }); setS((cur) => applyEdit(cur, { level: n })); }}
        />
        {(onApplyAll || onApplySimilar) && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {onApplyAll && <Button variant="glass" onClick={() => onApplyAll(transfer())}>Áp tất cả trang</Button>}
            {onApplySimilar && <Button variant="glass" onClick={() => onApplySimilar(transfer())}>Trang tương tự</Button>}
          </div>
        )}
        {extra && <div className="mt-4">{extra}</div>}
        <p className="mt-4 text-xs opacity-70">Chưa bấm Lưu thì trang đã lưu không thay đổi. Ảnh gốc luôn được giữ để hoàn tác.</p>
      </div>
      {crop && (
        <CropEditor
          src={page.orig} quad={d.quad} paper={d.paper} applyLabel="Dùng khung này"
          onClose={() => setCrop(false)}
          onApply={(quad, paper) => { setCrop(false); setS((cur) => applyEdit(cur, { quad, paper })); }}
        />
      )}
    </div>
  );
}
