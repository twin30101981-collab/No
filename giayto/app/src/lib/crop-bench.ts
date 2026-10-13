/**
 * G2-15 — Bộ ảnh mẫu tổng hợp + đo tỉ lệ cắt đúng.
 * Mỗi mẫu là ảnh xám có tờ giấy (góc thật đã biết) trên nền khác nhau; detectPaperGray chạy trên đó
 * và được tính "đúng" khi mọi góc lệch ≤ tol (mặc định 3 % đường chéo ảnh).
 */
import type { Quad } from "./db";
import { detectPaperGray } from "./detect";

export type Sample = { name: string; gray: Float32Array; w: number; h: number; truth: Quad };
export type SampleResult = { name: string; ok: boolean; error: number; found: boolean };
export type BenchReport = { total: number; correct: number; rate: number; meanError: number; ms: number; results: SampleResult[] };

/** Bộ sinh số giả ngẫu nhiên cố định để bộ mẫu lần nào cũng giống nhau. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

const inside = (q: [number, number][], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const [xi, yi] = q[i], [xj, yj] = q[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

type Opt = { bg: number; paper: number; noise: number; rot: number; persp: number; scale: number; shadow: number; text: boolean; clutter: boolean; dx: number; dy: number };

export function makeSample(name: string, o: Opt, seed: number, w = 300, h = 400): Sample {
  const r = rng(seed);
  const cx = w / 2 + o.dx * w, cy = h / 2 + o.dy * h;
  const pw = w * o.scale * 0.5, ph = pw * 1.414;
  const c = Math.cos(o.rot), s = Math.sin(o.rot);
  const base: [number, number][] = [[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]];
  const q = base.map(([x, y], i) => {
    const shrink = i < 2 ? 1 - o.persp : 1; // phối cảnh: cạnh trên ngắn hơn
    const xx = x * shrink;
    return [cx + xx * c - y * s, cy + xx * s + y * c] as [number, number];
  });
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = o.bg;
    if (o.clutter && ((x >> 4) + (y >> 4)) % 2 === 0) v += 18;
    if (inside(q, x + 0.5, y + 0.5)) {
      v = o.paper;
      if (o.text && (y % 14 < 3) && Math.abs(x - cx) < pw * 0.3 && Math.abs(y - cy) < ph * 0.35) v -= 120;
    }
    if (o.shadow) v *= 1 - o.shadow * Math.max(0, (x - w * 0.55) / (w * 0.45));
    v += (r() - 0.5) * 2 * o.noise;
    g[y * w + x] = Math.max(0, Math.min(255, v));
  }
  return { name, gray: g, w, h, truth: q.map(([x, y]) => [x / w, y / h]) as Quad };
}

/** 24 mẫu: nền tối/sáng/rối, giấy xoay, phối cảnh, nhiễu, bóng, chữ. */
export function sampleSet(): Sample[] {
  const d: Opt = { bg: 50, paper: 225, noise: 6, rot: 0, persp: 0, scale: 1.3, shadow: 0, text: true, clutter: false, dx: 0, dy: 0 };
  const list: [string, Partial<Opt>][] = [
    ["thẳng, nền tối", {}], ["không chữ", { text: false }], ["nhỏ", { scale: 1 }], ["lớn", { scale: 1.5 }],
    ["xoay 5°", { rot: 0.087 }], ["xoay -8°", { rot: -0.14 }], ["xoay 12°", { rot: 0.21 }], ["xoay -15°", { rot: -0.26 }],
    ["phối cảnh nhẹ", { persp: 0.08 }], ["phối cảnh mạnh", { persp: 0.18 }], ["phối cảnh + xoay", { persp: 0.12, rot: 0.1 }], ["lệch trái", { dx: -0.06 }],
    ["nhiễu nhiều", { noise: 22 }], ["nhiễu + xoay", { noise: 16, rot: -0.1 }], ["nền xám", { bg: 110 }], ["tương phản thấp", { bg: 140, paper: 215 }],
    ["bóng nhẹ", { shadow: 0.25 }], ["bóng đậm", { shadow: 0.45 }], ["nền rối", { clutter: true }], ["nền rối + xoay", { clutter: true, rot: 0.12 }],
    ["giấy ngả màu", { paper: 190 }], ["lệch lên", { dy: -0.05 }], ["nền sáng", { bg: 160, paper: 245 }], ["tổng hợp khó", { noise: 14, rot: 0.15, persp: 0.1, shadow: 0.3 }],
  ];
  return list.map(([n, p], i) => makeSample(n, { ...d, ...p }, 1000 + i));
}

