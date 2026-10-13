/** P3 – Cắt & tinh chỉnh (thuần): sắp lại 4 góc, kiểm khung hợp lệ, hút góc về mép dò được, nắn cạnh song song. Toạ độ chuẩn hoá 0..1. */
import type { Quad } from "./db";

type P = [number, number];
export const MIN_AREA = 0.05; // khung < 5% ảnh coi như kéo nhầm
export const MIN_ANGLE = 30; // góc trong < 30° → méo quá, nắn ra sẽ kéo giãn chữ
export const SNAP_DIST = 0.02; // thả tay cách góc dò được ≤ 2% → hút vào

const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Diện tích (shoelace, luôn dương). */
export function quadArea(q: Quad): number {
  let s = 0;
  for (let i = 0; i < 4; i++) s += q[i][0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * q[i][1];
  return Math.abs(s) / 2;
}

/** Sắp lại thứ tự ↖ ↗ ↘ ↙ (theo chiều kim đồng hồ quanh trọng tâm) — sửa khung chéo khi kéo góc vượt qua nhau. */
export function orderQuad(q: Quad): Quad {
  const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
  const pts = [...q].map((p) => [p[0], p[1]] as P).sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  // atan2 trong hệ y hướng xuống: tăng dần = chiều kim đồng hồ. Xoay để điểm có x+y nhỏ nhất (↖) đứng đầu.
  let k = 0;
  for (let i = 1; i < 4; i++) if (pts[i][0] + pts[i][1] < pts[k][0] + pts[k][1]) k = i;
  return [0, 1, 2, 3].map((i) => pts[(k + i) % 4]) as Quad;
}

export function isConvex(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const c = cross(q[i], q[(i + 1) % 4], q[(i + 2) % 4]);
    if (Math.abs(c) < 1e-9) return false;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

/** Góc trong nhỏ nhất (độ). */
export function minInnerAngle(q: Quad): number {
  let m = 180;
  for (let i = 0; i < 4; i++) {
    const a = q[(i + 3) % 4], o = q[i], b = q[(i + 1) % 4];
    const v1 = [a[0] - o[0], a[1] - o[1]], v2 = [b[0] - o[0], b[1] - o[1]];
    const c = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) || 1);
    m = Math.min(m, (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI);
  }
  return m;
}

export type QuadCheck = { ok: true } | { ok: false; reason: "cheo" | "nho" | "meo"; message: string };

/** Kiểm khung trước khi Áp dụng: không lõm/chéo, không quá nhỏ, không méo quá. */
export function checkQuad(q: Quad): QuadCheck {
  if (!isConvex(q)) return { ok: false, reason: "cheo", message: "Khung bị chéo hoặc lõm — kéo các góc về đúng 4 góc giấy" };
  if (quadArea(q) < MIN_AREA) return { ok: false, reason: "nho", message: "Khung quá nhỏ — hãy kéo rộng ra mép giấy" };
  if (minInnerAngle(q) < MIN_ANGLE) return { ok: false, reason: "meo", message: "Khung méo quá — chữ sẽ bị kéo giãn khi nắn" };
  return { ok: true };
}

/** Hút góc `i` về góc dò được gần nhất nếu trong `dist`. Trả nguyên khung nếu không có gì để hút. */
export function snapCorner(q: Quad, i: number, targets: readonly P[], dist = SNAP_DIST): Quad {
  const p = q[i];
  let best: P | null = null, bd = dist;
  for (const t of targets) {
    const d = Math.hypot(t[0] - p[0], t[1] - p[1]);
    if (d <= bd) { bd = d; best = t; }
  }
  if (!best) return q;
  return q.map((v, j) => (j === i ? [best![0], best![1]] : v)) as Quad;
}

/** Điểm hút: góc khung dò tự động + 4 góc ảnh. */
export function snapTargets(detected: Quad | null | undefined): P[] {
  const t: P[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  if (detected) for (const p of detected) t.push([p[0], p[1]]);
  return t;
}

/** Chuẩn hoá khung khi thả tay: sắp lại thứ tự nếu chéo do kéo vượt; kẹp trong 0..1. */
export function tidyQuad(q: Quad): Quad {
  const c = q.map((p) => [Math.min(1, Math.max(0, p[0])), Math.min(1, Math.max(0, p[1]))]) as Quad;
  return isConvex(c) ? c : (() => { const o = orderQuad(c); return isConvex(o) ? o : c; })();
}

/** P3.2 – Xoay mịn: xoay khung quanh trọng tâm theo pixel thật (ảnh W×H), giới hạn ±MAX_TILT. Nắn khung = xoay ảnh xuất, không cần sửa renderGeometry (TD-08). */
export const MAX_TILT = 5;
export const TILT_STEP = 0.5;
export function rotateQuad(q: Quad, deg: number, W: number, H: number): Quad {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const cx = q.reduce((t, p) => t + p[0], 0) / 4 * W, cy = q.reduce((t, p) => t + p[1], 0) / 4 * H;
  return q.map(([x, y]) => {
    const dx = x * W - cx, dy = y * H - cy;
    return [Math.min(1, Math.max(0, (cx + dx * c - dy * s) / W)), Math.min(1, Math.max(0, (cy + dx * s + dy * c) / H))];
  }) as Quad;
}
export const clampTilt = (t: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.round(t / TILT_STEP) * TILT_STEP));

/** P3.2 – Hút cạnh: nhận khung tinh chỉnh trên ảnh gốc chỉ cho 2 góc của cạnh vừa kéo, và chỉ khi mỗi góc dời ≤ `maxMove`. */
export const EDGE_SNAP_MAX = 0.03;
export function acceptEdgeRefine(q: Quad, refined: Quad, side: number, maxMove = EDGE_SNAP_MAX): Quad {
  const ids = [side, (side + 1) % 4];
  for (const i of ids) if (Math.hypot(refined[i][0] - q[i][0], refined[i][1] - q[i][1]) > maxMove) return q;
  const out = q.map((p, i) => (ids.includes(i) ? [refined[i][0], refined[i][1]] : p)) as Quad;
  return checkQuad(out).ok ? out : q;
}
