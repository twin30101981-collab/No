import { describe, expect, it } from "vitest";
import { MAX_ITEMS, pickPrune, unsureCells } from "./history";
import type { Review } from "./review";

describe("history", () => {
  it("ghi ô còn dấu và ô chỉ bị bỏ dấu, không ghi ô đã sửa", () => {
    const before: Review = { kind: "excel", title: "t", sheets: [{ name: "A", rows: [["a", "12⟦?⟧", "7⟦?⟧", "9⟦?⟧"]] }] };
    const after: Review = { kind: "excel", title: "t", sheets: [{ name: "A", rows: [["a", "12", "8", "9⟦?⟧"]] }] };
    const p = unsureCells(before, after);
    expect(p[0].unsure).toEqual([{ row: 0, col: 1, value: "12" }, { row: 0, col: 3, value: "9" }]);
    expect(p[0].ai).toBe(true);
  });
  it("giữ 30 mục mới nhất và tối đa 200 MB", () => {
    const items = Array.from({ length: 35 }, (_, i) => ({ id: String(i), at: i }));
    const drop = pickPrune(items, () => 1);
    expect(drop.length).toBe(35 - MAX_ITEMS);
    expect(drop).toContain("0");
    expect(drop).not.toContain("34");
    const big = pickPrune(items.slice(0, 3), () => 120 * 1024 * 1024);
    expect(big).toEqual(["1", "0"]);
  });
});
