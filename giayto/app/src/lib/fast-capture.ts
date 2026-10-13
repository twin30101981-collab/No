// S6 – chụp nhanh: tái dùng ImageCapture theo track, timeout ngắn, chỉ burst khi chưa nét ổn định.
type IC = { takePhoto: () => Promise<Blob> };
type ICCtor = new (t: MediaStreamTrack) => IC;

export const PHOTO_TIMEOUT_MS = 1200;
const cache = new WeakMap<MediaStreamTrack, IC | null>();

/** Một ImageCapture cho mỗi track; null nếu thiết bị không hỗ trợ (vd iOS Safari) hoặc đã lỗi. */
export function getImageCapture(track: MediaStreamTrack, Ctor: ICCtor | undefined = (globalThis as unknown as { ImageCapture?: ICCtor }).ImageCapture): IC | null {
  if (cache.has(track)) return cache.get(track)!;
  let ic: IC | null = null;
  try { ic = Ctor ? new Ctor(track) : null; } catch { ic = null; }
  cache.set(track, ic);
  return ic;
}

/** Đánh dấu track không dùng được takePhoto → các lần sau đi thẳng khung hình video. */
export function disableImageCapture(track: MediaStreamTrack) { cache.set(track, null); }

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
  });
}

/** V13-B03 — Vòng đệm N khung ngắm gần nhất kèm điểm nét; bấm chụp lấy ngay tấm nét nhất. */
export type Closable = { close?: () => void };
export class FrameRing<F extends Closable> {
  private items: { frame: F; score: number; at: number }[] = [];
  constructor(readonly size = 3, readonly maxAgeMs = 1500) {}
  get length() { return this.items.length; }
  push(frame: F, score: number, at = performance.now()) {
    this.items.push({ frame, score, at });
    while (this.items.length > this.size) this.items.shift()!.frame.close?.();
  }
  /** Lấy ra (chuyển quyền sở hữu) khung nét nhất còn mới; khung khác vẫn trong vòng. */
  takeBest(now = performance.now()): F | null {
    let bi = -1;
    this.items.forEach((it, i) => { if (now - it.at <= this.maxAgeMs && (bi < 0 || it.score > this.items[bi].score)) bi = i; });
    return bi < 0 ? null : this.items.splice(bi, 1)[0].frame;
  }
  clear() { for (const it of this.items) it.frame.close?.(); this.items = []; }
}

/** Số ảnh burst: 1 khi FocusGate đã "sharp" hoặc đã có vòng đệm, 3 khi chưa đủ nét (ảnh thường/QR luôn 1). */
export function burstCount(mode: string, focus: string, ringReady = false): number {
  if (ringReady || mode === "photo" || mode === "qr") return 1;
  return focus === "sharp" ? 1 : 3;
}
