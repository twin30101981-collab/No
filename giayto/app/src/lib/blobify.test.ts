import { describe, it, expect } from "vitest";
import { blobifyDoc, fpOf, blobFor } from "./disk-pack";
const data = "data:image/jpeg;base64," + btoa("xin chao anh trang");
describe("B05 blobifyDoc", () => {
  it("không còn chuỗi base64 ảnh trong tài liệu sau khi đổi", () => {
    const d = blobifyDoc({ id: "a", pages: [{ id: "p", orig: data, src: data }] } as never);
    const p = d.pages[0];
    expect(p.orig.startsWith("blob:")).toBe(true);
    expect(p.src).toBe(p.orig);
    expect(fpOf(p.orig)).toBe(fpOf(data));
    expect(blobFor(p.orig)?.size).toBe("xin chao anh trang".length);
  });
  it("tài liệu mã hoá giữ nguyên", () => {
    const d = { id: "b", enc: "x", pages: [{ id: "p", orig: data, src: data }] } as never;
    expect(blobifyDoc(d)).toBe(d);
  });
});
