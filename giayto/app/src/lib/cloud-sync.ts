import { cloudReady, NO_CLOUD } from "./auth";
import { fpOf } from "./disk-pack";
// G3-03: tải tài liệu + ảnh trang lên đám mây. Máy là nguồn chính; chỉ gửi phần đã đổi.
import type { Doc } from "./db";
import { docToRow, folderPaths, PAGE_BUCKET, pagesToRows } from "./cloud-map";

const KEY = "gn-sync-up";
export type SyncState = { docs: Record<string, number>; imgs: Record<string, string> };

export function readSyncState(uid: string): SyncState {
  try { return JSON.parse(localStorage.getItem(`${KEY}:${uid}`) ?? "") as SyncState; } catch { return { docs: {}, imgs: {} }; }
}
function writeSyncState(uid: string, s: SyncState) { localStorage.setItem(`${KEY}:${uid}`, JSON.stringify(s)); }

/** Dấu vân tay rẻ của ảnh data URL (độ dài + vài đoạn mẫu). */
/** S15f3b: object URL dùng dấu vân tay đã lưu kèm (disk-pack), data URL tính như cũ. */
export const fingerprint = fpOf;

/** Tài liệu cần gửi: mới hoặc sửa sau lần gửi trước. */
export function plan(docs: Doc[], st: SyncState): Doc[] {
  return docs.filter((d) => (st.docs[d.id] ?? -1) < d.updatedAt);
}

/** Ảnh cần gửi của một tài liệu (đường dẫn kho -> data URL). */
export function imagesToSend(uid: string, d: Doc, st: SyncState): { path: string; data: string; fp: string }[] {
  const rows = pagesToRows(uid, d); const out: { path: string; data: string; fp: string }[] = [];
  d.pages.forEach((p, i) => {
    const r = rows[i]!;
    for (const [path, data] of [[r.orig_path, p.orig], [r.src_path, p.src]] as const) {
      if (!data) continue; const fp = fingerprint(data);
      if (st.imgs[path] !== fp) out.push({ path, data, fp });
    }
  });
  return out;
}

async function toBlob(data: string): Promise<Blob> { return (await fetch(data)).blob(); }

export type Progress = (done: number, total: number) => void;

export type SyncOpts = { skip?: Set<string>; force?: Set<string> };

export async function uploadAll(docs: Doc[], onProgress?: Progress, opts: SyncOpts = {}) {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id; if (!uid) throw new Error("Hãy đăng nhập trước khi đồng bộ");
  const st = readSyncState(uid);
  const base = new Set(plan(docs, st).map((d) => d.id));
  // Tài liệu còn mã hoá (chưa mở PIN) không có trang — không tải lên kẻo xoá bản đám mây.
  const todo = docs.filter((d) => !d.enc).filter((d) => (base.has(d.id) && !opts.skip?.has(d.id)) || opts.force?.has(d.id));
  let done = 0; const failed: string[] = [];
  onProgress?.(0, todo.length);
  const folders = folderPaths(docs);
  if (folders.length) await supabase.from("folders").upsert(folders.map((path) => ({ path, user_id: uid })), { onConflict: "user_id,path", ignoreDuplicates: true });
  for (const d of todo) {
    try {
      for (const img of imagesToSend(uid, d, st)) {
        const { error } = await supabase.storage.from(PAGE_BUCKET).upload(img.path, await toBlob(img.data), { upsert: true, contentType: "image/jpeg" });
        if (error) throw error; st.imgs[img.path] = img.fp;
      }
      const { data: row, error } = await supabase.from("documents").upsert({ ...docToRow(d), user_id: uid }, { onConflict: "user_id,local_id" }).select("id").single();
      if (error || !row) throw error ?? new Error("upsert");
      const pages = pagesToRows(uid, d).map((p) => ({ ...p, edit: p.edit as never, user_id: uid, document_id: row.id }));
      if (pages.length) { const { error: e2 } = await supabase.from("pages").upsert(pages, { onConflict: "document_id,local_id" }); if (e2) throw e2; }
      const keep = pages.map((p) => p.local_id);
      let del = supabase.from("pages").delete().eq("document_id", row.id);
      if (keep.length) del = del.not("local_id", "in", `(${keep.map((k) => `"${k}"`).join(",")})`);
      await del;
      st.docs[d.id] = d.updatedAt; writeSyncState(uid, st);
    } catch { failed.push(d.name || d.id); }
    onProgress?.(++done, todo.length);
  }
  writeSyncState(uid, st);
  return { sent: todo.length - failed.length, failed, skipped: docs.length - todo.length };
}

