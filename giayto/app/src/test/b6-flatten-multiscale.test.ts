import { describe, expect, it } from "vitest";
import { hiResSampleSet } from "@/lib/crop-bench";
import { warpCurved } from "@/lib/dewarp";
import { flattenPixels, runJob } from "@/lib/pixels";

const W = 620, H = 877;
/** Trang tổng hợp: ánh sáng lệch 170→235, bóng tay mép sắc (−60) ở góc phải dưới, dòng chữ đều. */
function page() {
  const d = new Uint8ClampedArray(W * H * 4); const ink = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, j = p * 4;
    const isInk = x > 50 && x < 570 && y > 60 && y < 820 && y % 20 < 4 && (x % 60) < 48; ink[p] = +isInk;
    let light = 170 + 65 * (x / W) * (1 - 0.3 * (y / H));
    if (x > 380 && y > 560) light -= 60; // bóng tay
    const v = isInk ? light * 0.2 : light; d[j] = v; d[j + 1] = v * 0.98; d[j + 2] = v * 0.95; d[j + 3] = 255;
  }
  return { d, ink };
}
/** Nền giấy: điểm không phải mực, cách xa mực ≥ 3 px và cách mép bóng ≥ 12 px. */
function paperStats(d: Uint8ClampedArray, ink: Uint8Array) {
  const vals: number[] = [];
  for (let y = 8; y < H - 8; y += 3) for (let x = 8; x < W - 8; x += 3) {
    if (Math.abs(x - 380) < 12 && y > 548 || Math.abs(y - 560) < 12 && x > 368) continue;
    let near = false; for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) if (ink[(y + dy) * W + x + dx]) { near = true; break; }
    if (near) continue; const j = (y * W + x) * 4; vals.push(d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11);
  }
  vals.sort((a, b) => a - b);
  return { p5: vals[Math.floor(vals.length * 0.05)], p50: vals[vals.length >> 1], max: vals[vals.length - 1] };
}

describe("B6 chuẩn hoá nền đa tỉ lệ + Sauvola", () => {
  it("giấy lệch sáng + bóng tay: nền về 250–255, mực vẫn đậm", () => {
    const { d, ink } = page(); const out = flattenPixels(d, W, H); const s = paperStats(out, ink);
    expect(s.p5).toBeGreaterThanOrEqual(250); expect(s.max).toBeLessThanOrEqual(255);
    let sum = 0, n = 0; for (let p = 0; p < W * H; p++) if (ink[p]) { sum += out[p * 4]; n++; }
    expect(sum / n).toBeLessThan(90);
  });
  it("bộ đo B3 (trang nắn thật): trung vị nền giấy ≥ 250", () => {
    const set = hiResSampleSet();
    for (let i = 0; i < 4; i++) {
      const sm = set[i]; const q = sm.truth.map(([x, y]) => [x * sm.w, y * sm.h] as [number, number]);
      const out = flattenPixels(warpCurved(new Uint8ClampedArray(sm.rgba), sm.w, sm.h, q, W, H, []), W, H);
      const v: number[] = []; for (let y = 20; y < H - 20; y += 4) for (let x = 20; x < W - 20; x += 4) { const j = (y * W + x) * 4; v.push(out[j] * 0.3 + out[j + 1] * 0.59 + out[j + 2] * 0.11); }
      v.sort((a, b) => a - b); expect(v[v.length >> 1], sm.name).toBeGreaterThanOrEqual(250);
    }
  }, 120_000);
  it("Đen trắng (Sauvola sau chuẩn hoá): vùng bóng tay không thành mảng đen", () => {
    const { d, ink } = page(); const out = runJob({ op: "threshold", d, W, H, ink: false });
    let black = 0, n = 0, inkBlack = 0, ni = 0;
    for (let y = 600; y < 860; y++) for (let x = 400; x < 610; x++) { const p = y * W + x; if (ink[p]) { ni++; if (out[p * 4] === 0) inkBlack++; } else { n++; if (out[p * 4] === 0) black++; } }
    expect(black / n).toBeLessThan(0.02);
    expect(inkBlack / ni).toBeGreaterThan(0.8);
  });
});
