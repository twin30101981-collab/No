/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * G4-22: save a document to the user's own Google Drive.
 * Each user connects their own Drive with Google sign-in (scope drive.file: the app only sees files it created).
 * Token lives in memory only; files go to a "Ghi Nhanh" folder. Pure helpers are exported for tests.
 */
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_FOLDER = "Ghi Nhanh";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export function driveClientId(): string {
  return (import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string | undefined)?.trim() ?? "";
}
export const driveReady = () => driveClientId().length > 0;

/** Drive search query for our folder (single quotes escaped). */
export function folderQuery(name = DRIVE_FOLDER) {
  return `name='${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
}

/** multipart/related body: JSON metadata + file bytes. */
export function multipartBody(meta: Record<string, unknown>, blob: Blob, boundary: string): Blob {
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`;
  return new Blob([head, blob, `\r\n--${boundary}--`], { type: `multipart/related; boundary=${boundary}` });
}

/** Map Drive API failures to Vietnamese messages. */
export function driveError(status: number, body = ""): string {
  if (status === 401) return "Phiên Google Drive đã hết hạn — bấm lại để kết nối.";
  if (status === 403 && /storageQuota|quota/i.test(body)) return "Google Drive đã hết dung lượng.";
  if (status === 403) return "Google Drive từ chối quyền ghi tệp.";
  if (status === 429 || status >= 500) return "Google Drive đang bận, thử lại sau ít phút.";
  return `Không lưu được lên Google Drive (mã ${status}).`;
}

type TokenResp = { access_token?: string; expires_in?: number; error?: string };
type GisWindow = Window & { google?: { accounts: { oauth2: { initTokenClient(c: { client_id: string; scope: string; callback: (r: TokenResp) => void; error_callback?: (e: { type?: string }) => void }): { requestAccessToken(o?: { prompt?: string }): void } } } } };

let token: { value: string; until: number } | null = null;
let gis: Promise<void> | null = null;

function loadGis() {
  const w = window as GisWindow;
  if (w.google?.accounts?.oauth2) return Promise.resolve();
  gis ??= new Promise<void>((ok, fail) => {
    const s = document.createElement("script");
    s.src = GIS_SRC; s.async = true;
    s.onload = () => ok();
    s.onerror = () => { gis = null; fail(new Error("Không tải được đăng nhập Google — kiểm tra mạng.")); };
    document.head.appendChild(s);
  });
  return gis;
}

export const driveConnected = () => !!token && token.until > Date.now();
export function driveDisconnect() { token = null; }

async function getToken(): Promise<string> {
  if (token && token.until > Date.now() + 30_000) return token.value;
  const id = driveClientId();
  if (!id) throw new Error("Chưa cấu hình kết nối Google Drive.");
  await loadGis();
  const g = (window as GisWindow).google!;
  return new Promise<string>((ok, fail) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: id, scope: DRIVE_SCOPE,
      callback: (r) => {
        if (!r.access_token) return fail(new Error(r.error === "access_denied" ? "Bạn chưa cho phép truy cập Google Drive." : "Không kết nối được Google Drive."));
        token = { value: r.access_token, until: Date.now() + (r.expires_in ?? 3600) * 1000 };
        ok(r.access_token);
      },
      error_callback: (e) => fail(new Error(e?.type === "popup_closed" ? "Đã đóng cửa sổ Google." : "Trình duyệt chặn cửa sổ đăng nhập Google.")),
    });
    client.requestAccessToken({ prompt: token ? "" : "consent" });
  });
}

async function api(path: string, init: RequestInit, f: typeof fetch = fetch) {
  const t = await getToken();
  const r = await f(`https://www.googleapis.com${path}`, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` } });
  if (!r.ok) { const b = await r.text().catch(() => ""); if (r.status === 401) token = null; throw new Error(driveError(r.status, b)); }
  return r.json() as Promise<any>;
}

async function folderId(): Promise<string> {
  const q = await api(`/drive/v3/files?q=${encodeURIComponent(folderQuery())}&fields=files(id)&spaces=drive`, {});
  const found = (q.files as { id: string }[] | undefined)?.[0]?.id;
  if (found) return found;
  const c = await api("/drive/v3/files?fields=id", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: DRIVE_FOLDER, mimeType: "application/vnd.google-apps.folder" }) });
  return c.id as string;
}

/** Upload a file; returns its Drive view link. Must be started from a click (opens Google popup on first use). */
export async function saveToDrive(blob: Blob, name: string): Promise<{ id: string; link: string }> {
  const parent = await folderId();
  const boundary = "gn" + Math.random().toString(36).slice(2);
  const r = await api("/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipartBody({ name, parents: [parent] }, blob, boundary),
  });
  return { id: r.id as string, link: (r.webViewLink as string) ?? `https://drive.google.com/file/d/${r.id}/view` };
}
