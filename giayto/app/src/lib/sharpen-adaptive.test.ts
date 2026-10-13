import { describe, expect, it } from "vitest";
import { adaptiveGain, sharpenAdaptive } from "./sharpen-adaptive";

const img = (W: number, H: number, f: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = f(x, y), i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  return d;
};

describe("S15h sharpenAdaptive", () => {
  it("gain giảm khi chênh lệch lớn", () => {
    expect(adaptiveGain(80, 1)).toBeLessThan(adaptiveGain(10, 1));
  });
  it("vùng phẳng giữ nguyên", () => {
    const d = img(12, 12, () => 200); const o = new Uint8ClampedArray(d);
    expect(Array.from(sharpenAdaptive(d, 12, 12, 1.4))).toEqual(Array.from(o));
  });
  it("nét mảnh 1 px không vọt lố khỏi dải sáng/tối sẵn có", () => {
    const d = img(15, 15, (x) => (x === 7 ? 60 : 230));
    sharpenAdaptive(d, 15, 15, 2);
    for (let i = 0; i < d.length; i += 4) { expect(d[i]).toBeGreaterThanOrEqual(60); expect(d[i]).toBeLessThanOrEqual(230); }
    expect(d[(7 * 15 + 7) * 4]).toBeLessThanOrEqual(60);
  });
  it("dốc tuyến tính không bị đổi (không tạo vân giả)", () => {
    const d = img(20, 4, (x) => ci(40 + x * 10)); const before = d[(1 * 20 + 9) * 4];
    sharpenAdaptive(d, 20, 4, 1.4);
    expect(d[(1 * 20 + 9) * 4]).toBe(before); // dốc tuyến tính: không chênh so với làm mờ
  });
});
function ci(v: number) { return Math.max(0, Math.min(255, v)); }
