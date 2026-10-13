import type { Doc } from "./db";
import { loadImg } from "./image";
import { canvasToBlob, canvasToPageUrl } from "./canvas-url";
import { fillMarkText, hasMarks, markMargins, pageNumberText, type PageMarks } from "./pdf-marks";

export type ExportOptions = { paper?: "a4" | "letter" | undefined; watermark?: string | undefined; password?: string | undefined; searchable?: boolean | undefined; size?: PdfSize | undefined; bw?: boolean | undefined; marks?: PageMarks | undefined; name?: string | undefined; lanes?: number | undefined; signal?: AbortSignal | undefined };

/** B15: nhường luồng giao diện giữa các trang PDF để màn hình không treo (scheduler.yield, dự phòng setTimeout 0). */
export function yieldUi(): Promise<void> {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return s?.yield ? s.yield() : new Promise((r) => setTimeout(r, 0));
}

/** B15: ném lỗi hủy khi người dùng bấm Hủy giữa chừng. */
export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Đã hủy xuất PDF", "AbortError");
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function dataUrlToBlob(src: string) { return (await fetch(src)).blob(); }
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").trim() || "ghi-nhanh";

/** Chia sẻ qua bảng chia sẻ của máy (Zalo, Messenger, thư…); không được thì lưu về máy và BÁO RÕ (TF-01). */
export async function shareOrDownload(blob: Blob, name: string): Promise<"shared" | "cancelled" | "downloaded" | "needs-tap"> {
  const { shareOrSave } = await import("./share");
  return shareOrSave(blob, name, download);
}

// R5.1: PDF đúng 3 mức Nhỏ / Chuẩn / Cao (mặc định Chuẩn).
export type PdfSize = "high" | "balanced" | "small";
export const PDF_SIZES: Record<PdfSize, { label: string; maxSide: number; q: number }> = {
  small: { label: "Nhỏ", maxSide: 1754, q: 0.75 },
  balanced: { label: "Chuẩn", maxSide: 2339, q: 0.88 },
  high: { label: "Cao", maxSide: 3508, q: 0.9 },
};

/** B1: chỉ nén lại khi cần thu nhỏ hoặc đổi định dạng – ảnh JPEG đã đúng cỡ đi thẳng vào PDF (tránh nén chồng). */
export function needsReencode(w: number, h: number, size: PdfSize, bw: boolean, isJpeg: boolean) {
  if (bw || !isJpeg) return true;
  return Math.max(w, h) > PDF_SIZES[size].maxSide;
}

