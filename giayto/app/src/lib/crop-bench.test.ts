import { describe, expect, it } from "vitest";
import { cornerError, makeSample, runBench, sampleSet } from "./crop-bench";

describe("crop-bench (G2-15)", () => {
  it("bộ mẫu cố định: 24 ảnh, lần nào sinh cũng giống nhau", () => {
    const a = sampleSet(), b = sampleSet();
    expect(a).toHaveLength(24);
    expect(a[5].gray[1234]).toBe(b[5].gray[1234]);
  }, 30000);

  it("cornerError = 0 khi trùng, tính theo đường chéo", () => {
    const s = makeSample("x", { bg: 50, paper: 225, noise: 0, rot: 0, persp: 0, scale: 1.3, shadow: 0, text: false, clutter: false, dx: 0, dy: 0 }, 1);
    expect(cornerError(s.truth, s.truth, s.w, s.h)).toBe(0);
    const moved = s.truth.map(([x, y]) => [x + 50 / s.w, y]) as typeof s.truth;
    expect(cornerError(moved, s.truth, s.w, s.h)).toBeCloseTo(50 / Math.hypot(s.w, s.h), 5);
  });

  it("đếm sai khi không tìm thấy giấy", () => {
    const r = runBench(sampleSet().slice(0, 3), 0.03, () => null);
    expect(r.correct).toBe(0); expect(r.results.every((x) => !x.found)).toBe(true);
  });

  it("bộ nhận khung hiện tại cắt đúng ≥ 95% bộ mẫu", () => {
    const r = runBench();
    console.log(`Tỉ lệ cắt đúng: ${r.correct}/${r.total}`, r.results.filter((x) => !x.ok).map((x) => `${x.name} (${(x.error * 100).toFixed(1)}%)`));
    expect(r.rate).toBeGreaterThanOrEqual(0.95);
  }, 60000);
});
