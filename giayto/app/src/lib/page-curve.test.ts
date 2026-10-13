import { describe, expect, it } from "vitest";
import { detectTextLines, lineBend } from "./textlines";
import { buildPageCurve, flattenGray, fitLine } from "./page-curve";

function page(W: number, H: number, n: number, sag: number) {
  const g = new Uint8Array(W * H).fill(235);
  for (let k = 0; k < n; k++) {
    const base = 60 + k * ((H - 120) / (n - 1));
    for (let x = 30; x < W - 30; x++) {
      if (x % 14 > 10) continue;
      const t = x / W; const yc = base + sag * 4 * t * (1 - t);
      for (let d = -3; d <= 3; d++) { const y = Math.round(yc + d); if (y >= 0 && y < H) g[y * W + x] = 30; }
    }
  }
  return g;
}

describe("đường cong trang", () => {
  it("khớp parabol đúng dấu và độ lớn", () => {
    const f = fitLine({ cover: 1, pts: Array.from({ length: 11 }, (_, i) => { const x = i / 10; return [x, 0.5 - 0.1 * x * (1 - x)] as [number, number]; }) })!;
    expect(f.c).toBeCloseTo(0.1, 3); expect(f.rms).toBeLessThan(1e-6);
  });
  it("trang cong → nắn xong dòng gần thẳng", () => {
    const W = 600, H = 800, g = page(W, H, 12, 30);
    const pc = buildPageCurve(detectTextLines(g, W, H))!;
    expect(pc).not.toBeNull(); expect(pc.bend * H).toBeGreaterThan(15);
    const flat = detectTextLines(flattenGray(g, W, H, pc), W, H);
    expect(flat.length).toBe(12);
    for (const l of flat) expect(lineBend(l) * H).toBeLessThan(6);
  });
  it("quá ít dòng → không dựng", () => {
    expect(buildPageCurve([])).toBeNull();
  });
});

import { textFlattenRGBA } from "./page-curve";
describe("nắn ảnh màu theo dòng chữ", () => {
  const rgba = (g: Uint8Array) => { const d = new Uint8ClampedArray(g.length * 4); g.forEach((v, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }); return d; };
  const gray = (d: Uint8ClampedArray) => Uint8Array.from({ length: d.length / 4 }, (_, i) => d[i * 4]);
  it("trang cong được nắn thẳng", () => {
    const W = 600, H = 800, out = textFlattenRGBA(rgba(page(W, H, 12, 30)), W, H, detectTextLines);
    for (const l of detectTextLines(gray(out), W, H)) expect(lineBend(l) * H).toBeLessThan(6);
  });
  it("trang phẳng giữ nguyên", () => {
    const d = rgba(page(600, 800, 12, 0));
    expect(textFlattenRGBA(d, 600, 800, detectTextLines)).toBe(d);
  });
});

describe("ảnh thật: độ cong lộn xộn", () => {
  it("các dòng cong ngẫu nhiên đổi dấu → không nắn", () => {
    const cs = [-0.1, 0.02, 0.1, -0.03, 0.12, -0.08, 0.04];
    const L = cs.map((c, k) => ({ cover: 1, pts: Array.from({ length: 12 }, (_, i) => { const x = i / 11; return [x, 0.1 + k * 0.1 + c * (x - 0.5) ** 2] as [number, number]; }) }));
    expect(buildPageCurve(L)).toBeNull();
  });
});
