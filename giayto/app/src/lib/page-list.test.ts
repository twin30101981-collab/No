import { describe, it, expect } from "vitest";
import { movePage, removePage, insertPages, duplicatePage, toggleId, removePages, duplicatePages, progressPct } from "./page-list";

const P = ["a", "b", "c", "d"];
describe("page-list (P6)", () => {
  it("dời trang, active đi theo trang được dời", () => expect(movePage(P, 0, 2, 0)).toEqual({ pages: ["b", "c", "a", "d"], active: 2 }));
  it("dời trang khác qua active → active lùi", () => expect(movePage(P, 0, 3, 2).active).toBe(1));
  it("dời trang khác về trước active → active tiến", () => expect(movePage(P, 3, 0, 1).active).toBe(2));
  it("dời ngoài phạm vi bị kẹp", () => expect(movePage(P, 1, 99, 0).pages).toEqual(["a", "c", "d", "b"]));
  it("xóa trang trước active giữ đúng trang", () => expect(removePage(P, 0, 2)).toEqual({ pages: ["b", "c", "d"], active: 1 }));
  it("xóa trang cuối đang xem → lùi về trang liền kề", () => expect(removePage(P, 3, 3).active).toBe(2));
  it("xóa trang duy nhất → rỗng, active 0", () => expect(removePage(["a"], 0, 0)).toEqual({ pages: [], active: 0 }));
  it("chèn sau trang đang xem", () => expect(insertPages(P, ["x", "y"], 1)).toEqual({ pages: ["a", "b", "x", "y", "c", "d"], active: 2 }));
  it("chèn rỗng không đổi", () => expect(insertPages(P, [], 1).pages).toBe(P));
  it("nhân bản đặt ngay sau bản gốc", () => expect(duplicatePage(P, 1, (s) => s + "2")).toEqual({ pages: ["a", "b", "b2", "c", "d"], active: 2 }));
});

describe("R4.2: chọn nhiều & tiến độ", () => {
  const Q = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  it("toggleId bật rồi tắt", () => {
    expect(toggleId([], "a")).toEqual(["a"]);
    expect(toggleId(["a", "b"], "a")).toEqual(["b"]);
  });
  it("removePages xoá nhiều trang, giữ active hợp lệ", () => {
    expect(removePages(Q, new Set(["a", "c"]), 3)).toEqual({ pages: [{ id: "b" }, { id: "d" }], active: 1 });
    expect(removePages(Q, new Set(["b"]), 3).active).toBe(2);
  });
  it("removePages tập rỗng không đổi", () => expect(removePages(Q, new Set(), 2).pages).toBe(Q));
  it("duplicatePages đặt bản sao sau mỗi bản gốc", () => {
    const r = duplicatePages(Q, new Set(["a", "c"]), (p) => ({ id: p.id + "2" }), 2);
    expect(r.pages.map((p) => p.id)).toEqual(["a", "a2", "b", "c", "c2", "d"]);
    expect(r.active).toBe(3); // active đi theo trang c (đã dịch 1 do a2 chèn trước)
  });
  it("progressPct: hết việc = 100, còn nửa = 50", () => {
    expect(progressPct(0, 8)).toBe(100);
    expect(progressPct(4, 8)).toBe(50);
    expect(progressPct(0, 0)).toBe(100);
    expect(progressPct(8, 8)).toBe(0);
  });
});
