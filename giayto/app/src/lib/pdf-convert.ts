/** PDF → Word/Excel. Text PDFs: read the text layer directly (fast, exact). Image-only pages: AI table reading (Excel) or OCR. */
import { block, blocksToDocx, textToBlocks, type Block } from "./docx";
import { pdfjs } from "./files";
import { ocrSession, pool } from "./ocr";
import { sheetsToXlsx, textToRows } from "./xlsx";
import { TABLE_PX, type TableFn } from "./batch";
import { normalize } from "./image";

/** Cạnh dài tối đa của ảnh gửi AI: đủ đọc số nhỏ, nhẹ hơn ~40% so với ảnh dựng trang. */
export const AI_PX = 1600;

type Line = { cells: string[]; size: number };
export type PdfPage = { lines: Line[]; ocr: boolean; ai?: boolean; text: string };
export type ConvertStep = { step: "read" | "scan" | "build"; done: number; total: number; label: string };

type Item = { str: string; x: number; y: number; w: number; h: number };

/** Group positioned text items into lines; split a line into cells where the horizontal gap is wide. */
export function itemsToLines(items: Item[]): Line[] {
  const its = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Item[][] = [];
  for (const it of its) {
    const r = rows[rows.length - 1];
    if (r && Math.abs(r[0].y - it.y) <= Math.max(2, Math.min(r[0].h, it.h) * 0.5)) r.push(it); else rows.push([it]);
  }
  return rows.map((r) => {
    r.sort((a, b) => a.x - b.x);
    const size = Math.max(...r.map((i) => i.h));
    const cells: string[] = [r[0].str];
    for (let k = 1; k < r.length; k++) {
      const gap = r[k].x - (r[k - 1].x + r[k - 1].w);
      if (gap > size * 1.5) cells.push(r[k].str);
      else cells[cells.length - 1] += (gap > size * 0.15 && !/\s$/.test(cells[cells.length - 1]) ? " " : "") + r[k].str;
    }
    return { cells: cells.map((c) => c.replace(/\s+/g, " ").trim()).filter(Boolean), size };
  }).filter((l) => l.cells.length);
}

type ReadOpts = { onStep?: (s: ConvertStep) => void; table?: TableFn; warn?: (m: string) => void };

export async function readPdf(file: Blob, opts: ReadOpts = {}): Promise<PdfPage[]> {
  const { onStep, table, warn } = opts;
  const lib = await pdfjs();
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const n = pdf.numPages;
  const out: PdfPage[] = new Array(n);
  const scans: { i: number; canvas: HTMLCanvasElement }[] = [];
  // Pass 1: text layer (instant). Pages without text are rendered once for the scan pass.
  for (let i = 1; i <= n; i++) {
    onStep?.({ step: "read", done: i - 1, total: n, label: `Đang mở trang ${i}/${n}` });
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const items: Item[] = (tc.items as { str?: string; transform?: number[]; width?: number; height?: number }[])
      .filter((t) => typeof t.str === "string" && t.transform)
      .map((t) => ({ str: t.str!, x: t.transform![4], y: t.transform![5], w: t.width ?? 0, h: t.height || Math.abs(t.transform![3]) || 10 }));
    const lines = itemsToLines(items);
    const chars = lines.reduce((k, l) => k + l.cells.join("").length, 0);
    if (chars >= 20) { out[i - 1] = { lines, ocr: false, text: lines.map((l) => l.cells.join("  ")).join("\n") }; continue; }
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(3, TABLE_PX / Math.max(base.width, base.height)) });
    const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
    await page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp }).promise;
    scans.push({ i: i - 1, canvas: c });
  }
  if (!scans.length) return out;

  // Pass 2: scanned pages. Original image (no rotation) → AI reads line by line with cell x-ranges → columns.ts; plain OCR text is the fallback.
  let done = 0, stopAi = !table, warned = false;
  const tick = () => onStep?.({ step: "scan", done: ++done, total: scans.length, label: `Đã đọc ${done}/${scans.length} trang ảnh` });
  onStep?.({ step: "scan", done: 0, total: scans.length, label: `Đang đọc ${scans.length} trang ảnh` });
  const failed: typeof scans = [];
  await pool(scans, 3, async (s) => {
    if (!stopAi) {
      onStep?.({ step: "scan", done, total: scans.length, label: `Đang đọc trang ${s.i + 1} (xong ${done}/${scans.length})` });
      const r = await table!({ data: { images: [await normalize(s.canvas, AI_PX, 0.8)] } });
      if (r.ok && r.data.rows.length) {
        out[s.i] = { lines: r.data.rows.map((cells) => ({ cells, size: 10 })), ocr: true, ai: true, text: r.data.rows.map((c) => c.join("  ")).join("\n") };
        s.canvas.width = 0; tick(); return;
      }
      if (!r.ok) {
        if (r.code === 402 || r.code === 429) stopAi = true;
        if (!warned) { warn?.(r.message + " Đang dùng cách đọc chữ thường (chậm và kém chính xác hơn)."); warned = true; }
      }
    }
    failed.push(s);
  });
  if (failed.length) {
    // AI hết lượt / lỗi: chỉ OCR chữ thường (không dựng bảng từ OCR).
    const ocr = await ocrSession();
    try {
      for (const s of failed) {
        const { text } = await ocr.words(s.canvas); s.canvas.width = 0;
        out[s.i] = { lines: textToRows(text).map((cells) => ({ cells, size: 10 })), ocr: true, text };
        tick();
      }
    } finally { await ocr.close(); }
  }
  return out;
}

/** Text-layer lines → Word blocks: runs of ≥2 multi-cell lines become tables, large lines headings. */
export function linesToBlocks(lines: Line[]): Block[] {
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b); const med = sizes[sizes.length >> 1] || 10;
  const out: Block[] = []; let i = 0;
  while (i < lines.length) {
    let j = i; while (j < lines.length && lines[j].cells.length >= 2) j++;
    if (j - i >= 2) { out.push(block("table", "", { rows: lines.slice(i, j).map((l) => l.cells) })); i = j; continue; }
    const l = lines[i], t = l.cells.join("    ");
    if (l.size > med * 1.25 && t.length < 120) out.push(block("heading", t, { level: l.size > med * 1.6 ? 1 : 2 }));
    else if (/^[•\-–*]\s+/.test(t)) out.push(block("bullet", t.replace(/^[•\-–*]\s+/, "")));
    else {
      const prev = out[out.length - 1];
      // join wrapped lines of the same paragraph
      if (prev?.kind === "paragraph" && !/[.:;!?]$/.test(prev.text) && /^[a-zà-ỹ0-9(]/.test(t)) prev.text += " " + t;
      else out.push(block("paragraph", t));
    }
    i++;
  }
  return out;
}

export function pdfPagesToWord(pages: PdfPage[], title: string) {
  const blocks = pages.flatMap((p) => (p.ai ? [block("table", "", { rows: p.lines.map((l) => l.cells) })] : p.ocr ? textToBlocks(p.text) : linesToBlocks(p.lines)));
  return { blob: blocksToDocx(blocks, title), blocks };
}
export function pdfPagesToExcel(pages: PdfPage[]) {
  const sheets = pages.map((p, i) => ({ name: pages.length > 1 ? `Trang ${i + 1}` : "Bang", rows: p.lines.map((l) => l.cells), totals: true }));
  return { blob: sheetsToXlsx(sheets), sheets };
}
