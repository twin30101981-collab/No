// P8.5: "Áp dụng cho trang tương tự". Thuần, kiểm thử được.
// So số đo chất lượng (độ nét, lóa, nghiêng, độ sáng, tương phản) của trang nguồn với các trang khác;
// trang nào gần (khoảng cách chuẩn hoá ≤ ngưỡng) thì được nhận cùng chỉnh sửa.
import type { Page, PageEdit } from "./db";
import type { PageMetrics } from "./page-grade";

/** Thang chuẩn hoá cho từng chỉ số (chênh bằng thang = khoảng cách 1). */
const SCALE: Record<keyof PageMetrics, number> = { blur: 40, glare: 0.05, skew: 6, brightness: 60, contrast: 30 };
const WEIGHT: Record<keyof PageMetrics, number> = { blur: 0.2, glare: 0.2, skew: 0.1, brightness: 0.3, contrast: 0.2 };

export const SIMILAR_THRESHOLD = 0.35;

export function pageDistance(a: PageMetrics, b: PageMetrics): number {
  let s = 0;
  for (const k of Object.keys(SCALE) as (keyof PageMetrics)[]) {
    const d = (k === "skew" ? Math.abs(a[k]) - Math.abs(b[k]) : a[k] - b[k]) / SCALE[k];
    s += WEIGHT[k] * Math.min(1, d * d);
  }
  return Math.sqrt(s);
}

export type SimilarMatch = { pageId: string; distance: number };

/** Trang tương tự trang nguồn (không gồm chính nó), gần nhất trước. Thiếu số đo → bỏ qua. */
export function findSimilar(
  sourceId: string,
  metrics: Map<string, PageMetrics>,
  threshold = SIMILAR_THRESHOLD,
): SimilarMatch[] {
  const src = metrics.get(sourceId);
  if (!src) return [];
  const out: SimilarMatch[] = [];
  for (const [id, m] of metrics) {
    if (id === sourceId) continue;
    const distance = pageDistance(src, m);
    if (distance <= threshold) out.push({ pageId: id, distance });
  }
  return out.sort((x, y) => x.distance - y.distance);
}

/** Chỉ mang sang phần "xử lý" (bộ lọc, sáng, tương phản) — không mang khung cắt/xoay vốn riêng từng trang. */
export type TransferEdit = Pick<PageEdit, "filter" | "brightness" | "contrast">;

export function applyToSimilar(pages: Page[], ids: Set<string>, edit: TransferEdit): Page[] {
  if (!ids.size) return pages;
  return pages.map((p) => (ids.has(p.id) ? { ...p, edit: { ...p.edit, ...edit } } : p));
}
