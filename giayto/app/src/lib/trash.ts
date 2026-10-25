/** Thùng rác: tài liệu xóa mềm được giữ 30 ngày rồi tự xóa hẳn. */
export const TRASH_DAYS = 30;
const DAY = 86_400_000;

/** Số ngày còn lại trước khi tự xóa (0 = sẽ xóa ở lần mở app tới). */
export function daysLeft(deletedAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deletedAt + TRASH_DAYS * DAY - now) / DAY));
}
/** Id các tài liệu đã nằm trong thùng rác đủ 30 ngày. */
export function expiredIds(docs: { id: string; deletedAt?: number }[], now = Date.now()) {
  return docs.filter((d) => d.deletedAt && now - d.deletedAt >= TRASH_DAYS * DAY).map((d) => d.id);
}
export function leftLabel(deletedAt: number, now = Date.now()) {
  const n = daysLeft(deletedAt, now);
  return n <= 1 ? "Tự xóa trong hôm nay" : `Tự xóa sau ${n} ngày`;
}
