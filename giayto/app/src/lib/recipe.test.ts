import { describe, it, expect } from "vitest";
import { pickRecipe, selfCheck, SAFE_RECIPE } from "./recipe";

const good = { blur: 80, glare: 0, skew: 0, brightness: 180, contrast: 60 };

describe("P8.3 recipe", () => {
  it("trang tốt → magic, không nắn", () => {
    const r = pickRecipe(good);
    expect(r.deskew).toBe(false);
    expect(r.denoise).toBe(false);
  });
  it("nghiêng → bật nắn thẳng", () => {
    expect(pickRecipe({ ...good, skew: 4 }).deskew).toBe(true);
  });
  it("tối + mờ → bật khử nhiễu", () => {
    expect(pickRecipe({ ...good, brightness: 60, blur: 20 }).denoise).toBe(true);
  });
  it("tài liệu chữ đổi magic → sharp", () => {
    const base = pickRecipe(good);
    const r = pickRecipe(good, "hopdong");
    if (base.filter === "magic") expect(r.filter).toBe("sharp");
    else expect(r.filter).toBe(base.filter);
  });
  it("giấy tờ có màu không dùng đen trắng", () => {
    for (const m of [good, { ...good, brightness: 50 }, { ...good, glare: 0.1 }]) {
      expect(["mono", "ink", "eco"]).not.toContain(pickRecipe(m, "sodo").filter);
    }
  });
  it("tự kiểm chấp nhận khi không tụt", () => {
    const r = pickRecipe(good);
    expect(selfCheck(good, good, r).ok).toBe(true);
  });
  it("tự kiểm lùi về an toàn khi tụt điểm", () => {
    const c = selfCheck(good, { ...good, blur: 10 }, { filter: "mono", deskew: true, denoise: true, reason: "" });
    expect(c.ok).toBe(false);
    expect(c.recipe).toEqual(SAFE_RECIPE);
  });
  it("an toàn vẫn tụt → giữ ảnh gốc", () => {
    const c = selfCheck(good, { ...good, blur: 10 }, SAFE_RECIPE);
    expect(c.recipe.filter).toBe("original");
  });
});
