import { describe, expect, it } from "vitest";
import { detectTextLines, lineBend } from "./textlines";

/** Trang giả: N dòng "chữ" (vệt đứt quãng), cong theo parabol với độ võng `sag` (px). */
function page(W: number, H: number, n: number, sag: number) {
  const g = new Uint8Array(W * H).fill(235);
  for (let k = 0; k < n; k++) {
    const base = 60 + k * ((H - 120) / (n - 1));
    for (let x = 30; x < W - 30; x++) {
      if (x % 14 > 10) continue; // khoảng giữa các "chữ"
      const t = x / W; const yc = base + sag * 4 * t * (1 - t);
      for (let d = -3; d <= 3; d++) { const y = Math.round(yc + d); if (y >= 0 && y < H) g[y * W + x] = 30; }
    }
  }
  return g;
}

describe("dò dòng chữ", () => {
  it("trang phẳng: tìm đủ dòng, gần như thẳng", () => {
    const L = detectTextLines(page(600, 800, 12, 0), 600, 800);
    expect(L.length).toBe(12);
    for (const l of L) { expect(l.cover).toBeGreaterThan(0.8); expect(lineBend(l)).toBeLessThan(0.005); }
  });
  it("trang cong: vẫn bám đúng dòng và đo được độ võng", () => {
    const L = detectTextLines(page(600, 800, 12, 30), 600, 800);
    expect(L.length).toBe(12);
    for (const l of L) { expect(l.cover).toBeGreaterThan(0.8); expect(lineBend(l) * 800).toBeGreaterThan(20); expect(lineBend(l) * 800).toBeLessThan(36); }
    // dòng không lẫn sang nhau: thứ tự theo y giữ nguyên ở mọi điểm
    for (let i = 1; i < L.length; i++) expect(L[i].pts[3][1]).toBeGreaterThan(L[i - 1].pts[3][1]);
  });
  it("ảnh trắng: không có dòng", () => {
    expect(detectTextLines(new Uint8Array(200 * 200).fill(240), 200, 200)).toEqual([]);
  });
});
