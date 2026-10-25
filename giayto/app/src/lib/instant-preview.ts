import { previewSize } from "./preview-src";
import { runInPool, poolCanvasSupported } from "./worker-pool";

/** V13-B04: cỡ ảnh xem trước tức thì (cạnh dài). */
export const INSTANT_MAX = 1024;
export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/** V13-B04: khung chữ nhật bao quad (toạ độ 0..1) + lề nhỏ, kẹp trong ảnh; null nếu quad không hợp lệ/quá nhỏ. */
export function quadCrop(quad: [number, number][] | null | undefined, w: number, h: number, margin = 0.01): CropRect | null {
  if (!quad || quad.length !== 4 || quad.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return null;
  const xs = quad.map((p) => p[0]), ys = quad.map((p) => p[1]);
  const x0 = Math.max(0, Math.min(...xs) - margin), x1 = Math.min(1, Math.max(...xs) + margin);
  const y0 = Math.max(0, Math.min(...ys) - margin), y1 = Math.min(1, Math.max(...ys) + margin);
  if (x1 - x0 < 0.1 || y1 - y0 < 0.1) return null;
  const sx = Math.round(x0 * w), sy = Math.round(y0 * h);
  return { sx, sy, sw: Math.max(1, Math.round(x1 * w) - sx), sh: Math.max(1, Math.round(y1 * h) - sy) };
}

/** Đếm đường đã dùng để kiểm chứng (globalThis.__previewStats). */
export const previewStats = { worker: 0, main: 0, fallback: 0 };
if (typeof globalThis !== "undefined") (globalThis as { __previewStats?: typeof previewStats }).__previewStats = previewStats;

/** R2.1: thu nhỏ + mã hoá JPEG qua bể Worker chung; trả null khi không chạy được (để rơi về luồng chính). */
async function previewViaWorker(frame: CanvasImageSource & { width: number; height: number }, w: number, h: number, crop: CropRect): Promise<Blob | null> {
  if (!poolCanvasSupported()) return null;
  try {
    const bmp = await createImageBitmap(frame as ImageBitmapSource, crop.sx, crop.sy, crop.sw, crop.sh);
    const p = runInPool<{ blob?: Blob; error?: string }>("preview", { bmp, w, h }, [bmp]);
    if (!p) { bmp.close(); return null; }
    const r = await p;
    if (r.blob) { previewStats.worker++; return r.blob; }
  } catch { /* rơi về luồng chính */ }
  previewStats.fallback++;
  return null;
}

/** V2: ảnh xem trước tức thì từ khung vừa chụp (≤1200 px), hiện ngay trên dải trang
 *  trong lúc bản đầy đủ dựng nền. Không đụng tới đường dựng ảnh cuối.
 *  V8b: ưu tiên chạy trong Worker; không có Worker/OffscreenCanvas thì dùng canvas như cũ. */
export async function instantPreview(frame: CanvasImageSource & { width: number; height: number }, max = INSTANT_MAX, quad?: [number, number][] | null): Promise<string | undefined> {
  // V13-B04: cắt theo khung giấy đang ngắm (bao quad) rồi thu ≤1024 px — chưa nắn, hiện ngay
  const crop = quadCrop(quad, frame.width, frame.height) ?? { sx: 0, sy: 0, sw: frame.width, sh: frame.height };
  const sz = previewSize(crop.sw, crop.sh, max);
  const wb = await previewViaWorker(frame, sz.w, sz.h, crop);
  if (wb) return URL.createObjectURL(wb);
  try {
    previewStats.main++;
    const c = document.createElement("canvas"); c.width = sz.w; c.height = sz.h;
    const g = c.getContext("2d"); if (!g) return undefined;
    g.drawImage(frame, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, sz.w, sz.h);
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
    c.width = 0;
    return b ? URL.createObjectURL(b) : undefined;
  } catch { return undefined; }
}
