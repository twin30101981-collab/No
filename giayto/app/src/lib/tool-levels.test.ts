import { describe, expect, it } from "vitest";
import { applyTools, clampLevel, clarifyPixels, cornersPixels, toolsKey, whitenPixels } from "./tool-levels";
import { halfQuad, isLandscapeSpread } from "./spread-page";
import { loupePlacement } from "./loupe";
import { editsEqual } from "./edit-session";
import type { PageEdit, Quad } from "./db";

const fill = (W: number, H: number, f: (x: number, y: number) => number) => {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = f(x, y), i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  return d;
};

describe("P4.3–P4.6 công cụ 3 mức", () => {
  it("chỉ nhận mức 0..3", () => { expect(clampLevel(5)).toBe(3); expect(clampLevel(-1)).toBe(0); expect(clampLevel("x")).toBe(0); expect(clampLevel(2)).toBe(2); });
  it("mức 0 không đổi ảnh", () => { const d = fill(8, 8, (x) => x * 20); const c = d.slice(); applyTools(d, 8, 8, { clarify: 0, whiten: 0, corners: 0 }); expect(d).toEqual(c); });
  it("Sáng nền: mức cao làm nền trắng hơn", () => {
    const mk = () => fill(20, 20, (x, y) => (x === 10 && y === 10 ? 30 : 200));
    const lv = [1, 2, 3].map((l) => whitenPixels(mk(), l as 1 | 2 | 3)[0]);
    expect(lv[0]).toBeGreaterThan(200); expect(lv[2]).toBeGreaterThanOrEqual(lv[0]);
  });
  it("Làm rõ chữ: mức cao tăng tương phản cạnh chữ", () => {
    const mk = () => fill(9, 9, (x) => (x < 4 ? 60 : 220));
    const dark = [1, 3].map((l) => clarifyPixels(mk(), 9, 9, l as 1 | 3)[(4 * 9 + 3) * 4]);
    expect(dark[0]).toBeLessThan(60); expect(dark[1]).toBeLessThan(dark[0]);
  });
  it("Xoá góc ố đen: góc tối được nâng, tâm giữ nguyên", () => {
    const W = 60, H = 60; const mk = () => fill(W, H, (x, y) => Math.max(80, 230 - Math.hypot(x - 30, y - 30) * 4));
    const out = cornersPixels(mk(), W, H, 3);
    expect(out[0]).toBeGreaterThan(150); expect(out[(30 * W + 30) * 4]).toBe(230);
  });
  it("đổi mức công cụ = trang có thay đổi", () => {
    const e: PageEdit = { rotation: 0, filter: "original", brightness: 0, contrast: 0 };
    expect(editsEqual(e, { ...e, tools: { whiten: 0 } })).toBe(true);
    expect(editsEqual(e, { ...e, tools: { whiten: 2 } })).toBe(false);
    expect(toolsKey({ clarify: 3 })).toBe("30000");
  });
});

describe("P3.4 trang báo ngang", () => {
  it("nhận ảnh ngang từ tỉ lệ 1,15", () => { expect(isLandscapeSpread(1150, 1000)).toBe(true); expect(isLandscapeSpread(1100, 1000)).toBe(false); });
  it("tách đúng nửa trái/phải", () => {
    const q: Quad = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(halfQuad(q, "left")).toEqual([[0, 0], [0.5, 0], [0.5, 1], [0, 1]]);
    expect(halfQuad(q, "right")).toEqual([[0.5, 0], [1, 0], [1, 1], [0.5, 1]]);
  });
});

describe("P3.1 kính lúp", () => {
  it("luôn nằm trong khung ảnh", () => {
    for (const [fx, fy] of [[0, 0], [1, 1], [0.5, 0.05], [0.9, 0.5]]) {
      const L = loupePlacement(fx, fy, 300, 400);
      expect(L.left).toBeGreaterThanOrEqual(0); expect(L.top).toBeGreaterThanOrEqual(0);
      expect(L.left + 112).toBeLessThanOrEqual(300); expect(L.top + 112).toBeLessThanOrEqual(400);
    }
  });
  it("không che điểm đang kéo", () => {
    const L = loupePlacement(0.5, 0.5, 300, 400); const px = 150, py = 200;
    expect(px >= L.left && px <= L.left + 112 && py >= L.top && py <= L.top + 112).toBe(false);
  });
});
