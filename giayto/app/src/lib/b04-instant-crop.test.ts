import { describe, it, expect } from "vitest";
import { quadCrop, INSTANT_MAX } from "./instant-preview";
import { previewSize } from "./preview-src";

describe("V13-B04 xem trước cắt theo khung", () => {
  it("cắt bao quad kèm lề 1% trên ảnh 2560×1920", () => {
    const r = quadCrop([[0.2, 0.1], [0.8, 0.12], [0.82, 0.9], [0.18, 0.88]], 2560, 1920)!;
    expect(r).toEqual({ sx: 435, sy: 173, sw: 1690, sh: 1574 });
  });
  it("quad thiếu/quá nhỏ → null (dùng cả khung)", () => {
    expect(quadCrop(null, 100, 100)).toBeNull();
    expect(quadCrop([[0.5, 0.5], [0.52, 0.5], [0.52, 0.52], [0.5, 0.52]], 100, 100)).toBeNull();
  });
  it("vùng cắt thu về cạnh dài 1024 px", () => {
    expect(INSTANT_MAX).toBe(1024);
    expect(previewSize(1690, 1574, INSTANT_MAX)).toEqual({ w: 1024, h: 954, scaled: true });
  });
});
