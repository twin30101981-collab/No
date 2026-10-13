// R2.2: dựng trang nền chạy trong BỂ WORKER CHUNG (worker-pool.ts, kind "page")
// thay cho pool page-pipeline.worker riêng — mỗi trang một lượt chạy nền duy nhất
// (cắt khung → thu nhỏ → nén → ảnh thu nhỏ), nhận ImageBitmap bằng transfer.
// null khi trình duyệt thiếu OffscreenCanvas/Worker → nơi gọi rơi về đường cũ.
import { runInPool } from "./worker-pool";
import type { QuadPts } from "./page-pipeline-shared";

export type PagePipelineResult = { main: Blob; thumb: Blob; w: number; h: number };
/** Tắt Worker (đo so sánh / rollback): setPagePipelineWorker(false). */
let enabled = true;
export function setPagePipelineWorker(on: boolean) { enabled = on; }

/**
 * Xử lý một trang trong worker: cắt theo `quad` (nếu có), thu nhỏ về `max`,
 * nén JPEG chất lượng `q`, kèm ảnh thu nhỏ cạnh dài `thumbMax`.
 * `bmp` bị chuyển quyền (transfer) — caller không dùng lại được sau khi gọi.
 * Trả null nếu không dùng được Worker.
 */
export function processPageInWorker(
  bmp: ImageBitmap,
  opts: { max: number; q: number; thumbMax: number; quad?: QuadPts | null },
): Promise<PagePipelineResult> | null {
  if (!enabled) return null;
  const p = runInPool<{ main?: Blob; thumb?: Blob; w?: number; h?: number; error?: string }>(
    "page",
    { bmp, ...opts },
    [bmp],
  );
  if (!p) return null;
  return p.then((r) => {
    if (!r.main || !r.thumb) throw new Error(r.error || "page-pipeline worker");
    return { main: r.main, thumb: r.thumb, w: r.w ?? 0, h: r.h ?? 0 };
  });
}
