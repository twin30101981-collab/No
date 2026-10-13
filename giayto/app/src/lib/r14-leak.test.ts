import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { adoptBlob, blobFor, revokeDoc } from "./disk-pack";
import { canvasToPageUrl, canvasToTempUrl, revokeTemp } from "./canvas-url";

/** R1.4: bỏ data URL đợt 2 (7 tệp lib) + kiểm rò rỉ bitmap/object URL. */

const src = (name: string) => readFileSync(join(__dirname, name), "utf8");

describe("R1.4 – 7 tệp lib không còn mã hoá trang thành data URL", () => {
  it.each(["moire.ts", "redact.ts", "sr-enhance.ts", "translate-overlay.ts", "id-watermark.ts"])(
    "%s không còn toDataURL",
    (f) => {
      expect(src(f)).not.toContain("toDataURL");
    },
  );
  it("signatures.ts chỉ còn toDataURL cho chữ ký nhỏ lưu localStorage (trimCanvas)", () => {
    const hits = src("signatures.ts").match(/toDataURL/g) ?? [];
    expect(hits.length).toBe(1);
  });
  it("files.ts chỉ còn toDataURL ở đường nén PDF (jsPDF cần data URL)", () => {
    const code = src("files.ts");
    expect(code.match(/toDataURL/g)?.length ?? 0).toBeLessThanOrEqual(2);
    expect(code).not.toMatch(/pdfToImages[\s\S]*?toDataURL/);
  });
});

const fakeCanvas = (blob: Blob | null) => ({ width: 800, height: 600, toBlob: (cb: (b: Blob | null) => void) => cb(blob) }) as unknown as HTMLCanvasElement;
afterEach(() => vi.unstubAllGlobals());

describe("R1.4 – kiểm rò rỉ bitmap/object URL", () => {
  it("canvasToPageUrl giải phóng canvas (width = 0) và đăng ký Blob để lưu/thu hồi", async () => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:trang-r14", revokeObjectURL: vi.fn() });
    const c = fakeCanvas(new Blob(["anh-trang"], { type: "image/jpeg" }));
    const u = await canvasToPageUrl(c);
    expect(u).toBe("blob:trang-r14");
    expect(c.width).toBe(0);
    expect(blobFor(u)?.size).toBe("anh-trang".length);
  });

  it("revokeDoc thu hồi object URL của trang và xoá khỏi sổ đăng ký", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:trang-xoa", revokeObjectURL: revoke });
    const u = adoptBlob(new Blob(["abc"], { type: "image/jpeg" }));
    expect(blobFor(u)).toBeTruthy();
    revokeDoc({ pages: [{ id: "p", orig: u, src: u }] } as never);
    expect(revoke).toHaveBeenCalledWith(u);
    expect(blobFor(u)).toBeUndefined();
  });

  it("revokeDoc giữ lại URL còn được tài liệu khác dùng (tham số keep)", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:trang-giu", revokeObjectURL: revoke });
    const u = adoptBlob(new Blob(["abc"], { type: "image/jpeg" }));
    revokeDoc({ pages: [{ id: "p", orig: u, src: u }] } as never, new Set([u]));
    expect(revoke).not.toHaveBeenCalled();
    expect(blobFor(u)).toBeTruthy();
  });

  it("URL tạm xem trước thu hồi được bằng revokeTemp, canvas giải phóng ngay", async () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:tam-r14", revokeObjectURL: revoke });
    const c = fakeCanvas(new Blob(["x"], { type: "image/png" }));
    const u = await canvasToTempUrl(c);
    expect(c.width).toBe(0);
    revokeTemp(u);
    expect(revoke).toHaveBeenCalledWith("blob:tam-r14");
  });
});
