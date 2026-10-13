import { describe, it, expect } from "vitest";
import { greyBlockLift } from "@/lib/paper-mask";


function page(W: number, H: number, seed = 1) {
  let s = seed; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { const v = 230 + rnd() * 10; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  for (let y = 300; y < 500; y++) for (let x = 200; x < 450; x++) { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 200; } // mảng xám
  for (let y = 380; y < 390; y++) for (let x = 250; x < 350; x++) { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 30; } // chữ trong mảng
  return d;
}

describe("V5c – greyBlockLift lọc trượt nhanh", () => {
  it("nâng mảng xám về màu giấy", () => {
    const W = 600, H = 800, d = greyBlockLift(page(W, H), W, H);
    expect(d[(320 * W + 220) * 4]).toBeGreaterThan(225);
  });
  it("giữ chữ tối trong mảng", () => {
    const W = 600, H = 800, d = greyBlockLift(page(W, H), W, H);
    expect(d[(385 * W + 300) * 4]).toBeLessThan(80);
  });
});
