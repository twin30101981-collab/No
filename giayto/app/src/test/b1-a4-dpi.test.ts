import { describe, it, expect } from "vitest";
import { PDF_SIZES, needsReencode } from "@/lib/files";
import { TARGET_LONG, targetLong } from "@/lib/image";

// B1: A4 = 297 mm cạnh dài; 300 dpi ⇒ 3508 px, 200 dpi ⇒ 2339 px
describe("B1 – khổ đích A4 theo dpi", () => {
  it("Nét nhất dựng trang 3508 px (A4 300 dpi)", () => { expect(targetLong("high")).toBe(3508); expect(Math.round((TARGET_LONG.high / 297) * 25.4)).toBe(300); });
  it("Cân bằng dựng trang 2339 px (A4 200 dpi)", () => { expect(targetLong("normal")).toBe(2339); expect(Math.round((TARGET_LONG.normal / 297) * 25.4)).toBe(200); });
  it("Cỡ xuất PDF: Nét nhất 3508/0.9, Cân bằng 2339/0.88, Nhẹ nhất 1754/0.75", () => {
    expect(PDF_SIZES.high).toMatchObject({ maxSide: 3508, q: 0.9 });
    expect(PDF_SIZES.balanced).toMatchObject({ maxSide: 2339, q: 0.88 });
    expect(PDF_SIZES.small).toMatchObject({ maxSide: 1754, q: 0.75 });
  });
  it("Không nén lại JPEG đã đúng cỡ", () => { expect(needsReencode(2480, 3508, "high", false, true)).toBe(false); });
  it("Nén lại khi ảnh vượt cỡ, khi đen trắng hoặc không phải JPEG", () => {
    expect(needsReencode(2480, 3508, "balanced", false, true)).toBe(true);
    expect(needsReencode(2480, 3508, "high", true, true)).toBe(true);
    expect(needsReencode(2480, 3508, "high", false, false)).toBe(true);
  });
});
