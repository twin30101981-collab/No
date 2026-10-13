import { pmapOrdered } from "@/lib/pmap";
import { getImageCapture, disableImageCapture, withTimeout, burstCount, PHOTO_TIMEOUT_MS, FrameRing } from "@/lib/fast-capture";
import { MODES, type Mode } from "@/lib/scan-modes";
import { readCode } from "@/lib/qr";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { onCameraFrames, useViewfinder, type Tip } from "@/lib/viewfinder";
import { Check, ClipboardPaste, Copy, Crop, ExternalLink, Grid3X3, ImagePlus, Layers, Loader2, RotateCcw, Sparkles, Timer, X, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";
import { showError } from "@/lib/errors";
import { confirmDialog } from "@/lib/dialog";
import { logScan } from "@/lib/scan-log";
import { setScanActive } from "@/lib/priority-gate";
import { Button } from "@/components/ui/button";
import { type Doc, type Page, type PageEdit, uid, newDoc, newPage, saveDoc, useDocs, type Quad } from "@/lib/db";
import { detectFrameAsync } from "@/lib/detect-worker";
import { OrderedLanes, renderLanes } from "@/lib/ordered-lanes";
import { cameraTries, CAPTURE_MAX, CAPTURE_Q } from "@/lib/capture";
import { timed, recordPerf } from "@/lib/perf-stats";
import { composeIdCard, detectQuadScored, detectQuadInfo, refineQuadOnSrc, fileToDataUrl, normalize, loadImg, sharpness, glare, tilt, renderPage, releaseRenderCache, splitBook, targetLong } from "@/lib/image";
import { pickFiles } from "@/lib/importer";
import { IMAGE_ACCEPT, imageBlob, readClipboardImages } from "@/lib/image-input";
import { useImagePaste } from "@/lib/use-image-paste";
import { CropEditor } from "@/components/crop-editor";
import type { Paper } from "@/lib/detect";
import { getSettings } from "@/lib/settings";
import { PageDetector, frameSignature as pageSignature } from "@/lib/page-detect";
import { FocusGate } from "@/lib/focus-gate";
import { gradePage, type PageGrade, type PageMetrics } from "@/lib/page-grade";
import { estimateSkew } from "@/lib/image";
import { lightLevel, meanLumaRGBA } from "@/lib/quality";
import { nextDetectSize } from "@/lib/live-detect";
import { captureWarning, type CaptureWarning } from "@/lib/capture-quality";
import { captureCue } from "@/lib/capture-cue";
import { ScanGuide, speakTip, stopSpeaking } from "@/lib/scan-voice";
import { instantPreview } from "@/lib/instant-preview";
import { bgQueue } from "@/lib/bg-queue";
import { finishedStore, pipelineEnabled, startPipeline } from "@/lib/pipeline/runner";
import { PREVIEW_LONG } from "@/lib/render-cache";
import { JournalWriter, newJournal, type Journal, type PageState } from "@/lib/scan-journal";
import { makeThumb } from "@/lib/thumbs";
import { fpOf } from "@/lib/disk-pack";


export const Route = createFileRoute("/scan")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode | undefined; doc?: string | undefined } => ({
    mode: typeof s["mode"] === "string" && s["mode"] in MODES ? (s["mode"] as Mode) : undefined,
    doc: typeof s["doc"] === "string" ? s["doc"] : undefined,
  }),
  head: () => ({ meta: [
    { title: "Quét tài liệu — Ghi Nhanh" },
    { name: "description", content: "Máy quét tự nhận khung giấy, tự chụp, quét thẻ CCCD, sách, bảng trắng và mã QR." },
    { property: "og:title", content: "Quét tài liệu — Ghi Nhanh" },
    { property: "og:description", content: "Máy quét tự nhận khung giấy, tự chụp, quét thẻ CCCD, sách, bảng trắng và mã QR." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Scan,
});


/** Prefer a full-sensor still (ImageCapture.takePhoto) over a video frame — 2–4× more pixels and sharper.
 *  S6: tái dùng ImageCapture, timeout 1,2 s; lỗi/hết giờ → tắt takePhoto cho track này, dùng khung video. */
async function grabFrame(v: HTMLVideoElement, s: MediaStream | null, ring?: FrameRing<ImageBitmap>, maxQuality = false): Promise<HTMLCanvasElement | ImageBitmap> {
  // V13-B03: bấm là có ảnh — lấy tấm nét nhất trong vòng đệm, chỉ takePhoto khi bật "Chất lượng tối đa"
  if (!maxQuality && ring) { const b = ring.takeBest(); if (b) return b; }
  const track = s?.getVideoTracks()[0];
  const ic = maxQuality && track ? getImageCapture(track) : null;
  if (track && ic) {
    try {
      const blob = await withTimeout(ic.takePhoto(), PHOTO_TIMEOUT_MS);
      const bmp = await createImageBitmap(blob);
      if (bmp.width * bmp.height > v.videoWidth * v.videoHeight) return bmp;
      bmp.close(); disableImageCapture(track);
    } catch { disableImageCapture(track); /* fall back to video frame */ }
  }
  const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext("2d")!.drawImage(v, 0, 0); return c;
}

function Scan() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { docs } = useDocs();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>(search.mode ?? "doc");
  const [camError, setCamError] = useState(false);
  const { vf, update: updateVf } = useViewfinder(); // V13-B10: quad/tip/focus gộp một state
  const { quad, tip, focus, focusScore } = vf;
  const [pages, setPages] = useState<Page[]>([]);
  const [idFront, setIdFront] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [grid, setGrid] = useState(true);
  const [auto, setAuto] = useState(true);
  const [qr, setQr] = useState("");
  const [flash, setFlash] = useState(false);
  const busyRef = useRef(false);
  const detectorRef = useRef<PageDetector | null>(null);
  const lastSigRef = useRef<Float32Array | null>(null);
  const lastQuad = useRef<Quad | null>(null);
  const view = useRef<HTMLDivElement>(null);
  // pageId: chỉnh khung một trang ĐÃ có trong dải (người dùng tự mở); không có pageId: duyệt ảnh vừa nhập từ thư viện
  const [review, setReview] = useState<{ orig: string; quad: Quad | null; pageId?: string } | null>(null);
  // Trang chụp mà máy chưa chắc mép giấy — đánh dấu "Kiểm mép" thay vì bật màn cắt giữa chừng
  const [unsure, setUnsure] = useState<Set<string>>(() => new Set());
  const reviewRef = useRef(false);
  useEffect(() => { reviewRef.current = !!review; }, [review]);
  const setTip = useCallback((t: Tip) => updateVf({ tip: t }), [updateVf]);
  const tipRef = useRef(tip); tipRef.current = tip;
  const ringRef = useRef(new FrameRing<ImageBitmap>(3)); // V13-B03
  const sharpRef = useRef<number[]>([]); // recent frame sharpness, used as the "this camera can do" reference
  // B11: cổng độ nét (phương sai Laplacian vùng giấy) — chỉ tự chụp khi đủ nét ổn định
  const focusRef = useRef(new FocusGate({ floor: 6, relative: 0.8, window: 16, stable: 3, warmup: 5 }));
  const focusLevelRef = useRef<string>("blur"); // S6
  const liveWarnRef = useRef<CaptureWarning | null>(null); // P1.4: cảnh báo chất lượng của khung ngắm mới nhất

  useEffect(() => { setAuto(getSettings().autoCapture); }, []);
  // B08: báo cổng ưu tiên — OCR/AI tạm dừng trong lúc màn hình chụp mở
  useEffect(() => { setScanActive(true); return () => setScanActive(false); }, []);
  useEffect(() => () => releaseRenderCache(), []);

  const [camTry, setCamTry] = useState(0);
  const [camSlow, setCamSlow] = useState(false);
  useEffect(() => {
    let cancelled = false; const t0 = performance.now();
    setCamError(false); setCamSlow(false);
    if (!navigator.mediaDevices) { setCamError(true); logScan({ code: "CAM_UNSUPPORTED", message: "Trình duyệt không hỗ trợ camera" }); return; }
    const slow = setTimeout(() => { if (!video.current?.videoWidth) { setCamSlow(true); logScan({ code: "CAM_SLOW", message: "Camera chưa sẵn sàng sau 6 giây" }); } }, 6000);
    // Thử độ phân giải cao trước, máy không hỗ trợ thì hạ dần — tránh treo/trắng màn hình.
    const tries = cameraTries();
    const attach = (s: MediaStream) => {
      if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
      stream.current = s; const tr = s.getVideoTracks()[0];
      void tr?.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
      // Camera bị hệ thống ngắt (xoay máy, chuyển app, cuộc gọi) → tự mở lại.
      if (tr) tr.onended = () => { if (!cancelled) { logScan({ code: "CAM_ENDED", message: "Camera bị ngắt, đang mở lại" }); setCamTry((n) => n + 1); } };
      const v = video.current;
      if (v) { v.srcObject = s; v.onloadedmetadata = () => logScan({ code: "CAM_READY", message: `${v.videoWidth}x${v.videoHeight}`, ms: Math.round(performance.now() - t0) }); void v.play().catch(() => {}); }
    };
    (async () => {
      let last: unknown;
      for (const c of tries) {
        try { attach(await navigator.mediaDevices.getUserMedia({ video: c, audio: false })); return; }
        catch (e) { last = e; const n = (e as { name?: string }).name; if (n === "NotAllowedError" || n === "SecurityError") break; }
      }
      if (cancelled) return;
      setCamError(true); logScan({ code: "CAM_FAILED", message: String((last as Error)?.name ?? last) }); showError(last, "Không mở được camera");
    })();
    // Quay lại app sau khi khoá màn hình/chuyển ứng dụng: phát lại hoặc mở lại camera.
    const onVis = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      const tr = stream.current?.getVideoTracks()[0];
      if (!tr || tr.readyState === "ended") setCamTry((n) => n + 1); else void video.current?.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; clearTimeout(slow); document.removeEventListener("visibilitychange", onVis); stream.current?.getTracks().forEach((t) => { t.onended = null; t.stop(); }); };
  }, [camTry]);

  const process = useCallback(async (orig: string, quadHint?: Quad | null, paper?: Paper): Promise<Page[]> => {
    const pages = await processRaw(orig, quadHint, paper);
    const im = await loadImg(orig).catch(() => null);
    return im ? pages.map((p) => (p.orig === orig ? { ...p, origW: im.naturalWidth, origH: im.naturalHeight } : p)) : pages;
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const processRaw = async (orig: string, quadHint?: Quad | null, paper?: Paper): Promise<Page[]> => {
    const def = getSettings().defaultFilter;
    if (mode === "photo") return [newPage(orig)];
    if (mode === "book") return Promise.all((await splitBook(orig)).map(async (o) => { const edit = { filter: def, rotation: 0, brightness: 0, contrast: 0 } as const; return newPage(o, await renderPage(o, edit, targetLong(getSettings().quality)), edit); }));
    const edit = { quad: quadHint ?? undefined, paper, filter: mode === "whiteboard" ? "auto" as const : def, rotation: 0, brightness: 0, contrast: 0 };
    // V13-B11: đường găng chỉ dựng bản nháp ~1200 px; bản đầy đủ (300 dpi) làm khi máy rảnh rồi thay ảnh trang
    const full = targetLong(getSettings().quality);
    const pg = newPage(orig, await timed("render", () => renderPage(orig, edit, Math.min(PREVIEW_LONG, full))), edit);
    if (full > PREVIEW_LONG) queueFinish(pg, orig, edit, full);
    return [pg];
  };
  // P2: hàng đợi nền bền — việc "finish" ghi xuống IndexedDB, tải lại giữa chừng vẫn chạy tiếp
  const finishedRef = useRef(new Map<string, string>());
  const queueFinish = useCallback((pg: Page, orig: string, edit: PageEdit, full: number) => {
    if (pipelineEnabled()) { startPipeline(); void bgQueue.enqueue(pg.id, "finish", { orig, edit, targetLong: full }); return; } // CS-02: bộ xử lý toàn app (đăng ký ở __root)
    bgQueue.setHandler("finish", async (j) => {
      const src = await timed("finish", () => renderPage(j.payload.orig, j.payload.edit ?? { rotation: 0, filter: "original", brightness: 0, contrast: 0 }, j.payload.targetLong ?? full));
      finishedRef.current.set(j.pageId, src);
      setPages((ps) => ps.map((x) => (x.id === j.pageId ? { ...x, src } : x)));
    });
    void bgQueue.enqueue(pg.id, "finish", { orig, edit, targetLong: full });
  }, []);
  // CS-02: nhận bản đầy đủ do bộ điều phối toàn app dựng cho trang còn trong khay
  useEffect(() => {
    if (!pipelineEnabled()) return;
    return finishedStore.subscribe((id, src) => { finishedRef.current.set(id, src); setPages((ps) => ps.map((x) => (x.id === id ? { ...x, src } : x))); });
  }, []);
  // Cờ tắt (hành vi cũ): rời màn thì huỷ hết việc nền. Cờ bật: việc nền chạy tiếp ở nền; chỉ huỷ trang bị bỏ/xoá rõ ràng.
  useEffect(() => () => { if (!pipelineEnabled()) bgQueue.cancelAll(); }, []);

  // V8: đang bấm liên tục → 1 làn để xem trước ≤1 s; rảnh tay → 2–3 làn
  const queueRef = useRef<Promise<void>>(Promise.resolve()); const lastShotRef = useRef(0); const lanesRef = useRef(new OrderedLanes(() => (performance.now() - lastShotRef.current < 1500 ? 1 : renderLanes()))); const [pending, setPending] = useState(0);
  const pagesRef = useRef(pages); pagesRef.current = pages;
  // S8: nhật ký phiên — tự lưu sau mỗi trang, khôi phục sau khi tải lại
  const journalW = useRef(new JournalWriter());
  const journalRef = useRef<Journal>(newJournal(mode, search.doc));
  const restoredRef = useRef(false);
  useEffect(() => {
    void journalW.current.load().then((j) => {
      restoredRef.current = true;
      if (!j || pagesRef.current.length) return;
      toast(`Còn ${j.pages.length} trang chưa lưu từ lần quét trước`, {
        duration: 15000,
        action: { label: "Khôi phục", onClick: () => {
          journalRef.current = j; setPages((p) => [...j.pages, ...p]);
          // P2: chạy tiếp việc nền còn dở từ lần trước; trang khôi phục chưa có bản đầy đủ thì xếp lại
          const full = targetLong(getSettings().quality);
          void bgQueue.resume().then(() => {
            if (full <= PREVIEW_LONG) return;
            for (const pg of j.pages) if (!bgQueue.has(pg.id, "finish") && pg.orig && pg.edit) queueFinish(pg, pg.orig, pg.edit, full);
          });
        } },
        cancel: { label: "Bỏ", onClick: () => { void journalW.current.clear(); for (const pg of j.pages) { bgQueue.cancelPage(pg.id, "finish"); finishedStore.delete(pg.id); } } },
      });
    });
  }, [queueFinish]); // HM-06: queueFinish ổn định (useCallback []) nên vẫn chạy đúng một lần
  useEffect(() => {
    if (!restoredRef.current) return;
    journalRef.current = { ...journalRef.current, pages, pending };
    void journalW.current.save(journalRef.current);
  }, [pages, pending]);
  // G2-06: chụp liên tục (bỏ màn cắt) + chụp lại một trang cụ thể
  const [continuous, setContinuous] = useState(false);
  const [retake, setRetake] = useState<number | null>(null);
  const retakeRef = useRef(retake); retakeRef.current = retake;
  const putPages = useCallback((next: Page[]) => {
    const at = retakeRef.current;
    if (at === null) { setPages((p) => [...p, ...next]); return; }
    setRetake(null);
    const gone = pagesRef.current[at]; if (gone) { bgQueue.cancelPage(gone.id, "finish"); finishedRef.current.delete(gone.id); finishedStore.delete(gone.id); }
    setPages((p) => (at < p.length ? [...p.slice(0, at), ...next, ...p.slice(at + 1)] : [...p, ...next]));
    toast.success(`Đã thay trang ${at + 1}`);
  }, []);
  const removePage = (i: number) => { const gone = pagesRef.current[i]; if (gone) { bgQueue.cancelPage(gone.id, "finish"); finishedRef.current.delete(gone.id); finishedStore.delete(gone.id); } setPages((p) => p.filter((_, k) => k !== i)); setRetake((r) => (r === i ? null : r !== null && r > i ? r - 1 : r)); };
  // S8b: trạng thái từng ảnh đang xử lý (chờ / đang xử lý / lỗi) — trang xong hiện như thường
  const [jobs, setJobs] = useState<{ id: string; state: PageState; orig?: string | undefined; thumb?: string | undefined }[]>([]);
  const setJob = (id: string, v: { state: PageState; orig?: string | undefined; thumb?: string | undefined } | null) =>
    setJobs((js) => { if (!v) for (const j of js) if (j.id === id && j.thumb) URL.revokeObjectURL(j.thumb);
      return v ? js.map((j) => (j.id === id ? { ...j, ...v } : j)) : js.filter((j) => j.id !== id); });
  /** askReview: "modal" = mở màn cắt ngay (chỉ khi người dùng đang chờ, vd. nhập 1 ảnh); "flag" = thêm trang + đánh dấu "Kiểm mép".
   *  Ảnh chụp xử lý xong ở nền (vài giây sau khi bấm) KHÔNG được bật màn cắt toàn màn hình: nó hiện đúng lúc người dùng
   *  đang bấm nút khác (Đóng/Chụp) nên cú chạm rơi vào "Chụp lại" của màn cắt → mất ảnh, tưởng app treo. */
  const addOrig = useCallback(async (orig: string, quadHint?: Quad | null, askReview: false | "modal" | "flag" = false) => {
    if (mode === "id") {
      if (!idFront) { setIdFront(orig); toast("Đã chụp mặt trước — lật thẻ để chụp mặt sau"); return; }
      const composed = await composeIdCard(idFront, orig); setIdFront(null);
      putPages([newPage(composed)]); toast.success("Đã ghép 2 mặt thẻ trên 1 trang A4"); return;
    }
    const reviewable = !continuous && ["doc", "whiteboard", "passport"].includes(mode);
    if (askReview === "modal" && reviewable) { setReview({ orig, quad: quadHint ?? null }); return; }
    const next = await process(orig, quadHint);
    putPages(next);
    if (askReview === "flag" && reviewable) setUnsure((u) => new Set([...u, ...next.map((pg) => pg.id)]));
    // B14: tạo ảnh thu nhỏ riêng cho dải trang — không giải mã ảnh lớn khi cuộn
    for (const pg of next) {
      if (pg.thumb) continue;
      void makeThumb(pg.src).then((t) => setPages((ps) => ps.map((x) => (x.id === pg.id && !x.thumb ? { ...x, thumb: t, thumbKey: fpOf(x.src) } : x)))).catch(() => {});
    }
  }, [idFront, mode, process, continuous, putPages]);

  const capture = useCallback(async (fromAuto = false) => {
    const v = video.current; if (!v || busyRef.current || !v.videoWidth) return;
    if (!fromAuto && lastSigRef.current) detectorRef.current?.markCaptured(lastSigRef.current);
    const tRel = performance.now(); let shot = false;
    busyRef.current = true; setBusy(true); setFlash(true); setTimeout(() => setFlash(false), 140); captureCue(getSettings());
    // P1.4: cảnh báo chất lượng ngay lúc bấm — reject thì nói rõ ảnh có thể kém
    const lw = liveWarnRef.current;
    if (lw && !fromAuto && mode !== "photo" && mode !== "qr")
      toast.warning(lw.message, lw.level === "reject" ? { description: "Ảnh chụp lúc này có thể kém chất lượng — cân nhắc chụp lại.", duration: 4000 } : { duration: 2500 });
    try {
      // S6: burst 3 ảnh chỉ khi FocusGate chưa "sharp"; đã nét ổn định thì chụp 1 ảnh
      const maxQ = getSettings().maxQuality;
      const burst = burstCount(mode, focusLevelRef.current, !maxQ && ringRef.current.length > 0);
      let c: HTMLCanvasElement | ImageBitmap | null = null; let bestS = -1; const t0 = performance.now();
      for (let k = 0; k < burst; k++) {
        if (k && performance.now() - t0 > 150) break; // S3b: chỉ chụp thêm khi camera nhanh (≤150 ms) để nhả nút sớm
        const f = await timed("grab", () => grabFrame(v, stream.current, ringRef.current, maxQ));
        const s = burst > 1 ? sharpness(f, f.width, f.height, lastQuad.current) : 0;
        if (s > bestS) { if (c && "close" in c) c.close(); c = f; bestS = s; } else if ("close" in f) f.close();
        if (k < burst - 1) await new Promise((r) => setTimeout(r, 40));
      }
      if (!c) return;
      shot = true;
      const frame = c; const max = CAPTURE_MAX;
      const ref = Math.max(0, ...sharpRef.current); // chụp mốc độ nét lúc bấm
      // S3c: dò khung + kiểm mờ/lóa chạy trong hàng đợi nền; nút nhả ngay sau grab
      const pre = async () => {
        const d1 = mode === "id" || mode === "photo" || mode === "book" ? null : await timed("detect1", () => detectQuadScored(frame, frame.width, frame.height, 720));
        const q = mode === "id" || mode === "photo" || mode === "book" ? null : (d1?.quad ?? lastQuad.current);
        const sure1 = !!d1 && d1.score >= 0.7;
        // blur / shake guard: compare the shot against the best recent live frames
        if (mode !== "photo" && mode !== "qr" && ref > 0) {
          const got = sharpness(frame, frame.width, frame.height, q);
          if (got < ref * 0.5 || !focusRef.current.accept(got, 0.5)) {
            if (fromAuto) { setTip("blur"); toast("Ảnh bị mờ — đã bỏ, giữ chắc tay để chụp lại", { duration: 1800 }); return null; }
            toast.warning("Ảnh có vẻ bị mờ hoặc rung", { description: "Giữ chắc tay rồi chụp lại để chữ rõ hơn.", duration: 4000 });
          }
        }
        if (mode !== "photo" && mode !== "qr" && glare(frame, frame.width, frame.height, q) > 0.04)
          toast.warning("Ảnh có vùng bị lóa", { description: "Chữ ở vùng lóa có thể mất — nghiêng nhẹ máy rồi chụp lại.", duration: 4000 });
        return { q, sure1 };
      }; // B2: giữ ảnh gốc, chỉ giới hạn CAPTURE_MAX (2560 px từ V13-B02)
      // S2: mọi chế độ đều nhả nút ngay; chuẩn hoá + tinh chỉnh chạy trong hàng đợi nền theo đúng thứ tự bấm
      setPending((n) => n + 1); lastShotRef.current = performance.now();
      const jid = uid(); setJobs((j) => [...j, { id: jid, state: "queued" }]);
      // V2: hiện trang ngay bằng bản xem trước ≤1200 px từ khung vừa chụp
      const tShow = performance.now();
      const shown = instantPreview(frame, undefined, lastQuad.current).then((u) => { if (!u) return; recordPerf("preview-shown", performance.now() - tShow);
        setJobs((js) => (js.some((j) => j.id === jid) ? js.map((j) => (j.id === jid ? { ...j, thumb: u } : j)) : (URL.revokeObjectURL(u), js))); });
      // V8: chuẩn hoá + dò + dựng chạy song song (2–3 làn); thêm trang vẫn đúng thứ tự bấm
      let o: string | undefined;
      const canPre = continuous && !["id", "book"].includes(mode);
      queueRef.current = lanesRef.current.push(async () => {
        // V8: nhường xem trước tức thì của ảnh vừa chụp trước khi bắt đầu việc nặng (tối đa 600 ms)
        await Promise.race([shown.catch(() => {}), new Promise((r) => setTimeout(r, 600))]);
        setJob(jid, { state: "running" });
        const p0 = await pre(); if (!p0) return null; const { q, sure1 } = p0;
        o = await timed("normalize", () => normalize(frame, max, CAPTURE_Q));
        let quad: Quad | null = q, ask = true;
        if (q && sure1) { quad = await timed("detect2", () => refineQuadOnSrc(o!, q)); ask = false; } // chỉ tinh chỉnh dải cạnh
        else { const info = await timed("detect2", () => detectQuadInfo(o!)); quad = info.quad ?? q; ask = !info.sure; }
        const pages = canPre ? await process(o, quad) : null;
        return { o, quad, ask, pages };
      }, async (r) => {
        try {
          if (!r) { setJob(jid, null); return; }
          if (r.pages) putPages(r.pages); else await addOrig(r.o, r.quad, r.ask ? "flag" : false);
          setJob(jid, null);
        } finally { if ("close" in frame) frame.close(); setPending((n) => n - 1); }
      }, () => { setJob(jid, { state: "error", orig: o }); toast.error("Không xử lý được một tấm ảnh — bấm Thử lại hoặc chụp lại"); if ("close" in frame) frame.close(); setPending((n) => n - 1); });
    } finally { busyRef.current = false; setBusy(false); if (shot) recordPerf("release", performance.now() - tRel); }
  }, [addOrig, mode, continuous, process, putPages, setTip]); // HM-06: setTip ổn định (qua updateVf)

  // G4-01: đọc lời nhắc + rung, chỉ khi lời nhắc ổn định (ScanGuide chống nói dồn)
  const guideRef = useRef(new ScanGuide());
  useEffect(() => {
    const st = getSettings();
    if ((!st.voiceGuide && !st.guideVibrate) || camError || !["doc", "whiteboard", "passport"].includes(mode)) return;
    const g = guideRef.current; g.reset();
    const t = setInterval(() => {
      if (busyRef.current || reviewRef.current) { g.reset(); return; }
      const said = g.push(tipRef.current, Date.now());
      if (said) { const s2 = getSettings(); speakTip(said, { voice: s2.voiceGuide, vibrate: s2.guideVibrate }); }
    }, 200);
    return () => { clearInterval(t); stopSpeaking(); };
  }, [camError, mode]);

  // edge detection preview + auto-capture only when a confident quad is steady and the phone is still
  useEffect(() => {
    if (camError || mode === "qr") return;
    let steady = 0; let smooth: Quad | null = null; let miss = 0;
    let dSize = 320; // P1.3: bản dò 320–480 px, leo khi mất khung, hạ khi đã khoá
    const detector = new PageDetector(); detectorRef.current = detector;
    const sc = document.createElement("canvas"); sc.width = 96; sc.height = 128; const sctx = sc.getContext("2d", { willReadFrequently: true });
    let inflight = false, alive = true;
    const ring = ringRef.current; // HM-06: ringRef không bao giờ bị gán lại; giữ tham chiếu để cleanup dọn đúng vòng đệm này
    const v0 = video.current; if (!v0) return;
    const stopFrames = onCameraFrames(v0 as unknown as Parameters<typeof onCameraFrames>[0], async () => { // V13-B10: theo nhịp camera
      const v = video.current; if (!v?.videoWidth || busyRef.current || reviewRef.current) return;
      if (inflight) return; // V7: bỏ khung khi Worker chưa xong khung trước
      inflight = true;
      // B09: dò khung + đo nét/lóa đều trong Worker — luồng chính chỉ lấy mẫu nhỏ
      let fr: Awaited<ReturnType<typeof detectFrameAsync>> = { det: null, sharp: 0, glare: 0, fromWorker: false };
      try { fr = mode === "photo" ? fr : await detectFrameAsync(v, v.videoWidth, v.videoHeight, dSize); }
      finally { inflight = false; }
      const det = fr.det;
      if (!alive || busyRef.current || reviewRef.current) return;
      const ok = det && det.score > 0.4 ? det : null;
      if (ok) {
        miss = 0;
        const moved = smooth ? Math.max(...ok.quad.map((p, i) => Math.hypot(p[0] - smooth![i][0], p[1] - smooth![i][1]))) : 1;
        smooth = smooth && moved < 0.08 ? (smooth.map((p, i) => [p[0] * 0.5 + ok.quad[i][0] * 0.5, p[1] * 0.5 + ok.quad[i][1] * 0.5]) as Quad) : ok.quad;
        steady = moved < 0.02 && ok.score > 0.55 ? steady + 1 : 0;
      } else if (++miss > 2) { smooth = null; steady = 0; }
      dSize = nextDetectSize(dSize, miss, steady >= 2); // P1.3: leo 320→480 khi mất khung, về 320 khi khoá
      lastQuad.current = smooth;
      let nextTip: Tip = !smooth ? "none" : ok && ok.area < 0.22 ? "closer" : steady > 0 ? "hold" : "found";
      const sh = fr.sharp; // B09: độ nét đã tính trong Worker
      const hist = sharpRef.current; hist.push(sh); if (hist.length > 12) hist.shift();
      if (typeof createImageBitmap === "function") void createImageBitmap(v).then((b) => { if (alive) ringRef.current.push(b, sh); else b.close(); }, () => {}); // V13-B03
      const fg = focusRef.current.push(sh);
      const sharpNow = fg.ok; focusLevelRef.current = fg.ok ? "sharp" : "focusing";
      if (smooth && steady > 0 && !sharpNow) nextTip = "blur";
      const glareNow = smooth ? fr.glare > 0.04 : false; // B09: lóa đã tính trong Worker
      const tiltNow = smooth ? tilt(smooth) > 0.28 : false;
      if (sctx) sctx.drawImage(v, 0, 0, sc.width, sc.height);
      const px = sctx ? sctx.getImageData(0, 0, sc.width, sc.height).data : null;
      const luma = px ? meanLumaRGBA(px) : 255;
      const darkNow = lightLevel(luma) !== "ok"; // P1.2: thiếu sáng
      // P1.4: gộp chỉ số khung ngắm thành một cảnh báo chất lượng ưu tiên (dùng khi bấm chụp)
      liveWarnRef.current = px ? captureWarning({ sharp: sh, glare: fr.glare, luma, tilt: smooth ? tilt(smooth) : 0, area: ok ? ok.area : null }) : null;
      if (glareNow) nextTip = "glare"; else if (darkNow) nextTip = "dark"; else if (tiltNow) nextTip = "tilt";
      updateVf({ quad: smooth, tip: nextTip, focus: fg.level, focusScore: Math.round(sh) }); // một lần cập nhật, bỏ qua nếu không đổi
      if (!sctx || !px) return;
      const sig = pageSignature(px, sc.width, sc.height);
      // G2-07: PageDetector (G2-05) quyết định lúc chụp: đứng yên đủ lâu + khác trang vừa chụp
      const ready = !!(auto && smooth && steady >= 4 && sharpNow && !glareNow && !tiltNow && lightLevel(luma) !== "dark" && ok && ok.area >= 0.22 && ["doc", "whiteboard", "passport"].includes(mode));
      const ev = detector.push(sig, ready);
      lastSigRef.current = sig;
      if (ev === "capture") { steady = 0; focusRef.current.restart(); void capture(true); }
    }, 120);
    return () => { alive = false; stopFrames(); ring.clear(); };
  }, [auto, camError, capture, mode, updateVf]);

  // QR mode
  useEffect(() => {
    if (mode !== "qr") return;
    let running = false;
    const t = setInterval(async () => {
      const v = video.current; if (!v?.videoWidth || running) return;
      running = true;
      try { const r = await readCode(v); if (r) { setQr(r); navigator.vibrate?.(30); } } finally { running = false; }
    }, 400);
    return () => clearInterval(t);
  }, [mode]);

  async function toggleTorch() {
    const track = stream.current?.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
    if (!track || !caps?.torch) { toast("Máy này không hỗ trợ bật đèn từ trình duyệt"); return; }
    await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(!torch);
  }
  async function importImages(files: File[]) {
    if (!files.length || busyRef.current || reviewRef.current) return;
    const one = files.length === 1;
    busyRef.current = true; setBusy(true);
    const noQuad = mode === "photo" || mode === "id" || mode === "book";
    const lim = Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
    try {
      await pmapOrdered(files, lim, async (f) => {
        try {
          const orig = await normalize(await imageBlob(f), CAPTURE_MAX, CAPTURE_Q);
          return { orig, quad: noQuad ? null : (await detectQuadInfo(orig)).quad };
        } catch (error) {
          toast.error(error instanceof Error ? error.message : `Không đọc được ảnh “${f.name}”`);
          return null;
        }
      }, async (result) => { if (result) await addOrig(result.orig, result.quad, one ? "modal" : false); });
    } catch (error) { showError(error, "Không nhập được ảnh"); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function fromGallery() { await importImages(await pickFiles(IMAGE_ACCEPT)); }
  async function fromClipboard() {
    try { await importImages(await readClipboardImages()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không dán được ảnh"); }
  }
  useImagePaste(importImages, !busy && !review && mode !== "qr");
  const beforeRef = useRef<Set<string>>(new Set()); const newDocRef = useRef(true);
  async function saveAll(): Promise<Doc | null> {
    if (pending) { toast("Đang xử lý ảnh vừa chụp…"); await queueRef.current; await new Promise((r) => setTimeout(r, 50)); }
    if (bgQueue.size) await bgQueue.flush(); // B11/P2: lưu luôn bản đầy đủ
    const pages = pagesRef.current.map((p) => { const src = finishedRef.current.get(p.id) ?? finishedStore.get(p.id); return src ? { ...p, src } : p; });
    if (!pages.length) return null;
    // S8: commit nguyên tử theo id phiên — lưu lại lần nữa không tạo tài liệu/trang trùng
    let saved: Doc | null = null;
    await journalW.current.commit({ ...journalRef.current, pages }, async (cid) => {
      const target = search.doc ? docs.find((d) => d.id === search.doc) : docs.find((d) => d.id === cid);
      const have = new Set(target?.pages.map((p) => p.id));
      const doc: Doc = target ? { ...target, pages: [...target.pages, ...pages.filter((p) => !have.has(p.id))] } : { ...newDoc(pages, undefined, MODES[mode]), id: cid };
      beforeRef.current = new Set(target?.pages.map((p) => p.id)); newDocRef.current = !target;
      saved = await saveDoc(doc); return doc.id;
    });
    return saved;
  }
  // Lưu có thể mất hàng chục giây trên máy yếu (dựng bản đầy đủ 300 dpi) — phải hiện rõ "Đang lưu…", chặn bấm lặp.
  const [saving, setSaving] = useState(false); const savingRef = useRef(false);
  async function saveWithProgress(): Promise<Doc | null | undefined> {
    if (savingRef.current) return undefined;
    savingRef.current = true; setSaving(true);
    const n = pagesRef.current.length + pending;
    const tid = n ? toast.loading(`Đang lưu ${n} trang…`, { description: "Đang hoàn thiện ảnh chất lượng đầy đủ, vui lòng chờ." }) : undefined;
    try { return await saveAll(); }
    catch (e) { showError(e, "Chưa lưu được tài liệu"); return undefined; }
    finally { if (tid !== undefined) toast.dismiss(tid); savingRef.current = false; setSaving(false); }
  }
  async function finish() {
    const saved = await saveWithProgress(); if (saved === undefined) return;
    if (!saved) { navigate({ to: "/" }); return; }
    void import("@/lib/post-capture").then((m) => m.runPostCapture(saved, beforeRef.current, newDocRef.current, new Map(saved.pages.flatMap((p) => { const x = metricsCache.get(p.src); return x ? [[p.id, x] as const] : []; })))); // P8 + P8.4
    navigate({ to: "/doc/$id", params: { id: saved.id }, replace: true });
  }
  async function close() {
    const n = pagesRef.current.length + pending;
    if (n && !(await confirmDialog(`Thoát và bỏ ${n} trang chưa lưu?`, { message: "Bấm “Xong” nếu muốn lưu thành tài liệu.", okText: "Bỏ trang", danger: true }))) return;
    for (const pg of pagesRef.current) { bgQueue.cancelPage(pg.id, "finish"); finishedStore.delete(pg.id); } // CS-02: không còn cancelAll khi rời màn → huỷ rõ ràng việc của trang bị bỏ
    navigate({ to: "/" });
  }
  async function finishExtract() {
    const saved = await saveWithProgress(); if (saved === undefined) return;
    if (!saved) { navigate({ to: "/" }); return; }
    navigate({ to: "/doc/$id", params: { id: saved.id }, search: { tool: "ai-extract", run: "1" }, replace: true });
  }

  // map video-normalised points to the on-screen box (video uses object-cover, so edges are cropped)
  const vw = video.current?.videoWidth || 1, vh = video.current?.videoHeight || 1;
  const bw = view.current?.clientWidth || 1, bh = view.current?.clientHeight || 1;
  const cs = Math.max(bw / vw, bh / vh), ox = (bw - vw * cs) / 2, oy = (bh - vh * cs) / 2;
  const cornerPts = quad?.map(([x, y]): [number, number] => [x * vw * cs + ox, y * vh * cs + oy]);
  const pts = cornerPts?.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const hint = mode === "id" ? (idFront ? "Mặt sau của thẻ" : "Mặt trước của thẻ") : mode === "book" ? "Đặt sách mở 2 trang vào khung" : mode === "qr" ? "Hướng camera vào mã QR" : tip === "glare" ? "Bị lóa đèn — nghiêng nhẹ máy hoặc tắt đèn flash" : tip === "dark" ? "Thiếu sáng — bật đèn hoặc ra chỗ sáng hơn" : tip === "tilt" ? "Máy đang nghiêng — đưa máy song song với tờ giấy" : tip === "blur" ? "Hình đang mờ — giữ yên máy, chờ lấy nét" : tip === "closer" ? "Đưa máy lại gần hơn" : tip === "hold" ? (auto ? "Giữ yên máy — đang tự chụp" : "Đã khớp mép giấy") : tip === "found" ? "Giữ thẳng máy trên tờ giấy" : "Đưa cả tờ giấy vào khung, nền tối càng tốt";

  return (
    <main className="scan-screen fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col">
      <header className="flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" size="icon" aria-label="Đóng" className="scan-icon" onClick={() => void close()}><X /></Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Dán ảnh" title="Dán ảnh" disabled={busy || !!review || mode === "qr"} className="scan-icon" onClick={() => void fromClipboard()}><ClipboardPaste /></Button>
          <Button variant="ghost" size="icon" aria-label="Đèn flash" className="scan-icon" onClick={toggleTorch}>{torch ? <Zap /> : <ZapOff />}</Button>
          <Button variant="ghost" size="icon" aria-label="Lưới căn" className={`scan-icon ${grid ? "text-primary" : ""}`} onClick={() => setGrid(!grid)}><Grid3X3 /></Button>
          <Button variant="ghost" size="icon" aria-label="Chụp liên tục" aria-pressed={continuous} className={`scan-icon ${continuous ? "text-primary" : ""}`} onClick={() => { setContinuous(!continuous); toast(!continuous ? "Chụp liên tục: lật trang là tự chụp, không dừng để cắt" : "Đã tắt chụp liên tục"); if (!continuous) setAuto(true); }}><Layers /></Button>
          <Button variant="ghost" size="icon" aria-label="Tự chụp" className={`scan-icon ${auto ? "text-primary" : ""}`} onClick={() => setAuto(!auto)}><Timer /></Button>
        </div>
      </header>

      <div ref={view} className="relative mx-3 flex-1 overflow-hidden rounded-[20px] bg-editor">
        {!camError ? (
          <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div><p className="font-display font-semibold">Không mở được máy ảnh</p><p className="mt-2 text-sm text-muted-foreground">Hãy cho phép quyền máy ảnh, hoặc chọn ảnh có sẵn.</p>
              <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={() => setCamTry((n) => n + 1)}>Thử lại</Button><Button onClick={fromGallery}><ImagePlus /> Chọn ảnh</Button></div></div>
          </div>
        )}
        {camSlow && !camError && <div className="absolute inset-x-3 top-3 z-10 flex items-center gap-2 rounded-[12px] bg-background/90 p-2.5 text-xs"><span className="flex-1">Máy ảnh mở chậm hơn bình thường.</span><Button size="sm" onClick={() => setCamTry((n) => n + 1)}>Mở lại</Button></div>}
        {grid && !camError && <div className="scan-grid pointer-events-none absolute inset-0" />}
        {pts && !camError && (
          <svg viewBox={`0 0 ${bw} ${bh}`} className="pointer-events-none absolute inset-0 h-full w-full">
            <polygon points={pts} className="scan-quad" />
            {/* P1.3: marker 4 góc thời gian thực — sáng mạnh khi đã khoá khung */}
            {cornerPts?.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={7} data-corner={i} className={`scan-corner${tip === "hold" ? " scan-corner-lock" : ""}`} />
            ))}
          </svg>
        )}
        {mode === "id" && !camError && <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-[85.6/54] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border-2 border-dashed border-primary" />}
        {flash && <div className="absolute inset-0 bg-background/80" />}
        {!camError && mode !== "qr" && mode !== "photo" && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-[11px] font-semibold text-foreground" data-score={focusScore} role="meter" aria-label="Độ nét" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(focus * 100)}>
            <span>Độ nét</span>
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"><span className={`block h-full rounded-full transition-all ${focus >= 0.8 ? "bg-primary" : "bg-destructive"}`} style={{ width: `${Math.round(focus * 100)}%` }} /></span>
          </div>
        )}
        <p className="scan-hint absolute inset-x-0 top-3 mx-auto w-max max-w-[90%] rounded-full px-3 py-1.5 text-xs font-semibold">{hint}</p>
        {qr && (
          <div className="document-row absolute inset-x-3 bottom-3 rounded-[14px] p-3">
            <p className="break-all text-sm font-semibold">{qr}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="glass" onClick={() => { void navigator.clipboard.writeText(qr); toast("Đã sao chép"); }}><Copy /> Sao chép</Button>
              {/^https?:\/\//.test(qr) && <Button size="sm" asChild><a href={qr} target="_blank" rel="noreferrer"><ExternalLink /> Mở liên kết</a></Button>}
            </div>
          </div>
        )}
      </div>

      {(pages.length > 0 || jobs.length > 0) && mode !== "qr" && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-3 [scrollbar-width:none]" aria-label="Các trang đã chụp">
          {pages.map((pg, i) => (
            <div key={pg.id} className={`relative size-14 shrink-0 overflow-hidden rounded-[10px] border-2 ${retake === i ? "border-destructive" : "border-primary/40"}`}>
              <button aria-label={`Chụp lại trang ${i + 1}`} className="h-full w-full" onClick={() => { const on = retake !== i; setRetake(on ? i : null); toast(on ? `Chụp lại trang ${i + 1}: lần chụp tới sẽ thay trang này` : "Đã huỷ chụp lại"); }}>
                <img src={pg.thumb || pg.src} alt="" className="h-full w-full object-cover" />
                {retake === i && <span className="absolute inset-0 grid place-items-center bg-background/60"><RotateCcw className="size-5" /></span>}
              </button>
              <GradeBadge src={pg.orig || pg.src} />
              {unsure.has(pg.id) && pg.orig && <button aria-label={`Kiểm mép trang ${i + 1}`} title="Máy chưa chắc mép giấy — chạm để chỉnh khung" onClick={() => setReview({ orig: pg.orig!, quad: pg.edit.quad ?? null, pageId: pg.id })} className="absolute bottom-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-warning text-warning-foreground"><Crop className="size-3" /></button>}
              <span className="absolute bottom-0.5 left-0.5 rounded bg-background/80 px-1 text-[0.625rem] font-bold">{i + 1}</span>
              <button aria-label={`Xoá trang ${i + 1}`} onClick={() => removePage(i)} className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground"><X className="size-3" /></button>
            </div>
          ))}
          {jobs.map((j) => (
            <div key={j.id} data-job-state={j.state} className={`relative grid size-14 shrink-0 place-items-center rounded-[10px] border-2 bg-muted text-center text-[0.625rem] font-semibold ${j.state === "error" ? "border-destructive text-destructive" : "border-dashed border-primary/40 text-muted-foreground"}`}>
              {j.state === "error" ? (
                j.orig ? <button aria-label="Thử lại ảnh lỗi" className="grid h-full w-full place-items-center" onClick={() => { const o = j.orig!; setJob(j.id, { state: "running" }); queueRef.current = queueRef.current.then(() => addOrig(o, null, false)).then(() => setJob(j.id, null), () => setJob(j.id, { state: "error", orig: o })); }}><RotateCcw className="size-4" />Thử lại</button> : <span>Lỗi</span>
              ) : (
                j.thumb ? <><img src={j.thumb} alt="" data-instant-preview className="absolute inset-0 h-full w-full rounded-[8px] object-cover" /><span className="absolute inset-0 grid place-items-center rounded-[8px] bg-background/40"><Loader2 className="size-4 animate-spin" /></span><span data-finishing className="absolute inset-x-0 bottom-0 truncate rounded-b-[8px] bg-background/80 px-0.5 text-center text-[9px] leading-tight">Đang hoàn thiện</span></>
                : <span className="grid place-items-center gap-0.5">{j.state === "running" ? <Loader2 className="size-4 animate-spin" /> : null}{j.state === "running" ? "Đang xử lý" : "Đang chờ"}</span>
              )}
              {j.state === "error" && <button aria-label="Bỏ ảnh lỗi" onClick={() => setJob(j.id, null)} className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground"><X className="size-3" /></button>}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-3 [scrollbar-width:none]">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setIdFront(null); setQr(""); }} className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold ${mode === m ? "bg-primary text-primary-foreground" : "scan-chip"}`}>{MODES[m]}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 items-center px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center">
          {pages.length || pending ? (
            <div className="relative size-14 overflow-hidden rounded-[10px] border-2 border-primary">
              <img src={pages[pages.length - 1]?.src} alt="Trang vừa chụp" className="h-full w-full object-cover" />
              <span className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-primary text-[0.625rem] font-bold text-primary-foreground">{pages.length + pending}</span>
              {pending > 0 && <span className="absolute inset-0 grid place-items-center bg-background/60"><Loader2 className="size-5 animate-spin" /></span>}
            </div>
          ) : (
            <Button variant="ghost" size="icon" aria-label="Chọn từ thư viện" className="scan-icon size-12" onClick={fromGallery}><ImagePlus className="size-6" /></Button>
          )}
        </div>
        <button aria-label="Chụp" disabled={busy || saving || camError || mode === "qr"} onClick={() => void capture()} className="shutter mx-auto grid size-[76px] place-items-center rounded-full disabled:opacity-50">
          <span className="grid size-[60px] place-items-center rounded-full bg-primary text-primary-foreground">{busy && <Loader2 className="animate-spin" />}</span>
        </button>
        <div className="flex flex-col items-end gap-2">
          {pages.length > 0 && mode !== "qr" && (
            <Button variant="glass" onClick={finishExtract} disabled={busy || saving} className="h-9 rounded-full px-3 text-xs"><Sparkles className="size-3.5" /> Trích xuất</Button>
          )}
          <Button onClick={finish} disabled={busy || saving} className="h-11 rounded-full px-4">{saving ? <Loader2 className="animate-spin" /> : <Check />} {saving ? "Đang lưu…" : pages.length ? `Xong` : "Thoát"}</Button>
        </div>
      </div>
      {review && (
    <CropEditor src={review.orig} quad={review.quad ?? undefined} cancelLabel={review.pageId ? "Huỷ" : "Chụp lại"} applyLabel={review.pageId ? "Áp dụng" : "Giữ trang"}
      onClose={() => setReview(null)}
      onApply={async (q, paper) => {
        const r = review; setReview(null); setBusy(true);
        try {
          const next = await process(r.orig, q, paper);
          if (!r.pageId) { putPages(next); return; }
          // chỉnh khung trang có sẵn: thay đúng chỗ, bỏ việc "hoàn thiện" của bản cũ, bỏ dấu "Kiểm mép"
          bgQueue.cancelPage(r.pageId, "finish"); finishedRef.current.delete(r.pageId); finishedStore.delete(r.pageId);
          setPages((ps) => ps.flatMap((x) => (x.id === r.pageId ? next : [x])));
          setUnsure((u) => { const n = new Set(u); n.delete(r.pageId!); return n; });
        } catch (e) { showError(e, "Không cắt được trang"); } finally { setBusy(false); }
      }} />
      )}
    </main>
  );
}

const gradeCache = new Map<string, PageGrade>();
const metricsCache = new Map<string, PageMetrics>(); // P8.4
async function gradeOf(src: string) {
  const hit = gradeCache.get(src); if (hit) return hit;
  const img = await loadImg(src); const W = img.naturalWidth, H = img.naturalHeight;
  const s = Math.min(1, 600 / Math.max(W, H)); const c = document.createElement("canvas");
  c.width = Math.round(W * s); c.height = Math.round(H * s); const g = c.getContext("2d")!; g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data; let sum = 0, sq = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!; sum += l; sq += l * l; }
  const mean = sum / n; let skew = 0; try { skew = estimateSkew(c); } catch { /* */ }
  const m = { blur: sharpness(img, W, H), glare: glare(img, W, H), skew, brightness: mean, contrast: Math.sqrt(Math.max(0, sq / n - mean * mean)) }; const r = gradePage(m); metricsCache.set(src, m);
  c.width = 0; gradeCache.set(src, r); return r;
}
function GradeBadge({ src }: { src: string }) {
  const [g, setG] = useState<PageGrade | null>(() => gradeCache.get(src) ?? null);
  useEffect(() => { let on = true; void gradeOf(src).then((r) => on && setG(r)).catch(() => {}); return () => { on = false; }; }, [src]);
  if (!g) return null;
  return <span className={`grade-badge grade-${g.level}`} data-grade={g.level} data-parts={JSON.stringify(g.parts)} title={g.tip} aria-label={`Điểm trang ${g.score}: ${g.tip}`}>{g.score}</span>;
}
