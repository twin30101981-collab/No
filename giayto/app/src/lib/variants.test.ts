import { describe, expect, it } from "vitest";
import { buildVariants, variantActive } from "./variants";
import type { PageMetrics } from "./page-grade";

const base: PageMetrics = { brightness: 150, contrast: 60, blur: 30, skew: 0 } as PageMetrics;
const dark: PageMetrics = { brightness: 70, contrast: 60, blur: 30, skew: 0 } as PageMetrics;
const flat: PageMetrics = { brightness: 150, contrast: 20, blur: 30, skew: 0 } as PageMetrics;

describe("R3.2 buildVariants", () => {
  it("luôn trả đúng 3 biến thể với id khác nhau", () => {
    const vs = buildVariants(base);
    expect(vs).toHaveLength(3);
    expect(new Set(vs.map((v) => v.id)).size).toBe(3);
    for (const v of vs) {
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.desc.length).toBeGreaterThan(0);
      expect(v.edit.level).toBe(100);
    }
  });

  it("ảnh tối → các biến thể tăng sáng", () => {
    const vs = buildVariants(dark);
    for (const v of vs) expect(v.edit.brightness).toBeGreaterThan(0);
  });

  it("ảnh tương phản thấp → biến thể Sắc nét tăng tương phản", () => {
    const sharp = buildVariants(flat).find((v) => v.id === "sharp")!;
    expect(sharp.edit.contrast).toBe(15);
  });

  it("không có chỉ số vẫn dựng được (mặc định cân bằng)", () => {
    const vs = buildVariants(null);
    expect(vs.map((v) => v.id)).toEqual(["sharp", "vivid", "mono"]);
    expect(vs[0]!.edit.brightness).toBe(0);
  });

  it("ba biến thể dùng ba bộ lọc khác nhau", () => {
    const filters = buildVariants(base).map((v) => v.edit.filter);
    expect(new Set(filters).size).toBe(3);
  });
});

describe("R3.2 variantActive", () => {
  const v = buildVariants(base)[0]!;
  it("khớp khi bản nháp giống hệt biến thể", () => {
    expect(variantActive(v, { filter: "sharp", level: 100, brightness: 0, contrast: 5 })).toBe(true);
  });
  it("level thiếu được coi là 100", () => {
    expect(variantActive(v, { filter: "sharp", brightness: 0, contrast: 5 })).toBe(true);
  });
  it("không khớp khi khác bộ lọc hoặc thông số", () => {
    expect(variantActive(v, { filter: "mono", level: 100, brightness: 0, contrast: 5 })).toBe(false);
    expect(variantActive(v, { filter: "sharp", level: 80, brightness: 0, contrast: 5 })).toBe(false);
    expect(variantActive(v, { filter: "sharp", level: 100, brightness: 10, contrast: 5 })).toBe(false);
  });
});
