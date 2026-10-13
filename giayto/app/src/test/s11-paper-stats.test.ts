import { describe, it, expect } from "vitest";
import { paperStats } from "@/lib/paper-stats";
describe("S11 paperStats", () => {
  it("đo trung vị giấy, bỏ qua mực", () => {
    const W = 300, H = 300, d = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { const v = (i % W) < 150 ? 230 : 250; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    for (let y = 100; y < 110; y++) for (let x = 20; x < 280; x++) { const k = (y * W + x) * 4; d[k] = d[k + 1] = d[k + 2] = 10; }
    const s = paperStats(d, W, H);
    expect(s.median).toBeGreaterThanOrEqual(230); expect(s.median).toBeLessThanOrEqual(250);
    expect(s.p10).toBe(230); expect(s.p90).toBe(250); expect(s.frac).toBeGreaterThan(0.8);
  });
});
