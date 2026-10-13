/**
 * G4-11 — Làm nét HD, bước 1: tải mô hình siêu phân giải nhẹ (chỉ khi người dùng bấm).
 *
 * - Tải theo luồng, báo tiến độ %, có hủy (AbortSignal), giới hạn dung lượng.
 * - Kiểm tra SHA-256 (nếu khai báo) trước khi dùng — tệp hỏng/bị tráo bị loại.
 * - Lưu vào Cache Storage "gn-models": lần sau dùng ngoại tuyến, không tải lại.
 * Chạy mô hình theo ô ảnh làm ở G4-12; ở đây chỉ trả về ArrayBuffer của mô hình.
 * Mọi phụ thuộc trình duyệt (fetch, caches, crypto) đều tiêm được để kiểm thử.
 */
export interface SrModelInfo { id: string; url: string; bytes: number; sha256?: string; scale: 2 | 4 }

/** Mô hình mặc định: ESRGAN rút gọn ×2 dạng ONNX (~5 MB). Đổi URL/sha256 khi chọn mô hình chính thức. */
export const DEFAULT_SR_MODEL: SrModelInfo = {
  id: "sr-x2-lite-v1",
  url: "/models/sr-x2-lite.onnx",
  bytes: 5_000_000,
  scale: 2,
};

export const MODEL_CACHE = "gn-models";
export const MAX_MODEL_BYTES = 40_000_000;

export interface LoadDeps {
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  caches?: Pick<CacheStorage, "open"> | null;
  digest?: (buf: ArrayBuffer) => Promise<ArrayBuffer>;
}
export interface LoadOpts { signal?: AbortSignal; onProgress?: (pct: number) => void }

export class SrModelError extends Error {
  constructor(public code: "network" | "too-large" | "checksum" | "aborted", message: string) { super(message); }
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const cacheKey = (m: SrModelInfo) => `https://gn.local/models/${m.id}`;

async function verify(m: SrModelInfo, buf: ArrayBuffer, digest: LoadDeps["digest"]) {
  if (!m.sha256 || !digest) return true;
  return hex(await digest(buf)) === m.sha256.toLowerCase();
}

/** Mô hình đã có trong bộ nhớ đệm chưa (để hiện "Đã tải" / "Tải ~5 MB"). */
export async function isModelCached(m: SrModelInfo = DEFAULT_SR_MODEL, deps: LoadDeps = {}) {
  const cs = deps.caches === undefined ? (globalThis.caches ?? null) : deps.caches;
  if (!cs) return false;
  return !!(await (await cs.open(MODEL_CACHE)).match(cacheKey(m)));
}

export async function loadSrModel(m: SrModelInfo = DEFAULT_SR_MODEL, opts: LoadOpts = {}, deps: LoadDeps = {}): Promise<ArrayBuffer> {
  const f = deps.fetch ?? globalThis.fetch.bind(globalThis);
  const cs = deps.caches === undefined ? (globalThis.caches ?? null) : deps.caches;
  const digest = deps.digest ?? (globalThis.crypto?.subtle ? (b: ArrayBuffer) => crypto.subtle.digest("SHA-256", b) : undefined);
  const cache = cs ? await cs.open(MODEL_CACHE) : null;

  const hit = await cache?.match(cacheKey(m));
  if (hit) {
    const buf = await hit.arrayBuffer();
    if (await verify(m, buf, digest)) { opts.onProgress?.(100); return buf; }
    await cache!.delete(cacheKey(m)); // bản lưu hỏng → tải lại
  }

  let res: Response;
  try { res = await f(m.url, opts.signal ? { signal: opts.signal } : {}); }
  catch (e) {
    if (opts.signal?.aborted) throw new SrModelError("aborted", "Đã hủy tải mô hình");
    throw new SrModelError("network", "Không tải được mô hình làm nét — kiểm tra mạng rồi thử lại");
  }
  if (!res.ok) throw new SrModelError("network", `Không tải được mô hình làm nét (mã ${res.status})`);
  const total = Number(res.headers.get("content-length")) || m.bytes;
  if (total > MAX_MODEL_BYTES) throw new SrModelError("too-large", "Mô hình quá lớn cho thiết bị này");

  const chunks: Uint8Array[] = []; let got = 0;
  const reader = res.body?.getReader();
  if (reader) {
    for (;;) {
      if (opts.signal?.aborted) { await reader.cancel(); throw new SrModelError("aborted", "Đã hủy tải mô hình"); }
      const { done, value } = await reader.read();
      if (done) break;
      got += value.length;
      if (got > MAX_MODEL_BYTES) { await reader.cancel(); throw new SrModelError("too-large", "Mô hình quá lớn cho thiết bị này"); }
      chunks.push(value); opts.onProgress?.(Math.min(99, Math.round((got / total) * 100)));
    }
  } else chunks.push(new Uint8Array(await res.arrayBuffer()));

  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0)); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  const buf = out.buffer;
  if (!(await verify(m, buf, digest))) throw new SrModelError("checksum", "Tệp mô hình bị lỗi khi tải — thử lại");
  await cache?.put(cacheKey(m), new Response(new Uint8Array(buf.slice(0)), { headers: { "content-type": "application/octet-stream" } }));
  opts.onProgress?.(100);
  return buf;
}
