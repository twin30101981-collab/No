import { describe, expect, it } from "vitest";
import { extractInk } from "./signature-photo";

function img(w: number, h: number, f: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y); d.set([r, g, b, 255], (y * w + x) * 4); }
  return d;
}

describe("signature from photo", () => {
  it("makes paper transparent and keeps ink opaque", () => {
    const d = img(48, 48, (x) => (x >= 20 && x < 24 ? [20, 40, 160] : [235, 235, 230]));
    extractInk(d, 48, 48);
    expect(d[(10 * 48 + 5) * 4 + 3]).toBe(0);
    expect(d[(10 * 48 + 21) * 4 + 3]).toBe(255);
  });
  it("keeps the blue ink hue", () => {
    const d = img(48, 48, (x) => (x === 21 ? [20, 40, 160] : [240, 240, 240]));
    extractInk(d, 48, 48); const i = (5 * 48 + 21) * 4;
    expect(d[i + 2]).toBeGreaterThan(d[i] * 3);
  });
  it("ignores a soft shadow across the paper", () => {
    const d = img(96, 48, (x) => { const v = 240 - x * 0.6; return [v, v, v]; });
    extractInk(d, 96, 48);
    let max = 0; for (let i = 3; i < d.length; i += 4) max = Math.max(max, d[i]);
    expect(max).toBe(0);
  });
});
