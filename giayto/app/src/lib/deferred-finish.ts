// V13-B11: làm nét sau — bước hoàn thiện nặng (nắn cong, khử nhiễu, làm nét, chuẩn sáng, dựng 300 dpi)
// rời đường găng chụp. Màn chụp nhận bản nháp nhỏ ngay; bản đầy đủ chạy khi máy rảnh rồi thay ảnh trang.
// Kết quả cuối gọi đúng hàm dựng V12 nên chất lượng bằng V12.

type Idle = (cb: () => void, opts?: { timeout: number }) => number;
type Job = { id: string; run: () => Promise<string>; done: (src: string) => void; cancelled: boolean; settled: Promise<void>; resolve: () => void };

export type IdleScheduler = (cb: () => void) => void;

/** requestIdleCallback (hết hạn 1 s), dự phòng setTimeout 16 ms. */
export const idleScheduler: IdleScheduler = (cb) => {
  const ric = (globalThis as { requestIdleCallback?: Idle }).requestIdleCallback;
  if (typeof ric === "function") ric(cb, { timeout: 1000 }); else setTimeout(cb, 16);
};

/** Hàng đợi hoàn thiện: một việc mỗi lượt rảnh, huỷ được theo id trang, chờ hết bằng flush(). */
export class FinishQueue {
  private jobs = new Map<string, Job>();
  private order: string[] = [];
  private running = false;
  constructor(private schedule: IdleScheduler = idleScheduler) {}

  get size() { return this.jobs.size; }
  has(id: string) { return this.jobs.has(id); }

  /** Xếp việc dựng đầy đủ cho trang `id`; `done` nhận ảnh cuối (không gọi nếu đã huỷ). */
  add(id: string, run: () => Promise<string>, done: (src: string) => void) {
    this.cancel(id);
    let resolve!: () => void; const settled = new Promise<void>((r) => (resolve = r));
    this.jobs.set(id, { id, run, done, cancelled: false, settled, resolve });
    this.order.push(id); this.kick();
  }

  /** Người dùng xoá trang → bỏ việc (đang chạy thì bỏ kết quả). */
  cancel(id: string) {
    const j = this.jobs.get(id); if (!j) return;
    j.cancelled = true; this.jobs.delete(id); this.order = this.order.filter((x) => x !== id); j.resolve();
  }
  cancelAll() { for (const id of [...this.jobs.keys()]) this.cancel(id); }

  /** Chạy ngay mọi việc còn lại (khi lưu tài liệu) và chờ xong. */
  async flush() {
    while (this.order.length || this.running) {
      if (!this.running) await this.step(); else await Promise.all([...this.jobs.values()].map((j) => j.settled));
    }
  }

  private kick() { if (!this.running && this.order.length) this.schedule(() => void this.step()); }

  private async step() {
    if (this.running) return;
    const id = this.order.shift(); const j = id ? this.jobs.get(id) : undefined;
    if (!j) { this.kick(); return; }
    this.running = true;
    try { const src = await j.run(); if (!j.cancelled) j.done(src); }
    catch { /* giữ bản nháp */ }
    finally { if (this.jobs.get(j.id) === j) this.jobs.delete(j.id); j.resolve(); this.running = false; this.kick(); }
  }
}
