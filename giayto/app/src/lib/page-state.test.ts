import { describe, expect, it } from "vitest";
import type { Doc, Page } from "./db";
import { PAGE_STATUSES, canTransition, isPending, normalizeDoc, pageStatus, withStatus, type PageStatus } from "./page-state";
import { newPage } from "./db";

const pg = (extra: Partial<Page> = {}): Page => ({ id: "p", orig: "o", src: "s", edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0 }, ...extra });
const doc = (pages: Page[]): Doc => ({ id: "d", name: "n", folder: "Chung", kind: "Tài liệu", createdAt: 1, updatedAt: 1, pages });

describe("CS-01 vòng đời trạng thái trang", () => {
  const ok: [PageStatus, PageStatus][] = [["moi", "cho"], ["cho", "dang"], ["dang", "xong"], ["dang", "xem-lai"], ["dang", "loi"], ["dang", "cho"], ["xong", "dang"], ["xem-lai", "dang"], ["xem-lai", "xong"], ["loi", "cho"], ["xong", "xong"]];
  const no: [PageStatus, PageStatus][] = [["moi", "xong"], ["cho", "xong"], ["xong", "cho"], ["xong", "loi"], ["loi", "xong"], ["loi", "dang"], ["xem-lai", "loi"], ["moi", "dang"]];
  it("cho phép đúng các chuyển hợp lệ", () => ok.forEach(([a, b]) => expect(canTransition(a, b), `${a}→${b}`).toBe(true)));
  it("chặn các chuyển vô nghĩa", () => no.forEach(([a, b]) => expect(canTransition(a, b), `${a}→${b}`).toBe(false)));
  it("có đủ 6 trạng thái", () => expect([...PAGE_STATUSES].sort()).toEqual(["cho", "dang", "loi", "moi", "xem-lai", "xong"]));
});

describe("CS-01 trạng thái hiệu lực + dữ liệu cũ", () => {
  it("trang cũ không có status, hoặc status lạ → xong", () => {
    expect(pageStatus(pg())).toBe("xong");
    expect(pageStatus(pg({ status: "bậy" as never }))).toBe("xong");
    expect(pageStatus(pg({ status: "cho" }))).toBe("cho");
  });
  it("isPending chỉ đúng với moi/cho/dang", () => {
    expect((["moi", "cho", "dang"] as const).every((s) => isPending(pg({ status: s })))).toBe(true);
    expect((["xong", "xem-lai", "loi"] as const).some((s) => isPending(pg({ status: s })))).toBe(false);
    expect(isPending(pg())).toBe(false);
  });
  it("normalizeDoc điền 'xong' cho trang cũ, giữ nguyên trang đã có; không đụng dữ liệu khác", () => {
    const d = doc([pg({ id: "a", text: "Chữ có dấu" }), pg({ id: "b", status: "xem-lai", warnings: ["mờ"] })]);
    const n = normalizeDoc(d);
    expect(n.pages.map((p) => p.status)).toEqual(["xong", "xem-lai"]);
    expect(n.pages[0]!.text).toBe("Chữ có dấu"); expect(n.pages[1]!.warnings).toEqual(["mờ"]);
    expect(d.pages[0]!.status).toBeUndefined(); // bất biến
  });
  it("normalizeDoc trả đúng đối tượng cũ khi không cần đổi; chịu tài liệu không trang / khoá PIN", () => {
    const d = doc([pg({ status: "xong" })]); expect(normalizeDoc(d)).toBe(d);
    const empty = doc([]); expect(normalizeDoc(empty)).toBe(empty);
  });
  it("trang mới tạo bằng newPage có status", () => expect(newPage("o").status).toBe("xong"));
});

describe("CS-01 withStatus", () => {
  it("đổi hợp lệ, xoá tiến độ/lỗi khi rời trạng thái đó", () => {
    const a = withStatus(pg({ status: "cho" }), "dang", { progress: 40 }); expect(a).toMatchObject({ status: "dang", progress: 40 });
    const b = withStatus(a, "loi", { error: "hết bộ nhớ" }); expect(b.progress).toBeUndefined(); expect(b.error).toBe("hết bộ nhớ");
    const c = withStatus(b, "cho"); expect(c.error).toBeUndefined(); expect(c.status).toBe("cho");
  });
  it("chuyển không hợp lệ ném lỗi nêu rõ cặp trạng thái", () => {
    expect(() => withStatus(pg({ status: "moi" }), "xong")).toThrow(/moi → xong/);
    expect(() => withStatus(pg(), "cho")).toThrow(/xong → cho/); // trang cũ = xong
  });
});
