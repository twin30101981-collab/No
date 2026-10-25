/**
 * G4-12 — Làm nét HD, bước 2: chạy theo ô ảnh, ghép lại, giới hạn bộ nhớ.
 *
 * Ảnh được chia thành ô vuông có viền chồng (overlap) để mô hình không tạo đường nối.
 * Mỗi ô đi qua `upscale` (mô hình thật ở G4-13, tiêm được để kiểm thử), rồi ghép vào ảnh
 * kết quả bằng trọng số mờ dần ở vùng chồng. Ảnh quá lớn so với giới hạn điểm ảnh đầu ra
 * được thu nhỏ trước (`planScale`) để không tràn bộ nhớ trên điện thoại.
 */
export type Rgba = { data: Uint8ClampedArray; width: number; height: number };
export type Upscaler = (tile: Rgba, scale: number) => Promise<Rgba>;

export interface TileOpts {
  scale?: number; tile?: number; overlap?: number;
  maxOutPixels?: number; signal?: AbortSignal | undefined; onProgress?: (done: number, total: number) => void;
}

export interface TileRect { x: number; y: number; w: number; h: number }

/** Chia ảnh thành ô (đã gồm viền chồng), phủ kín ảnh. */
export function planTiles(w: number, h: number, tile = 192, overlap = 16): TileRect[] {
  const step = Math.max(1, tile - 2 * overlap), out: TileRect[] = [];
  for (let y0 = 0; y0 < h; y0 += step) for (let x0 = 0; x0 < w; x0 += step) {
    const x = Math.max(0, x0 - overlap), y = Math.max(0, y0 - overlap);
    out.push({ x, y, w: Math.min(w, x0 + step + overlap) - x, h: Math.min(h, y0 + step + overlap) - y });
    if (x0 + step >= w) break;
  }
  return out;
}

/** Hệ số thu nhỏ đầu vào để ảnh ra ≤ maxOutPixels (1 = giữ nguyên). */
export function planScale(w: number, h: number, scale: number, maxOutPixels: number) {
  const out = w * h * scale * scale;
  return out <= maxOutPixels ? 1 : Math.sqrt(maxOutPixels / out);
}

export function crop(img: Rgba, r: TileRect): Rgba {
  const d = new Uint8ClampedArray(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) d.set(img.data.subarray(((r.y + y) * img.width + r.x) * 4, ((r.y + y) * img.width + r.x + r.w) * 4), y * r.w * 4);
  return { data: d, width: r.w, height: r.h };
}

/** Thu nhỏ song tuyến (dùng khi vượt giới hạn bộ nhớ). */
export function resize(img: Rgba, w: number, h: number): Rgba {
  const d = new Uint8ClampedArray(w * h * 4), sx = img.width / w, sy = img.height / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = Math.min(img.width - 1, (x + 0.5) * sx - 0.5), fy = Math.min(img.height - 1, (y + 0.5) * sy - 0.5);
    const x0 = Math.max(0, Math.floor(fx)), y0 = Math.max(0, Math.floor(fy));
    const x1 = Math.min(img.width - 1, x0 + 1), y1 = Math.min(img.height - 1, y0 + 1), ax = Math.max(0, fx - x0), ay = Math.max(0, fy - y0);
    for (let k = 0; k < 4; k++) {
      const g = (xx: number, yy: number) => img.data[(yy * img.width + xx) * 4 + k];
      d[(y * w + x) * 4 + k] = (g(x0, y0) * (1 - ax) + g(x1, y0) * ax) * (1 - ay) + (g(x0, y1) * (1 - ax) + g(x1, y1) * ax) * ay;
    }
  }
  return { data: d, width: w, height: h };
}

/** Trọng số theo khoảng cách tới mép ô (mép ảnh thật không bị giảm). */
function weight(i: number, n: number, ramp: number, atStart: boolean, atEnd: boolean) {
  let w = 1;
  if (!atStart && ramp > 0) w = Math.min(w, (i + 0.5) / ramp);
  if (!atEnd && ramp > 0) w = Math.min(w, (n - i - 0.5) / ramp);
  return Math.max(1e-3, Math.min(1, w));
}

export async function upscaleTiled(img: Rgba, upscale: Upscaler, o: TileOpts = {}): Promise<Rgba & { inputScale: number }> {
  const { scale = 2, tile = 192, overlap = 16, maxOutPixels = 24_000_000 } = o;
  const k = planScale(img.width, img.height, scale, maxOutPixels);
  const src = k < 1 ? resize(img, Math.max(1, Math.floor(img.width * k)), Math.max(1, Math.floor(img.height * k))) : img;
  const W = src.width * scale, H = src.height * scale;
  const acc = new Float32Array(W * H * 4), wsum = new Float32Array(W * H);
  const tiles = planTiles(src.width, src.height, tile, overlap), ramp = overlap * 2 * scale;
  let done = 0;
  for (const r of tiles) {
    if (o.signal?.aborted) throw new DOMException("Đã hủy làm nét", "AbortError");
    const up = await upscale(crop(src, r), scale);
    if (up.width !== r.w * scale || up.height !== r.h * scale) throw new Error("Mô hình trả kích thước ô sai");
    const ox = r.x * scale, oy = r.y * scale;
    for (let y = 0; y < up.height; y++) {
      const wy = weight(y, up.height, ramp, r.y === 0, r.y + r.h >= src.height);
      for (let x = 0; x < up.width; x++) {
        const w = wy * weight(x, up.width, ramp, r.x === 0, r.x + r.w >= src.width);
        const p = (oy + y) * W + ox + x, q = (y * up.width + x) * 4;
        wsum[p] += w; for (let c = 0; c < 4; c++) acc[p * 4 + c] += up.data[q + c] * w;
      }
    }
    o.onProgress?.(++done, tiles.length);
    await new Promise((res) => setTimeout(res, 0)); // nhường luồng cho giao diện
  }
  const out = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < W * H; p++) for (let c = 0; c < 4; c++) out[p * 4 + c] = acc[p * 4 + c] / (wsum[p] || 1);
  return { data: out, width: W, height: H, inputScale: k };
}
