import { describe, it, expect } from "vitest";
import { edgeFrameClean } from "../paper-mask";

function page(W: number, H: number) {
  const d = new Uint8ClampedArray(W * H * 4).fill(240);
  for (let i = 3; i < d.length; i += 4) d[i] = 255;
  const dot = (x: number, y: number, v: number) => { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; };
  for (let x = 30; x < W - 30; x++) dot(x, 15, 225); // khung xám mảnh trên
  for (let y = 40; y < H - 40; y++) dot(W - 20, y, 222); // khung xám phải
  for (let y = 100; y < 400; y++) for (let t = 0; t < 2; t++) dot(40 + Math.round(y * 0.3) + t, y, 120); // vạch xiên
  for (let y = 300; y < 700; y += 20) for (let x = 200; x < 600; x++) if (x % 9 < 6) dot(x, y, 40);
  return d;
}
const sum = (d: Uint8ClampedArray) => { let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) >>> 0; return h; };
describe("Hồi quy V5e edgeFrameClean", () => {
  it("giống bản cũ từng điểm ảnh", () => {
    const W = 800, H = 1100, a = page(W, H);
    const t = performance.now(); edgeFrameClean(a, W, H);
    console.log(`V5e frame ${W}x${H}: ${(performance.now() - t).toFixed(0)} ms, sum ${sum(a)}`);
    expect(sum(a)).toBe(2900469248);
  });
});
