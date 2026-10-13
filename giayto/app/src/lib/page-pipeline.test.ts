import { describe, it, expect } from "vitest";
import { fitBox, thumbBox } from "./page-pipeline-shared";

describe("page-pipeline fitBox (B07)", () => {
  it("thu nhỏ đều về cạnh dài tối đa", () => {
    expect(fitBox(4000, 3000, 2560)).toEqual({ w: 2560, h: 1920 });
    expect(fitBox(3000, 4000, 2560)).toEqual({ w: 1920, h: 2560 });
  });
  it("không phóng to ảnh nhỏ", () => {
    expect(fitBox(800, 600, 2560)).toEqual({ w: 800, h: 600 });
  });
  it("không bao giờ ra cạnh 0", () => {
    expect(fitBox(1, 10000, 100).w).toBeGreaterThanOrEqual(1);
    expect(fitBox(1, 10000, 100).h).toBe(100);
  });
  it("thumbBox cùng quy tắc, không phóng to", () => {
    expect(thumbBox(4000, 3000, 512)).toEqual({ w: 512, h: 384 });
    expect(thumbBox(200, 150, 512)).toEqual({ w: 200, h: 150 });
  });
});
