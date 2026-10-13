import { describe, expect, it } from "vitest";
import { runJob, warpPixels, thresholdPixels, flattenPixels, deskewPixels, estimateSkewPx } from "./pixels";
import { runPixels } from "./worker-call";

const img = (W: number, H: number, f: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = f(x, y), i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  return d;
};

describe("pixels", () => {
  it("nắn phối cảnh vùng chữ nhật giữ nguyên ảnh", () => {
    const src = img(10, 10, (x) => x * 20);
    const out = warpPixels(src, 10, 10, [[0, 0], [10, 0], [10, 10], [0, 10]], 10, 10);
    expect(out[(5 * 10 + 3) * 4]).toBe(60);
  });
  it("ngưỡng thích nghi tách chữ đen khỏi nền", () => {
    const d = thresholdPixels(img(40, 40, (x, y) => (x > 18 && x < 22 && y > 5 && y < 35 ? 40 : 230)), 40, 40, false);
    expect(d[(20 * 40 + 20) * 4]).toBe(0);
    expect(d[(20 * 40 + 5) * 4]).toBe(255);
  });
  it("Sauvola: nền phẳng có nhiễu nhẹ không sinh chấm đen", () => {
    const d = thresholdPixels(img(48, 48, (x, y) => 200 + ((x * 7 + y * 13) % 9) - 4), 48, 48, false);
    let black = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0) black++;
    expect(black).toBe(0);
  });
  it("Sauvola: giữ nét chữ mảnh trên nền tối dần", () => {
    const d = thresholdPixels(img(64, 64, (x, y) => (x === 30 || x === 31 ? 60 : 180 - y)), 64, 64, false);
    expect(d[(10 * 64 + 30) * 4]).toBe(0);
    expect(d[(50 * 64 + 30) * 4]).toBe(0);
    expect(d[(50 * 64 + 10) * 4]).toBe(255);
  });
  it("Sauvola: chế độ Mực cho chữ xám đậm 24", () => {
    const d = thresholdPixels(img(40, 40, (x, y) => (x > 18 && x < 22 && y > 5 && y < 35 ? 40 : 230)), 40, 40, true);
    expect(d[(20 * 40 + 20) * 4]).toBe(24); // R6.1b-2: mực đậm hơn để ΔL ≥ 60
  });
  it("lớp gọi chung chạy luồng chính khi không có Worker, cho kết quả như runJob", async () => {
    const a = img(8, 8, (x) => x * 30), b = new Uint8ClampedArray(a);
    const r = await runPixels({ op: "tone", d: a, W: 8, H: 8, brightness: 10, contrast: 20 });
    expect(Array.from(r)).toEqual(Array.from(runJob({ op: "tone", d: b, W: 8, H: 8, brightness: 10, contrast: 20 })));
  });
  it("flatten chia nền sáng không đều về gần trắng đồng nhất", () => {
    // nền chuyển sáng dần trái→phải, có vệt chữ đen
    const d = img(96, 96, (x, y) => (y > 40 && y < 48 && x > 20 && x < 76 ? 30 : 140 + x));
    const out = flattenPixels(d, 96, 96);
    const left = out[(10 * 96 + 10) * 4], right = out[(10 * 96 + 90) * 4];
    expect(left).toBeGreaterThan(200); // nền trái (tối) → gần trắng
    expect(right).toBeGreaterThan(230); // nền phải (sáng) → trắng
    expect(Math.abs(left - right)).toBeLessThan(50); // hai đầu đồng đều
    expect(out[(44 * 96 + 48) * 4]).toBeLessThan(120); // chữ vẫn đậm
  });
  it("deskew nhận diện và xoay thẳng ảnh nghiêng", () => {
    const W = 200, H = 160, a = (3 * Math.PI) / 180;
    // các dòng chữ ngang nghiêng 3°, có nhiễu nhẹ như ảnh chụp thật
    const d = img(W, H, (x, y) => {
      const r = y + (x - W / 2) * Math.tan(a);
      const base = r > 30 && r < H - 30 && Math.round(r) % 16 < 4 && x > 20 && x < W - 20 ? 40 : 220;
      return base + ((x * 7 + y * 13) % 30) - 15;
    });
    const deg = estimateSkewPx(d, W, H);
    expect(Math.abs(deg + 3)).toBeLessThan(0.6);
    const out = deskewPixels(d, W, H);
    expect(out.length).toBe(d.length);
    expect(Math.abs(estimateSkewPx(out, W, H))).toBeLessThan(1); // sau xoay gần như thẳng
  });
  it("deskew giữ nguyên ảnh không nghiêng", () => {
    const d = img(120, 100, (x, y) => (y % 14 < 3 && x > 15 && x < 105 && y > 20 && y < 80 ? 20 : 240));
    const out = deskewPixels(d, 120, 100);
    expect(Array.from(out)).toEqual(Array.from(d));
  });
});

import { stylePixels } from "./pixels";
describe("stylePixels (G1-07)", () => {
  const px = (...v: number[]) => new Uint8ClampedArray(v);
  it("eco: đen thành mực đậm, giấy giữ trắng", () => {
    const d = stylePixels(px(0, 0, 0, 255, 230, 230, 230, 255), "eco");
    expect(d[0]).toBe(0); expect(d[4]).toBe(255); // R6.1a: đường cong mới, đen nhất về 0
  });
  it("vivid: màu đỏ đậm hơn, xám giữ xám", () => {
    const d = stylePixels(px(180, 90, 90, 255, 128, 128, 128, 255), "vivid");
    expect(d[0]).toBeGreaterThan(180); expect(d[1]).toBeLessThan(90); expect(d[4]).toBe(d[5]);
  });
  it("bright: vùng tối sáng lên, trắng giữ trắng", () => {
    const d = stylePixels(px(64, 64, 64, 255, 255, 255, 255, 255), "bright");
    expect(d[0]).toBeGreaterThan(90); expect(d[4]).toBe(255);
  });
});
