import { useSyncExternalStore } from "react";
import { whenScanIdle } from "./priority-gate";

/** One page waiting for (or under) OCR. Runs in the background — survives leaving the page. */
export type OcrJob = { id: string; docId: string; pageId: string; label: string; src: string; status: "queued" | "running"; progress: number };
export type OcrRunner = { run: (src: string, onProgress: (p: number) => void) => Promise<string>; abort: () => Promise<void> };
export type OcrDone = (job: OcrJob, text: string) => Promise<void> | void;

export class CancelledError extends Error { constructor() { super("Đã hủy nhận chữ"); this.name = "CancelledError"; } }

/** OCR queue (1..N parallel lanes) with cancel + progress. Runner is injected so the logic is testable without Tesseract. */
export class OcrQueue {
  private jobs: OcrJob[] = [];
  private listeners = new Set<() => void>();
  private snap: readonly OcrJob[] = [];
  private waiters = new Map<string, { ok: (t: string) => void; fail: (e: unknown) => void }>();
  done = 0;
  constructor(private runner: () => OcrRunner, private onDone: OcrDone, private concurrency = 1, private idle: () => Promise<void> = whenScanIdle) {}

  private emit() { this.snap = this.jobs.map((j) => ({ ...j })); this.listeners.forEach((l) => l()); }
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  snapshot = () => this.snap;

  /** Queue pages; a page already queued is not added twice. Resolves per page with its text. */
  add(items: Omit<OcrJob, "id" | "status" | "progress">[]) {
    const out: Promise<string>[] = [];
    for (const it of items) {
      const dup = this.jobs.find((j) => j.docId === it.docId && j.pageId === it.pageId);
      const id = dup?.id ?? `${it.docId}:${it.pageId}:${Math.random().toString(36).slice(2, 7)}`;
      if (!dup) this.jobs.push({ ...it, id, status: "queued", progress: 0 });
      out.push(new Promise<string>((ok, fail) => {
        const prev = this.waiters.get(id);
        this.waiters.set(id, { ok: (t) => { prev?.ok(t); ok(t); }, fail: (e) => { prev?.fail(e); fail(e); } });
      }));
    }
    this.emit(); this.pump();
    return out;
  }

  /** S7: nhiều làn chạy song song; mỗi làn có runner (Worker Tesseract) riêng. */
  private lanes: { r: OcrRunner | null; job: OcrJob | null; abort: (() => void) | null }[] = [];
  private pump() {
    while (this.lanes.length < this.concurrency) this.lanes.push({ r: null, job: null, abort: null });
    for (const lane of this.lanes) if (!lane.job) void this.runLane(lane);
  }
  private async runLane(lane: { r: OcrRunner | null; job: OcrJob | null; abort: (() => void) | null }) {
    // B08: nhường CPU cho camera — chờ màn hình chụp đóng trước khi nhận việc mới.
    for (let job = (await this.idle(), this.jobs.find((j) => j.status === "queued")); job; job = (await this.idle(), this.jobs.find((j) => j.status === "queued"))) {
      lane.job = job; job.status = "running"; this.emit();
      const r = (lane.r ??= this.runner());
      let text: string | null = null, err: unknown = null;
      const stop = new Promise<never>((_, rej) => { lane.abort = () => rej(new CancelledError()); });
      try { text = await Promise.race([r.run(job.src, (p) => { job!.progress = p; this.emit(); }), stop]); } catch (e) { err = e; }
      lane.abort = null; lane.job = null;
      if (!this.jobs.includes(job)) continue; // cancelled while running
      this.jobs = this.jobs.filter((j) => j !== job);
      const w = this.waiters.get(job.id); this.waiters.delete(job.id);
      if (err != null) w?.fail(err);
      else { this.done++; try { await this.onDone(job, text!); w?.ok(text!); } catch (e) { w?.fail(e); } }
      if (!this.jobs.length) this.done = 0;
      this.emit();
    }
  }

  /** Cancel matching jobs (all if no filter). A running job stops its worker. */
  async cancel(match: (j: OcrJob) => boolean = () => true) {
    const hit = this.jobs.filter(match); if (!hit.length) return;
    this.jobs = this.jobs.filter((j) => !hit.includes(j));
    for (const j of hit) { this.waiters.get(j.id)?.fail(new CancelledError()); this.waiters.delete(j.id); }
    if (!this.jobs.length) this.done = 0;
    this.emit();
    const stopping = this.lanes.filter((l) => l.job && hit.includes(l.job));
    for (const l of stopping) { l.abort?.(); const r = l.r; l.r = null; if (r) await r.abort(); }
  }
}

// ---- app singleton (Tesseract worker reused across jobs) ----
let queue: OcrQueue | null = null;
export function ocrQueue() {
  return (queue ??= new OcrQueue(tesseractRunner, async (job, text) => {
    const { getDocs, saveDoc } = await import("./db");
    const doc = getDocs().find((d) => d.id === job.docId); if (!doc) return;
    await saveDoc({ ...doc, pages: doc.pages.map((p) => (p.id === job.pageId ? { ...p, text } : p)) }, false);
  }, ocrLanes()));
}

/** HM-07: lỗi đầu tiên (không phải hủy) trong kết quả một đợt nhận chữ — kể cả khi TẤT CẢ trang đều lỗi. */
export function firstOcrFailure(rs: PromiseSettledResult<unknown>[]): unknown {
  return rs.find((r): r is PromiseRejectedResult => r.status === "rejected" && !(r.reason instanceof CancelledError))?.reason;
}

/** S7: 2 làn khi máy có ≥4 nhân, ngược lại 1 (Tesseract tốn RAM ~100 MB/Worker). */
export function ocrLanes(cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2) { return cores >= 4 ? 2 : 1; }

let laneNo = 0;
function tesseractRunner(): OcrRunner {
  const n = laneNo++; // làn 0 dùng Worker chung; làn khác có Worker riêng
  const eng = async () => { const m = await import("./ocr-worker"); return n === 0 ? m.sharedOcr() : m.extraOcr(); };
  let mine: Promise<import("./ocr-worker").SharedOcr> | null = null;
  return {
    async run(src, onProgress) {
      const { currentLang } = await import("./ocr-worker");
      const r = await (await (mine ??= eng())).run(await currentLang(), src, { onProgress });
      return String(r.data.text).trim();
    },
    async abort() { if (mine) await (await mine).reset(); },
  };
}

const EMPTY: readonly OcrJob[] = [];
export function useOcrJobs() {
  return useSyncExternalStore((l) => ocrQueue().subscribe(l), () => ocrQueue().snapshot(), () => EMPTY);
}
