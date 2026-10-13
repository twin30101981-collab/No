import { describe, it, expect } from "vitest";
import { lineSkewMap, lineSkewRefineTop } from "@/lib/line-skew";

function page(W: number, H: number, topL: number, topR: number, title = false) {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y0 = 40; y0 < H - 40; y0 += 24) {
    const up = y0 < H / 2;
    const x0 = title && y0 < 120 ? W / 2 - 80 : 30, x1 = title && y0 < 120 ? W / 2 + 80 : W - 30;
    for (let x = x0; x < x1; x++) {
      if ((x >> 3) % 5 === 4) continue;
      const deg = up ? (x < W / 2 ? topL : topR) : 0;
      const yc = Math.round(y0 + (x - W / 2) * Math.tan((deg * Math.PI) / 180));
      for (let k = 0; k < 6; k++) { const i = ((yc + k) * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
    }
  }
  return d;
}
const gray = (d: Uint8ClampedArray) => { const g = new Uint8Array(d.length / 4); for (let i = 0; i < g.length; i++) g[i] = d[i * 4]; return g; };
const topBad = (d: Uint8ClampedArray, W: number, H: number) => {
  const m = lineSkewMap(gray(d), W, H);
  return Math.max(...m.cells.filter((c) => c.band < 3 && c.ink > 50).map((c) => Math.abs(c.angle))) + m.top.curve;
};

describe("S11k lineSkewRefineTop", () => {
  it("giảm cong/nghiêng nửa trên", () => {
    const W = 800, H = 1100, d = page(W, H, 0.5, 1.5, true);
    const r = lineSkewRefineTop(d, W, H, 2);
    expect(topBad(r.data, W, H)).toBeLessThan(topBad(d, W, H));
  });
  it("trang thẳng không đổi", () => {
    const W = 600, H = 800, d = page(W, H, 0, 0, true);
    const r = lineSkewRefineTop(d, W, H, 2);
    let diff = 0; for (let i = 0; i < d.length; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
  it("nửa dưới giữ nguyên", () => {
    const W = 800, H = 1100, d = page(W, H, 1, 1.25);
    const r = lineSkewRefineTop(d, W, H, 2);
    let diff = 0; for (let i = W * 4 * 760; i < d.length; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
});
