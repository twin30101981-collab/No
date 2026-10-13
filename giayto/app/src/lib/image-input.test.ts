import { describe, it, expect, vi, beforeEach } from "vitest";
import { IMAGE_ACCEPT, isImageFile, isHeicFile, imageBlob, clipboardImages, isEditingText, readClipboardImages } from "./image-input";
const convert = vi.hoisted(() => vi.fn());
vi.mock("heic-to/csp", () => ({ heicTo: convert }));
function header(major: string, compatible: string[] = []) {
  const bytes = new Uint8Array(16 + compatible.length * 4);
  new DataView(bytes.buffer).setUint32(0, bytes.length);
  bytes.set(Array.from("ftyp" + major, (c) => c.charCodeAt(0)), 4);
  compatible.forEach((brand, i) => bytes.set(Array.from(brand, (c) => c.charCodeAt(0)), 16 + i * 4));
  return new File([bytes], "unknown.bin");
}
beforeEach(() => { convert.mockReset(); Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }); });
describe("HEIC intake", () => {
  it("explicitly advertises HEIC and HEIF", () => expect(IMAGE_ACCEPT).toContain(".heic,.heif"));
  it("accepts missing MIME and uppercase names", () => expect(isImageFile(new File(["x"], "PHOTO.HEIF"))).toBe(true));
  it("rejects text files", () => expect(isImageFile(new File(["x"], "note.txt"))).toBe(false));
  it("detects extension", async () => expect(await isHeicFile(new File(["x"], "PHOTO.HEIC"))).toBe(true));
  it("detects MIME", async () => expect(await isHeicFile(new Blob(["x"], { type: "image/heif-sequence" }))).toBe(true));
  it("detects HEIC signature with absent MIME", async () => expect(await isHeicFile(header("heic"))).toBe(true));
  it("detects compatible brands", async () => expect(await isHeicFile(header("xxxx", ["heix"]))).toBe(true));
  it("does not treat AVIF as HEIC", async () => expect(await isHeicFile(header("mif1", ["avif"]))).toBe(false));
  it("does not treat JPEG as HEIC", async () => expect(await isHeicFile(new Blob(["jpeg"]))).toBe(false));
  it("passes ordinary images through without loading converter", async () => {
    const file = new File(["png"], "p.png", { type: "image/png" });
    expect(await imageBlob(file)).toBe(file); expect(convert).not.toHaveBeenCalled();
  });
  it("converts HEIC into JPEG", async () => {
    const jpeg = new Blob(["jpeg"], { type: "image/jpeg" }); convert.mockResolvedValue(jpeg);
    const file = new File(["x"], "p.heic"); expect(await imageBlob(file)).toBe(jpeg);
    expect(convert).toHaveBeenCalledWith({ blob: file, type: "image/jpeg", quality: 0.95 });
  });
  it("reports corrupt HEIC then permits a fresh import", async () => {
    convert.mockRejectedValueOnce(new Error("invalid")).mockResolvedValueOnce(new Blob(["jpeg"]));
    await expect(imageBlob(new File(["x"], "broken.heic"))).rejects.toThrow("Không chuyển được ảnh HEIC");
    expect((await imageBlob(new File(["x"], "good.heic"))).size).toBe(4);
  });
  it("rejects empty conversion", async () => {
    convert.mockResolvedValue(new Blob()); await expect(imageBlob(new File(["x"], "p.heic"))).rejects.toThrow("Không chuyển được");
  });
});
describe("clipboard intake", () => {
  it("ignores empty clipboard", () => expect(clipboardImages(null)).toEqual([]));
  it("does not add duplicate file/items representations", () => {
    const file = new File(["x"], "p.png", { type: "image/png" });
    expect(clipboardImages({ files: [file], items: [{ kind: "file", getAsFile: () => file }] } as unknown as DataTransfer)).toEqual([file]);
  });
  it("extracts image item but not text", () => {
    const file = new File(["x"], "p.heic");
    expect(clipboardImages({ files: [], items: [{ kind: "string" }, { kind: "file", getAsFile: () => file }] } as unknown as DataTransfer)).toEqual([file]);
  });
  it("protects text fields and nested editable content", () => {
    expect(isEditingText(document.createElement("input"))).toBe(true);
    const div = document.createElement("div"); div.contentEditable = "true"; div.setAttribute("contenteditable", "true"); const span = document.createElement("span"); div.append(span);
    expect(isEditingText(span)).toBe(true); expect(isEditingText(document.body)).toBe(false);
  });
  it("reports unsupported clipboard button", async () => await expect(readClipboardImages()).rejects.toThrow("Trình duyệt này"));
  it("reports permission denial", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { read: vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")) }, configurable: true });
    await expect(readClipboardImages()).rejects.toThrow("Chưa được phép");
  });
  it("reports clipboard with only text", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { read: async () => [{ types: ["text/plain"] }] }, configurable: true });
    await expect(readClipboardImages()).rejects.toThrow("chưa có ảnh");
  });
  it("reads one image per clipboard item", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    Object.defineProperty(navigator, "clipboard", { value: { read: async () => [{ types: ["text/html", "image/png"], getType: async () => blob }] }, configurable: true });
    const files = await readClipboardImages(); expect(files).toHaveLength(1); expect(files[0].type).toBe("image/png");
  });
});
