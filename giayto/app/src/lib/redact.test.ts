import { describe, expect, it } from "vitest";
import { redactPixels } from "./redact";

const white = (w: number, h: number) => new Uint8ClampedArray(w * h * 4).fill(255);
const px = (d: Uint8ClampedArray, w: number, x: number, y: number) => Array.from(d.slice((y * w + x) * 4, (y * w + x) * 4 + 4));

describe("redact", () => {
  it("fills the box with opaque black", () => {
    const d = redactPixels(white(10, 10), 10, 10, [{ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }]);
    expect(px(d, 10, 3, 3)).toEqual([0, 0, 0, 255]);
  });
  it("leaves pixels outside the box untouched", () => {
    const d = redactPixels(white(10, 10), 10, 10, [{ x: 0.2, y: 0.2, w: 0.3, h: 0.3 }]);
    expect(px(d, 10, 6, 6)).toEqual([255, 255, 255, 255]);
    expect(px(d, 10, 1, 3)).toEqual([255, 255, 255, 255]);
  });
  it("handles several boxes and full-page edges", () => {
    const d = redactPixels(white(4, 4), 4, 4, [{ x: 0, y: 0, w: 0.25, h: 0.25 }, { x: 0.75, y: 0.75, w: 0.25, h: 0.25 }]);
    expect(px(d, 4, 0, 0)[0]).toBe(0); expect(px(d, 4, 3, 3)[0]).toBe(0); expect(px(d, 4, 1, 1)[0]).toBe(255);
  });
});
