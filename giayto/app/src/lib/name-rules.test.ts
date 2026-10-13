import { describe, expect, it } from "vitest";
import { applyNaming, cleanFolder, fold, pickFolder, renderTemplate, type FolderRule } from "./name-rules";
import type { Doc } from "./db";

const date = new Date(2026, 9, 3, 20, 5).getTime();
const doc = (p: Partial<Doc> = {}): Doc => ({ id: "a", name: "Hoá đơn Điện lực", folder: "Chung", kind: "Tài liệu", createdAt: date, updatedAt: 0, pages: [], tags: ["Điện"], fields: { "Loại (AI)": "Hoá đơn" }, ...p });
const rules: FolderRule[] = [
  { id: "1", field: "tag", contains: "nha", folder: "Nhà" },
  { id: "2", field: "type", contains: "hoa don", folder: "Chi tiêu/Hoá đơn" },
  { id: "3", field: "name", contains: "điện", folder: "Điện" },
];

describe("name-rules", () => {
  it("điền biến vào mẫu tên", () => {
    const v = { title: "Điện lực 09", type: "Hoá đơn", tags: ["Nhà"], date };
    expect(renderTemplate("{loai} - {ten} ({ngay})", v)).toBe("Hoá đơn - Điện lực 09 (03-10-2026)");
    expect(renderTemplate("{nam}/{thang} {the}", v)).toBe("2026 10-2026 Nhà");
    expect(renderTemplate("", v)).toBe("Điện lực 09");
    expect(renderTemplate("{the} - {ten}", { ...v, tags: [] })).toBe("Điện lực 09");
    expect(renderTemplate("{la} {ten}", v)).toBe("{la} Điện lực 09");
  });
  it("so khớp không dấu, quy tắc đầu tiên thắng", () => {
    expect(fold("Hoá Đơn")).toBe("hoa don");
    expect(pickFolder(rules, doc())).toBe("Chi tiêu/Hoá đơn");
    expect(pickFolder(rules, doc({ tags: ["nhà"] }))).toBe("Nhà");
    expect(pickFolder(rules, doc({ fields: {}, name: "Hợp đồng" }))).toBeNull();
    expect(pickFolder([{ id: "x", field: "name", contains: " ", folder: "A" }], doc())).toBeNull();
  });
  it("chỉ chuyển tài liệu đang ở thư mục gốc", () => {
    const r = applyNaming(doc(), { title: "Điện lực", type: "Hoá đơn" }, "{loai} {ten}", rules);
    expect(r).toMatchObject({ name: "Hoá đơn Điện lực", folder: "Chi tiêu/Hoá đơn" });
    expect(applyNaming(doc({ folder: "Riêng" }), { title: "X", type: "Hoá đơn" }, "", rules).folder).toBe("Riêng");
    expect(cleanFolder(" a / b:c // ")).toBe("a/b c");
  });
});
