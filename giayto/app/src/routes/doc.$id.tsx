import { useQueuedServerFn } from "@/lib/ai-queue";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { inPreviewWindow, usePreview } from "@/lib/preview-src";
import { usePageThumb } from "@/lib/thumbs";

function LazyPage({ src, on, alt, thumb }: { src: string; on: boolean; alt: string; thumb?: string | undefined }) {
  const url = usePreview(src, on, thumb);
  if (!url) return <div className="aspect-[3/4] h-full max-h-full max-w-full animate-pulse rounded-[4px] bg-muted" aria-label={alt} />;
  return <img src={url} alt={alt} decoding="async" className="page-shadow max-h-full max-w-full rounded-[4px] object-contain" />;
}

/** B14: ô ảnh trong dải trang/bảng sắp xếp dùng ảnh thu nhỏ riêng — không giải mã ảnh lớn. */
function StripThumb({ doc, i, className }: { doc: Doc; i: number; className: string }) {
  const t = usePageThumb(doc, i);
  if (!t) return <div className={`animate-pulse bg-muted ${className}`} />;
  return <img src={t} alt="" loading="lazy" decoding="async" className={className} />;
}
import { useEffect, useRef, useState } from "react";
import { NUMBER_STYLES, pageNumberText } from "@/lib/pdf-marks";
import {
  ArrowDown, ArrowLeft, EyeOff, ArrowUp, Camera, ClipboardPaste, Copy, Crop, FileDown, ImagePlus, LayoutGrid, Loader2, Lock, MoreVertical,
  PenLine, RotateCw, Share2, SlidersHorizontal, Trash2, Type, Sparkles, Unlock, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPicker, TagChip, TagPicker } from "@/components/library-ui";
import { Eraser, Monitor, Folder, Tags } from "lucide-react";
import { movePage, removePage, duplicatePage, toggleId, removePages, duplicatePages, progressPct } from "@/lib/page-list";
import { bgQueue } from "@/lib/bg-queue";
import { useSyncExternalStore } from "react";
import { type Doc, type Filter, FILTER_LABEL, type Page, type PageEdit, type Quad, deleteDocs, docText, getDocs, saveDoc, useDocs } from "@/lib/db";
import { srcBytes } from "@/lib/disk-pack";
import { compressPage, dataUrlToBlob, docToPdf, download, PDF_SIZES, safeName, shareOrDownload, type PdfSize } from "@/lib/files";
import { renderPage, releaseRenderCache, stamp } from "@/lib/image";
import { checkQuality } from "@/lib/quality";
import { findSimilar, applyToSimilar, type TransferEdit } from "@/lib/similar-pages";
import type { PageMetrics } from "@/lib/page-grade";
import { CropEditor, useFindQuad } from "@/components/crop-editor";
import { RegionOcr } from "@/components/region-ocr";
import { RedactEditor } from "@/components/redact-editor";
import { EraseEditor } from "@/components/erase-editor";
import { SignaturePlacer } from "@/components/signature-placer";
import { filesToPages, pickFiles } from "@/lib/importer";
import { ADD_SOURCE_LABEL, ADD_SOURCES, docShortcut, filesFromDrop, insertPagesAt, isFileDrag, type AddSource, type InsertPos, INSERT_POS_LABEL } from "@/lib/add-sources";
import { FILE_ACCEPT, IMAGE_ACCEPT, isEditingText, readClipboardImages } from "@/lib/image-input";
import { useImagePaste } from "@/lib/use-image-paste";
import { classify } from "@/lib/ocr";
import { firstOcrFailure, ocrQueue, useOcrJobs } from "@/lib/ocr-queue";
import { getPinSalt, getSettings, hashPin, unlocked, useLockTick, useSettings } from "@/lib/settings";
import { getVaultKey } from "@/lib/vault";
import { confirmDialog, pinDialog } from "@/lib/dialog";
import { showError } from "@/lib/errors";
import { SafeBoundary } from "@/components/safe-boundary";
import { needsCornerHint } from "@/lib/dedupe-phash";
import { AiPanel, type AiTab } from "@/components/ai-panel";
import { aiLayout } from "@/lib/ai.functions";
import { imagesToWord } from "@/lib/word";
import { docToMarkdown, docToTxt, pageToSlide, slidesToPptx } from "@/lib/pptx";
import { sendFile } from "@/lib/send-to";
import { driveReady, saveToDrive } from "@/lib/drive";
import { ExportReview } from "@/components/export-review";
import type { Review } from "@/lib/review";
import { registerSource } from "@/lib/history";
import { pageToPng, pagesToLongImage, pagesToZip } from "@/lib/image-export";
import { ID_PURPOSES, idWatermarkText, isIdDoc, stampIdWatermark } from "@/lib/id-watermark";
import { ShareLinkPanel } from "@/components/share-link-panel";
import { ScanDiagnosePanel } from "@/components/scan-diagnose-panel";
import { AdjustEditor } from "@/components/adjust-editor";
import { decisionNote, filterPages, needsReview, TAB_LABEL, type PageReview, type ReviewTab } from "@/lib/page-review";

import { canvasToTempUrl, revokeTemp } from "@/lib/canvas-url";

const reviewCache = new Map<string, PageReview>();

type Panel = null | "ai" | "ai-summarize" | "ai-translate" | "ai-solve" | "crop" | "filter" | "ocr" | "pages" | "export" | "sign" | "draw" | "menu" | "region" | "pen" | "redact" | "erase" | "adjust" | "add";
const TOOL_PANEL: Record<string, Panel> = { ocr: "ocr", pages: "pages", rotate: "pages", export: "export", sign: "sign", draw: "draw", filter: "filter", "ai-extract": "ai", "ai-summarize": "ai-summarize", "ai-translate": "ai-translate", "ai-solve": "ai-solve" };

