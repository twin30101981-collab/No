/** Shared browser-only image intake for picker, paste, share and scan. */
export const IMAGE_ACCEPT = "image/*,.heic,.heif,image/heic,image/heif";
export const FILE_ACCEPT = `${IMAGE_ACCEPT},application/pdf`;
const HEIF_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

export function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error("Không đọc được ảnh"));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được ảnh"));
    reader.onabort = () => reject(new Error("Đã huỷ đọc ảnh"));
    reader.readAsArrayBuffer(blob);
  });
}
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name);
}
export async function isHeicFile(file: Blob): Promise<boolean> {
  if (HEIF_TYPES.has(file.type.toLowerCase()) || (file instanceof File && /\.hei[cf]$/i.test(file.name))) return true;
  const bytes = new Uint8Array(await readBlob(file.slice(0, 256)));
  const text = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4));
  if (bytes.length < 16 || text(4) !== "ftyp") return false;
  // AVIF also uses mif1; leave it to the browser rather than misclassifying it.
  const brands = [text(8)];
  const size = new DataView(bytes.buffer).getUint32(0);
  for (let at = 16; at + 4 <= Math.min(size, bytes.length); at += 4) brands.push(text(at));
  return !brands.some((b) => b === "avif" || b === "avis") && brands.some((b) => HEIF_BRANDS.has(b));
}
let conversion = Promise.resolve();
export async function imageBlob(file: Blob): Promise<Blob> {
  if (!(await isHeicFile(file))) return file;
  // Decode one HEIC at a time: multiple phone photos otherwise exhaust memory.
  const result = conversion.then(async () => {
    try {
      const { heicTo } = await import("heic-to/csp");
      const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
      if (!blob.size) throw new Error("Ảnh rỗng");
      return blob;
    } catch {
      throw new Error(`Không chuyển được ảnh HEIC${file instanceof File ? ` “${file.name}”` : ""}. Hãy chọn lại ảnh hoặc xuất ảnh thành JPG/PNG.`);
    }
  });
  conversion = result.then(() => undefined, () => undefined);
  return result;
}
export function clipboardImages(data: Pick<DataTransfer, "items" | "files"> | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files ?? []).filter(isImageFile);
  if (files.length) return files;
  return Array.from(data.items ?? []).flatMap((item) => {
    if (item.kind !== "file") return [];
    const file = item.getAsFile();
    return file && isImageFile(file) ? [file] : [];
  });
}
export function isEditingText(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('input,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
}
export async function readClipboardImages(): Promise<File[]> {
  if (!navigator.clipboard?.read) throw new Error("Trình duyệt này không có nút dán ảnh. Hãy dùng lệnh Dán của máy hoặc chọn ảnh từ thư viện.");
  try {
    const files: File[] = [];
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      const ext = type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
      files.push(new File([blob], `anh-dan-${files.length + 1}.${ext}`, { type }));
    }
    if (!files.length) throw new Error("Bộ nhớ tạm chưa có ảnh. Hãy sao chép ảnh trước khi dán.");
    return files;
  } catch (error) {
    if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError"))
      throw new Error("Chưa được phép đọc ảnh đã sao chép. Hãy cho phép quyền dán hoặc chọn ảnh từ thư viện.");
    throw error;
  }
}
