import { describe, expect, it } from "vitest";
import { flattenApply, flattenMap, flattenPixels } from "@/lib/pixels";

/** Ảnh giấy có gradient ánh sáng (góc tối) + một khối chữ đen. */
function makePage(W: number, H: number) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    const shade = 150 + 100 * (x / W) * (y / H); // góc trên-trái tối, góc dưới-phải sáng
    const ink = x > W * 0.3 && x < W * 0.7 && y > H * 0.3 && y < H * 0.7 && (x + y) % 7 < 3;
    const v = ink ? 40 : shade;
    d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
  }
  return d;
}
function downscale(d: Uint8ClampedArray, W: number, H: number, max: number) {
  const s = Math.min(1, max / Math.max(W, H));
  const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(W - 1, Math.round((x + 0.5) * (W / w))), sy = Math.min(H - 1, Math.round((y + 0.5) * (H / h)));
    const o = (y * w + x) * 4, i = (sy * W + sx) * 4;
    out[o] = d[i]; out[o + 1] = d[i + 1]; out[o + 2] = d[i + 2]; out[o + 3] = 255;
  }
  return { d: out, w, h };
}

describe("S15d: đo nền trên bản nhỏ, áp lên bản lớn", () => {
  it("flattenPixels = flattenApply(flattenMap) trên cùng ảnh (không đổi hành vi cũ)", () => {
    const W = 320, H = 240;
    const a = flattenPixels(makePage(W, H), W, H);
    const b = flattenApply(makePage(W, H), W, H, flattenMap(makePage(W, H), W, H));
    expect([...b]).toEqual([...a]);
  });

  it("nền đo trên bản 1000 px áp lên bản lớn: góc tối được nâng gần như đo trực tiếp", () => {
    const W = 2200, H = 1600;
    const src = makePage(W, H);
    const direct = flattenPixels(new Uint8ClampedArray(src), W, H);
    const small = downscale(src, W, H, 1000);
    const viaSmall = flattenApply(new Uint8ClampedArray(src), W, H, flattenMap(small.d, small.w, small.h));
    // góc trên-trái (vùng tối nhất, tránh khối chữ): cả hai cách đều phải nâng sáng rõ
    const corner = (d: Uint8ClampedArray) => d[(Math.round(H * 0.05) * W + Math.round(W * 0.05)) * 4];
    expect(corner(direct)).toBeGreaterThan(200);
    expect(corner(viaSmall)).toBeGreaterThan(200);
    expect(Math.abs(corner(viaSmall) - corner(direct))).toBeLessThanOrEqual(12);
    // toàn ảnh: sai khác trung bình nhỏ
    let sum = 0, n = 0;
    for (let i = 0; i < src.length; i += 4 * 97) { sum += Math.abs(viaSmall[i] - direct[i]); n++; }
    expect(sum / n).toBeLessThanOrEqual(6);
  });

  it("mực chữ không bị nâng thành nền khi áp từ bản nhỏ", () => {
    const W = 1800, H = 1200;
    const src = makePage(W, H);
    const small = downscale(src, W, H, 1000);
    const out = flattenApply(new Uint8ClampedArray(src), W, H, flattenMap(small.d, small.w, small.h));
    const ink = out[(Math.round(H * 0.5) * W + Math.round(W * 0.5)) * 4];
    expect(ink).toBeLessThan(120);
  });
});
