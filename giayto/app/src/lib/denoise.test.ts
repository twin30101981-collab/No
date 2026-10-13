import { describe, it, expect } from "vitest";
import { denoise, noiseLevel } from "./denoise";

function img(w: number, h: number, f: (x: number, y: number, k: number) => number) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { for (let k = 0; k < 3; k++) d[(y * w + x) * 4 + k] = f(x, y, k); d[(y * w + x) * 4 + 3] = 255; }
  return d;
}
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) - 0.5;

describe("denoise", () => {
  it("giảm nhiễu sáng và nhiễu màu", () => {
    const d = img(48, 48, () => 160 + rnd() * 40);
    const o = denoise(d, 48, 48);
    expect(noiseLevel(o, 48, 48)).toBeLessThan(noiseLevel(d, 48, 48) * 0.5);
  });
  it("giữ cạnh chữ đen", () => {
    const d = img(40, 40, (x) => (x >= 18 && x < 22 ? 10 : 245));
    const o = denoise(d, 40, 40);
    expect(o[(20 * 40 + 19) * 4]).toBeLessThan(40);
    expect(o[(20 * 40 + 8) * 4]).toBeGreaterThan(235);
  });
  it("giữ màu đồng nhất", () => {
    const o = denoise(img(16, 16, (_x, _y, k) => [200, 40, 40][k]), 16, 16);
    expect(Math.abs(o[0] - 200)).toBeLessThan(3); expect(Math.abs(o[1] - 40)).toBeLessThan(3);
  });
});
