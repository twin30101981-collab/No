import { loadImg, toJpeg } from "@/lib/image";

/** Fractional rectangle (0..1) on the page image. */
export type Region = { x: number; y: number; w: number; h: number };

/** Two drag points (any order, any bounds) → clamped fractional rect. */
export function rectFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): Region {
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const x0 = c(Math.min(a.x, b.x)), x1 = c(Math.max(a.x, b.x));
  const y0 = c(Math.min(a.y, b.y)), y1 = c(Math.max(a.y, b.y));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Too small to hold readable text (under ~2% of a side). */
export const tooSmall = (r: Region) => r.w < 0.02 || r.h < 0.02;

/** Fractional rect → pixel box, with a little padding so edge letters are not cut. */
export function regionPixels(r: Region, W: number, H: number, pad = 0.01) {
  const x = Math.max(0, Math.floor((r.x - pad) * W)), y = Math.max(0, Math.floor((r.y - pad) * H));
  const x1 = Math.min(W, Math.ceil((r.x + r.w + pad) * W)), y1 = Math.min(H, Math.ceil((r.y + r.h + pad) * H));
  return { x, y, w: x1 - x, h: y1 - y };
}

/** Crop the region, upscaling small crops so OCR sees letters at a useful size. */
export async function cropRegion(src: string, r: Region) {
  const img = await loadImg(src);
  const b = regionPixels(r, img.naturalWidth, img.naturalHeight);
  const s = Math.min(3, Math.max(1, 1200 / Math.max(b.w, b.h)));
  const c = document.createElement("canvas"); c.width = Math.round(b.w * s); c.height = Math.round(b.h * s);
  const ctx = c.getContext("2d")!; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, c.width, c.height);
  return toJpeg(c, 0.95);
}
