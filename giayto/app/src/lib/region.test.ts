import { describe, expect, it } from "vitest";
import { rectFromPoints, regionPixels, tooSmall } from "./region";

describe("region select", () => {
  it("normalises reversed drags and clamps outside the image", () => {
    expect(rectFromPoints({ x: 0.8, y: 1.3 }, { x: -0.2, y: 0.5 })).toEqual({ x: 0, y: 0.5, w: 0.8, h: 0.5 });
  });
  it("rejects tiny taps", () => {
    expect(tooSmall(rectFromPoints({ x: 0.5, y: 0.5 }, { x: 0.505, y: 0.6 }))).toBe(true);
    expect(tooSmall({ x: 0, y: 0, w: 0.3, h: 0.1 })).toBe(false);
  });
  it("maps to padded pixel box inside bounds", () => {
    expect(regionPixels({ x: 0, y: 0.5, w: 1, h: 0.5 }, 1000, 2000)).toEqual({ x: 0, y: 980, w: 1000, h: 1020 });
  });
});
