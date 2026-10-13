import type { Quad } from "./db";

type Pt = [number, number];

export type FittedLine = { normal: Pt; offset: number; inliers: number; rms: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Đọc độ sáng tại toạ độ thực (px ảnh gốc), nội suy song tuyến. */
export type Sampler = (x: number, y: number) => number;

/** Bộ đọc trên một vùng RGBA (ox,oy = vị trí vùng trong ảnh gốc). */
export function rgbaSampler(d: Uint8ClampedArray, w: number, h: number, ox = 0, oy = 0): Sampler {
  const at = (xx: number, yy: number) => { const i = (yy * w + xx) * 4; return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; };
  return (X, Y) => {
    const x = clamp(X - ox, 0, w - 1), y = clamp(Y - oy, 0, h - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
    const fx = x - x0, fy = y - y0;
    return (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy;
  };
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

type EdgeRefinement = { line: FittedLine | null; reliable: boolean };

const pointLineDistance = (p: Pt, a: Pt, b: Pt) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  return len ? Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len : Infinity;
};

/** Khớp đường thẳng bền vững, thử mọi cặp điểm để kết quả luôn xác định. */
export function fitLineRansac(points: Pt[], threshold = 1.5, minInliers = Math.ceil(points.length * 0.55)): FittedLine | null {
  if (points.length < 3) return null;
  let best: number[] = [], bestError = Infinity;
  for (let i = 0; i < points.length - 1; i++) for (let j = i + 1; j < points.length; j++) {
    if (Math.hypot(points[j][0] - points[i][0], points[j][1] - points[i][1]) < 4) continue;
    const inliers: number[] = []; let error = 0;
    for (let k = 0; k < points.length; k++) {
      const distance = pointLineDistance(points[k], points[i], points[j]);
      if (distance <= threshold) { inliers.push(k); error += distance * distance; }
    }
    if (inliers.length > best.length || (inliers.length === best.length && error < bestError)) { best = inliers; bestError = error; }
  }
  if (best.length < Math.max(3, minInliers)) return null;

  const selected = best.map((i) => points[i]);
  const cx = selected.reduce((s, p) => s + p[0], 0) / selected.length;
  const cy = selected.reduce((s, p) => s + p[1], 0) / selected.length;
  let xx = 0, xy = 0, yy = 0;
  for (const p of selected) { const x = p[0] - cx, y = p[1] - cy; xx += x * x; xy += x * y; yy += y * y; }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const normal: Pt = [-Math.sin(angle), Math.cos(angle)];
  const offset = normal[0] * cx + normal[1] * cy;
  const rms = Math.sqrt(selected.reduce((s, p) => s + (normal[0] * p[0] + normal[1] * p[1] - offset) ** 2, 0) / selected.length);
  if (!Number.isFinite(rms) || rms > threshold) return null;
  return { normal, offset, inliers: selected.length, rms };
}

/**
 * Tìm lại một cạnh trong cửa sổ 32 px quanh cạnh thô. Mỗi lát cắt đo gradient
 * theo pháp tuyến; RANSAC chọn nhóm điểm thẳng hàng để bỏ nét chữ, bóng và vật
 * nhỏ, rồi PCA khớp lại đường biên trước khi lấy giao điểm ra góc.
 */
type EdgeFit = EdgeRefinement & { start: FittedLine | null; end: FittedLine | null };

function refineEdge(L: Sampler, a: Pt, b: Pt, centre: Pt, window: number): EdgeFit {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  if (len < 24) return { line: null, reliable: false, start: null, end: null };
  let nx = -dy / len, ny = dx / len;
  const tx = dx / len, ty = dy / len;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  if ((centre[0] - mx) * nx + (centre[1] - my) * ny < 0) { nx = -nx; ny = -ny; }
  // ảnh mờ/nhiễu: lấy trung bình 3 điểm dọc cạnh, so sánh cách 2 px để gradient ổn định hơn
  const lum3 = (x: number, y: number) => (L(x - tx, y - ty) + L(x, y) + L(x + tx, y + ty)) / 3;

  const half = Math.max(2, Math.floor(window / 2));
  const points: Pt[] = [], strengths: number[] = [], ts: number[] = [];
  const samples = Math.max(11, Math.min(41, Math.round(len / 25)));
  for (let s = 0; s < samples; s++) {
    const t = 0.06 + (s / Math.max(1, samples - 1)) * 0.88;
    const px = a[0] + dx * t, py = a[1] + dy * t;
    let best = 0; const scores: { offset: number; strength: number }[] = [];
    for (let off = -half; off <= half; off++) {
      const inside = lum3(px + nx * (off + 2), py + ny * (off + 2));
      const outside = lum3(px + nx * (off - 2), py + ny * (off - 2));
      const strength = Math.abs(inside - outside);
      scores.push({ offset: off, strength }); best = Math.max(best, strength);
    }
    // B3: đỉnh dưới điểm ảnh bằng parabol qua 3 điểm quanh cực đại
    // S10c (Q3): pháp tuyến hướng vào trong; chọn đỉnh gradient NGOÀI CÙNG đủ mạnh (≥ 35 % cực đại, ≥ 12)
    // để nét chữ sát mép (tương phản cao hơn mép giấy) không kéo khung cắt lấn vào nội dung.
    let k = 0; for (let j = 1; j < scores.length; j++) if (scores[j].strength > scores[k].strength) k = j;
    for (let j = 0; j < k; j++) {
      const v = scores[j].strength;
      if (v >= Math.max(12, best * 0.35) && (j === 0 || v >= scores[j - 1].strength) && v >= scores[j + 1].strength) { k = j; break; }
    }
    const peak = scores[k].strength;
    const plateau = scores.filter((p, j) => Math.abs(j - k) <= 2 && p.strength >= peak * 0.97);
    let bestOffset = plateau.reduce((sum, p) => sum + p.offset, 0) / Math.max(1, plateau.length);
    if (plateau.length === 1 && k > 0 && k < scores.length - 1) {
      const l = scores[k - 1].strength, c = scores[k].strength, r = scores[k + 1].strength, den = l - 2 * c + r;
      if (den < 0) bestOffset = scores[k].offset + clamp((0.5 * (l - r)) / den, -0.5, 0.5);
    }
    strengths.push(best);
    if (best >= 12) { points.push([px + nx * bestOffset, py + ny * bestOffset]); ts.push(t); }
  }

  const strong = strengths.filter((v) => v >= 12);
  if (strong.length < Math.ceil(samples * 0.5) || median(strong) < 16) return { line: null, reliable: false, start: null, end: null };
  // giấy hơi cong: cho phép sai lệch theo độ dài cạnh; góc lấy từ đoạn gần đầu/cuối cạnh
  const tol = Math.max(1.5, len * 0.003);
  const line = fitLineRansac(points, tol, Math.ceil(samples * 0.5));
  const part = (lo: number, hi: number) => {
    const sub = points.filter((_, k) => ts[k] >= lo && ts[k] <= hi);
    return sub.length >= 4 ? fitLineRansac(sub, 1.5, Math.ceil(sub.length * 0.6)) : null;
  };
  return { line, reliable: Boolean(line), start: part(0, 0.4), end: part(0.6, 1) };
}

function solveCorner(n1: Pt, o1: number, n2: Pt, o2: number): Pt | null {
  const det = n1[0] * n2[1] - n1[1] * n2[0];
  if (Math.abs(det) < 0.2) return null;
  return [(o1 * n2[1] - n1[1] * o2) / det, (n1[0] * o2 - o1 * n2[0]) / det];
}

/** Tinh chỉnh bốn góc từ gradient trên ảnh gốc; quad vào/ra đều chuẩn hoá 0–1. */
export function refineQuadGradient(d: Uint8ClampedArray, W: number, H: number, quad: Quad, window = 32): Quad {
  if (W < 32 || H < 32 || d.length < W * H * 4) return quad;
  return refineQuadSampler(rgbaSampler(d, W, H), W, H, quad, window);
}

/** Như refineQuadGradient nhưng đọc ảnh qua Sampler (vd chỉ các dải quanh cạnh của ảnh gốc 4096 px). */
export function refineQuadSampler(L: Sampler, W: number, H: number, quad: Quad, window = 32): Quad {
  if (W < 32 || H < 32) return quad;
  const pts = quad.map(([x, y]) => [x * W, y * H] as Pt);
  const centre: Pt = [pts.reduce((s, p) => s + p[0], 0) / 4, pts.reduce((s, p) => s + p[1], 0) / 4];
  const edges: EdgeFit[] = [];
  for (let i = 0; i < 4; i++) edges.push(refineEdge(L, pts[i], pts[(i + 1) % 4], centre, window));
  if (edges.filter((e) => e.reliable).length < 3) return quad;

  return pts.map((p, i) => {
    const prev = edges[(i + 3) % 4], next = edges[i];
    // góc i = cuối cạnh trước ∩ đầu cạnh sau; giấy cong thì đoạn cục bộ chính xác hơn cả cạnh
    const pairs: [FittedLine | null, FittedLine | null][] = [[prev.end, next.start], [prev.line, next.line]];
    for (const [a, b] of pairs) {
      if (!a || !b || !prev.reliable || !next.reliable) continue;
      const corner = solveCorner(a.normal, a.offset, b.normal, b.offset);
      if (!corner || Math.hypot(corner[0] - p[0], corner[1] - p[1]) > window) continue;
      return [clamp(corner[0] / W, 0, 1), clamp(corner[1] / H, 0, 1)] as [number, number];
    }
    return [p[0] / W, p[1] / H] as [number, number];
  }) as Quad;
}

/** Hộp bao (px gốc) của dải quanh cạnh i–(i+1), rộng thêm `pad` mỗi phía. */
export function edgeStripBox(quad: Quad, W: number, H: number, i: number, pad: number) {
  const a = quad[i], b = quad[(i + 1) % 4];
  const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) * W - pad)), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) * H - pad));
  const x1 = Math.min(W, Math.ceil(Math.max(a[0], b[0]) * W + pad)), y1 = Math.min(H, Math.ceil(Math.max(a[1], b[1]) * H + pad));
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/** Ghép bốn dải cạnh thành một Sampler; điểm nằm ngoài mọi dải lấy dải gần nhất (kẹp mép). */
export function stripSampler(strips: { x: number; y: number; w: number; h: number; data: Uint8ClampedArray }[]): Sampler {
  const s = strips.map((b) => ({ b, f: rgbaSampler(b.data, b.w, b.h, b.x, b.y) }));
  let last = s[0];
  return (x, y) => {
    const inside = (b: (typeof s)[number]["b"]) => x >= b.x && y >= b.y && x <= b.x + b.w - 1 && y <= b.y + b.h - 1;
    if (!inside(last.b)) last = s.find((e) => inside(e.b)) ?? last;
    return last.f(x, y);
  };
}