/** Downscale + re-encode a page; bw = adaptive black & white (great for text, tiny files). */
export async function compressPage(src: string, size: PdfSize, bw = false) {
  const { maxSide, q } = PDF_SIZES[size];
  // S7e: ưu tiên Worker (OffscreenCanvas); lỗi/không hỗ trợ → chạy trên luồng chính như cũ.
  const { compressInWorker } = await import("./compress-pool");
  const wp = compressInWorker(src, maxSide, q, bw, src.startsWith("data:image/jpeg"));
  if (wp) { try { return await wp; } catch { /* rơi về luồng chính */ } }
  const img = await loadImg(src);
  const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * s), H = Math.round(img.naturalHeight * s);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d")!; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), p = d.data;
  const lum = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (p[i * 4] * 299 + p[i * 4 + 1] * 587 + p[i * 4 + 2] * 114) / 1000;
  // B8: cắt theo nội dung + lề đều (bỏ dải nền xám còn sót ở mép). Chỉ cắt khi hộp còn ≥ 25 % diện tích.
  const { contentBox, encodePng1bit, bytesToDataUrl } = await import("./content-crop");
  let box = contentBox(lum, W, H);
  if (box.w * box.h < W * H * 0.25) box = { x: 0, y: 0, w: W, h: H };
  // B1: JPEG đúng cỡ, không cần cắt → đi thẳng vào PDF (tránh nén chồng).
  if (box.w === W && box.h === H && !needsReencode(img.naturalWidth, img.naturalHeight, size, bw, src.startsWith("data:image/jpeg"))) { c.width = 0; return { src, w: W, h: H, fmt: "JPEG" }; }
  if (bw) {
    const g = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let row = 0; for (let xx = 0; xx < W; xx++) { row += lum[y * W + xx]; g[(y + 1) * (W + 1) + xx + 1] = g[y * (W + 1) + xx + 1] + row; } }
    const r = Math.max(8, Math.round(Math.min(W, H) / 40));
    const bin = new Uint8Array(box.w * box.h);
    for (let y = box.y; y < box.y + box.h; y++) for (let xx = box.x; xx < box.x + box.w; xx++) {
      const x0 = Math.max(0, xx - r), x1 = Math.min(W, xx + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      const mean = (g[y1 * (W + 1) + x1] - g[y0 * (W + 1) + x1] - g[y1 * (W + 1) + x0] + g[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      bin[(y - box.y) * box.w + xx - box.x] = lum[y * W + xx] < mean * 0.88 ? 0 : 255;
    }
    c.width = 0;
    // B8: PNG 1-bit (thay PNG RGBA 8-bit) → PDF Đen trắng nhẹ hơn nhiều.
    return { src: bytesToDataUrl(encodePng1bit(bin, box.w, box.h)), w: box.w, h: box.h, fmt: "PNG" };
  }
  let out: string;
  if (box.w !== W || box.h !== H) {
    const cc = document.createElement("canvas"); cc.width = box.w; cc.height = box.h;
    cc.getContext("2d")!.drawImage(c, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    out = cc.toDataURL("image/jpeg", q); cc.width = 0;
  } else out = c.toDataURL("image/jpeg", q);
  c.width = 0; return { src: out, w: box.w, h: box.h, fmt: "JPEG" };
}

export async function imagesToPdf(srcs: string[], opts: ExportOptions = {}) {
  const { jsPDF } = await import("jspdf");
  const format = opts.paper ?? "a4";
  const pdf = new jsPDF({ unit: "mm", format, compress: true, ...(opts.password ? { encryption: { userPassword: opts.password, ownerPassword: opts.password + "#owner", userPermissions: ["print", "copy"] } } : {}) });
  const PW = pdf.internal.pageSize.getWidth(), PH = pdf.internal.pageSize.getHeight(), m = 6;
  const marks = opts.marks ?? {}, mm = markMargins(marks), date = new Date();
  if (hasMarks(marks) && !pdf.getFontList()["DejaVu"]) { pdf.addFileToVFS("DejaVuSans.ttf", await loadFont()); pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal", undefined, "Identity-H"); }
  // S7c: dựng ảnh trang song song (tối đa pdfLanes() trang), ghép vào PDF đúng thứ tự.
  const { orderedPool, pdfLanes } = await import("./ordered-pool");
  let i = -1;
  for await (const page of orderedPool(srcs, opts.lanes ?? pdfLanes(), (s) => compressPage(s, opts.size ?? "balanced", !!opts.bw))) {
    throwIfAborted(opts.signal);
    i++;
    if (i) pdf.addPage(format);
    const aw = PW - m * 2, ah = PH - m * 2 - mm.top - mm.bottom;
    const r = Math.min(aw / page.w, ah / page.h);
    const w = page.w * r, h = page.h * r, x = (PW - w) / 2, y = m + mm.top + (ah - h) / 2;
    pdf.addImage(page.src, page.fmt, x, y, w, h, undefined, "FAST");
    if (opts.searchable) await addTextLayer(pdf, srcs[i], x, y, r);
    if (opts.watermark) {
      pdf.saveGraphicsState();
      pdf.setGState(new (pdf as unknown as { GState: new (o: object) => unknown }).GState({ opacity: 0.18 }) as never);
      pdf.setTextColor(0, 140, 120); pdf.setFontSize(46);
      pdf.text(opts.watermark, PW / 2, PH / 2, { align: "center", angle: 35 });
      pdf.restoreGraphicsState();
    }
    if (hasMarks(marks)) {
      pdf.setFont("DejaVu", "normal"); pdf.setFontSize(9); pdf.setTextColor(90, 90, 90);
      const name = opts.name ?? "";
      if (marks.header?.trim()) pdf.text(fillMarkText(marks.header, i + 1, srcs.length, name, date), PW / 2, m + 4, { align: "center", maxWidth: PW - m * 2 });
      const foot = marks.footer?.trim() ? fillMarkText(marks.footer, i + 1, srcs.length, name, date) : "";
      const num = marks.numbers ? pageNumberText(marks.numberStyle, i + 1, srcs.length) : "";
      if (foot) pdf.text(foot, num ? m + 2 : PW / 2, PH - m - 1, { align: num ? "left" : "center", maxWidth: PW - m * 2 - (num ? 30 : 0) });
      if (num) pdf.text(num, foot ? PW - m - 2 : PW / 2, PH - m - 1, { align: foot ? "right" : "center" });
      pdf.setTextColor(0, 0, 0);
    }
    // B15: nhường luồng sau mỗi trang — dựng PDF 20 trang không khựng giao diện.
    await yieldUi();
  }
  throwIfAborted(opts.signal);
  return pdf.output("blob");
}

export async function docToPdf(doc: Doc, opts: ExportOptions = {}) { return imagesToPdf(doc.pages.map((p) => p.src), { searchable: true, name: doc.name, ...opts }); }

/* ---- Searchable PDF: invisible OCR text over the page image (Vietnamese font embedded) ---- */
type JsPdf = InstanceType<typeof import("jspdf").jsPDF>;
let fontB64: Promise<string> | null = null;
function loadFont() {
  fontB64 ??= fetch("/fonts/DejaVuSans.ttf").then((r) => r.arrayBuffer()).then((b) => {
    const u = new Uint8Array(b); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s);
  });
  return fontB64;
}
/** R5.2: một dòng chữ OCR đã đặt vị trí trên trang PDF (mm). Thuần, kiểm thử được. */
export type TextOp = { text: string; x: number; y: number; size: number; charSpace: number };
export type OcrLine = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };

/** Đặt các dòng OCR lên khung ảnh trong PDF: co theo tỉ lệ r (mm/px), chữ vô hình phủ đúng vị trí ảnh. */
export function textLayerOps(lines: OcrLine[], x0: number, y0: number, r: number): TextOp[] {
  const ops: TextOp[] = [];
  for (const ln of lines) {
    const t = ln.text.trim();
    if (!t) continue;
    const { x0: lx, y0: ly, x1: lx1, y1: ly1 } = ln.bbox;
    const hMm = (ly1 - ly) * r;
    const size = Math.max(2, (hMm / 0.3528) * 0.85);
    // R5.2: KHÔNG giãn ký tự — mọi charSpace > 0 đều khiến trình đọc (pdfjs, Acrobat)
    // tách từng ký tự thành từ riêng, đánh mất khả năng tìm kiếm tiếng Việt (đã kiểm chứng).
    ops.push({ text: t, x: x0 + lx * r, y: y0 + ly1 * r - hMm * 0.2, size, charSpace: 0 });
  }
  return ops;
}

/** Ghi các dòng chữ vô hình vào PDF (phông DejaVu nhúng sẵn → tìm/sao chép được tiếng Việt ở mọi trình đọc). */
export async function writeTextLayer(pdf: JsPdf, ops: TextOp[]) {
  if (!ops.length) return;
  if (!pdf.getFontList()["DejaVu"]) { pdf.addFileToVFS("DejaVuSans.ttf", await loadFont()); pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal", undefined, "Identity-H"); }
  pdf.setFont("DejaVu", "normal");
  for (const op of ops) {
    pdf.setFontSize(op.size);
    pdf.text(op.text, op.x, op.y, { renderingMode: "invisible", charSpace: op.charSpace } as never);
  }
}

async function addTextLayer(pdf: JsPdf, src: string, x0: number, y0: number, r: number) {
  try {
    const { sharedOcr, currentLang } = await import("./ocr-worker");
    const res = await sharedOcr().run(await currentLang(), src, { out: { blocks: true } });
    const lines = (res.data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines));
    if (!lines.length) return;
    await writeTextLayer(pdf, textLayerOps(lines, x0, y0, r));
  } catch (e) { console.warn("text layer skipped", e); }
}

export async function pdfjs() {
  const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  lib.GlobalWorkerOptions.workerSrc = worker.default;
  return lib;
}
export async function pdfToImages(file: Blob, scale = 2, q = 0.88, withAnnotations = true) {
  const lib = await pdfjs();
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i); const vp = page.getViewport({ scale });
    const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
    await page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp, ...(withAnnotations ? {} : { annotationMode: 0 }) }).promise;
    out.push(await canvasToPageUrl(c, "image/jpeg", q)); // R1.4: object URL, canvas giải phóng ngay
  }
  return out;
}

