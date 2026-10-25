import { describe, it, expect } from "vitest";
import { enhanceImage, unsharpLuma } from "./sr-enhance";
import type { Rgba } from "./sr-tiles";

function edge(w = 40, h = 30): Rgba {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) { const v = p % w < w / 2 ? 40 : 210; d.set([v, v, v, 255], p * 4); }
  return { data: d, width: w, height: h };
}

describe("sr-enhance", () => {
  it("làm nét tăng tương phản ở mép, vùng phẳng giữ nguyên", () => {
    const img = edge(), out = unsharpLuma(img), w = img.width;
    expect(out.data[(5 * w + 19) * 4]).toBeLessThan(40);
    expect(out.data[(5 * w + 20) * 4]).toBeGreaterThan(210);
    expect(out.data[(5 * w + 5) * 4]).toBe(40);
  });

  it("chưa có mô hình → dùng cách cổ điển, ảnh ×2", async () => {
    const r = await enhanceImage(edge());
    expect(r.method).toBe("classic"); expect(r.width).toBe(80); expect(r.height).toBe(60);
  });

  it("mô hình lỗi → tự quay về cổ điển; hủy thì dừng hẳn", async () => {
    const r = await enhanceImage(edge(), { model: async () => { throw new Error("hỏng"); } });
    expect(r.method).toBe("classic");
    const ac = new AbortController(); ac.abort();
    await expect(enhanceImage(edge(), { signal: ac.signal })).rejects.toMatchObject({ name: "AbortError" });
  });
});
