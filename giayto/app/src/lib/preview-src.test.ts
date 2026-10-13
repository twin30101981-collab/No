import { describe, expect, it } from "vitest";
import { inPreviewWindow, previewSize } from "./preview-src";

describe("S15g preview", () => {
  it("thu ảnh lớn về cạnh dài 1200", () => {
    expect(previewSize(3000, 4000)).toEqual({ w: 900, h: 1200, scaled: true });
  });
  it("giữ nguyên ảnh nhỏ", () => {
    expect(previewSize(800, 600)).toEqual({ w: 800, h: 600, scaled: false });
  });
  it("chỉ dựng trang đang xem ±1", () => {
    expect([0, 1, 2, 3, 4].map((i) => inPreviewWindow(i, 2))).toEqual([false, true, true, true, false]);
  });
});
