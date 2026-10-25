import { describe, expect, it } from "vitest";
import { anchorTo, detectRuleLines, isSignLabel, suggestSignSpots, type LabelWord } from "@/lib/sign-lines";

// Bộ ảnh mẫu tổng hợp: trang có "chữ" (khối dày nhiều dòng), bảng kẻ, và một dòng ký (liền / chấm chấm).
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function page(seed: number) {
  const r = rng(seed), w = 600, h = 850, g = new Uint8Array(w * h).fill(245);
  for (let i = 0; i < g.length; i++) g[i] = 235 + Math.floor(r() * 20); // nền giấy có nhiễu
  const rect = (x: number, y: number, ww: number, hh: number, v = 30) => { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) if (xx >= 0 && yy >= 0 && xx < w && yy < h) g[yy * w + xx] = v; };
  // Dòng chữ: từng "từ" là khối cao 9 px.
  const textTop = 60 + Math.floor(r() * 40), rows = 14 + Math.floor(r() * 10);
  for (let k = 0; k < rows; k++) { let x = 50; const y = textTop + k * 20; while (x < 540) { const ww = 15 + Math.floor(r() * 40); rect(x, y, ww, 9); x += ww + 8; } }
  const words: LabelWord[] = []; const kind = seed % 3; // 0 liền, 1 chấm chấm, 2 chỉ nhãn
  const lx = 300 + Math.floor(r() * 120) - 60, ly = 640 + Math.floor(r() * 150), len = 150 + Math.floor(r() * 80);
  if (kind === 0) rect(lx, ly, len, 2);
  if (kind === 1) for (let x = lx; x < lx + len; x += 6) rect(x, ly, 3, 2);
  if (kind < 2) { rect(lx - 70, ly - 9, 50, 9); words.push({ str: "Ký:", x: lx - 70, y: ly - 9, w: 50, h: 9 }); }
  else { rect(lx, ly - 120, 90, 11); words.push({ str: "GIÁM", x: lx, y: ly - 120, w: 40, h: 11 }, { str: "ĐỐC", x: lx + 48, y: ly - 120, w: 42, h: 11 }); }
  // Nhiễu gây nhầm: đường kẻ bảng chồng chữ ngay phía trên.
  rect(50, textTop + rows * 20 + 4, 490, 1);
  const expect = kind < 2 ? { cx: (lx + len / 2) / w, bottom: ly / h } : { cx: (lx + 45) / w, bottom: (ly - 120 + 11) / h + 0.08 };
  return { g, w, h, words, expect, kind };
}

describe("B10 dòng ký", () => {
  it("nhận nhãn tiếng Việt", () => {
    expect(isSignLabel("Ký:")).toBe(true); expect(isSignLabel("Người ký")).toBe(true); expect(isSignLabel("GIÁM ĐỐC")).toBe(true); expect(isSignLabel("Hà Nội")).toBe(false);
  });
  it("dò được đường liền và chấm chấm, bỏ khối chữ dày", () => {
    const { g, w, h } = page(3); const ls = detectRuleLines(g, w, h);
    expect(ls.length).toBeGreaterThan(0); expect(ls.every((l) => l.x1 - l.x0 >= 72)).toBe(true);
  });
  it("gợi ý đúng ≥ 80 % trên bộ mẫu 30 trang", () => {
    let ok = 0; const N = 30;
    for (let s = 1; s <= N; s++) {
      const p = page(s); const top = suggestSignSpots(detectRuleLines(p.g, p.w, p.h), p.words, p.w, p.h)[0];
      if (!top) continue;
      const cx = top.x + top.w / 2, bottom = top.y + top.h;
      if (Math.abs(cx - p.expect.cx) < 0.12 && Math.abs(bottom - p.expect.bottom) < 0.06) ok++;
    }
    expect(ok / N).toBeGreaterThanOrEqual(0.8);
  });
  it("neo chữ ký: chân chạm dòng, nằm trong trang", () => {
    const a = anchorTo({ x: 0.6, y: 0.85, w: 0.3, h: 0.07, score: 1, source: "line" }, 0.3);
    expect(a.x + a.w).toBeLessThanOrEqual(1); expect(a.y + a.h).toBeGreaterThan(0.9); expect(a.y + a.h).toBeLessThanOrEqual(1);
  });
});
