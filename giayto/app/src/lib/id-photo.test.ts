import { describe, expect, it } from "vitest";
import { coverage, floodMask, greenKeyMask, greenness } from "./id-photo";

function img(w: number, h: number, f: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; const [r, g, b] = f(x, y); d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255; }
  return d;
}
const inBox = (x: number, y: number) => x >= 8 && x < 24 && y >= 6 && y < 32;

describe("id-photo", () => {
  it("greenness phân biệt nền xanh với da/áo", () => {
    expect(greenness(0, 255, 0)).toBe(1);
    expect(greenness(220, 170, 140)).toBe(0); // da
    expect(greenness(60, 120, 60)).toBeGreaterThan(0); // xanh pha (mép)
  });

  it("khoá màu xanh giữ người, bỏ nền và đốm nhiễu, khử ánh xanh", () => {
    const d = img(32, 32, (x, y) => (inBox(x, y) ? [200, 150, 120] : (x === 2 && y === 2 ? [90, 60, 50] : [0, 255, 0])));
    const m = greenKeyMask(d, 32, 32);
    expect(m.a[10 * 32 + 15]).toBe(255);
    expect(m.a[0]).toBe(0);
    expect(m.a[2 * 32 + 2]).toBe(0); // đốm rời bị bỏ
    expect(coverage(m)).toBeCloseTo((16 * 26) / 1024, 1);
    expect(d[1]).toBeLessThanOrEqual(d[0]); // nền đã khử xanh
  });

  it("dự phòng loang màu viền tách người trên nền tường phẳng", () => {
    const d = img(32, 32, (x, y) => (inBox(x, y) ? [40, 40, 60] : [235 + (x % 3), 232, 228]));
    const m = floodMask(d, 32, 32);
    expect(m.a[15 * 32 + 15]).toBe(255);
    expect(m.a[1 * 32 + 1]).toBe(0);
    expect(coverage(m)).toBeGreaterThan(0.3);
    expect(coverage(m)).toBeLessThan(0.5);
  });
});
