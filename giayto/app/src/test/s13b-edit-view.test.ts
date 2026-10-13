import { describe, expect, it } from "vitest";
import { fitScale, actualScale, clampPan, zoomAt, centerOn, boxFromPixels, boxFromLine, boxFromOcrWord } from "@/lib/edit-view";
import { cropSafety } from "@/lib/edit-session";

const view = { w: 400, h: 600 }, img = { w: 3000, h: 4000 };

describe("S13 phóng 100%", () => {
  it("tỉ lệ vừa khung và 100% theo dpr", () => {
    expect(fitScale(view, img)).toBeCloseTo(400 / 3000, 6);
    expect(actualScale(3)).toBeCloseTo(1 / 3, 6);
    expect(actualScale(0)).toBe(1);
    expect(fitScale({ w: 0, h: 5 }, img)).toBe(1);
  });
  it("ảnh nhỏ hơn khung thì căn giữa", () => {
    expect(clampPan({ x: 99, y: -99 }, view, img, 0.05)).toEqual({ x: 125, y: 200 });
  });
  it("ảnh lớn hơn khung thì không hở mép", () => {
    const s = 1 / 3, cw = img.w * s, ch = img.h * s;
    expect(clampPan({ x: 50, y: 50 }, view, img, s)).toEqual({ x: 0, y: 0 });
    expect(clampPan({ x: -99999, y: -99999 }, view, img, s)).toEqual({ x: view.w - cw, y: view.h - ch });
  });
  it("phóng quanh một điểm thì điểm đó đứng yên", () => {
    const s0 = fitScale(view, img), pan0 = clampPan({ x: 0, y: 0 }, view, img, s0);
    const anchor = { x: 200, y: 300 };
    const ip = { x: (anchor.x - pan0.x) / s0, y: (anchor.y - pan0.y) / s0 };
    const r = zoomAt(pan0, s0, 1 / 3, anchor, view, img);
    const back = { x: r.pan.x + ip.x * r.scale, y: r.pan.y + ip.y * r.scale };
    expect(back.x).toBeCloseTo(anchor.x, 3); expect(back.y).toBeCloseTo(anchor.y, 3);
  });
  it("nhảy tới vùng ở góc rồi vẫn kẹp trong khung", () => {
    const s = 1 / 3, p = centerOn({ x: 0.02, y: 0.02 }, view, img, s);
    expect(p).toEqual({ x: 0, y: 0 });
    const q = centerOn({ x: 0.5, y: 0.5 }, view, img, s);
    expect(q.x).toBeCloseTo(view.w / 2 - 0.5 * img.w * s, 6);
  });
});

describe("S13 hộp nội dung", () => {
  it("đổi hộp điểm ảnh sang chuẩn hoá, kẹp mép, bỏ hộp hỏng", () => {
    const t = boxFromPixels({ x0: 300, y0: 400, x1: 900, y1: 800 }, img, "table")!;
    expect(t.x).toBeCloseTo(0.1, 6); expect(t.y).toBeCloseTo(0.1, 6); expect(t.w).toBeCloseTo(0.2, 6); expect(t.h).toBeCloseTo(0.1, 6); expect(t.kind).toBe("table");
    const c = boxFromPixels({ x0: -50, y0: 0, x1: 4000, y1: 100 }, img);
    expect(c!.x).toBe(0); expect(c!.w).toBe(1);
    expect(boxFromPixels({ x0: 10, y0: 10, x1: 10, y1: 50 }, img)).toBeNull();
    expect(boxFromPixels({ x0: NaN, y0: 0, x1: 5, y1: 5 }, img)).toBeNull();
    expect(boxFromPixels({ x0: 0, y0: 0, x1: 5, y1: 5 }, { w: 0, h: 10 })).toBeNull();
  });
  it("dòng chữ → hộp bao có nới chiều dọc", () => {
    const b = boxFromLine([[0.2, 0.30], [0.5, 0.31], [0.8, 0.30]], 0.01)!;
    expect(b.x).toBeCloseTo(0.2, 6); expect(b.w).toBeCloseTo(0.6, 6);
    expect(b.y).toBeCloseTo(0.29, 6); expect(b.h).toBeCloseTo(0.03, 6);
    expect(b.kind).toBe("text");
    expect(boxFromLine([])).toBeNull();
  });
  it("nối với cropSafety: dòng chữ sát mép phải bị khung lấn", () => {
    const quad: [number, number][] = [[0.05, 0.05], [0.9, 0.05], [0.9, 0.95], [0.05, 0.95]];
    const line = boxFromLine([[0.3, 0.5], [0.95, 0.5]])!;
    const r = cropSafety(quad, [line]);
    expect(r.safe).toBe(false);
    expect(r.cut[0]!.kind).toBe("text");
  });
});

describe("S13c hộp từ OCR", () => {
  const w = { text: "19/06/2025", conf: 90, x0: 100, y0: 200, x1: 400, y1: 260 };
  it("giữ từ có chữ/số và tin cậy đủ", () => {
    const b = boxFromOcrWord(w, img)!;
    expect(b.kind).toBe("text"); expect(b.w).toBeCloseTo(0.1, 6);
  });
  it("bỏ vạch bảng, từ tin cậy thấp, hộp hỏng", () => {
    expect(boxFromOcrWord({ ...w, text: "|" }, img)).toBeNull();
    expect(boxFromOcrWord({ ...w, text: "—" }, img)).toBeNull();
    expect(boxFromOcrWord({ ...w, conf: 12 }, img)).toBeNull();
    expect(boxFromOcrWord({ ...w, conf: NaN }, img)).toBeNull();
    expect(boxFromOcrWord({ ...w, x1: w.x0 }, img)).toBeNull();
  });
  it("giữ chữ có dấu tiếng Việt", () => expect(boxFromOcrWord({ ...w, text: "Địa" }, img)).not.toBeNull());
});
