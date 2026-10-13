// V13-B10: ngắm theo nhịp camera — một state khung ngắm, chỉ cập nhật khi đổi.
import { useCallback, useRef, useState } from "react";
import type { Quad } from "./db";

export type Tip = "none" | "closer" | "hold" | "found" | "blur" | "glare" | "tilt" | "dark";
export type ViewfinderState = { quad: Quad | null; tip: Tip; focus: number; focusScore: number };
export const VF_INITIAL: ViewfinderState = { quad: null, tip: "none", focus: 0, focusScore: 0 };

/** Lượng tử hoá quad (≈0,3% khung) để rung nhỏ không gây vẽ lại. */
const Q = 0.003;
function sameQuad(a: Quad | null, b: Quad | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  for (let i = 0; i < 4; i++) if (Math.abs(a[i][0] - b[i][0]) > Q || Math.abs(a[i][1] - b[i][1]) > Q) return false;
  return true;
}
/** Điểm nét hiển thị làm tròn theo bậc 10 — số nhảy liên tục không cần vẽ lại từng khung. */
const bucket = (n: number) => Math.round(n / 10) * 10;

/** Trả về đúng `prev` khi không có gì đổi đáng kể → React bỏ qua lần vẽ lại. */
export function mergeViewfinder(prev: ViewfinderState, patch: Partial<ViewfinderState>): ViewfinderState {
  const quad = patch.quad !== undefined ? patch.quad : prev.quad;
  const tip = patch.tip ?? prev.tip;
  const focus = patch.focus !== undefined ? Math.round(patch.focus * 20) / 20 : prev.focus; // bậc 5%
  const focusScore = patch.focusScore !== undefined ? bucket(patch.focusScore) : prev.focusScore;
  if (sameQuad(prev.quad, quad) && tip === prev.tip && focus === prev.focus && focusScore === prev.focusScore) return prev;
  return { quad: sameQuad(prev.quad, quad) ? prev.quad : quad, tip, focus, focusScore };
}

export function useViewfinder() {
  const [vf, setVf] = useState<ViewfinderState>(VF_INITIAL);
  const ref = useRef(vf); ref.current = vf;
  const update = useCallback((patch: Partial<ViewfinderState>) => setVf((p) => mergeViewfinder(p, patch)), []);
  return { vf, vfRef: ref, update };
}

type VideoLike = { requestVideoFrameCallback?: (cb: () => void) => number; cancelVideoFrameCallback?: (h: number) => void };
type Env = { raf: (cb: () => void) => number; caf: (h: number) => void; now: () => number };
const defaultEnv = (): Env => ({
  raf: (cb) => requestAnimationFrame(cb), caf: (h) => cancelAnimationFrame(h), now: () => performance.now(),
});

/**
 * Gọi `tick` theo khung hình thật của camera (requestVideoFrameCallback), dự phòng rAF.
 * `minGap` giữ nhịp tối thiểu giữa hai lần xử lý; tick tự bỏ khung khi Worker còn bận.
 */
export function onCameraFrames(video: VideoLike, tick: () => void, minGap = 66, env: Env = defaultEnv()): () => void {
  let alive = true, handle = 0, last = -Infinity;
  const useVfc = typeof video.requestVideoFrameCallback === "function";
  const loop = () => {
    if (!alive) return;
    const t = env.now();
    if (t - last >= minGap) { last = t; try { tick(); } catch { /* bỏ khung lỗi */ } }
    handle = useVfc ? video.requestVideoFrameCallback!(loop) : env.raf(loop);
  };
  handle = useVfc ? video.requestVideoFrameCallback!(loop) : env.raf(loop);
  return () => { alive = false; if (useVfc) video.cancelVideoFrameCallback?.(handle); else env.caf(handle); };
}
