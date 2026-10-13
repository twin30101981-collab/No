// BL-01 / RS-20: sao lưu và khôi phục an toàn.
// Lỗi gốc: sao lưu ghi `docs: all` — bộ nhớ giữ ảnh dạng địa chỉ blob: (object URL, chỉ sống trong phiên trình duyệt) nên tệp
// chỉ chứa chuỗi "blob:http://…" chứ không có ảnh; khôi phục lại THAY THẾ toàn bộ thư viện bằng những địa chỉ chết đó.
// Nay: ảnh đổi về dữ liệu thật, mỗi tài liệu có tổng kiểm SHA-256, khôi phục kiểm cấu trúc và mặc định GỘP (QD-4).
import type { Doc, Page } from "./db";
import type { Library } from "./library";
import type { VaultWrap } from "./vault";
import { blobFor } from "./disk-pack";

export const BACKUP_VERSION = 4;
export type BackupIndexEntry = { id: string; pages: number; sha256: string };
export type BackupFile = {
  app: "ghi-nhanh"; version: number; createdAt?: number;
  index?: BackupIndexEntry[]; docs: Doc[]; vault?: VaultWrap; library?: Library; conversions?: unknown[];
};

export class BackupError extends Error {}

/** Nội dung ảnh trang → data URL. Blob lấy từ sổ đăng ký của app; không có thì thử đọc chính địa chỉ blob:. */
function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
}
async function portableUrl(u: string | undefined, memo: Map<string, string>, where: string): Promise<string | undefined> {
  if (!u || !u.startsWith("blob:")) return u;
  const hit = memo.get(u); if (hit) return hit;
  let b: Blob | undefined = blobFor(u);
  if (!b) { try { b = await (await fetch(u)).blob(); } catch { /* xử lý bên dưới */ } }
  if (!b || b.size === 0) throw new BackupError(`Không đọc được ảnh của ${where}`);
  const du = await blobToDataUrl(b); memo.set(u, du); return du;
}
/** Bản tài liệu mang theo được: mọi ảnh là dữ liệu thật (data URL), không còn địa chỉ blob:. */
export async function toPortableDoc(d: Doc): Promise<Doc> {
  if (d.enc || !d.pages?.length) return d;
  const memo = new Map<string, string>();
  const pages: Page[] = [];
  for (const [i, p] of d.pages.entries()) {
    const where = `“${d.name}” trang ${i + 1}`;
    const out: Page = { ...p, orig: (await portableUrl(p.orig, memo, where)) ?? "", src: (await portableUrl(p.src, memo, where)) ?? "" };
    if (p.thumb) out.thumb = (await portableUrl(p.thumb, memo, where)) ?? "";
    pages.push(out);
  }
  return { ...d, pages };
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Tạo tệp sao lưu. Ném BackupError nếu có ảnh không đọc được — không bao giờ trả tệp thiếu ảnh. */
export async function buildBackup(src: { docs: Doc[]; vault?: VaultWrap | undefined; library?: Library | undefined; conversions?: unknown[] | undefined }, now = Date.now()): Promise<Blob> {
  const parts: string[] = []; const index: BackupIndexEntry[] = [];
  for (const d of src.docs) {
    const p = await toPortableDoc(d);
    // ảnh trang chưa chỉnh dùng chung một chuỗi: ghi "=" cho src để tệp không nhân đôi dung lượng (khôi phục sẽ bung lại)
    const compact: Doc = { ...p, pages: p.pages.map((pg) => (pg.src && pg.src === pg.orig ? { ...pg, src: "=" } : pg)) };
    const s = JSON.stringify(compact);
    index.push({ id: d.id, pages: p.pages.length, sha256: await sha256(s) });
    parts.push(s);
  }
  const head: Omit<BackupFile, "docs"> = { app: "ghi-nhanh", version: BACKUP_VERSION, createdAt: now, index, ...(src.vault ? { vault: src.vault } : {}), ...(src.library ? { library: src.library } : {}), ...(src.conversions ? { conversions: src.conversions } : {}) };
  const headJson = JSON.stringify(head);
  return new Blob([headJson.slice(0, -1), ',"docs":[', parts.join(","), "]}"], { type: "application/json" });
}

export type ParsedBackup = { ok: true; data: BackupFile; docs: Doc[]; skipped: { name: string; why: string }[]; legacy: boolean } | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function docProblem(d: unknown): string | null {
  if (!isObj(d)) return "không phải tài liệu";
  if (typeof d["id"] !== "string" || !d["id"]) return "thiếu mã tài liệu";
  if (typeof d["name"] !== "string") return "thiếu tên";
  if (d["enc"]) return null; // tài liệu khoá PIN: nội dung nằm trong khối mã hoá
  if (!Array.isArray(d["pages"])) return "thiếu danh sách trang";
  for (const [i, p] of (d["pages"] as unknown[]).entries()) {
    if (!isObj(p) || typeof p["id"] !== "string" || typeof p["orig"] !== "string" || typeof p["src"] !== "string") return `trang ${i + 1} hỏng`;
    if (p["orig"].startsWith("blob:") || p["src"].startsWith("blob:")) return "tệp sao lưu cũ chỉ lưu địa chỉ ảnh tạm, không có ảnh thật";
    if (!p["orig"]) return `trang ${i + 1} không có ảnh`;
  }
  return null;
}

/** Đọc + kiểm tra tệp sao lưu: cấu trúc, phiên bản, tổng kiểm, ảnh thật. Tài liệu hỏng bị loại và liệt kê, không làm hỏng phần còn lại. */
export async function parseBackup(text: string): Promise<ParsedBackup> {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: "Tệp không đúng định dạng — hãy chọn tệp sao lưu tạo từ Ghi Nhanh." }; }
  if (!isObj(raw) || raw["app"] !== "ghi-nhanh" || !Array.isArray(raw["docs"])) return { ok: false, error: "Đây không phải tệp sao lưu của Ghi Nhanh." };
  const version = typeof raw["version"] === "number" ? raw["version"] : 0;
  if (version > BACKUP_VERSION) return { ok: false, error: "Tệp sao lưu tạo bằng bản Ghi Nhanh mới hơn — hãy cập nhật app rồi khôi phục lại." };
  const data = raw as unknown as BackupFile;
  const idx = new Map((Array.isArray(data.index) ? data.index : []).map((e) => [e.id, e]));
  const docs: Doc[] = []; const skipped: { name: string; why: string }[] = [];
  for (const d of data.docs as unknown[]) {
    const name = isObj(d) && typeof d["name"] === "string" ? d["name"] : "(không tên)";
    const why = docProblem(d); if (why) { skipped.push({ name, why }); continue; }
    const doc = d as unknown as Doc; const want = idx.get(doc.id);
    if (want && want.sha256 !== (await sha256(JSON.stringify(doc)))) { skipped.push({ name, why: "sai tổng kiểm (tệp bị sửa hoặc hỏng)" }); continue; }
    docs.push({ ...doc, pages: (doc.pages ?? []).map((p) => (p.src === "=" ? { ...p, src: p.orig } : p)) });
  }
  if (!docs.length && data.docs.length) return { ok: false, error: `Không có tài liệu nào khôi phục được: ${skipped[0]?.name ?? ""} — ${skipped[0]?.why ?? ""}.` };
  return { ok: true, data, docs, skipped, legacy: version < BACKUP_VERSION };
}

