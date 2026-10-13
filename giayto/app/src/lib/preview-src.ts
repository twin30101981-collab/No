import { useEffect, useState } from "react";
import { fpOf } from "./disk-pack";

/** S15g: xem trước ≤1200 px, dựng lười. Màn xem tài liệu không giải mã ảnh gốc nhiều MB;
 *  chỉ trang đang xem ±1 được thu nhỏ (object URL, LRU), trang xa không dựng. */
export const PREVIEW_MAX = 1200;
export const PREVIEW_KEEP = 8;

export function previewSize(w: number, h: number, max = PREVIEW_MAX) {
  const s = Math.min(1, max / Math.max(w, h, 1));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), scaled: s < 1 };
}

/** Trang i có cần dựng khi đang xem trang active không. */
export const inPreviewWindow = (i: number, active: number, radius = 1) => Math.abs(i - active) <= radius;

const cache = new Map<string, string>(); // fp → blob URL (thứ tự chèn = LRU)
const pending = new Map<string, Promise<string>>();

function touch(k: string, u: string) {
  cache.delete(k); cache.set(k, u);
  while (cache.size > PREVIEW_KEEP) {
    const [old, url] = cache.entries().next().value as [string, string];
    cache.delete(old); if (url.startsWith("blob:") && !url.endsWith("#orig")) URL.revokeObjectURL(url);
  }
}

async function build(src: string): Promise<string> {
  const blob = await (await fetch(src)).blob();
  const bmp = await createImageBitmap(blob);
  const sz = previewSize(bmp.width, bmp.height);
  if (!sz.scaled) { bmp.close(); return src; }
  const c = document.createElement("canvas"); c.width = sz.w; c.height = sz.h;
  const g = c.getContext("2d")!; g.imageSmoothingQuality = "high";
  g.drawImage(bmp, 0, 0, sz.w, sz.h); bmp.close();
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
  return out ? URL.createObjectURL(out) : src;
}

export function getPreview(src: string): Promise<string> {
  const k = fpOf(src); const hit = cache.get(k);
  if (hit) { touch(k, hit); return Promise.resolve(hit); }
  let p = pending.get(k);
  if (!p) {
    p = build(src).then((u) => { if (u !== src) touch(k, u); return u; }).catch(() => src).finally(() => pending.delete(k));
    pending.set(k, p);
  }
  return p;
}

/** Trả nguồn xem trước; null khi chưa cần dựng (enabled=false).
 *  B14: fallback (ảnh thu nhỏ riêng của trang) hiện ngay trong lúc dựng bản xem trước. */
export function usePreview(src: string, enabled: boolean, fallback?: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => cache.get(fpOf(src)) ?? null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    getPreview(src).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [src, enabled]);
  return url ?? fallback ?? null;
}
