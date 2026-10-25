import { describe, expect, it } from "vitest";
import { attachTranslations, blocksFromWords, fitText, pickColors, wrapText, linesToBlocks, needsTranslation, wordsToLines } from "./translate-overlay";
import type { OcrWord } from "./ocr";

// tạo từ với toạ độ trên-trái giống ảnh; ocr.ts lưu y = -tâm
const W = (str: string, x: number, top: number, w = 40, h = 20): OcrWord => ({ str, x, y: -(top + h / 2), w, h });

describe("translate-overlay", () => {
  it("gom từ cùng hàng thành dòng, tách cột xa nhau", () => {
    const lines = wordsToLines([W("Hello", 10, 10), W("world", 55, 12), W("Price", 400, 10)]);
    expect(lines.map((l) => l.text)).toEqual(["Hello world", "Price"]);
    expect(lines[0]).toMatchObject({ x: 10, y: 10, w: 85 });
  });

  it("gom dòng liền nhau thành khối, tách tiêu đề cỡ chữ lớn", () => {
    const words = [W("TITLE", 10, 0, 120, 40), W("first", 10, 60), W("line", 55, 60), W("second", 10, 85), W("line", 55, 85)];
    const blocks = linesToBlocks(wordsToLines(words));
    expect(blocks.map((b) => b.text)).toEqual(["TITLE", "first line\nsecond line"]);
    expect(blocks[1]).toMatchObject({ lines: 2, y: 60, h: 45 });
  });

  it("bỏ khối chỉ có số, ghép bản dịch thiếu thì giữ gốc", () => {
    expect(needsTranslation("12.500 ₫")).toBe(false);
    const blocks = blocksFromWords([W("Total", 10, 10), W("12.500", 10, 200)]);
    expect(blocks.map((b) => b.text)).toEqual(["Total"]);
    expect(attachTranslations(blocks, ["Tổng"])[0]!.translated).toBe("Tổng");
    expect(attachTranslations(blocks, [])[0]!.translated).toBe("Total");
  });
});

const mono = (s: string, size = 10) => s.length * size * 0.5;

describe("translate-overlay G3-15", () => {
  it("ngắt dòng theo từ và cắt từ quá dài", () => {
    expect(wrapText("xin chào bạn", 40, (s) => mono(s))).toEqual(["xin chào", "bạn"]);
    expect(wrapText("aaaaaaaaaaaa", 30, (s) => mono(s))).toEqual(["aaaaaa", "aaaaaa"]);
  });

  it("thu nhỏ cỡ chữ cho vừa khung", () => {
    const box = { x: 0, y: 0, w: 100, h: 24, text: "", lineH: 20, lines: 1 };
    const fit = fitText("một câu dịch khá dài hơn bản gốc", box, mono);
    expect(fit.size).toBeLessThan(20);
    expect(fit.lines.length * fit.size * 1.2).toBeLessThanOrEqual(24 + fit.size * 0.3);
  });

  it("lấy màu nền viền và chọn màu chữ tương phản", () => {
    const w = 10, h = 10, d = new Uint8ClampedArray(w * h * 4).fill(30);
    expect(pickColors(d, w, h, { x: 3, y: 3, w: 4, h: 4 })).toMatchObject({ bg: "rgb(30,30,30)", fg: "#fafafa" });
  });
});
