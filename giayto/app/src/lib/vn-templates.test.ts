import { describe, expect, it } from "vitest";
import { checkTemplateFields, isPlate, isTaxCode, templateById } from "./vn-templates";
import { checkExtraction } from "./extract-check";

describe("mẫu giấy tờ VN", () => {
  it("nhận MST và biển số hợp lệ", () => {
    expect(isTaxCode("0101234567")).toBe(true);
    expect(isTaxCode("0101234567-001")).toBe(true);
    expect(isTaxCode("12345")).toBe(false);
    expect(isPlate("30A-123.45")).toBe(true);
    expect(isPlate("51F1-234.56")).toBe(true);
    expect(isPlate("ABC")).toBe(false);
  });
  it("hoá đơn VAT: báo lệch khi trước thuế + thuế ≠ tổng", () => {
    const t = templateById("vat")!;
    const ok = checkTemplateFields(t, [{ label: "Tiền trước thuế", value: "1.000.000" }, { label: "Tiền thuế", value: "80.000" }, { label: "Tổng thanh toán", value: "1.080.000" }]);
    expect(ok.bad).toEqual([]);
    const bad = checkTemplateFields(t, [{ label: "Tiền trước thuế", value: "1.000.000" }, { label: "Tiền thuế", value: "80.000" }, { label: "Tổng thanh toán", value: "1.800.000" }]);
    expect(bad.bad).toContain("Tổng thanh toán");
    expect(bad.notes.length).toBe(1);
  });
  it("sổ đỏ thiếu số thửa → cần xem lại", () => {
    const r = checkExtraction({ type: "Sổ đỏ", title: "GCN", summary: "s", keyPoints: [], confidence: 0.9, tags: [],
      fields: [{ label: "Số phát hành", value: "CS 123456" }, { label: "Người sử dụng", value: "Nguyễn Văn A" }, { label: "Tờ bản đồ số", value: "12" }, { label: "Diện tích", value: "80 m²" }] });
    expect(r.verdict).toBe("review");
    expect(r.missing).toContain("Thửa đất số");
  });
  it("G2-13: bằng lái kiểm số, hạng và thứ tự ngày", () => {
    const t = templateById("banglai")!;
    const r = checkTemplateFields(t, [{ label: "Số GPLX", value: "0123 4567 8901" }, { label: "Hạng", value: "A1, B" }, { label: "Ngày sinh", value: "01/02/1990" }, { label: "Ngày cấp", value: "05/06/2015" }, { label: "Có giá trị đến", value: "05/06/2010" }]);
    expect(r.bad).toEqual(["Có giá trị đến"]);
    expect(checkTemplateFields(t, [{ label: "Số GPLX", value: "123" }, { label: "Hạng", value: "Z9" }]).bad).toEqual(["Số GPLX", "Hạng"]);
  });
  it("G2-13: khai sinh kiểm giới tính, số định danh, ngày đăng ký", () => {
    const t = templateById("khaisinh")!;
    const r = checkTemplateFields(t, [{ label: "Giới tính", value: "Khác" }, { label: "Số định danh cá nhân", value: "001090012345" }, { label: "Ngày sinh", value: "10/10/2020" }, { label: "Ngày đăng ký", value: "01/10/2020" }]);
    expect(r.bad.sort()).toEqual(["Giới tính", "Ngày đăng ký"].sort());
  });
  it("G2-13: hợp đồng báo trùng bên và hết hạn trước hiệu lực", () => {
    const t = templateById("hopdong")!;
    const r = checkTemplateFields(t, [{ label: "Bên A", value: "Công ty X" }, { label: "Bên B", value: "công ty x" }, { label: "Ngày hiệu lực", value: "01/01/2026" }, { label: "Ngày hết hạn", value: "01/01/2025" }]);
    expect(r.bad.sort()).toEqual(["Bên B", "Ngày hết hạn"].sort());
    expect(r.notes.length).toBe(2);
  });
});
