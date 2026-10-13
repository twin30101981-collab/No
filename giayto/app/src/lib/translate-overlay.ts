/**
 * G3-14: Dịch đè lên ảnh — bước 1: lấy khung chữ và bản dịch.
 * Gom từ OCR (ocr.ts, y = -tâm) thành dòng rồi thành khối đoạn có khung (toạ độ ảnh, gốc trên-trái).
 * Bước vẽ đè lên ảnh và xuất ở G3-15.
 */
import type { OcrWord } from "./ocr";
import { canvasToPageUrl } from "./canvas-url";

export type Box = { x: number; y: number; w: number; h: number };
export type TextBlock = Box & { text: string; lineH: number; lines: number };
export type TranslatedBlock = TextBlock & { translated: string };

const top = (w: OcrWord) => -w.y - w.h / 2;

function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

type Line = Box & { text: string };

/** Gom từ cùng hàng (tâm dọc lệch < nửa chiều cao) và gần nhau theo chiều ngang thành dòng. */
export function wordsToLines(words: OcrWord[]): Line[] {
  const ws = words.filter((w) => w.str.trim() && w.w > 0 && w.h > 0)
    .map((w) => ({ x: w.x, y: top(w), w: w.w, h: w.h, text: w.str.trim() }))
    .sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2) || a.x - b.x);
  const rows: (typeof ws)[] = [];
  for (const w of ws) {
    const cy = w.y + w.h / 2;
    const row = rows.find((r) => { const l = r[r.length - 1]!; return Math.abs(l.y + l.h / 2 - cy) < Math.max(l.h, w.h) / 2; });
    if (row) row.push(w); else rows.push([w]);
  }
  const lines: Line[] = [];
  for (const r of rows) {
    r.sort((a, b) => a.x - b.x);
    let cur: Line | null = null;
    for (const w of r) {
      // khoảng trống ngang > 2.5 lần chiều cao chữ → cột khác, tách dòng
      if (cur && w.x - (cur.x + cur.w) <= 2.5 * Math.max(cur.h, w.h)) cur = { ...union(cur, w), text: `${cur.text} ${w.text}` };
      else { if (cur) lines.push(cur); cur = { ...w }; }
    }
    if (cur) lines.push(cur);
  }
  return lines.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Gom dòng liền nhau (cách dọc < 0.8 chiều cao dòng, chồng ngang, cỡ chữ gần nhau) thành khối đoạn. */
export function linesToBlocks(lines: Line[]): TextBlock[] {
  const blocks: (TextBlock & { last: Line })[] = [];
  for (const l of lines) {
    const b = blocks.find((k) => {
      const gap = l.y - (k.last.y + k.last.h);
      const overlap = Math.min(k.x + k.w, l.x + l.w) - Math.max(k.x, l.x);
      const ratio = l.h / k.lineH;
      return gap >= -l.h / 2 && gap < 0.8 * Math.max(l.h, k.lineH) && overlap > 0.3 * Math.min(k.w, l.w) && ratio > 0.6 && ratio < 1.6;
    });
    if (b) {
      Object.assign(b, union(b, l));
      b.text += `\n${l.text}`;
      b.lineH = (b.lineH * b.lines + l.h) / (b.lines + 1);
      b.lines += 1; b.last = l;
    } else blocks.push({ x: l.x, y: l.y, w: l.w, h: l.h, text: l.text, lineH: l.h, lines: 1, last: l });
  }
  return blocks.map(({ last: _l, ...b }) => b).sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Bỏ khối chỉ có số/ký hiệu (không cần dịch) hoặc quá ngắn. */
export function needsTranslation(text: string) {
  return /\p{L}{2,}/u.test(text);
}

export function blocksFromWords(words: OcrWord[]): TextBlock[] {
  return linesToBlocks(wordsToLines(words)).filter((b) => needsTranslation(b.text));
}

/** Ghép kết quả AI vào khối; thiếu/thừa phần tử thì giữ nguyên văn bản gốc. */
export function attachTranslations(blocks: TextBlock[], translations: string[]): TranslatedBlock[] {
  return blocks.map((b, i) => ({ ...b, translated: translations[i]?.trim() || b.text }));
}

/** Chạy trọn bước 1: OCR có vị trí → khối → AI dịch theo lô. */
export async function translateImage(src: string, lang: string): Promise<{ blocks: TranslatedBlock[]; error?: string }> {
  const { recognizeWords } = await import("./ocr");
  const { words } = await recognizeWords(src);
  const blocks = blocksFromWords(words);
  if (!blocks.length) return { blocks: [], error: "Không tìm thấy chữ cần dịch trên trang này." };
  const { aiTranslateBlocks } = await import("./ai.functions");
  const res = await aiTranslateBlocks({ data: { texts: blocks.map((b) => b.text).slice(0, 200), lang } });
  if (!res.ok) return { blocks: attachTranslations(blocks, []), error: res.message };
  return { blocks: attachTranslations(blocks, res.texts) };
}

// ---------- G3-15: vẽ đè bản dịch lên ảnh ----------

export type Fit = { size: number; lines: string[] };

/** Ngắt dòng theo từ cho vừa chiều rộng; từ quá dài được cắt theo ký tự. */
export function wrapText(text: string, maxW: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (measure(next) <= maxW) { cur = next; continue; }
      if (cur) out.push(cur);
      cur = "";
      let w = word;
      while (measure(w) > maxW && w.length > 1) {
        let n = w.length - 1; while (n > 1 && measure(w.slice(0, n)) > maxW) n--;
        out.push(w.slice(0, n)); w = w.slice(n);
      }
      cur = w;
    }
    out.push(cur);
  }
  return out;
}

