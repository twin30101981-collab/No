import { describe, expect, it } from "vitest";
import { comparePosition, effectivePosition } from "./image-compare";

describe("comparePosition (G1-08)", () => {
  it("tính đúng vị trí trong khung", () => expect(comparePosition(150, 100, 200)).toBe(25));
  it("giới hạn thanh kéo trong hai mép", () => {
    expect(comparePosition(20, 100, 200)).toBe(0);
    expect(comparePosition(400, 100, 200)).toBe(100);
  });
  it("trả về giữa khung khi chưa đo được chiều rộng", () => expect(comparePosition(100, 100, 0)).toBe(50));
});

describe("effectivePosition (R1.2)", () => {
  it("giữ nút xem gốc thì hiện 100% ảnh gốc", () => expect(effectivePosition(30, true)).toBe(100));
  it("thả nút thì trở về vị trí cũ", () => expect(effectivePosition(30, false)).toBe(30));
});
