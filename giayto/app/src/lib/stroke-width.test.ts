import { describe, it, expect } from "vitest";
import { measureStrokes, dominantWidth, oddWidthMask, cleanSheet } from "./stroke-width";

const W = 80, H = 60;
function inkMap(rects: Array<[number, number, number, number]>) {
  const m = new Uint8Array(W * H);
  for (const [x0, y0, x1, y1] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * W + x] = 1;
  return m;
}
// 4 nét in dày 3px, 1 nét viết tay dày 9px (bút dạ)
const rects: Array<[number, number, number, number]> = [[2, 2, 40, 5], [2, 10, 40, 13], [2, 18, 40, 21], [2, 26, 40, 29], [45, 40, 75, 49]];

describe("stroke-width", () => {
  it("đo độ dày từng nét và lấy độ dày chủ đạo theo chữ in", () => {
    const { strokes } = measureStrokes(inkMap(rects.slice(0, 4)), W, H);
    expect(strokes).toHaveLength(4);
    strokes.forEach((s) => expect(s.width).toBe(3));
    expect(dominantWidth(strokes)).toBe(3);
  });

  it("đánh dấu nét dày khác thường, giữ nét in", () => {
    const { mask, refWidth } = oddWidthMask(inkMap(rects), W, H);
    expect(refWidth).toBe(3);
    expect(mask[44 * W + 60]).toBe(1);
    expect(mask[3 * W + 10]).toBe(0);
  });

  it("bản đề sạch xóa nét viết tay đen dày, giữ chữ in", () => {
    const d = new Uint8ClampedArray(W * H * 4), m = inkMap(rects);
    for (let p = 0; p < W * H; p++) { const v = m[p] ? 20 : 240; d.set([v, v, v, 255], p * 4); }
    const out = cleanSheet({ data: d, width: W, height: H });
    expect(out.data[(44 * W + 60) * 4]).toBeGreaterThan(230);
    expect(out.data[(3 * W + 10) * 4]).toBe(20);
  });
});

describe("handMask", () => {
  it("trả về null khi trang chỉ có chữ in", async () => {
    const { handMask } = await import("./stroke-width");
    const d = new Uint8ClampedArray(W * H * 4), m = inkMap(rects.slice(0, 4));
    for (let p = 0; p < W * H; p++) { const v = m[p] ? 20 : 240; d.set([v, v, v, 255], p * 4); }
    expect(handMask({ data: d, width: W, height: H })).toBeNull();
  });
});
