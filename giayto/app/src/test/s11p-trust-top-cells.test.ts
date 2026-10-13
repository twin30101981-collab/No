import { describe, it, expect } from "vitest";
import { trustTopCells, type SkewCell } from "@/lib/line-skew";

const c = (band: number, side: 0 | 1, angle: number, ink: number): SkewCell => ({ band, side, angle, ink });

describe("S11p trustTopCells", () => {
  it("ô ít mực khớp góc ô cùng bên dải kề được tin", () => {
    const r = trustTopCells([c(0, 1, -1.5, 300), c(1, 1, -1.25, 84), c(2, 1, 0, 40)], 3);
    expect(r[1].ink).toBeGreaterThanOrEqual(150);
    expect(r[2].ink).toBe(0);
  });
  it("lệch góc > 0,75° hoặc khác bên thì bỏ", () => {
    const r = trustTopCells([c(0, 0, -1.5, 300), c(1, 1, -1.5, 84), c(0, 1, 0.5, 300), c(2, 1, -1.5, 90)], 3);
    expect(r[1].ink).toBe(0);
    expect(r[3].ink).toBe(0);
  });
  it("ô dưới 60 mực và nửa dưới không bị đổi", () => {
    const r = trustTopCells([c(0, 1, -1, 300), c(1, 1, -1, 59), c(4, 1, -1, 10)], 3);
    expect(r[1].ink).toBe(0);
    expect(r[2].ink).toBe(10);
  });
});