// ===== G3-04: tải về máy khác, gộp thay đổi (bản mới nhất thắng) =====
export type RemoteDoc = { id: string; local_id: string; client_updated_at: number; updated_at: string };

/** Bản nào sửa sau cùng (giờ sửa trên máy) thì thắng. Trả về tài liệu cần tải về. */
export function pullPlan(local: Doc[], remote: RemoteDoc[]): RemoteDoc[] {
  const m = new Map(local.map((d) => [d.id, d.updatedAt]));
  return remote.filter((r) => {
    const t = r.client_updated_at || Date.parse(r.updated_at);
    const mine = m.get(r.local_id);
    return mine === undefined || mine < t;
  });
}

async function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
}

export async function downloadAll(local: Doc[], onProgress?: Progress, opts: SyncOpts = {}) {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const { supabase } = await import("@/integrations/supabase/client");
  const { rowToDoc } = await import("./cloud-map");
  const { saveDocs, loadDocs } = await import("./db");
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id; if (!uid) throw new Error("Hãy đăng nhập trước khi đồng bộ");
  const { data: rows, error } = await supabase.from("documents").select("*");
  if (error) throw error;
  const base = new Set(pullPlan(local, (rows ?? []) as RemoteDoc[]).map((r) => r.local_id));
  const todo = ((rows ?? []) as RemoteDoc[]).filter((r) => (base.has(r.local_id) && !opts.skip?.has(r.local_id)) || opts.force?.has(r.local_id));
  const st = readSyncState(uid);
  const failed: string[] = []; const got: Doc[] = []; let done = 0;
  onProgress?.(0, todo.length);
  const localById = new Map(local.map((d) => [d.id, d]));
  for (const r of todo) {
    const row = (rows ?? []).find((x) => x.id === r.id)!;
    try {
      const { data: pages, error: e1 } = await supabase.from("pages").select("*").eq("document_id", r.id);
      if (e1) throw e1;
      const doc = rowToDoc(row as never, (pages ?? []) as never);
      const old = localById.get(doc.id);
      for (const [i, p] of doc.pages.entries()) {
        const pr = [...(pages ?? [])].sort((a, b) => a.position - b.position)[i]!;
        const prev = old?.pages.find((x) => x.id === p.id);
        for (const k of ["orig", "src"] as const) {
          const path = k === "orig" ? pr.orig_path : pr.src_path;
          if (!path) continue;
          const prevData = prev?.[k];
          if (prevData && st.imgs[path] === fingerprint(prevData)) { p[k] = prevData; continue; }
          const { data: b, error: e2 } = await supabase.storage.from(PAGE_BUCKET).download(path);
          if (e2 || !b) { if (k === "src" && p.orig) { p.src = p.orig; continue; } throw e2 ?? new Error("ảnh"); }
          p[k] = await blobToDataUrl(b); st.imgs[path] = fingerprint(p[k]);
        }
        if (!p.src) p.src = p.orig;
        if (!p.orig) p.orig = p.src;
      }
      got.push(doc); st.docs[doc.id] = doc.updatedAt;
    } catch { failed.push(row.name || row.local_id); }
    onProgress?.(++done, todo.length);
  }
  if (got.length) { await saveDocs(got); await loadDocs(); }
  writeSyncState(uid, st);
  return { received: got.length, failed };
}

