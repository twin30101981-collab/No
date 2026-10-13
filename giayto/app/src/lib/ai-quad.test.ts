import { describe, expect, it } from "vitest";
import { parseAiQuad, orderQuad, isConvex } from "./ai-quad";

const c = (pts: number[][], confidence = 0.9, found = true) => ({ found, confidence, corners: pts.map(([x, y]) => ({ x, y })) });

describe("parseAiQuad", () => {
  it("orders shuffled corners TL,TR,BR,BL and normalizes", () => {
    const q = parseAiQuad(c([[900, 850], [100, 100], [100, 900], [880, 120]]))!;
    expect(q).toEqual([[0.1, 0.1], [0.88, 0.12], [0.9, 0.85], [0.1, 0.9]]);
    expect(isConvex(q)).toBe(true);
  });
  it("rejects unsure, missing, tiny or crossing answers", () => {
    expect(parseAiQuad(c([[100, 100], [900, 100], [900, 900], [100, 900]], 0.2))).toBeNull();
    expect(parseAiQuad(c([], 0.9, false))).toBeNull();
    expect(parseAiQuad(c([[400, 400], [500, 400], [500, 500], [400, 500]]))).toBeNull();
    expect(parseAiQuad(c([[100, 100], [900, 100], [900, 900], [1500, 900]]))).toBeNull();
    expect(parseAiQuad(c([[100, 100], [900, 100], [500, 120], [100, 900]]))).toBeNull();
  });
  it("orderQuad keeps a rotated sheet clockwise", () => {
    const q = orderQuad([[0.5, 0.05], [0.95, 0.5], [0.5, 0.95], [0.05, 0.5]]);
    expect(isConvex(q)).toBe(true);
  });
});
