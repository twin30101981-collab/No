import { describe, expect, it } from "vitest";
import { edgeSaturatedMask, inkCurve, inkDeepen } from "./ink-deepen";
import { measureGate } from "./quality-gate";

describe("R6.1b-2 inkDeepen", () => {
  it("giữ nguyên nền giấy từ 200 trở lên", () => {
    expect(inkCurve(248)).toBe(248);
    expect(inkCurve(200)).toBe(200);
  });
  it("nét xám trung bình 100 xuống ≤ 27 (L* ≤ 38)", () => {
    expect(inkCurve(100)).toBeLessThanOrEqual(27);
  });
  it("trang mực xám 100 trên nền 248 đạt cổng ΔL ≥ 60 sau đậm hoá", () => {
    const W = 100, H = 100, d = new Uint8ClampedArray(W * H * 4).fill(248);
    for (let p = 0; p < W * H; p++) if (p % 10 < 2) d.fill(100, p * 4, p * 4 + 3);
    expect(measureGate(d, W, H).deltaL).toBeLessThan(60);
    expect(measureGate(inkDeepen(d), W, H).deltaL).toBeGreaterThanOrEqual(60);
  });
});

// HM-11 (R6.1e, Q3=a): khối màu bão hoà Ở MÉP (đỏ in số trang, logo) không được bị đậm hoá thành đen — cổng đo điểm rất tối ở 4 góc.
describe("HM-11 inkDeepen bảo vệ khối màu bão hoà ở mép", () => {
  const lum = (d: Uint8ClampedArray, i = 0) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  const W = 100, H = 100;
  const page = (c: [number, number, number], x: number, y: number) => { const d = new Uint8ClampedArray(W * H * 4).fill(248); const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; return { d, i }; };
  it("đỏ in ở góc dưới-trái, hai lượt như auto (200/3,0 rồi 170/2,2): không thành đen, giữ sắc đỏ", () => {
    const { d, i } = page([180, 30, 30], 3, 95);
    const m = edgeSaturatedMask(d, W, H); expect(m[95 * W + 3]).toBe(1);
    inkDeepen(d, undefined, undefined, m); inkDeepen(d, 170, 2.2, m);
    expect(lum(d, i)).toBeGreaterThan(20); // không bảo vệ: ≈ 3 (đen)
    expect(d[i]).toBeGreaterThan(d[i + 1] * 2);
  });
  it("cùng điểm màu nhưng Ở GIỮA trang: không bảo vệ (giữ ΔL như cũ)", () => {
    const { d, i } = page([180, 30, 30], 50, 50);
    const m = edgeSaturatedMask(d, W, H); expect(m[50 * W + 50]).toBe(0);
    inkDeepen(d, undefined, undefined, m); inkDeepen(d, 170, 2.2, m);
    expect(lum(d, i)).toBeLessThan(8);
  });
  it("không có mặt nạ: hành vi cũ (chữ xám 100 → ≤ 27; đỏ vẫn bị ép đen)", () => {
    const a = new Uint8ClampedArray([100, 100, 100, 255]); inkDeepen(a); expect(a[0]).toBeLessThanOrEqual(27);
    const b = new Uint8ClampedArray([180, 30, 30, 255]); inkDeepen(b); inkDeepen(b, 170, 2.2); expect(lum(b)).toBeLessThan(8);
  });
  it("mặt nạ chỉ lấy điểm màu bão hoà-tối: chữ đen, giấy kem ở mép không vào", () => {
    const d = new Uint8ClampedArray(W * H * 4).fill(248);
    const set = (x: number, y: number, c: number[]) => { const i = (y * W + x) * 4; d[i] = c[0]!; d[i + 1] = c[1]!; d[i + 2] = c[2]!; };
    set(2, 2, [10, 10, 10]); set(3, 2, [240, 235, 215]); set(4, 2, [250, 200, 200]); set(5, 2, [20, 40, 150]);
    const m = edgeSaturatedMask(d, W, H);
    expect([m[2 * W + 2], m[2 * W + 3], m[2 * W + 4], m[2 * W + 5]]).toEqual([0, 0, 0, 1]);
  });
});
