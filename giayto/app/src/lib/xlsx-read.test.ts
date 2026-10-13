// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatValue, readXlsx, vnNumber, XlsxError } from "./xlsx-read";
import { blocksToDocx, block } from "./docx";

describe("xlsx-read", () => {
  it("đọc tệp nén thật: ô gộp, số âm đỏ, ngày, %, sheet trống", async () => {
    const buf = readFileSync("src/test/fixtures/mau.xlsx");
    const s = await readXlsx(new Uint8Array(buf));
    expect(s.map((x) => x.name)).toEqual(["Dư nợ", "Trống"]);
    expect(s[1].rows).toEqual([]);
    expect(s[0].rows[0]).toEqual(["Chi nhánh", "DƯ NỢ", "", "Ngày", "Tỷ lệ"]);
    expect(s[0].rows[1]).toEqual(["Hội Sở", "1.234.567", "-1.156", "30/09/2026", "12,5%"]);
    expect(s[0].rows[2].slice(0, 3)).toEqual(["Tổng", "", "-5"]);
    expect(s[0].merges).toEqual([{ r: 0, c: 1, rs: 1, cs: 2 }]);
    expect(s[0].red.sort()).toEqual(["1,2", "2,2"]);
    const docx = blocksToDocx([block("table", "", { rows: s[0].rows, merges: s[0].merges, red: s[0].red })]);
    expect(docx.size).toBeGreaterThan(1000);
  });
  it("báo lỗi tệp không phải xlsx", async () => {
    await expect(readXlsx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).rejects.toBeInstanceOf(XlsxError);
  });
  it("định dạng số", () => {
    expect(vnNumber(-1156)).toBe("-1.156");
    expect(formatValue(1500000, 0, '#,##0 "₫"').text).toBe("1.500.000 ₫");
    expect(formatValue(-3, 0, "#,##0;[Red]-#,##0")).toEqual({ text: "-3", red: true });
  });
});
