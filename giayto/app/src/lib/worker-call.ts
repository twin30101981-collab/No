/**
 * Lớp gọi chung: gửi việc điểm ảnh sang pool Web Worker (B7: 2–4 Worker theo navigator.hardwareConcurrency),
 * chuyển bộ đệm không sao chép, giao việc cho Worker đang rảnh nhất. Không có Worker hoặc Worker lỗi → chạy luồng chính.
 */
import { runJob, type PixelJob, type Px } from "./pixels";
import { runInPool, poolSizeFor, getSharedPool } from "./worker-pool";

/** Lỗi Worker kèm bộ đệm vào được trả lại (V3: không giữ bản sao dự phòng). */
export class WorkerJobError extends Error { constructor(msg: string, public back?: Px) { super(msg); } }
/** V3: số đo truyền – số byte sao chép dự phòng (luôn 0) và thời gian postMessage. */
export const v3Stats = { copiedBytes: 0, postMs: 0, posts: 0 };
if (typeof globalThis !== "undefined") (globalThis as { __v3?: typeof v3Stats }).__v3 = v3Stats;
export { poolSizeFor };

/** Chọn Worker ít việc chờ nhất. */
export function pickLeastBusy<T extends { pending: { size: number } }>(list: T[]): T {
  let best = list[0];
  for (const s of list) if (s.pending.size < best.pending.size) best = s;
  return best;
}

export function poolInfo() { const p = getSharedPool(); return { size: p?.length ?? 0, busy: p?.map((s) => (s.busy ? 1 : 0)) ?? [] }; }

const bufOf = (j: PixelJob) => (j.op === "warp" ? j.src : j.d);

export async function runPixels(job: PixelJob): Promise<Px> {
  // R2.1: chạy qua bể Worker chung (ưu tiên thấp nhất — việc dựng trang nặng).
  const t0 = performance.now();
  const p = runInPool<{ out?: Px; error?: string; back?: Px }>("pixels", { job }, [bufOf(job).buffer]);
  if (!p) return runJob(job);
  v3Stats.postMs += performance.now() - t0; v3Stats.posts++;
  try {
    const r = await p;
    if (r.out) return r.out;
    throw new WorkerJobError(r.error ?? "worker", r.back);
  } catch (err) {
    const back = err instanceof WorkerJobError ? err.back : undefined;
    if (back) return runJob(job.op === "warp" ? { ...job, src: back } : { ...job, d: back });
    throw err; // Worker sập giữa chừng: bộ đệm đã mất, báo lỗi để bước trên dựng lại trang
  }
}
