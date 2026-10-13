// CS-01: kho Blob riêng cho ẢNH GỐC — để "bấm chụp" chỉ cần ghi một Blob (không ghi lại cả bản ghi tài liệu) và xử lý sau.
// Kho riêng "ghi-nhanh-blobs" (v1), KHÔNG nâng phiên bản kho "ghi-nhanh": bản app cũ hoàn tác vẫn mở được kho tài liệu
// (nâng phiên bản IndexedDB làm bản cũ không còn mở được kho → mất đường lui). Cùng kiểu với ghi-nhanh-jobs / ghi-nhanh-journal.
// Chưa được luồng chụp dùng (CS-03 sẽ dùng); hiện chỉ có hạ tầng + kiểm thử.
export type BlobRecord = { key: string; blob: Blob; size: number; at: number };

let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open("ghi-nhanh-blobs", 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("blobs")) r.result.createObjectStore("blobs", { keyPath: "key" }); };
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbp = null; }; resolve(r.result); };
      r.onerror = () => reject(r.error);
    });
    dbp.catch(() => { dbp = null; }); // không giữ lời hứa đã bị từ chối (như HM-15)
  }
  return dbp;
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction("blobs", mode); const req = fn(t.objectStore("blobs"));
    t.oncomplete = () => resolve((req ? req.result : undefined) as T);
    t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
  });
}

/** Khoá mới cho ảnh gốc của một trang. */
export const newBlobKey = (pageId: string) => `orig:${pageId}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export async function putBlob(key: string, blob: Blob): Promise<void> { await run("readwrite", (s) => s.put({ key, blob, size: blob.size, at: Date.now() } satisfies BlobRecord)); }
export async function getBlob(key: string): Promise<Blob | undefined> { return (await run<BlobRecord | undefined>("readonly", (s) => s.get(key)))?.blob; }
export async function deleteBlobs(keys: string[]): Promise<void> { if (keys.length) await run("readwrite", (s) => { keys.forEach((k) => s.delete(k)); }); }
export async function listBlobKeys(): Promise<string[]> { return run<string[]>("readonly", (s) => s.getAllKeys() as IDBRequest<string[]>); }
/** Xoá ảnh gốc không còn trang nào trỏ tới (dọn khi xoá trang/tài liệu). Trả số bản ghi đã xoá. */
export async function pruneBlobs(inUse: Set<string>): Promise<number> {
  const orphans = (await listBlobKeys()).filter((k) => !inUse.has(k)); await deleteBlobs(orphans); return orphans.length;
}
