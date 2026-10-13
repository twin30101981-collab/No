import { describe, expect, it } from "vitest";
import { sharpnessRgba, glareRgba } from "./detect";

function rgba(w: number, h: number, fill: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fill(x, y); const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  return d;
}

describe("B09 — đo nét/lóa trên RGBA (chạy trong Worker)", () => {
  it("ảnh nhiều chi tiết nét hơn ảnh phẳng", () => {
    const w = 64, h = 64;
    const flat = rgba(w, h, () => [128, 128, 128]);
    const detail = rgba(w, h, (x, y) => ((x + y) % 2 ? [255, 255, 255] : [0, 0, 0]));
    expect(sharpnessRgba(detail, w, h)).toBeGreaterThan(sharpnessRgba(flat, w, h));
    expect(sharpnessRgba(flat, w, h)).toBe(0);
  });

  it("vùng cháy sáng được tính là lóa", () => {
    const w = 32, h = 32;
    const normal = rgba(w, h, () => [120, 120, 120]);
    const blown = rgba(w, h, (x) => (x < 16 ? [255, 255, 255] : [120, 120, 120]));
    expect(glareRgba(normal, w, h)).toBe(0);
    expect(glareRgba(blown, w, h)).toBeCloseTo(0.5, 5);
  });

  it("chỉ đo trong khung giấy khi có quad", () => {
    const w = 32, h = 32;
    // nửa trái cháy sáng, nửa phải bình thường; quad chỉ phủ nửa phải
    const d = rgba(w, h, (x) => (x < 16 ? [255, 255, 255] : [120, 120, 120]));
    const quad: [number, number][] = [[0.5, 0], [1, 0], [1, 1], [0.5, 1]];
    expect(glareRgba(d, w, h, quad)).toBe(0);
  });
});
