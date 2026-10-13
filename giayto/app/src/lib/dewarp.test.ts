import { describe, expect, it } from "vitest";
import { cleanBorder, curveAt, edgeCurves, fitCurve, sharpenLuma, trimBox, warpCurved } from "./dewarp";
import { detectPaperGray } from "./detect";

type Pt = [number, number];
const rgba = (W: number, H: number, f: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = f(x, y), i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  return d;
};
const lum = (d: Uint8ClampedArray, W: number, x: number, y: number) => d[(y * W + x) * 4];

// tờ giấy 300×400 trong ảnh 400×500, cạnh trên võng xuống tối đa 14 px (giấy cong)
const W = 400, H = 500, L = 50, T = 50, R = 350, B = 450, BOW = 14;
const topAt = (x: number) => T + BOW * 4 * ((x - L) / (R - L)) * (1 - (x - L) / (R - L));
const curvedSheet = rgba(W, H, (x, y) => (x >= L && x <= R && y >= topAt(x) && y <= B ? 225 : 45));
const quad: Pt[] = [[L, T], [R, T], [R, B], [L, B]];

describe("nắn phẳng giấy cong", () => {
  it("fitCurve khớp đúng độ võng và loại điểm nhiễu", () => {
    const ts = Array.from({ length: 20 }, (_, i) => (i + 1) / 21);
    const os = ts.map((t) => t * (1 - t) * 40);
    os[3] = 30; os[11] = -20;
    const fit = fitCurve(ts, os);
    expect(fit).not.toBeNull();
    expect(curveAt(fit!.c, 0.5)).toBeCloseTo(10, 0);
  });

  it("đo được cạnh trên cong, các cạnh thẳng giữ null", () => {
    const c = edgeCurves(curvedSheet, W, H, quad);
    expect(c[0]).not.toBeNull();
    expect(Math.abs(curveAt(c[0], 0.5) - BOW)).toBeLessThan(2.5);
    expect(c[1]).toBeNull(); expect(c[2]).toBeNull(); expect(c[3]).toBeNull();
  });

  it("sau khi nắn, mép trên không còn nêm nền tối", () => {
    const ow = 300, oh = 400;
    const flat = warpCurved(curvedSheet, W, H, quad, ow, oh, edgeCurves(curvedSheet, W, H, quad));
    const plain = warpCurved(curvedSheet, W, H, quad, ow, oh, []);
    const darkRow = (d: Uint8ClampedArray, y: number) => { let n = 0; for (let x = 0; x < ow; x++) if (lum(d, ow, x, y) < 120) n++; return n; };
    expect(darkRow(plain, 6)).toBeGreaterThan(ow * 0.4);
    expect(darkRow(flat, 6)).toBeLessThan(ow * 0.05);
  });
});

describe("bỏ mép thừa", () => {
  it("trimBox cắt dải nền tối sát mép trái và dưới", () => {
    const w = 200, h = 260;
    const d = rgba(w, h, (x, y) => (x < 7 || y >= h - 5 ? 40 : (y % 20 >= 10 && y % 20 < 12 && x > 30 && x < 170 ? 30 : 235)));
    const b = trimBox(d, w, h);
    expect(b.x0).toBeGreaterThanOrEqual(7); expect(b.x0).toBeLessThanOrEqual(9);
    expect(b.y1).toBeLessThanOrEqual(h - 5); expect(b.y1).toBeGreaterThanOrEqual(h - 7);
    expect(b.y0).toBe(0); expect(b.x1).toBe(w);
  });

  it("cleanBorder xoá nêm tối ở góc nhưng giữ chữ trong lề", () => {
    const w = 200, h = 260;
    const d = rgba(w, h, (x, y) => (x + y < 10 ? 40 : x >= 20 && x < 40 && y >= 20 && y < 24 ? 20 : 235));
    cleanBorder(d, w, h);
    expect(lum(d, w, 1, 1)).toBeGreaterThan(200);
    expect(lum(d, w, 30, 21)).toBeLessThan(40);
  });
});

describe("làm nét chữ", () => {
  it("sharpenLuma tăng độ dốc biên mà không đổi màu nền phẳng", () => {
    const w = 40, h = 10;
    const d = rgba(w, h, (x) => (x < 18 ? 230 : x < 22 ? 230 - (x - 17) * 40 : 70));
    sharpenLuma(d, w, h, 1, 2);
    expect(lum(d, w, 5, 5)).toBe(230);
    expect(lum(d, w, 17, 5)).toBeGreaterThan(230);
    expect(lum(d, w, 22, 5)).toBeLessThan(70);
  });
});

describe("dò giấy trong ánh sáng xấu", () => {
  it("chế độ bền tìm được tờ giấy bị bóng đổ nặng và thiếu sáng", () => {
    const w = 320, h = 420; const g = new Float32Array(w * h);
    let s = 7; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const paper = x >= 60 && x <= 260 && y >= 60 && y <= 340;
      const light = 0.25 + 0.75 * (x / w); // tối dần sang trái
      const text = paper && y > 90 && y < 320 && y % 14 < 3 && x > 80 && x < 240;
      g[y * w + x] = Math.max(0, Math.min(255, ((paper ? (text ? 70 : 150) : 60) * light) + (rnd() - 0.5) * 24));
    }
    const d = detectPaperGray(g, w, h, true);
    expect(d).not.toBeNull();
    const truth = [[60, 60], [260, 60], [260, 340], [60, 340]];
    const err = Math.max(...d!.quad.map(([x, y], i) => Math.hypot(x * w - truth[i][0], y * h - truth[i][1])));
    expect(err).toBeLessThan(Math.hypot(w, h) * 0.03);
  });
});
