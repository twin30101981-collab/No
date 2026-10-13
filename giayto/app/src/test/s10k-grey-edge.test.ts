import { describe, it, expect } from "vitest";
import { greyBlockLift } from "@/lib/paper-mask";
const mk = (W: number, H: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(250); for (let i = 3; i < d.length; i += 4) d[i] = 255; return d; };
const put = (d: Uint8ClampedArray, W: number, x: number, y: number, v: number) => { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; };
describe("S10k", () => {
  it("không để lại đường mép sắc ở cạnh mảng xám (mép lẻ)", () => {
    const W = 600, H = 800, d = mk(W, H);
    for (let y = 300; y < 500; y++) for (let x = 201; x < 401; x++) put(d, W, x, y, x === 201 ? 195 : 212);
    greyBlockLift(d, W, H);
    for (const x of [201, 202, 300, 399, 400]) expect(d[(400 * W + x) * 4]).toBeGreaterThan(235);
    expect(d[(400 * W + 150) * 4]).toBeGreaterThanOrEqual(250);
  });
});
