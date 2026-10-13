/**
 * G4-08 — Xóa viết tay, bước 1: tách nét theo màu mực.
 *
 * Mỗi điểm ảnh được xếp vào: giấy, mực in (đen/xám, sắc độ thấp) hoặc mực viết tay
 * có màu (xanh, đỏ, tím...). Màu giấy ước lượng bằng trung vị các điểm sáng, so sánh
 * trên không gian YCbCr so với giấy nên giấy ngả vàng không bị coi là mực màu.
 * Kết quả: mặt nạ 0/1/2 + hàm xóa (thay nét viết tay bằng màu giấy).
 */
export const PAPER = 0, PRINT = 1, HAND = 2;
export type InkClass = 0 | 1 | 2;

export interface InkOptions {
  /** Độ chênh độ sáng so với giấy để coi là mực (0–255). */
  inkDelta?: number;
  /** Độ chênh sắc độ (Cb/Cr so với giấy) để coi là mực màu. */
  chromaMin?: number;
  /** Chỉ coi các màu này là viết tay. Mặc định: xanh + đỏ + tím. */
  hues?: Array<"blue" | "red" | "purple" | "green">;
}

function ycc(r: number, g: number, b: number) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return [y, -0.1687 * r - 0.3313 * g + 0.5 * b, 0.5 * r - 0.4187 * g - 0.0813 * b];
}

function median(a: number[]) { if (!a.length) return 0; a.sort((x, y) => x - y); return a[a.length >> 1]; }

export function estimatePaper(d: Uint8ClampedArray) {
  const n = d.length >> 2, step = Math.max(1, Math.floor(n / 20000));
  const ys: number[] = [];
  for (let p = 0; p < n; p += step) { const i = p * 4; ys.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); }
  const cut = median(ys.slice()) - 10;
  const Y: number[] = [], Cb: number[] = [], Cr: number[] = [];
  for (let p = 0; p < n; p += step) {
    const i = p * 4, c = ycc(d[i], d[i + 1], d[i + 2]);
    if (c[0] >= cut) { Y.push(c[0]); Cb.push(c[1]); Cr.push(c[2]); }
  }
  return { y: median(Y), cb: median(Cb), cr: median(Cr) };
}

function hueOf(cb: number, cr: number): "blue" | "red" | "purple" | "green" {
  const a = (Math.atan2(cr, cb) * 180) / Math.PI; // 0° = xanh dương, 90° = đỏ
  if (a > -45 && a <= 45) return "blue";
  if (a > 45 && a <= 75) return "purple";
  if (a > 75 || a <= -150) return "red";
  return "green";
}

export function classifyInk(img: { data: Uint8ClampedArray; width: number; height: number }, o: InkOptions = {}) {
  const { inkDelta = 40, chromaMin = 18, hues = ["blue", "red", "purple"] } = o;
  const d = img.data, n = img.width * img.height, paper = estimatePaper(d);
  const mask = new Uint8Array(n);
  let hand = 0, print = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4, [y, cb, cr] = ycc(d[i], d[i + 1], d[i + 2]);
    const dcb = cb - paper.cb, dcr = cr - paper.cr, chroma = Math.hypot(dcb, dcr);
    if (chroma >= chromaMin && paper.y - y > inkDelta * 0.4 && hues.includes(hueOf(dcb, dcr))) { mask[p] = HAND; hand++; }
    else if (paper.y - y > inkDelta) { mask[p] = PRINT; print++; }
  }
  return { mask, paper, handShare: hand / n, printShare: print / n };
}

/** Nở mặt nạ viết tay 1 điểm để xóa cả viền nhòe quanh nét. */
export function dilateHand(mask: Uint8Array, w: number, h: number, r = 1) {
  const out = mask.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (mask[y * w + x] !== HAND) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < h && xx >= 0 && xx < w && mask[yy * w + xx] === PAPER) out[yy * w + xx] = HAND;
    }
  }
  return out;
}

/** Trả về ảnh mới: nét viết tay thay bằng màu giấy, mực in giữ nguyên. */
export function removeHandwriting(img: { data: Uint8ClampedArray; width: number; height: number }, o: InkOptions & { grow?: number } = {}) {
  const { mask, paper } = classifyInk(img, o);
  const m = dilateHand(mask, img.width, img.height, o.grow ?? 1);
  const out = new Uint8ClampedArray(img.data);
  const { y, cb, cr } = paper;
  const pr = y + 1.402 * cr, pg = y - 0.344136 * cb - 0.714136 * cr, pb = y + 1.772 * cb;
  let removed = 0;
  for (let p = 0; p < m.length; p++) if (m[p] === HAND) { const i = p * 4; out[i] = pr; out[i + 1] = pg; out[i + 2] = pb; removed++; }
  return { data: out, width: img.width, height: img.height, removed };
}
