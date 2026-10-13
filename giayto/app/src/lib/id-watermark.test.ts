import { describe, expect, it } from "vitest";
import { idWatermarkText, isIdDoc, tileRows } from "./id-watermark";

describe("id watermark", () => {
  it("builds uppercase Vietnamese text with date", () => {
    expect(idWatermarkText("  hồ sơ   ngân hàng ", new Date(2026, 9, 3))).toBe("CHỈ DÙNG CHO MỤC ĐÍCH HỒ SƠ NGÂN HÀNG · 03/10/2026");
    expect(idWatermarkText("chỉ dùng cho mục đích vay vốn")).toBe("CHỈ DÙNG CHO MỤC ĐÍCH VAY VỐN");
    expect(idWatermarkText("   ")).toBe("");
  });
  it("detects ID documents", () => {
    expect(isIdDoc({ kind: "CCCD", name: "x" })).toBe(true);
    expect(isIdDoc({ kind: "Tài liệu", name: "Căn cước mẹ" })).toBe(true);
    expect(isIdDoc({ kind: "Hoá đơn", name: "Điện tháng 9" })).toBe(false);
  });
  it("tiles rows across the whole rotated diagonal", () => {
    const { diag, rows } = tileRows(300, 400, 50);
    expect(diag).toBe(500);
    expect(rows[0]).toBeLessThanOrEqual(-250 + 1);
    expect(rows[rows.length - 1]).toBeGreaterThanOrEqual(250 - 50);
  });
});
