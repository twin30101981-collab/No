/**
 * Hỏi đáp với tài liệu — lịch sử chat & hạn mức theo ngày (G3-11).
 * Lưu trên máy (localStorage), mỗi tài liệu một lịch sử, tối đa MAX_MESSAGES tin.
 * Hạn mức đếm theo ngày giờ máy (đổi ngày thì đặt lại).
 */

export type ChatMsg = {
  role: "user" | "ai";
  text: string;
  /** Trang được AI trích dẫn (chỉ với tin AI). */
  pages?: number[];
  at: number;
  error?: boolean;
};

export const MAX_MESSAGES = 60;
export const DAILY_LIMIT = 30;
const HIST_KEY = (docId: string) => `ghinhanh.chat.${docId}`;
const QUOTA_KEY = "ghinhanh.chat.quota";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const mem = new Map<string, string>();
const memStore: Store = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
function store(): Store {
  try { if (typeof localStorage !== "undefined") return localStorage; } catch { /* chế độ riêng tư */ }
  return memStore;
}

export function dayKey(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Cắt lịch sử, giữ các tin mới nhất. */
export function trimHistory(list: ChatMsg[], max = MAX_MESSAGES): ChatMsg[] {
  return list.length > max ? list.slice(list.length - max) : list;
}

export function loadHistory(docId: string, s: Store = store()): ChatMsg[] {
  try {
    const v = JSON.parse(s.getItem(HIST_KEY(docId)) ?? "[]");
    return Array.isArray(v) ? v.filter((m) => m && (m.role === "user" || m.role === "ai") && typeof m.text === "string") : [];
  } catch { return []; }
}

export function saveHistory(docId: string, list: ChatMsg[], s: Store = store()): ChatMsg[] {
  const t = trimHistory(list);
  try { s.setItem(HIST_KEY(docId), JSON.stringify(t)); } catch { /* đầy bộ nhớ: bỏ qua */ }
  return t;
}

export function clearHistory(docId: string, s: Store = store()) { s.removeItem(HIST_KEY(docId)); }

export type Quota = { day: string; used: number; limit: number; left: number };

export function getQuota(now = Date.now(), s: Store = store(), limit = DAILY_LIMIT): Quota {
  const day = dayKey(now);
  let used = 0;
  try {
    const v = JSON.parse(s.getItem(QUOTA_KEY) ?? "null");
    if (v && v.day === day && Number.isFinite(v.used)) used = Math.max(0, v.used);
  } catch { /* hỏng: đặt lại */ }
  return { day, used, limit, left: Math.max(0, limit - used) };
}

/** Ghi nhận một lượt hỏi. Trả về null khi đã hết hạn mức hôm nay. */
export function takeQuotaSlot(now = Date.now(), s: Store = store(), limit = DAILY_LIMIT): Quota | null {
  const q = getQuota(now, s, limit);
  if (q.left <= 0) return null;
  const used = q.used + 1;
  s.setItem(QUOTA_KEY, JSON.stringify({ day: q.day, used }));
  return { ...q, used, left: limit - used };
}

/** Hoàn lại lượt khi AI lỗi (không tính lượt hỏng). */
export function refundQuotaSlot(now = Date.now(), s: Store = store(), limit = DAILY_LIMIT) {
  const q = getQuota(now, s, limit);
  if (q.used > 0) s.setItem(QUOTA_KEY, JSON.stringify({ day: q.day, used: q.used - 1 }));
}

/** Tách câu trả lời thành phần chữ và nút trích dẫn [Trang N]. */
export function splitCitations(text: string): ({ t: "text"; v: string } | { t: "page"; v: number })[] {
  const out: ({ t: "text"; v: string } | { t: "page"; v: number })[] = [];
  const re = /\[Trang\s+(\d+)\]/gi;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
    out.push({ t: "page", v: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}
