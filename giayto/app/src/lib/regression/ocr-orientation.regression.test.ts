import { describe, it, expect } from "vitest";
import { pickOrientation } from "../ocr";

describe("Hồi quy V9 pickOrientation", () => {
  it("giữ hướng gốc khi lượt dò không hơn 10 điểm", () => {
    expect(pickOrientation(40, [{ deg: 90, confidence: 50 }, { deg: 270, confidence: 45 }])).toBe(0);
  });
  it("chọn hướng hơn gốc trên 10 điểm", () => {
    expect(pickOrientation(40, [{ deg: 90, confidence: 70 }, { deg: 270, confidence: 30 }])).toBe(90);
  });
  it("chọn hướng tốt nhất khi cả hai đều hơn", () => {
    expect(pickOrientation(30, [{ deg: 90, confidence: 45 }, { deg: 270, confidence: 80 }])).toBe(270);
  });
});
