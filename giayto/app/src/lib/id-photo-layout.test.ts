import { describe, expect, it } from "vitest";
import { PHOTO_SIZES, SHEETS, cropForSize, mmToPx, personBox, tileLayout } from "./id-photo-layout";

const s34 = PHOTO_SIZES.find((s) => s.id === "3x4")!;
const s46 = PHOTO_SIZES.find((s) => s.id === "4x6")!;

describe("id-photo-layout", () => {
  it("tìm khung người từ mặt nạ", () => {
    const w = 10, h = 8, a = new Uint8Array(w * h);
    for (let y = 2; y < 8; y++) for (let x = 3; x < 7; x++) a[y * w + x] = 255;
    expect(personBox(a, w, h)).toEqual({ x: 3, y: 2, w: 4, h: 6 });
    expect(personBox(new Uint8Array(4), 2, 2)).toBeNull();
  });

  it("vùng cắt đúng tỉ lệ 3x4, giữa người, chừa khoảng trên đầu", () => {
    const c = cropForSize({ x: 100, y: 50, w: 200, h: 300 }, s34);
    expect(c.w / c.h).toBeCloseTo(0.75, 5);
    expect(c.x + c.w / 2).toBeCloseTo(200, 5);
    expect(c.y).toBeLessThan(50);
  });

  it("xếp lưới lên khổ in và đổi mm sang điểm ảnh 300 dpi", () => {
    const t10 = tileLayout(SHEETS[0], s34);
    expect(t10.cols).toBe(2); expect(t10.rows).toBe(3);
    expect(tileLayout(SHEETS[0], s46).count).toBe(4);
    for (const b of t10.cells) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.w).toBeLessThanOrEqual(100); }
    expect(mmToPx(30)).toBe(354);
  });
});
