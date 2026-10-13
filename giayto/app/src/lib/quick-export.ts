/**
 * R3.5 – Xuất 1 chạm: PDF mức Chuẩn (balanced), tên tự động theo tên tài liệu,
 * nhắc “Còn N trang nên xem lại” khi có trang điểm thấp.
 * Luồng Thêm → Xuất chỉ còn 2 thao tác: bấm Xuất, xong.
 */
import { docToPdf, download, safeName } from "./files";
import { recordFile } from "./history";
import { needsReview, type PageReview } from "./page-review";
import { getSettings } from "./settings";
import type { Doc } from "./db";

/** Tên tệp xuất tự động cho tài liệu. */
export const quickExportName = (doc: Pick<Doc, "name">) => `${safeName(doc.name)}.pdf`;

/** Số trang cần xem lại (điểm < ngưỡng). Trang chưa đo điểm không tính. */
export function reviewCount(reviews: Record<string, PageReview | undefined>): number {
  return Object.values(reviews).filter((r) => r && needsReview(r.score)).length;
}

/** Câu nhắc sau khi xuất; null khi không còn trang nào cần xem lại. */
export function reviewReminder(reviews: Record<string, PageReview | undefined>): string | null {
  const n = reviewCount(reviews);
  return n > 0 ? `Còn ${n} trang nên xem lại` : null;
}

/** Tuỳ chọn PDF 1 chạm: khổ giấy theo cài đặt, mức Chuẩn, không hình mờ/mật khẩu. */
export function quickExportOpts() {
  return { paper: getSettings().paper, size: "balanced" as const };
}

/** Xuất 1 chạm: dựng PDF Chuẩn, tải về với tên tự động, ghi lịch sử. Trả về số trang cần xem lại. */
export async function quickExportPdf(doc: Doc, reviews: Record<string, PageReview | undefined> = {}): Promise<number> {
  const blob = await docToPdf(doc, quickExportOpts());
  const name = quickExportName(doc);
  download(blob, name);
  await recordFile({
    kind: "Xuất 1 chạm → PDF",
    sourceName: doc.name,
    outputBlob: blob,
    outputName: name,
    details: [`${doc.pages.length} trang`],
  }).catch((e) => console.error("history", e));
  return reviewCount(reviews);
}
