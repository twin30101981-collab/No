// R2.1: kiểm chứng bể Worker chung — kích thước ≤ 4, ưu tiên detect > preview > normalize > pixels.
import { describe, it, expect } from "vitest";
import { poolSizeFor, PRIORITY } from "./worker-pool";

describe("R2.1 bể worker chung", () => {
  it("kích thước bể kẹp 2..4 theo số lõi", () => {
    expect(poolSizeFor(1)).toBe(2);
    expect(poolSizeFor(2)).toBe(2);
    expect(poolSizeFor(4)).toBe(3);
    expect(poolSizeFor(8)).toBe(4);
    expect(poolSizeFor(64)).toBe(4); // không bao giờ vượt 4
    expect(poolSizeFor(undefined)).toBe(2);
  });

  it("thứ tự ưu tiên: detect < preview < normalize < pixels", () => {
    expect(PRIORITY.detect).toBeLessThan(PRIORITY.preview);
    expect(PRIORITY.preview).toBeLessThan(PRIORITY.normalize);
    expect(PRIORITY.normalize).toBeLessThan(PRIORITY.pixels);
  });

  it("R2.2: page và compress góp vào bể chung, ưu tiên thấp hơn việc tương tác", () => {
    expect(PRIORITY.page).toBeGreaterThan(PRIORITY.pixels);
    expect(PRIORITY.compress).toBeGreaterThan(PRIORITY.page);
    // 6 loại việc trong một bể duy nhất
    expect(Object.keys(PRIORITY).sort()).toEqual(["compress", "detect", "normalize", "page", "pixels", "preview"]);
  });
});
