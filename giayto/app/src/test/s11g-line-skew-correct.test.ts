import { describe, it, expect } from "vitest";
import { lineSkewMap, lineSkewCorrect } from "@/lib/line-skew";

// Trang tổng hợp: nửa trên dòng thẳng, nửa dưới dòng chúi xuống `deg` độ.
function page(W: number, H: number, deg: number) {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  const t = Math.tan((deg * Math.PI) / 180);
  for (let y0 = 40; y0 < H - 40; y0 += 24) {
    const tilt = y0 > H / 2 ? t : 0;
    for (let x = 30; x < W - 30; x++) {
      if ((x >> 3) % 5 === 4) continue; // khoảng trắng giữa "chữ"
      const yc = Math.round(y0 + (x - W / 2) * tilt);
      for (let k = 0; k < 6; k++) { const i = ((yc + k) * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
    }
  }
  return d;
}
const gray = (d: Uint8ClampedArray) => { const g = new Uint8Array(d.length / 4); for (let i = 0; i < g.length; i++) g[i] = d[i * 4]; return g; };

describe("S11g lineSkewCorrect", () => {
  it("nắn dòng nửa dưới về ≤ 0,5°", () => {
    const W = 800, H = 1100, d = page(W, H, 1.25);
    const m = lineSkewMap(gray(d), W, H);
    expect(Math.abs(m.bottom.tilt)).toBeGreaterThan(0.75);
    const out = lineSkewCorrect(d, W, H, m.cells);
    const m2 = lineSkewMap(gray(out), W, H);
    for (const c of m2.cells.filter((c) => c.band >= 3)) expect(Math.abs(c.angle)).toBeLessThanOrEqual(0.5);
    expect(m2.bottom.curve).toBeLessThanOrEqual(0.5);
  });
  it("nửa trên giữ nguyên", () => {
    const W = 800, H = 1100, d = page(W, H, 1);
    const out = lineSkewCorrect(d, W, H, lineSkewMap(gray(d), W, H).cells);
    let diff = 0; for (let i = 0; i < W * 4 * 300; i++) if (out[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
  it("trang thẳng không đổi", () => {
    const W = 600, H = 800, d = page(W, H, 0);
    const out = lineSkewCorrect(d, W, H, lineSkewMap(gray(d), W, H).cells);
    let diff = 0; for (let i = 0; i < d.length; i++) if (out[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
});
