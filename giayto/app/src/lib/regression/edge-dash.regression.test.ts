import { describe, it, expect } from "vitest";
import { edgeDashClean, edgeStrokeClean } from "../paper-mask";

function page(W: number, H: number) {
  const d = new Uint8ClampedArray(W * H * 4).fill(240);
  for (let i = 3; i < d.length; i += 4) d[i] = 255;
  const dot = (x: number, y: number, v: number) => { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; };
  for (let y = 20; y < H - 20; y++) if ((y >> 3) % 2) for (let t = 0; t < 2; t++) dot(8 + t, y, 90); // vệt đứt mép trái
  for (let y = 30; y < H - 30; y++) if ((y >> 3) % 3) dot(W - 12 + Math.round((y - 30) * 0.05), y, 100); // vệt xiên mép phải
  for (let y = 200; y < 600; y += 20) for (let x = 150; x < 650; x++) if (x % 9 < 6) dot(x, y, 40); // chữ
  return d;
}
// Bản chụp kết quả trước V5d (tính một lần bằng mã cũ) — so khớp qua tổng kiểm.
const sum = (d: Uint8ClampedArray) => { let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) >>> 0; return h; };
describe("Hồi quy V5d edgeDash/edgeStroke", () => {
  it("kết quả ổn định và có xoá vệt", () => {
    const W = 800, H = 1100, a = page(W, H), b = a.slice();
    const t = performance.now(); edgeDashClean(a, W, H); edgeStrokeClean(a, W, H);
    console.log(`V5d dash+stroke ${W}x${H}: ${(performance.now() - t).toFixed(0)} ms, sum ${sum(a)}`);
    let changed = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
    expect(changed).toBeGreaterThan(0);
    expect(sum(a)).toBe(1740240176);
  });
});
