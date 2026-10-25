import { describe, expect, it } from "vitest";
import { detectPaperGray } from "./detect";

// White sheet on a dark desk with a strong table rule inside: the rule must not be taken as the top edge.
describe("detectPaperGray side contrast", () => {
  it("ignores lines printed inside the page", () => {
    const w = 270, h = 360, g = new Float32Array(w * h).fill(60);
    for (let y = 30; y < 330; y++) for (let x = 40; x < 230; x++) g[y * w + x] = 225;
    for (let y = 90; y < 92; y++) for (let x = 50; x < 220; x++) g[y * w + x] = 30;
    const d = detectPaperGray(g, w, h)!;
    expect(d).not.toBeNull();
    expect(Math.abs(d.quad[0][1] - 30 / h)).toBeLessThan(0.03);
    expect(Math.abs(d.quad[3][1] - 330 / h)).toBeLessThan(0.03);
  });
});
