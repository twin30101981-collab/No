// G4-03: gửi ảnh qua phòng ghép theo từng mẩu (tin nhắn thời gian thực có giới hạn cỡ). Phần chia/ghép thuần, dễ test.
export const CHUNK = 48_000; // ký tự base64 mỗi mẩu
export const MAX_IMAGE_CHARS = 6_000_000; // ~4,5MB, chặn ảnh quá lớn

export type Part = { id: string; i: number; n: number; data: string };

export function split(id: string, dataUrl: string, size = CHUNK): Part[] {
  const n = Math.max(1, Math.ceil(dataUrl.length / size));
  return Array.from({ length: n }, (_, i) => ({ id, i, n, data: dataUrl.slice(i * size, (i + 1) * size) }));
}

/** Ghép mẩu theo id; trả ảnh đầy đủ khi đủ mẩu. Bỏ mẩu lạ/sai/quá lớn; xóa ảnh dở sau `staleMs`. */
export class Assembler {
  private bufs = new Map<string, { n: number; got: (string | undefined)[]; count: number; at: number }>();
  constructor(private staleMs = 60_000) {}
  push(p: Part, now = Date.now()): { id: string; dataUrl: string } | null {
    for (const [k, b] of this.bufs) if (now - b.at > this.staleMs) this.bufs.delete(k);
    if (!p || typeof p.id !== "string" || !Number.isInteger(p.i) || !Number.isInteger(p.n) || p.n < 1 || p.i < 0 || p.i >= p.n || typeof p.data !== "string") return null;
    if (p.n * CHUNK > MAX_IMAGE_CHARS + CHUNK) return null;
    let b = this.bufs.get(p.id);
    if (!b) { b = { n: p.n, got: new Array(p.n), count: 0, at: now }; this.bufs.set(p.id, b); }
    if (b.n !== p.n) return null;
    b.at = now;
    if (b.got[p.i] === undefined) { b.got[p.i] = p.data; b.count++; }
    if (b.count < b.n) return null;
    this.bufs.delete(p.id);
    const dataUrl = b.got.join("");
    return dataUrl.startsWith("data:image/") ? { id: p.id, dataUrl } : null;
  }
  progress(id: string) { const b = this.bufs.get(id); return b ? b.count / b.n : null; }
}
