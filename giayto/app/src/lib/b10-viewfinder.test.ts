import { describe, expect, it } from "vitest";
import { mergeViewfinder, onCameraFrames, VF_INITIAL, type ViewfinderState } from "./viewfinder";
import type { Quad } from "./db";

const q = (d = 0): Quad => [[0.1 + d, 0.1], [0.9, 0.1 + d], [0.9, 0.9], [0.1, 0.9]];

describe("B10 — khung ngắm một state", () => {
  it("trả lại đúng state cũ khi không đổi (không vẽ lại)", () => {
    const s = mergeViewfinder(VF_INITIAL, { quad: q(), tip: "found", focus: 1, focusScore: 120 });
    expect(mergeViewfinder(s, { quad: q(0.001), tip: "found", focus: 1, focusScore: 123 })).toBe(s);
    expect(mergeViewfinder(s, { tip: "hold" })).not.toBe(s);
  });

  it("số lần vẽ lại giảm ≥ 70% so với 4 setState mỗi nhịp", () => {
    let s: ViewfinderState = VF_INITIAL, renders = 0; const frames = 100;
    for (let i = 0; i < frames; i++) {
      const jitter = (i % 3) * 0.001; // rung tay nhỏ
      const n = mergeViewfinder(s, { quad: q(jitter), tip: i < 50 ? "found" : "hold", focus: i < 20 ? 0 : 1, focusScore: 200 + (i % 4) });
      if (n !== s) renders++; s = n;
    }
    const before = frames * 4; // V12: setQuad + setTip + setFocus + setFocusScore mỗi nhịp
    expect(1 - renders / before).toBeGreaterThanOrEqual(0.7);
  });

  it("dùng requestVideoFrameCallback khi có, giữ khoảng cách tối thiểu", () => {
    const cbs: (() => void)[] = []; let t = 0, ticks = 0;
    const video = { requestVideoFrameCallback: (cb: () => void) => cbs.push(cb), cancelVideoFrameCallback: () => {} };
    const stop = onCameraFrames(video, () => ticks++, 66, { raf: () => { throw new Error("không dùng rAF"); }, caf: () => {}, now: () => t });
    for (let i = 0; i < 30; i++) { t += 33; cbs[cbs.length - 1](); } // 30 khung ~30 fps ≈ 1 s
    expect(ticks).toBeGreaterThanOrEqual(14); expect(ticks).toBeLessThanOrEqual(16);
    stop(); const n = cbs.length; cbs[n - 1](); expect(cbs.length).toBe(n);
  });

  it("rơi về rAF khi trình duyệt không có requestVideoFrameCallback", () => {
    const cbs: (() => void)[] = []; let ticks = 0, t = 0;
    const stop = onCameraFrames({}, () => ticks++, 0, { raf: (cb) => cbs.push(cb), caf: () => {}, now: () => (t += 16) });
    cbs[0](); cbs[1](); expect(ticks).toBe(2); stop();
  });
});
