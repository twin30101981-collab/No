// G3-12: áp kết quả AI đặt tên/phân loại vào tài liệu (phần thuần, có test).
import type { Doc } from "./db";

export type Classification = { title: string; type: string; tags: string[]; confidence: number };
export const MIN_CONFIDENCE = 0.4;

/** Tên mặc định do newDoc sinh: "<loại> dd-mm hh:mm". */
export const isDefaultName = (d: Pick<Doc, "name" | "kind">) =>
  d.name.startsWith(d.kind + " ") && /^\d{2}-\d{2} \d{2}:\d{2}$/.test(d.name.slice(d.kind.length + 1));

export function cleanTitle(t: string) {
  const s = t.replace(/[\\/:*?"<>|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().replace(/^["'“]+|["'”.]+$/g, "");
  return s.length > 60 ? s.slice(0, 59).trimEnd() + "…" : s;
}
export function cleanTags(tags: string[]) {
  const out: string[] = [];
  for (const t of tags) { const s = t.replace(/^#/, "").replace(/\s+/g, " ").trim().slice(0, 24); if (s && !out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s); }
  return out.slice(0, 3);
}

/** Trả về tài liệu đã cập nhật, hoặc null nếu không nên đổi (người dùng đã tự đặt tên, AI không chắc…). */
export function applyClassification(doc: Doc, c: Classification): Doc | null {
  if (doc.locked || doc.deletedAt || !isDefaultName(doc) || !(c.confidence >= MIN_CONFIDENCE)) return null;
  const title = cleanTitle(c.title); if (!title) return null;
  const tags = [...(doc.tags ?? [])];
  for (const t of cleanTags(c.tags)) if (!tags.some((o) => o.toLowerCase() === t.toLowerCase())) tags.push(t);
  return { ...doc, name: title, tags, fields: { ...(doc.fields ?? {}), "Loại (AI)": c.type } };
}
