import { describe, expect, it } from "vitest";
import { fillMarkText, hasMarks, markMargins, pageNumberText } from "./pdf-marks";

describe("pdf marks", () => {
  const d = new Date(2026, 9, 3);
  it("fills tokens", () => {
    expect(fillMarkText("{ten} – {ngay} – {trang}/{tong}", 2, 5, "Hợp đồng", d)).toBe("Hợp đồng – 03/10/2026 – 2/5");
  });
  it("formats page numbers", () => {
    expect(pageNumberText("Trang n/N", 1, 3)).toBe("Trang 1/3");
    expect(pageNumberText("n/N", 1, 3)).toBe("1/3");
    expect(pageNumberText("n", 4, 9)).toBe("4");
  });
  it("reserves margins only when needed", () => {
    expect(markMargins({})).toEqual({ top: 0, bottom: 0 });
    expect(markMargins({ header: "A", numbers: true })).toEqual({ top: 9, bottom: 9 });
    expect(hasMarks({ header: "  " })).toBe(false);
  });
});
