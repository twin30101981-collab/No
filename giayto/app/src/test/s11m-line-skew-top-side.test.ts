import { describe, it, expect } from "vitest";
import { regionAngle, lineSkewRefineTopSide } from "@/lib/line-skew";

function page(W: number, H: number, topL: number, topR: number) {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y0 = 40; y0 < H - 40; y0 += 24) {
    const up = y0 < H / 2;
    for (let x = 30; x < W - 30; x++) {
      if ((x >> 3) % 5 === 4) continue;
      const deg = up ? (x < W / 2 ? topL : topR) : 0;
      const yc = Math.round(y0 + (x - W / 2) * Math.tan((deg * Math.PI) / 180));
      for (let k = 0; k < 6; k++) { const i = ((yc + k) * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
    }
  }
  return d;
}
const gray = (d: Uint8ClampedArray) => { const g = new Uint8Array(d.length / 4); for (let i = 0; i < g.length; i++) g[i] = d[i * 4]; return g; };
const rightTop = (d: Uint8ClampedArray, W: number, H: number) => {
  const mx = (W * 0.06) | 0, my = (H * 0.04) | 0, bh = ((H - 2 * my) / 6) | 0, half = ((W - 2 * mx) / 2) | 0;
  const g = gray(d);
  return Math.abs(regionAngle(g, W, mx + half, mx + 2 * half, my + bh, my + 2 * bh, 3, 0.125).angle);
};

describe("S11m lineSkewRefineTopSide", () => {
  it("nắn nửa phải dải trên, chọn đúng bên", () => {
    const W = 800, H = 1100, d = page(W, H, 0, -1.75);
    const r = lineSkewRefineTopSide(d, W, H, 2);
    expect(r.side).toBe(1);
    expect(rightTop(r.data, W, H)).toBeLessThan(rightTop(d, W, H));
  });
  it("trang thẳng không đổi", () => {
    const W = 600, H = 800, d = page(W, H, 0, 0);
    const r = lineSkewRefineTopSide(d, W, H, 2);
    let diff = 0; for (let i = 0; i < d.length; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
  it("nửa dưới giữ nguyên", () => {
    const W = 800, H = 1100, d = page(W, H, 0, -1.5);
    const r = lineSkewRefineTopSide(d, W, H, 2);
    let diff = 0; for (let i = W * 4 * 760; i < d.length; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
});
