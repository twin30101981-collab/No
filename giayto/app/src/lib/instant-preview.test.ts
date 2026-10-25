import { describe, it, expect } from "vitest";
import { previewSize } from "./preview-src";

describe("V2 xem trước tức thì", () => {
  it("ảnh 12 MP (3024×4032) thu về cạnh dài 1200 px", () => {
    expect(previewSize(3024, 4032)).toEqual({ w: 900, h: 1200, scaled: true });
  });
  it("ảnh nhỏ hơn 1200 px giữ nguyên", () => {
    expect(previewSize(800, 1000)).toEqual({ w: 800, h: 1000, scaled: false });
  });
});
