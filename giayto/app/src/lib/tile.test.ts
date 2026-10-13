// R2.3: kiểm chứng chia ô cho ảnh lớn (giới hạn canvas iPhone) — thuần toán.
import { describe, it, expect } from "vitest";
import { megapixels, needsTiling, tileCount, tileRects, tileCore, coresCover, TILE, TILE_OVERLAP } from "./tile";

describe("R2.3 xử lý theo ô", () => {
  it("megapixels tính đúng", () => {
    expect(megapixels(4000, 3000)).toBe(12);
    expect(megapixels(8000, 6000)).toBe(48);
  });

  it("needsTiling: > 12 MP hoặc cạnh > 4096 thì chia ô", () => {
    expect(needsTiling(4000, 3000)).toBe(false); // đúng 12 MP
    expect(needsTiling(4001, 3000)).toBe(true); // vượt 12 MP
    expect(needsTiling(8000, 6000)).toBe(true); // 48 MP
    expect(needsTiling(4200, 1000)).toBe(true); // cạnh dài vượt giới hạn canvas
    expect(needsTiling(2000, 1500)).toBe(false);
  });

  it("tileCount đảm bảo phần lấn tối thiểu", () => {
    expect(tileCount(1024)).toBe(1);
    expect(tileCount(1025)).toBe(2);
    expect(tileCount(2048)).toBe(3); // 2 ô chỉ lấn 0 px — cần 3 ô để lấn ≥ TILE_OVERLAP
    expect(tileCount(8000)).toBe(9);
  });

  it("ảnh nhỏ hơn một ô → đúng một ô toàn ảnh", () => {
    expect(tileRects(800, 600)).toEqual([{ x: 0, y: 0, w: 800, h: 600 }]);
  });

  it("mọi ô nằm gọn trong ảnh và không vượt cạnh ô", () => {
    for (const t of tileRects(8000, 6000)) {
      expect(t.w).toBeLessThanOrEqual(TILE);
      expect(t.h).toBeLessThanOrEqual(TILE);
      expect(t.x + t.w).toBeLessThanOrEqual(8000);
      expect(t.y + t.h).toBeLessThanOrEqual(6000);
    }
  });

  it("ô kề nhau chồng lấn ít nhất TILE_OVERLAP", () => {
    const [a, b] = tileRects(2048, 1024);
    expect(a.x + a.w - b.x).toBeGreaterThanOrEqual(TILE_OVERLAP);
  });

  it("phần ruột các ô ghép lại phủ kín ảnh, không chồng nhau", () => {
    expect(coresCover(8000, 6000)).toBe(true); // 48 MP giả lập
    expect(coresCover(4000, 3000)).toBe(true);
    expect(coresCover(1025, 1025)).toBe(true); // kích thước lẻ
    expect(coresCover(800, 600)).toBe(true); // ảnh nhỏ
  });

  it("tileCore của ô đầu giữ nguyên góc, ô sau nối khít tại đường giữa phần lấn", () => {
    const rects = tileRects(2048, 1024);
    const c0 = tileCore(rects, 0);
    expect(c0.x).toBe(0);
    const c1 = tileCore(rects, 1);
    expect(c1.x).toBe(Math.floor((rects[1].x + rects[0].x + rects[0].w) / 2));
    expect(c0.x + c0.w).toBe(c1.x); // nối khít
  });

  it("kích thước lẻ (ô cuối bị kẹp mép) vẫn nối khít", () => {
    const rects = tileRects(1025, 1024);
    const c0 = tileCore(rects, 0);
    const c1 = tileCore(rects, 1);
    expect(c0.x + c0.w).toBe(c1.x);
    expect(c1.x + c1.w).toBe(1025);
  });
});
