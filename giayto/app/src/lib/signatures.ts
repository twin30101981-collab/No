import { useSyncExternalStore } from "react";
import { loadImg } from "@/lib/image";
import { canvasToPageUrl } from "@/lib/canvas-url";

/** Saved signature: transparent PNG trimmed to the ink. Kept in localStorage (small, device-only). */
export type Signature = { id: string; src: string; w: number; h: number; createdAt: number };
const KEY = "ghinhanh.signatures"; export const MAX_SIGNATURES = 8;

let cache: Signature[] | null = null; const subs = new Set<() => void>();
function read(): Signature[] {
  if (cache) return cache;
  try { cache = typeof localStorage === "undefined" ? [] : JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { cache = []; }
  return cache!;
}
function write(list: Signature[]) {
  cache = list;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { throw new Error("Bộ nhớ máy đầy — xóa bớt chữ ký cũ rồi thử lại."); }
  subs.forEach((f) => f());
}
const EMPTY: Signature[] = [];
export function useSignatures() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, read, () => EMPTY);
}
export function addSignature(s: Omit<Signature, "id" | "createdAt">) {
  const sig = { ...s, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() };
  write([sig, ...read()].slice(0, MAX_SIGNATURES)); return sig;
}
export function removeSignature(id: string) { write(read().filter((s) => s.id !== id)); }

/** Bounding box of pixels with alpha > threshold in RGBA data; null when blank. */
export function inkBox(data: Uint8ClampedArray, w: number, h: number, thr = 8) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > thr) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Trim a drawn canvas to its ink (+padding). Returns null if nothing was drawn. */
export function trimCanvas(c: HTMLCanvasElement, pad = 6) {
  const ctx = c.getContext("2d")!; const b = inkBox(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
  if (!b) return null;
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  const w = Math.min(c.width - x, b.w + pad * 2), h = Math.min(c.height - y, b.h + pad * 2);
  const o = document.createElement("canvas"); o.width = w; o.height = h;
  o.getContext("2d")!.drawImage(c, x, y, w, h, 0, 0, w, h);
  const src = o.toDataURL("image/png"); o.width = 0; // chữ ký nhỏ, giữ data URL vì lưu localStorage
  return { src, w, h };
}

/** Placement on page as fractions of page width/height. */
export type Placement = { x: number; y: number; w: number; h: number };

/** Keep a placement inside the page and its width within [min, 1]; aspect is preserved via `ratio` (h/w in page fractions). */
export function clampPlacement(p: Placement, ratio: number, min = 0.06): Placement {
  const w = Math.min(1, Math.max(min, p.w)); let h = w * ratio;
  let ww = w; if (h > 1) { h = 1; ww = h / ratio; }
  return { w: ww, h, x: Math.min(1 - ww, Math.max(0, p.x)), y: Math.min(1 - h, Math.max(0, p.y)) };
}

/** Draw signatures onto a page; returns a registered JPEG object URL (R1.4: không còn data URL). */
export async function applySignatures(base: string, items: { src: string; at: Rotated }[]) {
  const page = await loadImg(base);
  const c = document.createElement("canvas"); c.width = page.naturalWidth; c.height = page.naturalHeight;
  const ctx = c.getContext("2d")!; ctx.drawImage(page, 0, 0);
  for (const it of items) {
    const s = await loadImg(it.src); const w = it.at.w * c.width, h = it.at.h * c.height;
    ctx.save(); ctx.translate(it.at.x * c.width + w / 2, it.at.y * c.height + h / 2); ctx.rotate(it.at.r ?? 0);
    ctx.drawImage(s, -w / 2, -h / 2, w, h); ctx.restore();
  }
  return canvasToPageUrl(c, "image/jpeg", 0.92);
}

/** Placement may carry a rotation (radians, around its centre). */
export type Rotated = Placement & { r?: number | undefined };

/** Keep a free (any-aspect) box inside the page; width/height each within [min, 1]. */
export function clampBox<T extends Rotated>(p: T, min = 0.03, aspect = 1.414): T {
  let w = Math.min(1, Math.max(min, p.w)), h = Math.min(1, Math.max(min, p.h));
  // Khi xoay: giữ cả hình bao đã xoay trong trang (aspect = cao/rộng trang).
  const c = Math.abs(Math.cos(p.r ?? 0)), s = Math.abs(Math.sin(p.r ?? 0));
  let bw = c * w + s * h * aspect, bh = (s * w) / aspect + c * h;
  const k = Math.min(1, 1 / bw, 1 / bh); if (k < 1) { w *= k; h *= k; bw *= k; bh *= k; }
  const cx = Math.min(1 - bw / 2, Math.max(bw / 2, p.x + p.w / 2)), cy = Math.min(1 - bh / 2, Math.max(bh / 2, p.y + p.h / 2));
  return { ...p, w, h, x: cx - w / 2, y: cy - h / 2 };
}

export type Handle = "n" | "s" | "e" | "w" | "se";
/** Edge handles stretch one axis independently; the corner handle keeps the current aspect. dx/dy are page fractions. */
export function resizeBy<T extends Placement>(at: T, handle: Handle, dx: number, dy: number, min = 0.03): T {
  let { x, y, w, h } = at;
  if (handle === "e") w = Math.max(min, w + dx);
  else if (handle === "w") { const nw = Math.max(min, w - dx); x += w - nw; w = nw; }
  else if (handle === "s") h = Math.max(min, h + dy);
  else if (handle === "n") { const nh = Math.max(min, h - dy); y += h - nh; h = nh; }
  else { const k = at.h / at.w; let nw = Math.max(min, w + Math.max(dx, dy / k)); nw = Math.min(nw, 1 - x, (1 - y) / k); w = Math.max(min, nw); h = w * k; } // góc: không đẩy vị trí, dừng ở mép phải/đáy
  return clampBox({ ...at, x, y, w: Math.min(1, w), h: Math.min(1, h) }, min);
}

/** Two-finger gesture: scale around the box centre (aspect kept) and add rotation. */
export function pinchBy<T extends Rotated>(at: T, scale: number, dAngle: number, min = 0.03, aspect = 1.414): T {
  const k = at.h / at.w; let w = Math.max(min, at.w * scale), h = w * k;
  if (w > 1) { w = 1; h = k; } if (h > 1) { h = 1; w = 1 / k; }
  const cx = at.x + at.w / 2, cy = at.y + at.h / 2;
  return clampBox({ ...at, w, h, x: cx - w / 2, y: cy - h / 2, r: (at.r ?? 0) + dAngle }, min, aspect);
}

/** Remove isolated alpha specks (connected components smaller than `minArea` px) — clean transparent edges. */
export function despeckleAlpha(d: Uint8ClampedArray, w: number, h: number, minArea = 12, thr = 24) {
  const lab = new Int32Array(w * h); const stack: number[] = []; let removed = 0;
  for (let s = 0; s < w * h; s++) {
    if (lab[s] || d[s * 4 + 3] <= thr) continue;
    const comp: number[] = []; stack.push(s); lab[s] = 1;
    while (stack.length) {
      const i = stack.pop()!; comp.push(i); const x = i % w, y = (i / w) | 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox, ny = y + oy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (!lab[j] && d[j * 4 + 3] > thr) { lab[j] = 1; stack.push(j); }
      }
    }
    if (comp.length < minArea) for (const i of comp) { d[i * 4 + 3] = 0; removed++; }
  }
  for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] <= thr) d[i * 4 + 3] = 0; // faint paper haze → fully transparent
  return removed;
}
