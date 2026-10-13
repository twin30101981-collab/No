import { useEffect, useState } from "react";
import { toast } from "sonner";
import { expiredIds } from "./trash";
import { getVaultKey, openDoc, sealDoc, setVaultKey, deriveKey, newDataKey, wrapDataKey, unwrapDataKey, sealVerified, newRecoveryCode, normRecovery, newSalt, type EncBlob } from "./vault";
import { getSettings, hashPin, setSettings } from "./settings";
import { blobifyDoc, inlineDoc, packDoc, revokeDoc, unpackDoc, srcBytes } from "./disk-pack";

export type Filter = "original" | "magic" | "auto" | "sharp" | "mono" | "gray" | "ink" | "eco" | "vivid" | "bright" | "shadow" | "denoise";
export type Quad = [number, number][]; // 4 normalized points: TL, TR, BR, BL
export type PageEdit = { quad?: Quad | undefined; paper?: import("./detect").Paper | undefined; rotation: number; filter: Filter; brightness: number; contrast: number; /** P4/TD-09: nắn phẳng trang cong. undefined = tự động (đo độ cong), false = người dùng tắt, true = người dùng bật. */ flatten?: boolean | undefined; /** P4.3–P4.6: công cụ 3 mức. */ tools?: import("./tool-levels").Tools | undefined; /** R2.4: cấp độ bộ lọc 0–100 (thiếu = 100). */ level?: number | undefined };
export type Page = { id: string; orig: string; src: string; edit: PageEdit; text?: string; thumb?: string; thumbKey?: string; origW?: number; origH?: number; /** R3.1: người dùng đã sửa tay trang này. */ manual?: boolean; /** R4.1: dấu vân ảnh pHash (16 ký tự hex) để chống trùng. */ phash?: string; /** R4.1: loại ảnh nhập — flat/screenshot không cắt lại. */ importKind?: import("./dedupe-phash").ImportKind };
export type Doc = {
  id: string; name: string; folder: string; kind: string;
  createdAt: number; updatedAt: number; pages: Page[]; locked?: boolean;
  tags?: string[]; fields?: Record<string, string>;
  /** Soft-delete time; set = in trash. */ deletedAt?: number;
  /** Nội dung mã hoá theo PIN (pages rỗng khi còn khoá). */ enc?: EncBlob;
};

export const FILTER_LABEL: Record<Filter, string> = {
  original: "Màu gốc", magic: "Thần kỳ", auto: "Tài liệu sáng", sharp: "Sắc nét", mono: "Đen trắng", gray: "Xám", ink: "Mực", eco: "Tiết kiệm mực", vivid: "Tăng màu", bright: "Làm sáng", shadow: "Khử bóng", denoise: "Khử nhiễu",
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

let dbPromise: Promise<IDBDatabase> | null = null;
export function openDb() { return open(); }
function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("ghi-nhanh", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("docs")) db.createObjectStore("docs", { keyPath: "id" });
        if (!db.objectStoreNames.contains("conversions")) db.createObjectStore("conversions", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // HM-15: không giữ lại lời hứa đã bị từ chối, để lần mở sau còn thử lại được.
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction("docs", mode).objectStore("docs"));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/** Nhiều thao tác trong một giao dịch — nhanh hơn hẳn so với từng lệnh riêng. */
async function batch(fn: (s: IDBObjectStore) => void) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("docs", "readwrite"); fn(t.objectStore("docs"));
    t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
  });
}
/** Dạng ghi xuống ổ: tài liệu khoá được mã hoá khi đang có khoá PIN trong bộ nhớ. */
async function toDisk(d: Doc): Promise<Doc> {
  const key = getVaultKey();
  if (d.locked && key && !d.enc) return sealDoc(await inlineDoc(d), key);
  if (!d.locked && d.enc) throw new Error("Tài liệu còn mã hoá — mở khoá bằng PIN trước.");
  return packDoc(d);
}
export async function saveDocs(docs: Doc[]) {
  const disk = await Promise.all(docs.map(toDisk));
  await batch((s) => disk.forEach((d) => s.put(d)));
  const m = new Map(docs.map((d) => [d.id, d.locked ? d : blobifyDoc(d)])); cache = cache.map((d) => m.get(d.id) ?? d); emit();
}

