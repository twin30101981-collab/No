import { describe, expect, it } from "vitest";
import { applyRecipes, planRecipes } from "./recipe-apply";
import type { PageMetrics } from "./page-grade";

const pg = (id: string, filter = "auto") => ({ id, orig: "", src: "", edit: { rotation: 0, filter, brightness: 0, contrast: 0 } }) as never;
const good: PageMetrics = { blur: 80, glare: 0, skew: 0, brightness: 200, contrast: 60 };
const dark: PageMetrics = { blur: 60, glare: 0, skew: 0, brightness: 50, contrast: 20 };

describe("planRecipes (P8.4)", () => {
  it("chỉ trang mới, còn bộ lọc mặc định, có số đo", () => {
    const doc = { pages: [pg("cu"), pg("moi"), pg("tay", "mono"), pg("chua-do")] };
    const m = new Map([["cu", good], ["moi", good], ["tay", good]]);
    const r = planRecipes(doc, new Set(["cu"]), m, "auto");
    expect(r.map((c) => c.pageId)).toEqual(["moi"]);
    expect(r[0]!.to).toBe("magic");
  });
  it("hợp đồng: làm rõ chữ thay vì Thần kỳ", () => {
    const r = planRecipes({ pages: [pg("a")] }, new Set(), new Map([["a", good]]), "auto", "hopdong");
    expect(r[0]!.to).toBe("sharp");
  });
  it("công thức trùng bộ lọc hiện tại → không đổi; tài liệu khoá → rỗng", () => {
    const m = new Map([["a", dark]]);
    const r = planRecipes({ pages: [pg("a")] }, new Set(), m, "auto");
    for (const c of r) expect(c.to).not.toBe("auto");
    expect(planRecipes({ pages: [pg("a")], locked: true } as never, new Set(), m, "auto")).toEqual([]);
  });
  it("applyRecipes bỏ qua trang người dùng đã đổi trong lúc chờ", () => {
    const pages = [pg("a"), pg("b", "gray")];
    const out = applyRecipes(pages, [{ pageId: "a", from: "auto", to: "magic", reason: "" }, { pageId: "b", from: "auto", to: "magic", reason: "" }]);
    expect((out[0] as { edit: { filter: string } }).edit.filter).toBe("magic");
    expect((out[1] as { edit: { filter: string } }).edit.filter).toBe("gray");
    expect(applyRecipes(pages, [])).toBe(pages);
  });
});

describe("R3.3 học theo người dùng", () => {
  it("bộ lọc người dùng hay chọn thắng công thức tự động", () => {
    const learned = { hopdong: { mono: 2 } };
    const r = planRecipes({ pages: [pg("a")] }, new Set(), new Map([["a", good]]), "auto", "hopdong", learned);
    expect(r[0]!.to).toBe("mono");
    expect(r[0]!.reason).toBe("theo thói quen của bạn");
  });
  it("không có lựa chọn đã học → giữ công thức tự động", () => {
    const r = planRecipes({ pages: [pg("a")] }, new Set(), new Map([["a", good]]), "auto", "hopdong", {});
    expect(r[0]!.to).toBe("sharp");
  });
  it("đã học nhưng trùng bộ lọc hiện tại → không đổi", () => {
    const learned = { hopdong: { auto: 3 } };
    const r = planRecipes({ pages: [pg("a")] }, new Set(), new Map([["a", good]]), "auto", "hopdong", learned);
    expect(r).toEqual([]);
  });
});
