import { describe, expect, it } from "vitest";
import { OrderedLanes, renderLanes } from "./ordered-lanes";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("V8 hàng đợi song song có thứ tự", () => {
  it("chạy tối đa 2 việc cùng lúc, ghi đúng thứ tự bấm", async () => {
    const q = new OrderedLanes(2); const out: number[] = [];
    [60, 10, 30, 5].forEach((ms, i) => q.push(async () => { await wait(ms); return i; }, (r) => { out.push(r); }));
    await q.idle();
    expect(out).toEqual([0, 1, 2, 3]);
    expect(q.peak).toBe(2);
  });
  it("một việc lỗi không chặn việc sau", async () => {
    const q = new OrderedLanes(2); const out: number[] = []; const errs: unknown[] = [];
    q.push(async () => { throw new Error("x"); }, () => {}, (e) => errs.push(e));
    q.push(async () => 7, (r) => { out.push(r); });
    await q.idle();
    expect(errs.length).toBe(1); expect(out).toEqual([7]);
  });
  it("song song nhanh hơn tuần tự", async () => {
    const q = new OrderedLanes(2); const t0 = Date.now();
    for (let i = 0; i < 4; i++) q.push(() => wait(50), () => {});
    await q.idle();
    expect(Date.now() - t0).toBeLessThan(170);
  });
  it("số làn đổi theo lúc: 1 làn khi đang bấm chụp", async () => {
    let busy = true; const q = new OrderedLanes(() => (busy ? 1 : 2));
    for (let i = 0; i < 3; i++) q.push(() => wait(40), () => {});
    await wait(60); expect(q.peak).toBe(1); busy = false;
    await q.idle();
  });
  it("số làn theo lõi (B06: min(4, cores/2), máy RAM yếu 1–2 làn)", () => { expect(renderLanes(4)).toBe(2); expect(renderLanes(8)).toBe(4); });
});