let cache: Doc[] = [];
export const getDocs = () => cache;
let ready = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadDocs() {
  const raw = await Promise.all((await tx<Doc[]>("readonly", (s) => s.getAll())).map(unpackDoc));
  const key = getVaultKey();
  cache = (await Promise.all(raw.map((d) => (key && d.enc ? openDoc(d, key).catch(() => d) : d)))).sort((a, b) => b.updatedAt - a.updatedAt);
  ready = true; emit();
  // Tự dọn: xóa hẳn tài liệu đã ở thùng rác quá 30 ngày.
  const old = expiredIds(cache);
  if (old.length) await purgeDocs(old).catch(() => {});
}
export async function saveDoc(doc: Doc, touch = true) {
  let next = touch ? { ...doc, updatedAt: Date.now() } : doc;
  const disk = await toDisk(next);
  await tx("readwrite", (s) => s.put(disk));
  if (!next.locked) next = blobifyDoc(next);
  void import("./persist").then((m) => m.persistOnce());
  cache = touch ? [next, ...cache.filter((d) => d.id !== doc.id)] : cache.map((d) => (d.id === doc.id ? next : d));
  emit();
  return next;
}
/** Move to trash (soft delete); restore with restoreDocs. */
export async function deleteDocs(ids: string[]) {
  const set = new Set(ids), now = Date.now();
  await saveDocs(cache.filter((d) => set.has(d.id)).map((d) => ({ ...d, deletedAt: now })));
}
export async function restoreDocs(ids: string[]) {
  const set = new Set(ids);
  await saveDocs(cache.filter((d) => set.has(d.id)).map(({ deletedAt: _, ...d }) => d));
}
/** Permanently remove. */
export async function purgeDocs(ids: string[]) {
  await batch((s) => ids.forEach((id) => s.delete(id)));
  const gone = new Set(ids); const dead = cache.filter((d) => gone.has(d.id));
  cache = cache.filter((d) => !gone.has(d.id)); emit();
  const keep = new Set(cache.flatMap((d) => d.pages.flatMap((p) => [p.orig, p.src])));
  dead.forEach((d) => revokeDoc(d, keep));
}
export async function replaceAll(docs: Doc[]) {
  await batch((s) => { s.clear(); docs.forEach((d) => s.put(d)); });
  await loadDocs();
}

let warned = false;
/** HM-15: không đọc được kho tài liệu (IndexedDB bị chặn/không có) → vẫn mở app với danh sách rỗng và báo rõ một lần. */
function onLoadFailed(e: unknown) {
  console.error(e);
  cache = []; ready = true; emit();
  if (warned) return; warned = true;
  toast.error("Máy này không cho Ghi Nhanh lưu tài liệu", { description: "Có thể đang ở chế độ riêng tư hoặc đã chặn lưu dữ liệu. Mở bằng cửa sổ thường và cho phép lưu; tài liệu mới có thể không được giữ." });
}

export function useDocs() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (!ready) void loadDocs().catch(onLoadFailed); else l();
    return () => { listeners.delete(l); };
  }, []);
  return { docs: cache.filter((d) => !d.deletedAt), trash: cache.filter((d) => d.deletedAt), all: cache, ready };
}

export function newPage(orig: string, src = orig, edit?: Partial<PageEdit>): Page {
  return { id: uid(), orig, src, edit: { rotation: 0, filter: "original", brightness: 0, contrast: 0, ...edit } };
}

export function newDoc(pages: Page[], name?: string, kind = "Tài liệu"): Doc {
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { id: uid(), name: name ?? `${kind} ${stamp}`, folder: "Chung", kind, createdAt: Date.now(), updatedAt: Date.now(), pages };
}