/** Đồng bộ hai chiều: tải về bản mới hơn trước, rồi gửi bản trên máy mới hơn. */
export async function syncAll(local: Doc[], onProgress?: (msg: string) => void, res: Resolutions = {}) {
  const keepCloud = new Set(Object.keys(res).filter((k) => res[k] === "cloud"));
  const keepLocal = new Set(Object.keys(res).filter((k) => res[k] === "local"));
  const down = await downloadAll(local, (d, t) => onProgress?.(t ? `Đang tải về ${d}/${t}` : "Đang kiểm tra…"), { skip: keepLocal, force: keepCloud });
  const { getDocs } = await import("./db");
  const up = await uploadAll(getDocs(), (d, t) => onProgress?.(t ? `Đang tải lên ${d}/${t}` : "Đang chuẩn bị…"), { skip: keepCloud, force: keepLocal });
  localStorage.setItem(LAST_KEY, String(Date.now()));
  return { received: down.received, sent: up.sent, failed: [...down.failed, ...up.failed] };
}

// ===== G3-05: màn hình đồng bộ, xung đột, xoá tài khoản =====
export type Resolutions = Record<string, "local" | "cloud">;
const LAST_KEY = "gn-sync-last";
export function lastSyncAt(): number { return Number(localStorage.getItem(LAST_KEY) || 0); }

export type SyncRow = { id: string; name: string; state: "same" | "local-only" | "cloud-only" | "local-newer" | "cloud-newer" | "conflict"; localAt?: number; cloudAt?: number };

/** Phân loại từng tài liệu. Xung đột = cả máy và mây đều sửa sau lần đồng bộ trước của tài liệu đó. */
export function classify(local: Doc[], remote: (RemoteDoc & { name?: string })[], st: SyncState): SyncRow[] {
  const out: SyncRow[] = []; const rm = new Map(remote.map((r) => [r.local_id, r]));
  for (const d of local) {
    const r = rm.get(d.id); rm.delete(d.id);
    if (!r) { out.push({ id: d.id, name: d.name, state: "local-only", localAt: d.updatedAt }); continue; }
    const c = r.client_updated_at || Date.parse(r.updated_at); const last = st.docs[d.id];
    let state: SyncRow["state"];
    if (c === d.updatedAt) state = "same";
    else if (last !== undefined && d.updatedAt > last && c > last) state = "conflict";
    else state = d.updatedAt > c ? "local-newer" : "cloud-newer";
    out.push({ id: d.id, name: d.name, state, localAt: d.updatedAt, cloudAt: c });
  }
  for (const r of rm.values()) out.push({ id: r.local_id, name: r.name || r.local_id, state: "cloud-only", cloudAt: r.client_updated_at || Date.parse(r.updated_at) });
  return out;
}

export async function cloudStatus(local: Doc[]): Promise<SyncRow[]> {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id; if (!uid) throw new Error("Hãy đăng nhập trước khi đồng bộ");
  const { data, error } = await supabase.from("documents").select("id,local_id,name,client_updated_at,updated_at");
  if (error) throw error;
  return classify(local, (data ?? []) as never, readSyncState(uid));
}

/** Xoá toàn bộ dữ liệu trên mây (giữ nguyên trên máy) và tài khoản. */
export async function deleteAccountData() {
  if (!cloudReady()) throw new Error(NO_CLOUD);
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id; if (!uid) throw new Error("Chưa đăng nhập");
  const paths: string[] = [];
  const { data: pg } = await supabase.from("pages").select("orig_path,src_path");
  for (const p of pg ?? []) for (const x of [p.orig_path, p.src_path]) if (x) paths.push(x);
  for (let i = 0; i < paths.length; i += 100) await supabase.storage.from(PAGE_BUCKET).remove(paths.slice(i, i + 100));
  await supabase.from("documents").delete().eq("user_id", uid);
  await supabase.from("folders").delete().eq("user_id", uid);
  localStorage.removeItem(`${KEY}:${uid}`); localStorage.removeItem(LAST_KEY);
  const { deleteMyAccount } = await import("./account.functions");
  await deleteMyAccount();
  await supabase.auth.signOut();
}
