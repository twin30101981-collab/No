/**
 * S8: nhật ký phiên quét (session journal). Mỗi lần danh sách trang thay đổi,
 * ghi toàn bộ phiên xuống IndexedDB riêng ("ghi-nhanh-journal") để tải lại giữa chừng
 * không mất trang. Commit sang tài liệu dùng commitId cố định theo phiên → không trùng.
 */
import type { Page } from "./db";

export type PageState = "queued" | "running" | "done" | "error";
export type Journal = {
  id: string; mode: string; docId?: string | undefined;
  pages: Page[]; states: Record<string, PageState>;
  pending: number; committedDocId?: string | undefined; updatedAt: number;
};
export interface KV { get(k: string): Promise<Journal | undefined>; set(k: string, v: Journal): Promise<void>; del(k: string): Promise<void> }

const KEY = "current";

export function memoryKV(): KV {
  const m = new Map<string, Journal>();
  return { get: async (k) => (m.has(k) ? structuredClone(m.get(k)!) : undefined), set: async (k, v) => { m.set(k, structuredClone(v)); }, del: async (k) => { m.delete(k); } };
}

let dbp: Promise<IDBDatabase> | null = null;
function idb(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open("ghi-nhanh-journal", 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("j")) r.result.createObjectStore("j"); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction("j", mode); const q = f(t.objectStore("j")); t.oncomplete = () => res(q.result as T); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
}
export const idbKV: KV = {
  get: (k) => run<Journal | undefined>("readonly", (s) => s.get(k)),
  set: async (k, v) => { await run("readwrite", (s) => s.put(v, k)); },
  del: async (k) => { await run("readwrite", (s) => s.delete(k)); },
};

export function newJournal(mode: string, docId?: string): Journal {
  return { id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), mode, docId, pages: [], states: {}, pending: 0, updatedAt: Date.now() };
}

/** Ghi tuần tự (không ghi chồng lệnh cũ lên lệnh mới) — bản cuối luôn thắng. */
export class JournalWriter {
  private chain: Promise<void> = Promise.resolve();
  constructor(private kv: KV = idbKV) {}
  save(j: Journal) {
    const snap: Journal = { ...j, pages: [...j.pages], states: { ...j.states }, updatedAt: Date.now() };
    this.chain = this.chain.then(() => (snap.pages.length || snap.pending ? this.kv.set(KEY, snap) : this.kv.del(KEY))).catch(() => {});
    return this.chain;
  }
  flush() { return this.chain; }
  async load(): Promise<Journal | undefined> {
    const j = await this.kv.get(KEY).catch(() => undefined);
    return j && !j.committedDocId && j.pages.length ? j : undefined;
  }
  /** Commit nguyên tử: đánh dấu đã commit trước khi xoá; save(docId) cùng id → ghi đè, không trùng. */
  async commit(j: Journal, save: (commitId: string) => Promise<string>) {
    await this.flush();
    const docId = await save(j.id);
    await this.kv.set(KEY, { ...j, committedDocId: docId, updatedAt: Date.now() });
    await this.kv.del(KEY);
    return docId;
  }
  clear() { this.chain = this.chain.then(() => this.kv.del(KEY)).catch(() => {}); return this.chain; }
}

export function stateCounts(j: Pick<Journal, "pages" | "states" | "pending">) {
  const c: Record<PageState, number> = { queued: j.pending, running: 0, done: 0, error: 0 };
  for (const p of j.pages) c[j.states[p.id] ?? "done"]++;
  return c;
}
