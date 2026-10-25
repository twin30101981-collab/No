import { beforeEach, describe, expect, it } from "vitest";
import { clearPerf, readPerf, stageReport, timed } from "./perf-stats";

describe("S1 – đo chuỗi công đoạn chụp", () => {
  beforeEach(() => clearPerf());
  it("timed ghi đúng công đoạn và trả kết quả", async () => {
    const v = await timed("normalize", async () => 42);
    expect(v).toBe(42);
    expect(readPerf()[0].k).toBe("normalize");
  });
  it("timed vẫn ghi khi tác vụ lỗi", async () => {
    await expect(timed("render", () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(readPerf()[0].k).toBe("render");
  });
  it("stageReport tính median/p90 theo từng công đoạn", () => {
    localStorage.setItem("ghi-nhanh:perf", JSON.stringify([10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((ms) => ({ k: "grab", ms, at: 0 }))));
    const r = stageReport(readPerf());
    expect(r.grab).toEqual({ count: 10, median: 50, p90: 90 });
    expect(r.render.count).toBe(0);
  });
});
