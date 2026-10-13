/**
 * G4-13 — Làm nét HD: dự phòng làm nét cổ điển + hàm chạy cho giao diện.
 *
 * `classicUpscaler`: phóng song tuyến rồi làm nét không mờ (unsharp mask) trên độ sáng,
 * dùng khi chưa có mô hình siêu phân giải (hoặc tải/chạy mô hình lỗi). Cùng kiểu `Upscaler`
 * nên chạy được qua `upscaleTiled` (ô ảnh + giới hạn bộ nhớ).
 */
import { resize, upscaleTiled, type Rgba, type Upscaler } from "./sr-tiles";
import { canvasToPageUrl } from "./canvas-url";

export function unsharpLuma(img: Rgba, amount = 0.8, threshold = 3): Rgba {
  const { width: w, height: h, data: s } = img, n = w * h, L = new Float32Array(n), B = new Float32Array(n), T = new Float32Array(n);
  for (let p = 0; p < n; p++) L[p] = 0.299 * s[p * 4] + 0.587 * s[p * 4 + 1] + 0.114 * s[p * 4 + 2];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) T[y * w + x] = (L[y * w + Math.max(0, x - 1)] + 2 * L[y * w + x] + L[y * w + Math.min(w - 1, x + 1)]) / 4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B[y * w + x] = (T[Math.max(0, y - 1) * w + x] + 2 * T[y * w + x] + T[Math.min(h - 1, y + 1) * w + x]) / 4;
  const d = new Uint8ClampedArray(s);
  for (let p = 0; p < n; p++) {
    const diff = L[p] - B[p]; if (Math.abs(diff) < threshold) continue;
    const add = diff * amount; d[p * 4] += add; d[p * 4 + 1] += add; d[p * 4 + 2] += add;
  }
  return { data: d, width: w, height: h };
}

export const classicUpscaler: Upscaler = async (tile, scale) => unsharpLuma(resize(tile, tile.width * scale, tile.height * scale));

export interface EnhanceOpts { model?: Upscaler | null; onProgress?: (pct: number) => void; signal?: AbortSignal; maxOutPixels?: number }

/** Làm nét ảnh: thử mô hình nếu có, lỗi thì tự quay về cách cổ điển. */
export async function enhanceImage(img: Rgba, o: EnhanceOpts = {}) {
  const common = { scale: 2, maxOutPixels: o.maxOutPixels ?? 16_000_000, signal: o.signal, onProgress: (d: number, t: number) => o.onProgress?.(Math.round((d / t) * 100)) };
  if (o.model) {
    try { return { ...(await upscaleTiled(img, o.model, common)), method: "model" as const }; }
    catch (e) { if ((e as Error)?.name === "AbortError") throw e; }
  }
  return { ...(await upscaleTiled(img, classicUpscaler, { ...common, tile: 256, overlap: 4 })), method: "classic" as const };
}

/** Bản dùng cho giao diện: ảnh URL → object URL JPEG đã làm nét ×2 (R1.4: không còn data URL). */
export async function enhanceDataUrl(src: string, o: EnhanceOpts = {}) {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Không mở được ảnh")); i.src = src; });
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0);
  const r = await enhanceImage(ctx.getImageData(0, 0, c.width, c.height), o); c.width = 0;
  const out = document.createElement("canvas"); out.width = r.width; out.height = r.height;
  out.getContext("2d")!.putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.width, r.height), 0, 0);
  return { src: await canvasToPageUrl(out, "image/jpeg", 0.9), width: r.width, height: r.height, method: r.method };
}
