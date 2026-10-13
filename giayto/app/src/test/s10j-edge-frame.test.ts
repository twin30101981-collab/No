import { describe, it, expect } from "vitest";
import { edgeFrameClean, greyBlockLift } from "@/lib/paper-mask";
const mk = (W: number, H: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(250); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
const put = (d: Uint8ClampedArray, W: number, x: number, y: number, v = 20) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; };
describe("S10j", () => {
  it("xoá khung xám mảnh dọc mép trái, giữ chân dòng chữ", () => {
    const W = 600, H = 800, d = mk(W, H);
    for (let y = 300; y < 700; y++) put(d, W, 30, y, 200);
    for (let x = 100; x < 500; x++) for (let y = 40; y < 52; y++) put(d, W, x, y, 30);
    edgeFrameClean(d, W, H);
    expect(d[(500 * W + 30) * 4]).toBeGreaterThan(240);
    expect(d[(51 * W + 300) * 4]).toBe(30);
  });
  it("xoá vạch liền thẳng gần dọc sát mép", () => {
    const W = 600, H = 800, d = mk(W, H);
    for (let y = 600; y < 700; y++) { put(d, W, 40 + ((y - 600) >> 4), y); put(d, W, 41 + ((y - 600) >> 4), y); }
    edgeFrameClean(d, W, H);
    expect(d[(650 * W + 43) * 4]).toBeGreaterThan(240);
  });
  it("nâng mảng xám phẳng, chữ vẫn tối", () => {
    const W = 600, H = 800, d = mk(W, H);
    for (let y = 300; y < 500; y++) for (let x = 200; x < 400; x++) put(d, W, x, y, 205);
    for (let y = 390; y < 396; y++) for (let x = 250; x < 300; x++) put(d, W, x, y, 30);
    greyBlockLift(d, W, H);
    expect(d[(350 * W + 350) * 4]).toBeGreaterThan(240);
    expect(d[(392 * W + 270) * 4]).toBeLessThan(60);
  });
});
