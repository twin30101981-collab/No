/**
 * Nắn phẳng giấy cong + làm sạch mép + làm nét chữ. Thuần điểm ảnh (chạy được trong Worker và test).
 * - edgeCurves: đo độ cong từng cạnh trên ảnh gốc, khớp o(t) = t(1−t)(c0 + c1(t−½)) (góc giữ cố định).
 * - warpCurved: homography + trường dịch chuyển Coons từ 4 cạnh cong, nội suy bicubic (nét hơn song tuyến).
 * - trimBox / cleanBorder: cắt dải nền tối còn sót ở mép và xoá nêm nền dính mép.
 * - sharpenLuma: unsharp trên độ sáng với nhân Gauss 5×5, không viền màu.
 */
import { homography, type Px } from "./pixels";

type Pt = [number, number];
/** Hệ số cong mỗi cạnh (px, dương = lõm vào trong), thứ tự: trên, phải, dưới, trái. */
export type Curves = ([number, number] | null)[];

const clampI = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lumAt = (d: Px, W: number, H: number, x: number, y: number) => {
  const i = (clampI(Math.round(y), 0, H - 1) * W + clampI(Math.round(x), 0, W - 1)) * 4;
  return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
};

export const curveAt = (c: [number, number] | null, t: number) => (c ? t * (1 - t) * (c[0] + c[1] * (t - 0.5)) : 0);

function solveN(A: number[][], b: number[]) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    if (Math.abs(A[i][i]) < 1e-12) return null;
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return x;
}

/**
 * Khớp o(t) = a + b·t + t(1−t)(c0 + c1(t−½)) có loại ngoại lai (MAD). Phần a + b·t là lệch thẳng
 * (góc hơi sai) — bỏ đi; chỉ trả phần cong c = [c0, c1].
 */
export function fitCurve(ts: number[], os: number[]): { c: [number, number]; rms: number; inliers: number } | null {
  let idx = ts.map((_, i) => i);
  let c: [number, number] = [0, 0], rms = Infinity;
  const basis = (t: number) => [1, t, t * (1 - t), t * (1 - t) * (t - 0.5)];
  for (let iter = 0; iter < 3; iter++) {
    if (idx.length < 6) return null;
    const A = [0, 1, 2, 3].map(() => [0, 0, 0, 0]), bv = [0, 0, 0, 0];
    for (const i of idx) { const f = basis(ts[i]); for (let r = 0; r < 4; r++) { bv[r] += f[r] * os[i]; for (let k = 0; k < 4; k++) A[r][k] += f[r] * f[k]; } }
    const x = solveN(A, bv); if (!x) return null;
    c = [x[2], x[3]];
    const res = idx.map((i) => { const f = basis(ts[i]); return Math.abs(os[i] - (x[0] * f[0] + x[1] * f[1] + x[2] * f[2] + x[3] * f[3])); });
    rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
    const sorted = [...res].sort((p, q) => p - q); const mad = sorted[Math.floor(sorted.length / 2)] || 0.5;
    const keep = idx.filter((_, k) => res[k] <= Math.max(1.5, mad * 3));
    if (keep.length === idx.length) break;
    idx = keep;
  }
  return { c, rms, inliers: idx.length };
}

