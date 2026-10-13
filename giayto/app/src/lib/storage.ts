import type { Doc } from "./db";

/** Dung lượng: đo, cảnh báo, dọn ảnh tạm (ảnh thu nhỏ cũ/thừa). */
import { blobFor, fpOf } from "./disk-pack";
const bytes = (s?: string) => (!s ? 0 : s.startsWith("blob:") ? blobFor(s)?.size ?? 0 : Math.round(s.length * 0.75));
// S15f3b: dấu vân tay ổn định cho cả data URL lẫn object URL (blob: đổi mỗi lần nạp).
const thumbKey = (p: Doc["pages"][number]) => fpOf(p.src);

export function breakdown(docs: Doc[]) {
  let active = 0, trash = 0, temp = 0;
  for (const d of docs) for (const [i, p] of d.pages.entries()) {
    const main = bytes(p.src) + (p.orig !== p.src ? bytes(p.orig) : 0);
    if (d.deletedAt) trash += main; else active += main;
    if (p.thumb && (i > 0 || p.thumbKey !== thumbKey(p))) temp += bytes(p.thumb);
  }
  return { active, trash, temp };
}
/** Bỏ ảnh thu nhỏ hết hạn (ảnh đã sửa) hoặc thừa (không phải trang đầu). Trả về tài liệu cần lưu. */
export function cleanTemp(docs: Doc[]) {
  const out: Doc[] = [];
  for (const d of docs) {
    let changed = false;
    const pages = d.pages.map((p, i) => {
      if (p.thumb && (i > 0 || p.thumbKey !== thumbKey(p))) { changed = true; const { thumb: _, thumbKey: __, ...rest } = p; return rest; }
      return p;
    });
    if (changed) out.push({ ...d, pages });
  }
  return out;
}
export type Level = "ok" | "warn" | "full";
export function level(usage: number, quota: number): Level {
  if (!quota) return "ok";
  const r = usage / quota;
  return r >= 0.95 ? "full" : r >= 0.8 ? "warn" : "ok";
}
export function fmtBytes(n: number) {
  return n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}
