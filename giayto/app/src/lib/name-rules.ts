// G3-13: mẫu đặt tên + quy tắc tự chuyển thư mục (phần thuần, có test).
import type { Doc } from "./db";
import { cleanTitle } from "./auto-name";

export type RuleField = "type" | "tag" | "name";
export type FolderRule = { id: string; field: RuleField; contains: string; folder: string };
export const DEFAULT_TEMPLATE = "{ten}";
export const PLACEHOLDERS: [string, string][] = [
  ["{ten}", "Tên AI đặt"], ["{loai}", "Loại giấy tờ"], ["{the}", "Thẻ đầu tiên"],
  ["{ngay}", "dd-mm-yyyy"], ["{thang}", "mm-yyyy"], ["{nam}", "yyyy"],
];
export const FIELD_LABEL: Record<RuleField, string> = { type: "Loại", tag: "Thẻ", name: "Tên" };

const pad = (n: number) => String(n).padStart(2, "0");
/** Bỏ dấu + chữ thường để so khớp "hoa don" với "Hoá đơn". */
export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().trim();

export function renderTemplate(tpl: string, v: { title: string; type: string; tags: string[]; date: number }) {
  const d = new Date(v.date);
  const map: Record<string, string> = {
    ten: v.title, loai: v.type, the: v.tags[0] ?? "",
    ngay: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`,
    thang: `${pad(d.getMonth() + 1)}-${d.getFullYear()}`, nam: String(d.getFullYear()),
  };
  const out = (tpl.trim() || DEFAULT_TEMPLATE).replace(/\{(\w+)\}/g, (m, k: string) => (k in map ? map[k] : m));
  // Bỏ dấu nối/khoảng trắng thừa khi một biến rỗng: "{the} - {ten}" → "Tên".
  const tidy = out.replace(/\s*([-–_·|])\s*(?=\1|$)/g, "").replace(/^\s*[-–_·|]\s*/, "").replace(/\s+/g, " ");
  return cleanTitle(tidy) || cleanTitle(v.title);
}

export const cleanFolder = (f: string) =>
  f.split("/").map((p) => p.replace(/[\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean).join("/");

export function validRule(r: FolderRule) { return !!fold(r.contains) && !!cleanFolder(r.folder); }

export function ruleMatches(r: FolderRule, d: Pick<Doc, "name" | "tags" | "fields">) {
  const q = fold(r.contains); if (!q) return false;
  if (r.field === "name") return fold(d.name).includes(q);
  if (r.field === "tag") return (d.tags ?? []).some((t) => fold(t) === q);
  return fold(d.fields?.["Loại (AI)"] ?? "").includes(q);
}

/** Thư mục của quy tắc đầu tiên khớp, hoặc null. */
export function pickFolder(rules: FolderRule[], d: Pick<Doc, "name" | "tags" | "fields">) {
  const r = rules.find((x) => validRule(x) && ruleMatches(x, d));
  return r ? cleanFolder(r.folder) : null;
}

/** Áp mẫu tên + quy tắc thư mục sau khi AI phân loại. Chỉ chuyển tài liệu đang ở thư mục gốc. */
export function applyNaming(doc: Doc, c: { title: string; type: string }, tpl: string, rules: FolderRule[], root = "Chung"): Doc {
  const name = renderTemplate(tpl, { title: c.title, type: c.type, tags: doc.tags ?? [], date: doc.createdAt });
  const next = { ...doc, name };
  const folder = doc.folder === root ? pickFolder(rules, next) : null;
  return folder ? { ...next, folder } : next;
}
