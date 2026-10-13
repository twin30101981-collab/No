import { fileToDataUrl, loadImg } from "@/lib/image";
import { despeckleAlpha, trimCanvas } from "@/lib/signatures";

/** Paper brightness per pixel: max luminance in coarse blocks, then bilinear-smoothed (handles shadows/uneven light). */
export function paperLevel(lum: Float32Array, w: number, h: number, block = 16) {
  const bw = Math.ceil(w / block), bh = Math.ceil(h / block); const m = new Float32Array(bw * bh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y / block) | 0) * bw + ((x / block) | 0); if (lum[y * w + x] > m[i]) m[i] = lum[y * w + x]; }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = Math.min(bh - 1, Math.max(0, y / block - 0.5)), y0 = fy | 0, y1 = Math.min(bh - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(bw - 1, Math.max(0, x / block - 0.5)), x0 = fx | 0, x1 = Math.min(bw - 1, x0 + 1), tx = fx - x0;
      const a = m[y0 * bw + x0] * (1 - tx) + m[y0 * bw + x1] * tx, b = m[y1 * bw + x0] * (1 - tx) + m[y1 * bw + x1] * tx;
      out[y * w + x] = a * (1 - ty) + b * ty;
    }
  }
  return out;
}

const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** In-place: paper → transparent, ink keeps its hue (deepened slightly so pale pen reads well). */
export function extractInk(d: Uint8ClampedArray, w: number, h: number, lo = 0.12, hi = 0.38) {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const bg = paperLevel(lum, w, h);
  for (let i = 0; i < w * h; i++) {
    const dark = bg[i] > 1 ? (bg[i] - lum[i]) / bg[i] : 0;
    const a = smooth(lo, hi, dark);
    const k = 0.75; // deepen ink colour
    d[i * 4] *= k; d[i * 4 + 1] *= k; d[i * 4 + 2] *= k;
    d[i * 4 + 3] = Math.round(a * 255);
  }
  return d;
}

/** Photo of a signature on paper → trimmed transparent PNG. */
export async function signatureFromPhoto(file: File) {
  const img = await loadImg(await fileToDataUrl(file));
  const s = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height); extractInk(data.data, c.width, c.height); despeckleAlpha(data.data, c.width, c.height, Math.max(12, Math.round(c.width * c.height / 40000))); ctx.putImageData(data, 0, 0);
  return trimCanvas(c, 10);
}
