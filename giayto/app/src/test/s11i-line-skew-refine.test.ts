import { describe, it, expect } from "vitest";
import { lineSkewMap, lineSkewCorrect, lineSkewRefine } from "@/lib/line-skew";

function page(W: number, H: number, degL: number, degR: number) {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y0 = 40; y0 < H - 40; y0 += 24) {
    const low = y0 > H / 2;
    for (let x = 30; x < W - 30; x++) {
      if ((x >> 3) % 5 === 4) continue;
      const deg = !low ? 0 : x < W / 2 ? degL : degR;
      const yc = Math.round(y0 + (x - W / 2) * Math.tan((deg * Math.PI) / 180));
      for (let k = 0; k < 6; k++) { const i = ((yc + k) * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
    }
  }
  return d;
}
const gray = (d: Uint8ClampedArray) => { const g = new Uint8Array(d.length / 4); for (let i = 0; i < g.length; i++) g[i] = d[i * 4]; return g; };
const bad = (d: Uint8ClampedArray, W: number, H: number) => {
  const m = lineSkewMap(gray(d), W, H);
  return Math.max(...m.cells.filter((c) => c.band >= 3).map((c) => Math.abs(c.angle))) + m.bottom.curve;
};

describe("S11i lineSkewRefine", () => {
  it("không kém hơn một lượt trên dòng cong trái/phải khác góc", () => {
    const W = 800, H = 1100, d = page(W, H, -0.5, -1.5);
    const one = lineSkewCorrect(d, W, H, lineSkewMap(gray(d), W, H).cells);
    const r = lineSkewRefine(d, W, H, 2);
    expect(bad(r.data, W, H)).toBeLessThanOrEqual(bad(one, W, H));
    expect(bad(r.data, W, H)).toBeLessThan(bad(d, W, H));
  });
  it("trang thẳng không đổi", () => {
    const W = 600, H = 800, d = page(W, H, 0, 0);
    const r = lineSkewRefine(d, W, H, 2);
    let diff = 0; for (let i = 0; i < d.length; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
  it("nửa trên giữ nguyên sau 2 lượt", () => {
    const W = 800, H = 1100, d = page(W, H, 1, 1.25);
    const r = lineSkewRefine(d, W, H, 2);
    let diff = 0; for (let i = 0; i < W * 4 * 300; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
});
