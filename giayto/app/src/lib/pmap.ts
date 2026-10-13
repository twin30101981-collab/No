/** S5: chạy song song tối đa `limit` việc, gọi `onDone` đúng thứ tự đầu vào ngay khi phần đầu dãy sẵn sàng. */
export async function pmapOrdered<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>, onDone: (r: R, i: number) => Promise<void> | void) {
  const res: (Promise<R> | undefined)[] = new Array(items.length);
  let next = 0;
  const slots: Promise<void>[] = [];
  const start = () => { const i = next++; const p = fn(items[i], i); res[i] = p; return p.then(() => undefined, () => undefined); };
  const n = Math.max(1, Math.min(limit, items.length));
  for (let k = 0; k < n; k++) slots.push(start());
  for (let i = 0; i < items.length; i++) {
    const r = await res[i]!;
    res[i] = undefined;
    if (next < items.length) void start();
    await onDone(r, i);
  }
  await Promise.all(slots);
}
