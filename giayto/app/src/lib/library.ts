import { useSyncExternalStore } from "react";
import { type Doc, docText, saveDocs, uid } from "@/lib/db";

/** Folders are slash-separated paths ("Công việc/Hoá đơn"); tags are names with a colour index. */
export type Tag = { name: string; color: number };
export type DocFilter = {
  q: string; folder: string | null; tags: string[]; kind: string | null;
  from: string; to: string; ocr: "any" | "yes" | "no";
};
export type QuickFilter = { id: string; name: string; filter: DocFilter };
export type Library = { folders: string[]; tags: Tag[]; quick: QuickFilter[] };

export const TAG_COLORS = 6;
export const ROOT_FOLDER = "Chung";
export const emptyFilter = (): DocFilter => ({ q: "", folder: null, tags: [], kind: null, from: "", to: "", ocr: "any" });

const KEY = "ghi-nhanh-library";
const EMPTY: Library = { folders: [ROOT_FOLDER], tags: [], quick: [] };
let state: Library = EMPTY;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Library) }; } catch { /* ignore */ }
}
export function getLibrary() { load(); return state; }
export function setLibrary(next: Library) {
  state = { ...next, folders: [...new Set([ROOT_FOLDER, ...next.folders])].sort((a, b) => a.localeCompare(b, "vi")) };
  localStorage.setItem(KEY, JSON.stringify(state)); subs.forEach((f) => f());
}
const update = (fn: (l: Library) => Partial<Library>) => setLibrary({ ...getLibrary(), ...fn(getLibrary()) });

export function useLibrary() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, getLibrary, () => EMPTY);
}

// ---------- folders ----------
export const parentOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : null);
export const baseName = (p: string) => p.slice(p.lastIndexOf("/") + 1);
export const inFolder = (docFolder: string, folder: string) => docFolder === folder || docFolder.startsWith(folder + "/");

/** All folder paths known from the library and documents, including implied parents. */
export function allFolders(lib: Library, docs: Doc[]) {
  const set = new Set<string>([ROOT_FOLDER, ...lib.folders, ...docs.map((d) => d.folder)]);
  for (const f of [...set]) { let p = parentOf(f); while (p) { set.add(p); p = parentOf(p); } }
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}
export const childFolders = (all: string[], parent: string | null) => all.filter((f) => parentOf(f) === parent);

export function createFolder(path: string) { update((l) => ({ folders: [...l.folders, path] })); }
export async function renameFolder(from: string, to: string, docs: Doc[]) {
  const swap = (p: string) => (inFolder(p, from) ? to + p.slice(from.length) : p);
  update((l) => ({ folders: l.folders.map(swap), quick: l.quick.map((q) => ({ ...q, filter: { ...q.filter, folder: q.filter.folder && swap(q.filter.folder) } })) }));
  await saveDocs(docs.filter((d) => inFolder(d.folder, from)).map((d) => ({ ...d, folder: swap(d.folder) })));
}
/** Deletes a folder and its subfolders; their documents move to the parent folder. */
export async function deleteFolder(path: string, docs: Doc[]) {
  const target = parentOf(path) ?? ROOT_FOLDER;
  update((l) => ({ folders: l.folders.filter((f) => !inFolder(f, path)) }));
  await saveDocs(docs.filter((d) => inFolder(d.folder, path)).map((d) => ({ ...d, folder: target })));
}

// ---------- tags ----------
export function ensureTag(name: string) {
  const n = name.trim(); if (!n) return;
  const lib = getLibrary(); if (lib.tags.some((t) => t.name.toLowerCase() === n.toLowerCase())) return;
  update((l) => ({ tags: [...l.tags, { name: n, color: l.tags.length % TAG_COLORS }] }));
}
export function setTagColor(name: string, color: number) { update((l) => ({ tags: l.tags.map((t) => (t.name === name ? { ...t, color } : t)) })); }
export async function removeTag(name: string, docs: Doc[]) {
  update((l) => ({ tags: l.tags.filter((t) => t.name !== name), quick: l.quick.map((q) => ({ ...q, filter: { ...q.filter, tags: q.filter.tags.filter((x) => x !== name) } })) }));
  await saveDocs(docs.filter((d) => d.tags?.includes(name)).map((d) => ({ ...d, tags: d.tags!.filter((t) => t !== name) })));
}
export const tagColor = (lib: Library, name: string) => lib.tags.find((t) => t.name === name)?.color ?? 0;

// ---------- quick filters ----------
export function saveQuickFilter(name: string, filter: DocFilter) { update((l) => ({ quick: [...l.quick, { id: uid(), name, filter }] })); }
export function removeQuickFilter(id: string) { update((l) => ({ quick: l.quick.filter((q) => q.id !== id) })); }

// ---------- filtering ----------
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

const hayCache = new WeakMap<Doc, string>();
export function matchesQuery(d: Doc, q: string) {
  const n = norm(q.trim()); if (!n) return true;
  let hay = hayCache.get(d);
  if (hay === undefined) { hay = norm([d.name, d.folder, d.kind, ...(d.tags ?? []), d.locked ? "" : docText(d), ...Object.values(d.fields ?? {})].join("\n")); hayCache.set(d, hay); }
  return hay.includes(n);
}
export function applyFilter(docs: Doc[], f: DocFilter) {
  const from = f.from ? new Date(f.from).getTime() : -Infinity;
  const to = f.to ? new Date(f.to).getTime() + 86_400_000 : Infinity;
  return docs.filter((d) =>
    (!f.folder || inFolder(d.folder, f.folder)) &&
    (!f.kind || d.kind === f.kind) &&
    f.tags.every((t) => d.tags?.includes(t)) &&
    d.createdAt >= from && d.createdAt < to &&
    (f.ocr === "any" || (f.ocr === "yes") === d.pages.some((p) => p.text)) &&
    matchesQuery(d, f.q));
}
export const activeFilterCount = (f: DocFilter) =>
  (f.kind ? 1 : 0) + f.tags.length + (f.from ? 1 : 0) + (f.to ? 1 : 0) + (f.ocr !== "any" ? 1 : 0);
