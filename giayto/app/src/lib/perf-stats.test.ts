import { beforeEach, describe, expect, it } from "vitest";
import { buildReport, clearPerf, readPerf, recordPerf, stat } from "./perf-stats";

describe("perf-stats (G2-16)", () => {
  beforeEach(() => clearPerf());

  it("trung vị và p90", () => {
    expect(stat([])).toEqual({ count: 0, median: 0, p90: 0 });
    const s = stat([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(s.median).toBe(50); expect(s.p90).toBe(90);
  });

  it("ghi mẫu, giữ tối đa 600 mục", () => {
    for (let i = 0; i < 610; i++) recordPerf("detect", i);
    const l = readPerf(); expect(l).toHaveLength(600); expect(l[0].ms).toBe(609);
  });

  it("báo cáo tách GPU/CPU, tỉ lệ lỗi AI và lỗi hay gặp", () => {
    recordPerf("warp-gpu", 80); recordPerf("warp-cpu", 300);
    const r = buildReport(readPerf(), [
      { at: "", code: "AI_OK", message: "", aiStatus: "ok", ms: 12000 },
      { at: "", code: "AI_OK", message: "", aiStatus: "ok", ms: 8000 },
      { at: "", code: "AI_TIMEOUT", message: "", aiStatus: "fail" },
      { at: "", code: "CAM_SLOW", message: "" },
    ]);
    expect(r.warpGpu.median).toBe(80); expect(r.warpCpu.median).toBe(300);
    expect(r.ai.ok).toBe(2); expect(r.ai.fail).toBe(1); expect(r.ai.errorRate).toBeCloseTo(1 / 3);
    expect(r.ai.median).toBe(8000);
    expect(r.topErrors.map((e) => e.code).sort()).toEqual(["AI_TIMEOUT", "CAM_SLOW"]);
  });
});
