// P8.4: áp công thức xử lý tự động cho trang mới sau khi lưu bản quét. Thuần, kiểm thử được.
// Chỉ đụng trang mới (không có trong `before`), còn giữ bộ lọc mặc định (người dùng chưa chọn tay),
// và đã có số đo chất lượng. Tài liệu khoá → không làm gì.
import type { Doc, Filter, Page } from "./db";
import type { PageMetrics } from "./page-grade";
import { pickRecipe, type Recipe } from "./recipe";
import { preferredFilter, type UserChoices } from "./user-recipe";

export type RecipeChange = { pageId: string; from: Filter; to: Filter; reason: string };

export function planRecipes(
  doc: Pick<Doc, "pages" | "locked">,
  before: Set<string>,
  metrics: Map<string, PageMetrics>,
  defaultFilter: Filter,
  docTypeId?: string | null,
  learned?: UserChoices,
): RecipeChange[] {
  if (doc.locked) return [];
  // R3.3: người dùng từng sửa tay loại này → ưu tiên bộ lọc họ hay chọn.
  const learned_ = docTypeId && learned ? preferredFilter(learned, docTypeId) : null;
  const out: RecipeChange[] = [];
  for (const p of doc.pages) {
    if (before.has(p.id) || p.edit.filter !== defaultFilter) continue;
    const m = metrics.get(p.id);
    if (!m) continue;
    const r: Recipe = pickRecipe(m, docTypeId);
    const to = learned_ ?? r.filter;
    const reason = learned_ ? "theo thói quen của bạn" : r.reason;
    if (to !== p.edit.filter) out.push({ pageId: p.id, from: p.edit.filter, to, reason });
  }
  return out;
}

/** Áp thay đổi vào danh sách trang (bất biến). Trang đã bị người dùng đổi bộ lọc trong lúc chờ → bỏ qua. */
export function applyRecipes(pages: Page[], changes: RecipeChange[]): Page[] {
  if (!changes.length) return pages;
  const by = new Map(changes.map((c) => [c.pageId, c]));
  return pages.map((p) => {
    const c = by.get(p.id);
    if (!c || p.edit.filter !== c.from) return p;
    return { ...p, edit: { ...p.edit, filter: c.to } };
  });
}
