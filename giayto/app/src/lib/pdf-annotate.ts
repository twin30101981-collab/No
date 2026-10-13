/**
 * G3-28: notes, underlines and rectangles on PDF pages.
 * G3-29: saved as standard PDF annotations (FreeText / Line / Square) tagged with
 * /NM "gn:<id>", so the app (and other PDF readers) can reopen and edit them.
 */
import type { PDFDocument, PDFPage, PDFDict, PDFFont } from "pdf-lib";

export type PdfAnnotation = {
  id: string;
  kind: "note" | "underline" | "rectangle";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
};

export const ANNOT_PREFIX = "gn:";
const RED: [number, number, number] = [0.82, 0.16, 0.12];
const FONT_SIZE = 12;
const LINE_HEIGHT = 15;

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Coordinates are normalized from the top-left, so placement is preview-size independent. */
export function normalizeAnnotation(annotation: PdfAnnotation, pageCount: number): PdfAnnotation {
  const x = clamp(annotation.x), y = clamp(annotation.y);
  const normalized: PdfAnnotation = {
    ...annotation,
    page: Math.max(0, Math.min(Math.max(0, pageCount - 1), Math.floor(annotation.page || 0))),
    x,
    y,
    width: Math.min(1 - x, Math.max(0.01, clamp(annotation.width))),
    height: Math.min(1 - y, Math.max(0.01, clamp(annotation.height))),
  };
  if (annotation.text !== undefined) normalized.text = annotation.text.slice(0, 500);
  return normalized;
}

/** Normalized box (top-left origin) → PDF rect [x1, y1, x2, y2] (bottom-left origin). */
export function toPdfRect(item: Pick<PdfAnnotation, "x" | "y" | "width" | "height">, pageWidth: number, pageHeight: number) {
  const x1 = item.x * pageWidth, y2 = pageHeight - item.y * pageHeight;
  return [x1, y2 - item.height * pageHeight, x1 + item.width * pageWidth, y2] as const;
}

/** PDF rect → normalized box; inverse of toPdfRect. */
export function fromPdfRect(rect: readonly number[], pageWidth: number, pageHeight: number) {
  const [a, b, c, d] = rect;
  const x1 = Math.min(a, c), x2 = Math.max(a, c), y1 = Math.min(b, d), y2 = Math.max(b, d);
  return { x: clamp(x1 / pageWidth), y: clamp(1 - y2 / pageHeight), width: clamp((x2 - x1) / pageWidth), height: clamp((y2 - y1) / pageHeight) };
}

type Src = Blob | ArrayBuffer | Uint8Array;
type Lib = typeof import("pdf-lib");
const blobBytes = (blob: Blob) => typeof blob.arrayBuffer === "function" ? blob.arrayBuffer() : new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(blob);
});
export const toBytes = async (file: Src) => (file instanceof Blob ? await blobBytes(file) : file);

function decodeText(lib: Lib, value: unknown) {
  if (value instanceof lib.PDFString || value instanceof lib.PDFHexString) return value.decodeText();
  return undefined;
}

function annotsOf(lib: Lib, page: PDFPage) {
  const raw = page.node.lookup(lib.PDFName.of("Annots"));
  return raw instanceof lib.PDFArray ? raw : undefined;
}

function wrapLines(text: string, font: PDFFont | undefined, maxWidth: number) {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font && line && font.widthOfTextAtSize(next, FONT_SIZE) > maxWidth) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

function appearance(doc: PDFDocument, lib: Lib, item: PdfAnnotation, w: number, h: number, font?: PDFFont, lines: string[] = []) {
  const ops = [lib.pushGraphicsState(), lib.setStrokingRgbColor(...RED), lib.setFillingRgbColor(...RED), lib.setLineWidth(2)];
  if (item.kind === "underline") ops.push(lib.moveTo(0, 1), lib.lineTo(w, 1), lib.stroke());
  else if (item.kind === "rectangle") ops.push(lib.rectangle(1, 1, Math.max(0, w - 2), Math.max(0, h - 2)), lib.stroke());
  else if (font) {
    ops.push(lib.beginText(), lib.setFontAndSize(lib.PDFName.of("F1"), FONT_SIZE));
    lines.forEach((line, i) => {
      ops.push(lib.setTextMatrix(1, 0, 0, 1, 2, h - 2 - FONT_SIZE - i * LINE_HEIGHT + 2), lib.showText(font.encodeText(line)));
    });
    ops.push(lib.endText());
  }
  ops.push(lib.popGraphicsState());
  const dict: Record<string, unknown> = { BBox: [0, 0, w, h] };
  if (font) dict['Resources'] = { Font: { F1: font.ref } };
  return doc.context.register(doc.context.formXObject(ops, dict as never));
}

