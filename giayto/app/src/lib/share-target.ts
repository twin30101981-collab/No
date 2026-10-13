// G2-11: nhận tệp chia sẻ từ app khác (Web Share Target).
// sw.js nhận POST /share-target, cất tệp vào bộ nhớ đệm SHARE_CACHE rồi chuyển về /?shared=N.
export const SHARE_CACHE = "gn-share";
export const SHARE_ACCEPT = /^(image\/|application\/pdf$)/;

/** Lọc tệp nhận được: chỉ ảnh/PDF, bỏ tệp rỗng, tối đa 50 tệp. */
export function acceptShared(files: { type: string; size: number }[]) {
  return files.filter((f) => f.size > 0 && SHARE_ACCEPT.test(f.type)).slice(0, 50);
}

/** Đọc rồi xoá các tệp đã được service worker cất. */
export async function takeSharedFiles(): Promise<File[]> {
  if (typeof caches === "undefined") return [];
  const c = await caches.open(SHARE_CACHE);
  const keys = await c.keys();
  const out: File[] = [];
  for (const k of keys) {
    const res = await c.match(k);
    if (res) {
      const blob = await res.blob();
      const name = decodeURIComponent(res.headers.get("x-name") || "tep-chia-se");
      out.push(new File([blob], name, { type: blob.type || res.headers.get("content-type") || "" }));
    }
    await c.delete(k);
  }
  return out;
}
