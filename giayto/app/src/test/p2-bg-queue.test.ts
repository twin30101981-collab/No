import { describe, it, expect } from "vitest";
import { BgQueue, memoryJobStore, type BgJob } from "@/lib/bg-queue";
import type { IdleScheduler } from "@/lib/deferred-finish";

function manual() { const q: (() => void)[] = []; const s: IdleScheduler = (cb) => { q.push(cb); }; return { s, tick: async () => { const f = q.shift(); f?.(); await new Promise((r) => setTimeout(r, 0)); }, pending: () => q.length }; }
const payload = { orig: "data:image/jpeg;base64,x", targetLong: 3000 };

describe("P2 hàng đợi xử lý nền", () => {
  it("ghi việc xuống kho trước khi chạy, xoá khi xong", async () => {
    const store = memoryJobStore(); const m = manual();
    const q = new BgQueue(store, { finish: async () => {} }, m.s);
    await q.enqueue("p1", "finish", payload);
    expect((await store.all()).map((j) => j.pageId)).toEqual(["p1"]);
    await m.tick();
    expect(await store.all()).toEqual([]);
    expect(q.size).toBe(0);
  });

  it("một việc mỗi lượt, đúng thứ tự xếp hàng", async () => {
    const m = manual(); const done: string[] = [];
    const q = new BgQueue(memoryJobStore(), { finish: async (j) => { done.push(j.pageId); } }, m.s);
    await q.enqueue("a", "finish", payload); await q.enqueue("b", "finish", payload);
    await q.flush();
    expect(done).toEqual(["a", "b"]);
  });

  it("flush() lúc có việc ĐANG chạy (chờ ảnh/timer) → chờ việc đó xong, không treo vòng microtask", async () => {
    // Lỗi máy thật 13/10: bấm "Xong" khi ảnh vừa chụp còn đang hoàn thiện → cả trang treo cứng.
    const m = manual(); const done: string[] = [];
    const q = new BgQueue(memoryJobStore(), { finish: async (j) => { await new Promise((r) => setTimeout(r, 30)); done.push(j.pageId); } }, m.s);
    await q.enqueue("a", "finish", payload); await q.enqueue("b", "finish", payload);
    await m.tick(); // "a" bắt đầu chạy (đang chờ timer 30 ms)
    expect(done).toEqual([]);
    await q.flush();
    expect(done).toEqual(["a", "b"]);
    expect(q.size).toBe(0);
  });

  it("lỗi → thử lại 1 lần rồi đánh dấu error, việc sau vẫn chạy", async () => {
    const store = memoryJobStore(); const m = manual(); const done: string[] = [];
    let calls = 0;
    const q = new BgQueue(store, { finish: async (j) => { if (j.pageId === "bad") { calls++; throw new Error("hỏng"); } done.push(j.pageId); } }, m.s);
    await q.enqueue("bad", "finish", payload); await q.enqueue("ok", "finish", payload);
    await q.flush();
    expect(calls).toBe(2); // 1 lần chạy + 1 lần thử lại
    expect(done).toEqual(["ok"]);
    const left = await store.all();
    expect(left).toHaveLength(1); expect(left[0]!.state).toBe("error"); expect(left[0]!.error).toBe("hỏng");
  });

  it("huỷ theo trang: xoá trang → bỏ việc, không chạy nữa", async () => {
    const m = manual(); let ran = 0;
    const q = new BgQueue(memoryJobStore(), { finish: async () => { ran++; } }, m.s);
    await q.enqueue("p1", "finish", payload);
    q.cancelPage("p1");
    await m.tick();
    expect(ran).toBe(0); expect(q.size).toBe(0);
  });

  it("xếp lại cùng trang cùng loại → việc cũ bị thay", async () => {
    const m = manual(); const got: number[] = [];
    const q = new BgQueue(memoryJobStore(), { finish: async (j) => { got.push(j.payload.targetLong ?? 0); } }, m.s);
    await q.enqueue("p1", "finish", { ...payload, targetLong: 1600 });
    await q.enqueue("p1", "finish", { ...payload, targetLong: 3000 });
    await q.flush();
    expect(got).toEqual([3000]);
  });

  it("resume sau tải lại: running → queued và chạy tiếp", async () => {
    const store = memoryJobStore();
    const stuck: BgJob = { id: "j1", pageId: "p9", kind: "finish", state: "running", payload, attempts: 1, createdAt: 1, updatedAt: 1 };
    await store.put(stuck);
    const m = manual(); const done: string[] = [];
    const q = new BgQueue(store, { finish: async (j) => { done.push(j.pageId); } }, m.s);
    const n = await q.resume();
    expect(n).toBe(1);
    await q.flush();
    expect(done).toEqual(["p9"]);
    expect(await store.all()).toEqual([]);
  });

  it("không chạy trên đường găng: chỉ chạy khi lượt rảnh tới", async () => {
    const m = manual(); let ran = 0;
    const q = new BgQueue(memoryJobStore(), { finish: async () => { ran++; } }, m.s);
    await q.enqueue("p1", "finish", payload);
    expect(ran).toBe(0);
    await m.tick();
    expect(ran).toBe(1);
  });
});
