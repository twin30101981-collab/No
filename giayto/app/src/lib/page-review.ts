/**
 * R3.1 – Nhật ký quyết định theo trang + nhãn “Cần xem lại” + thẻ lọc.
 * Thuần hàm: màn tài liệu đo checkQuality rồi đưa chỉ số vào đây.
 */
import { QUALITY_THRESHOLDS } from "./quality";
import { FILTER_LABEL, type Filter, type Page } from "./db";
import { suggestFilter } from "./filter-suggest";

/** Trang có điểm chất lượng dưới ngưỡng này bị gắn “Cần xem lại”. */
export const REVIEW_THRESHOLD = 70;

export type PageReview = { score: number; note: string };
export type ReviewTab = "all" | "review" | "manual";
export const TAB_LABEL: Record<ReviewTab, string> = { all: "Tất cả", review: "Cần xem lại", manual: "Đã sửa tay" };

export const needsReview = (score: number) => score < REVIEW_THRESHOLD;

type Metrics = { blur: number; brightness: number; contrast: number; glare: number; skew?: number };

/** Câu giải thích ngắn: vấn đề đo được → bộ lọc đang áp dụng, ví dụ “ảnh hơi tối → Làm sáng”. */
export function decisionNote(m: Metrics, filter: Filter): string {
  const T = QUALITY_THRESHOLDS;
  const s = suggestFilter(m);
  const problem = s?.reason
    ?? (m.blur < T.BLUR_WARNING ? "ảnh hơi mờ" : (m.skew ?? 0) > T.SKEW_AUTO_FIX ? "ảnh nghiêng" : null);
  const dark = m.brightness < T.DARK_WARNING ? ` (độ sáng ${Math.round((m.brightness / 255) * 100)}%)` : "";
  return problem ? `${problem}${dark} → ${FILTER_LABEL[filter]}` : `ảnh ổn → ${FILTER_LABEL[filter]}`;
}

/** Chỉ số (theo vị trí gốc) của các trang thuộc thẻ lọc. Trang chưa đo điểm không bị coi là cần xem lại. */
export function filterPages(pages: Page[], reviews: Record<string, PageReview | undefined>, tab: ReviewTab): number[] {
  const out: number[] = [];
  pages.forEach((p, i) => {
    const r = reviews[p.id];
    if (tab === "all" || (tab === "review" && r && needsReview(r.score)) || (tab === "manual" && p.manual)) out.push(i);
  });
  return out;
}
