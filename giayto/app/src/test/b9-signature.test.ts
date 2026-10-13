import { describe, expect, it } from "vitest";
import { clampBox, despeckleAlpha, pinchBy, resizeBy, type Rotated } from "@/lib/signatures";

const at: Rotated = { x: 0.4, y: 0.6, w: 0.3, h: 0.1 };

describe("B9 chữ ký", () => {
  it("kéo cạnh đổi cỡ độc lập từng trục", () => {
    const e = resizeBy(at, "e", 0.1, 0.05);
    expect(e.w).toBeCloseTo(0.4); expect(e.h).toBeCloseTo(0.1);
    const s = resizeBy(at, "s", 0.1, 0.05);
    expect(s.w).toBeCloseTo(0.3); expect(s.h).toBeCloseTo(0.15);
    const n = resizeBy(at, "n", 0, 0.02);
    expect(n.y).toBeCloseTo(0.62); expect(n.h).toBeCloseTo(0.08);
    const w = resizeBy(at, "w", -0.1, 0);
    expect(w.x).toBeCloseTo(0.3); expect(w.w).toBeCloseTo(0.4);
  });
  it("kéo góc giữ tỉ lệ", () => {
    const r = resizeBy(at, "se", 0.15, 0);
    expect(r.h / r.w).toBeCloseTo(at.h / at.w);
  });
  it("kéo được xuống sát cuối trang, không tràn", () => {
    const b = clampBox({ ...at, y: 5 });
    expect(b.y + b.h).toBeCloseTo(1);
  });
  it("chụm 2 ngón: phóng quanh tâm và xoay", () => {
    const p = pinchBy(at, 1.5, Math.PI / 6);
    expect(p.w).toBeCloseTo(0.45); expect(p.h / p.w).toBeCloseTo(at.h / at.w);
    expect(p.x + p.w / 2).toBeCloseTo(at.x + at.w / 2);
    expect(p.r).toBeCloseTo(Math.PI / 6);
  });
  it("xóa chấm nhiễu, giữ nét lớn, nền mờ thành trong suốt", () => {
    const w = 20, h = 10, d = new Uint8ClampedArray(w * h * 4);
    for (let x = 2; x < 15; x++) d[(5 * w + x) * 4 + 3] = 255; // nét 13 px
    d[(1 * w + 18) * 4 + 3] = 255; // chấm lẻ
    d[(8 * w + 1) * 4 + 3] = 10; // sương nền
    despeckleAlpha(d, w, h, 5);
    expect(d[(5 * w + 8) * 4 + 3]).toBe(255);
    expect(d[(1 * w + 18) * 4 + 3]).toBe(0);
    expect(d[(8 * w + 1) * 4 + 3]).toBe(0);
  });
});

describe("B9 xoay không tràn trang", () => {
  it("chữ ký xoay kéo xuống đáy: hình bao nằm trong trang", () => {
    const b = clampBox({ x: 0.3, y: 5, w: 0.5, h: 0.15, r: 0.5 }, 0.03, 1.4);
    const bh = Math.abs(Math.sin(0.5)) * b.w / 1.4 + Math.abs(Math.cos(0.5)) * b.h;
    expect(b.y + b.h / 2 + bh / 2).toBeCloseTo(1);
  });
});
