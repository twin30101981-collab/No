// CS-01: trạng thái bền của một trang (đề án "Chụp trước – Xử lý sau", báo cáo mục 8.2, bản ghi trang §13.1).
// Vòng đời:  moi → cho → dang → xong | xem-lai | loi ;  sửa tay (xong|xem-lai) → dang ;  loi → cho (thử lại)
// Tài liệu cũ chưa có trường status: coi là "xong" (chúng đã hoàn chỉnh) — chuyển đổi trong bộ nhớ khi nạp, không ghi hàng loạt xuống ổ.
import type { Doc, Page } from "./db";

export type PageStatus = "moi" | "cho" | "dang" | "xong" | "xem-lai" | "loi";
export const PAGE_STATUSES: readonly PageStatus[] = ["moi", "cho", "dang", "xong", "xem-lai", "loi"];

const NEXT: Record<PageStatus, readonly PageStatus[]> = {
  moi: ["cho", "loi"],
  cho: ["dang", "loi"],
  dang: ["xong", "xem-lai", "loi", "cho"], // "cho": bị hoãn/huỷ giữa chừng, xếp lại hàng đợi
  xong: ["dang"],
  "xem-lai": ["dang", "xong"],
  loi: ["cho"],
};
export const canTransition = (from: PageStatus, to: PageStatus): boolean => from === to || NEXT[from].includes(to);

export const isPageStatus = (v: unknown): v is PageStatus => typeof v === "string" && (PAGE_STATUSES as readonly string[]).includes(v);
/** Trạng thái hiệu lực của trang: thiếu hoặc không hợp lệ (dữ liệu cũ/hỏng) → "xong". */
export const pageStatus = (p: Pick<Page, "status">): PageStatus => (isPageStatus(p.status) ? p.status : "xong");
/** Trang còn cần việc nền (chưa dùng được hết). */
export const isPending = (p: Pick<Page, "status">): boolean => { const s = pageStatus(p); return s === "moi" || s === "cho" || s === "dang"; };

/** Đổi trạng thái có kiểm tra vòng đời; chuyển không hợp lệ → ném lỗi (bắt lỗi logic sớm, không ghi trạng thái vô nghĩa). */
export function withStatus(p: Page, to: PageStatus, extra: Partial<Pick<Page, "progress" | "error" | "warnings" | "quadConfidence">> = {}): Page {
  const from = pageStatus(p);
  if (!canTransition(from, to)) throw new Error(`Chuyển trạng thái trang không hợp lệ: ${from} → ${to}`);
  const next: Page = { ...p, status: to, ...extra };
  if (to !== "dang") delete next.progress;
  if (to !== "loi") delete next.error;
  return next;
}

/** Điền status cho trang cũ (không đổi gì nếu đã có). Trả đúng đối tượng cũ khi không có gì cần đổi (không tạo bản sao thừa). */
export function normalizeDoc(d: Doc): Doc {
  if (!d.pages?.length || d.pages.every((p) => isPageStatus(p.status))) return d;
  return { ...d, pages: d.pages.map((p) => (isPageStatus(p.status) ? p : { ...p, status: "xong" as const })) };
}
