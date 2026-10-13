/** G1-17: page numbers + header/footer for PDF export. Pure helpers (testable). */
export type PageMarks = { numbers?: boolean | undefined; numberStyle?: "n" | "n/N" | "Trang n/N" | undefined; header?: string | undefined; footer?: string | undefined };

export const NUMBER_STYLES = ["Trang n/N", "n/N", "n"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
export const viDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

/** Fill tokens: {trang} page, {tong} total, {ten} doc name, {ngay} dd/mm/yyyy. */
export function fillMarkText(tpl: string, page: number, total: number, name: string, date: Date) {
  return tpl
    .replace(/\{trang\}/gi, String(page))
    .replace(/\{tong\}/gi, String(total))
    .replace(/\{ten\}/gi, name)
    .replace(/\{ngay\}/gi, viDate(date))
    .trim();
}

export function pageNumberText(style: PageMarks["numberStyle"], page: number, total: number) {
  if (style === "n") return String(page);
  if (style === "n/N") return `${page}/${total}`;
  return `Trang ${page}/${total}`;
}

/** Extra margin (mm) reserved at top / bottom so the image never covers the text. */
export function markMargins(m: PageMarks) {
  return { top: m.header?.trim() ? 9 : 0, bottom: m.footer?.trim() || m.numbers ? 9 : 0 };
}

export const hasMarks = (m: PageMarks) => !!(m.numbers || m.header?.trim() || m.footer?.trim());