export type MergePlan = { toSave: Doc[]; added: number; updated: number; kept: number; skippedLocked: number };
/** GỘP (mặc định): thêm tài liệu mới; trùng mã thì giữ bản có `updatedAt` mới hơn; không xoá gì của máy. Tài liệu khoá PIN của khoá khác bị bỏ qua. */
export function planMerge(current: Doc[], incoming: Doc[], opts: { sameVault: boolean }): MergePlan {
  const cur = new Map(current.map((d) => [d.id, d])); const plan: MergePlan = { toSave: [], added: 0, updated: 0, kept: 0, skippedLocked: 0 };
  for (const d of incoming) {
    if (d.enc && !opts.sameVault) { plan.skippedLocked++; continue; }
    const have = cur.get(d.id);
    if (!have) { plan.toSave.push(d); plan.added++; }
    else if ((d.updatedAt ?? 0) > (have.updatedAt ?? 0)) { plan.toSave.push(d); plan.updated++; }
    else plan.kept++;
  }
  return plan;
}

/** Gộp thư mục/thẻ/bộ lọc nhanh: hợp của hai bên, không mất cái nào. */
export function mergeLibrary(a: Library, b: Library | undefined): Library {
  if (!b) return a;
  const tagNames = new Set(a.tags.map((t) => t.name.toLowerCase()));
  const qIds = new Set(a.quick.map((q) => q.id));
  return {
    folders: [...new Set([...a.folders, ...(b.folders ?? [])])],
    tags: [...a.tags, ...(b.tags ?? []).filter((t) => !tagNames.has(t.name.toLowerCase()))],
    quick: [...a.quick, ...(b.quick ?? []).filter((q) => !qIds.has(q.id))],
  };
}
