import { describe, expect, it } from "vitest";
import { lightLevel, meanLumaRGBA, QUALITY_THRESHOLDS } from "./quality";
import { VOICE_LINES } from "./scan-voice";

const px = (v: number, n = 64) => Array.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : v));

describe("P1.2 cảnh báo thiếu sáng", () => {
  it("đo độ sáng trung bình của khung", () => {
    expect(Math.round(meanLumaRGBA(px(200)))).toBe(200);
    expect(Math.round(meanLumaRGBA(px(30)))).toBe(30);
  });
  it("phân mức theo ngưỡng DARK_REJECT / DARK_WARNING", () => {
    expect(lightLevel(QUALITY_THRESHOLDS.DARK_REJECT - 1)).toBe("dark");
    expect(lightLevel(QUALITY_THRESHOLDS.DARK_WARNING - 1)).toBe("dim");
    expect(lightLevel(QUALITY_THRESHOLDS.DARK_WARNING)).toBe("ok");
  });
  it("có lời nhắc bằng giọng nói cho thiếu sáng", () => {
    expect(VOICE_LINES.dark).toContain("Thiếu sáng");
  });
});
