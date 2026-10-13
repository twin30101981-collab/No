import { describe, it, expect } from "vitest";
import { showThroughLift, PAPER_TARGET } from "@/lib/auto-level";

const px = (r: number, g: number, b: number) => new Uint8ClampedArray([r, g, b, 255]);

describe("S11d showThroughLift – chữ hằn mặt sau", () => {
  it("chữ hằn xám nhạt tiến về nền", () => {
    const d = px(235, 235, 235); showThroughLift(d);
    expect(d[0]).toBeGreaterThanOrEqual(244);
    const e = px(222, 222, 222); showThroughLift(e);
    expect(e[0]).toBeGreaterThan(230);
  });
  it("nét mảnh thật và chữ đậm giữ nguyên", () => {
    for (const v of [40, 150, 185]) { const d = px(v, v, v); showThroughLift(d); expect(d[0]).toBe(v); }
  });
  it("mực xanh/đỏ nhạt giữ nguyên", () => {
    const blue = px(200, 215, 245); showThroughLift(blue); expect([...blue.slice(0, 3)]).toEqual([200, 215, 245]);
    const red = px(245, 205, 205); showThroughLift(red); expect([...red.slice(0, 3)]).toEqual([245, 205, 205]);
  });
  it("nền không đổi", () => {
    const d = px(PAPER_TARGET, PAPER_TARGET, PAPER_TARGET); showThroughLift(d); expect(d[0]).toBe(PAPER_TARGET);
  });
});
