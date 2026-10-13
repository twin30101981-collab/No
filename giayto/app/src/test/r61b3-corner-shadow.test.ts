import { describe, it, expect } from "vitest";
import { cornerShadowLift } from "@/lib/paper-mask";
const mk = (W: number, H: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(240); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
const put = (d: Uint8ClampedArray, W: number, x: number, y: number, v = 15) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; };
describe("R6.1b-3 cornerShadowLift", () => {
  it("nâng bóng nền chạm mép và khối đen đặc ở góc, giữ nét mảnh không chạm mép và vệt ở giữa mép", () => {
    const W = 600, H = 800, d = mk(W, H);
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) put(d, W, x, y); // bóng nền góc trên trái, chạm mép
    for (let y = 10; y < 30; y++) { put(d, W, 512, y + 700); put(d, W, 513, y + 700); put(d, W, 524, y + 700); put(d, W, 525, y + 700); } // nét mảnh góc dưới phải, KHÔNG chạm mép, không đặc
    for (let y = 8; y < 28; y++) for (let x = 570; x < 590; x++) put(d, W, x, y); // khối đen đặc góc trên phải, KHÔNG chạm mép
    for (let y = 400; y < 420; y++) for (let x = 0; x < 20; x++) put(d, W, x, y); // vệt chạm mép nhưng giữa ảnh (không phải góc)
    cornerShadowLift(d, W, H);
    expect(d[(10 * W + 10) * 4]).toBe(240); // bóng góc đã nâng
    expect(d[(715 * W + 512) * 4]).toBe(15); // nét mảnh không chạm mép giữ nguyên
    expect(d[(18 * W + 580) * 4]).toBe(240); // khối đen đặc ở góc đã bị tô giấy
    expect(d[(410 * W + 10) * 4]).toBe(15); // vệt giữa mép giữ nguyên
  });
});
