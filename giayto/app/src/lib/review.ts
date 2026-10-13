/** Pre-export review: flag cells the reader was unsure about, strip markers, estimate output size. */
import { blocksToDocx, type Block } from "./docx";
import { sheetsToXlsx, type Sheet } from "./xlsx";

export const MARK = "⟦?⟧";
/** True when AI marked the value, or it looks like a misread number (O/0, l/1, S/5 mixed with digits) or garbage. */
export function isUnsure(s: string) {
  if (!s) return false;
  if (s.includes(MARK) || s.includes("\uFFFD")) return true;
  if (/^\?+$/.test(s.trim())) return true;
  return s.split(/\s+/).some((t) => /\d/.test(t) && /^[\d.,OoIlS|]+$/.test(t) && /[OoIlS|]/.test(t) && t.replace(/[^\d]/g, "").length >= 2);
}
export const clean = (s: string) => s.split(MARK).join("").replace(/\s{2,}/g, " ").trim();

/** Nguồn của lần chuyển đổi (để ghi lịch sử). historyId: đang sửa lại một mục lịch sử. */
/** lazy: mã từ registerSource (history.ts) — tạo tệp gốc khi lưu, không giữ hàm trong dữ liệu (structuredClone). details: ghi chú thêm, vd danh sách tài liệu. */
export type ReviewSource = { kind?: string; name?: string; blob?: Blob; historyId?: string; lazy?: string; details?: string[] };
export type Review =
  | { kind: "word"; title: string; blocks: Block[]; note?: string; source?: ReviewSource }
  | { kind: "excel"; title: string; sheets: Sheet[]; note?: string; source?: ReviewSource };

export const cleanBlocks = (bs: Block[]) => bs.map((b) => ({ ...b, text: clean(b.text), rows: b.rows.map((r) => r.map(clean)) }));
export const cleanSheets = (ss: Sheet[]) => ss.map((s) => ({ ...s, rows: s.rows.map((r) => r.map(clean)) }));
export const buildReview = (r: Review) => (r.kind === "word" ? blocksToDocx(cleanBlocks(r.blocks), r.title) : sheetsToXlsx(cleanSheets(r.sheets)));

export function countUnsure(r: Review) {
  const cells = r.kind === "word" ? r.blocks.flatMap((b) => [b.text, ...b.rows.flat()]) : r.sheets.flatMap((s) => s.rows.flat());
  return cells.filter(isUnsure).length;
}
export const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
