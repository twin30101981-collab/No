/** V11: xin trình duyệt giữ dữ liệu (IndexedDB) vĩnh viễn, không tự xoá khi máy thiếu dung lượng. */
type SM = { persisted?: () => Promise<boolean>; persist?: () => Promise<boolean> };
let asked: Promise<boolean> | null = null;

export async function ensurePersist(sm: SM | undefined = typeof navigator !== "undefined" ? (navigator.storage as SM | undefined) : undefined): Promise<boolean> {
  if (!sm?.persist) return false;
  try {
    if (sm.persisted && (await sm.persisted())) return true;
    return await sm.persist();
  } catch { return false; }
}

/** Chỉ hỏi một lần mỗi phiên; gọi sau lần lưu tài liệu đầu tiên (có tương tác người dùng). */
export function persistOnce(sm?: SM): Promise<boolean> {
  if (!asked) asked = ensurePersist(sm).then((ok) => { (globalThis as { __v11?: boolean }).__v11 = ok; return ok; });
  return asked;
}
export function _resetPersist() { asked = null; }
