import { describe, expect, it } from "vitest";
import { clampPlacement, inkBox } from "./signatures";

describe("signature library", () => {
  it("finds the ink bounding box", () => {
    const w = 5, h = 4, d = new Uint8ClampedArray(w * h * 4);
    d[(1 * w + 1) * 4 + 3] = 255; d[(2 * w + 3) * 4 + 3] = 255;
    expect(inkBox(d, w, h)).toEqual({ x: 1, y: 1, w: 3, h: 2 });
    expect(inkBox(new Uint8ClampedArray(16), 2, 2)).toBeNull();
  });
  it("keeps placement inside the page and aspect ratio", () => {
    expect(clampPlacement({ x: 0.9, y: -0.2, w: 0.4, h: 0 }, 0.5)).toEqual({ x: 0.6, y: 0, w: 0.4, h: 0.2 });
  });
  it("limits size between minimum and full width", () => {
    expect(clampPlacement({ x: 0, y: 0, w: 0.01, h: 0 }, 0.5).w).toBe(0.06);
    const big = clampPlacement({ x: 0, y: 0, w: 2, h: 0 }, 2);
    expect(big.h).toBe(1); expect(big.w).toBe(0.5);
  });
});
