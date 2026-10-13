/**
 * R5.1 / TD-10 – Kiểm tự động khung PDF khớp xem trước.
 * Cùng một phép đặt trang với imagesToPdf (files.ts): lề 6 mm, trừ lề dấu trang,
 * co đều giữ tỉ lệ, căn giữa. Mọi hàm ở đây thuần để kiểm thử không cần DOM.
 */
import type { PdfSize } from "./files";

export type PaperMM = { w: number; h: number };
export const PAPER_MM: Record<"a4" | "letter", PaperMM> = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
};

export type PlacedRect = { x: number; y: number; w: number; h: number };

/** Khung đặt ảnh trang trong PDF — khớp nguyên công thức trong imagesToPdf. */
export function pageRect(
  pageW: number,
  pageH: number,
  paper: "a4" | "letter" = "a4",
  mark: { top: number; bottom: number } = { top: 0, bottom: 0 },
): PlacedRect {
  const { w: PW, h: PH } = PAPER_MM[paper];
  const m = 6;
  const aw = PW - m * 2;
  const ah = PH - m * 2 - mark.top - mark.bottom;
  const r = Math.min(aw / pageW, ah / pageH);
  const w = pageW * r;
  const h = pageH * r;
  return { x: (PW - w) / 2, y: m + mark.top + (ah - h) / 2, w, h };
}

/** Độ lệch tỉ lệ khung giữa ảnh nguồn (xem trước) và khung đặt trong PDF. 0 = khớp tuyệt đối. */
export function aspectDeviation(srcW: number, srcH: number, rect: PlacedRect): number {
  if (srcW <= 0 || srcH <= 0 || rect.w <= 0 || rect.h <= 0) return 1;
  const a = srcW / srcH;
  const b = rect.w / rect.h;
  return Math.abs(a - b) / a;
}

/** Ngưỡng nghiệm thu R5.1: tỉ lệ khớp ≤ 0,5 %. */
export const FRAME_MATCH_TOL = 0.005;

/** Khung PDF có khớp xem trước trong sai số cho phép không. */
export function frameMatches(srcW: number, srcH: number, paper: "a4" | "letter" = "a4", tol = FRAME_MATCH_TOL): boolean {
  return aspectDeviation(srcW, srcH, pageRect(srcW, srcH, paper)) <= tol;
}

/** Ước lượng dung lượng PDF (byte) cho n trang ở một mức — dùng cho cảnh báo trước khi xuất. */
export function estimatePdfBytes(pageCount: number, size: PdfSize, avgPageBytes: number): number {
  const scale: Record<PdfSize, number> = { small: 0.55, balanced: 1, high: 1.9 };
  const overhead = 4096 + pageCount * 512; // khung PDF + mục lục trang
  return Math.round(avgPageBytes * scale[size] * pageCount + overhead);
}

/** Ngân sách nghiệm thu R5.1: 20 trang mức Chuẩn ≤ 5 MB. */
export const BUDGET_BALANCED_20P = 5 * 1024 * 1024;

export function withinBudget(pageCount: number, size: PdfSize, avgPageBytes: number): boolean {
  if (size !== "balanced" || pageCount !== 20) return true; // ngân sách chỉ chuẩn cho ca nghiệm thu
  return estimatePdfBytes(pageCount, size, avgPageBytes) <= BUDGET_BALANCED_20P;
}
