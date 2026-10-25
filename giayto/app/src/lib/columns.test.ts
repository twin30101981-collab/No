import { describe, expect, it } from "vitest";
import { fixNegative, mergeWrapped, rowsToGrid } from "./columns";

describe("columns", () => {
  it("ghép đúng cột khi 3 dòng lệch nhau", () => {
    const g = rowsToGrid([
      { y: 10, cells: [{ x0: 0, x1: 200, text: "Chi nhánh" }, { x0: 200, x1: 400, text: "Dư nợ" }, { x0: 400, x1: 600, text: "Tăng/giảm" }] },
      { y: 30, cells: [{ x0: 5, x1: 190, text: "Hội Sở" }, { x0: 260, x1: 395, text: "12.345" }, { x0: 470, x1: 598, text: "(98.855)" }] },
      { y: 20, cells: [{ x0: 0, x1: 120, text: "A" }, { x0: 330, x1: 400, text: "7" }, { x0: 410, x1: 590, text: "1" }] },
    ]);
    expect(g).toEqual([["Chi nhánh", "Dư nợ", "Tăng/giảm"], ["A", "7", "1"], ["Hội Sở", "12.345", "(98.855)"]]);
  });

  it("giữ ô trống và ô gộp", () => {
    const g = rowsToGrid([
      { y: 0, cells: [{ x0: 0, x1: 100, text: "Tên" }, { x0: 100, x1: 300, text: "DƯ NỢ" }] },
      { y: 1, cells: [{ x0: 100, x1: 200, text: "Đầu kỳ" }, { x0: 200, x1: 300, text: "Cuối kỳ" }] },
      { y: 2, cells: [{ x0: 0, x1: 100, text: "B" }, { x0: 200, x1: 300, text: "5" }] },
    ]);
    expect(g).toEqual([["Tên", "DƯ NỢ", ""], ["", "Đầu kỳ", "Cuối kỳ"], ["B", "", "5"]]);
  });

  it("chuẩn hoá số âm tách rời", () => {
    expect(fixNegative("-   1.156")).toBe("-1.156");
    expect(fixNegative("− 2.000")).toBe("-2.000");
    expect(fixNegative("–(5)")).toBe("-(5)");
    expect(fixNegative("-")).toBe("-");
    const g = rowsToGrid([
      { y: 0, cells: [{ x0: 0, x1: 100, text: "-" }, { x0: 100, x1: 200, text: "-   1.156" }] },
      { y: 1, cells: [{ x0: 0, x1: 100, text: "3" }, { x0: 100, x1: 200, text: "4" }] },
    ]);
    expect(g[0]).toEqual(["-", "-1.156"]);
  });

  it("gộp hàng thừa do tên xuống dòng", () => {
    expect(mergeWrapped([
      ["Họ tên", "Đầu năm", "Cuối kỳ"],
      ["Nguyễn Thị Ngọc", "1.200", ""],
      ["Ánh", "", "-"],
      ["Hà Thanh Cao", "", "300"],
      ["-", "", ""],
      ["Trần Văn B", "5", "6"],
    ])).toEqual([
      ["Họ tên", "Đầu năm", "Cuối kỳ"],
      ["Nguyễn Thị Ngọc Ánh", "1.200", "-"],
      ["Hà Thanh Cao", "", "300"],
      ["Trần Văn B", "5", "6"],
    ]);
  });

  it("không gộp tiêu đề nhóm dài hoặc hàng dưới tiêu đề", () => {
    const g = [["Tên", "Số"], ["Phòng", ""], ["A", "1"], ["II. Khối khách hàng cá nhân", ""]];
    expect(mergeWrapped(g)).toEqual(g);
  });
});

import { mergeWrapped as mw2 } from "./columns";
describe("mergeWrapped – hàng toàn '-' (PDF 30.09)", () => {
  it("không gộp 'Vay online' vào hàng trên", () => {
    const g = mw2([["Đỗ Ngọc Linh", "135.512", "2.000"], ["Vay online", "-", "-"], ["Hội Sở", "1.056.076", "16.000"]]);
    expect(g.length).toBe(3);
    expect(g[1]).toEqual(["Vay online", "-", "-"]);
  });
});


import { fillDashRows } from "./columns";
describe("fillDashRows – điền '-' bị AI đọc sót (PDF 30.09, hàng Vay online)", () => {
  it("điền '-' vào ô trống của hàng toàn '-' khi đa số hàng '-' khác có", () => {
    const g = fillDashRows([
      ["A", "-", "-", "-", "-"],
      ["B", "-", "-", "-", "-"],
      ["Vay online", "-", "-", "", "-"],
      ["C", "1", "2", "3", "4"],
    ]);
    expect(g[2]).toEqual(["Vay online", "-", "-", "-", "-"]);
    expect(g[3]).toEqual(["C", "1", "2", "3", "4"]);
  });
  it("không điền khi chỉ có ít hàng '-' hoặc đa số không có '-'", () => {
    const g1 = fillDashRows([["A", "-", ""], ["B", "-", "-"], ["C", "1", "2"]]);
    expect(g1[0][2]).toBe("");
    const g2 = fillDashRows([
      ["A", "-", "-", ""],
      ["B", "-", "", "-"],
      ["C", "-", "", ""],
    ]);
    expect(g2[0][3]).toBe("");
  });
  it("không đụng hàng có số", () => {
    const g = fillDashRows([
      ["A", "-", "-", "-"],
      ["B", "-", "-", "-"],
      ["C", "-", "-", "-"],
      ["D", "5", "", "-"],
    ]);
    expect(g[3][2]).toBe("");
  });
});

describe("mergeWrapped – mảnh tên lặp đặt lệch chỗ (PDF 30.09 trang 3, 4)", () => {
  it("bỏ hàng 'Ánh' + '-' khi tên đầy đủ đã có, giữ tên ngắn thật", () => {
    const g = [
      ["Nguyễn Thị Ngọc Ánh", "3.485", "4.326"],
      ["Đỗ Thị Hà", "14.192", "13.542"],
      ["Anh", "-", "-"],
      ["PGD Hai Bà Trưng", "61.153", "67.425"],
      ["Tổng", "-", "-"],
    ];
    const out = mergeWrapped(g);
    expect(out.map((r) => r[0])).toEqual(["Nguyễn Thị Ngọc Ánh", "Đỗ Thị Hà", "PGD Hai Bà Trưng", "Tổng"]);
    expect(out[1]).toEqual(["Đỗ Thị Hà", "14.192", "13.542"]);
  });
});
