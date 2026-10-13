/**
 * G4-14 — Khử vân moiré khi chụp màn hình.
 *
 * Vân moiré chủ yếu là sọc màu lặp lại (lưới điểm ảnh màn hình × cảm biến máy ảnh).
 * Cách làm: tách YCbCr, làm mờ mạnh kênh màu (Cb/Cr) bằng hộp mờ, làm mờ nhẹ độ sáng
 * chỉ ở vùng phẳng (chênh lệch nhỏ) để giữ nét chữ. Pure, kiểm thử được.
 */
import { canvasToPageUrl } from "./canvas-url";
export interface Rgba { data: Uint8ClampedArray; width: number; height: number }

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let s = 0; const row = y * w;
    for (let x = -r; x <= r; x++) s += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = s / (2 * r + 1);
      s += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / (2 * r + 1);
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Độ mạnh vân màu: trung bình |Cb−128|+|Cr−128| lệch khỏi bản đã làm mờ (0 = không có). */
export function moireScore(img: Rgba): number {
  const { Y, Cb, Cr } = split(img), n = img.width * img.height; void Y;
  const b = boxBlur(Cb, img.width, img.height, 4), r = boxBlur(Cr, img.width, img.height, 4);
  let s = 0; for (let p = 0; p < n; p++) s += Math.abs(Cb[p] - b[p]) + Math.abs(Cr[p] - r[p]);
  return s / n;
}

function split(img: Rgba) {
  const n = img.width * img.height, s = img.data, Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const R = s[p * 4], G = s[p * 4 + 1], B = s[p * 4 + 2];
    Y[p] = 0.299 * R + 0.587 * G + 0.114 * B;
    Cb[p] = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
    Cr[p] = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
  }
  return { Y, Cb, Cr };
}

export interface MoireOpts { chromaRadius?: number; lumaRadius?: number; edge?: number }

export function removeMoire(img: Rgba, o: MoireOpts = {}): Rgba {
  const { width: w, height: h } = img, n = w * h;
  const cr = o.chromaRadius ?? Math.max(3, Math.round(Math.min(w, h) / 300)), lr = o.lumaRadius ?? 1, edge = o.edge ?? 24;
  const { Y, Cb, Cr } = split(img);
  const cb2 = boxBlur(Cb, w, h, cr), cr2 = boxBlur(Cr, w, h, cr), yb = boxBlur(Y, w, h, lr);
  const d = new Uint8ClampedArray(img.data);
  for (let p = 0; p < n; p++) {
    const diff = Math.abs(Y[p] - yb[p]);
    const t = diff >= edge ? 0 : 1 - diff / edge; // vùng phẳng → dùng bản mờ, cạnh chữ → giữ
    const y = Y[p] * (1 - t) + yb[p] * t, u = cb2[p] - 128, v = cr2[p] - 128;
    d[p * 4] = y + 1.402 * v;
    d[p * 4 + 1] = y - 0.344136 * u - 0.714136 * v;
    d[p * 4 + 2] = y + 1.772 * u;
  }
  return { data: d, width: w, height: h };
}

/** Bản cho giao diện: ảnh URL → object URL JPEG đã khử vân (R1.4: không còn data URL). */
export async function removeMoireDataUrl(src: string) {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Không mở được ảnh")); i.src = src; });
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const before = moireScore(id);
  const out = removeMoire(id);
  ctx.putImageData(new ImageData(out.data as Uint8ClampedArray<ArrayBuffer>, out.width, out.height), 0, 0);
  return { src: await canvasToPageUrl(c, "image/jpeg", 0.92), before, after: moireScore(out) };
}
