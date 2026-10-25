import { describe, expect, it } from "vitest";
import { thumbTaskKey, thumbValid } from "./thumbs";
import { fpOf } from "./disk-pack";
import type { Page } from "./db";

const page = (src: string, thumb?: string, thumbKey?: string): Page => ({
  id: "p1", orig: src, src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 },
  ...(thumb !== undefined ? { thumb } : {}), ...(thumbKey !== undefined ? { thumbKey } : {}),
});

describe("B14 — ảnh thu nhỏ riêng từng trang", () => {
  it("khoá hàng đợi phân biệt từng trang của cùng tài liệu", () => {
    expect(thumbTaskKey("doc1", 0)).not.toBe(thumbTaskKey("doc1", 1));
    expect(thumbTaskKey("doc1", 2)).toBe("doc1:2");
    expect(thumbTaskKey("doc1", 0)).not.toBe(thumbTaskKey("doc2", 0));
  });

  it("thumbValid chỉ đạt khi thumbKey khớp dấu vân tay ảnh hiện tại", () => {
    const p = page("data:image/jpeg;base64,AAAA");
    expect(thumbValid(p)).toBe(false);
    const k = fpOf(p.src);
    expect(thumbValid(page(p.src, "data:image/jpeg;base64,BBBB", k))).toBe(true);
    // ảnh trang đổi (vd: bản hoàn thiện thay bản nháp) → ảnh thu nhỏ cũ hết hạn
    expect(thumbValid(page("data:image/jpeg;base64,CCCC", "data:image/jpeg;base64,BBBB", k))).toBe(false);
  });

  it("khoá hàng đợi tách được docId và chỉ số trang", () => {
    const [id, idx] = thumbTaskKey("abc123", 7).split(":");
    expect(id).toBe("abc123");
    expect(Number(idx)).toBe(7);
  });
});