/** Đo độ cong 4 cạnh của quad (pixel ảnh gốc). Cạnh thẳng hoặc không đo được → null. */
export function edgeCurves(d: Px, W: number, H: number, q: Pt[]): Curves {
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  return [0, 1, 2, 3].map((s) => {
    const a = q[s], b = q[(s + 1) % 4];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (len < 60) return null;
    const tx = dx / len, ty = dy / len; let nx = -ty, ny = tx;
    if ((cx - (a[0] + b[0]) / 2) * nx + (cy - (a[1] + b[1]) / 2) * ny < 0) { nx = -nx; ny = -ny; }
    const win = Math.max(10, Math.round(len * 0.07)), gap = Math.max(2, Math.round(len / 600));
    const N = 31, ts: number[] = [], os: number[] = [], signs: number[] = [];
    const strengths: number[] = [];
    for (let k = 1; k < N; k++) {
      const t = k / N; const px = a[0] + dx * t, py = a[1] + dy * t;
      let best = 0, bestOff = 0, bestSign = 0;
      for (let off = -win; off <= win; off++) {
        let inn = 0, out = 0;
        for (let j = -2; j <= 2; j++) {
          inn += lumAt(d, W, H, px + nx * (off + gap) + tx * j, py + ny * (off + gap) + ty * j);
          out += lumAt(d, W, H, px + nx * (off - gap) + tx * j, py + ny * (off - gap) + ty * j);
        }
        const g = (inn - out) / 5;
        if (Math.abs(g) > best) { best = Math.abs(g); bestOff = off; bestSign = Math.sign(g); }
      }
      strengths.push(best);
      if (best >= 14) { ts.push(t); os.push(bestOff); signs.push(bestSign); }
    }
    if (ts.length < N * 0.6) return null;
    // giấy sáng hơn nền (hoặc ngược lại) phải nhất quán dọc cạnh; bỏ điểm sai dấu (nét chữ, bóng)
    const major = signs.reduce((s, v) => s + v, 0) >= 0 ? 1 : -1;
    const tt = ts.filter((_, i) => signs[i] === major), oo = os.filter((_, i) => signs[i] === major);
    const fit = fitCurve(tt, oo);
    if (!fit || fit.inliers < N * 0.5 || fit.rms > Math.max(2, len * 0.004)) return null;
    const peak = Math.max(...[0.25, 0.5, 0.75].map((t) => Math.abs(curveAt(fit.c, t))));
    if (peak < Math.max(2, len * 0.004) || peak > len * 0.1) return null;
    return fit.c;
  });
}

/** Nội suy bicubic Catmull-Rom một kênh tại (u, v). */
function cubic(p0: number, p1: number, p2: number, p3: number, t: number) {
  return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
}

/**
 * Nắn quad (pixel) ra ow×oh: homography + dịch chuyển cong Coons. curves rỗng = nắn phẳng thường.
 * Luôn nội suy bicubic để giữ nét chữ.
 */
/**
 * B7: ánh xạ toạ độ điểm ảnh đích (x, y – chỉ số, tâm tại +0,5) → toạ độ ảnh nguồn (chưa kẹp).
 * Dùng chung cho CPU (warpCurved) và lưới ánh xạ GPU (warp-mesh.ts) để hai nhánh khớp nhau.
 */
export function makeSrcMap(q: Pt[], ow: number, oh: number, curves: Curves = []) {
  const h = homography([[0, 0], [ow, 0], [ow, oh], [0, oh]], q);
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  const normals = [0, 1, 2, 3].map((s) => {
    const a = q[s], b = q[(s + 1) % 4]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    if ((cx - (a[0] + b[0]) / 2) * nx + (cy - (a[1] + b[1]) / 2) * ny < 0) { nx = -nx; ny = -ny; }
    return [nx, ny] as Pt;
  });
  const curved = curves.some(Boolean);
  return (x: number, y: number): Pt => {
    const dd = h[6] * (x + 0.5) + h[7] * (y + 0.5) + 1;
    let sx = (h[0] * (x + 0.5) + h[1] * (y + 0.5) + h[2]) / dd - 0.5;
    let sy = (h[3] * (x + 0.5) + h[4] * (y + 0.5) + h[5]) / dd - 0.5;
    if (curved) {
      const u = (x + 0.5) / ow, v = (y + 0.5) / oh;
      const wT = (1 - v) * curveAt(curves[0], u), wR = u * curveAt(curves[1], v);
      const wB = v * curveAt(curves[2], 1 - u), wL = (1 - u) * curveAt(curves[3], 1 - v);
      sx += normals[0][0] * wT + normals[1][0] * wR + normals[2][0] * wB + normals[3][0] * wL;
      sy += normals[0][1] * wT + normals[1][1] * wR + normals[2][1] * wB + normals[3][1] * wL;
    }
    return [sx, sy];
  };
}

/**
 * Nắn quad (pixel) ra ow×oh: homography + dịch chuyển cong Coons. curves rỗng = nắn phẳng thường.
 * Luôn nội suy bicubic để giữ nét chữ. (Nhánh CPU dự phòng của B7.)
 */
