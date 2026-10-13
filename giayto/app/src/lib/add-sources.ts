// R4.3 – Bảng Thêm: 5 nguồn nhập + vị trí chèn + phím tắt PC + kéo-thả cửa sổ.
import { isImageFile } from "./image-input";
import { insertPages, type Result } from "./page-list";

/** Vị trí chèn trang mới. */
export type InsertPos = "start" | "after" | "end";

export const INSERT_POS_LABEL: Record<InsertPos, string> = {
  start: "Đầu tài liệu",
  after: "Sau trang đang xem",
  end: "Cuối tài liệu",
};

/** Chỉ số “chèn sau trang này” (‑1 = đầu) tương ứng với vị trí chọn. */
export function afterIndex(pos: InsertPos, active: number, count: number): number {
  if (pos === "start") return -1;
  if (pos === "end") return count - 1;
  return active;
}

/** Chèn trang mới theo vị trí chọn; trang đang xem chuyển tới trang mới đầu tiên. */
export function insertPagesAt<T>(pages: T[], added: T[], pos: InsertPos, active: number): Result<T> {
  return insertPages(pages, added, afterIndex(pos, active, pages.length));
}

/** 5 nguồn nhập trang trong bảng Thêm. */
export const ADD_SOURCES = ["library", "camera", "pdf", "paste", "scan"] as const;
export type AddSource = (typeof ADD_SOURCES)[number];

export const ADD_SOURCE_LABEL: Record<AddSource, string> = {
  library: "Thư viện ảnh",
  camera: "Chụp ảnh",
  pdf: "Tệp PDF (tách trang)",
  paste: "Dán ảnh đã sao chép",
  scan: "Quét thêm bằng camera",
};

/** Tệp nhận được khi kéo-thả vào cửa sổ: ảnh hoặc PDF. */
export function filesFromDrop(data: Pick<DataTransfer, "files"> | null): File[] {
  if (!data?.files?.length) return [];
  return Array.from(data.files).filter((f) => isImageFile(f) || f.type === "application/pdf" || /\.pdf$/i.test(f.name));
}

/** Có đang kéo tệp (không phải kéo trang trong lưới) qua cửa sổ không. */
export function isFileDrag(e: Pick<DragEvent, "dataTransfer">): boolean {
  return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
}

/** Phím tắt màn tài liệu: Delete xoá trang, ←/→ chuyển trang, R xoay. */
export type DocShortcut = "delete" | "prev" | "next" | "rotate";

export function docShortcut(key: string): DocShortcut | null {
  if (key === "Delete" || key === "Backspace") return "delete";
  if (key === "ArrowLeft") return "prev";
  if (key === "ArrowRight") return "next";
  if (key === "r" || key === "R") return "rotate";
  return null;
}