export const Route = createFileRoute("/doc/$id")({
  validateSearch: (s: Record<string, unknown>): { tool?: string | undefined; run?: string | undefined } => ({ tool: typeof s["tool"] === "string" ? s["tool"] : undefined, run: typeof s["run"] === "string" ? s["run"] : undefined }),
  head: () => ({ meta: [
    { title: "Xem tài liệu — Ghi Nhanh" },
    { name: "description", content: "Chỉnh trang, cắt thẳng, lọc ảnh, ký tên, nhận chữ và xuất PDF." },
    { property: "og:title", content: "Xem tài liệu — Ghi Nhanh" },
    { property: "og:description", content: "Chỉnh trang, cắt thẳng, lọc ảnh, ký tên, nhận chữ và xuất PDF." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ]}),
  component: DocView,
});

function DocView() {
  const { id } = Route.useParams();
  const { tool, run } = Route.useSearch();
  const { docs, ready } = useDocs();
  const settings = useSettings();
  const doc = docs.find((d) => d.id === id);
  const [open, setOpen] = useState(false);
  const lockTick = useLockTick();
  useEffect(() => { setOpen(false); }, [lockTick]);

  if (!ready) return <div className="grid min-h-dvh place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!doc) return <div className="grid min-h-dvh place-items-center p-8 text-center"><div><p className="font-display font-semibold">Không tìm thấy tài liệu</p><Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary">Về trang chủ</Link></div></div>;
  if (doc.locked && settings.pin && !unlocked.has(doc.id) && !open) return <PinGate onOk={() => { unlocked.add(doc.id); setOpen(true); }} hash={settings.pin} />;
  return <Editor doc={doc} initial={tool ? TOOL_PANEL[tool] ?? null : null} autoRun={run === "1"} />;
}

function PinGate({ hash, onOk }: { hash: string; onOk: () => void }) {
  const [pin, setPin] = useState("");
  async function check(v: string) { setPin(v); if (v.length >= 4 && (await hashPin(v)) === hash) { const { unlockVault } = await import("@/lib/db"); if (await unlockVault(v, getPinSalt())) onOk(); else { toast.error("Không giải mã được tài liệu"); setPin(""); } } else if (v.length >= 6) { toast.error("Sai mã PIN"); setPin(""); } }
  return (
    <main className="app-shell grid min-h-dvh place-items-center px-8">
      <div className="w-full max-w-[320px] text-center">
        <Lock className="mx-auto size-10 text-primary" />
        <p className="mt-4 font-display text-lg font-semibold">Tài liệu đã khóa</p>
        <p className="mt-1 text-sm text-muted-foreground">Nhập mã PIN để mở</p>
        <Input autoFocus inputMode="numeric" type="password" value={pin} maxLength={6} onChange={(e) => check(e.target.value.replace(/\D/g, ""))} className="mt-5 h-14 text-center text-2xl tracking-[0.5em]" />
        <Link to="/" className="mt-5 inline-block text-sm font-semibold text-primary">Quay lại</Link>
      </div>
    </main>
  );
}

function Editor({ doc, initial, autoRun = false }: { doc: Doc; initial: Panel; autoRun?: boolean }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const activeRef = useRef(active); activeRef.current = active;
  const [panel, setPanel] = useState<Panel>(initial);
  const [busy, setBusy] = useState("");
  const busyRef = useRef(busy); busyRef.current = busy;
  const [review, setReview] = useState<Review | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const page = doc.pages[Math.min(active, doc.pages.length - 1)];

  useEffect(() => () => releaseRenderCache(), []);
  const save = (patch: Partial<Doc>) => saveDoc({ ...doc, ...patch });
  async function editPage(i: number, edit: Partial<PageEdit>) {
    const p = doc.pages[i]; const next = { ...p.edit, ...edit };
    const src = await renderPage(p.orig, next);
    await save({ pages: doc.pages.map((x, k) => (k === i ? { ...x, edit: next, src, manual: true } : x)) });
    // R3.3: học theo người dùng — ghi bộ lọc sửa tay theo loại tài liệu để lô sau ưu tiên.
    if (edit.filter && edit.filter !== p.edit.filter) {
      const kind = doc.fields?.["docType"] ?? doc.kind;
      void import("@/lib/user-recipe").then((m) => m.learnChoice(kind, edit.filter!));
    }
  }
  const [reviews, setReviews] = useState<Record<string, PageReview | undefined>>({});
  const [tab, setTab] = useState<ReviewTab>("all");
  // R4.2: chế độ chọn nhiều trang trong lưới sắp xếp.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const pagesRef = useRef(doc.pages); pagesRef.current = doc.pages;
  const pageKey = doc.pages.map((p) => `${p.id}:${p.edit.filter}`).join("|");
  useEffect(() => {
    let current = true;
    void (async () => {
      for (const p of pagesRef.current) {
        const key = `${p.id}:${p.edit.filter}`;
        let r = reviewCache.get(key);
        if (!r) {
          try {
            const q = await checkQuality(p.orig, { cropped: true });
            r = { score: q.score, note: decisionNote(q.metrics, p.edit.filter) };
            reviewCache.set(key, r);
          } catch { continue; }
        }
        if (!current) return;
        const found = r;
        setReviews((prev) => (prev[p.id] === found ? prev : { ...prev, [p.id]: found }));
      }
    })();
    return () => { current = false; };
  }, [pageKey]);
  const shownPages = filterPages(doc.pages, reviews, tab);
  const activeReview = page ? reviews[page.id] : undefined;
  const layoutFn = useQueuedServerFn(aiLayout, "Đọc bố cục");
  const findQuad = useFindQuad();
  const saveWord = async (text: string) => {
    const r = await imagesToWord(doc!.pages.map((p) => p.src), doc!.name, layoutFn, text);
    setReview({ kind: "word", title: doc!.name, blocks: r.blocks, note: r.note, source: { kind: "Tài liệu → Word", name: `${safeName(doc!.name)}.pdf`, lazy: registerSource(() => docToPdf(doc!)), details: [`${doc!.pages.length} trang ảnh`] } });
  };
  const run = (label: string, fn: () => Promise<void>) => async () => {
    setBusy(label); try { await fn(); } catch (e) { showError(e, label); } finally { setBusy(""); }
  };
  const importing = useRef(false);
  // R4.3: vị trí chèn mặc định của bảng Thêm.
  const [insertPos, setInsertPos] = useState<InsertPos>("after");
  const posRef = useRef(insertPos); posRef.current = insertPos;
  async function insertImages(files: File[], pos?: InsertPos) {
    if (!files.length || importing.current) return;
    importing.current = true; setBusy("Đang nhập ảnh…");
    try {
      const stats = { skipped: 0 };
      const pages = await filesToPages(files, stats);
      if (!pages.length) { if (stats.skipped) toast.info("Đã bỏ qua ảnh trùng, không thêm trang nào"); else toast.error("Không có ảnh hoặc PDF hợp lệ"); return; }
      const current = getDocs().find((d) => d.id === doc.id);
      if (!current) return;
      const where = pos ?? posRef.current;
      const result = insertPagesAt(current.pages, pages, where, active);
      await saveDoc({ ...current, pages: result.pages }); setActive(result.active);
      const at = where === "start" ? "đầu tài liệu" : where === "end" ? "cuối tài liệu" : `sau trang ${active + 1}`;
      toast.success(`Đã chèn ${pages.length} trang vào ${at}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không nhập được ảnh"); }
    finally { importing.current = false; setBusy(""); }
  }
  async function pasteImages() {
    try { await insertImages(await readClipboardImages()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không dán được ảnh"); }
  }
  useImagePaste(insertImages, !busy && (panel === null || panel === "pages"));
  // R4.3: kéo-thả ảnh/PDF từ ngoài vào toàn cửa sổ.
  const [dragOver, setDragOver] = useState(false);
  const insertRef = useRef(insertImages); insertRef.current = insertImages;
  useEffect(() => {
    let depth = 0;
    const onEnter = (e: DragEvent) => { if (isFileDrag(e)) { depth++; setDragOver(true); } };
    const onLeave = (e: DragEvent) => { if (isFileDrag(e) && --depth <= 0) { depth = 0; setDragOver(false); } };
    const onOver = (e: DragEvent) => { if (isFileDrag(e)) e.preventDefault(); };
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault(); depth = 0; setDragOver(false);
      void insertRef.current(filesFromDrop(e.dataTransfer));
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);
  // R4.3: phím tắt PC — Delete xoá trang, ←/→ chuyển trang, R xoay.
  const panelRef = useRef(panel); panelRef.current = panel;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditingText(e.target)) return;
      const p = panelRef.current;
      if (p !== null && p !== "pages" && p !== "add") return;
      const action = docShortcut(e.key);
      if (!action) return;
      const d = getDocs().find((x) => x.id === doc.id);
      if (!d || busyRef.current) return;
      e.preventDefault();
      if (action === "prev" || action === "next") {
        const i = Math.max(0, Math.min(d.pages.length - 1, activeRef.current + (action === "next" ? 1 : -1)));
        setActive(i); goTo(i);
      } else if (action === "delete") {
        if (d.pages.length <= 1) { toast("Tài liệu cần ít nhất 1 trang"); return; }
        const r = removePage(d.pages, activeRef.current, activeRef.current);
        void saveDoc({ ...d, pages: r.pages }); setActive(r.active);
        toast.success(`Đã xoá trang ${activeRef.current + 1}`);
      } else {
        const i = activeRef.current;
        const pg = d.pages[i];
        void (async () => {
          const edit = { ...pg.edit, rotation: (pg.edit.rotation + 90) % 360 };
          const src = await renderPage(pg.orig, edit);
          await saveDoc({ ...d, pages: d.pages.map((x, k) => (k === i ? { ...x, edit, src, manual: true } : x)) });
        })();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc.id]);
  /** One-tap corner detection without opening the crop editor; saves all pages in one write. */
  async function autoCorners(all: boolean) {
    const idx = all ? doc.pages.map((_, i) => i) : [active];
    const pages = [...doc.pages]; let ok = 0, ai = 0;
    for (const i of idx) {
      const p = pages[i]!; const r = await findQuad(p.orig);
      if (!r.q) continue;
      const edit = { ...p.edit, quad: r.q };
      pages[i] = { ...p, edit, src: await renderPage(p.orig, edit) }; ok++; if (r.how === "ai") ai++;
    }
    if (ok) await save({ pages });
    if (!ok) toast("Không tự nhận được mép giấy, hãy bấm Cắt để kéo góc bằng tay");
    else toast(`Đã dò góc ${ok}/${idx.length} trang${ai ? " (có dùng AI — kiểm tra lại)" : ""}`);
  }
  function goTo(i: number) { scroller.current?.scrollTo({ left: i * (scroller.current.clientWidth), behavior: "smooth" }); }

  const ocrJobs = useOcrJobs().filter((j) => j.docId === doc.id);
  // R4.2: số việc nền còn lại của tài liệu này (dựng trang, thu nhỏ, nhận chữ).
  const queueTick = useSyncExternalStore((fn) => bgQueue.subscribe(fn), () => bgQueue.size);
  void queueTick;
  const pageIds = new Set(doc.pages.map((p) => p.id));
  const pendingJobs = bgQueue.list().filter((j) => pageIds.has(j.pageId)).length + ocrJobs.length;
  const totalJobs = Math.max(doc.pages.length, pendingJobs);
  const pct = progressPct(pendingJobs, totalJobs);
  /** Queue OCR in the background; the user can keep editing or leave — results save themselves. */
  function ocr(all: boolean) {
    const idx = all ? doc.pages.map((_, i) => i) : [active];
    const tasks = ocrQueue().add(idx.map((i) => ({ docId: doc.id, pageId: doc.pages[i]!.id, label: `${doc.name} · trang ${i + 1}`, src: doc.pages[i]!.src })));
    toast(`Đã xếp ${idx.length} trang vào hàng nhận chữ`);
    void Promise.allSettled(tasks).then(async (rs) => {
      // HM-07: báo lỗi cả khi TẤT CẢ trang đều thất bại (trước đây thoát im lặng).
      const failed = firstOcrFailure(rs);
      if (failed) showError(failed, "Nhận chữ");
      if (!rs.some((r) => r.status === "fulfilled")) return;
      const cur = getDocs().find((d) => d.id === doc.id); if (!cur) return;
      const { kind, title } = classify(docText(cur));
      const auto = /^\S.* \d{2}-\d{2} \d{2}:\d{2}$/.test(cur.name) && title;
      await saveDoc({ ...cur, kind: cur.kind === "Tài liệu" || cur.kind === "Nhập" ? kind : cur.kind, ...(auto ? { name: title } : {}) });
      toast.success(auto ? `Đã nhận chữ và tự đặt tên: ${title}` : "Đã nhận chữ xong");
    });
  }

  if (!page) return (
    <main className="app-shell grid min-h-dvh place-items-center p-8 text-center"><div><p className="font-semibold">Tài liệu chưa có trang nào</p>
      <Button className="mt-4" asChild><Link to="/scan" search={{ doc: doc.id }}><Camera /> Quét thêm trang</Link></Button></div></main>
  );

  return (
    <main className="app-shell flex h-dvh flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[430px] flex-col">
        <ExportReview review={review} onClose={() => setReview(null)} />
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <Button variant="glass" size="icon" aria-label="Quay lại" onClick={() => navigate({ to: "/" })}><ArrowLeft /></Button>
          <button className="min-w-0 text-left" onClick={() => setPanel("menu")}>
            <p className="truncate font-display text-[0.9375rem] font-semibold">{doc.name}</p>
            <p className="text-[0.6875rem] text-muted-foreground">Trang {active + 1}/{doc.pages.length} · {doc.kind}{pendingJobs > 0 ? ` · đang xử lý ${pct}%` : ""}</p>
            {activeReview && <p className="truncate text-[0.6875rem] text-muted-foreground" data-testid="decision-note">{activeReview.note} · {activeReview.score}/100</p>}
          </button>
          <Button variant="glass" size="icon" aria-label="Tùy chọn" onClick={() => setPanel("menu")}><MoreVertical /></Button>
        </header>

        <div ref={scroller} onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
          {doc.pages.map((p, i) => (
            <div key={p.id} className="grid h-full w-full shrink-0 snap-center place-items-center p-4">
              <LazyPage src={p.src} on={inPreviewWindow(i, active)} alt={`Trang ${i + 1}`} thumb={p.thumb} />
            </div>
          ))}
        </div>

        {busy && <p className="mx-auto mb-2 flex items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"><Loader2 className="size-3.5 animate-spin" />{busy}</p>}

        {!busy && needsCornerHint(page) && <p className="px-4 pb-1 text-center text-xs text-muted-foreground" data-testid="corner-hint">Ảnh nhập chưa được cắt khung — bấm “Tự dò góc” để cắt và nắn.</p>}
        {!busy && (
          <div className="flex justify-center gap-2 px-4 pb-2">
            <Button size="sm" variant="glass" className="rounded-full" onClick={run("Đang dò góc…", () => autoCorners(false))}><Wand2 /> Tự dò góc</Button>
            {doc.pages.length > 1 && <Button size="sm" variant="glass" className="rounded-full" onClick={run("Đang dò góc mọi trang…", () => autoCorners(true))}>Mọi trang</Button>}
          </div>
        )}

        {doc.pages.length > 1 && (
          <div className="flex justify-center gap-1.5 px-4 pb-1.5" role="tablist" aria-label="Lọc trang">
            {(["all", "review", "manual"] as ReviewTab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {TAB_LABEL[t]}{t === "review" ? ` (${filterPages(doc.pages, reviews, "review").length})` : ""}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-center gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {shownPages.map((i) => { const p = doc.pages[i]!; const r = reviews[p.id]; return (
            <button key={p.id} onClick={() => goTo(i)} aria-label={`Trang ${i + 1}${r && needsReview(r.score) ? " — cần xem lại" : ""}`} className={`relative h-12 w-9 shrink-0 overflow-hidden rounded-[5px] border-2 ${i === active ? "border-primary" : "border-transparent opacity-70"}`}>
              <StripThumb doc={doc} i={i} className="h-full w-full object-cover" />
              {r && needsReview(r.score) && <span className="absolute inset-x-0 bottom-0 bg-warning px-0.5 text-center text-[0.5rem] font-bold leading-tight text-warning-foreground">Xem lại</span>}
            </button>); })}
          {shownPages.length === 0 && <p className="py-3 text-xs text-muted-foreground">Không có trang nào.</p>}
        </div>

        <nav className="bottom-nav grid grid-cols-8 px-1 pb-[env(safe-area-inset-bottom)]">
          <Tool icon={<Crop />} label="Cắt" onClick={() => setPanel("crop")} />
          <Tool icon={<RotateCw />} label="Xoay" onClick={run("Đang xoay…", () => editPage(active, { rotation: (page.edit.rotation + 90) % 360 }))} />
          <Tool icon={<SlidersHorizontal />} label="Lọc" onClick={() => setPanel("filter")} />
          <Tool icon={<PenLine />} label="Ký/Vẽ" onClick={() => setPanel("sign")} />
          <Tool icon={<Type />} label="Chữ" onClick={() => setPanel("ocr")} />
          <Tool icon={<Sparkles />} label="AI" onClick={() => setPanel("ai")} />
          <span className={`col-span-2 grid grid-cols-2 ${pendingJobs > 0 ? "opacity-40" : ""}`} title={pendingJobs > 0 ? `Còn ${pendingJobs} trang đang xử lý (${pct}%)` : undefined}>
            <Tool icon={<FileDown />} label="Xuất" primary onClick={() => {
              // R3.5: Xuất 1 chạm — PDF Chuẩn, tên tự động, nhắc trang cần xem lại
              if (!doc) return;
              void import("@/lib/quick-export").then(async ({ quickExportPdf, reviewReminder }) => {
                try {
                  await quickExportPdf(doc, reviews);
                  toast.success("Đã lưu PDF");
                  const remind = reviewReminder(reviews);
                  if (remind) toast(remind, { action: { label: "Xem lại", onClick: () => setTab("review") } });
                } catch (e) { showError(e, "Không tạo được PDF"); }
              });
            }} />
            <Tool icon={<MoreVertical />} label="Tùy chọn" onClick={() => setPanel("export")} />
          </span>
        </nav>
      </div>

      {panel === "crop" && <CropEditor src={page.orig} quad={page.edit.quad} paper={page.edit.paper} onClose={() => setPanel(null)} onApply={async (quad, paper) => { setPanel(null); await run("Đang cắt thẳng…", () => editPage(active, { quad, paper }))(); }} />}
      {panel === "region" && <RegionOcr src={page.src} onClose={() => setPanel("ocr")} onAppend={(t) => void save({ pages: doc.pages.map((x, k) => k === active ? { ...x, text: x.text ? `${x.text}\n${t}` : t } : x) })} />}
      {panel === "redact" && <RedactEditor src={page.src} onClose={() => setPanel(null)} onApply={async (src) => {
        setPanel(null);
        await save({ pages: doc.pages.map((x, k) => k === active ? { id: x.id, orig: src, src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } } : x) });
      }} />}
      {panel === "erase" && <EraseEditor src={page.src} onClose={() => setPanel(null)} onApply={async (src) => {
        setPanel(null);
        await save({ pages: doc.pages.map((x, k) => k === active ? { ...x, orig: src, src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } } : x) });
      }} />}
      {panel === "sign" && <SignaturePlacer src={page.src} onClose={() => setPanel(null)} onFreehand={() => setPanel("pen")} onApply={async (src) => {
        setPanel(null);
        await save({ pages: doc.pages.map((x, k) => k === active ? { ...x, orig: src, src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } } : x) });
        toast.success("Đã chèn chữ ký");
      }} />}
      {(panel === "pen" || panel === "draw") && <DrawPad page={page} highlight={panel === "draw"} onClose={() => setPanel(null)} onApply={async (overlay) => {
        setPanel(null);
        let src: string;
        try { src = await stamp(page.src, overlay); } finally { revokeTemp(overlay); }
        await save({ pages: doc.pages.map((x, k) => k === active ? { ...x, orig: src, src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } } : x) });
      }} />}

      {(panel === "adjust" || panel === "filter") && <SafeBoundary key={page.id} overlay title="Màn chỉnh sửa gặp sự cố." onClose={() => setPanel(null)}><AdjustEditor page={page} onClose={() => setPanel(null)}
        onApply={async (edit) => { setPanel(null); await run("Đang lưu chỉnh sửa…", () => editPage(active, edit))(); }}
        onApplyAll={doc.pages.length > 1 ? async (edit) => {
          setPanel(null);
          await run("Đang áp dụng cho tất cả…", async () => {
            const pages: Page[] = [];
            for (const p of doc.pages) { const e = { ...p.edit, ...edit }; pages.push({ ...p, edit: e, src: await renderPage(p.orig, e) }); }
            await save({ pages });
          })();
        } : undefined}
        onApplySimilar={doc.pages.length > 1 ? async (edit) => {
          setPanel(null);
          await run("Đang tìm trang tương tự…", async () => {
            const metrics = new Map<string, PageMetrics>();
            for (const p of doc.pages) { try { metrics.set(p.id, (await checkQuality(p.orig, { cropped: true })).metrics); } catch { /* bỏ trang thiếu số đo */ } }
            const ids = new Set([page.id, ...findSimilar(page.id, metrics).map((m) => m.pageId)]);
            const next = applyToSimilar(doc.pages, ids, edit);
            const pages: Page[] = [];
            for (const p of next) pages.push(ids.has(p.id) ? { ...p, src: await renderPage(p.orig, p.edit) } : p);
            await save({ pages });
            toast.success(ids.size > 1 ? `Đã áp dụng cho ${ids.size} trang tương tự` : "Không thấy trang tương tự — chỉ áp trang này");
          })();
        } : undefined}
        extra={<ScanDiagnosePanel pageId={page.id} filter={page.edit.filter} src={page.src} />} /></SafeBoundary>}

      <Sheet open={panel === "ocr"} onClose={() => setPanel(null)} title="Nhận diện chữ">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => ocr(false)}><Wand2 /> Trang này</Button>
          <Button variant="glass" className="flex-1" onClick={() => ocr(true)}>Tất cả trang</Button>
        </div>
        <Button variant="glass" className="mt-2 w-full" onClick={() => setPanel("region")}><Crop /> Chọn vùng để nhận chữ</Button>
        {ocrJobs.length > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-[10px] bg-muted px-3 py-2 text-xs">
            <span>{ocrJobs.length} trang đang chờ/đang đọc — có thể đóng bảng này, chữ tự lưu.</span>
            <Button variant="glass" size="sm" onClick={() => void ocrQueue().cancel((j) => j.docId === doc.id)}><X /> Hủy</Button>
          </div>
        )}
        {page.text != null && (
          <>
            <textarea value={page.text} onChange={(e) => save({ pages: doc.pages.map((x, k) => k === active ? { ...x, text: e.target.value } : x) })} className="mt-3 h-48 w-full rounded-[12px] border border-border bg-card p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Button variant="glass" size="sm" onClick={() => { void navigator.clipboard.writeText(docText(doc)); toast("Đã sao chép"); }}><Copy /> Sao chép</Button>
              <Button variant="glass" size="sm" disabled={!!busy} onClick={run("Đang dựng tệp Word…", () => saveWord(docText(doc)))}>Word</Button>
              <Button variant="glass" size="sm" onClick={() => download(new Blob([docToTxt(doc.pages)], { type: "text/plain;charset=utf-8" }), `${safeName(doc.name)}.txt`)}>TXT</Button>
              <Button variant="glass" size="sm" onClick={() => download(new Blob([docToMarkdown(doc.name, doc.pages)], { type: "text/markdown;charset=utf-8" }), `${safeName(doc.name)}.md`)}>Markdown</Button>
              <Button variant="glass" size="sm" className="col-span-2" disabled={!!busy} onClick={run("Đang dựng tệp PowerPoint…", async () => {
                const slides = []; for (const p of doc.pages) slides.push(await pageToSlide(p.src, p.text));
                download(slidesToPptx(slides, doc.name), `${safeName(doc.name)}.pptx`); toast("Đã xuất PowerPoint — chữ nằm ở phần ghi chú mỗi trang");
              })}>PowerPoint</Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={panel === "pages"} onClose={() => { setPanel(null); setSelected([]); }} title={`Sắp xếp ${doc.pages.length} trang${pendingJobs > 0 ? ` · đang xử lý ${pct}%` : ""}`}>
        {/* R4.2: lưới kéo-thả + chọn nhiều thao tác hàng loạt */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{selecting ? `Đã chọn ${selected.length} trang` : "Kéo thả để đổi thứ tự"}</p>
          <Button size="sm" variant={selecting ? "default" : "glass"} onClick={() => { setSelecting(!selecting); setSelected([]); }}>{selecting ? "Xong" : "Chọn"}</Button>
        </div>
        {selecting && selected.length > 0 && (
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Button size="sm" variant="glass" disabled={!!busy} onClick={run("Đang xoay các trang đã chọn…", async () => {
              for (const id of selected) { const i = doc.pages.findIndex((p) => p.id === id); if (i >= 0) await editPage(i, { rotation: (doc.pages[i]!.edit.rotation + 90) % 360 }); }
              setSelected([]);
            })}><RotateCw /> Xoay</Button>
            <Button size="sm" variant="glass" onClick={() => { const r = duplicatePages(doc.pages, new Set(selected), (x) => ({ ...x, id: crypto.randomUUID() }), active); void save({ pages: r.pages }); setActive(r.active); setSelected([]); toast.success(`Đã nhân bản ${selected.length} trang`); }}><Copy /> Nhân bản</Button>
            <Button size="sm" variant="glass" disabled={selected.length >= doc.pages.length} onClick={() => { const r = removePages(doc.pages, new Set(selected), active); void save({ pages: r.pages }); setActive(r.active); setSelected([]); }}><Trash2 /> Xóa</Button>
          </div>
        )}
        <div className="grid max-h-[50vh] grid-cols-3 gap-2.5 overflow-y-auto">
          {doc.pages.map((p, i) => {
            const isSel = selected.includes(p.id);
            const processing = bgQueue.has(p.id);
            return (
            <div key={p.id} draggable={!selecting}
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { if (!selecting) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
              onDrop={(e) => { if (selecting) return; e.preventDefault(); const from = Number(e.dataTransfer.getData("text/plain")); if (Number.isInteger(from) && from !== i) { const r = movePage(doc.pages, from, i, active); void save({ pages: r.pages }); setActive(r.active); } }}
              onClick={selecting ? () => setSelected((s) => toggleId(s, p.id)) : undefined}
              className={`document-row rounded-[10px] p-1.5 ${selecting ? "cursor-pointer" : "cursor-grab"} ${isSel ? "ring-2 ring-primary" : ""}`}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-[6px] bg-muted">
                <StripThumb doc={doc} i={i} className="h-full w-full object-cover" />
                <span className="absolute left-1 top-1 rounded bg-foreground px-1.5 text-[0.625rem] font-bold text-background">{i + 1}</span>
                {processing && <span className="absolute inset-x-0 bottom-0 bg-foreground/70 px-1 text-center text-[0.5625rem] font-semibold text-background">Đang xử lý…</span>}
                {selecting && <span className={`absolute right-1 top-1 grid size-5 place-items-center rounded-full border text-[0.625rem] font-bold ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 bg-background/70 text-transparent"}`}>✓</span>}
              </div>
              {!selecting && (
              <div className="mt-1 grid grid-cols-5">
                <IconBtn label="Lên" disabled={!i} onClick={() => { const r = movePage(doc.pages, i, i - 1, active); void save({ pages: r.pages }); setActive(r.active); }}><ArrowUp /></IconBtn>
                <IconBtn label="Xuống" disabled={i === doc.pages.length - 1} onClick={() => { const r = movePage(doc.pages, i, i + 1, active); void save({ pages: r.pages }); setActive(r.active); }}><ArrowDown /></IconBtn>
                <IconBtn label="Xoay" onClick={run("Đang xoay…", () => editPage(i, { rotation: (p.edit.rotation + 90) % 360 }))}><RotateCw /></IconBtn>
                <IconBtn label="Nhân bản" onClick={() => { const r = duplicatePage(doc.pages, i, (x) => ({ ...x, id: crypto.randomUUID() })); void save({ pages: r.pages }); setActive(r.active); toast.success(`Đã nhân bản trang ${i + 1}`); }}><Copy /></IconBtn>
                <IconBtn label="Xóa" disabled={doc.pages.length <= 1} onClick={() => { const r = removePage(doc.pages, i, active); void save({ pages: r.pages }); setActive(r.active); }}><Trash2 /></IconBtn>
              </div>)}
            </div>);
          })}
          {/* R4.2: ô “+ Thêm” nét đứt cuối lưới; R4.3: mở bảng Thêm đủ 5 nguồn */}
          <button aria-label="Thêm trang" disabled={!!busy} onClick={() => setPanel("add")}
            className="grid aspect-[3/4] place-items-center rounded-[10px] border-2 border-dashed border-muted-foreground/40 text-muted-foreground disabled:opacity-40">
            <span className="flex flex-col items-center gap-1 text-xs font-semibold"><ImagePlus className="size-6" /> Thêm</span>
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="glass" asChild><Link to="/scan" search={{ doc: doc.id }}><Camera /> Quét thêm</Link></Button>
          <Button variant="glass" disabled={!!busy} onClick={() => setPanel("add")}><ImagePlus /> Nhập thêm</Button>
          <Button variant="glass" className="col-span-2" disabled={!!busy} onClick={() => void pasteImages()}><ClipboardPaste /> Dán ảnh</Button>
        </div>
      </Sheet>

      {/* R4.3: bảng Thêm — 5 nguồn + vị trí chèn */}
      <Sheet open={panel === "add"} onClose={() => setPanel(null)} title="Thêm trang">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Vị trí chèn</p>
        <div className="mb-3 flex gap-2">
          {(["start", "after", "end"] as const).map((pos) => (
            <Button key={pos} size="sm" variant={insertPos === pos ? "default" : "glass"} onClick={() => setInsertPos(pos)}>
              {pos === "after" ? `Sau trang ${active + 1}` : INSERT_POS_LABEL[pos]}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ADD_SOURCES.map((src) => (
            <Button key={src} variant="glass" disabled={!!busy} className={src === "scan" ? "col-span-2" : ""}
              onClick={async () => {
                if (src === "scan") { setPanel(null); void navigate({ to: "/scan", search: { doc: doc.id } }); return; }
                if (src === "paste") { setPanel(null); await pasteImages(); return; }
                const accept = src === "pdf" ? "application/pdf" : src === "camera" ? IMAGE_ACCEPT : FILE_ACCEPT;
                const files = await pickFiles(accept, true, src === "camera" ? "environment" : undefined);
                if (files.length) { setPanel(null); await insertImages(files); }
              }}>
              {src === "library" && <ImagePlus />}
              {src === "camera" && <Camera />}
              {src === "pdf" && <FileDown />}
              {src === "paste" && <ClipboardPaste />}
              {src === "scan" && <Camera />}
              {ADD_SOURCE_LABEL[src as AddSource]}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Mẹo: kéo-thả ảnh/PDF vào cửa sổ, hoặc dùng phím Delete xoá trang, ←/→ chuyển trang, R xoay.</p>
      </Sheet>

      {/* R4.3: lớp phủ khi kéo tệp vào cửa sổ */}
      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-foreground/30 p-8">
          <div className="grid size-full place-items-center rounded-[22px] border-4 border-dashed border-background/80">
            <p className="rounded-full bg-background px-5 py-2.5 font-display font-semibold text-foreground shadow-lg">Thả ảnh hoặc PDF để thêm trang</p>
          </div>
        </div>
      )}

      <Sheet open={!!panel?.startsWith("ai")} onClose={() => setPanel(null)} title="Trợ lý AI">
        {panel?.startsWith("ai") && <SafeBoundary><AiPanel doc={doc} active={active} initial={panel === "ai" ? "extract" : (panel.slice(3) as AiTab)} autoRun={autoRun && panel === "ai"} /></SafeBoundary>}
      </Sheet>
      <Sheet open={panel === "export"} onClose={() => setPanel(null)} title="Xuất & chia sẻ"><ExportPanel doc={doc} page={page} /></Sheet>

      <Sheet open={panel === "menu"} onClose={() => setPanel(null)} title="Tài liệu"><MenuPanel doc={doc} onPages={() => setPanel("pages")} onDraw={() => setPanel("draw")} onRedact={() => setPanel("redact")} onErase={() => setPanel("erase")} onSharpen={() => { setPanel(null); void (async () => { const id = toast.loading("Đang làm nét HD… 0%"); try { const { enhanceDataUrl } = await import("@/lib/sr-enhance"); const r = await enhanceDataUrl(page.src, { onProgress: (p) => toast.loading(`Đang làm nét HD… ${p}%`, { id }) }); await save({ pages: doc.pages.map((x, k) => k === active ? { ...x, orig: r.src, src: r.src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } } : x) }); toast.success(`Đã làm nét HD (${r.width}×${r.height}${r.method === "classic" ? ", cách cổ điển" : ""})`, { id }); } catch (e) { toast.dismiss(id); showError(e, "Làm nét HD"); } })(); }} onMoire={() => { setPanel(null); void (async () => { const id = toast.loading("Đang khử vân màn hình…"); try { const { removeMoireDataUrl } = await import("@/lib/moire"); const r = await removeMoireDataUrl(page.src); await save({ pages: doc.pages.map((x, k) => k === active ? { ...x, orig: r.src, src: r.src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 } } : x) }); toast.success(r.before < 1.5 ? "Ảnh gần như không có vân, đã làm mịn nhẹ" : "Đã khử vân màn hình", { id }); } catch (e) { toast.dismiss(id); showError(e, "Khử vân màn hình"); } })(); }} onDeleted={() => navigate({ to: "/" })} /></Sheet>
    </main>
  );
}