export function warpCurved(sd: Px, W: number, H: number, q: Pt[], ow: number, oh: number, curves: Curves = []): Px {
  const od = new Uint8ClampedArray(ow * oh * 4);
  const map = makeSrcMap(q, ow, oh, curves);
  const row = W * 4;
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      let [sx, sy] = map(x, y);
      sx = clampI(sx, 0, W - 1.001); sy = clampI(sy, 0, H - 1.001);
      const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, oi = (y * ow + x) * 4;
      const xs = [clampI(x0 - 1, 0, W - 1), x0, clampI(x0 + 1, 0, W - 1), clampI(x0 + 2, 0, W - 1)];
      const ys = [clampI(y0 - 1, 0, H - 1), y0, clampI(y0 + 1, 0, H - 1), clampI(y0 + 2, 0, H - 1)];
      for (let k = 0; k < 3; k++) {
        const r0 = ys[0] * row + k, r1 = ys[1] * row + k, r2 = ys[2] * row + k, r3 = ys[3] * row + k;
        const c0 = cubic(sd[r0 + xs[0] * 4], sd[r0 + xs[1] * 4], sd[r0 + xs[2] * 4], sd[r0 + xs[3] * 4], fx);
        const c1 = cubic(sd[r1 + xs[0] * 4], sd[r1 + xs[1] * 4], sd[r1 + xs[2] * 4], sd[r1 + xs[3] * 4], fx);
        const c2 = cubic(sd[r2 + xs[0] * 4], sd[r2 + xs[1] * 4], sd[r2 + xs[2] * 4], sd[r2 + xs[3] * 4], fx);
        const c3 = cubic(sd[r3 + xs[0] * 4], sd[r3 + xs[1] * 4], sd[r3 + xs[2] * 4], sd[r3 + xs[3] * 4], fx);
        od[oi + k] = cubic(c0, c1, c2, c3, fy);
      }
      od[oi + 3] = 255;
    }
  }
  return od;
}

/** Mức sáng giấy: phân vị 80 vùng giữa ảnh. */
function paperLevel(d: Px, W: number, H: number) {
  const hist = new Uint32Array(256); let n = 0;
  for (let y = Math.floor(H * 0.2); y < H * 0.8; y += 3) for (let x = Math.floor(W * 0.2); x < W * 0.8; x += 3) {
    const i = (y * W + x) * 4; hist[(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0]++; n++; }
  let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.8) return v; }
  return 255;
}

/** Hộp cắt bỏ các dải nền (tối hơn giấy) dính sát mép sau khi nắn; tối đa 5 % mỗi cạnh. */
export function trimBox(d: Px, W: number, H: number) {
  const P = paperLevel(d, W, H); const dark = P * 0.62;
  const isBg = (count: number, darkCount: number, sum: number) => darkCount > count * 0.35 || sum / count < P * 0.7;
  const lineRow = (y: number) => { let dc = 0, s = 0, c = 0; for (let x = Math.floor(W * 0.05); x < W * 0.95; x += 2) { const l = lumAt(d, W, H, x, y); s += l; c++; if (l < dark) dc++; } return isBg(c, dc, s); };
  const lineCol = (x: number) => { let dc = 0, s = 0, c = 0; for (let y = Math.floor(H * 0.05); y < H * 0.95; y += 2) { const l = lumAt(d, W, H, x, y); s += l; c++; if (l < dark) dc++; } return isBg(c, dc, s); };
  if (P < 90) return { x0: 0, y0: 0, x1: W, y1: H }; // giấy tối/ảnh lạ: không đoán
  const lim = (n: number) => Math.max(2, Math.round(n * 0.05));
  let y0 = 0; while (y0 < lim(H) && lineRow(y0)) y0++;
  let y1 = H; while (H - y1 < lim(H) && lineRow(y1 - 1)) y1--;
  let x0 = 0; while (x0 < lim(W) && lineCol(x0)) x0++;
  let x1 = W; while (W - x1 < lim(W) && lineCol(x1 - 1)) x1--;
  // viền chuyển tiếp mờ (xám nhạt 1–3 px) sát mép: bỏ khi tối hơn giấy rõ rệt, chỉ trong 0,8 %
  const meanRow = (y: number) => { let s2 = 0, c = 0; for (let x = Math.floor(W * 0.05); x < W * 0.95; x += 2) { s2 += lumAt(d, W, H, x, y); c++; } return s2 / c; };
  const meanCol = (x: number) => { let s2 = 0, c = 0; for (let y = Math.floor(H * 0.05); y < H * 0.95; y += 2) { s2 += lumAt(d, W, H, x, y); c++; } return s2 / c; };
  const thin = (n: number) => Math.max(1, Math.round(n * 0.008)), soft = P * 0.9;
  while (y0 < lim(H) && meanRow(y0) < soft && y0 < thin(H) + 8) y0++;
  while (H - y1 < lim(H) && meanRow(y1 - 1) < soft && H - y1 < thin(H) + 8) y1--;
  while (x0 < lim(W) && meanCol(x0) < soft && x0 < thin(W) + 8) x0++;
  while (W - x1 < lim(W) && meanCol(x1 - 1) < soft && W - x1 < thin(W) + 8) x1--;
  // thêm 1 px an toàn khi đã cắt để không còn viền mờ chuyển tiếp
  if (y0) y0 = Math.min(y0 + 1, lim(H)); if (y1 < H) y1 = Math.max(y1 - 1, H - lim(H));
  if (x0) x0 = Math.min(x0 + 1, lim(W)); if (x1 < W) x1 = Math.max(x1 - 1, W - lim(W));
  return { x0, y0, x1, y1 };
}

