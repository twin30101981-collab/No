/** HM-03 (Q1=b): giới hạn số lần gọi AI theo khách (IP) mỗi giờ, để khoá AI của chủ app không bị dùng quá mức.
 *  Bộ đếm nằm trong bộ nhớ của từng máy chủ chạy app (không bền, không chia sẻ giữa các bản chạy song song) → chỉ là
 *  lớp chặn lạm dụng cơ bản, không phải hạn mức chính xác. Thuần, không phụ thuộc máy chủ nên kiểm thử được. */
export const AI_LIMIT_DEFAULT = 60;
export const AI_LIMIT_WINDOW_MS = 3_600_000;

export type Hit = { ok: true } | { ok: false; retryAfterSec: number };

export function createRateLimiter(o: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }) {
  const now = o.now ?? Date.now, maxKeys = o.maxKeys ?? 5000;
  const m = new Map<string, { start: number; count: number }>();
  return {
    hit(key: string): Hit {
      if (o.limit <= 0) return { ok: true };
      const t = now(); let e = m.get(key);
      if (!e || e.start + o.windowMs <= t) {
        e = { start: t, count: 0 }; m.delete(key); m.set(key, e);
        if (m.size > maxKeys) {
          for (const [k, v] of m) if (v.start + o.windowMs <= t) m.delete(k);
          while (m.size > maxKeys) m.delete(m.keys().next().value as string);
        }
      }
      if (e.count >= o.limit) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((e.start + o.windowMs - t) / 1000)) };
      e.count++; return { ok: true };
    },
    size: () => m.size,
  };
}

/** Định danh khách: IP do Cloudflare đặt (không giả được) → x-real-ip → x-forwarded-for. Không xác định được → null (không giới hạn). */
export function clientKey(h?: Headers | null): string | null {
  if (!h) return null;
  const ip = h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip || null;
}

/** Biến môi trường AI_RATE_LIMIT_PER_HOUR: số lần/giờ; 0 = tắt; thiếu/sai → mặc định. */
export function limitFromEnv(v: string | undefined): number {
  if (v === undefined || v.trim() === "") return AI_LIMIT_DEFAULT;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : AI_LIMIT_DEFAULT;
}

/** Cùng dạng {ok:false, code, message} mà giao diện đã xử lý cho mọi lỗi AI. Tiền tố "Hết lượt AI" để classifyAiFailure nhận ra. */
export function limitedFail(retryAfterSec: number) {
  const min = Math.max(1, Math.ceil(retryAfterSec / 60));
  return { ok: false as const, code: 429, message: `Hết lượt AI trong giờ này. Hãy thử lại sau khoảng ${min} phút. Quét, cắt, xuất PDF vẫn dùng bình thường.` };
}
