import { describe, it, expect } from "vitest";
import { flattenApply, flattenMap, type BgMap, type FlattenMaps } from "../pixels";

type Px = Uint8ClampedArray;

/**
 * Bản tham chiếu cũ của flattenApply (trước V6 tách trục), giữ nguyên trong kiểm
 * thử để canh hồi quy — không còn nằm trong mã chạy thật (pixels.ts).
 */
function sampleBgRef(m: BgMap, W: number, H: number, x: number, y: number, k: number) {
  const bw = W / m.sw, bh = H / m.sh;
  const u = Math.min(m.sw - 1.001, Math.max(0, (x + 0.5) / bw - 0.5)), v = Math.min(m.sh - 1.001, Math.max(0, (y + 0.5) / bh - 0.5));
  const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0, s = m.small;
  const i00 = (v0 * m.sw + u0) * 3 + k, i10 = i00 + 3, i01 = i00 + m.sw * 3, i11 = i01 + 3;
  return (s[i00] * (1 - fu) + s[i10] * fu) * (1 - fv) + (s[i01] * (1 - fu) + s[i11] * fu) * fv;
}
function flattenApplyRef(d: Px, W: number, H: number, maps: FlattenMaps) {
  const { coarse, fine } = maps;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) {
      let bg = sampleBgRef(coarse, W, H, x, y, k);
      if (fine) { const f = sampleBgRef(fine, W, H, x, y, k); if (f >= bg * 0.6) bg = f; }
      const v = (d[o + k] * 253) / Math.max(40, bg);
      d[o + k] = v >= 235 ? Math.min(255, 250 + (v - 235) * 0.3) : Math.min(255, v + Math.max(0, (v - 200) / 35) * 15);
    }
  }
  return d;
}

function img(W: number, H: number) {
  const d = new Uint8ClampedArray(W * H * 4);
  let s = 7;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const shade = 180 + 60 * (x / W) - 40 * (y / H);
    const ink = (x % 37 < 3 && y % 23 < 15) ? 120 : 0;
    const i = (y * W + x) * 4;
    d[i] = shade - ink + (s % 9); d[i + 1] = shade - ink - 5; d[i + 2] = shade - ink - 10; d[i + 3] = 255;
  }
  return d;
}

describe("Hồi quy V6 flattenApply tách trục", () => {
  it("giống bản cũ (≤1 mức) và nhanh hơn", () => {
    const W = 1240, H = 1754, src = img(W, H);
    const maps = flattenMap(src, W, H);
    const a = src.slice(), b = src.slice();
    let t = performance.now(); flattenApplyRef(a, W, H, maps); const tRef = performance.now() - t;
    t = performance.now(); flattenApply(b, W, H, maps); const tNew = performance.now() - t;
    let maxDiff = 0;
    for (let i = 0; i < a.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a[i] - b[i]));
    console.log(`V6 flatten-apply ${W}x${H}: cũ ${tRef.toFixed(0)} ms → mới ${tNew.toFixed(0)} ms, lệch tối đa ${maxDiff}`);
    expect(maxDiff).toBeLessThanOrEqual(1);
    expect(tNew).toBeLessThan(tRef);
  });
});