function Tool({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return <button onClick={onClick} className={`flex h-16 flex-col items-center justify-center gap-1 whitespace-nowrap text-[0.65625rem] font-semibold [&_svg]:size-5 ${primary ? "text-primary" : ""}`}>{icon}{label}</button>;
}
function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button aria-label={label} disabled={disabled} onClick={onClick} className="grid h-8 place-items-center text-muted-foreground disabled:opacity-30 [&_svg]:size-4">{children}</button>;
}

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Đóng" className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="sheet rise relative w-full max-w-[430px] rounded-t-[22px] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display font-semibold">{title}</h2><Button variant="ghost" size="icon" aria-label="Đóng" onClick={onClose}><X /></Button></div>
        {children}
      </div>
    </div>
  );
}

function ExportPanel({ doc, page }: { doc: Doc; page: Page }) {
  const [paper, setPaper] = useState(getSettings().paper);
  const [watermark, setWatermark] = useState(""); const [password, setPassword] = useState(""); const [sendTo, setSendTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const layoutFn = useQueuedServerFn(aiLayout, "Đọc bố cục");
  const [size, setSizeRaw] = useState<PdfSize>("balanced"); useEffect(() => { const v = localStorage.getItem("gn.pdfSize") as PdfSize | null; if (v && v in PDF_SIZES) setSizeRaw(v); }, []); const setSize = (v: PdfSize) => { setSizeRaw(v); localStorage.setItem("gn.pdfSize", v); }; const [bw, setBw] = useState(false);
  const [est, setEst] = useState<string>("");
  const [numbers, setNumbers] = useState(false); const [numberStyle, setNumberStyle] = useState<(typeof NUMBER_STYLES)[number]>("Trang n/N");
  const [header, setHeader] = useState(""); const [footer, setFooter] = useState("");
  const opts = { paper, size, bw, watermark: watermark.trim() || undefined, password: password.trim() || undefined, marks: { numbers, numberStyle, header, footer } };
  useEffect(() => {
    let off = false; setEst("");
    void (async () => {
      const first = await compressPage(doc.pages[0].src, size, bw);
      const bytes = doc.pages.reduce((n, p) => n + srcBytes(p.src), 0);
      if (!off) setEst(bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);
    })().catch(() => {});
    return () => { off = true; };
  }, [doc, size, bw]);
  const isId = isIdDoc(doc, docText(doc));
  const [idOn, setIdOn] = useState(isId); const [purpose, setPurpose] = useState("");
  const markText = idOn ? idWatermarkText(purpose, new Date()) : "";
  const marked = async (srcs: string[]) => {
    if (idOn && !markText) throw new Error("Nhập mục đích sử dụng để đóng hình mờ CCCD (hoặc tắt hình mờ).");
    return markText ? Promise.all(srcs.map((s) => stampIdWatermark(s, markText))) : srcs;
  };
  const pdfOut = async () => { const srcs = await marked(doc.pages.map((p) => p.src)); return docToPdf({ ...doc, pages: doc.pages.map((p, i) => ({ ...p, src: srcs[i] })) }, opts); };
  const pageSrc = async () => (await marked([page.src]))[0];
  const name = `${safeName(doc.name)}.pdf`;
  const go = (fn: () => Promise<unknown>) => async () => { setBusy(true); try { await fn(); } catch (e) { showError(e, "Không tạo được tập tin"); } finally { setBusy(false); } };
  return (
    <>
      <div className="flex gap-2">{(["a4", "letter"] as const).map((p) => <Button key={p} size="sm" variant={paper === p ? "default" : "glass"} onClick={() => setPaper(p)}>{p === "a4" ? "A4" : "Letter"}</Button>)}</div>
      <div className="mt-3 flex flex-wrap gap-2">{(Object.keys(PDF_SIZES) as PdfSize[]).map((s) => <Button key={s} size="sm" variant={size === s ? "default" : "glass"} onClick={() => setSize(s)}>{PDF_SIZES[s].label}</Button>)}
        <Button size="sm" variant={bw ? "default" : "glass"} onClick={() => setBw(!bw)}>Đen trắng</Button></div>
      <p className="mt-2 text-xs text-muted-foreground">Dung lượng ước tính: {est || "đang tính…"}{bw ? " · đen trắng hợp với giấy chữ, không hợp ảnh màu" : ""}</p>
      <div className="mt-3 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Hình mờ giấy tờ tùy thân</p>
          <Button size="sm" variant={idOn ? "default" : "glass"} onClick={() => setIdOn(!idOn)}>{idOn ? "Đang bật" : "Bật"}</Button>
        </div>
        {idOn ? (<>
          <p className="mt-1 text-xs text-muted-foreground">Chữ đỏ lặp kín ảnh, không cắt bỏ được — người nhận chỉ dùng được đúng mục đích bạn ghi.</p>
          <div className="mt-2 flex flex-wrap gap-2">{ID_PURPOSES.map((x) => <Button key={x} size="sm" variant={purpose === x ? "default" : "glass"} onClick={() => setPurpose(x)}>{x}</Button>)}</div>
          <Input className="mt-2 h-11" placeholder="Hoặc ghi mục đích, ví dụ: mở tài khoản VCB" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          {markText ? <p className="mt-2 text-xs font-medium text-destructive">{markText}</p> : null}
        </>) : <p className="mt-1 text-xs text-muted-foreground">{isId ? "Nên bật khi gửi ảnh CCCD cho người khác." : "Dùng khi gửi ảnh CCCD, hộ chiếu cho người khác."}</p>}
      </div>
      <Input className="mt-3 h-11" placeholder="Hình mờ (tùy chọn), ví dụ: BẢN SAO" value={watermark} onChange={(e) => setWatermark(e.target.value)} />
      <Input className="mt-2 h-11" type="password" placeholder="Mật khẩu PDF (tùy chọn)" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="mt-3 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Số trang</p>
          <Button size="sm" variant={numbers ? "default" : "glass"} onClick={() => setNumbers(!numbers)}>{numbers ? "Đang bật" : "Bật"}</Button>
        </div>
        {numbers ? <div className="mt-2 flex flex-wrap gap-2">{NUMBER_STYLES.map((s) => <Button key={s} size="sm" variant={numberStyle === s ? "default" : "glass"} onClick={() => setNumberStyle(s)}>{pageNumberText(s, 1, doc.pages.length)}</Button>)}</div> : null}
        <Input className="mt-2 h-11" placeholder="Đầu trang (tùy chọn), ví dụ: {ten}" value={header} onChange={(e) => setHeader(e.target.value)} />
        <Input className="mt-2 h-11" placeholder="Chân trang (tùy chọn), ví dụ: Ngày {ngay}" value={footer} onChange={(e) => setFooter(e.target.value)} />
        <p className="mt-1 text-xs text-muted-foreground">Mã tự điền: {"{ten}"} tên tài liệu, {"{ngay}"} ngày hôm nay, {"{trang}"} / {"{tong}"} số trang.</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button disabled={busy} onClick={go(async () => { await shareOrDownload(await pdfOut(), name); })}>{busy ? <Loader2 className="animate-spin" /> : <Share2 />} Chia sẻ PDF</Button>
        <Button disabled={busy} variant="glass" onClick={go(async () => { download(await pdfOut(), name); toast.success("Đã lưu PDF"); })}><FileDown /> Lưu PDF</Button>
        <Button disabled={busy} variant="glass" onClick={go(async () => { await shareOrDownload(await dataUrlToBlob(await pageSrc()), `${safeName(doc.name)}-trang.jpg`); })}>Ảnh JPG</Button>
        <Button disabled={busy} variant="glass" onClick={go(async () => { await shareOrDownload(await pageToPng(await pageSrc()), `${safeName(doc.name)}-trang.png`); })}>Ảnh PNG rõ nét</Button>
        <Button disabled={busy} variant="glass" onClick={go(async () => { await shareOrDownload(await pagesToLongImage(await marked(doc.pages.map((p) => p.src))), `${safeName(doc.name)}-anh-dai.jpg`); })}>Ảnh dài ghép trang</Button>
        <Button disabled={busy} variant="glass" onClick={go(async () => { download(await pagesToZip(await marked(doc.pages.map((p) => p.src)), safeName(doc.name)), `${safeName(doc.name)}-anh.zip`); toast.success("Đã lưu tệp nén"); })}>Tệp nén mọi trang</Button>
        <Button disabled={busy} variant="glass" onClick={go(async () => { const { buildBundle } = await import("@/lib/export-bundle"); download(await buildBundle(safeName(doc.name), await pdfOut(), await marked(doc.pages.map((p) => p.src)), docText(doc)), `${safeName(doc.name)}-goi-day-du.zip`); toast.success("Đã lưu gói PDF + ảnh + chữ"); })}>Gói đầy đủ (ZIP)</Button>
        <Button disabled={busy} variant="glass" onClick={go(async () => { const r = await imagesToWord(doc.pages.map((p) => p.src), doc.name, layoutFn, docText(doc)); setReview({ kind: "word", title: doc.name, blocks: r.blocks, note: r.note, source: { kind: "Tài liệu → Word", name: `${safeName(doc.name)}.pdf`, lazy: registerSource(() => docToPdf(doc)), details: [`${doc.pages.length} trang ảnh`] } }); })}>{busy ? <Loader2 className="animate-spin" /> : <FileDown />} Word</Button>
      </div>
      <div className="mt-4 rounded-xl border border-border p-3">
        <p className="text-sm font-semibold">Gửi tới</p>
        <p className="mt-1 text-xs text-muted-foreground">Gửi PDF qua email, Zalo hoặc ứng dụng khác trên máy. Trên máy tính, tệp được tải về rồi mở thư để bạn đính kèm.</p>
        <Input className="mt-2 h-11" type="email" placeholder="Email người nhận (tùy chọn)" value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Button disabled={busy} variant="glass" onClick={go(async () => { await sendFile("email", await pdfOut(), name, { title: doc.name, pages: doc.pages.length, to: sendTo }); })}>Email</Button>
          <Button disabled={busy} variant="glass" onClick={go(async () => { await sendFile("zalo", await pdfOut(), name, { title: doc.name, pages: doc.pages.length }); })}>Zalo</Button>
          <Button disabled={busy} variant="glass" onClick={go(async () => { await sendFile("system", await pdfOut(), name, { title: doc.name, pages: doc.pages.length }); })}>Khác…</Button>
        </div>
        <Button className="mt-2 w-full" disabled={busy} variant="glass" onClick={go(async () => {
          if (!driveReady()) { toast.error("Chưa bật kết nối Google Drive cho ứng dụng"); return; }
          const r = await saveToDrive(await pdfOut(), name);
          toast.success("Đã lưu vào Google Drive › Ghi Nhanh", { action: { label: "Mở", onClick: () => window.open(r.link, "_blank", "noopener") } });
        })}>Lưu vào Google Drive</Button>
      </div>
      <ShareLinkPanel doc={doc} />
      <ExportReview review={review} onClose={() => setReview(null)} />
    </>
  );
}

function MenuPanel({ doc, onPages, onDraw, onRedact, onErase, onSharpen, onMoire, onDeleted }: { doc: Doc; onPages: () => void; onDraw: () => void; onRedact: () => void; onErase: () => void; onSharpen: () => void; onMoire: () => void; onDeleted: () => void }) {
  const s = useSettings();
  const [name, setName] = useState(doc.name);
  const [pick, setPick] = useState<"folder" | "tags" | null>(null);
  return (
    <>
      <label className="text-xs font-semibold">Tên tài liệu</label>
      <Input className="mt-1 h-11" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && saveDoc({ ...doc, name: name.trim() })} />
      <label className="mt-3 block text-xs font-semibold">Thư mục</label>
      <button onClick={() => setPick("folder")} className="glass-field mt-1 flex h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm"><Folder className="size-4 text-primary" /><span className="truncate">{doc.folder.replace(/\//g, " › ")}</span></button>
      <label className="mt-3 block text-xs font-semibold">Thẻ</label>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {(doc.tags ?? []).map((t) => <TagChip key={t} name={t} onRemove={() => void saveDoc({ ...doc, tags: doc.tags!.filter((x) => x !== t) })} />)}
        <Button variant="glass" size="sm" className="h-7 text-[0.6875rem]" onClick={() => setPick("tags")}><Tags /> Gắn thẻ</Button>
      </div>
      <FolderPicker open={pick === "folder"} onOpenChange={(o) => setPick(o ? "folder" : null)} value={doc.folder} onPick={(f) => { void saveDoc({ ...doc, folder: f }); setPick(null); toast.success(`Đã chuyển vào "${f}"`); }} />
      <TagPicker open={pick === "tags"} onOpenChange={(o) => setPick(o ? "tags" : null)} value={doc.tags ?? []} onChange={(tags) => void saveDoc({ ...doc, tags })} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="glass" onClick={onPages}><LayoutGrid /> Sắp xếp trang</Button>
        <Button variant="glass" onClick={onDraw}><PenLine /> Tô sáng</Button>
        <Button variant="glass" onClick={onRedact}><EyeOff /> Che thông tin</Button>
        <Button variant="glass" onClick={onErase}><Eraser /> Tẩy vết</Button>
        <Button variant="glass" onClick={onSharpen}><Sparkles /> Làm nét HD</Button>
        <Button variant="glass" onClick={onMoire}><Monitor /> Khử vân màn hình</Button>
        <Button variant="glass" onClick={() => { if (!s.pin) { toast("Đặt mã PIN trong mục Tôi trước"); return; } if (!doc.locked && !getVaultKey()) { void (async () => { const v = await pinDialog("Nhập mã PIN", "Để mã hoá tài liệu này trên máy."); if (!v) return; if ((await hashPin(v)) !== s.pin) { toast.error("Sai mã PIN"); return; } const { unlockVault } = await import("@/lib/db"); await unlockVault(v, getPinSalt()); unlocked.add(doc.id); await saveDoc({ ...doc, locked: true }); toast("Đã khóa và mã hoá tài liệu"); })(); return; } void saveDoc({ ...doc, locked: !doc.locked }); toast(doc.locked ? "Đã mở khóa" : "Đã khóa tài liệu"); }}>{doc.locked ? <Unlock /> : <Lock />} {doc.locked ? "Mở khóa" : "Khóa PIN"}</Button>
        <Button variant="glass" className="text-destructive" onClick={async () => { if (await confirmDialog("Chuyển vào thùng rác?", { message: "Có thể khôi phục lại trong thùng rác.", okText: "Xóa", danger: true })) { await deleteDocs([doc.id]); onDeleted(); } }}><Trash2 /> Xóa</Button>
      </div>
    </>
  );
}

function DrawPad({ page, highlight, onClose, onApply }: { page: Page; highlight: boolean; onClose: () => void; onApply: (overlay: string) => void }) {
  /** R1.3: lớp vẽ đi qua Blob/object URL, không qua base64. */
  async function saveOverlay(c: HTMLCanvasElement) {
    try { onApply(await canvasToTempUrl(c, "image/png")); } catch (e) { toast.error(e instanceof Error ? e.message : "Không lưu được nét vẽ"); }
  }
  const cv = useRef<HTMLCanvasElement>(null); const img = useRef<HTMLImageElement>(null);
  const [color, setColor] = useState(highlight ? "#FFD60A" : "#0A2540"); const [mode, setMode] = useState<"pen" | "hl">(highlight ? "hl" : "pen");
  const last = useRef<[number, number] | null>(null);
  function setup() { const c = cv.current, i = img.current; if (!c || !i) return; c.width = i.naturalWidth; c.height = i.naturalHeight; }
  function pt(e: React.PointerEvent): [number, number] { const c = cv.current!; const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height]; }
  function draw(e: React.PointerEvent) {
    if (!last.current) return; const c = cv.current!; const ctx = c.getContext("2d")!; const p = pt(e);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = color;
    ctx.globalAlpha = mode === "hl" ? 0.35 : 1; ctx.globalCompositeOperation = mode === "hl" ? "darken" : "source-over";
    ctx.lineWidth = (mode === "hl" ? 0.03 : 0.006) * c.width;
    ctx.beginPath(); ctx.moveTo(...last.current); ctx.lineTo(...p); ctx.stroke(); last.current = p;
  }
  const colors = mode === "hl" ? ["#FFD60A", "#7CF5D7", "#FF8FA3"] : ["#0A2540", "#1D4ED8", "#C1121F"];
  return (
    <div className="scan-screen fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" className="scan-icon" onClick={onClose}><X /> Hủy</Button>
        <p className="font-display text-sm font-semibold">{mode === "hl" ? "Tô sáng" : "Ký tên / ghi chú"}</p>
        <Button variant="ghost" className="scan-icon" onClick={() => { const c = cv.current; c?.getContext("2d")?.clearRect(0, 0, c.width, c.height); }}>Xóa</Button>
      </header>
      <div className="grid flex-1 place-items-center p-4">
        <div className="relative">
          <img ref={img} src={page.src} alt="Trang" onLoad={setup} className="block max-h-[64dvh] max-w-full select-none" draggable={false} />
          <canvas ref={cv} className="absolute inset-0 h-full w-full touch-none"
            onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); last.current = pt(e); }} onPointerMove={draw} onPointerUp={() => (last.current = null)} />
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Button size="sm" variant={mode === "pen" ? "default" : "glass"} onClick={() => { setMode("pen"); setColor("#0A2540"); }}>Bút</Button>
        <Button size="sm" variant={mode === "hl" ? "default" : "glass"} onClick={() => { setMode("hl"); setColor("#FFD60A"); }}>Tô sáng</Button>
        <div className="flex flex-1 justify-center gap-2">{colors.map((c) => <button key={c} aria-label={`Màu ${c}`} onClick={() => setColor(c)} style={{ background: c }} className={`size-7 rounded-full border-2 ${color === c ? "border-primary" : "border-card"}`} />)}</div>
        <Button size="sm" onClick={() => cv.current && void saveOverlay(cv.current)}>Lưu</Button>
      </div>
    </div>
  );
}
