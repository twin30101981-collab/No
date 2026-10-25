import { describe, it, expect } from "vitest";
import { autoLevel, PAPER_TARGET } from "@/lib/auto-level";

function page(W: number, H: number) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const x = i % W; const noise = (i * 7919) % 25; // giấy 180–204
    let v = 180 + noise;
    if (x % 40 === 5) v = 40; // nét chữ đậm
    if (x % 40 === 20) v = 150; // nét mảnh/dấu nhạt
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  return d;
}
const lum = (d: Uint8ClampedArray, i: number) => d[i * 4];

describe("S11b autoLevel – giới hạn làm trắng", () => {
  it("nền ≥ 240 nhưng P10 nền < 255, nét mảnh vẫn tách khỏi nền", () => {
    const W = 200, H = 50, d = page(W, H); autoLevel(d);
    const paper: number[] = [];
    for (let i = 0; i < W * H; i++) { const x = i % W; if (x % 40 !== 5 && x % 40 !== 20) paper.push(lum(d, i)); }
    paper.sort((a, b) => a - b);
    const med = paper[paper.length >> 1], p10 = paper[(paper.length * 0.1) | 0];
    expect(med).toBeGreaterThanOrEqual(240);
    expect(p10).toBeLessThan(255);
    const faint = lum(d, 20), bold = lum(d, 5);
    expect(med - faint).toBeGreaterThanOrEqual(25);
    expect(bold).toBeLessThan(60);
    expect(PAPER_TARGET).toBe(248);
  });
});
