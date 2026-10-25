import { describe, expect, it } from "vitest";
import { stackedSides } from "./paper-stack";
import type { Quad } from "./db";

function img(w: number, h: number, rects: [number, number, number, number, number][]) {
  const data = new Uint8Array(w * h).fill(40);
  for (const [x0, y0, x1, y1, v] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[y * w + x] = v;
  return { data, w, h };
}
const q = (x0: number, y0: number, x1: number, y1: number, w: number, h: number): Quad =>
  [[x0 / w, y0 / h], [x1 / w, y0 / h], [x1 / w, y1 / h], [x0 / w, y1 / h]];

describe("stackedSides", () => {
  it("một tờ trên nền tối: không có cạnh chồng", () => {
    const g = img(400, 500, [[60, 60, 340, 440, 230]]);
    expect(stackedSides(g, q(60, 60, 340, 440, 400, 500))).toEqual([]);
  });
  it("tờ lót lòi ra bên trái: cạnh trái (3) bị báo", () => {
    const g = img(400, 500, [[45, 80, 330, 450, 180], [60, 60, 340, 440, 235]]);
    expect(stackedSides(g, q(60, 60, 340, 440, 400, 500))).toContain(3);
  });
  it("V10: khung bám vào mép tờ lót (mép ngoài yếu, mép tờ chính mạnh ngay bên trong) → bị báo", () => {
    // Nền (170) gần màu tờ lót (180) → mép ngoài yếu; tờ chính (235) bắt đầu 6 px bên trong.
    // Khung dò được bám theo mép tờ lót (y=40) → mép mạnh nằm ngay bên trong khung.
    const g = img(400, 500, [[0, 0, 400, 500, 170], [40, 40, 360, 470, 180], [40, 46, 360, 464, 235]]);
    const sides = stackedSides(g, q(40, 40, 360, 470, 400, 500));
    expect(sides).toContain(0);
    expect(sides).toContain(2);
  });
  it("V10: tờ đơn có chữ sát mép trong, mép ngoài rõ → không báo chồng", () => {
    // Tờ sáng trên nền tối, có một dòng chữ tối sát mép trong — không được báo.
    const g = img(400, 500, [[60, 60, 340, 440, 235], [70, 70, 330, 78, 60]]);
    expect(stackedSides(g, q(60, 60, 340, 440, 400, 500))).toEqual([]);
  });
});
