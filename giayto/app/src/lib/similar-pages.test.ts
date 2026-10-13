import { describe, expect, it } from "vitest";
import type { Page } from "./db";
import type { PageMetrics } from "./page-grade";
import { applyToSimilar, findSimilar, pageDistance } from "./similar-pages";

const good: PageMetrics = { blur: 60, glare: 0.005, skew: 0.5, brightness: 165, contrast: 45 };
const dark: PageMetrics = { blur: 30, glare: 0.01, skew: 1, brightness: 75, contrast: 18 };
const pg = (id: string): Page => ({ id, orig: "o", src: "s", edit: { rotation: 90, filter: "auto", brightness: 0, contrast: 0 } });

describe("similar-pages", () => {
  it("khoảng cách 0 với chính nó, lớn với trang khác hẳn", () => {
    expect(pageDistance(good, good)).toBe(0);
    expect(pageDistance(good, dark)).toBeGreaterThan(0.35);
  });
  it("tìm trang gần, bỏ trang khác hẳn và chính nó", () => {
    const m = new Map([["a", dark], ["b", { ...dark, brightness: 80 }], ["c", good], ["d", { ...dark, blur: 33 }]]);
    const r = findSimilar("a", m);
    expect(r.map((x) => x.pageId)).toEqual(["d", "b"]);
  });
  it("trang nguồn thiếu số đo → rỗng", () => {
    expect(findSimilar("x", new Map([["a", good]]))).toEqual([]);
  });
  it("chỉ mang bộ lọc/sáng/tương phản, giữ xoay", () => {
    const out = applyToSimilar([pg("a"), pg("b")], new Set(["b"]), { filter: "magic", brightness: 10, contrast: 5 });
    expect(out[0].edit.filter).toBe("auto");
    expect(out[1].edit).toEqual({ rotation: 90, filter: "magic", brightness: 10, contrast: 5 });
  });
});
