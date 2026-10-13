import { describe, expect, it } from "vitest";
import { fieldReport, type FieldSample } from "./field-test";
import type { Quad } from "./db";

const Q: Quad = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
const off: Quad = [[0.2, 0.2], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
const q = { score: 80, level: "ok", blur: 50, brightness: 150, contrast: 50, glare: 0, skew: 0 };
const s = (p: Partial<FieldSample>): FieldSample => ({ id: "x", name: "a", width: 1000, height: 1000, ms: 100, detected: Q, truth: Q, verdict: "ok", quality: q, ...p });

describe("fieldReport", () => {
  it("counts hits, misses and false finds; skips pending", () => {
    const r = fieldReport([s({}), s({ verdict: "fixed", detected: off }), s({ verdict: "fixed", detected: null }), s({ verdict: "nopaper", truth: null }), s({ verdict: "pending" })]);
    expect([r.total, r.judged, r.hit, r.miss, r.falseFind]).toEqual([5, 4, 1, 2, 1]);
    expect(r.hitRate).toBeCloseTo(1 / 3, 2);
    expect(r.worstError).toBeGreaterThan(0.05);
  });
  it("suggests tuning when the hit rate is low", () => {
    const r = fieldReport(Array.from({ length: 6 }, () => s({ verdict: "fixed", detected: off })));
    expect(r.hitRate).toBe(0);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
