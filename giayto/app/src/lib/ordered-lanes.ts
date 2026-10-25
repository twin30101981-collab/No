/**
 * V8: hàng đợi song song có thứ tự — tối đa `lanes` việc nặng chạy cùng lúc,
 * nhưng bước ghi kết quả (commit) luôn theo đúng thứ tự gửi vào. Lỗi một việc không chặn việc sau.
 * B06: áp lực ngược — khi số việc đang chờ vượt `maxWaiting`, push() từ chối ngay
 * để không chất đống ảnh lớn trong bộ nhớ trên máy yếu.
 */
import { machineLanes } from "./machine-lanes";

export class OrderedLanes {
  private running = 0;
  private waiting: (() => void)[] = [];
  private tail: Promise<void> = Promise.resolve();
  peak = 0;
  /** lanes có thể là hàm (đổi theo lúc): chờ làn trống, kiểm lại mỗi 150 ms. */
  constructor(
    public lanes: number | (() => number),
    public maxWaiting = 0, // 0 = không giới hạn (hành vi cũ)
  ) {}
  private cap() { return Math.max(1, typeof this.lanes === "function" ? this.lanes() : this.lanes); }
  private async slot() {
    while (this.running >= this.cap())
      await new Promise<void>((r) => { this.waiting.push(r); setTimeout(r, 150); });
    this.running++; this.peak = Math.max(this.peak, this.running);
  }
  private free() { this.running--; this.waiting.shift()?.(); }
  /** Trả về promise xong khi commit của việc này chạy xong. Từ chối (reject) khi hàng chờ đầy (B06). */
  push<R>(work: () => Promise<R>, commit: (r: R) => Promise<void> | void, onError?: (e: unknown) => void): Promise<void> {
    if (this.maxWaiting > 0 && this.waiting.length >= this.maxWaiting) {
      const err = new Error("OrderedLanes: hàng chờ đầy (backpressure)");
      onError?.(err);
      return Promise.reject(err);
    }
    const res = (async () => { await this.slot(); try { return await work(); } finally { this.free(); } })();
    res.catch(() => {});
    const done = this.tail.then(async () => {
      try { await commit(await res); } catch (e) { onError?.(e); }
    });
    this.tail = done;
    return done;
  }
  /** Promise xong khi mọi việc đã gửi đều commit xong. */
  idle() { return this.tail; }
}
/** B06: số làn co theo sức máy — RAM ≤ 4 GB chỉ 1–2 làn, máy mạnh tối đa min(4, cores/2). */
export function renderLanes(cores?: number) {
  return machineLanes(cores);
}
