import { describe, expect, it } from "vitest";
import { buildContext, chunkDocument, chunkPageText, citedPages, queryTerms, selectChunks } from "./doc-qa";

describe("chunkPageText", () => {
  it("tách theo dòng trống và gom khoảng trắng", () => {
    expect(chunkPageText("Đoạn một.\n\n\nĐoạn   hai.\nĐoạn ba.")).toEqual(["Đoạn một.", "Đoạn hai. Đoạn ba."]);
  });

  it("cắt đoạn quá dài theo dấu câu, không mất phần đuôi", () => {
    const long = Array.from({ length: 40 }, (_, i) => `Câu số ${i} có nội dung dài.`).join(" ");
    const parts = chunkPageText(long, 200);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 200)).toBe(true);
    expect(parts.join(" ")).toContain("Câu số 39");
  });
});

describe("chunkDocument", () => {
  it("gắn số trang và bỏ trang chưa có chữ", () => {
    const chunks = chunkDocument([{ text: "Trang một." }, {}, { text: "Trang ba." }]);
    expect(chunks.map((c) => c.page)).toEqual([1, 3]);
  });
});

describe("queryTerms", () => {
  it("bỏ từ nối và dấu câu", () => {
    expect(queryTerms("Tổng tiền là bao nhiêu?")).toEqual(["tổng", "tiền"]);
  });
});

describe("selectChunks", () => {
  const pages = [
    { text: "Hợp đồng thuê nhà ký ngày 01/02/2026." },
    { text: "Tổng tiền thuê là 5.000.000 đồng mỗi tháng." },
    { text: "Điều khoản thanh toán và bảo trì chung cư." },
  ];

  it("chọn đoạn khớp từ khoá, giữ thứ tự trang", () => {
    const picked = selectChunks(chunkDocument(pages), "Tổng tiền thuê bao nhiêu?");
    expect(picked.map((c) => c.page)).toEqual([1, 2]);
  });

  it("không khớp từ khoá thì lấy đoạn đầu tài liệu", () => {
    const picked = selectChunks(chunkDocument(pages), "xyz qqq");
    expect(picked[0]!.page).toBe(1);
  });

  it("tôn trọng ngân sách ký tự", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ text: `tiền ${"x".repeat(400)} trang ${i + 1}` }));
    const picked = selectChunks(chunkDocument(many), "tiền", 1_000);
    expect(picked.length).toBeLessThan(10);
    expect(picked.reduce((n, c) => n + c.text.length, 0)).toBeLessThanOrEqual(1_000);
  });
});

describe("buildContext / citedPages", () => {
  it("ngữ cảnh có đánh số trang", () => {
    expect(buildContext([{ page: 2, index: 0, text: "Nội dung." }])).toBe("[Trang 2] Nội dung.");
  });

  it("trích số trang được trích dẫn", () => {
    expect(citedPages("Theo [Trang 2, 4] và Trang 1 thì…")).toEqual([1, 2, 4]);
    expect(citedPages("Không có trích dẫn.")).toEqual([]);
  });
});
