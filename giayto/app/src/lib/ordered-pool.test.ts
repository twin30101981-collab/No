import { describe, expect, it } from "vitest";
import { orderedPool } from "./ordered-pool";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
describe("orderedPool (S7c)", () => {
  it("giữ đúng thứ tự dù trang xong lệch nhau", async () => {
    const out: number[] = [];
    for await (const v of orderedPool([30, 5, 20, 1, 10], 3, async (ms, i) => { await wait(ms); return i; })) out.push(v);
    expect(out).toEqual([0, 1, 2, 3, 4]);
  });
  it("không vượt quá số làn", async () => {
    let live = 0, peak = 0;
    for await (const _ of orderedPool(Array(8).fill(5), 3, async (ms) => { live++; peak = Math.max(peak, live); await wait(ms); live--; return 0; })) void _;
    expect(peak).toBeLessThanOrEqual(3); expect(peak).toBeGreaterThan(1);
  });
  it("chạy song song nhanh hơn tuần tự", async () => {
    const t = Date.now();
    for await (const _ of orderedPool(Array(6).fill(30), 3, (ms) => wait(ms))) void _;
    expect(Date.now() - t).toBeLessThan(150);
  });
  it("báo lỗi trang hỏng", async () => {
    const it = orderedPool([1, 2], 2, async (x) => { if (x === 2) throw new Error("hong"); return x; });
    await expect((async () => { for await (const _ of it) void _; })()).rejects.toThrow("hong");
  });
});