/** Lệch góc lớn nhất (theo tỉ lệ đường chéo ảnh) giữa hai khung. */
export function cornerError(a: Quad, b: Quad, w: number, h: number) {
  const diag = Math.hypot(w, h);
  let worst = 0;
  for (let i = 0; i < 4; i++) worst = Math.max(worst, Math.hypot((a[i][0] - b[i][0]) * w, (a[i][1] - b[i][1]) * h) / diag);
  return worst;
}

export function runBench(samples: Sample[] = sampleSet(), tol = 0.03, detect = detectPaperGray): BenchReport {
  const t0 = performance.now();
  const results = samples.map((s) => {
    const d = detect(s.gray, s.w, s.h);
    if (!d) return { name: s.name, ok: false, error: 1, found: false };
    const error = cornerError(d.quad, s.truth, s.w, s.h);
    return { name: s.name, ok: error <= tol, error, found: true };
  });
  const correct = results.filter((r) => r.ok).length;
  return { total: results.length, correct, rate: results.length ? correct / results.length : 0, meanError: results.reduce((x, r) => x + r.error, 0) / (results.length || 1), ms: performance.now() - t0, results };
}

export type BenchCompare = { old: BenchReport; cur: BenchReport; better: string[]; worse: string[] };
/** G3-22 — So bộ dò cơ bản (cũ, một lượt) với bộ dò bền (mới: thêm bản kéo giãn + bù sáng) trên cùng bộ mẫu G2. */
export function compareBench(samples: Sample[] = sampleSet(), tol = 0.03): BenchCompare {
  const old = runBench(samples, tol, (g, w, h) => detectPaperGray(g, w, h, false));
  const cur = runBench(samples, tol, (g, w, h) => detectPaperGray(g, w, h, true));
  const better: string[] = [], worse: string[] = [];
  cur.results.forEach((r, i) => { const o = old.results[i]; if (r.ok && !o.ok) better.push(r.name); if (!r.ok && o.ok) worse.push(r.name); });
  return { old, cur, better, worse };
}

// ============= B3 — bộ đo chuẩn góc trên ảnh gốc =============
import { refineQuadGradient } from "./detect-refine";

export type HiResSample = { name: string; rgba: Uint8ClampedArray; w: number; h: number; truth: Quad };
type HiOpt = { rot: number; persp: number; bg: number; paper: number; noise: number };

/** Ảnh RGBA lớn có tờ giấy với góc biết trước; mép khử răng cưa bằng siêu lấy mẫu 4×4. */
export function makeHiResSample(name: string, o: HiOpt, seed: number, w = 1536, h = 2048): HiResSample {
  const r = rng(seed);
  const cx = w / 2, cy = h / 2, pw = w * 0.62, ph = pw * 1.414;
  const c = Math.cos(o.rot), s = Math.sin(o.rot);
  const base: [number, number][] = [[-pw / 2, -ph / 2], [pw / 2, -ph / 2], [pw / 2, ph / 2], [-pw / 2, ph / 2]];
  const q = base.map(([x, y], i) => { const xx = x * (i < 2 ? 1 - o.persp : 1); return [cx + xx * c - y * s, cy + xx * s + y * c] as [number, number]; });
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const bx0 = Math.floor(Math.min(...xs)) - 1, bx1 = Math.ceil(Math.max(...xs)) + 1, by0 = Math.floor(Math.min(...ys)) - 1, by1 = Math.ceil(Math.max(...ys)) + 1;
  // phương trình 4 cạnh để kiểm nhanh điểm trong / gần biên
  const E = [0, 1, 2, 3].map((i) => { const [x0, y0] = q[i], [x1, y1] = q[(i + 1) % 4]; const L = Math.hypot(x1 - x0, y1 - y0); return { nx: (y1 - y0) / L, ny: -(x1 - x0) / L, o: ((y1 - y0) * x0 - (x1 - x0) * y0) / L }; });
  const sign = Math.sign(E[0].nx * cx + E[0].ny * cy - E[0].o);
  const dist = (x: number, y: number) => Math.min(...E.map((e) => sign * (e.nx * x + e.ny * y - e.o)));
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let cov = 0;
    if (x >= bx0 && x <= bx1 && y >= by0 && y <= by1) {
      const dd = dist(x + 0.5, y + 0.5);
      if (dd > 1.5) cov = 1; else if (dd > -1.5) { for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (dist(x + (a + 0.5) / 4, y + (b + 0.5) / 4) > 0) cov++; cov /= 16; }
    }
    const v = o.bg * (1 - cov) + o.paper * cov + (r() - 0.5) * 2 * o.noise;
    const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return { name, rgba: d, w, h, truth: q.map(([x, y]) => [x / w, y / h]) as Quad };
}

