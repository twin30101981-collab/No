import { describe, expect, it } from "vitest";
import { ADD_SOURCE_LABEL, ADD_SOURCES, afterIndex, docShortcut, filesFromDrop, insertPagesAt, INSERT_POS_LABEL } from "./add-sources";

describe("R4.3 bảng Thêm", () => {
  it("đủ 5 nguồn nhập, mỗi nguồn có nhãn", () => {
    expect(ADD_SOURCES).toEqual(["library", "camera", "pdf", "paste", "scan"]);
    for (const s of ADD_SOURCES) expect(ADD_SOURCE_LABEL[s]).toBeTruthy();
    expect(Object.keys(INSERT_POS_LABEL)).toEqual(["start", "after", "end"]);
  });

  it("vị trí chèn: đầu / sau trang đang xem / cuối", () => {
    expect(afterIndex("start", 3, 10)).toBe(-1);
    expect(afterIndex("after", 3, 10)).toBe(3);
    expect(afterIndex("end", 3, 10)).toBe(9);
  });

  it("chèn theo vị trí giữ đúng thứ tự", () => {
    const pages = ["a", "b", "c"];
    expect(insertPagesAt(pages, ["x"], "start", 0).pages).toEqual(["x", "a", "b", "c"]);
    expect(insertPagesAt(pages, ["x"], "after", 1).pages).toEqual(["a", "b", "x", "c"]);
    expect(insertPagesAt(pages, ["x"], "end", 0).pages).toEqual(["a", "b", "c", "x"]);
    expect(insertPagesAt(pages, ["x"], "end", 0).active).toBe(3);
  });

  it("kéo-thả cửa sổ: lọc ảnh và PDF, bỏ tệp khác", () => {
    const img = new File([new Uint8Array(4)], "a.jpg", { type: "image/jpeg" });
    const pdf = new File([new Uint8Array(4)], "b.pdf", { type: "application/pdf" });
    const txt = new File([new Uint8Array(4)], "c.txt", { type: "text/plain" });
    const heic = new File([new Uint8Array(4)], "d.HEIC", { type: "" });
    const got = filesFromDrop({ files: [img, pdf, txt, heic] as unknown as FileList });
    expect(got.map((f) => f.name)).toEqual(["a.jpg", "b.pdf", "d.HEIC"]);
    expect(filesFromDrop(null)).toEqual([]);
  });

  it("phím tắt PC: Delete/←/→/R", () => {
    expect(docShortcut("Delete")).toBe("delete");
    expect(docShortcut("Backspace")).toBe("delete");
    expect(docShortcut("ArrowLeft")).toBe("prev");
    expect(docShortcut("ArrowRight")).toBe("next");
    expect(docShortcut("r")).toBe("rotate");
    expect(docShortcut("R")).toBe("rotate");
    expect(docShortcut("a")).toBeNull();
    expect(docShortcut("Enter")).toBeNull();
  });
});
