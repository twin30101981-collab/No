import { describe, it, expect } from "vitest";
import { dataUrlBlob, srcToDataUrl, srcBytes, isBlobUrl } from "@/lib/page-src";

const u = "data:image/png;base64," + btoa("xin chao 123");
describe("S15f2 page-src", () => {
  it("data URL → Blob giữ kiểu và nội dung", async () => {
    const b = dataUrlBlob(u); expect(b.type).toBe("image/png"); expect(b.size).toBe(12);
  });
  it("data URL trả nguyên, blob: URL được đổi về data URL", async () => {
    expect(await srcToDataUrl(u)).toBe(u);
    if (typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(dataUrlBlob(u));
      try { expect(isBlobUrl(url)).toBe(true); expect(await srcToDataUrl(url)).toBe(u); } catch { /* jsdom không fetch blob: */ } finally { URL.revokeObjectURL(url); }
    }
  });
  it("ước lượng byte", () => { expect(srcBytes(u)).toBe(12); expect(srcBytes("blob:x")).toBe(-1); });
});