export function hiResSampleSet(w = 1536, h = 2048): HiResSample[] {
  const d: HiOpt = { rot: 0, persp: 0, bg: 50, paper: 225, noise: 6 };
  const list: [string, Partial<HiOpt>][] = [
    ["thẳng", {}], ["xoay 7°", { rot: 0.12 }], ["xoay -12°", { rot: -0.21 }], ["nghiêng phối cảnh", { persp: 0.12 }],
    ["xoay + nghiêng", { rot: 0.09, persp: 0.1 }], ["tương phản thấp", { bg: 150, paper: 210 }], ["tương phản thấp + xoay", { bg: 160, paper: 215, rot: -0.1 }], ["nhiễu", { noise: 18, rot: 0.05 }],
  ];
  return list.map(([n, p], i) => makeHiResSample(n, { ...d, ...p }, 3000 + i, w, h));
}

/** Thu nhỏ RGBA → ảnh xám cạnh dài `size` (trung bình hộp), như bước dò nhanh. */
export function downGray(s: HiResSample, size = 360) {
  const k = size / Math.max(s.w, s.h), w = Math.round(s.w * k), h = Math.round(s.h * k);
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x / k), x1 = Math.max(x0 + 1, Math.floor((x + 1) / k)), y0 = Math.floor(y / k), y1 = Math.max(y0 + 1, Math.floor((y + 1) / k));
    let sum = 0, n = 0;
    for (let yy = y0; yy < y1; yy += 2) for (let xx = x0; xx < x1; xx += 2) { const i = (yy * s.w + xx) * 4; sum += s.rgba[i] * 0.3 + s.rgba[i + 1] * 0.59 + s.rgba[i + 2] * 0.11; n++; }
    g[y * w + x] = sum / Math.max(1, n);
  }
  return { g, w, h };
}

export type CornerReport = { name: string; coarsePx: number; refinedPx: number; found: boolean };
/** Sai số góc trung bình (px ảnh gốc): dò nhanh 360 px rồi tinh chỉnh trên ảnh gốc. */
export function runCornerBench(samples: HiResSample[] = hiResSampleSet()) {
  // so theo thứ tự góc khớp nhất (bộ dò có thể bắt đầu từ góc khác / đi ngược chiều)
  const meanPx = (a: Quad, b: Quad, w: number, h: number) => {
    let best = Infinity;
    for (const dir of [1, -1]) for (let sh = 0; sh < 4; sh++) {
      let e = 0; for (let i = 0; i < 4; i++) { const j = (((sh + dir * i) % 4) + 4) % 4; e += Math.hypot((a[i][0] - b[j][0]) * w, (a[i][1] - b[j][1]) * h); }
      best = Math.min(best, e / 4);
    }
    return best;
  };
  const results: CornerReport[] = samples.map((s) => {
    const { g, w, h } = downGray(s);
    const det = detectPaperGray(g, w, h, true);
    if (!det) return { name: s.name, coarsePx: Infinity, refinedPx: Infinity, found: false };
    const refined = refineQuadGradient(s.rgba, s.w, s.h, det.quad);
    return { name: s.name, coarsePx: meanPx(det.quad, s.truth, s.w, s.h), refinedPx: meanPx(refined, s.truth, s.w, s.h), found: true };
  });
  const mean = (k: "coarsePx" | "refinedPx") => results.reduce((x, r) => x + r[k], 0) / (results.length || 1);
  return { results, meanCoarsePx: mean("coarsePx"), meanRefinedPx: mean("refinedPx") };
}
