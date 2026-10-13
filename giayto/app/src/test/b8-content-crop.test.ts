import { describe, it, expect } from "vitest";
import { jsPDF } from "jspdf";
import { contentBox, fitPage, encodePng1bit, encodePngRgb, bytesToDataUrl } from "@/lib/content-crop";

// Trang giả: nền 245, dải xám 150 ở lề trái (40 px) và đáy (30 px), khối chữ ở giữa.
function page(W = 800, H = 1100) {
  const l = new Uint8Array(W * H).fill(245);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 40 || y >= H - 30) l[y * W + x] = 150;
  for (let line = 0; line < 20; line++) for (let y = 200 + line * 30; y < 212 + line * 30; y++) for (let x = 150; x < 650; x++) if ((x >> 3) % 3) l[y * W + x] = 20;
  return { l, W, H };
}

describe("B8 cắt theo nội dung", () => {
  it("bỏ dải xám ở mép, hộp ôm chữ + lề đều", () => {
    const { l, W, H } = page();
    const b = contentBox(l, W, H, 0.04);
    const pad = Math.round(800 * 0.04);
    expect(b.x).toBeGreaterThanOrEqual(40);
    expect(b.y + b.h).toBeLessThanOrEqual(H - 30);
    expect(Math.abs(b.x - (150 - pad))).toBeLessThanOrEqual(8);
    expect(Math.abs(b.y - (200 - pad))).toBeLessThanOrEqual(2);
    expect(Math.abs(b.x + b.w - 1 - (649 + pad))).toBeLessThanOrEqual(8);
  });
  it("trang trắng → trả cả vùng", () => {
    const b = contentBox(new Uint8Array(100 * 100).fill(250), 100, 100);
    expect(b).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });
  it("vừa A4 giữ tỉ lệ (±0,5 %), canh giữa", () => {
    for (const [w, h] of [[500, 600], [1200, 400], [2480, 3508]]) {
      const f = fitPage(w, h, 198, 285);
      expect(Math.abs(f.w / f.h / (w / h) - 1)).toBeLessThan(0.005);
      expect(f.w).toBeLessThanOrEqual(198.0001); expect(f.h).toBeLessThanOrEqual(285.0001);
      expect(Math.abs(f.x * 2 + f.w - 198)).toBeLessThan(1e-6);
    }
  });
  it("PDF Đen trắng 1-bit nhẹ hơn ≥ 50 % so với PNG 8-bit", () => {
    const { l, W, H } = page(1240, 1754);
    const bin = l.map((v) => (v < 128 ? 0 : 255));
    const mk = (u: string) => { const p = new jsPDF({ unit: "mm", format: "a4", compress: true }); p.addImage(u, "PNG", 6, 6, 198, 280, undefined, "FAST"); return p.output("arraybuffer").byteLength; };
    const one = mk(bytesToDataUrl(encodePng1bit(bin, W, H)));
    const rgb = mk(bytesToDataUrl(encodePngRgb(bin, W, H)));
    expect(one).toBeLessThan(rgb * 0.5);
  });
});
