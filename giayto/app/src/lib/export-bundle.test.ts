import { describe, expect, it } from "vitest";
import { planBundle } from "./export-bundle";

describe("planBundle (P7)", () => {
  it("PDF đầu, ảnh đánh số, chữ cuối", () => {
    const p = planBundle("hop-dong", ["image/jpeg", "image/png"], true);
    expect(p.map((e) => e.name)).toEqual(["hop-dong.pdf", "anh/hop-dong-trang-01.jpg", "anh/hop-dong-trang-02.png", "hop-dong-chu.txt"]);
  });
  it("không có chữ thì bỏ tệp txt", () => {
    expect(planBundle("a", ["image/jpeg"], false).some((e) => e.kind === "text")).toBe(false);
  });
  it("≥ 100 trang dùng 3 chữ số, tên rỗng có mặc định", () => {
    const p = planBundle(" ", Array(100).fill("image/jpeg"), false);
    expect(p[0].name).toBe("tai-lieu.pdf");
    expect(p[1].name).toBe("anh/tai-lieu-trang-001.jpg");
    expect(new Set(p.map((e) => e.name)).size).toBe(p.length);
  });
});

import { buildBatchBundle, uniqueFolders } from "./export-bundle";
describe("gói hàng loạt (P7.2)", () => {
  it("tên trùng được đánh số", () => {
    expect(uniqueFolders(["a", "A", "b", ""])).toEqual(["a", "A-2", "b", "tai-lieu"]);
  });
  it("tài liệu lỗi bị bỏ qua, không dừng lô", async () => {
    const ok = { name: "ok", pdf: async () => ({ arrayBuffer: async () => new TextEncoder().encode("%PDF").buffer }) as unknown as Blob, pages: [], text: "x" };
    const bad = { name: "hong", pdf: async () => { throw new Error("x"); }, pages: [], text: "" };
    const r = await buildBatchBundle([bad, ok]);
    expect(r.count).toBe(1); expect(r.failed).toEqual(["hong"]); expect(r.blob).not.toBeNull();
  });
});
