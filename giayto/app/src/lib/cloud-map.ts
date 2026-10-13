// G3-01: chuyển tài liệu trên máy (IndexedDB) <-> hàng trên đám mây.
// Ảnh không nằm trong bảng: đường dẫn kho lưu trữ theo dạng <user>/<docLocalId>/<pageLocalId>-{orig|src}.jpg
import type { Doc, Page } from "./db";

export const PAGE_BUCKET = "pages";

export type DocRow = {
  local_id: string; name: string; folder: string; kind: string; tags: string[];
  fields: Record<string, string>; locked: boolean;
  created_at: string; deleted_at: string | null; client_updated_at: number;
};
export type PageRow = {
  local_id: string; position: number; edit: Page["edit"]; text: string | null;
  orig_path: string; src_path: string;
};

export function pagePath(userId: string, docId: string, pageId: string, kind: "orig" | "src") {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${userId}/${safe(docId)}/${safe(pageId)}-${kind}.jpg`;
}

export function docToRow(d: Doc): DocRow {
  return {
    local_id: d.id, name: d.name, folder: d.folder ?? "", kind: d.kind, tags: d.tags ?? [],
    fields: d.fields ?? {}, locked: !!d.locked,
    created_at: new Date(d.createdAt).toISOString(),
    deleted_at: d.deletedAt ? new Date(d.deletedAt).toISOString() : null,
    client_updated_at: d.updatedAt,
  };
}

export function pagesToRows(userId: string, d: Doc): PageRow[] {
  return d.pages.map((p, i) => ({
    local_id: p.id, position: i, edit: p.edit, text: p.text ?? null,
    orig_path: pagePath(userId, d.id, p.id, "orig"),
    src_path: pagePath(userId, d.id, p.id, "src"),
  }));
}

/** Dựng lại Doc từ hàng đám mây; ảnh (orig/src) điền sau khi tải về. */
export function rowToDoc(r: DocRow & { updated_at: string }, pages: PageRow[]): Doc {
  return {
    id: r.local_id, name: r.name, folder: r.folder, kind: r.kind,
    createdAt: Date.parse(r.created_at), updatedAt: r.client_updated_at || Date.parse(r.updated_at),
    ...(r.tags.length ? { tags: r.tags } : {}),
    ...(Object.keys(r.fields ?? {}).length ? { fields: r.fields } : {}),
    ...(r.locked ? { locked: true } : {}),
    ...(r.deleted_at ? { deletedAt: Date.parse(r.deleted_at) } : {}),
    pages: [...pages].sort((a, b) => a.position - b.position).map((p) => ({
      id: p.local_id, orig: "", src: "", edit: p.edit, ...(p.text != null ? { text: p.text } : {}),
    })),
  };
}

/** Thư mục cha của mọi tài liệu ("a/b/c" -> a, a/b, a/b/c). */
export function folderPaths(docs: Doc[]): string[] {
  const out = new Set<string>();
  for (const d of docs) {
    const parts = (d.folder ?? "").split("/").filter(Boolean);
    for (let i = 1; i <= parts.length; i++) out.add(parts.slice(0, i).join("/"));
  }
  return [...out].sort();
}
