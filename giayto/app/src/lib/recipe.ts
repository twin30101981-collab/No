// P8.3: bộ chọn công thức xử lý + tự kiểm. Thuần, kiểm thử được.
// Kết hợp điểm trang (page-grade), gợi ý bộ lọc (filter-suggest) và loại tài liệu (doc-type)
// để ra một "công thức" xử lý; sau khi áp dụng, tự kiểm so sánh trước/sau và lùi về
// công thức an toàn nếu kết quả không tốt hơn.
import type { Filter } from "./db";
import { gradePage, type PageMetrics } from "./page-grade";
import { suggestFilter } from "./filter-suggest";

export type Recipe = {
  filter: Filter;
  deskew: boolean;
  denoise: boolean;
  /** Lý do ngắn cho người dùng. */
  reason: string;
};

/** Loại giấy tờ có ảnh/màu quan trọng (con dấu đỏ, ảnh chân dung) → tránh đen trắng. */
const COLOR_DOCS = new Set(["sodo", "banglai", "xe", "khaisinh"]);
/** Loại thuần chữ → ưu tiên rõ chữ, nhẹ tệp. */
const TEXT_DOCS = new Set(["hopdong", "vat"]);

export const SAFE_RECIPE: Recipe = { filter: "auto", deskew: false, denoise: false, reason: "công thức an toàn" };

export function pickRecipe(m: PageMetrics, docTypeId?: string | null): Recipe {
  const grade = gradePage(m);
  const sug = suggestFilter(m);
  const deskew = Math.abs(m.skew) > 1;
  const denoise = m.blur < 25 || m.brightness < 80;
  let filter: Filter = sug && sug.confidence >= 0.4 ? sug.filter : grade.level === "tot" ? "magic" : "auto";
  let reason = sug && sug.confidence >= 0.4 ? sug.reason : grade.level === "tot" ? "trang tốt, làm nét chữ" : "cân bằng chung";
  if (docTypeId && COLOR_DOCS.has(docTypeId) && (filter === "mono" || filter === "ink" || filter === "eco")) {
    filter = "vivid";
    reason = "giữ màu con dấu/ảnh";
  } else if (docTypeId && TEXT_DOCS.has(docTypeId) && filter === "magic") {
    filter = "sharp";
    reason = "tài liệu chữ, làm rõ chữ";
  }
  return { filter, deskew, denoise, reason };
}

export type SelfCheck = { ok: boolean; before: number; after: number; recipe: Recipe; note: string };

/**
 * Tự kiểm: so điểm trang trước/sau khi áp dụng công thức.
 * Chấp nhận nếu không tụt quá `tolerance` điểm; nếu tụt → trả SAFE_RECIPE để xử lý lại.
 */
export function selfCheck(before: PageMetrics, after: PageMetrics, used: Recipe, tolerance = 3): SelfCheck {
  const b = gradePage(before).score;
  const a = gradePage(after).score;
  if (a + tolerance >= b) return { ok: true, before: b, after: a, recipe: used, note: a > b ? "đã cải thiện" : "giữ nguyên chất lượng" };
  if (used.filter === SAFE_RECIPE.filter && !used.deskew && !used.denoise)
    return { ok: false, before: b, after: a, recipe: { ...SAFE_RECIPE, filter: "original" }, note: "giữ ảnh gốc" };
  return { ok: false, before: b, after: a, recipe: SAFE_RECIPE, note: "kết quả kém hơn, lùi về công thức an toàn" };
}
