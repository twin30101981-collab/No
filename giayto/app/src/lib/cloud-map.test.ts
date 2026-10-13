import { describe, expect, it } from "vitest";
import { docToRow, folderPaths, pagePath, pagesToRows, rowToDoc } from "./cloud-map";
import type { Doc } from "./db";

const edit = { rot: 0 } as unknown as Doc["pages"][number]["edit"];
const doc: Doc = {
  id: "d1", name: "Hoá đơn", folder: "Việc/2026", kind: "doc", createdAt: 1000, updatedAt: 2000,
  tags: ["vat"], pages: [
    { id: "p1", orig: "x", src: "y", edit, text: "a" },
    { id: "p2", orig: "x", src: "y", edit },
  ],
};

describe("cloud-map", () => {
  it("đường dẫn ảnh bắt đầu bằng mã người dùng và an toàn", () => {
    expect(pagePath("u1", "d/1", "p 1", "orig")).toBe("u1/d_1/p_1-orig.jpg");
  });
  it("đi và về giữ nguyên dữ liệu (trừ ảnh)", () => {
    const row = { ...docToRow(doc), updated_at: new Date(2000).toISOString() };
    const back = rowToDoc(row, pagesToRows("u1", doc).reverse());
    expect(back.pages.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(back.pages[0].text).toBe("a");
    expect(back).toMatchObject({ id: "d1", name: "Hoá đơn", folder: "Việc/2026", tags: ["vat"], createdAt: 1000, updatedAt: 2000 });
    expect(back.deletedAt).toBeUndefined();
  });
  it("giữ thời điểm xoá mềm", () => {
    const row = docToRow({ ...doc, deletedAt: 5000 });
    expect(Date.parse(row.deleted_at!)).toBe(5000);
  });
  it("liệt kê thư mục cha", () => {
    expect(folderPaths([doc, { ...doc, folder: "" }])).toEqual(["Việc", "Việc/2026"]);
  });
});
