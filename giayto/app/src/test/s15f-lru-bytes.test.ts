import { describe, it, expect } from "vitest";
import { Lru } from "@/lib/render-cache";

describe("S15f Lru theo dung lượng", () => {
  it("đẩy mục cũ khi vượt trần byte", () => {
    const out: string[] = []; const l = new Lru<number>(10, (_v, k) => out.push(k), (v) => v, 100);
    l.set("a", 40); l.set("b", 40); l.set("c", 40);
    expect(out).toEqual(["a"]); expect(l.bytes).toBe(80);
  });
  it("luôn giữ mục mới nhất dù lớn hơn trần", () => {
    const l = new Lru<number>(10, undefined, (v) => v, 100);
    l.set("a", 10); l.set("big", 500);
    expect(l.size).toBe(1); expect(l.get("big")).toBe(500);
  });
  it("ghi đè cùng khoá cập nhật tổng, clear về 0", () => {
    const l = new Lru<number>(10, undefined, (v) => v, 100);
    l.set("a", 30); l.set("a", 50); expect(l.bytes).toBe(50);
    l.clear(); expect(l.bytes).toBe(0);
  });
});
