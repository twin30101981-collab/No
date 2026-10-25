import { describe, it, expect } from "vitest";
import { edgeLineClean } from "@/lib/paper-mask";
const mk = (W: number, H: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(240); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
const put = (d: Uint8ClampedArray, W: number, x: number, y: number) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = 20; };
describe("S10f edgeLineClean", () => {
  it("xoá vệt dọc mảnh sát mép trái, giữ chữ", () => {
    const W = 400, H = 500, d = mk(W, H);
    for (let y = 50; y < 300; y++) for (let x = 12; x < 14; x++) put(d, W, x + ((y / 100) | 0), y);
    for (let y = 100; y < 112; y++) for (let x = 20; x < 23; x++) put(d, W, x, y); // nét chữ "l" ngắn
    for (let y = 200; y < 210; y++) for (let x = 150; x < 250; x++) put(d, W, x, y); // nội dung giữa trang
    edgeLineClean(d, W, H);
    expect(d[(150 * W + 13) * 4]).toBe(240);
    expect(d[(105 * W + 21) * 4]).toBe(20);
    expect(d[(205 * W + 200) * 4]).toBe(20);
  });
});
