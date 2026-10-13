import { describe, expect, it } from "vitest";
import { CancelledError, OcrQueue, ocrLanes, type OcrRunner } from "./ocr-queue";

function fake(delay = 5) {
  let aborted = 0;
  const runner = (): OcrRunner => ({
    run: (src, onP) => new Promise((ok) => { onP(0.5); setTimeout(() => ok(`T:${src}`), delay); }),
    abort: async () => { aborted++; },
  });
  return { runner, aborted: () => aborted };
}
const job = (pageId: string) => ({ docId: "d", pageId, label: pageId, src: pageId });

describe("OcrQueue", () => {
  it("runs in order and saves each result", async () => {
    const saved: string[] = []; const f = fake();
    const q = new OcrQueue(f.runner, (j, t) => { saved.push(`${j.pageId}=${t}`); });
    const r = await Promise.all(q.add([job("a"), job("b")]));
    expect(r).toEqual(["T:a", "T:b"]);
    expect(saved).toEqual(["a=T:a", "b=T:b"]);
    expect(q.snapshot()).toHaveLength(0);
  });
  it("does not queue the same page twice", () => {
    const q = new OcrQueue(fake().runner, () => {});
    q.add([job("a")]); q.add([job("a")]);
    expect(q.snapshot()).toHaveLength(1);
  });
  it("cancels queued and running jobs, stopping the worker", async () => {
    const saved: string[] = []; const f = fake(50);
    const q = new OcrQueue(f.runner, (j) => { saved.push(j.pageId); });
    const [a, b] = q.add([job("a"), job("b")]);
    await new Promise((r) => setTimeout(r, 5));
    expect(q.snapshot()[0]?.status).toBe("running");
    await q.cancel();
    await expect(a).rejects.toBeInstanceOf(CancelledError);
    await expect(b).rejects.toBeInstanceOf(CancelledError);
    expect(f.aborted()).toBe(1);
    expect(saved).toEqual([]);
    expect(await q.add([job("c")])[0]).toBe("T:c");
  });
  it("S7: runs 2 lanes in parallel, keeps results per page", async () => {
    let live = 0, peak = 0; const saved: string[] = [];
    const runner = (): OcrRunner => ({ run: (src) => new Promise((ok) => { live++; peak = Math.max(peak, live); setTimeout(() => { live--; ok(`T:${src}`); }, src === "a" ? 30 : 5); }), abort: async () => {} });
    const q = new OcrQueue(runner, (j, t) => { saved.push(`${j.pageId}=${t}`); }, 2);
    const t0 = Date.now();
    const r = await Promise.all(q.add([job("a"), job("b"), job("c"), job("d")]));
    expect(r).toEqual(["T:a", "T:b", "T:c", "T:d"]);
    expect(peak).toBe(2); expect(saved).toHaveLength(4);
    expect(Date.now() - t0).toBeLessThan(60);
  });
  it("S7: cancel one page stops only its lane", async () => {
    let aborted = 0;
    const runner = (): OcrRunner => ({ run: (src) => new Promise((ok) => setTimeout(() => ok(`T:${src}`), 30)), abort: async () => { aborted++; } });
    const q = new OcrQueue(runner, () => {}, 2);
    const [a, b] = q.add([job("a"), job("b")]);
    await new Promise((r) => setTimeout(r, 5));
    await q.cancel((j) => j.pageId === "a");
    await expect(a).rejects.toBeInstanceOf(CancelledError);
    expect(await b).toBe("T:b"); expect(aborted).toBe(1);
  });
  it("S7: lane count by cores", () => { expect(ocrLanes(2)).toBe(1); expect(ocrLanes(8)).toBe(2); });
});