export async function mergePdfs(files: Blob[]) {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
    (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
  }
  return new Blob([await out.save() as BlobPart], { type: "application/pdf" });
}
export async function splitPdf(file: Blob) {
  const { PDFDocument } = await import("pdf-lib");
  const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const parts: Blob[] = [];
  for (const i of src.getPageIndices()) {
    const d = await PDFDocument.create(); const [p] = await d.copyPages(src, [i]); d.addPage(p);
    parts.push(new Blob([await d.save() as BlobPart], { type: "application/pdf" }));
  }
  return parts;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Word opens HTML saved as .doc, keeping Vietnamese text intact. */
export function textToWord(text: string, title: string) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:Arial;font-size:12pt">${text.split(/\n/).map((l) => `<p>${esc(l) || "&nbsp;"}</p>`).join("")}</body></html>`;
  return new Blob(["\ufeff" + html], { type: "application/msword" });
}
/** Turn OCR lines into spreadsheet rows (columns split on wide gaps). */
export function textToCsv(text: string) {
  const rows = text.split(/\n/).filter((l) => l.trim()).map((l) => l.trim().split(/\s{2,}|\t|\s\|\s/).map((c) => `"${c.replace(/"/g, '""')}"`).join(","));
  return new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv" });
}

/* ---- Direct PDF edits (pdf-lib): keep original text/vector quality, no re-rendering ---- */
const pdfBlob = (b: Uint8Array) => new Blob([b as BlobPart], { type: "application/pdf" });
async function loadPdf(file: Blob) {
  const { PDFDocument, degrees } = await import("pdf-lib");
  return { doc: await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true }), PDFDocument, degrees };
}
export async function pdfPageCount(file: Blob) { return (await loadPdf(file)).doc.getPageCount(); }

