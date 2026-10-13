import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "./db";

// sổ đăng ký blob: giả (jsdom không có URL.createObjectURL)
const reg = new Map<string, Blob>();
vi.mock("./disk-pack", () => ({ blobFor: (u: string) => reg.get(u) }));
import { BackupError, BACKUP_VERSION, buildBackup, mergeLibrary, parseBackup, planMerge, toPortableDoc } from "./backup";

const jpeg = (n: number) => new Blob([new Uint8Array([0xff, 0xd8, 0xff, n, n + 1, n + 2])], { type: "image/jpeg" });
const blobUrl = (id: string, b: Blob) => { const u = `blob:http://localhost/${id}`; reg.set(u, b); return u; };
const doc = (id: string, name: string, pages: Doc["pages"], extra: Partial<Doc> = {}): Doc => ({ id, name, folder: "Chung", kind: "Tài liệu", createdAt: 1, updatedAt: 1, pages, ...extra });
const page = (id: string, orig: string, src = orig) => ({ id, orig, src, edit: { rotation: 0, filter: "original" as const, brightness: 0, contrast: 0 } });
const text = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });
const dataOf = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(b); });

beforeEach(() => reg.clear());

describe("BL-01 toPortableDoc", () => {
  it("đổi blob: về dữ liệu thật, giữ nguyên byte", async () => {
    const a = jpeg(1), b = jpeg(9);
    const d = doc("d", "Có dấu", [page("p1", blobUrl("a", a), blobUrl("b", b))]);
    const out = await toPortableDoc(d);
    expect(out.pages[0]!.orig).toBe(await dataOf(a));
    expect(out.pages[0]!.src).toBe(await dataOf(b));
    expect(JSON.stringify(out)).not.toContain("blob:");
  });
  it("ảnh không đọc được → ném BackupError nêu đúng tài liệu/trang (không ghi tệp thiếu ảnh)", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("net")));
    const d = doc("d", "Hợp đồng", [page("p1", "blob:http://localhost/chet")]);
    await expect(toPortableDoc(d)).rejects.toThrow(/Hợp đồng.*trang 1/);
    await expect(toPortableDoc(d)).rejects.toBeInstanceOf(BackupError);
    vi.unstubAllGlobals();
  });
  it("tài liệu khoá PIN (enc) và tài liệu không trang đi nguyên vẹn", async () => {
    const enc = doc("e", "Khoá", [], { locked: true, enc: { v: 1, iv: "x", ct: "y" } as never });
    expect(await toPortableDoc(enc)).toBe(enc);
  });
});

