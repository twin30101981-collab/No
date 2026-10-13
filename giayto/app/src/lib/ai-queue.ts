// G2-09: hàng đợi việc AI — mất mạng thì giữ việc lại, có mạng lại tự gửi.
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useSyncExternalStore } from "react";
import { isScanActive, onScanIdle } from "./priority-gate";

export type AiJob = { id: number; label: string; createdAt: number };
type Entry = AiJob & { run: () => Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void };

/** Lỗi do mạng (không tới được máy chủ), khác lỗi AI trả về. */
export function isNetworkError(e: unknown): boolean {
  if (!e) return false;
  const m = String((e as { message?: string }).message ?? e).toLowerCase();
  return e instanceof TypeError || /failed to fetch|networkerror|network request failed|load failed|offline/.test(m);
}

export function createAiQueue(env: { online: () => boolean; onOnline: (cb: () => void) => void; busy?: () => boolean; onIdle?: (cb: () => void) => void }) {
  const busy = env.busy ?? (() => false);
  let seq = 0;
  const pending: Entry[] = [];
  const subs = new Set<() => void>();
  let snap: AiJob[] = [];
  let flushing = false;
  const emit = () => { snap = pending.map(({ id, label, createdAt }) => ({ id, label, createdAt })); subs.forEach((f) => f()); };

  async function flush() {
    if (flushing || !env.online()) return;
    flushing = true;
    try {
      while (pending.length && env.online() && !busy()) {
        const e = pending[0]!;
        try { const v = await e.run(); pending.shift(); e.resolve(v); }
        catch (err) {
          if (isNetworkError(err)) break; // vẫn mất mạng: giữ lại, chờ lần sau
          pending.shift(); e.reject(err);
        }
        emit();
      }
    } finally { flushing = false; emit(); }
  }
  env.onOnline(() => void flush());
  env.onIdle?.(() => void flush()); // B08: màn chụp đóng → gửi nốt việc AI đang giữ

  return {
    /** Chạy ngay nếu có mạng; mất mạng (hoặc lỗi mạng) thì xếp hàng, promise chờ tới khi gửi được. */
    async run<T>(label: string, run: () => Promise<T>, onQueued?: () => void): Promise<T> {
      if (env.online() && !pending.length && !busy()) {
        try { return await run(); } catch (e) { if (!isNetworkError(e)) throw e; }
      }
      onQueued?.();
      return new Promise<T>((resolve, reject) => {
        pending.push({ id: ++seq, label, createdAt: Date.now(), run, resolve: resolve as (v: unknown) => void, reject });
        emit();
        void flush();
      });
    },
    cancel(id: number) {
      const i = pending.findIndex((e) => e.id === id);
      if (i < 0) return;
      const [e] = pending.splice(i, 1);
      e!.reject(new Error("Đã hủy việc AI đang chờ mạng."));
      emit();
    },
    flush,
    jobs: () => snap,
    subscribe: (f: () => void) => { subs.add(f); return () => subs.delete(f); },
  };
}

let shared: ReturnType<typeof createAiQueue> | null = null;
export function aiQueue() {
  if (!shared) {
    shared = createAiQueue({
      online: () => typeof navigator === "undefined" || navigator.onLine !== false,
      onOnline: (cb) => { if (typeof window !== "undefined") window.addEventListener("online", cb); },
      busy: isScanActive, // B08: đang chụp thì giữ việc AI lại
      onIdle: onScanIdle,
    });
  }
  return shared;
}

const EMPTY: AiJob[] = [];
export function useAiJobs(): AiJob[] {
  const q = aiQueue();
  return useSyncExternalStore(q.subscribe, q.jobs, () => EMPTY);
}

/** Thay cho useServerFn với các hàm AI: tự xếp hàng khi mất mạng. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useQueuedServerFn<F extends (...a: any[]) => Promise<any>>(fn: F, label: string): F {
  const call = useServerFn(fn) as unknown as F;
  return useCallback(((...args: Parameters<F>) => aiQueue().run(label, () => call(...args), () => {
    void import("sonner").then(({ toast }) => toast.info("Đang mất mạng — việc AI đã được giữ lại và sẽ tự gửi khi có mạng.")).catch(() => {});
  })) as F, [call, label]);
}
