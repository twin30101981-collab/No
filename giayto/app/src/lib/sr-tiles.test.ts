import { describe, it, expect } from "vitest";
import { planTiles, planScale, upscaleTiled, type Rgba } from "./sr-tiles";

const nearest = async (t: Rgba, s: number): Promise<Rgba> => {
  const W = t.width * s, H = t.height * s, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d.set(t.data.subarray((((y / s) | 0) * t.width + ((x / s) | 0)) * 4, (((y / s) | 0) * t.width + ((x / s) | 0)) * 4 + 4), (y * W + x) * 4);
  return { data: d, width: W, height: H };
};
function gradient(w: number, h: number): Rgba {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([x * 2, y * 3, (x + y) % 256, 255], (y * w + x) * 4);
  return { data: d, width: w, height: h };
}

describe("sr-tiles", () => {
  it("các ô phủ kín ảnh", () => {
    const w = 100, h = 70, seen = new Uint8Array(w * h);
    for (const r of planTiles(w, h, 40, 6)) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) seen[y * w + x] = 1;
    expect(seen.every((v) => v === 1)).toBe(true);
  });

  it("ghép ô không tạo đường nối (khớp với phóng cả ảnh)", async () => {
    const img = gradient(90, 60), whole = await nearest(img, 2);
    let n = 0;
    const out = await upscaleTiled(img, nearest, { tile: 40, overlap: 6, onProgress: () => n++ });
    expect(out.width).toBe(180); expect(out.height).toBe(120); expect(n).toBeGreaterThan(1);
    let maxDiff = 0; for (let i = 0; i < out.data.length; i++) maxDiff = Math.max(maxDiff, Math.abs(out.data[i] - whole.data[i]));
    expect(maxDiff).toBeLessThanOrEqual(1);
  });

  it("thu nhỏ đầu vào khi vượt giới hạn bộ nhớ", async () => {
    expect(planScale(1000, 1000, 2, 4_000_000)).toBe(1);
    expect(planScale(2000, 2000, 2, 4_000_000)).toBeCloseTo(0.5);
    const out = await upscaleTiled(gradient(80, 80), nearest, { maxOutPixels: 80 * 80, tile: 64, overlap: 4 });
    expect(out.width * out.height).toBeLessThanOrEqual(80 * 80); expect(out.inputScale).toBeLessThan(1);
  });
});
