// S7c: chạy fn trên từng phần tử với tối đa `limit` việc cùng lúc; tiêu thụ kết quả đúng thứ tự qua async iterator.
export async function* orderedPool<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): AsyncGenerator<R> {
  const n = Math.max(1, Math.floor(limit)), started: Promise<R>[] = [];
  const start = (i: number) => { if (i < items.length) { const p = fn(items[i], i); p.catch(() => {}); started[i] = p; } };
  for (let i = 0; i < Math.min(n, items.length); i++) start(i);
  for (let i = 0; i < items.length; i++) { const r = await started[i]; start(i + n); yield r; }
}
// B06: số làn xuất PDF co theo sức máy (RAM ≤ 4 GB → 1–2 làn).
import { machineLanes } from "./machine-lanes";
export function pdfLanes() {
  return machineLanes();
}
