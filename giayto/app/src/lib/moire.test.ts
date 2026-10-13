import { describe, it, expect } from "vitest";
import { moireScore, removeMoire, type Rgba } from "./moire";

function make(w: number, h: number, f: (x: number, y: number) => [number, number, number]): Rgba {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y), p = (y * w + x) * 4; d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255; }
  return { data: d, width: w, height: h };
}

describe("moire", () => {
  it("giảm mạnh sọc màu lặp lại", () => {
    const img = make(64, 64, (x, y) => ((x + y) % 4 < 2 ? [230, 200, 230] : [200, 230, 200]));
    const before = moireScore(img), after = moireScore(removeMoire(img));
    expect(before).toBeGreaterThan(5);
    expect(after).toBeLessThan(before * 0.3);
  });
  it("giữ nét chữ đen trên nền trắng", () => {
    const img = make(40, 40, (x) => (x >= 18 && x < 22 ? [0, 0, 0] : [255, 255, 255]));
    const out = removeMoire(img);
    expect(out.data[(20 * 40 + 19) * 4]).toBeLessThan(40);
    expect(out.data[(20 * 40 + 5) * 4]).toBeGreaterThan(240);
  });
  it("ảnh không vân gần như không đổi", () => {
    const img = make(32, 32, () => [180, 180, 180]);
    expect(moireScore(img)).toBeLessThan(0.5);
    expect(Math.abs(removeMoire(img).data[0] - 180)).toBeLessThan(2);
  });
});