/** Read app annotations (and plain FreeText/Line/Square from other readers) back for editing. */
export async function readPdfAnnotations(file: Src): Promise<PdfAnnotation[]> {
  const lib = await import("pdf-lib");
  const doc = await lib.PDFDocument.load(await toBytes(file), { ignoreEncryption: true });
  const out: PdfAnnotation[] = [];
  doc.getPages().forEach((page, pageIndex) => {
    const annots = annotsOf(lib, page);
    if (!annots) return;
    const { width, height } = page.getSize();
    for (let i = 0; i < annots.size(); i++) {
      const dict = annots.lookup(i);
      if (!(dict instanceof lib.PDFDict)) continue;
      const subtype = dict.lookup(lib.PDFName.of("Subtype"));
      const kind = subtype === lib.PDFName.of("FreeText") ? "note" : subtype === lib.PDFName.of("Line") ? "underline" : subtype === lib.PDFName.of("Square") ? "rectangle" : null;
      const rect = dict.lookup(lib.PDFName.of("Rect"));
      if (!kind || !(rect instanceof lib.PDFArray)) continue;
      const nums = rect.asArray().map((n) => (n instanceof lib.PDFNumber ? n.asNumber() : 0));
      const nm = decodeText(lib, dict.lookup(lib.PDFName.of("NM")));
      const box = fromPdfRect(nums, width, height);
      const item: PdfAnnotation = { id: nm?.startsWith(ANNOT_PREFIX) ? nm.slice(ANNOT_PREFIX.length) : crypto.randomUUID(), kind, page: pageIndex, ...box };
      if (kind === "note") item.text = decodeText(lib, dict.lookup(lib.PDFName.of("Contents"))) ?? "";
      out.push(item);
    }
  });
  return out;
}

/** Remove annotations this app is about to rewrite (gn: tagged, plus those read back as editable). */
function stripEditable(lib: Lib, page: PDFPage) {
  const annots = annotsOf(lib, page);
  if (!annots) return;
  const editable = new Set(["FreeText", "Line", "Square"].map((n) => lib.PDFName.of(n)));
  for (let i = annots.size() - 1; i >= 0; i--) {
    const dict = annots.lookup(i);
    if (dict instanceof lib.PDFDict && editable.has(dict.lookup(lib.PDFName.of("Subtype")) as never)) annots.remove(i);
  }
}

/**
 * Save annotations. Default: standard, editable PDF annotations replacing any previously
 * editable ones. `flatten: true` keeps the G3-28 behaviour (drawn into page content).
 */
export async function addPdfAnnotations(file: Src, annotations: PdfAnnotation[], options: { flatten?: boolean } = {}) {
  const lib = await import("pdf-lib");
  const doc = await lib.PDFDocument.load(await toBytes(file), { ignoreEncryption: true });
  const pages = doc.getPages();
  const normalized = annotations.map((item) => normalizeAnnotation(item, pages.length));
  let font: PDFFont | undefined;
  if (normalized.some((item) => item.kind === "note" && item.text?.trim())) {
    const fontkit = (await import("@pdf-lib/fontkit")).default;
    doc.registerFontkit(fontkit);
    const response = await fetch(new URL("/fonts/DejaVuSans.ttf", globalThis.location?.href ?? "http://localhost/"));
    if (!response.ok) throw new Error("Không tải được phông chữ tiếng Việt.");
    font = await doc.embedFont(await response.arrayBuffer(), { subset: false });
  }
  if (!options.flatten) pages.forEach((page) => stripEditable(lib, page));
  const now = lib.PDFString.fromDate(new Date());

  for (const item of normalized) {
    const page = pages[item.page];
    if (!page) continue;
    const { width, height } = page.getSize();
    const [x1, y1, x2, y2] = toPdfRect(item, width, height);
    const text = item.text?.trim() ?? "";
    if (item.kind === "note" && (!text || !font)) continue;
    const lines = item.kind === "note" ? wrapLines(text, font, Math.max(20, width - x1 - 4)) : [];
    const w = item.kind === "note" ? Math.min(width - x1, Math.max(x2 - x1, ...lines.map((l) => font!.widthOfTextAtSize(l, FONT_SIZE) + 4))) : x2 - x1;
    const h = item.kind === "note" ? Math.min(y2, Math.max(y2 - y1, lines.length * LINE_HEIGHT + 4)) : item.kind === "underline" ? Math.max(2, y2 - y1) : y2 - y1;

    if (options.flatten) {
      if (item.kind === "underline") page.drawLine({ start: { x: x1, y: y2 - h }, end: { x: x1 + w, y: y2 - h }, thickness: 2, color: lib.rgb(...RED) });
      else if (item.kind === "rectangle") page.drawRectangle({ x: x1, y: y2 - h, width: w, height: h, borderWidth: 2, borderColor: lib.rgb(...RED) });
      else if (font) page.drawText(text, { x: x1, y: Math.max(0, y2 - 13), size: FONT_SIZE, font, color: lib.rgb(...RED), maxWidth: Math.max(1, width - x1), lineHeight: LINE_HEIGHT });
      continue;
    }

    const rect = [x1, y2 - h, x1 + w, y2];
    const base: Record<string, unknown> = {
      Type: "Annot",
      Rect: rect,
      NM: lib.PDFString.of(ANNOT_PREFIX + item.id),
      M: now,
      F: 4,
      C: RED,
      T: lib.PDFHexString.fromText("Ghi Nhanh"),
      AP: { N: appearance(doc, lib, item, w, h, font, lines) },
    };
    if (item.kind === "underline") Object.assign(base, { Subtype: "Line", L: [x1, y2 - h + 1, x1 + w, y2 - h + 1], BS: { W: 2 } });
    else if (item.kind === "rectangle") Object.assign(base, { Subtype: "Square", BS: { W: 2 } });
    else Object.assign(base, { Subtype: "FreeText", Contents: lib.PDFHexString.fromText(text), DA: lib.PDFString.of(`/Helv ${FONT_SIZE} Tf ${RED.join(" ")} rg`) });
    const ref = doc.context.register(doc.context.obj(base as never) as unknown as PDFDict);
    let annots = annotsOf(lib, page);
    if (!annots) { annots = doc.context.obj([]); page.node.set(lib.PDFName.of("Annots"), annots); }
    annots.push(ref);
  }
  return new Blob([(await doc.save()) as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}
