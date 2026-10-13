// Mã hoá dữ liệu tài liệu đã khoá trên máy theo mã PIN (WebCrypto: PBKDF2 → AES-GCM 256).
// Chỉ phần nội dung (trang, chữ, trường trích xuất, thẻ) được mã hoá; tên/thư mục/giờ giữ nguyên để danh sách vẫn hiện.
import type { Doc } from "./db";

export type EncBlob = { v: 1; iv: string; data: string };
export const PBKDF2_ITER = 150_000;

const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function newSalt() { return b64(crypto.getRandomValues(new Uint8Array(16))); }

export async function deriveKey(pin: string, salt: string, iterations = PBKDF2_ITER): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(salt), iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<EncBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { v: 1, iv: b64(iv), data: b64(new Uint8Array(ct)) };
}
/** Ném lỗi khi sai khoá hoặc dữ liệu bị sửa (AES-GCM có xác thực). */
export async function decryptJson<T>(key: CryptoKey, blob: EncBlob): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.data));
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

type Secret = Pick<Doc, "pages" | "fields" | "tags">;

/** Bản lưu xuống ổ: bỏ nội dung, thay bằng khối mã hoá. */
export async function sealDoc(doc: Doc, key: CryptoKey): Promise<Doc> {
  const { pages, fields, tags, enc: _old, ...meta } = doc;
  const secret: Secret = { pages, ...(fields ? { fields } : {}), ...(tags ? { tags } : {}) };
  return { ...meta, pages: [], enc: await encryptJson(key, secret) };
}
export async function openDoc(doc: Doc, key: CryptoKey): Promise<Doc> {
  if (!doc.enc) return doc;
  const { enc, ...meta } = doc;
  const s = await decryptJson<Secret>(key, enc);
  return { ...meta, ...s };
}
export const isSealed = (d: Doc) => !!d.enc;

// Khoá đang mở trong bộ nhớ (mất khi khoá lại / tải lại trang). Không bao giờ ghi xuống ổ.
let current: CryptoKey | null = null;
export const getVaultKey = () => current;
export const setVaultKey = (k: CryptoKey | null) => { current = k; };

// ——— G3-09: khoá dữ liệu ngẫu nhiên, bọc bằng PIN và bằng mã khôi phục ———
export type VaultWrap = { v: 1; pin: EncBlob; rec?: EncBlob; recSalt?: string };

export async function newDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
export async function wrapDataKey(dek: CryptoKey, kek: CryptoKey): Promise<EncBlob> {
  return encryptJson(kek, b64(new Uint8Array(await crypto.subtle.exportKey("raw", dek))));
}
/** Ném lỗi khi sai PIN/mã khôi phục. */
export async function unwrapDataKey(blob: EncBlob, kek: CryptoKey): Promise<CryptoKey> {
  const raw = await decryptJson<string>(kek, blob);
  return crypto.subtle.importKey("raw", unb64(raw), "AES-GCM", true, ["encrypt", "decrypt"]);
}
const RC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Mã khôi phục 24 ký tự (≈120 bit), dạng XXXX-XXXX-…; chỉ hiện một lần. */
export function newRecoveryCode() {
  const r = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(r, (b) => RC[b % 32]).join("").replace(/(.{4})(?=.)/g, "$1-");
}
export const normRecovery = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
/** Niêm phong rồi mở thử lại trước khi ghi: không bao giờ thay bản rõ bằng bản mã hỏng. */
export async function sealVerified(doc: Doc, key: CryptoKey): Promise<Doc> {
  const sealed = await sealDoc(doc, key);
  const back = await openDoc(sealed, key);
  if (JSON.stringify(back.pages) !== JSON.stringify(doc.pages)) throw new Error("Kiểm tra mã hoá không khớp");
  return sealed;
}
