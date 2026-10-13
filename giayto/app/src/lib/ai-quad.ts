/**
 * Validate paper corners returned by the AI model (0–1000 coordinates, any order)
 * into a normalized TL,TR,BR,BL quad. Pure, so a bad answer never reaches the crop.
 */
import type { Quad } from "./db";

export type AiCorners = { found: boolean; corners: { x: number; y: number }[]; confidence: number };

const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

export function orderQuad(pts: [number, number][]): Quad {
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
  const sorted = [...pts].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  // clockwise in screen coords starting at the point with smallest x+y (top-left)
  let start = 0; sorted.forEach((p, i) => { if (p[0] + p[1] < sorted[start][0] + sorted[start][1]) start = i; });
  return [0, 1, 2, 3].map((k) => sorted[(start + k) % 4]) as Quad;
}

export function quadArea(q: Quad) {
  let s = 0; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}

export function isConvex(q: Quad) {
  const signs = q.map((_, i) => Math.sign(cross(q[i], q[(i + 1) % 4], q[(i + 2) % 4])));
  return signs.every((s) => s !== 0 && s === signs[0]);
}

/** Returns a usable quad or null (not found, unsure, off-image, too small, self-crossing). */
export function parseAiQuad(r: AiCorners | null | undefined, minConfidence = 0.4): Quad | null {
  if (!r || !r.found || r.confidence < minConfidence || r.corners?.length !== 4) return null;
  const pts: [number, number][] = [];
  for (const c of r.corners) {
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || c.x < -150 || c.y < -150 || c.x > 1150 || c.y > 1150) return null;
    pts.push([Math.min(1, Math.max(0, c.x / 1000)), Math.min(1, Math.max(0, c.y / 1000))]);
  }
  const q = orderQuad(pts);
  if (!isConvex(q) || quadArea(q) < 0.08) return null;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (Math.hypot(q[i][0] - q[j][0], q[i][1] - q[j][1]) < 0.05) return null;
  return q;
}
