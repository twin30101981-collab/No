// S5d: normalize từ Blob qua bể Worker chung (R2.1); null khi trình duyệt thiếu OffscreenCanvas → gọi nơi khác rơi về luồng chính.
import { runInPool, poolCanvasSupported } from "./worker-pool";

export function workerNormalizeSupported() {
  return poolCanvasSupported();
}
/** Trả Blob JPEG đã thu nhỏ, hoặc null nếu không dùng được Worker. */
export function normalizeInWorker(blob: Blob, max: number, q: number): Promise<Blob> | null {
  if (!workerNormalizeSupported()) return null;
  const p = runInPool<{ blob?: Blob; error?: string }>("normalize", { blob, max, q });
  if (!p) return null;
  return p.then((r) => {
    if (!r.blob) throw new Error(r.error || "normalize worker");
    return r.blob;
  });
}