/** Rotate pages (1-based list, empty = all) by a multiple of 90°. */
export async function rotatePdf(file: Blob, angle: number, pages: number[] = []) {
  const { doc, degrees } = await loadPdf(file);
  doc.getPages().forEach((p, i) => { if (!pages.length || pages.includes(i + 1)) p.setRotation(degrees((p.getRotation().angle + angle) % 360)); });
  return pdfBlob(await doc.save());
}

/** Build a new PDF with the given 1-based page order (omitted pages are removed). */
export async function reorderPdf(file: Blob, order: number[]) {
  const { doc, PDFDocument } = await loadPdf(file);
  const out = await PDFDocument.create();
  for (const p of await out.copyPages(doc, order.map((n) => n - 1))) out.addPage(p);
  return pdfBlob(await out.save());
}

/** Stamp a text watermark (rendered to PNG so Vietnamese accents work) on every page. */
export async function watermarkPdf(file: Blob, text: string) {
  const { doc } = await loadPdf(file);
  const c = document.createElement("canvas"); const ctx = c.getContext("2d")!;
  ctx.font = "bold 96px sans-serif"; c.width = Math.ceil(ctx.measureText(text).width) + 40; c.height = 130;
  ctx.font = "bold 96px sans-serif"; ctx.fillStyle = "rgba(0,140,120,0.22)"; ctx.textBaseline = "middle"; ctx.fillText(text, 20, 65);
  const png = await doc.embedPng(await (await canvasToBlob(c, "image/png")).arrayBuffer());
  const { degrees } = await import("pdf-lib");
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize(); const w = width * 0.8, h = (w * c.height) / c.width;
    const a = Math.atan2(height, width);
    p.drawImage(png, { x: width / 2 - (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), y: height / 2 - (w / 2) * Math.sin(a) - (h / 2) * Math.cos(a), width: w, height: h, rotate: degrees((a * 180) / Math.PI) });
  }
  return pdfBlob(await doc.save());
}

/** Parse "1-3, 5, 7" into page numbers within 1..max (keeps order and repeats). */
export function parsePages(s: string, max: number) {
  const out: number[] = [];
  for (const part of s.split(/[,;\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/); if (!m) continue;
    const a = +m[1], b = m[2] ? +m[2] : a, step = a <= b ? 1 : -1;
    for (let i = a; step > 0 ? i <= b : i >= b; i += step) if (i >= 1 && i <= max) out.push(i);
  }
  return out;
}