/** Xoá nêm nền tối dính mép (góc lệch vài px) trong dải 3 % quanh viền: tô bằng màu giấy. */
export function cleanBorder(d: Px, W: number, H: number) {
  const P = paperLevel(d, W, H); if (P < 90) return d;
  const dark = P * 0.6, bw = Math.max(3, Math.round(Math.min(W, H) * 0.03));
  const inBand = (x: number, y: number) => x < bw || y < bw || x >= W - bw || y >= H - bw;
  const seen = new Uint8Array(W * H); const stack: number[] = [];
  const lum = (i: number) => d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  const push = (x: number, y: number) => { const i = y * W + x; if (!seen[i] && lum(i) < dark) { seen[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = bw; y < bw * 2 && y < H; y++) for (let x = bw; x < W - bw; x += 4) { const i = (y * W + x) * 4; const l = lum(y * W + x); if (l >= P * 0.85) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } }
  const fill = n ? [r / n, g / n, b / n] : [P, P, P];
  while (stack.length) {
    const i = stack.pop()!; const x = i % W, y = (i / W) | 0;
    d[i * 4] = fill[0]; d[i * 4 + 1] = fill[1]; d[i * 4 + 2] = fill[2];
    // V5b: không cấp phát mảng láng giềng cho từng điểm
    if (x + 1 < W && inBand(x + 1, y)) push(x + 1, y);
    if (x > 0 && inBand(x - 1, y)) push(x - 1, y);
    if (y + 1 < H && inBand(x, y + 1)) push(x, y + 1);
    if (y > 0 && inBand(x, y - 1)) push(x, y - 1);
  }
  return d;
}

/** Unsharp mask trên độ sáng (Gauss 5×5 tách lớp), cộng phần chênh như nhau vào 3 kênh → nét mà không viền màu. */
export function sharpenLuma(d: Px, W: number, H: number, amount: number, threshold = 6) {
  const n = W * H, L = new Float32Array(n), t = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  const k = [1, 4, 6, 4, 1];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let j = -2; j <= 2; j++) s += k[j + 2] * L[y * W + clampI(x + j, 0, W - 1)]; t[y * W + x] = s / 16; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let j = -2; j <= 2; j++) s += k[j + 2] * t[clampI(y + j, 0, H - 1) * W + x]; B[y * W + x] = s / 16; }
  for (let i = 0; i < n; i++) {
    const diff = L[i] - B[i]; if (Math.abs(diff) <= threshold) continue;
    const add = amount * diff;
    d[i * 4] = d[i * 4] + add; d[i * 4 + 1] = d[i * 4 + 1] + add; d[i * 4 + 2] = d[i * 4 + 2] + add;
  }
  return d;
}
