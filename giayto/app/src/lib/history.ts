/** Lịch sử chuyển đổi: lưu trong IndexedDB store "conversions"; giữ 30 mục gần nhất / tối đa 200 MB. */
import { useEffect, useState } from "react";
import { openDb, uid } from "./db";
import { buildReview, clean, isUnsure, type Review } from "./review";

export type UnsureCell = { row: number; col: number; value: string };
export type Conversion = {
  id: string; at: number; kind: string; sourceName: string; sourceBlob?: Blob;
  outputBlob: Blob; outputName: string;
  pages: { index: number; ai: boolean; unsure: UnsureCell[] }[];
  warnings: string[];
  /** Ghi chú thêm: tài liệu trong lô, tài liệu bị bỏ qua... */
  details?: string[];
  /** Dữ liệu đã sửa, để mở lại màn Xem lại. Không có với tệp xuất thẳng (PDF, tệp nén hàng loạt). */
  review?: Review;
};

export const MAX_ITEMS = 30;
export const MAX_BYTES = 200 * 1024 * 1024;
const STORE = "conversions";

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode); const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve((req ? req.result : undefined) as T);
    t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
  });
}

/** Tệp gốc tạo muộn (vd PDF từ trang tài liệu): chỉ chạy khi người dùng bấm Lưu. */
const lazySources = new Map<string, () => Promise<Blob>>();
export function registerSource(make: () => Promise<Blob>) { const id = uid(); lazySources.set(id, make); return id; }
async function takeSource(id?: string) {
  const make = id ? lazySources.get(id) : undefined; if (!make) return undefined;
  lazySources.delete(id!);
  try { return await make(); } catch (e) { console.error("history source", e); return undefined; }
}

const pagesOf = (r: Review) => (r.kind === "excel" ? r.sheets.map((s) => s.rows) : r.blocks.filter((b) => b.kind === "table").map((b) => b.rows));

/** Ô chưa chắc: còn dấu/nhìn như đọc nhầm ở bản cuối, hoặc ban đầu bị đánh dấu mà người dùng chỉ bỏ dấu, không sửa giá trị. */
export function unsureCells(before: Review, after: Review): Conversion["pages"] {
  const a = pagesOf(before), b = pagesOf(after);
  return b.map((rows, index) => {
    const unsure: UnsureCell[] = [];
    rows.forEach((r, row) => r.forEach((v, col) => {
      const orig = a[index]?.[row]?.[col] ?? "";
      if (isUnsure(v) || (isUnsure(orig) && clean(v) === clean(orig))) unsure.push({ row, col, value: clean(v) });
    }));
    return { index, ai: a[index]?.some((r) => r.some((v) => v.includes("⟦?⟧"))) ?? false, unsure };
  });
}

export const conversionSize = (c: Conversion) => (c.sourceBlob?.size ?? 0) + c.outputBlob.size + JSON.stringify(c.review ?? null).length * 2;

/** Chọn mục cần xoá: giữ mới nhất, tối đa MAX_ITEMS và MAX_BYTES. */
export function pickPrune(items: Pick<Conversion, "id" | "at">[], size: (id: string) => number) {
  const sorted = [...items].sort((x, y) => y.at - x.at); let total = 0;
  return sorted.filter((c, i) => { total += size(c.id); return i >= MAX_ITEMS || (i > 0 && total > MAX_BYTES); }).map((c) => c.id);
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function listConversions(): Promise<Conversion[]> {
  const all = await run<Conversion[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.at - a.at);
}

export async function deleteConversions(ids: string[]) {
  if (!ids.length) return;
  await run("readwrite", (s) => { ids.forEach((id) => s.delete(id)); });
  notify();
}

export async function recordConversion(before: Review, after: Review, outputBlob: Blob, outputName: string) {
  const src = before.source ?? {};
  const prev = src.historyId ? (await listConversions()).find((c) => c.id === src.historyId) : undefined;
  const { source: _s, ...review } = after;
  const item: Conversion = {
    id: uid(), at: Date.now(), kind: src.kind ?? prev?.kind ?? (after.kind === "word" ? "Word" : "Excel"),
    sourceName: src.name ?? prev?.sourceName ?? after.title, outputBlob, outputName,
    pages: unsureCells(before, after), warnings: after.note ? [after.note] : [], review: review as Review,
  };
  const details = src.details ?? prev?.details; if (details?.length) item.details = details;
  const blob = src.blob ?? (await takeSource(src.lazy)) ?? prev?.sourceBlob; if (blob) item.sourceBlob = blob;
  return store(item);
}

/** Tệp xuất thẳng không qua màn Xem lại (PDF, tệp nén hàng loạt): chỉ tải lại được, không sửa. */
export async function recordFile(o: { kind: string; sourceName: string; outputBlob: Blob; outputName: string; sourceBlob?: Blob | undefined; details?: string[]; warnings?: string[] }) {
  const item: Conversion = { id: uid(), at: Date.now(), kind: o.kind, sourceName: o.sourceName, outputBlob: o.outputBlob, outputName: o.outputName, pages: [], warnings: o.warnings ?? [] };
  if (o.sourceBlob) item.sourceBlob = o.sourceBlob;
  if (o.details?.length) item.details = o.details;
  return store(item);
}

async function store(item: Conversion) {
  await run("readwrite", (s) => { s.put(item); });
  const all = await listConversions();
  const sizes = new Map(all.map((c) => [c.id, conversionSize(c)]));
  await deleteConversions(pickPrune(all, (id) => sizes.get(id) ?? 0));
  notify();
  return item;
}

/** Sao lưu: không kèm tệp nguồn và tệp kết quả (tạo lại từ dữ liệu khi khôi phục). */
export async function historyForBackup() {
  return (await listConversions()).map(({ sourceBlob: _a, outputBlob: _b, ...c }) => c);
}
export async function restoreHistory(items: Omit<Conversion, "outputBlob" | "sourceBlob">[]) {
  if (!Array.isArray(items)) return;
  await run("readwrite", (s) => { for (const c of items) if (c?.id && c.review) s.put({ ...c, outputBlob: buildReview(c.review) }); });
  notify();
}

export function useConversions() {
  const [items, setItems] = useState<Conversion[] | null>(null);
  useEffect(() => {
    const load = () => { listConversions().then(setItems).catch(() => setItems([])); };
    load(); listeners.add(load); return () => { listeners.delete(load); };
  }, []);
  return items;
}
