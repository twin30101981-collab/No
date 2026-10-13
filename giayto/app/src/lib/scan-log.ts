/** Nhật ký lỗi quét/AI lưu cục bộ trên máy (tối đa 100 mục) để truy vết. Không chứa ảnh hay nội dung tài liệu. */
export type ScanLogEntry = {
  at: string; code: string; message: string; attempt?: number | undefined; ms?: number | undefined;
  scanSessionId?: string | undefined; device?: string | undefined; retryCount?: number | undefined;
  aiStatus?: string | undefined; ocrStatus?: string | undefined; imageResolution?: string | undefined;
  imageQualityScore?: number | undefined; blurScore?: number | undefined; skewAngle?: number | undefined; glareScore?: number | undefined;
  meta?: Record<string, unknown>;
  /** O9: số lần lặp lại của cùng lỗi (gộp trong DEDUP_MS). */
  count?: number | undefined; lastAt?: string | undefined;
};
/** Lỗi trùng mã + nội dung trong khoảng này được gộp thành một mục có đếm. */
export const DEDUP_MS = 60_000;

/** Thuần: thêm một mục, gộp nếu trùng mục gần nhất cùng mã/nội dung trong DEDUP_MS. */
export function addEntry(list: ScanLogEntry[], e: ScanLogEntry, max = 100): ScanLogEntry[] {
  const now = Date.parse(e.at);
  const i = list.findIndex((x) => x.code === e.code && x.message === e.message && now - Date.parse(x.lastAt ?? x.at) < DEDUP_MS);
  if (i >= 0) {
    const hit = list[i]!; const merged = { ...hit, count: (hit.count ?? 1) + 1, lastAt: e.at };
    return [merged, ...list.filter((_, k) => k !== i)].slice(0, max);
  }
  return [e, ...list].slice(0, max);
}
const KEY = "ghi-nhanh:scan-log";

export const newScanSession = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 18);

/** Mô tả thiết bị ngắn gọn (hệ điều hành + trình duyệt + màn hình), không lưu định danh cá nhân. */
export function deviceInfo() {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android [\d.]+/.exec(ua)?.[0] ?? (/Mac/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : "Khác");
  const br = /CriOS\/\d+|Chrome\/\d+/.exec(ua)?.[0] ?? /Firefox\/\d+/.exec(ua)?.[0] ?? (/Safari/.test(ua) ? "Safari" : "Khác");
  return `${os} · ${br} · ${screen.width}x${screen.height}@${devicePixelRatio}`;
}

export function logScan(e: Omit<ScanLogEntry, "at">) {
  try {
    const list: ScanLogEntry[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    localStorage.setItem(KEY, JSON.stringify(addEntry(list, { at: new Date().toISOString(), device: deviceInfo(), ...e })));
  } catch { /* bộ nhớ đầy hoặc bị chặn — bỏ qua */ }
}
export function readScanLog(): ScanLogEntry[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } }
export function clearScanLog() { try { localStorage.removeItem(KEY); } catch { /* */ } }
