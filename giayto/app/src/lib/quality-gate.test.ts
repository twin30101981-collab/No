import { describe, expect, it } from "vitest";
import { measureGate } from "./quality-gate";
import { applyTools } from "./tool-levels";

const W = 160, H = 200;
// trang có chữ: nền theo hàm bg, nét chữ 25 ở các dòng
const page = (bg: (x: number, y: number) => number, noise = 0) => {
  const d = new Uint8ClampedArray(W * H * 4); let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const isInk = y % 20 < 3 && x > 20 && x < 140 && x % 6 < 3;
    const v = (isInk ? 25 : bg(x, y)) + rnd() * noise; const i = (y * W + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
};

describe("R6.1 cổng chất lượng 17.4", () => {
  it("trang sạch đạt cả 3 chỉ số", () => {
    const r = measureGate(page(() => 245), W, H);
    expect(r.pass).toBe(true); expect(r.deltaL).toBeGreaterThanOrEqual(60);
  });
  it("bóng đổ nửa trang trượt cổng độ lệch nền 8%", () => {
    const r = measureGate(page((x) => (x < 80 ? 245 : 150)), W, H);
    expect(r.pass).toBe(false); expect(r.bgDev).toBeGreaterThan(0.08);
  });
  it("góc ố đen > 5% trượt cổng", () => {
    const r = measureGate(page((x, y) => (x < 8 && y < 10 ? 0 : 245)), W, H);
    expect(r.darkCorner).toBeGreaterThan(0.05); expect(r.pass).toBe(false);
  });
  it("Khử bóng Mạnh đưa trang bóng đổ qua cổng nền", () => {
    const d = page((x) => 245 - Math.max(0, x - 60) * 0.9);
    expect(measureGate(d, W, H).bgDev).toBeGreaterThan(0.08);
    applyTools(d, W, H, { deshadow: 3 });
    expect(measureGate(d, W, H).bgDev).toBeLessThanOrEqual(0.08);
  });
  it("Khử nhiễu: cấp cao giảm nhiễu nhiều hơn", () => {
    const sd = (d: Uint8ClampedArray) => { let s = 0, n = 0; for (let y = 5; y < 15; y++) for (let x = 0; x < W; x++) { s += (d[(y * W + x) * 4] - 230) ** 2; n++; } return Math.sqrt(s / n); };
    const [a, b] = [1, 3].map((l) => { const d = page(() => 230, 20); applyTools(d, W, H, { denoise: l as 1 | 3 }); return sd(d); });
    expect(b).toBeLessThan(a);
  });
});
