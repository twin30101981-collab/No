import { describe, expect, it } from "vitest";
import { docToMarkdown, docToTxt, fitBox, slidesToPptx } from "./pptx";

describe("pptx/md/txt export", () => {
  it("fits portrait page centered in 16:9", () => {
    const b = fitBox(1000, 1414);
    expect(b.cy).toBe(6858000); expect(b.x).toBeGreaterThan(0); expect(b.x * 2 + b.cx).toBeCloseTo(12192000, -1);
  });
  it("builds a pptx zip with one slide per page", async () => {
    const blob = slidesToPptx([{ jpeg: new Uint8Array([1, 2]), w: 10, h: 10, text: "a & <b>" }, { jpeg: new Uint8Array([3]), w: 20, h: 10 }], "Thử");
    const s = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsText(blob); });
    expect(s).toContain("ppt/slides/slide2.xml"); expect(s).toContain("a &amp; &lt;b&gt;"); expect(blob.type).toContain("presentationml");
  });
  it("markdown escapes list markers and marks empty pages", () => {
    const md = docToMarkdown("Đơn", [{ text: "# không phải tiêu đề\n- gạch" }, {}]);
    expect(md).toContain("\\# không"); expect(md).toContain("\\- gạch"); expect(md).toContain("## Trang 2\n\n_(chưa nhận chữ)_");
  });
  it("txt has BOM, CRLF and page separators", () => {
    const t = docToTxt([{ text: "a\nb" }, { text: "c" }]);
    expect(t.startsWith("\ufeff--- Trang 1 ---\r\na\r\nb")).toBe(true); expect(t).toContain("--- Trang 2 ---");
  });
});
