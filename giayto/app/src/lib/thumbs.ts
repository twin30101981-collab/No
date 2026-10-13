import { useEffect, useState } from "react";
import { fpOf } from "./disk-pack";
import { type Doc, type Page, getDocs, saveDoc } from "./db";

/** Ảnh thu nhỏ (~200px) cho danh sách & dải trang: giải mã ảnh gốc nhiều MB làm cuộn rất giật.
 *  B14: mọi trang đều có ảnh thu nhỏ riêng (không chỉ trang đầu) — mở tài liệu nhiều trang
 *  không giải mã ảnh lớn cho dải trang/bảng sắp xếp. */
// S15f3b: dấu vân tay ổn định cho cả data URL lẫn object URL (blob: đổi mỗi lần nạp).
const key = (p: Page) => fpOf(p.src);
const mem = new Map<string, string>();
const listeners = new Set<() => void>();
const queue: string[] = []; // mỗi mục: "<docId>:<pageIndex>"
let running = false;

export const thumbValid = (p: Page) => !!p.thumb && p.thumbKey === key(p);
/** Khoá hàng đợi cho một trang của một tài liệu. */
export const thumbTaskKey = (docId: string, i: number) => `${docId}:${i}`;

export async function makeThumb(src: string, max = 200) {
  const blob = await (await fetch(src)).blob();
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  const url = c.toDataURL("image/jpeg", 0.7); c.width = 0; // ảnh thu nhỏ ~10 KB lưu cùng tài liệu nên giữ data URL; canvas giải phóng ngay (R1.4)
  return url;
}

const idle = () => new Promise<void>((r) => ("requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 500 }) : setTimeout(r, 16)));

async function run() {
  if (running) return; running = true;
  while (queue.length) {
    const [id, idx] = queue.shift()!.split(":");
    const i = Number(idx);
    const doc = getDocs().find((d) => d.id === id); const p = doc?.pages[i];
    if (!doc || !p || thumbValid(p)) continue;
    await idle();
    try {
      const t = await makeThumb(p.src); mem.set(key(p), t);
      listeners.forEach((l) => l());
      const fresh = getDocs().find((d) => d.id === id);
      const fp = fresh?.pages[i];
      if (fp && key(fp) === key(p))
        await saveDoc({ ...fresh, pages: fresh.pages.map((x, k) => (k === i ? { ...x, thumb: t, thumbKey: key(x) } : x)) }, false);
    } catch { /* giữ ảnh gốc nếu không tạo được */ }
  }
  running = false;
}

/** Trả ảnh thu nhỏ của trang i; nếu chưa có thì xếp hàng tạo lúc máy rảnh. */
export function usePageThumb(doc: Doc, i: number) {
  const p = doc.pages[i];
  const [, tick] = useState(0);
  const ready = p ? (thumbValid(p) ? p.thumb! : mem.get(key(p))) : undefined;
  useEffect(() => {
    if (!p || ready) return;
    const l = () => tick((n) => n + 1); listeners.add(l);
    const t = thumbTaskKey(doc.id, i);
    if (!queue.includes(t)) queue.push(t); void run();
    return () => { listeners.delete(l); };
  }, [doc.id, i, p, ready]);
  return ready;
}

/** Trả ảnh thu nhỏ của trang đầu; nếu chưa có thì xếp hàng tạo lúc máy rảnh. */
export function useThumb(doc: Doc) {
  return usePageThumb(doc, 0);
}
