import { describe, expect, it } from "vitest";
import type { Quad } from "./db";
import { fitLineRansac, refineQuadGradient } from "./detect-refine";

const sheet = (W: number, H: number, left: number, top: number, right: number, bottom: number, contrast = 190) => {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inside = x >= left && x <= right && y >= top && y <= bottom;
    const v = inside ? 30 + contrast : 30, i = (y * W + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
};

const rough = (W: number, H: number): Quad => [[34 / W, 25 / H], [188 / W, 25 / H], [188 / W, 150 / H], [34 / W, 150 / H]];

describe("refineQuadGradient (G1-09)", () => {
  it("đưa bốn góc thô về sát mép giấy trên ảnh gốc", () => {
    const W = 220, H = 180;
    const q = refineQuadGradient(sheet(W, H, 40, 30, 180, 145), W, H, rough(W, H));
    expect(Math.abs(q[0][0] * W - 40)).toBeLessThanOrEqual(1); expect(Math.abs(q[0][1] * H - 30)).toBeLessThanOrEqual(1);
    expect(Math.abs(q[2][0] * W - 180)).toBeLessThanOrEqual(1); expect(Math.abs(q[2][1] * H - 145)).toBeLessThanOrEqual(1);
  });

  it("chỉ tìm cạnh trong cửa sổ 32 px", () => {
    const W = 220, H = 180, q0 = rough(W, H);
    const q = refineQuadGradient(sheet(W, H, 65, 55, 160, 120), W, H, q0);
    expect(q).toEqual(q0);
  });

  it("giữ nguyên khung cũ khi ảnh không có gradient đủ rõ", () => {
    const W = 220, H = 180, q0 = rough(W, H);
    const q = refineQuadGradient(sheet(W, H, 40, 30, 180, 145, 8), W, H, q0);
    expect(q).toEqual(q0);
  });
});

describe("fitLineRansac (G1-10)", () => {
  it("loại các điểm nhiễu khỏi đường biên", () => {
    const points: [number, number][] = [[0, 12], [10, 12], [20, 12], [30, 12], [40, 12], [50, 12], [15, 30], [35, -8]];
    const line = fitLineRansac(points, 1, 6);
    expect(line?.inliers).toBe(6);
    expect(line?.normal[0]).toBeCloseTo(0, 5);
    expect(Math.abs(line?.offset ?? 0)).toBeCloseTo(12, 5);
  });

  it("khớp chính xác cạnh xiên có sai số điểm nhỏ", () => {
    const points: [number, number][] = Array.from({ length: 10 }, (_, i) => [i * 8, 5 + i * 4 + (i % 2 ? 0.25 : -0.25)]);
    const line = fitLineRansac(points, 0.8, 8);
    expect(line?.inliers).toBe(10);
    expect(line?.rms).toBeLessThan(0.3);
    if (line) expect(Math.abs(line.normal[0] * 40 + line.normal[1] * 25 - line.offset)).toBeLessThan(0.3);
  });

  it("từ chối khi không đủ điểm đồng thuận", () => {
    const points: [number, number][] = [[0, 0], [5, 8], [11, 2], [17, 15], [24, 6], [31, 20]];
    expect(fitLineRansac(points, 0.5, 5)).toBeNull();
  });
});