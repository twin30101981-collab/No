import { describe, it, expect } from "vitest";
import { pmapOrdered } from "./pmap";

describe("pmapOrdered", () => {
  it("giữ thứ tự và giới hạn song song", async () => {
    let live = 0, peak = 0; const out: number[] = [];
    await pmapOrdered([30, 5, 20, 1, 10, 2], 3, async (ms) => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, ms)); live--; return ms; }, (r) => { out.push(r); });
    expect(out).toEqual([30, 5, 20, 1, 10, 2]);
    expect(peak).toBeLessThanOrEqual(3);
  });
  it("mảng rỗng", async () => { await pmapOrdered([], 3, async () => 1, () => { throw new Error("x"); }); });
});
