/** S4d: trang lưu xuống IndexedDB dạng Blob nhị phân (nhỏ hơn base64 ~25%); trong bộ nhớ vẫn là data URL.
 *  Dữ liệu cũ (chuỗi) vẫn đọc được và tự chuyển ở lần lưu kế. */
import type { Doc, Page } from "./db";

type DiskPage = Page & { origB?: Blob; srcB?: Blob; origFp?: string; srcFp?: string };

/** Dấu vân tay giống cloud-sync.fingerprint (tính trên data URL) — lưu kèm Blob để object URL vẫn so được. */
export function fpOf(s: string): string {
  if (s.startsWith("blob:")) { const f = fps.get(s); if (f) return f; }
  let h = 2166136261; const step = Math.max(1, Math.floor(s.length / 4096));
  for (let i = 0; i < s.length; i += step) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${s.length}:${(h >>> 0).toString(36)}`;
}
const fps = new Map<string, string>();

function toBlob(u: string): Blob | null {
  if (!u.startsWith("data:") || !u.includes(";base64,")) return null;
  const i = u.indexOf(","); const raw = atob(u.slice(i + 1));
  const a = new Uint8Array(raw.length); for (let k = 0; k < raw.length; k++) a[k] = raw.charCodeAt(k);
  return new Blob([a], { type: u.slice(5, i).replace(";base64", "") || "image/jpeg" });
}
/** S15f3b: ảnh nạp từ kho giữ dạng object URL (không giải base64 vào RAM). Sổ đăng ký URL→Blob để
 *  packDoc ghi lại được nhị phân, và để thu hồi URL khi xoá tài liệu. */
const reg = new Map<string, Blob>();
export const blobFor = (u: string) => reg.get(u);
function objUrl(b: Blob, fp: string): string {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return "";
  const u = URL.createObjectURL(b); reg.set(u, b); fps.set(u, fp); return u;
}
/** R1.3: nhận Blob mới (vd. từ canvas.toBlob) thành object URL đã đăng ký — packDoc ghi lại được, revokeDoc thu hồi được. */
export function adoptBlob(b: Blob): string {
  return objUrl(b, `${b.size}:${b.type}:${Date.now().toString(36)}`);
}
/** Thu hồi object URL của các trang (gọi khi xoá tài liệu). */
export function revokeDoc(d: Pick<Doc, "pages"> | undefined, keep: Set<string> = new Set()) {
  for (const p of d?.pages ?? []) for (const u of [p.orig, p.src]) if (u && reg.has(u) && !keep.has(u)) { URL.revokeObjectURL(u); reg.delete(u); fps.delete(u); }
}
/** Đổi object URL về data URL (cho niêm phong/khoá, nơi phải giữ ảnh trong chuỗi). */
export async function inlineDoc(d: Doc): Promise<Doc> {
  if (!d.pages?.some((p) => reg.has(p.orig) || reg.has(p.src))) return d;
  const f = async (u: string) => { const b = reg.get(u); return b ? toUrl(b) : u; };
  return { ...d, pages: await Promise.all(d.pages.map(async (p) => ({ ...p, orig: await f(p.orig), src: await f(p.src) }))) };
}
const asBlob = (u: string) => (u.startsWith("blob:") ? reg.get(u) ?? null : toBlob(u));
function toUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b); });
}

export function packDoc(d: Doc): Doc {
  if (d.enc || !d.pages?.length) return d;
  return { ...d, pages: d.pages.map((p) => {
    const ob = asBlob(p.orig); const out: DiskPage = { ...p };
    if (ob) { out.origB = ob; out.origFp = fpOf(p.orig); out.orig = ""; }
    if (p.src === p.orig && ob) { out.src = "="; }
    else { const sb = asBlob(p.src); if (sb) { out.srcB = sb; out.srcFp = fpOf(p.src); out.src = ""; } }
    return out;
  }) };
}

export async function unpackDoc(d: Doc): Promise<Doc> {
  const pages = d.pages as DiskPage[] | undefined;
  if (!pages?.some((p) => p.origB || p.srcB)) return d;
  return { ...d, pages: await Promise.all(pages.map(async ({ origB, srcB, origFp, srcFp, ...p }) => {
    // Bản ghi cũ chưa có dấu vân tay: giải base64 một lần để tính (giữ đồng bộ đám mây khỏi tải lại).
    const conv = async (b: Blob, fp?: string) => {
      const f = fp ?? fpOf(await toUrl(b));
      return objUrl(b, f) || toUrl(b);
    };
    const orig = origB ? await conv(origB, origFp) : p.orig;
    const src = p.src === "=" ? orig : srcB ? await conv(srcB, srcFp) : p.src;
    return { ...p, orig, src };
  })) };
}

/** Số byte thật của ảnh trang: blob: lấy từ Blob đã đăng ký, data: tính từ base64. */
export function srcBytes(u: string | undefined): number {
  if (!u) return 0;
  if (u.startsWith("blob:")) return reg.get(u)?.size ?? 0;
  const i = u.indexOf(",");
  if (u.startsWith("data:") && i > 0) { const b = u.slice(i + 1); return u.slice(0, i).includes(";base64") ? Math.floor(b.length * 3 / 4) - (b.endsWith("==") ? 2 : b.endsWith("=") ? 1 : 0) : b.length; }
  return u.length;
}

/** B05: sau khi lưu, đổi data URL của trang thành object URL để bộ nhớ không giữ chuỗi base64 ảnh.
 *  Dấu vân tay tính trên data URL gốc nên đồng bộ đám mây không thấy khác. Tài liệu mã hoá giữ nguyên. */
export function blobifyDoc(d: Doc): Doc {
  if (d.enc || !d.pages?.some((p) => p.orig?.startsWith("data:") || p.src?.startsWith("data:"))) return d;
  const memo = new Map<string, string>();
  const f = (u: string) => {
    if (!u?.startsWith("data:")) return u;
    const hit = memo.get(u); if (hit) return hit;
    const b = toBlob(u); const o = b ? objUrl(b, fpOf(u)) : "";
    const r = o || u; memo.set(u, r); return r;
  };
  return { ...d, pages: d.pages.map((p) => ({ ...p, orig: f(p.orig), src: f(p.src) })) };
}
