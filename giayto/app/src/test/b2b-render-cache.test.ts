import { describe, it, expect } from "vitest";
import { Lru, limiter, srcKey, geoKey, resultKey, PREVIEW_LONG } from "@/lib/render-cache";

describe("B2b bộ đệm dựng", () => {
  it("LRU đẩy mục cũ nhất và gọi giải phóng", () => {
    const freed: string[] = []; const l = new Lru<string>(2, (v) => freed.push(v));
    l.set("a", "A"); l.set("b", "B"); l.get("a"); l.set("c", "C");
    expect(freed).toEqual(["B"]); expect(l.get("a")).toBe("A"); l.clear(); expect(freed).toEqual(["B", "C", "A"]);
  });
  it("giới hạn tối đa 2 việc giải mã cùng lúc", async () => {
    const run = limiter(2); const wait = () => new Promise((r) => setTimeout(r, 5));
    await Promise.all(Array.from({ length: 10 }, () => run(wait)));
    expect(run.stats().peak).toBe(2);
  });
  it("đổi bộ lọc giữ khoá hình học, đổi góc thì khác", () => {
    const src = "data:image/jpeg;base64," + "x".repeat(50000);
    const e = { quad: [[0, 0], [1, 0], [1, 1], [0, 1]], rotation: 0, filter: "auto", brightness: 0, contrast: 0 };
    expect(geoKey(src, e, 1200)).toBe(geoKey(src, { ...e, filter: "mono" } as never, 1200));
    expect(resultKey(src, e, 1200)).not.toBe(resultKey(src, { ...e, filter: "mono" }, 1200));
    expect(geoKey(src, e, 1200)).not.toBe(geoKey(src, { ...e, rotation: 90 }, 1200));
    expect(srcKey(src)).not.toBe(srcKey(src.slice(0, -1) + "y"));
    expect(PREVIEW_LONG).toBeLessThan(3508);
  });
});
