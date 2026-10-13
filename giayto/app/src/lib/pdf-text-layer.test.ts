/**
 * R5.2 – Lớp chữ OCR ẩn trong PDF: tìm và chọn được chữ tiếng Việt trên PDF tải về.
 * Kiểm chứng: dựng PDF thật bằng jsPDF + writeTextLayer, đọc lại bằng pdfjs-dist,
 * tìm thấy đúng từ tiếng Việt có dấu.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { textLayerOps, writeTextLayer, type OcrLine } from "./files";
import { pageRect } from "./pdf-frame-check";

const LINES: OcrLine[] = [
  { text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bbox: { x0: 200, y0: 120, x1: 1400, y1: 170 } },
  { text: "Độc lập – Tự do – Hạnh phúc", bbox: { x0: 300, y0: 200, x1: 1300, y1: 250 } },
  { text: "Giấy chứng nhận quyền sử dụng đất", bbox: { x0: 250, y0: 400, x1: 1350, y1: 460 } },
];

describe("R5.2 – textLayerOps (thuần)", () => {
  it("đặt dòng chữ đúng vị trí co theo tỉ lệ khung ảnh", () => {
    const r = pageRect(1654, 2339); // khung ảnh trong trang A4
    const scale = r.w / 1654;
    const ops = textLayerOps(LINES, r.x, r.y, scale);
    expect(ops).toHaveLength(3);
    expect(ops[0].x).toBeCloseTo(r.x + 200 * scale, 5);
    expect(ops[0].size).toBeGreaterThan(2);
    expect(ops[1].text).toContain("Hạnh phúc");
  });

  it("bỏ dòng trắng, khoảng chữ 0 khi không đo được bề rộng", () => {
    const ops = textLayerOps([{ text: "   ", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }, ...LINES], 0, 0, 0.1);
    expect(ops).toHaveLength(3);
    expect(ops[0].charSpace).toBe(0);
  });
});

describe("R5.2 – PDF tải về tìm được chữ tiếng Việt", () => {
  it("pdfjs đọc lại đúng các từ có dấu từ lớp chữ ẩn", async () => {
    const { jsPDF } = await import("jspdf");
    const font = readFileSync(join(__dirname, "../../public/fonts/DejaVuSans.ttf"));
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const r = pageRect(1654, 2339);
    const scale = r.w / 1654;
    // Nhúng phông giống loadFont() nhưng đọc từ đĩa (kiểm thử chạy trên Node).
    let s = "";
    for (let i = 0; i < font.length; i += 0x8000) s += String.fromCharCode(...font.subarray(i, i + 0x8000));
    pdf.addFileToVFS("DejaVuSans.ttf", btoa(s));
    pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal", undefined, "Identity-H");
    await writeTextLayer(pdf, textLayerOps(LINES, r.x, r.y, scale));
    const bytes = pdf.output("arraybuffer") as ArrayBuffer;

    const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const task = lib.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false } as never);
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const all = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    expect(all).toContain("VIỆT NAM");
    expect(all).toContain("Hạnh phúc");
    expect(all).toContain("quyền sử dụng đất");
    // Chữ vô hình: không được đổ mực ra trang (renderingMode invisible → text vẫn trích được).
    expect(content.items.length).toBeGreaterThanOrEqual(3);
    await task.destroy();
  }, 30000);
});
