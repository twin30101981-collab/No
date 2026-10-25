import { describe, expect, it } from "vitest";
import { throwIfAborted, yieldUi } from "./files";

describe("B15 — xuất PDF không treo", () => {
  it("yieldUi nhường luồng (resolve được, không ném lỗi)", async () => {
    await expect(yieldUi()).resolves.toBeUndefined();
  });

  it("throwIfAborted không làm gì khi chưa hủy", () => {
    const c = new AbortController();
    expect(() => throwIfAborted(c.signal)).not.toThrow();
    expect(() => throwIfAborted(undefined)).not.toThrow();
  });

  it("throwIfAborted ném AbortError khi đã hủy", () => {
    const c = new AbortController();
    c.abort();
    expect(() => throwIfAborted(c.signal)).toThrowError(DOMException);
    try { throwIfAborted(c.signal); } catch (e) {
      expect((e as DOMException).name).toBe("AbortError");
    }
  });
});
