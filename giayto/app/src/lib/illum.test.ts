import { describe, it, expect } from "vitest";
import { estimateIllumination, removeShadow, shadowCoverage, illumAt } from "./illum";

/** Trang giấy 240 có dòng chữ đen, nửa phải bị bóng ×0.5. */
function page(W = 200, H = 160, shade = 0.5, color: [number, number, number] = [20, 20, 20]) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ink = y % 20 < 3 && x % 7 < 4;
    const f = x >= W / 2 ? shade : 1;
    const i = (y * W + x) * 4;
    const base = ink ? color : [240, 240, 240];
    for (let k = 0; k < 3; k++) d[i + k] = base[k] * f;
    d[i + 3] = 255;
  }
  return d;
}
const px = (d: Uint8ClampedArray, W: number, x: number, y: number) => d[(y * W + x) * 4];

describe("illum (G2-01)", () => {
  it("ước lượng đúng mức chiếu sáng hai vùng, bỏ qua nét chữ", () => {
    const W = 200, H = 160, d = page(W, H);
    const m = estimateIllumination(d, W, H);
    expect(illumAt(m, 20, 80)).toBeGreaterThan(225);
    expect(Math.abs(illumAt(m, 180, 80) - 120)).toBeLessThan(15);
    expect(shadowCoverage(m)).toBeGreaterThan(0.3);
  });

  it("khử bóng: giấy hai nửa đồng đều, chữ vẫn tối", () => {
    const W = 200, H = 160, d = page(W, H);
    removeShadow(d, W, H);
    const left = px(d, W, 10, 10), right = px(d, W, 190, 10);
    expect(Math.abs(left - right)).toBeLessThan(12);
    expect(right).toBeGreaterThan(225);
    expect(px(d, W, 182, 1)).toBeLessThan(80); // nét chữ trong vùng bóng
  });

  it("giữ màu mực (tỉ lệ RGB) và ảnh không bóng gần như không đổi", () => {
    const W = 200, H = 160, d = page(W, H, 0.5, [30, 60, 160]);
    removeShadow(d, W, H);
    const i = (1 * W + 183) * 4; // nét chữ xanh trong vùng bóng
    expect(d[i + 2]).toBeGreaterThan(d[i] * 3);
    const flat = page(W, H, 1), before = flat.slice();
    removeShadow(flat, W, H);
    expect(Math.abs(flat[(10 * W + 10) * 4] - before[(10 * W + 10) * 4])).toBeLessThan(8);
    expect(shadowCoverage(estimateIllumination(before, W, H))).toBeLessThan(0.05);
  });
});

describe("deshadow (G2-02)", () => {
  it("bóng tay đậm ở góc: giấy về trắng, chữ trong bóng vẫn đen", async () => {
    const { deshadowPixels } = await import("./illum");
    const W = 240, H = 200, d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ink = y % 20 < 3 && x % 7 < 4, f = x > 140 && y > 100 ? 0.35 : 1, i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = (ink ? 20 : 235) * f; d[i + 3] = 255;
    }
    deshadowPixels(d, W, H);
    expect(d[(150 * W + 230) * 4]).toBeGreaterThan(225); // giấy trong bóng (y=150 không phải chữ)
    expect(d[(160 * W + 224) * 4]).toBeLessThan(90);     // chữ trong bóng (224%7=0, 160%20=0)
    expect(d[(50 * W + 50) * 4]).toBe(255);
  });
});