export function docSize(doc: Doc) {
  const bytes = doc.pages.reduce((n, p) => n + srcBytes(p.src), 0);
  if (bytes > 0 && bytes < 1e3) return "1 KB";
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`;
}
export function docText(doc: Doc) { return doc.pages.map((p) => p.text ?? "").join("\n"); }
export function timeAgo(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "Vừa xong"; if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60); if (h < 24) return `${h} giờ trước`;
  const days = Math.round(h / 24); return days === 1 ? "Hôm qua" : `${days} ngày trước`;
}

// ——— Mã hoá theo PIN (G3-08/G3-09) ———
// Khoá dữ liệu (DEK) ngẫu nhiên; lưu trong cài đặt ở dạng bọc bằng khoá từ PIN và (tuỳ chọn) mã khôi phục.
async function openAll(key: CryptoKey, fallback?: CryptoKey) {
  const sealed = cache.filter((d) => d.enc);
  const opened = await Promise.all(sealed.map((d) => openDoc(d, key).catch((e) => { if (fallback) return openDoc(d, fallback); throw e; })));
  const m = new Map(opened.map((d) => [d.id, d]));
  cache = cache.map((d) => m.get(d.id) ?? d);
}
/** Chuyển tài liệu khoá còn dạng rõ (dữ liệu cũ) hoặc mã theo khoá cũ sang khoá hiện tại, có kiểm tra từng tài liệu. */
export async function migrateLocked(key: CryptoKey, all = false) {
  const todo = cache.filter((d) => d.locked && (all || !d.enc));
  const disk: Doc[] = []; const failed: string[] = [];
  for (const d of todo) { try { disk.push(await sealVerified((({ enc: _e, ...r }) => r as Doc)(d), key)); } catch { failed.push(d.name); } }
  if (disk.length) await batch((s) => disk.forEach((d) => s.put(d)));
  return { done: disk.length, failed };
}
export const plainLockedCount = () => cache.filter((d) => d.locked && !d.enc).length;

/** Mở khoá bằng PIN. Trả false nếu sai. Tự chuyển dữ liệu cũ sang dạng mã hoá. */
export async function unlockVault(pin: string, salt: string) {
  const kek = await deriveKey(pin, salt);
  const wrap = getSettings().vaultWrap;
  let dek: CryptoKey;
  try {
    if (wrap) { dek = await unwrapDataKey(wrap.pin, kek); await openAll(dek); }
    else {
      // Bản G3-08 mã thẳng bằng khoá từ PIN → mở bằng khoá đó, tạo DEK mới rồi mã lại tất cả.
      await openAll(kek); dek = await newDataKey();
      setSettings({ vaultWrap: { v: 1, pin: await wrapDataKey(dek, kek) } });
      setVaultKey(dek); await migrateLocked(dek, true); emit(); return true;
    }
  } catch { return false; }
  setVaultKey(dek);
  if (plainLockedCount()) await migrateLocked(dek);
  emit();
  return true;
}
/** Quên PIN: mở bằng mã khôi phục rồi đặt PIN mới (khoá dữ liệu giữ nguyên, không mã lại). */
export async function recoverVault(code: string, newPin: string) {
  const wrap = getSettings().vaultWrap;
  if (!wrap?.rec || !wrap.recSalt) return false;
  try {
    const dek = await unwrapDataKey(wrap.rec, await deriveKey(normRecovery(code), wrap.recSalt));
    await openAll(dek); setVaultKey(dek);
  } catch { return false; }
  const salt = newSalt(); const dek = getVaultKey()!;
  setSettings({ pin: await hashPin(newPin), pinSalt: salt, vaultWrap: { ...wrap, pin: await wrapDataKey(dek, await deriveKey(newPin, salt)) } });
  emit(); return true;
}
/** Tạo mã khôi phục mới (cần đang mở khoá). Mã cũ hết hiệu lực. */
export async function createRecovery() {
  const dek = getVaultKey(); const wrap = getSettings().vaultWrap;
  if (!dek || !wrap) throw new Error("Hãy mở khoá bằng PIN trước");
  const code = newRecoveryCode(); const recSalt = newSalt();
  setSettings({ vaultWrap: { ...wrap, rec: await wrapDataKey(dek, await deriveKey(normRecovery(code), recSalt)), recSalt } });
  return code;
}
/** Khoá lại: quên khoá trong bộ nhớ, đọc lại bản mã hoá từ ổ. */
export async function lockVault() { setVaultKey(null); if (ready) await loadDocs(); }
/** Đặt PIN mới (bọc lại khoá dữ liệu) hoặc tắt PIN (giải mã trả về dạng thường). Cần đang mở khoá. */
export async function rekeyVault(next: { pin: string; salt: string } | null) {
  const locked = cache.filter((d) => d.locked);
  if (locked.some((d) => d.enc)) throw new Error("Cần mở khoá trước khi đổi PIN");
  if (next) {
    const dek = getVaultKey() ?? (await newDataKey());
    const wrap = getSettings().vaultWrap;
    setSettings({ vaultWrap: { ...(wrap ?? {}), v: 1, pin: await wrapDataKey(dek, await deriveKey(next.pin, next.salt)) } });
    setVaultKey(dek); await saveDocs(locked);
  } else {
    setVaultKey(null); { const { vaultWrap: _w, ...rest } = getSettings(); localStorage.setItem("ghi-nhanh-settings", JSON.stringify(rest)); setSettings({}); }
    await saveDocs(locked.map(({ locked: _, ...d }) => d));
  }
}
