// S7e: phần tính toán thuần của compressPage (không DOM) – dùng chung cho luồng chính và Worker.
import { contentBox, encodePng1bit, type Box } from "./content-crop";

export function rgbaToLum(p: Uint8ClampedArray, W: number, H: number) {
  const lum = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (p[i * 4] * 299 + p[i * 4 + 1] * 587 + p[i * 4 + 2] * 114) / 1000;
  return lum;
}
/** Hộp nội dung B8; chỉ cắt khi hộp còn ≥ 25 % diện tích. */
export function pageBox(lum: Uint8Array, W: number, H: number): Box {
  const box = contentBox(lum, W, H);
  return box.w * box.h < W * H * 0.25 ? { x: 0, y: 0, w: W, h: H } : box;
}
/** Đen trắng thích nghi (tích phân ảnh) trong hộp, trả PNG 1-bit. */
export function bwPng(lum: Uint8Array, W: number, H: number, box: Box) {
  const g = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let xx = 0; xx < W; xx++) { row += lum[y * W + xx]; g[(y + 1) * (W + 1) + xx + 1] = g[y * (W + 1) + xx + 1] + row; } }
  const r = Math.max(8, Math.round(Math.min(W, H) / 40));
  const bin = new Uint8Array(box.w * box.h);
  for (let y = box.y; y < box.y + box.h; y++) for (let xx = box.x; xx < box.x + box.w; xx++) {
    const x0 = Math.max(0, xx - r), x1 = Math.min(W, xx + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
    const mean = (g[y1 * (W + 1) + x1] - g[y0 * (W + 1) + x1] - g[y1 * (W + 1) + x0] + g[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    bin[(y - box.y) * box.w + xx - box.x] = lum[y * W + xx] < mean * 0.88 ? 0 : 255;
  }
  return encodePng1bit(bin, box.w, box.h);
}
