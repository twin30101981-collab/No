import { describe, it, expect } from "vitest";
import { suggestFilter, shouldSuggest } from "./filter-suggest";
import { QUALITY_THRESHOLDS as T } from "./quality";

const OK = { brightness: 140, contrast: 45, glare: 0.001, blur: 80 };

describe("suggestFilter (P5)", () => {
  it("ảnh ổn → không gợi ý", () => {
    expect(suggestFilter(OK)).toBeNull();
  });
  it("chói nặng → shadow, ưu tiên cao hơn tối", () => {
    const s = suggestFilter({ ...OK, glare: T.GLARE_WARNING * 2, brightness: T.DARK_REJECT - 5 });
    expect(s?.filter).toBe("shadow");
    expect(s?.reason).toContain("chói");
  });
  it("thiếu sáng nặng → magic, tin cậy cao", () => {
    const s = suggestFilter({ ...OK, brightness: T.DARK_REJECT - 20 });
    expect(s?.filter).toBe("magic");
    expect(s!.confidence).toBeGreaterThan(0.7);
  });
  it("hơi tối → bright", () => {
    const s = suggestFilter({ ...OK, brightness: (T.DARK_REJECT + T.DARK_WARNING) / 2 });
    expect(s?.filter).toBe("bright");
  });
  it("tương phản thấp → auto", () => {
    const s = suggestFilter({ ...OK, contrast: T.CONTRAST_WARNING - 8 });
    expect(s?.filter).toBe("auto");
    expect(s?.reason).toContain("nhạt");
  });
  it("mờ nhẹ → sharp", () => {
    const s = suggestFilter({ ...OK, blur: T.BLUR_WARNING - 10 });
    expect(s?.filter).toBe("sharp");
  });
  it("tin cậy nằm trong 0–1", () => {
    for (const m of [OK, { ...OK, glare: 1 }, { ...OK, brightness: 0 }, { ...OK, blur: 0 }]) {
      const s = suggestFilter(m);
      if (s) { expect(s.confidence).toBeGreaterThanOrEqual(0); expect(s.confidence).toBeLessThanOrEqual(1); }
    }
  });
});

describe("shouldSuggest (P5)", () => {
  const s = { filter: "magic" as const, reason: "tối", confidence: 0.8 };
  it("không gợi ý khi trùng bộ lọc đang chọn", () => {
    expect(shouldSuggest(s, "magic")).toBe(false);
  });
  it("không gợi ý khi tin cậy dưới ngưỡng", () => {
    expect(shouldSuggest({ ...s, confidence: 0.3 }, "original")).toBe(false);
  });
  it("gợi ý khi khác bộ lọc và đủ tin cậy", () => {
    expect(shouldSuggest(s, "original")).toBe(true);
    expect(shouldSuggest(null, "original")).toBe(false);
  });
});
