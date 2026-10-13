import { describe, it, expect } from "vitest";
import { classifyInk, removeHandwriting, HAND, PRINT, PAPER } from "./handwriting-ink";

function page(paper = [245, 240, 225]) {
  const W = 60, H = 40, d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let c = paper;
    if (y >= 5 && y < 8) c = [25, 25, 30];             // dòng in đen
    else if (y >= 15 && y < 18 && x < 30) c = [30, 60, 190]; // bút bi xanh
    else if (y >= 25 && y < 28 && x >= 30) c = [200, 30, 40]; // bút đỏ
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  return { data: d, width: W, height: H };
}

describe("handwriting-ink", () => {
  it("tách mực in đen và nét viết tay xanh/đỏ trên giấy ngả vàng", () => {
    const img = page(), { mask } = classifyInk(img), W = img.width;
    expect(mask[6 * W + 10]).toBe(PRINT);
    expect(mask[16 * W + 10]).toBe(HAND);
    expect(mask[26 * W + 40]).toBe(HAND);
    expect(mask[35 * W + 5]).toBe(PAPER); // giấy vàng không bị coi là mực màu
  });

  it("xóa nét viết tay về màu giấy, giữ nguyên mực in", () => {
    const img = page(), out = removeHandwriting(img), W = img.width;
    const at = (x: number, y: number) => Array.from(out.data.slice((y * W + x) * 4, (y * W + x) * 4 + 3));
    expect(out.removed).toBeGreaterThan(150);
    at(10, 16).forEach((v, k) => expect(Math.abs(v - [245, 240, 225][k])).toBeLessThan(6));
    expect(at(10, 6)).toEqual([25, 25, 30]);
  });

  it("chỉ xóa màu được chọn", () => {
    const img = page(), { mask } = classifyInk(img, { hues: ["blue"] }), W = img.width;
    expect(mask[16 * W + 10]).toBe(HAND);
    expect(mask[26 * W + 40]).not.toBe(HAND);
  });
});
