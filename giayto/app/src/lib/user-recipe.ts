// R3.3 / P8.6 – Học theo người dùng: ghi lựa chọn bộ lọc sửa tay theo loại tài liệu,
// lần sau tự áp công thức ưu tiên lựa chọn đó. Lõi thuần kiểm thử được; lưu localStorage.
import type { Filter } from "./db";

/** Bảng đếm lựa chọn: loại tài liệu → bộ lọc → số lần người dùng chọn tay. */
export type UserChoices = Record<string, Partial<Record<Filter, number>>>;

const KEY = "ghi-nhanh:user-recipes";
/** Cần ít nhất N lần chọn tay cùng một bộ lọc mới tin là sở thích. */
export const MIN_PICKS = 1;

/** Ghi một lựa chọn tay (bất biến). Bỏ qua loại rỗng. */
export function recordChoice(all: UserChoices, docKind: string | null | undefined, filter: Filter): UserChoices {
  if (!docKind) return all;
  const forKind = all[docKind] ?? {};
  return { ...all, [docKind]: { ...forKind, [filter]: (forKind[filter] ?? 0) + 1 } };
}

/** Bộ lọc người dùng hay chọn nhất cho loại này (≥ MIN_PICKS lần); hoà → không ưu tiên. */
export function preferredFilter(all: UserChoices, docKind: string | null | undefined): Filter | null {
  if (!docKind) return null;
  const forKind = all[docKind];
  if (!forKind) return null;
  let best: Filter | null = null;
  let bestN = 0;
  let tie = false;
  for (const [f, n] of Object.entries(forKind) as [Filter, number][]) {
    if (n > bestN) { best = f; bestN = n; tie = false; }
    else if (n === bestN) tie = true;
  }
  return best && !tie && bestN >= MIN_PICKS ? best : null;
}

export function loadChoices(): UserChoices {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as UserChoices) : {};
  } catch { return {}; }
}

export function saveChoices(all: UserChoices): void {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(all)); } catch { /* đầy bộ nhớ → bỏ qua */ }
}

/** Ghi một lựa chọn tay vào kho (đọc → cộng → lưu). */
export function learnChoice(docKind: string | null | undefined, filter: Filter): void {
  saveChoices(recordChoice(loadChoices(), docKind, filter));
}
