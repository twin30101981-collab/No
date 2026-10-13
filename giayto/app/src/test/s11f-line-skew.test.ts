import { describe, it, expect } from "vitest";
import { regionAngle, lineSkewMap } from "@/lib/line-skew";

function lines(W: number, H: number, deg: (x: number, y: number) => number) {
  const g = new Uint8Array(W * H).fill(250);
  for (let y0 = 20; y0 < H; y0 += 24)
    for (let x = 0; x < W; x++) {
      const y = Math.round(y0 + (x - W / 2) * Math.tan((deg(x, y0) * Math.PI) / 180));
      for (let k = 0; k < 3; k++) if (y + k >= 0 && y + k < H) g[(y + k) * W + x] = 30;
    }
  return g;
}

describe("S11f lineSkew – đo nghiêng/cong dòng", () => {
  it("dòng thẳng → góc 0", () => {
    const W = 400, H = 400, g = lines(W, H, () => 0);
    expect(regionAngle(g, W, 0, W, 0, H).angle).toBe(0);
  });
  it("dòng nghiêng 1,5° → đo ra ~1,5°", () => {
    const W = 400, H = 400, g = lines(W, H, () => 1.5);
    expect(Math.abs(regionAngle(g, W, 0, W, 0, H).angle - 1.5)).toBeLessThanOrEqual(0.25);
  });
  it("trang thẳng: cong và nghiêng hai nửa ≈ 0", () => {
    const W = 600, H = 800, m = lineSkewMap(lines(W, H, () => 0), W, H);
    expect(m.top.curve).toBeLessThanOrEqual(0.25);
    expect(m.bottom.curve).toBeLessThanOrEqual(0.25);
  });
});
