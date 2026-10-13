import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";
import { getDocs, loadDocs, newDoc, newPage, saveDoc, type Page } from "./db";
import { findDuplicate, fingerprintImageSource } from "./dedupe-phash";
import { pdfToImages } from "./files";
import { normalize } from "./image";
import { FILE_ACCEPT, IMAGE_ACCEPT, imageBlob, isImageFile } from "./image-input";

/** Open a native file picker and resolve the chosen files. */
export function pickFiles(accept: string, multiple = true, capture?: "environment" | "user"): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = accept.includes("image/*") ? `${accept},.heic,.heif,image/heic,image/heif` : accept; input.multiple = multiple;
    if (capture) input.setAttribute("capture", capture);
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.click();
  });
}

/** R4.1: dấu vân của mọi trang đã lưu (để chống nhập trùng). */
async function existingHashes(): Promise<string[]> {
  try {
    await loadDocs();
    return getDocs().flatMap((d) => d.pages.map((p) => p.phash).filter((h): h is string => !!h));
  } catch {
    return [];
  }
}

/** Khung cắt trùng toàn bộ ảnh — dùng cho ảnh nhập đã phẳng, không cắt lại. */
const FULL_QUAD: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];

export async function filesToPages(files: File[]) {
  const pages: Page[] = [];
  const hashes = await existingHashes();
  let dupes = 0;
  for (const f of files) {
    if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
      for (const src of await pdfToImages(f)) pages.push(newPage(src));
    } else if (isImageFile(f)) {
      const src = await normalize(await imageBlob(f));
      const page = newPage(src);
      // R4.1: dấu vân + phân loại ảnh nhập (bỏ qua lặng lẽ khi không giải mã được).
      const fp = await fingerprintImageSource(src);
      if (fp) {
        page.phash = fp.phash;
        page.importKind = fp.kind;
        if (fp.kind !== "photo") page.edit.quad = FULL_QUAD; // ảnh phẳng/chụp màn hình: không cắt lại
        if (findDuplicate(fp.phash, hashes) >= 0) {
          dupes++;
          // Hỏi người dùng: ảnh này hình như đã có trong kho.
          if (typeof window !== "undefined" && !window.confirm(`Ảnh “${f.name}” hình như đã nhập trước đây. Vẫn thêm lại?`)) continue;
        }
        hashes.push(fp.phash);
      }
      pages.push(page);
    }
  }
  if (dupes) toast.info(`Phát hiện ${dupes} ảnh trùng với tài liệu đã có`);
  return pages;
}

/** Import images/PDFs as a new document and open it. */
export function useImport() {
  const navigate = useNavigate();
  return useCallback(async (accept: string | File[] = FILE_ACCEPT, kind = "Nhập", tool?: string) => {
    const files = typeof accept === "string" ? await pickFiles(accept === "image/*" ? IMAGE_ACCEPT : accept) : accept;
    if (!files.length) return;
    const id = toast.loading("Đang nhập…");
    try {
      const pages = await filesToPages(files);
      if (!pages.length) { toast.error("Không có ảnh hoặc PDF hợp lệ", { id }); return; }
      const name = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : undefined;
      const doc = await saveDoc(newDoc(pages, name, kind));
      toast.success(`Đã nhập ${pages.length} trang`, { id });
      navigate({ to: "/doc/$id", params: { id: doc.id }, search: tool ? { tool } : {} });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không đọc được tập tin này", { id }); }
  }, [navigate]);
}
