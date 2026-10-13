// R3.4: kiểm thử nhận loại tài liệu theo ảnh + gộp với theo chữ.
import { describe, expect, it } from "vitest";
import { analyzeDocImage, guessDocTypeFromImage, combineDocType, IMAGE_MIN_CONFIDENCE } from "./doc-type-image";
import { detectDocType } from "./doc-type";

/** Dựng ảnh RGBA giả: nền trắng + tỉ lệ điểm đỏ/xanh/đen cho trước. */
function makeImage(width: number, height: number, opts: { red?: number; blue?: number; dark?: number; grey?: boolean } = {}) {
  const data = new Uint8ClampedArray(width * height * 4);
  const n = width * height;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const f = i / n;
    let r = 245, g = 245, b = 245; // nền giấy
    if (opts.grey) { r = g = b = 200; }
    if (opts.red && f < opts.red) { r = 200; g = 30; b = 30; }
    else if (opts.blue && f < (opts.red ?? 0) + opts.blue) { r = 30; g = 60; b = 180; }
    else if (opts.dark && f < (opts.red ?? 0) + (opts.blue ?? 0) + opts.dark) { r = g = b = 40; }
    data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
  }
  return data;
}

describe("analyzeDocImage", () => {
  it("đo đúng tỉ lệ đỏ và tỉ lệ khung", () => {
    const s = analyzeDocImage(makeImage(100, 50, { red: 0.2 }), 100, 50);
    expect(s.redRatio).toBeCloseTo(0.2, 1);
    expect(s.aspect).toBe(2);
  });

  it("ảnh trắng tinh: không đỏ, không xanh, ít màu", () => {
    const s = analyzeDocImage(makeImage(70, 100), 70, 100);
    expect(s.redRatio).toBe(0);
    expect(s.blueRatio).toBe(0);
    expect(s.colorRatio).toBeLessThan(0.05);
  });

  it("bước mẫu giới hạn số điểm đọc trên ảnh lớn", () => {
    const s = analyzeDocImage(makeImage(800, 600, { red: 0.1 }), 800, 600);
    expect(s.redRatio).toBeCloseTo(0.1, 1);
  });
});

describe("guessDocTypeFromImage", () => {
  it("nhiều đỏ + A4 → sổ đỏ", () => {
    const g = guessDocTypeFromImage(analyzeDocImage(makeImage(70, 100, { red: 0.15 }), 70, 100));
    expect(g?.id).toBe("sodo");
    expect(g!.confidence).toBeGreaterThanOrEqual(IMAGE_MIN_CONFIDENCE);
  });

  it("đỏ vừa (dấu tròn) + A4 → khai sinh", () => {
    const g = guessDocTypeFromImage(analyzeDocImage(makeImage(70, 100, { red: 0.03 }), 70, 100));
    expect(g?.id).toBe("khaisinh");
  });

  it("khung thẻ ngang nhiều màu → bằng lái", () => {
    const data = makeImage(160, 100, { red: 0.3, blue: 0.3 });
    const g = guessDocTypeFromImage(analyzeDocImage(data, 160, 100));
    expect(g?.id).toBe("banglai");
  });

  it("khung thẻ ngang nhiều xanh dương → đăng ký xe", () => {
    const g = guessDocTypeFromImage(analyzeDocImage(makeImage(160, 100, { blue: 0.4 }), 160, 100));
    expect(g?.id).toBe("xe");
  });

  it("A4 dọc ít màu không đỏ → hoá đơn", () => {
    const g = guessDocTypeFromImage(analyzeDocImage(makeImage(70, 100, { dark: 0.1 }), 70, 100));
    expect(g?.id).toBe("vat");
  });

  it("ảnh chung chung không đủ chắc → null", () => {
    const g = guessDocTypeFromImage(analyzeDocImage(makeImage(100, 100), 100, 100));
    expect(g).toBeNull();
  });
});

describe("combineDocType", () => {
  // Thêm vài từ của loại khác để độ tin cậy theo chữ < 1 (giống OCR thật).
  const vatText = detectDocType("HOÁ ĐƠN GIÁ TRỊ GIA TĂNG VAT mã số thuế 0101234567 cộng tiền hàng thuế suất 10% tiền thuế mã tra cứu đơn vị bán hợp đồng")!;

  it("chữ và ảnh cùng loại → tăng độ tin cậy, nguồn text+image", () => {
    const c = combineDocType(vatText, { id: "vat", confidence: 0.8 });
    expect(c?.id).toBe("vat");
    expect(c?.source).toBe("text+image");
    expect(c!.confidence).toBeGreaterThanOrEqual(vatText.confidence);
    expect(c!.confidence).toBeLessThanOrEqual(0.99);
  });

  it("chữ chắc, ảnh khác loại → theo chữ", () => {
    const c = combineDocType(vatText, { id: "sodo", confidence: 0.7 });
    expect(c?.id).toBe("vat");
    expect(c?.source).toBe("text");
  });

  it("chữ không nhận ra → dùng ảnh khi ảnh đủ chắc", () => {
    const c = combineDocType(null, { id: "banglai", confidence: 0.6 });
    expect(c).toEqual({ id: "banglai", confidence: 0.6, source: "image" });
  });

  it("cả hai đều không có → null", () => {
    expect(combineDocType(null, null)).toBeNull();
  });

  it("chữ yếu + ảnh rất chắc khác loại → theo ảnh", () => {
    const weak = { ...vatText, confidence: 0.5 };
    const c = combineDocType(weak, { id: "sodo", confidence: 0.75 });
    expect(c?.id).toBe("sodo");
    expect(c?.source).toBe("image");
  });
});