/** Tìm cỡ chữ lớn nhất (≤ 1.1× cỡ gốc, ≥ 6px) để bản dịch vừa khung. measure(s, size) đo chiều rộng. */
export function fitText(text: string, box: TextBlock, measure: (s: string, size: number) => number): Fit {
  const maxSize = Math.max(6, Math.round(box.lineH * 1.1));
  for (let size = maxSize; size >= 6; size--) {
    const lines = wrapText(text, box.w, (s) => measure(s, size));
    if (lines.length * size * 1.2 <= box.h + size * 0.3 && lines.every((l) => measure(l, size) <= box.w)) return { size, lines };
  }
  return { size: 6, lines: wrapText(text, box.w, (s) => measure(s, 6)) };
}

/** Màu nền = trung vị viền quanh khung; chữ đen hoặc trắng tuỳ độ sáng nền. */
export function pickColors(data: Uint8ClampedArray, width: number, height: number, box: Box) {
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const pad = 3, x0 = Math.max(0, Math.floor(box.x - pad)), y0 = Math.max(0, Math.floor(box.y - pad));
  const x1 = Math.min(width - 1, Math.ceil(box.x + box.w + pad)), y1 = Math.min(height - 1, Math.ceil(box.y + box.h + pad));
  const push = (x: number, y: number) => { const i = (y * width + x) * 4; rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); };
  for (let x = x0; x <= x1; x++) { push(x, y0); push(x, y1); }
  for (let y = y0; y <= y1; y++) { push(x0, y); push(x1, y); }
  const med = (a: number[]) => { a.sort((p, q) => p - q); return a[a.length >> 1] ?? 255; };
  const bg = [med(rs), med(gs), med(bs)] as const;
  const lum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
  return { bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`, fg: lum > 128 ? "#111" : "#fafafa" };
}

/** Vẽ ảnh + các khối dịch, trả object URL JPEG đã đăng ký (R1.4: không còn data URL). */
export async function renderOverlay(src: string, blocks: TranslatedBlock[]): Promise<string> {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const font = (s: number) => `${s}px system-ui, "DejaVu Sans", sans-serif`;
  const measure = (s: string, size: number) => { ctx.font = font(size); return ctx.measureText(s).width; };
  for (const b of blocks) {
    const { bg, fg } = pickColors(data, c.width, c.height, b);
    ctx.fillStyle = bg; ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
    const fit = fitText(b.translated, b, measure);
    ctx.font = font(fit.size); ctx.fillStyle = fg; ctx.textBaseline = "top";
    fit.lines.forEach((l, i) => ctx.fillText(l, b.x, b.y + i * fit.size * 1.2));
  }
  return canvasToPageUrl(c, "image/jpeg", 0.92);
}
