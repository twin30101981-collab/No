import { describe, it, expect } from "vitest";
import { getImageCapture, disableImageCapture, withTimeout, burstCount } from "./fast-capture";

describe("S6 fast-capture", () => {
  it("reuses one ImageCapture per track", () => {
    let n = 0;
    class C { constructor() { n++; } takePhoto() { return Promise.resolve(new Blob()); } }
    const t = {} as MediaStreamTrack;
    const a = getImageCapture(t, C as never), b = getImageCapture(t, C as never);
    expect(a).toBe(b); expect(n).toBe(1);
  });
  it("falls back when unsupported or disabled", () => {
    expect(getImageCapture({} as MediaStreamTrack, undefined)).toBeNull();
    class C { takePhoto() { return Promise.resolve(new Blob()); } }
    const t = {} as MediaStreamTrack; getImageCapture(t, C as never); disableImageCapture(t);
    expect(getImageCapture(t, C as never)).toBeNull();
  });
  it("times out slow photos", async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toThrow("timeout");
    await expect(withTimeout(Promise.resolve(1), 10)).resolves.toBe(1);
  });
  it("bursts only when not sharp", () => {
    expect(burstCount("doc", "sharp")).toBe(1);
    expect(burstCount("doc", "focusing")).toBe(3);
    expect(burstCount("photo", "blur")).toBe(1);
  });
});

import { FrameRing } from "./fast-capture";
describe("V13-B03 FrameRing", () => {
  const f = (id: number, closed: number[]) => ({ id, close: () => closed.push(id) });
  it("giữ tối đa 3 khung, đóng khung cũ nhất", () => {
    const closed: number[] = []; const r = new FrameRing<ReturnType<typeof f>>(3);
    for (let i = 1; i <= 4; i++) r.push(f(i, closed), i, 0);
    expect(r.length).toBe(3); expect(closed).toEqual([1]);
  });
  it("lấy khung nét nhất và bỏ khung quá cũ", () => {
    const closed: number[] = []; const r = new FrameRing<ReturnType<typeof f>>(3, 1500);
    r.push(f(1, closed), 900, 0); r.push(f(2, closed), 50, 1000); r.push(f(3, closed), 80, 1900);
    expect(r.takeBest(2000)?.id).toBe(3);
    expect(r.length).toBe(2);
  });
  it("burst luôn 1 khi vòng đệm sẵn sàng", () => { expect(burstCount("doc", "focusing", true)).toBe(1); });
});
