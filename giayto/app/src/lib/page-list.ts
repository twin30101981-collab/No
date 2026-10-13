// P6 – thao tác danh sách trang thuần (không phụ thuộc UI), giữ trang đang xem hợp lệ.
export type Result<T> = { pages: T[]; active: number };

const clamp = (i: number, n: number) => (n <= 0 ? 0 : Math.max(0, Math.min(n - 1, i)));

/** Dời trang `from` tới vị trí `to`; trang đang xem đi theo đúng trang đó. */
export function movePage<T>(pages: T[], from: number, to: number, active: number): Result<T> {
  const n = pages.length;
  if (from < 0 || from >= n) return { pages, active: clamp(active, n) };
  const t = clamp(to, n);
  if (t === from) return { pages, active: clamp(active, n) };
  const ps = [...pages];
  const [x] = ps.splice(from, 1);
  ps.splice(t, 0, x);
  let a = active;
  if (active === from) a = t;
  else if (from < active && t >= active) a = active - 1;
  else if (from > active && t <= active) a = active + 1;
  return { pages: ps, active: clamp(a, n) };
}

/** Xóa trang `i`; giữ trang đang xem (hoặc trang liền kề). */
export function removePage<T>(pages: T[], i: number, active: number): Result<T> {
  if (i < 0 || i >= pages.length) return { pages, active: clamp(active, pages.length) };
  const ps = pages.filter((_, k) => k !== i);
  const a = i < active ? active - 1 : active;
  return { pages: ps, active: clamp(a, ps.length) };
}

/** Chèn trang mới ngay sau `after` (‑1 = đầu); trang đang xem chuyển tới trang mới đầu tiên. */
export function insertPages<T>(pages: T[], added: T[], after: number): Result<T> {
  if (!added.length) return { pages, active: clamp(after, pages.length) };
  const at = Math.max(0, Math.min(pages.length, after + 1));
  return { pages: [...pages.slice(0, at), ...added, ...pages.slice(at)], active: at };
}

/** Nhân bản trang `i` (cần hàm tạo id mới), đặt ngay sau bản gốc. */
export function duplicatePage<T>(pages: T[], i: number, clone: (p: T) => T): Result<T> {
  if (i < 0 || i >= pages.length) return { pages, active: clamp(i, pages.length) };
  return insertPages(pages, [clone(pages[i])], i);
}

// ---------- R4.2: chọn nhiều & tiến độ ----------

/** Bật/tắt một id trong tập chọn. */
export function toggleId(sel: string[], id: string): string[] {
  return sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
}

/** Xoá mọi trang có id trong tập; giữ trang đang xem hợp lệ. */
export function removePages<T extends { id: string }>(pages: T[], ids: Set<string>, active: number): Result<T> {
  if (!ids.size) return { pages, active: clamp(active, pages.length) };
  const ps = pages.filter((p) => !ids.has(p.id));
  const removedBefore = pages.slice(0, active).filter((p) => ids.has(p.id)).length;
  return { pages: ps, active: clamp(active - removedBefore, ps.length) };
}

/** Nhân bản mọi trang có id trong tập (theo thứ tự hiện tại), đặt sau bản gốc. */
export function duplicatePages<T extends { id: string }>(pages: T[], ids: Set<string>, clone: (p: T) => T, active: number): Result<T> {
  if (!ids.size) return { pages, active: clamp(active, pages.length) };
  const ps: T[] = [];
  for (const p of pages) { ps.push(p); if (ids.has(p.id)) ps.push(clone(p)); }
  const addedBefore = pages.slice(0, active).filter((p) => ids.has(p.id)).length;
  return { pages: ps, active: clamp(active + addedBefore, ps.length) };
}

/** Phần trăm tiến độ 0–100; total 0 → 100 (không còn việc). */
export function progressPct(pending: number, total: number): number {
  if (total <= 0) return 100;
  const done = Math.max(0, total - Math.max(0, pending));
  return Math.round((done / total) * 100);
}
