import { describe, expect, it } from "vitest";
import { detectFromRgba, detectPaperGray, detectSize, rgbaToGray } from "../detect";

function sheet(w: number, h: number) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inside = x > w * 0.2 && x < w * 0.8 && y > h * 0.15 && y < h * 0.85;
    const v = inside ? 235 : 60; const i = (y * w + x) * 4;
    d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
}

describe("Hồi quy V7 dò khung trong Worker", () => {
  it("detectFromRgba cho kết quả giống hệt đường cũ (xám → detectPaperGray)", () => {
    const w = 240, h = 320, d = sheet(w, h);
    const g = new Float32Array(w * h);
    for (let i = 0; i < g.length; i++) g[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
    expect(rgbaToGray(d, w * h)).toEqual(g);
    const a = detectFromRgba(d, w, h, false), b = detectPaperGray(g, w, h, false);
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });
  it("kích thước bản dò 320 px từ khung 1280×720", () => {
    expect(detectSize(1280, 720, 320)).toEqual({ w: 320, h: 180 });
  });
});
