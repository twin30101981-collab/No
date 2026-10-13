import { describe, expect, it } from "vitest";
import { classifyNumber, findSensitive } from "./sensitive";
import type { OcrWord } from "./ocr";

const word = (str: string, x: number, top: number, w = 60, h = 20): OcrWord => ({ str, x, y: -(top + h / 2), w, h });

describe("sensitive number suggestions", () => {
  it("classifies CCCD, phone, account and ignores money/dates", () => {
    expect(classifyNumber("001203004567")).toBe("cccd");
    expect(classifyNumber("0912345678")).toBe("phone");
    expect(classifyNumber("84912345678")).toBe("phone");
    expect(classifyNumber("19036688123018")).toBe("account");
    expect(classifyNumber("15000000", "15.000.000")).toBeNull();
    expect(classifyNumber("2026")).toBeNull();
  });
  it("joins a phone number split by spaces on one line", () => {
    const f = findSensitive([word("SĐT:", 10, 100), word("0912", 80, 100), word("345", 150, 101), word("678", 210, 99)], 1000, 1000);
    expect(f).toHaveLength(1); expect(f[0].kind).toBe("phone"); expect(f[0].digits).toBe("0912345678");
    expect(f[0].region.x).toBeLessThan(0.08); expect(f[0].region.x + f[0].region.w).toBeGreaterThan(0.27);
  });
  it("keeps numbers on different lines apart and skips plain text", () => {
    const f = findSensitive([word("Số:", 10, 100), word("001203004567", 80, 100, 200), word("Ngày", 10, 200), word("03/10/2026", 80, 200, 120)], 1000, 1000);
    expect(f.map((x) => x.kind)).toEqual(["cccd"]);
  });
});
