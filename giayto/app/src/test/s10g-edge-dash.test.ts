import { describe, it, expect } from "vitest";
import { edgeDashClean } from "@/lib/paper-mask";
const mk = (W: number, H: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(240); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
const put = (d: Uint8ClampedArray, W: number, x: number, y: number) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = 20; };
describe("S10g edgeDashClean", () => {
  it("xoá vệt đứt nét thẳng hàng sát mép, giữ chữ lệch cột", () => {
    const W = 400, H = 500, d = mk(W, H);
    for (let y = 50; y < 300; y += 12) for (let t = 0; t < 7; t++) put(d, W, 10, y + t);
    for (let y = 100; y < 110; y++) put(d, W, 25, y);
    edgeDashClean(d, W, H);
    expect(d[(52 * W + 10) * 4]).toBe(240);
    expect(d[(105 * W + 25) * 4]).toBe(20);
  });
  it("S10h: vệt xám nhạt, xiên, ở ~10 % từ mép vẫn bị xoá; chữ cạnh nhau giữ", () => {
    const W = 400, H = 500, d = mk(W, H);
    const grey = (x: number, y: number) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = 200; };
    for (let y = 60; y < 360; y += 14) for (let t = 0; t < 10; t++) { const x = 40 + Math.round((y + t - 60) * 0.025); grey(x, y + t); grey(x + 1, y + t); }
    for (let y = 400; y < 410; y++) for (const x of [30, 34, 38, 42]) put(d, W, x, y);
    edgeDashClean(d, W, H);
    expect(d[(66 * W + 40) * 4]).toBe(240);
    expect(d[(298 * W + 46) * 4]).toBe(240);
    expect(d[(405 * W + 34) * 4]).toBe(20);
  });
});
