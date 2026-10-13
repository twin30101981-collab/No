// R2.2: nén trang PDF chạy trong BỂ WORKER CHUNG (worker-pool.ts, kind "compress")
// thay cho pool compress-page.worker riêng — cùng thuật toán compressPage.
// null khi thiếu OffscreenCanvas/Worker → files.ts rơi về luồng chính.
import { runInPool } from "./worker-pool";

export type CompressedPage = { src: string; w: number; h: number; fmt: "JPEG" | "PNG" };
/** Tắt Worker (đo so sánh / rollback): setCompressWorker(false). */
let enabled = true;
export function setCompressWorker(on: boolean) { enabled = on; }

export function compressInWorker(src: string, maxSide: number, q: number, bw: boolean, isJpeg: boolean): Promise<CompressedPage> | null {
  if (!enabled) return null;
  const p = runInPool<{ page?: CompressedPage; error?: string }>("compress", { src, maxSide, q, bw, isJpeg });
  if (!p) return null;
  return p.then((r) => {
    if (!r.page) throw new Error(r.error || "compress worker");
    return r.page;
  });
}
