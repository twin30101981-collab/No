import { beforeEach, describe, expect, it, vi } from "vitest";

// Nguyên nhân gốc (bẫy khi kiểm P19): nhập ảnh trùng dùng window.confirm — bị tự đóng = "từ chối" ở
// Playwright/PWA — rồi báo nhầm "Không có ảnh hoặc PDF hợp lệ". Nay dùng hộp thoại app + báo đúng.
const confirmDialog = vi.fn();
vi.mock("./dialog", () => ({ confirmDialog: (...a: unknown[]) => confirmDialog(...a) }));
vi.mock("./db", () => ({
  getDocs: () => [], loadDocs: async () => {}, saveDoc: async (d: unknown) => d,
  newDoc: (pages: unknown) => ({ id: "d", pages }),
  newPage: (src: string) => ({ src, edit: {} }),
}));
vi.mock("./image", () => ({ normalize: async (b: unknown) => String(b) }));
vi.mock("./image-input", () => ({ FILE_ACCEPT: "", IMAGE_ACCEPT: "", imageBlob: async (f: File) => f.name, isImageFile: () => true }));
vi.mock("./files", () => ({ pdfToImages: async () => [] }));
vi.mock("./dedupe-phash", () => ({
  fingerprintImageSource: async () => ({ phash: "0000000000000000", kind: "flat" }),
  findDuplicate: (_h: string, ex: string[]) => (ex.includes("0000000000000000") ? 0 : -1),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => () => {} }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), loading: vi.fn(), success: vi.fn() } }));

import { filesToPages } from "./importer";

const f = (n: string) => new File(["x"], n, { type: "image/jpeg" });

describe("filesToPages — ảnh trùng", () => {
  beforeEach(() => { confirmDialog.mockReset(); vi.spyOn(window, "confirm"); });

  it("hai ảnh cùng dấu vân: hỏi bằng hộp thoại app, từ chối → bỏ ảnh thứ hai và đếm skipped", async () => {
    confirmDialog.mockResolvedValue(false);
    const stats = { skipped: 0 };
    const pages = await filesToPages([f("a.jpg"), f("b.jpg")], stats);
    expect(pages).toHaveLength(1);
    expect(stats.skipped).toBe(1);
    expect(confirmDialog).toHaveBeenCalledTimes(1);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("đồng ý → thêm cả hai, skipped = 0", async () => {
    confirmDialog.mockResolvedValue(true);
    const stats = { skipped: 0 };
    expect(await filesToPages([f("a.jpg"), f("b.jpg")], stats)).toHaveLength(2);
    expect(stats.skipped).toBe(0);
  });
});
