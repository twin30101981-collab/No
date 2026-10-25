import { describe, it, expect } from "vitest";
import { packDoc } from "./disk-pack";
import type { Doc } from "./db";
const u = "data:image/jpeg;base64," + btoa("abcdef");
const doc = (pages: Doc["pages"]): Doc => ({ id: "d", name: "d", folder: "", kind: "", createdAt: 1, updatedAt: 1, pages });
const e = { rotation: 0, filter: "original" as const, brightness: 0, contrast: 0 };
describe("S4d packDoc", () => {
  it("đổi data URL thành Blob", () => {
    const p = packDoc(doc([{ id: "p", orig: u, src: "data:image/jpeg;base64," + btoa("zz"), edit: e }])).pages[0] as never as Record<string, unknown>;
    expect(p["orig"]).toBe(""); expect(p["src"]).toBe(""); expect((p["origB"] as Blob).size).toBe(6); expect(p["srcB"]).toBeTruthy();
  });
  it("src trùng orig chỉ lưu một lần", () => {
    const p = packDoc(doc([{ id: "p", orig: u, src: u, edit: e }])).pages[0] as never as Record<string, unknown>;
    expect(p["src"]).toBe("="); expect(p["srcB"]).toBeUndefined();
  });
  it("giữ nguyên tài liệu mã hoá và chuỗi không phải data URL", () => {
    const d = { ...doc([]), enc: {} as never }; expect(packDoc(d)).toBe(d);
    expect(packDoc(doc([{ id: "p", orig: "blob:x", src: "blob:x", edit: e }])).pages[0]["orig"]).toBe("blob:x");
  });
});
