/**
 * R5.1 / TD-10 – Nghiệm thu: PDF 3 mức Nhỏ/Chuẩn/Cao; 20 trang Chuẩn ≤ 5 MB;
 * khung PDF khớp xem trước với tỉ lệ lệch ≤ 0,5 %.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PDF_SIZES, type PdfSize } from "./files";
import {
  aspectDeviation,
  BUDGET_BALANCED_20P,
  estimatePdfBytes,
  FRAME_MATCH_TOL,
  frameMatches,
  pageRect,
  withinBudget,
} from "./pdf-frame-check";

describe("R5.1 – PDF 3 mức", () => {
  it("chỉ còn đúng 3 mức Nhỏ / Chuẩn / Cao", () => {
    expect(Object.keys(PDF_SIZES).sort()).toEqual(["balanced", "high", "small"]);
    expect(PDF_SIZES.small.label).toBe("Nhỏ");
    expect(PDF_SIZES.balanced.label).toBe("Chuẩn");
    expect(PDF_SIZES.high.label).toBe("Cao");
  });

  it("mức Nhỏ nhẹ hơn Chuẩn, Chuẩn nhẹ hơn Cao", () => {
    expect(PDF_SIZES.small.maxSide).toBeLessThan(PDF_SIZES.balanced.maxSide);
    expect(PDF_SIZES.balanced.maxSide).toBeLessThan(PDF_SIZES.high.maxSide);
    expect(PDF_SIZES.small.q).toBeLessThan(PDF_SIZES.balanced.q);
    expect(PDF_SIZES.balanced.q).toBeLessThan(PDF_SIZES.high.q);
  });
});

describe("TD-10 – khung PDF khớp xem trước", () => {
  const cases: [number, number][] = [
    [2480, 3508], // A4 dọc 300 dpi
    [3508, 2480], // trang báo ngang
    [1654, 2339], // A4 200 dpi
    [3024, 4032], // ảnh điện thoại dọc
    [4032, 3024], // ảnh điện thoại ngang
    [1200, 1200], // vuông
    [900, 1600], // ảnh chụp màn hình dọc
  ];
  it.each(cases)("tỉ lệ lệch ≤ 0,5%% cho ảnh %ix%i", (w, h) => {
    expect(frameMatches(w, h)).toBe(true);
    expect(aspectDeviation(w, h, pageRect(w, h))).toBeLessThanOrEqual(FRAME_MATCH_TOL);
  });

  it("khung đặt nằm gọn trong trang A4, căn giữa", () => {
    const r = pageRect(2480, 3508);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(6);
    expect(r.x + r.w).toBeLessThanOrEqual(210);
    expect(r.y + r.h).toBeLessThanOrEqual(297);
    expect(Math.abs(r.x - (210 - r.w) / 2)).toBeLessThan(1e-9);
  });

  it("ảnh không hợp lệ báo lệch tối đa", () => {
    expect(aspectDeviation(0, 100, pageRect(0, 100))).toBe(1);
  });
});

describe("R5.1 – ngân sách 20 trang Chuẩn ≤ 5 MB", () => {
  it("ước lượng trong ngân sách với trang scan điển hình", () => {
    const avg = 237 * 1024; // trang mẫu 1654×2339 JPEG q72
    expect(withinBudget(20, "balanced", avg)).toBe(true);
    expect(estimatePdfBytes(20, "balanced", avg)).toBeLessThanOrEqual(BUDGET_BALANCED_20P);
  });

  it("PDF thật 20 trang mức Chuẩn ≤ 5 MB và khung khớp xem trước", async () => {
    const { jsPDF } = await import("jspdf");
    const jpg = readFileSync(join(__dirname, "../test/fixtures/trang-mau.jpg"));
    const dataUrl = `data:image/jpeg;base64,${jpg.toString("base64")}`;
    const W = 1654, H = 2339;
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    for (let i = 0; i < 20; i++) {
      if (i) pdf.addPage("a4");
      const r = pageRect(W, H);
      pdf.addImage(dataUrl, "JPEG", r.x, r.y, r.w, r.h, undefined, "FAST");
      expect(aspectDeviation(W, H, r)).toBeLessThanOrEqual(FRAME_MATCH_TOL);
    }
    const bytes = (pdf.output("arraybuffer") as ArrayBuffer).byteLength;
    expect(bytes).toBeLessThanOrEqual(BUDGET_BALANCED_20P);
  }, 30000);

  it("mức Nhỏ và Cao không bị chặn bởi ngân sách của ca nghiệm thu Chuẩn", () => {
    const sizes: PdfSize[] = ["small", "high"];
    for (const s of sizes) expect(withinBudget(20, s, 10 * 1024 * 1024)).toBe(true);
  });
});
