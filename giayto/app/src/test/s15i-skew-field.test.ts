import { describe, it, expect } from "vitest";
import { lineSkewMap } from "@/lib/line-skew";
import { fitSkewField, fieldAngle, smoothSkewCorrect, pageSkewScore } from "@/lib/skew-field";

// dòng chữ có góc thay đổi mượt theo y (trên degT → dưới degB) và theo x (cong ±bend)
function page(W: number, H: number, degT: number, degB: number, bend = 0) {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y0 = 50; y0 < H - 50; y0 += 24) {
    const t = y0 / H, base = degT + (degB - degT) * t;
    let yc = y0;
    for (let x = W >> 1; x < W - 30; x++) draw(x, (yc += Math.tan(((base + bend) * Math.PI) / 180)));
    yc = y0;
    for (let x = (W >> 1) - 1; x >= 30; x--) draw(x, (yc -= Math.tan(((base - bend) * Math.PI) / 180)));
  }
  function draw(x: number, yc: number) {
    if ((x >> 3) % 5 === 4) return;
    const y = Math.round(yc);
    for (let k = 0; k < 6; k++) { if (y + k < 0 || y + k >= H) continue; const i = ((y + k) * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
  }
  return d;
}
const gray = (d: Uint8ClampedArray) => { const g = new Uint8Array(d.length / 4); for (let i = 0; i < g.length; i++) g[i] = d[i * 4]; return g; };

describe("S15i trường cong mượt toàn trang", () => {
  it("khớp lại góc tăng dần theo chiều dọc", () => {
    const W = 800, H = 1100, d = page(W, H, 0, 1.5);
    const f = fitSkewField(lineSkewMap(gray(d), W, H).cells, W, H)!;
    expect(f).not.toBeNull();
    expect(fieldAngle(f, 0, 0.35)).toBeGreaterThan(fieldAngle(f, 0, -0.35) + 0.5);
  });
  it("nắn giảm điểm toàn trang, không bậc thang (cả trên lẫn dưới)", () => {
    const W = 800, H = 1100, d = page(W, H, -0.75, 1.25, 0.25);
    const r = smoothSkewCorrect(d, W, H);
    expect(r.applied).toBe(true);
    expect(r.after).toBeLessThan(r.before);
    expect(pageSkewScore(lineSkewMap(gray(r.data), W, H))).toBeLessThanOrEqual(1);
  });
  it("trang thẳng giữ nguyên từng điểm ảnh", () => {
    const W = 600, H = 800, d = page(W, H, 0, 0);
    const r = smoothSkewCorrect(d, W, H);
    expect(r.applied).toBe(false);
    let diff = 0; for (let i = 0; i < d.length; i++) if (r.data[i] !== d[i]) diff++;
    expect(diff).toBe(0);
  });
  it("loại ô lệch lẻ loi (tiêu đề/bảng) khỏi trường", () => {
    const cells = [] as { band: number; side: 0 | 1; angle: number; ink: number }[];
    for (let b = 0; b < 6; b++) for (const side of [0, 1] as const) cells.push({ band: b, side, angle: 0.5, ink: 400 });
    cells[0].angle = -2.5;
    const f = fitSkewField(cells, 800, 1100)!;
    expect(f.dropped).toBe(1);
    expect(Math.abs(fieldAngle(f, -0.2, -0.35) - 0.5)).toBeLessThan(0.1);
  });
});
