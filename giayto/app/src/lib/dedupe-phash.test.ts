import { describe, expect, it } from "vitest";
import { classifyImportImage, findDuplicate, hammingHex, isDuplicateHash, phashFromRgba } from "./dedupe-phash";

/** Dựng ảnh RGBA giả lập từ hàm tô màu. */
function makeImage(w: number, h: number, paint: (x: number, y: number) => [number, number, number]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = paint(x, y);
    const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }
  return data;
}

/** Trang giấy trắng có dòng chữ đen ngang (giả lập tài liệu). */
function docPaint(w: number, h: number, ink = 30): (x: number, y: number) => [number, number, number] {
  return (x, y) => {
    const line = Math.floor((y / h) * 24);
    const lh = h / 24;
    const inLine = y % lh < lh * 0.45 && x > w * 0.15 && x < w * (0.55 + 0.3 * ((line * 7) % 10) / 10);
    return inLine ? [ink, ink, ink] : [245, 243, 238];
  };
}

describe("phashFromRgba", () => {
  it("ảnh giống hệt nhau có dấu vân trùng khớp", () => {
    const a = makeImage(64, 64, docPaint(64, 64));
    const b = makeImage(64, 64, docPaint(64, 64));
    expect(phashFromRgba(a, 64, 64)).toBe(phashFromRgba(b, 64, 64));
  });

  it("cùng một trang ở hai kích thước khác nhau vẫn trùng", () => {
    const a = makeImage(96, 128, docPaint(96, 128));
    const b = makeImage(48, 64, docPaint(48, 64));
    expect(isDuplicateHash(phashFromRgba(a, 96, 128), phashFromRgba(b, 48, 64))).toBe(true);
  });

  it("ảnh hơi khác (mực đậm hơn) vẫn nhận là trùng", () => {
    const a = makeImage(64, 64, docPaint(64, 64, 30));
    const b = makeImage(64, 64, docPaint(64, 64, 90));
    expect(hammingHex(phashFromRgba(a, 64, 64), phashFromRgba(b, 64, 64))).toBeLessThanOrEqual(10);
  });

  it("hai ảnh khác hẳn nhau không bị coi là trùng", () => {
    const doc = makeImage(64, 64, docPaint(64, 64));
    // Ảnh dải sọc dọc đậm nhạt xen kẽ — cấu trúc tần số khác hẳn.
    const stripes = makeImage(64, 64, (x) => (Math.floor(x / 4) % 2 ? [20, 20, 20] : [240, 240, 240]));
    expect(isDuplicateHash(phashFromRgba(doc, 64, 64), phashFromRgba(stripes, 64, 64))).toBe(false);
  });

  it("dấu vân luôn là 16 ký tự hex", () => {
    const h = phashFromRgba(makeImage(32, 32, () => [0, 0, 0]), 32, 32);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("hammingHex / isDuplicateHash", () => {
  it("khoảng cách 0 khi giống hệt", () => {
    expect(hammingHex("0123456789abcdef", "0123456789abcdef")).toBe(0);
  });
  it("đếm đúng số bit khác", () => {
    expect(hammingHex("0000000000000000", "000000000000000f")).toBe(4);
  });
  it("ngưỡng trùng tôn trọng tham số", () => {
    expect(isDuplicateHash("0000000000000000", "0000000000000007", 2)).toBe(false); // 0x7 = 3 bit > 2
    expect(isDuplicateHash("0000000000000000", "0000000000000007", 3)).toBe(true);
    expect(isDuplicateHash("0000000000000000", "000000000000000f", 3)).toBe(false); // 4 bit > 3
  });
  it("dấu vân sai độ dài không bao giờ trùng", () => {
    expect(isDuplicateHash("abc", "abc")).toBe(false);
  });
});

describe("findDuplicate", () => {
  it("tìm đúng phần tử trùng đầu tiên", () => {
    const h = phashFromRgba(makeImage(64, 64, docPaint(64, 64)), 64, 64);
    expect(findDuplicate(h, [undefined, "ffffffffffffffff", h])).toBe(2);
  });
  it("trả -1 khi không có trùng", () => {
    expect(findDuplicate("0000000000000000", [undefined, "ffffffffffffffff"])).toBe(-1);
  });
});

describe("classifyImportImage", () => {
  it("ảnh giấy tràn khung, viền sáng đều → flat", () => {
    const img = makeImage(120, 160, docPaint(120, 160));
    expect(classifyImportImage(img, 120, 160)).toBe("flat");
  });

  it("ảnh có nền tối/vụn quanh giấy → photo", () => {
    // Nền gỗ sẫm màu, giấy nằm giữa khung.
    const img = makeImage(120, 160, (x, y) => {
      const inPaper = x > 25 && x < 95 && y > 20 && y < 140;
      if (inPaper) return docPaint(70, 120)(x - 25, y - 20);
      return [90 + ((x * 13 + y * 7) % 40), 60 + ((x * 5 + y * 11) % 30), 40];
    });
    expect(classifyImportImage(img, 120, 160)).toBe("photo");
  });

  it("giao diện màn hình nhiều hàng đồng nhất → screenshot", () => {
    // Thanh trạng thái + khối văn bản phẳng: mỗi hàng một màu duy nhất.
    const img = makeImage(120, 160, (_x, y) => {
      if (y < 12) return [30, 30, 30];
      if (y < 40) return [250, 250, 250];
      if (y < 90) return [238, 238, 242];
      return [255, 255, 255];
    });
    expect(classifyImportImage(img, 120, 160)).toBe("screenshot");
  });

  it("ảnh màu rực viền không đều → photo", () => {
    const img = makeImage(100, 100, (x, y) => [(x * 7) % 256, (y * 11) % 256, ((x + y) * 5) % 256]);
    expect(classifyImportImage(img, 100, 100)).toBe("photo");
  });
});