describe("BL-01 sao lưu → đọc lại", () => {
  const mk = () => [
    doc("a", "Hợp đồng thuê nhà", [page("p1", blobUrl("1", jpeg(1))), page("p2", blobUrl("2", jpeg(2)), blobUrl("3", jpeg(3)))]),
    doc("b", "Hoá đơn điện", [page("p3", blobUrl("4", jpeg(4)))]),
  ];
  it("khứ hồi: ảnh trùng byte, src chưa chỉnh được bung lại, có tổng kiểm cho từng tài liệu", async () => {
    const src = mk();
    const file = await buildBackup({ docs: src }); const t = await text(file);
    expect(t).not.toContain("blob:");
    const head = JSON.parse(t) as { version: number; index: { id: string }[] };
    expect(head.version).toBe(BACKUP_VERSION); expect(head.index.map((i) => i.id)).toEqual(["a", "b"]);
    const r = await parseBackup(t);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.skipped).toEqual([]); expect(r.legacy).toBe(false);
    expect(r.docs.map((d) => d.name)).toEqual(["Hợp đồng thuê nhà", "Hoá đơn điện"]);
    const p1 = r.docs[0]!.pages[0]!; expect(p1.src).toBe(p1.orig); // "=" đã bung
    expect(r.docs[0]!.pages[1]!.orig).toBe(await dataOf(jpeg(2)));
    expect(r.docs[0]!.pages[1]!.src).toBe(await dataOf(jpeg(3)));
  });
  it("sửa nội dung một tài liệu → sai tổng kiểm, chỉ tài liệu đó bị loại", async () => {
    const t = (await text(await buildBackup({ docs: mk() }))).replace("Hoá đơn điện", "Hoá đơn ĐIỆN");
    const r = await parseBackup(t); expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.docs.map((d) => d.id)).toEqual(["a"]);
    expect(r.skipped).toEqual([{ name: "Hoá đơn ĐIỆN", why: expect.stringContaining("tổng kiểm") }]);
  });
  it("tệp sao lưu cũ chỉ có blob: bị từ chối (không thay dữ liệu bằng địa chỉ chết)", async () => {
    const old = JSON.stringify({ app: "ghi-nhanh", version: 3, docs: [{ id: "x", name: "Cũ", pages: [{ id: "p", orig: "blob:http://x/1", src: "blob:http://x/1", edit: {} }] }] });
    const r = await parseBackup(old); expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/địa chỉ ảnh tạm/);
  });
  it("tệp cũ (v3) có ảnh thật vẫn khôi phục được và được đánh dấu legacy", async () => {
    const old = JSON.stringify({ app: "ghi-nhanh", version: 3, docs: [{ id: "x", name: "Cũ", pages: [{ id: "p", orig: "data:image/jpeg;base64,/9j/", src: "data:image/jpeg;base64,/9j/", edit: {} }] }] });
    const r = await parseBackup(old); expect(r.ok && r.legacy && r.docs.length === 1).toBe(true);
  });
  it("từ chối tệp rác, tệp của app khác, và tệp từ bản mới hơn", async () => {
    for (const bad of ["không phải json {", JSON.stringify({ hello: 1 }), JSON.stringify({ app: "ghi-nhanh", docs: "x" }), JSON.stringify({ app: "ghi-nhanh", version: BACKUP_VERSION + 1, docs: [] })]) {
      const r = await parseBackup(bad); expect(r.ok, bad).toBe(false);
    }
  });
  it("tài liệu thiếu id/trang hỏng bị loại, phần còn lại vẫn khôi phục", async () => {
    const good = doc("g", "Tốt", [page("p", "data:image/jpeg;base64,/9j/")]);
    const r = await parseBackup(JSON.stringify({ app: "ghi-nhanh", version: 4, docs: [good, { name: "Thiếu id", pages: [] }, { id: "h", name: "Trang hỏng", pages: [{ id: 1 }] }] }));
    expect(r.ok && r.docs.length === 1 && r.skipped.length === 2).toBe(true);
  });
  it("sao lưu rỗng (0 tài liệu) vẫn hợp lệ", async () => {
    const r = await parseBackup(await text(await buildBackup({ docs: [] }))); expect(r.ok && r.docs.length === 0).toBe(true);
  });
});

describe("BL-01 gộp", () => {
  const D = (id: string, updatedAt: number, extra: Partial<Doc> = {}) => doc(id, id, [], { updatedAt, ...extra });
  it("thêm mới, giữ bản mới hơn, không bỏ tài liệu nào của máy", () => {
    const p = planMerge([D("a", 10), D("c", 5)], [D("a", 20), D("b", 1), D("c", 1)], { sameVault: true });
    expect(p.toSave.map((d) => d.id).sort()).toEqual(["a", "b"]);
    expect(p).toMatchObject({ added: 1, updated: 1, kept: 1, skippedLocked: 0 });
  });
  it("bản trong tệp cũ hơn thì không đè", () => {
    expect(planMerge([D("a", 10)], [D("a", 3)], { sameVault: true }).toSave).toEqual([]);
  });
  it("tài liệu khoá PIN khác khoá của máy bị bỏ qua và đếm", () => {
    const enc = D("e", 1, { enc: { v: 1 } as never });
    expect(planMerge([], [enc], { sameVault: false })).toMatchObject({ added: 0, skippedLocked: 1 });
    expect(planMerge([], [enc], { sameVault: true }).added).toBe(1);
  });
  it("gộp thư viện: hợp thư mục/thẻ/bộ lọc nhanh, không mất bên nào", () => {
    const a = { folders: ["Chung", "A"], tags: [{ name: "x", color: 1 }], quick: [{ id: "q1", name: "n", filter: {} as never }] };
    const b = { folders: ["Chung", "B"], tags: [{ name: "X", color: 2 }, { name: "y", color: 3 }], quick: [{ id: "q1", name: "dup", filter: {} as never }, { id: "q2", name: "m", filter: {} as never }] };
    const m = mergeLibrary(a, b);
    expect(m.folders.sort()).toEqual(["A", "B", "Chung"]); expect(m.tags.map((t) => t.name)).toEqual(["x", "y"]); expect(m.quick.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(mergeLibrary(a, undefined)).toBe(a);
  });
});
