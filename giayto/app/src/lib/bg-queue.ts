/**
 * P2: Hàng đợi xử lý nền bền (persistent background queue).
 *
 * Khác FinishQueue (chỉ trong bộ nhớ, mất khi tải lại): mọi việc nặng sau chụp
 * (dựng bản đầy đủ 300 dpi, ảnh thu nhỏ, OCR…) được ghi xuống IndexedDB trước khi chạy.
 * Tải lại giữa chừng → resume() đọc lại việc còn dở (running → queued) và chạy tiếp,
 * không mất bản đầy đủ của trang.
 *
 * Một việc mỗi lượt rảnh (requestIdleCallback, dự phòng setTimeout), huỷ theo trang,
 * chờ hết bằng flush(). Payload đủ để dựng lại việc sau khi tải lại.
 */
import type { PageEdit } from "./db";
import { idleScheduler, type IdleScheduler } from "./deferred-finish";

export type JobKind = "finish" | "thumb" | "ocr";
export type JobState = "queued" | "running" | "done" | "error";

export type JobPayload = {
  /** Ảnh gốc (data URL / blob URL) để dựng lại. */
  orig: string;
  edit?: PageEdit | undefined;
  /** Cạnh dài mục tiêu cho kind "finish". */
  targetLong?: number | undefined;
};

export type BgJob = {
  id: string;
  pageId: string;
  kind: JobKind;
  state: JobState;
  payload: JobPayload;
  attempts: number;
  error?: string | undefined;
  createdAt: number;
  updatedAt: number;
};

/** Kho lưu việc — thay được trong kiểm thử. */
export interface JobStore {
  all(): Promise<BgJob[]>;
  put(j: BgJob): Promise<void>;
  del(id: string): Promise<void>;
  clear(): Promise<void>;
}

export function memoryJobStore(): JobStore {
  const m = new Map<string, BgJob>();
  return {
    all: async () => [...m.values()].map((j) => structuredClone(j)),
    put: async (j) => { m.set(j.id, structuredClone(j)); },
    del: async (id) => { m.delete(id); },
    clear: async () => { m.clear(); },
  };
}

let dbp: Promise<IDBDatabase> | null = null;
function idb(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open("ghi-nhanh-jobs", 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("j")) r.result.createObjectStore("j", { keyPath: "id" }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction("j", mode); const q = f(t.objectStore("j")); t.oncomplete = () => res(q.result as T); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
}
export const idbJobStore: JobStore = {
  all: () => run<BgJob[]>("readonly", (s) => s.getAll() as IDBRequest<BgJob[]>),
  put: async (j) => { await run("readwrite", (s) => s.put(j)); },
  del: async (id) => { await run("readwrite", (s) => s.delete(id)); },
  clear: async () => { await run("readwrite", (s) => s.clear()); },
};

/** Hàm chạy thật theo loại việc — đăng ký khi khởi động app (renderPage, makeThumb, OCR…). */
export type JobHandler = (j: BgJob) => Promise<void>;
export type Handlers = Partial<Record<JobKind, JobHandler>>;

const MAX_ATTEMPTS = 2;

export class BgQueue {
  private jobs = new Map<string, BgJob>();
  private order: string[] = [];
  private running = false;
  private loaded = false;
  private listeners = new Set<() => void>();

  /** R4.2: đăng ký nghe thay đổi hàng đợi (để hiện nhãn tiến độ). */
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private notify() { for (const fn of this.listeners) fn(); }

  constructor(
    private store: JobStore = idbJobStore,
    private handlers: Handlers = {},
    private schedule: IdleScheduler = idleScheduler,
  ) {}

  get size() { return this.jobs.size; }
  has(pageId: string, kind?: JobKind) {
    for (const j of this.jobs.values()) if (j.pageId === pageId && (!kind || j.kind === kind)) return true;
    return false;
  }
  list(): BgJob[] { return [...this.jobs.values()].map((j) => ({ ...j })); }

  setHandler(kind: JobKind, h: JobHandler) { this.handlers[kind] = h; }

  /** Xếp việc mới cho trang; việc cùng trang + cùng loại trước đó bị thay. Ghi xuống kho trước khi chạy. */
  async enqueue(pageId: string, kind: JobKind, payload: JobPayload): Promise<BgJob> {
    await this.load();
    this.cancelPage(pageId, kind);
    const job: BgJob = {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      pageId, kind, state: "queued", payload, attempts: 0, createdAt: Date.now(), updatedAt: Date.now(),
    };
    this.jobs.set(job.id, job);
    this.order.push(job.id);
    await this.store.put(job).catch(() => {});
    this.notify();
    this.kick();
    return { ...job };
  }

  /** Huỷ mọi việc của một trang (người dùng xoá trang); đang chạy thì bỏ kết quả. */
  cancelPage(pageId: string, kind?: JobKind) {
    for (const j of [...this.jobs.values()]) {
      if (j.pageId !== pageId || (kind && j.kind !== kind)) continue;
      this.jobs.delete(j.id);
      this.order = this.order.filter((x) => x !== j.id);
      void this.store.del(j.id).catch(() => {});
    }
    this.notify();
  }
  cancelAll() { for (const j of [...this.jobs.values()]) this.cancelPage(j.pageId); }

  /** Đọc việc còn dở từ kho (sau khi tải lại): running → queued, error còn lượt → queued. */
  async resume(): Promise<number> {
    await this.load();
    let n = 0;
    for (const j of this.jobs.values()) {
      if (j.state === "running" || (j.state === "error" && j.attempts < MAX_ATTEMPTS)) {
        j.state = "queued"; j.updatedAt = Date.now();
        this.order.push(j.id); n++;
        void this.store.put(j).catch(() => {});
      } else if (j.state === "queued" && !this.order.includes(j.id)) {
        this.order.push(j.id); n++;
      }
    }
    this.kick();
    return n;
  }

  /** Chạy ngay mọi việc còn lại (khi lưu tài liệu) và chờ xong. */
  async flush() {
    await this.load();
    while (this.order.length || this.running) await this.step();
  }

  private async load() {
    if (this.loaded) return;
    this.loaded = true;
    const all = await this.store.all().catch(() => [] as BgJob[]);
    for (const j of all) if (j.state === "queued" || j.state === "running" || j.state === "error") this.jobs.set(j.id, j);
  }

  private kick() { if (!this.running && this.order.length) this.schedule(() => void this.step()); }

  private async step() {
    if (this.running) return;
    const id = this.order.shift();
    const j = id ? this.jobs.get(id) : undefined;
    if (!j) { if (this.order.length) this.kick(); return; }
    this.running = true;
    j.state = "running"; j.attempts++; j.updatedAt = Date.now();
    void this.store.put(j).catch(() => {});
    try {
      const h = this.handlers[j.kind];
      if (!h) throw new Error(`Chưa có bộ xử lý cho việc "${j.kind}"`);
      await h(j);
      // Chỉ xoá nếu việc chưa bị huỷ/thay giữa chừng.
      if (this.jobs.get(j.id) === j) { this.jobs.delete(j.id); void this.store.del(j.id).catch(() => {}); }
    } catch (e) {
      if (this.jobs.get(j.id) === j) {
        j.state = "error"; j.error = String((e as Error)?.message ?? e); j.updatedAt = Date.now();
        if (j.attempts < MAX_ATTEMPTS) { j.state = "queued"; this.order.push(j.id); }
        void this.store.put(j).catch(() => {});
      }
    } finally {
      this.running = false;
      this.notify();
      this.kick();
    }
  }
}

/** Hàng đợi dùng chung toàn app. */
export const bgQueue = new BgQueue();
