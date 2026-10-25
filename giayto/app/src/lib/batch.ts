/** Convert many documents at once: one file per document (packed in a .zip) or everything merged into one file. */
import type { Doc } from "./db";
import { docText } from "./db";
import { block, blocksToDocx, type Block } from "./docx";
import { docToPdf, imagesToPdf, safeName } from "./files";
import { compress } from "./image";
import { pool, recognize } from "./ocr";
import { imagesToWord } from "./word";
import { sheetsToXlsx, textToRows, type Sheet, zip } from "./xlsx";

export type BatchFormat = "pdf" | "word" | "excel";
type Fail = { ok: false; code: number; message: string };
type LayoutFn = Parameters<typeof imagesToWord>[2];
export type TableFn = (a: { data: { images: string[] } }) => Promise<{ ok: true; data: { title: string; rows: string[][] } } | Fail>;
export type BatchFns = { layout: LayoutFn; table: TableFn };
type Progress = (done: number, total: number, name: string) => void;

/** Long side sent to AI table reading: small digits in dense tables need ~2000px to stay exact. */
export const TABLE_PX = 2000;

/** Page images → rows per page via AI table reading (3 pages at a time), OCR fallback. */
export async function imagesToSheets(srcs: string[], table: TableFn, warn?: (m: string) => void, onPage?: (done: number, total: number) => void) {
  return (await imagesToTables(srcs, table, warn, onPage)).map((t) => t.rows);
}
export async function imagesToTables(srcs: string[], table: TableFn, warn?: (m: string) => void, onPage?: (done: number, total: number) => void) {
  let warned = false, stopAi = false, done = 0;
  return pool(srcs, 3, async (s) => {
    let res: { title: string; rows: string[][] } | null = null;
    if (!stopAi) {
      const r = await table({ data: { images: [await compress(s, TABLE_PX, 0.85)] } });
      if (r.ok && r.data.rows.length) res = r.data;
      else if (!r.ok) {
        // out of credits / rate limited: never hammer the AI again in this batch
        if (r.code === 402 || r.code === 429) stopAi = true;
        if (!warned) { warn?.(r.message + " Đang dùng cách đọc chữ thường."); warned = true; }
      }
    }
    res ??= { title: "", rows: textToRows(await recognize(s)) };
    onPage?.(++done, srcs.length);
    return res;
  });
}

/** Unique, safe file names inside a zip. */
export function uniqueNames(names: string[], ext: string) {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const b = safeName(n) || "tai-lieu"; const k = (seen.get(b) ?? 0) + 1; seen.set(b, k);
    return `${k > 1 ? `${b}-${k}` : b}.${ext}`;
  });
}

const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/** One file per document → zip. Returns blob + any notes. */
export async function batchSeparate(docs: Doc[], fmt: BatchFormat, fns: BatchFns, progress?: Progress, warn?: (m: string) => void) {
  const ext = fmt === "pdf" ? "pdf" : fmt === "word" ? "docx" : "xlsx";
  const names = uniqueNames(docs.map((d) => d.name), ext);
  const files: [string, Uint8Array][] = []; const failed: string[] = [];
  for (const [i, d] of docs.entries()) {
    progress?.(i, docs.length, d.name);
    try {
      const srcs = d.pages.map((p) => p.src);
      const blob = fmt === "pdf" ? await docToPdf(d)
        : fmt === "word" ? (await imagesToWord(srcs, d.name, fns.layout, docText(d))).blob
        : sheetsToXlsx((await imagesToSheets(srcs, fns.table, warn)).map((rows, k) => ({ name: srcs.length > 1 ? `Trang ${k + 1}` : "Bang", rows })));
      files.push([names[i], await bytes(blob)]);
    } catch (e) { console.error(e); failed.push(d.name); }
  }
  progress?.(docs.length, docs.length, "");
  return { blob: zip(files, "application/zip"), count: files.length, failed };
}

/** Everything merged into one file. Word/Excel return editable data for the review step. */
export async function batchMerged(docs: Doc[], fmt: BatchFormat, fns: BatchFns, progress?: Progress, warn?: (m: string) => void) {
  if (fmt === "pdf") { progress?.(0, 1, "PDF"); return { kind: "pdf" as const, blob: await imagesToPdf(docs.flatMap((d) => d.pages.map((p) => p.src)), { searchable: true }) }; }
  if (fmt === "word") {
    const blocks: Block[] = [];
    for (const [i, d] of docs.entries()) {
      progress?.(i, docs.length, d.name);
      const r = await imagesToWord(d.pages.map((p) => p.src), d.name, fns.layout, docText(d));
      blocks.push(block("heading", d.name, { level: 1 }), ...r.blocks);
    }
    return { kind: "word" as const, blocks, blob: blocksToDocx(blocks) };
  }
  const sheets: Sheet[] = [];
  for (const [i, d] of docs.entries()) {
    progress?.(i, docs.length, d.name);
    const pages = await imagesToSheets(d.pages.map((p) => p.src), fns.table, warn);
    const base = d.name.slice(0, 28) || "Trang"; let name = base;
    for (let n = 2; sheets.some((x) => x.name.toLowerCase() === name.toLowerCase()); n++) name = `${base} ${n}`;
    sheets.push({ name, rows: pages.flatMap((rows, k) => (k ? [[""], ...rows] : rows)) });
  }
  return { kind: "excel" as const, sheets, blob: sheetsToXlsx(sheets) };
}
