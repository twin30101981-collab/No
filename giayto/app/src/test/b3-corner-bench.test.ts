import { describe, expect, it } from "vitest";
import { hiResSampleSet, runCornerBench } from "@/lib/crop-bench";
import { refineQuadSampler, rgbaSampler, stripSampler, edgeStripBox } from "@/lib/detect-refine";

describe("B3 tinh chỉnh góc trên ảnh gốc", () => {
  it("sai số góc trung bình ≤ 2 px trên bộ đo chuẩn", () => {
    const r = runCornerBench();
    console.log(r.results.map((x) => `${x.name}: ${x.coarsePx.toFixed(1)} → ${x.refinedPx.toFixed(2)} px`).join("\n"), "\nTB:", r.meanCoarsePx.toFixed(2), "→", r.meanRefinedPx.toFixed(2));
    expect(r.results.every((x) => x.found)).toBe(true);
    expect(r.meanRefinedPx).toBeLessThanOrEqual(2);
    expect(r.meanRefinedPx).toBeLessThan(r.meanCoarsePx);
  }, 60000);

  it("đọc theo 4 dải cạnh cho kết quả như đọc cả ảnh", () => {
    const s = hiResSampleSet(768, 1024)[1];
    const rough = s.truth.map(([x, y]) => [x + 0.006, y - 0.005]) as typeof s.truth;
    const full = refineQuadSampler(rgbaSampler(s.rgba, s.w, s.h), s.w, s.h, rough);
    const strips = [0, 1, 2, 3].map((i) => {
      const b = edgeStripBox(rough, s.w, s.h, i, 24);
      const data = new Uint8ClampedArray(b.w * b.h * 4);
      for (let y = 0; y < b.h; y++) data.set(s.rgba.subarray(((b.y + y) * s.w + b.x) * 4, ((b.y + y) * s.w + b.x + b.w) * 4), y * b.w * 4);
      return { ...b, data };
    });
    const part = refineQuadSampler(stripSampler(strips), s.w, s.h, rough);
    part.forEach((p, i) => { expect(Math.abs(p[0] - full[i][0]) * s.w).toBeLessThan(0.6); expect(Math.abs(p[1] - full[i][1]) * s.h).toBeLessThan(0.6); });
  });

  it("dải cạnh nằm trong ảnh", () => {
    const b = edgeStripBox([[0, 0], [1, 0], [1, 1], [0, 1]], 100, 80, 1, 24);
    expect(b.x + b.w).toBeLessThanOrEqual(100); expect(b.y).toBe(0); expect(b.h).toBe(80);
  });
});
