import { describe, expect, it } from "vitest";
import { bwPng, pageBox, rgbaToLum } from "./page-compress";

describe("S7e page-compress (thuần, chạy được trong Worker)", () => {
  const W = 40, H = 40;
  const rgba = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y = 15; y < 25; y++) for (let x = 10; x < 30; x++) { const i = (y * W + x) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 0; }
  it("độ sáng đúng", () => { const l = rgbaToLum(rgba, W, H); expect(l[0]).toBe(255); expect(l[20 * W + 20]).toBe(0); });
  it("hộp quá nhỏ → giữ cả ảnh", () => { expect(pageBox(rgbaToLum(rgba, W, H), W, H)).toEqual({ x: 0, y: 0, w: W, h: H }); });
  it("PNG 1-bit hợp lệ", () => { const b = bwPng(rgbaToLum(rgba, W, H), W, H, { x: 0, y: 0, w: W, h: H }); expect([...b.slice(1, 4)].map((c) => String.fromCharCode(c)).join("")).toBe("PNG"); });
});
