// R1.1 – Một cửa chỉnh (TD-11/12): chỉ còn AdjustEditor ghi bộ lọc vào trang.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync("src/routes/doc.$id.tsx", "utf8");
const editor = readFileSync("src/components/adjust-editor.tsx", "utf8");

describe("R1.1 một cửa chỉnh", () => {
  it("màn tài liệu không còn bảng lọc áp ngay riêng", () => {
    expect(route).not.toMatch(/function FilterPanel/);
    expect(route).not.toMatch(/<FilterPanel/);
  });
  it("nút Lọc mở cùng màn Chỉnh tay", () => {
    expect(route).toMatch(/panel === "adjust" \|\| panel === "filter"\) && <AdjustEditor/);
  });
  it("Chỉnh tay có gợi ý bộ lọc, Áp tất cả và Trang tương tự", () => {
    expect(editor).toMatch(/suggestFilter/);
    expect(editor).toMatch(/onApplyAll/);
    expect(editor).toMatch(/onApplySimilar/);
  });
});
