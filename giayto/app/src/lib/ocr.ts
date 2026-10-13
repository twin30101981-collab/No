import { getSettings } from "./settings";
import { sharedOcr } from "./ocr-worker";

export async function recognize(src: string) {
  const result = await sharedOcr().run(getSettings().ocrLang, src);
  return String(result.data.text).trim();
}

export type OcrWord = { str: string; x: number; y: number; w: number; h: number };

/** V9: chọn hướng xoay từ các lượt dò nhanh — chỉ nhận hướng mới khi hơn hướng gốc ≥ 10 điểm tin cậy. */
export function pickOrientation(base: number, probes: { deg: number; confidence: number }[]) {
  let best = { deg: 0, confidence: base };
  for (const p of probes) if (p.confidence > best.confidence + 10 && p.confidence > base + 10) best = p;
  return best.deg;
}
/** V9: cạnh dài của ảnh dò hướng (dò trên ảnh nhỏ, đọc thật trên ảnh đầy đủ). */
export const V9_PROBE_MAX = 1000;
type V9Stats = { full: number; probe: number; rotated: number };
function v9(): V9Stats { const g = globalThis as { __v9?: V9Stats }; return (g.__v9 ??= { full: 0, probe: 0, rotated: 0 }); }

/** One reusable OCR worker per batch — creating a worker (and loading language data) per page was the slowest step. */
export async function ocrSession() {
  const run = async (src: string | HTMLCanvasElement) => {
    const result = await sharedOcr().run(getSettings().ocrLang, src as string, { out: { blocks: true, text: true } });
    const words: OcrWord[] = [];
    for (const b of result.data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) {
      const { x0, y0, x1, y1 } = w.bbox;
      // flip y so larger = higher on the page, like PDF coordinates
      words.push({ str: w.text, x: x0, y: -(y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
    }
    return { text: result.data.text.trim(), words, confidence: result.data.confidence ?? 0 };
  };
  return {
    /** OCR with word positions; if the page reads badly, probe sideways on a small copy (scanned tables are often landscape),
     * then read full size only in the winning orientation. V9: canvas goes straight to Tesseract (no JPEG re-encode). */
    async words(canvas: HTMLCanvasElement) {
      const st = v9();
      st.full++;
      const best = await run(canvas);
      if (best.confidence >= 55) return best;
      const small = scaleCanvas(canvas, V9_PROBE_MAX);
      const probes: { deg: number; confidence: number }[] = [];
      for (const deg of [90, 270]) {
        st.probe++;
        const r = await run(rotateCanvasEl(small, deg));
        probes.push({ deg, confidence: r.confidence });
      }
      if (small !== canvas) small.width = 0;
      const deg = pickOrientation(best.confidence, probes);
      if (!deg) return best;
      st.full++; st.rotated++;
      const rc = rotateCanvasEl(canvas, deg);
      const r = await run(rc);
      rc.width = 0;
      return r.confidence > best.confidence ? r : best;
    },
    async close() { /* Worker dùng chung (O7) — giữ lại cho lần sau */ },
  };
}

function scaleCanvas(c: HTMLCanvasElement, max: number) {
  const k = Math.min(1, max / Math.max(c.width, c.height));
  if (k === 1) return c;
  const o = document.createElement("canvas"); o.width = Math.round(c.width * k); o.height = Math.round(c.height * k);
  o.getContext("2d")!.drawImage(c, 0, 0, o.width, o.height); return o;
}
function rotateCanvasEl(c: HTMLCanvasElement, deg: number) {
  const o = document.createElement("canvas"); o.width = c.height; o.height = c.width;
  const g = o.getContext("2d")!; g.translate(o.width / 2, o.height / 2); g.rotate((deg * Math.PI) / 180); g.drawImage(c, -c.width / 2, -c.height / 2);
  return o;
}
export function rotateCanvas(c: HTMLCanvasElement, deg: number) {
  const o = rotateCanvasEl(c, deg);
  const url = o.toDataURL("image/jpeg", 0.9); o.width = 0; return url;
}

/** Back-compat single-image OCR with positions. */
export async function recognizeWords(src: string) {
  const result = await sharedOcr().run(getSettings().ocrLang, src, { out: { blocks: true, text: true } });
  const words: OcrWord[] = [];
  for (const b of result.data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) {
    const { x0, y0, x1, y1 } = w.bbox;
    words.push({ str: w.text, x: x0, y: -(y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
  }
  return { text: result.data.text.trim(), words };
}

/** Run tasks with limited parallelism, keeping result order. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const RULES: [string, RegExp][] = [
  ["CCCD", /căn cước|cccd|identity card|chứng minh/i],
  ["Hóa đơn", /hóa đơn|hoá đơn|invoice|tổng cộng|thanh toán|vat/i],
  ["Hợp đồng", /hợp đồng|contract|bên a|bên b|điều khoản/i],
  ["Biên lai", /biên lai|receipt/i],
];
/** Guess a category and readable title from recognized text. */
export function classify(text: string) {
  const kind = RULES.find(([, re]) => re.test(text))?.[0] ?? "Ghi chú";
  const line = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 4 && /[a-zà-ỹ]/i.test(l)) ?? "";
  return { kind, title: line.slice(0, 48) };
}

/** S13d – Hộp từ OCR theo điểm ảnh (y hướng xuống) kèm độ tin cậy, trên ảnh thu nhỏ ≤ `max` px; trả cả kích thước ảnh đã đọc để đổi sang toạ độ chuẩn hoá. */
export async function recognizeWordBoxes(src: string, max = 1280) {
  const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => bad(new Error("Không mở được ảnh")); i.src = src; });
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.9); const size = { w: c.width, h: c.height }; c.width = 0;
  const result = await sharedOcr().run(getSettings().ocrLang, url, { out: { blocks: true } });
  const words: { text: string; conf: number; x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const b of result.data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) words.push({ text: w.text, conf: w.confidence, ...w.bbox });
  return { size, words };
}
