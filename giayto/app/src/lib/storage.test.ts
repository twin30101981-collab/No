import { describe, expect, it } from "vitest";
import type { Doc } from "./db";
import { breakdown, cleanTemp, fmtBytes, level } from "./storage";

const pg = (src: string, extra = {}) => ({ id: src, orig: src, src, edit: { rotation: 0, filter: "original" as const, brightness: 0, contrast: 0 }, ...extra });
import { fpOf } from "./disk-pack";
const key = (s: string) => fpOf(s);
const doc = (id: string, pages: Doc["pages"], deletedAt?: number): Doc => ({ id, name: id, folder: "Chung", kind: "x", createdAt: 0, updatedAt: 0, pages, ...(deletedAt ? { deletedAt } : {}) });

describe("storage", () => {
  const a = "A".repeat(4000), b = "B".repeat(8000);
  const docs = [
    doc("1", [pg(a, { thumb: "T".repeat(400), thumbKey: key(a) }), pg(b, { thumb: "S".repeat(400), thumbKey: key(b) })]),
    doc("2", [pg(b, { thumb: "U".repeat(400), thumbKey: "cũ" })], 1),
  ];
  it("chia dung lượng: đang dùng, thùng rác, ảnh tạm", () => {
    expect(breakdown(docs)).toEqual({ active: 9000, trash: 6000, temp: 600 });
  });
  it("chỉ dọn ảnh thu nhỏ cũ/thừa, giữ ảnh thu nhỏ hợp lệ", () => {
    const out = cleanTemp(docs);
    expect(out.map((d) => d.id)).toEqual(["1", "2"]);
    expect(out[0].pages[0].thumb).toBeDefined();
    expect(out[0].pages[1].thumb).toBeUndefined();
    expect(out[1].pages[0].thumb).toBeUndefined();
    expect(cleanTemp(out)).toEqual([]);
  });
  it("mức cảnh báo và định dạng", () => {
    expect(level(50, 100)).toBe("ok"); expect(level(85, 100)).toBe("warn"); expect(level(96, 100)).toBe("full"); expect(level(5, 0)).toBe("ok");
    expect(fmtBytes(2_500_000)).toBe("2.5 MB");
  });
});
