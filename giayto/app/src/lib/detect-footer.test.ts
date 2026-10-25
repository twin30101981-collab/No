import { describe, expect, it } from "vitest";
import { detectPaperGray } from "./detect";

// Biểu mẫu có bảng kẻ đậm, dòng ghi chú nằm dưới bảng: cạnh dưới phải là mép giấy, không phải đường kẻ đáy bảng.
function sheet(paperBottom: number, tilt = 0) {
  const w = 270, h = 360, g = new Float32Array(w * h).fill(55);
  const sh = (x: number) => Math.round((x - w / 2) * tilt);
  for (let x = 30; x < 240; x++) { const o = sh(x);
    for (let y = 20 + o; y < paperBottom + o; y++) if (y >= 0 && y < h) g[y * w + x] = 228;
    for (const ry of [50, 300]) for (let t = 0; t < 2; t++) { const y = ry + o + t; if (x > 40 && x < 230) g[y * w + x] = 25; } }
  for (const rx of [41, 228]) for (let y = 50; y < 302; y++) for (let t = 0; t < 2; t++) g[(y + sh(rx)) * w + rx + t] = 25;
  // dòng ghi chú (chữ nhỏ) dưới bảng
  for (let x = 60; x < 220; x += 3) { const o = sh(x); for (let y = 312; y < 316; y++) g[(y + o) * w + x] = 70; }
  return { g, w, h };
}
describe("detectPaperGray footer below table", () => {
  for (const [name, pb, tilt] of [["giấy trong khung", 340, 0], ["giấy tràn khỏi khung dưới", 400, 0], ["nghiêng", 340, 0.03], ["nghiêng + tràn", 400, 0.03]] as const) {
    it(name, () => {
      const { g, w, h } = sheet(pb, tilt);
      const d = detectPaperGray(g, w, h)!;
      expect(d).not.toBeNull();
      expect(Math.min(d.quad[2][1], d.quad[3][1])).toBeGreaterThan(320 / h);
    });
  }
});
