import { describe, expect, it } from "vitest";
import { createAiQueue, isNetworkError } from "./ai-queue";

function env(start: boolean) {
  let on = start; let cb = () => {};
  return { e: { online: () => on, onOnline: (f: () => void) => { cb = f; } }, go: (v: boolean) => { on = v; if (v) cb(); } };
}

describe("aiQueue", () => {
  it("chạy ngay khi có mạng", async () => {
    const { e } = env(true); const q = createAiQueue(e);
    expect(await q.run("a", async () => 5)).toBe(5);
    expect(q.jobs()).toHaveLength(0);
  });

  it("mất mạng thì giữ lại, có mạng tự gửi theo thứ tự", async () => {
    const { e, go } = env(false); const q = createAiQueue(e);
    const order: string[] = [];
    let queued = 0;
    const p1 = q.run("a", async () => { order.push("a"); return 1; }, () => queued++);
    const p2 = q.run("b", async () => { order.push("b"); return 2; });
    expect(q.jobs().map((j) => j.label)).toEqual(["a", "b"]);
    expect(queued).toBe(1);
    go(true);
    expect(await Promise.all([p1, p2])).toEqual([1, 2]);
    expect(order).toEqual(["a", "b"]);
    expect(q.jobs()).toHaveLength(0);
  });

  it("lỗi mạng giữa chừng thì xếp hàng, lỗi AI thì báo ngay", async () => {
    const { e, go } = env(true); const q = createAiQueue(e);
    let n = 0;
    const p = q.run("x", async () => { if (n++ === 0) throw new TypeError("Failed to fetch"); return "ok"; });
    await Promise.resolve();
    go(true);
    expect(await p).toBe("ok");
    await expect(q.run("y", async () => { throw new Error("AI hỏng"); })).rejects.toThrow("AI hỏng");
  });

  it("hủy việc đang chờ", async () => {
    const { e } = env(false); const q = createAiQueue(e);
    const p = q.run("a", async () => 1);
    q.cancel(q.jobs()[0]!.id);
    await expect(p).rejects.toThrow();
    expect(q.jobs()).toHaveLength(0);
    expect(isNetworkError(new TypeError("Load failed"))).toBe(true);
  });
});
