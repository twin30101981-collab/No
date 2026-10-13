import { describe, expect, it } from "vitest";
import { monthTotals, normalizeReceipt, parseAmount, parseDate } from "./receipt";

describe("receipt", () => {
  it("đọc số tiền kiểu Việt Nam", () => {
    expect(parseAmount("1.234.500đ")).toBe(1234500);
    expect(parseAmount("1,234,500 VND")).toBe(1234500);
    expect(parseAmount("125.000,50")).toBe(125001);
    expect(parseAmount("45000")).toBe(45000);
    expect(parseAmount("không")).toBeNull();
  });
  it("chuẩn hoá ngày", () => {
    expect(parseDate("03/10/2026")).toBe("2026-10-03");
    expect(parseDate("Ngày 5-9-26")).toBe("2026-09-05");
    expect(parseDate("2026-10-03")).toBe("2026-10-03");
    expect(parseDate("31/02/2026")).toBe("");
  });
  it("đánh dấu chưa chắc và tổng theo tháng", () => {
    expect(normalizeReceipt({ merchant: "Highlands", total: "?", date: "03/10/2026", category: "Ăn uống", confidence: 0.9 }).unsure).toBe(true);
    expect(normalizeReceipt({ merchant: "X", total: "10.000", date: "1/1/2026", category: "Lạ", confidence: 0.9 }).category).toBe("Khác");
    const t = monthTotals([
      { id: "a", merchant: "", total: 10, date: "2026-10-01", category: "Khác", thumb: "", createdAt: 0 },
      { id: "b", merchant: "", total: 5, date: "2026-10-09", category: "Khác", thumb: "", createdAt: 0 },
      { id: "c", merchant: "", total: 7, date: "2026-09-09", category: "Khác", thumb: "", createdAt: 0 },
    ]);
    expect(t[0]).toEqual({ month: "2026-10", total: 15, count: 2 });
  });
});

import { expenseSheets } from "./receipt";
describe("expenseSheets", () => {
  const L = [
    { id: "a", merchant: "Highlands", total: 45000, date: "2026-10-01", category: "Ăn uống", thumb: "", createdAt: 0 },
    { id: "b", merchant: "Grab", total: 30000, date: "2026-10-05", category: "Đi lại", thumb: "", createdAt: 0 },
    { id: "c", merchant: "EVN", total: 500000, date: "2026-09-20", category: "Điện nước", thumb: "", createdAt: 0 },
  ];
  it("tổng hợp theo tháng và nhóm", () => {
    const s = expenseSheets(L);
    expect(s.map((x) => x.name)).toEqual(["Tổng hợp", "Tháng 09-2026", "Tháng 10-2026"]);
    expect(s[0]!.rows[0]).toEqual(["Tháng", "Số hoá đơn", "Ăn uống", "Đi lại", "Điện nước", "Tổng"]);
    expect(s[0]!.rows[2]).toEqual(["10/2026", "2", "45000", "30000", "0", "75000"]);
    expect(s[2]!.rows[1]).toEqual(["01/10/2026", "Highlands", "Ăn uống", "45000"]);
  });
  it("lọc theo tháng chọn", () => {
    const s = expenseSheets(L, ["2026-09"]);
    expect(s.length).toBe(2);
    expect(s[0]!.rows[0]).toEqual(["Tháng", "Số hoá đơn", "Điện nước", "Tổng"]);
  });
});
