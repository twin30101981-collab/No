import { describe, it, expect } from "vitest";
import { lineSkewMap, lineSkewRefineBand1 } from "@/lib/line-skew";
function page(W: number, H: number, deg: (b: number, s: number) => number) {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  const my = (H * 0.04) | 0, bh = ((H - 2 * my) / 6) | 0;
  for (let y0 = my + 6; y0 < H - 40; y0 += 24) {
    const b = Math.min(5, ((y0 - my) / bh) | 0);
    for (let x = 30; x < W - 30; x++) {
      if ((x >> 3) % 5 === 4) continue;
      const s = x < W / 2 ? 0 : 1, a = deg(b, s);
      const yc = Math.round(y0 + (x - (s ? W * 0.75 : W * 0.25)) * Math.tan((a * Math.PI) / 180));
      for (let k = 0; k < 6; k++) { const yy = yc + k; if (yy < 0 || yy >= H) continue; const i = (yy * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
    }
  }
  return d;
}
const gray = (d: Uint8ClampedArray) => { const g = new Uint8Array(d.length / 4); for (let i = 0; i < g.length; i++) g[i] = d[i * 4]; return g; };
describe("S11s lineSkewRefineBand1", () => {
  it("nắn trang lệch chỉ ở dải 1 phải, dải 0 không lệch theo về ≤ 0,5°", () => {
    const W = 800, H = 1100, d = page(W, H, (b, s) => (b === 1 && s ? -1.5 : 0));
    const r = lineSkewRefineBand1(d, W, H);
    expect(r.side).toBe(1);
    const m = lineSkewMap(gray(r.data), W, H);
    expect(Math.abs(m.cells[3].angle)).toBeLessThanOrEqual(0.5);
    for (const c of m.cells) if (!(c.band === 1 && c.side === 1)) expect(Math.abs(c.angle)).toBeLessThanOrEqual(0.25);
  });
  it("trang thẳng không đổi", () => {
    const W = 600, H = 800, d = page(W, H, () => 0);
    const r = lineSkewRefineBand1(d, W, H);
    expect(r.passes).toBe(0);
    let diff = 0; for (let i = 0; i < d.length; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
});
describe("S11s ô ít mực", () => {
  it("ô dải 1 lệch nhỏ hơn 0,5° thì bỏ qua", () => {
    const W = 600, H = 800, d = page(W, H, (b, s) => (b === 1 && s ? -0.25 : 0));
    expect(lineSkewRefineBand1(d, W, H).passes).toBe(0);
  });
});
