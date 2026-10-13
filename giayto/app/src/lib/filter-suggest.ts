import type { Filter } from "./db";
import { QUALITY_THRESHOLDS } from "./quality";

/** Chỉ số chất lượng tối thiểu cần để gợi ý bộ lọc (lấy từ QualityReport.metrics). */
export type FilterMetrics = { brightness: number; contrast: number; glare: number; blur: number };

export type FilterSuggestion = {
  filter: Filter;
  /** Lý do ngắn hiển thị cho người dùng. */
  reason: string;
  /** Độ tin cậy 0–1: càng xa ngưỡng càng chắc. */
  confidence: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * P5: gợi ý bộ lọc từ chỉ số chất lượng trang.
 * Ưu tiên theo mức ảnh hưởng tới khả năng đọc: chói > tối > tương phản thấp > mờ.
 * Trả null khi ảnh ổn (không cần đổi bộ lọc).
 */
export function suggestFilter(m: FilterMetrics): FilterSuggestion | null {
  const T = QUALITY_THRESHOLDS;
  // Chói: bóng đổ/vùng sáng chói → bộ lọc shadow kéo vùng tối, dịu vùng chói.
  if (m.glare >= T.GLARE_WARNING) {
    return {
      filter: "shadow",
      reason: "ảnh có vùng chói/bóng đổ",
      confidence: clamp01(0.55 + m.glare / (T.GLARE_REJECT * 2)),
    };
  }
  // Thiếu sáng nặng → magic (cân sáng mạnh); thiếu sáng nhẹ → bright.
  if (m.brightness < T.DARK_REJECT) {
    return {
      filter: "magic",
      reason: "ảnh chụp thiếu sáng",
      confidence: clamp01(0.6 + (T.DARK_REJECT - m.brightness) / T.DARK_REJECT),
    };
  }
  if (m.brightness < T.DARK_WARNING) {
    return {
      filter: "bright",
      reason: "ảnh hơi tối",
      confidence: clamp01(0.5 + (T.DARK_WARNING - m.brightness) / (T.DARK_WARNING - T.DARK_REJECT) / 2),
    };
  }
  // Tương phản thấp (nền xám, chữ nhạt) → auto kéo tương phản.
  if (m.contrast < T.CONTRAST_WARNING) {
    return {
      filter: "auto",
      reason: "chữ nhạt, nền xám",
      confidence: clamp01(0.5 + (T.CONTRAST_WARNING - m.contrast) / T.CONTRAST_WARNING / 2),
    };
  }
  // Mờ nhẹ → sharp tăng độ nét cục bộ.
  if (m.blur < T.BLUR_WARNING) {
    return {
      filter: "sharp",
      reason: "ảnh hơi mờ",
      confidence: clamp01(0.45 + (T.BLUR_WARNING - m.blur) / T.BLUR_WARNING / 2),
    };
  }
  return null;
}

/** Gợi ý chỉ nên hiện khi khác bộ lọc đang chọn và đủ tin cậy. */
export function shouldSuggest(s: FilterSuggestion | null, current: Filter, minConfidence = 0.4): s is FilterSuggestion {
  return !!s && s.filter !== current && s.confidence >= minConfidence;
}
