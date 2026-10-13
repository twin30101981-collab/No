import { describe, expect, it } from "vitest";
import { quickExportName, quickExportOpts, reviewCount, reviewReminder } from "./quick-export";

describe("R3.5 Xuất 1 chạm", () => {
  it("tên tệp tự động theo tên tài liệu, an toàn ký tự", () => {
    expect(quickExportName({ name: "Hoá đơn 10/2026" })).toBe("Hoá đơn 10-2026.pdf");
  });
  it("tuỳ chọn mặc định: mức Chuẩn (balanced)", () => {
    expect(quickExportOpts().size).toBe("balanced");
  });
  it("đếm trang cần xem lại theo ngưỡng điểm", () => {
    const r = { a: { score: 40, note: "" }, b: { score: 70, note: "" }, c: { score: 69, note: "" }, d: undefined };
    expect(reviewCount(r)).toBe(2);
  });
  it("nhắc “Còn N trang nên xem lại”, không nhắc khi hết", () => {
    expect(reviewReminder({ a: { score: 40, note: "" } })).toBe("Còn 1 trang nên xem lại");
    expect(reviewReminder({ a: { score: 40, note: "" }, b: { score: 20, note: "" } })).toBe("Còn 2 trang nên xem lại");
    expect(reviewReminder({ a: { score: 90, note: "" } })).toBeNull();
    expect(reviewReminder({})).toBeNull();
  });
});
