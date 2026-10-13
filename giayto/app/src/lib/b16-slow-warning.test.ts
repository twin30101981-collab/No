import { describe, expect, it } from "vitest";
import { buildBaseline, slowWarnings, slowWarningText, SLOW_MIN_SAMPLES, type PerfSample } from "./perf-stats";

const samples = (k: PerfSample["k"], ms: number, n: number): PerfSample[] =>
  Array.from({ length: n }, () => ({ k, ms, at: 0 }));

describe("B16 — tự cảnh báo khi chậm", () => {
  const base = buildBaseline(samples("release", 100, 20), "V12", new Date(0), "ua");

  it("không báo khi p95 trong ngưỡng +20%", () => {
    expect(slowWarnings(samples("release", 120, 10), base)).toEqual([]);
  });

  it("báo khi p95 vượt mốc 20%", () => {
    const w = slowWarnings(samples("release", 150, 10), base);
    expect(w).toHaveLength(1);
    expect(w[0].kind).toBe("release");
    expect(w[0].p95).toBe(150);
    expect(w[0].baseP95).toBe(100);
    expect(w[0].ratio).toBeCloseTo(1.5);
  });

  it(`bỏ qua mốc có ít hơn ${SLOW_MIN_SAMPLES} mẫu`, () => {
    expect(slowWarnings(samples("release", 500, SLOW_MIN_SAMPLES - 1), base)).toEqual([]);
  });

  it("bỏ qua mốc baseline không có dữ liệu (p95 = 0)", () => {
    const w = slowWarnings(samples("grab", 9999, 10), base);
    expect(w).toEqual([]);
  });

  it("sắp xếp theo mức chậm giảm dần", () => {
    const perf = [...samples("release", 150, 10), ...samples("render", 0, 0)];
    const b2 = buildBaseline([...samples("release", 100, 20), ...samples("normalize", 100, 20)], "V12", new Date(0), "ua");
    const w = slowWarnings([...perf, ...samples("normalize", 300, 10)], b2);
    expect(w.map((x) => x.kind)).toEqual(["normalize", "release"]);
  });

  it("slowWarningText nêu mốc và % chậm", () => {
    const t = slowWarningText({ kind: "preview-shown", p95: 400, baseP95: 300, ratio: 4 / 3 });
    expect(t).toContain("hiện xem trước");
    expect(t).toContain("33%");
    expect(t).toContain("400 ms");
    expect(t).toContain("300 ms");
  });
});
