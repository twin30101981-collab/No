import { describe, it, expect } from "vitest";
import { edgeCornerClean } from "@/lib/paper-mask";
const mk = (W: number, H: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(240); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
const put = (d: Uint8ClampedArray, W: number, x: number, y: number, v = 20) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; };
describe("S10m edgeCornerClean", () => {
  it("xoá dấu tick góc trên phải và vạch nhạt góc dưới trái, giữ chữ", () => {
    const W = 600, H = 800, d = mk(W, H);
    for (let x = 540; x < 570; x++) { put(d, W, x, 20 + ((570 - x) / 3) | 0); put(d, W, x, 21 + ((570 - x) / 3) | 0); }
    for (let y = 720; y < 780; y++) put(d, W, 30, y, 200);
    for (let y = 200; y < 210; y++) for (let x = 200; x < 400; x++) put(d, W, x, y);
    for (let y = 30; y < 60; y++) for (let x = 30; x < 70; x++) put(d, W, x, y); // khối chữ ở góc (dày) giữ nguyên
    edgeCornerClean(d, W, H);
    expect(d[(20 * W + 569) * 4]).toBe(240);
    expect(d[(750 * W + 30) * 4]).toBe(240);
    expect(d[(205 * W + 300) * 4]).toBe(20);
    expect(d[(45 * W + 50) * 4]).toBe(20);
  });
});
