import { describe, it, expect } from "vitest";
import { edgeStrokeClean } from "@/lib/paper-mask";
const mk = (W: number, H: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(240); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
const put = (d: Uint8ClampedArray, W: number, x: number, y: number, v = 20) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; };
describe("S10i edgeStrokeClean", () => {
  it("xoá vệt đứt nét xiên ~65° sát mép phải", () => {
    const W = 600, H = 800, d = mk(W, H);
    const ux = Math.cos((65 * Math.PI) / 180), uy = Math.sin((65 * Math.PI) / 180);
    for (let s = 0; s < 260; s += 16) for (let t = 0; t < 9; t++) { const x = Math.round(520 + (s + t) * ux), y = Math.round(200 + (s + t) * uy); put(d, W, x, y, 120); put(d, W, x + 1, y, 120); }
    edgeStrokeClean(d, W, H);
    expect(d[(200 * W + 520) * 4]).toBe(240);
  });
  it("giữ dòng chấm '.....' và cột chữ sát mép", () => {
    const W = 600, H = 800, d = mk(W, H);
    for (let r = 0; r < 4; r++) for (let x = 500; x < 595; x += 6) { put(d, W, x, 400 + r * 30); put(d, W, x + 1, 400 + r * 30); }
    for (let r = 0; r < 10; r++) for (let y = 0; y < 12; y++) for (const x of [20, 26, 34, 40]) put(d, W, x, 100 + r * 30 + y);
    edgeStrokeClean(d, W, H);
    expect(d[(400 * W + 500) * 4]).toBe(20);
    expect(d[(130 * W + 20) * 4]).toBe(20);
  });
});
