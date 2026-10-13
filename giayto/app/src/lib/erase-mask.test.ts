import { describe, expect, it } from "vitest";
import { fillMaskFlat, maskArea, strokesToMask } from "./erase-mask";

describe("erase mask", () => {
  it("fills a continuous line without gaps", () => {
    const m = strokesToMask([{ pts: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }], r: 0.02 }], 100, 100);
    for (let x = 10; x <= 90; x++) expect(m[50 * 100 + x]).toBe(1);
    expect(m[10 * 100 + 50]).toBe(0);
  });
  it("eraser strokes clear the mask", () => {
    const m = strokesToMask([{ pts: [{ x: 0.5, y: 0.5 }], r: 0.1 }, { pts: [{ x: 0.5, y: 0.5 }], r: 0.2, erase: true }], 50, 50);
    expect(maskArea(m)).toBe(0);
  });
  it("flat fill uses surrounding paper colour", () => {
    const w = 10, h = 10, d = new Uint8ClampedArray(w * h * 4).fill(240);
    d.set([0, 0, 0, 255], (5 * w + 5) * 4);
    const m = new Uint8Array(w * h); m[5 * w + 5] = 1;
    fillMaskFlat(d, w, h, m);
    expect(d[(5 * w + 5) * 4]).toBe(240);
  });
});

import { inpaint } from "./erase-mask";
describe("inpaint", () => {
  it("continues a horizontal gradient and leaves unmasked pixels alone", () => {
    const w = 40, h = 20, d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d.set([x * 5, 100, 200, 255], i); }
    const m = new Uint8Array(w * h);
    for (let y = 6; y < 14; y++) for (let x = 15; x < 25; x++) { m[y * w + x] = 1; d.set([0, 0, 0, 255], (y * w + x) * 4); }
    const before = d[(2 * w + 2) * 4];
    inpaint(d, w, h, m);
    expect(d[(2 * w + 2) * 4]).toBe(before);
    expect(Math.abs(d[(10 * w + 20) * 4] - 100)).toBeLessThan(15);
    expect(d[(10 * w + 20) * 4 + 1]).toBeGreaterThan(90);
  });
});

import { suggestFingers } from "./erase-mask";
describe("suggestFingers", () => {
  const page = (w: number, h: number) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d.set([235, 235, 230, 255], i * 4); return d; };
  const skinAt = (d: Uint8ClampedArray, w: number, x0: number, x1: number, y0: number, y1: number) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d.set([220, 160, 130, 255], (y * w + x) * 4); };
  it("finds a finger entering from the left edge", () => {
    const w = 100, h = 100, d = page(w, h); skinAt(d, w, 0, 15, 40, 48);
    const m = suggestFingers(d, w, h)!; expect(m).not.toBeNull(); expect(m[44 * w + 5]).toBe(1); expect(m[44 * w + 60]).toBe(0);
  });
  it("ignores skin-coloured blobs inside the page", () => {
    const w = 100, h = 100, d = page(w, h); skinAt(d, w, 40, 55, 40, 48);
    expect(suggestFingers(d, w, h)).toBeNull();
  });
  it("ignores a large warm background filling the side", () => {
    const w = 100, h = 100, d = page(w, h); skinAt(d, w, 0, 60, 0, 100);
    expect(suggestFingers(d, w, h)).toBeNull();
  });
});
