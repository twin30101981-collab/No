import { describe, expect, it } from "vitest";
import { itemsToLines, linesToBlocks } from "@/lib/pdf-convert";
const it_ = (str: string, x: number, y: number, w = str.length * 5, h = 10) => ({ str, x, y, w, h });
describe("pdf-convert", () => {
  it("groups lines and splits table cells", () => {
    const lines = itemsToLines([it_("Tên", 10, 700), it_("Số tiền", 200, 700), it_("Gạo", 10, 680), it_("1.200.000", 200, 680)]);
    expect(lines.map((l) => l.cells)).toEqual([["Tên", "Số tiền"], ["Gạo", "1.200.000"]]);
    expect(linesToBlocks(lines)[0].kind).toBe("table");
  });
  it("detects headings and joins wrapped text", () => {
    const b = linesToBlocks(itemsToLines([it_("BIÊN BẢN", 10, 750, 80, 20), it_("Hôm nay chúng tôi", 10, 720), it_("gồm có các bên", 10, 708)]));
    expect(b[0].kind).toBe("heading");
    expect(b[1].text).toBe("Hôm nay chúng tôi gồm có các bên");
  });
});
import { isUnsure, clean, countUnsure } from "@/lib/review";
describe("review", () => {
  it("flags marked and misread values", () => {
    expect(isUnsure("1.2O0.000")).toBe(true);
    expect(isUnsure("Gạo⟦?⟧")).toBe(true);
    expect(isUnsure("1.200.000")).toBe(false);
    expect(isUnsure("Số lượng")).toBe(false);
    expect(clean("Gạo ⟦?⟧")).toBe("Gạo");
    expect(countUnsure({ kind: "excel", title: "t", sheets: [{ name: "a", rows: [["x⟦?⟧", "1"], ["5O0", "ok"]] }] })).toBe(2);
  });
});
