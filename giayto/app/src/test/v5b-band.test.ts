import { describe, it, expect } from "vitest";
import { paperMaskFill } from "@/lib/paper-mask";

function page(W: number, H: number) {
  const d = new Uint8ClampedArray(W * H * 4).fill(235);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; d[i + 3] = 255;
    if (x < 6 + (y % 7) || y < 4) d[i] = d[i + 1] = d[i + 2] = 40; // nêm nền tối ở mép
    if (x > 100 && x < 110 && y > 100 && y < 140) d[i] = d[i + 1] = d[i + 2] = 20; // chữ giữa trang
  }
  return d;
}

describe("V5b – mặt nạ giấy chỉ quét dải viền", () => {
  it("xoá nêm tối ở mép", () => {
    const d = paperMaskFill(page(300, 400), 300, 400);
    expect(d[(200 * 300 + 2) * 4]).toBeGreaterThan(200);
  });
  it("không động vào chữ giữa trang", () => {
    const d = paperMaskFill(page(300, 400), 300, 400);
    expect(d[(120 * 300 + 105) * 4]).toBe(20);
  });
});
