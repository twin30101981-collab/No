import { describe, expect, it } from "vitest";
import { blobFor, fpOf, inlineDoc, packDoc, revokeDoc, unpackDoc } from "@/lib/disk-pack";
import type { Doc } from "@/lib/db";

const data = "data:image/jpeg;base64," + btoa("xin chao anh trang");
const doc = (src: string, orig = src): Doc => ({ id: "d", name: "n", createdAt: 0, updatedAt: 0, pages: [{ id: "p", orig, src, edit: {} as never }] } as unknown as Doc);

describe("S15f3b object URL", () => {
  it("unpack trả blob: URL, giữ dấu vân tay và pack lại được nhị phân", async () => {
    const disk = packDoc(doc(data));
    const mem = await unpackDoc(disk);
    const u = mem.pages[0].orig;
    expect(u.startsWith("blob:")).toBe(true);
    expect(mem.pages[0].src).toBe(u);
    expect(fpOf(u)).toBe(fpOf(data));
    expect(blobFor(u)?.size).toBe("xin chao anh trang".length);
    const again = packDoc(mem) as unknown as { pages: { origB?: Blob; src: string }[] };
    expect(again.pages[0].origB).toBeInstanceOf(Blob);
    expect(again.pages[0].src).toBe("=");
  });
  it("inlineDoc đổi về data URL cho niêm phong; revokeDoc thu hồi", async () => {
    const mem = await unpackDoc(packDoc(doc(data)));
    const inl = await inlineDoc(mem);
    expect(inl.pages[0].orig).toBe(data);
    revokeDoc(mem);
    expect(blobFor(mem.pages[0].orig)).toBeUndefined();
  });
});
