// B2b (O2, O3, O4, O10): bộ đệm dựng trang + giới hạn giải mã ảnh lớn.
// Thuần TypeScript, không phụ thuộc DOM để kiểm thử được.

/** LRU nhỏ: giữ tối đa `max` mục, gọi `onEvict` khi đẩy ra (để giải phóng canvas / object URL).
 * S15f: tuỳ chọn `sizeOf` + `maxBytes` – đẩy mục cũ nhất ra khi tổng dung lượng vượt trần (luôn giữ mục mới nhất). */
export class Lru<V> {
  private m = new Map<string, V>();
  private sz = new Map<string, number>();
  private total = 0;
  constructor(private max: number, private onEvict?: (v: V, k: string) => void, private sizeOf?: (v: V) => number, private maxBytes = Infinity) {}
  get size() { return this.m.size; }
  get bytes() { return this.total; }
  get(k: string) {
    const v = this.m.get(k);
    if (v !== undefined) { this.m.delete(k); this.m.set(k, v); }
    return v;
  }
  private drop(k: string) { this.total -= this.sz.get(k) ?? 0; this.sz.delete(k); this.m.delete(k); }
  set(k: string, v: V) {
    const old = this.m.get(k);
    if (old !== undefined) { this.drop(k); if (old !== v) this.onEvict?.(old, k); }
    this.m.set(k, v);
    const b = this.sizeOf ? Math.max(0, this.sizeOf(v)) : 0; this.sz.set(k, b); this.total += b;
    while (this.m.size > this.max || (this.total > this.maxBytes && this.m.size > 1)) {
      const [fk, fv] = this.m.entries().next().value as [string, V];
      this.drop(fk); this.onEvict?.(fv, fk);
    }
  }
  clear() { for (const [k, v] of this.m) this.onEvict?.(v, k); this.m.clear(); this.sz.clear(); this.total = 0; }
}

export const MB = 1024 * 1024;

/** Hàng đợi giới hạn số việc chạy cùng lúc (vd tối đa 2 ảnh 4096 px giải mã đồng thời). */
export function limiter(n: number) {
  let active = 0; let peak = 0; const waiting: (() => void)[] = [];
  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= n) await new Promise<void>((r) => waiting.push(r));
    active++; peak = Math.max(peak, active);
    try { return await fn(); } finally { active--; waiting.shift()?.(); }
  };
  return Object.assign(run, { stats: () => ({ active, peak, waiting: waiting.length }), resetPeak: () => { peak = active; } });
}

/** Khoá nhanh cho chuỗi ảnh rất dài (data URL nhiều MB): độ dài + FNV-1a trên ~4096 ký tự lấy mẫu đều. */
export function srcKey(s: string) {
  let h = 0x811c9dc5; const step = Math.max(1, Math.floor(s.length / 4096));
  for (let i = 0; i < s.length; i += step) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  for (let i = Math.max(0, s.length - 64); i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${s.length.toString(36)}-${(h >>> 0).toString(36)}`;
}

type GeoEdit = { quad?: number[][] | null | undefined; paper?: string | undefined; rotation: number; flatten?: boolean | undefined };
type ToneEdit = GeoEdit & { filter: string; brightness: number; contrast: number; tools?: Partial<Record<string, number>> | undefined; level?: number | undefined };

/** Khoá phần hình học (nắn/cắt/xoay) — đổi bộ lọc không làm đổi khoá này. */
export function geoKey(src: string, e: GeoEdit, max: number) {
  const q = e.quad ? e.quad.map((p) => p.map((v) => v.toFixed(5)).join(",")).join(";") : "-";
  return `${srcKey(src)}|${q}|${e.paper ?? "auto"}|${(((e.rotation % 360) + 360) % 360)}|${e.flatten ?? "auto"}|${max}`;
}
/** Khoá kết quả cuối = hình học + bộ lọc + độ sáng + tương phản. */
export function resultKey(src: string, e: ToneEdit, max: number) {
  return `${geoKey(src, e, max)}|${e.filter}|${e.brightness}|${e.contrast}|${["clarify", "whiten", "corners"].map((k) => e.tools?.[k] ?? 0).join("")}|${e.level ?? 100}`;
}

/** Tầng xem trước (cạnh dài) — chỉ dựng 3508 px khi lưu/xuất. */
export const PREVIEW_LONG = 1200;
