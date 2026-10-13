import { describe, expect, it } from "vitest";
import { applyClassification, cleanTags, cleanTitle, isDefaultName } from "./auto-name";
import type { Doc } from "./db";

const doc = (p: Partial<Doc> = {}): Doc => ({ id: "a", name: "Tài liệu 03-10 20:05", folder: "Chung", kind: "Tài liệu", createdAt: 0, updatedAt: 0, pages: [], ...p });
const c = { title: "Hoá đơn Điện lực 09/2026", type: "Hoá đơn", tags: ["Điện", "điện", "#Nhà"], confidence: 0.9 };

describe("auto-name", () => {
  it("nhận ra tên mặc định", () => {
    expect(isDefaultName(doc())).toBe(true);
    expect(isDefaultName(doc({ name: "Hoá đơn tháng 9" }))).toBe(false);
  });
  it("làm sạch tên và thẻ", () => {
    expect(cleanTitle(' "A/B: c" ')).toBe("A B c");
    expect(cleanTitle("x".repeat(80)).length).toBe(60);
    expect(cleanTags(c.tags)).toEqual(["Điện", "Nhà"]);
  });
  it("áp tên, thẻ, loại", () => {
    const r = applyClassification(doc({ tags: ["Nhà"] }), c)!;
    expect(r.name).toBe("Hoá đơn Điện lực 09 2026");
    expect(r.tags).toEqual(["Nhà", "Điện"]);
    expect(r.fields?.["Loại (AI)"]).toBe("Hoá đơn");
  });
  it("không đè tên người dùng, tài liệu khoá hoặc AI không chắc", () => {
    expect(applyClassification(doc({ name: "Của tôi" }), c)).toBeNull();
    expect(applyClassification(doc({ locked: true }), c)).toBeNull();
    expect(applyClassification(doc(), { ...c, confidence: 0.2 })).toBeNull();
    expect(applyClassification(doc(), { ...c, title: "  " })).toBeNull();
  });
});
