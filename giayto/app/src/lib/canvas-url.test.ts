import { afterEach, describe, expect, it, vi } from "vitest";
import { canvasToBlob, canvasToPageUrl, canvasToTempUrl, revokeTemp } from "./canvas-url";
import { blobFor } from "./disk-pack";

const fakeCanvas = (blob: Blob | null) => ({ width: 800, toBlob: (cb: (b: Blob | null) => void) => cb(blob) }) as unknown as HTMLCanvasElement;
afterEach(() => vi.unstubAllGlobals());

describe("R1.3 canvas → Blob thay data URL", () => {
  it("báo lỗi rõ khi canvas quá lớn không mã hoá được", async () => {
    await expect(canvasToBlob(fakeCanvas(null))).rejects.toThrow("Ảnh quá lớn");
  });
  it("URL tạm là blob: và canvas được giải phóng (width = 0)", async () => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:tam-1", revokeObjectURL: vi.fn() });
    const c = fakeCanvas(new Blob(["x"], { type: "image/png" }));
    expect(await canvasToTempUrl(c)).toBe("blob:tam-1");
    expect(c.width).toBe(0);
  });
  it("URL trang được đăng ký với kho để lưu lại được nhị phân", async () => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:trang-1", revokeObjectURL: vi.fn() });
    const b = new Blob(["abc"], { type: "image/jpeg" });
    const u = await canvasToPageUrl(fakeCanvas(b));
    expect(u).toBe("blob:trang-1");
    expect(blobFor(u)?.size).toBe(3);
  });
  it("revokeTemp chỉ thu hồi blob:, bỏ qua data: và rỗng", () => {
    const revoke = vi.fn(); vi.stubGlobal("URL", { revokeObjectURL: revoke });
    revokeTemp("data:image/png;base64,AA"); revokeTemp(null); revokeTemp("blob:x");
    expect(revoke).toHaveBeenCalledTimes(1); expect(revoke).toHaveBeenCalledWith("blob:x");
  });
});
