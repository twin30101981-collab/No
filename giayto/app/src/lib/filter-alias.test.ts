import { describe, it, expect, vi } from "vitest";
vi.mock("./pixels", () => ({ runPixels: vi.fn() }));
import { normalizeFilter } from "./image";

describe("normalizeFilter (S15b)", () => {
  it("ánh xạ bw sang mono", () => {
    expect(normalizeFilter("bw")).toBe("mono");
    expect(normalizeFilter("BW")).toBe("mono");
  });
  it("giữ tên hợp lệ", () => {
    expect(normalizeFilter("auto")).toBe("auto");
    expect(normalizeFilter("mono")).toBe("mono");
  });
  it("tên lạ rơi về original", () => {
    expect(normalizeFilter("xyz")).toBe("original");
    expect(normalizeFilter(undefined)).toBe("original");
  });
});
