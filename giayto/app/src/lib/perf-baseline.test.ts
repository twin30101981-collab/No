import { describe, expect, it } from "vitest";
import { buildBaseline, pct, type PerfSample } from "./perf-stats";

describe("B00 perf-baseline", () => {
  it("p50/p95 trên 20 mẫu 1..20", () => {
    const v = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(pct(v, 0.5)).toBe(10);
    expect(pct(v, 0.95)).toBe(19);
  });
  it("gom đủ 5 mốc grab/release/preview-shown/normalize/render", () => {
    const perf: PerfSample[] = [{ k: "release", ms: 100, at: 0 }, { k: "release", ms: 300, at: 0 }, { k: "detect", ms: 5, at: 0 }];
    const b = buildBaseline(perf, "V12", new Date(0), "ua");
    expect(Object.keys(b.stages)).toEqual(["grab", "release", "preview-shown", "normalize", "render"]);
    expect(b.stages.release).toEqual({ count: 2, p50: 100, p95: 300 });
    expect(b.stages.grab.count).toBe(0);
  });
});
