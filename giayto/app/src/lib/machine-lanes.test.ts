import { describe, it, expect, afterEach } from "vitest";
import { machineLanes } from "./machine-lanes";
import { OrderedLanes } from "./ordered-lanes";

afterEach(() => {
  delete (globalThis as { __v8Lanes?: number }).__v8Lanes;
});

describe("machineLanes (B06)", () => {
  it("máy RAM ≤ 4 GB chỉ chạy 1–2 làn", () => {
    expect(machineLanes(8, 4)).toBe(2);
    expect(machineLanes(2, 3)).toBe(1);
    expect(machineLanes(4, 4)).toBe(2);
  });
  it("máy mạnh chạy tối đa min(4, cores/2)", () => {
    expect(machineLanes(8, 8)).toBe(4);
    expect(machineLanes(16, 16)).toBe(4);
    expect(machineLanes(6, 8)).toBe(3);
    expect(machineLanes(4, 8)).toBe(2);
  });
  it("công tắc __v8Lanes ghi đè để đo so sánh", () => {
    (globalThis as { __v8Lanes?: number }).__v8Lanes = 1;
    expect(machineLanes(16, 16)).toBe(1);
  });
});

describe("OrderedLanes backpressure (B06)", () => {
  it("từ chối khi hàng chờ đầy", async () => {
    const lanes = new OrderedLanes(1, 1); // 1 làn, chỉ chờ tối đa 1 việc
    let gate!: () => void;
    const block = new Promise<void>((r) => (gate = r));
    const errors: unknown[] = [];
    lanes.push(() => block, () => {});
    lanes.push(() => block, () => {});
    await expect(lanes.push(() => block, () => {}, (e) => errors.push(e))).rejects.toThrow(/backpressure/);
    expect(errors).toHaveLength(1);
    gate();
    await lanes.idle();
  });
  it("maxWaiting = 0 giữ hành vi cũ (không giới hạn)", async () => {
    const lanes = new OrderedLanes(1);
    let done = 0;
    const jobs = Array.from({ length: 5 }, () => lanes.push(async () => {}, () => { done++; }));
    await Promise.all(jobs);
    expect(done).toBe(5);
  });
});
