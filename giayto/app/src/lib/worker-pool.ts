/**
 * R2.1: Bể Worker chung cho detect / preview / normalize / image (pixels).
 * Một bể duy nhất (kích thước poolSizeFor, kẹp 2..4) với hàng đợi ưu tiên:
 * số nhỏ chạy trước — detect (0, nhịp ngắm trực tiếp) > preview (1) > normalize (2) > pixels (3, dựng trang nặng).
 * Mỗi Worker chỉ nhận 1 việc tại một thời điểm; việc mới chọn Worker rảnh, không có thì xếp hàng theo ưu tiên.
 * Không có Worker hoặc Worker lỗi → gọi nơi trả null/để tầng trên rơi về luồng chính.
 */
/** Số Worker trong bể: lõi − 1, kẹp 2..4. */
export function poolSizeFor(cores: number | undefined) {
  const c = Number.isFinite(cores) && cores! > 0 ? cores! : 2;
  return Math.max(2, Math.min(4, c - 1));
}

/** Mức ưu tiên: nhỏ chạy trước. R2.2: thêm page (dựng trang nền) và compress (trang PDF). */
export const PRIORITY = { detect: 0, preview: 1, normalize: 2, pixels: 3, page: 4, compress: 5 } as const;
export type PoolKind = keyof typeof PRIORITY;

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void };
type Queued = { kind: PoolKind; payload: Record<string, unknown>; transfer: Transferable[]; pending: Pending; slot?: Slot };
type Slot = { w: Worker; busy: boolean };

let slots: Slot[] | null | undefined;
const queue: Queued[] = [];
const jobs = new Map<number, Queued>();
let seq = 0;

/** Hỗ trợ OffscreenCanvas (cần cho normalize/preview); pixels/detect chỉ cần Worker. */
export function poolCanvasSupported() {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function";
}

function spawn(): Slot | null {
  try {
    const w = new Worker(new URL("./pool.worker.ts", import.meta.url), { type: "module" });
    const slot: Slot = { w, busy: false };
    w.onmessage = (e: MessageEvent<{ id: number } & Record<string, unknown>>) => {
      slot.busy = false;
      const j = jobs.get(e.data.id); jobs.delete(e.data.id);
      if (j) {
        const ok = e.data["out"] !== undefined || e.data["det"] !== undefined || e.data["blob"] !== undefined || e.data["main"] !== undefined || e.data["page"] !== undefined;
        if (e.data["error"] !== undefined && !ok) j.pending.reject(e.data);
        else j.pending.resolve(e.data);
      }
      pump();
    };
    w.onerror = () => {
      slot.busy = false;
      // Việc đang chạy trên Worker sập: báo lỗi để tầng trên dự phòng.
      for (const [id, j] of jobs) if (j.slot === slot) { jobs.delete(id); j.pending.reject({ error: "worker" }); }
      if (slots) slots = slots.filter((s) => s !== slot);
      pump();
    };
    return slot;
  } catch { return null; }
}

/** Lấy bể; null khi trình duyệt không có Worker. */
export function getSharedPool(): Slot[] | null {
  if (slots !== undefined) return slots && slots.length ? slots : null;
  if (typeof Worker === "undefined") return (slots = null);
  const n = poolSizeFor(typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined);
  const made: Slot[] = [];
  for (let i = 0; i < n; i++) { const s = spawn(); if (s) made.push(s); }
  slots = made.length ? made : null;
  return slots;
}

function pump() {
  const pool = slots; if (!pool) return;
  const free = pool.find((s) => !s.busy);
  if (!free || !queue.length) return;
  // Lấy việc ưu tiên cao nhất (số nhỏ nhất); cùng ưu tiên thì đến trước chạy trước.
  let bi = 0;
  for (let i = 1; i < queue.length; i++) if (PRIORITY[queue[i].kind] < PRIORITY[queue[bi].kind]) bi = i;
  const j = queue.splice(bi, 1)[0];
  free.busy = true;
  j.slot = free;
  free.w.postMessage({ id: ++seq, kind: j.kind, ...j.payload }, j.transfer);
  jobs.set(seq, j);
}

/**
 * Đẩy việc vào bể. Trả null khi không có Worker (gọi nơi tự chạy luồng chính).
 * Kết quả là MessageEvent.data của Worker; lỗi reject với { error }.
 */
export function runInPool<T = Record<string, unknown>>(
  kind: PoolKind,
  payload: Record<string, unknown>,
  transfer: Transferable[] = [],
): Promise<T> | null {
  const pool = getSharedPool();
  if (!pool) return null;
  return new Promise<T>((resolve, reject) => {
    queue.push({ kind, payload, transfer, pending: { resolve: resolve as (v: unknown) => void, reject } });
    pump();
  });
}

/** Số Worker đồng thời của bể (kiểm chứng R2.1: ≤ 4). */
export function sharedPoolSize() {
  const p = getSharedPool();
  return p?.length ?? 0;
}

/** Thông tin bể cho chẩn đoán. */
export function sharedPoolInfo() {
  const p = getSharedPool();
  return { size: p?.length ?? 0, busy: p?.filter((s) => s.busy).length ?? 0, queued: queue.length };
}
