/**
 * S15i – Trường cong mượt toàn trang.
 * Thay vì nắn từng ô/dải (S11g–S11s, dễ "vá chằng vá đụp"), khớp một mặt
 * độ dốc dòng mượt cho cả trang từ số đo lineSkewMap:
 *   tan(góc)(u, v) = a + b·u + c·v + d·u·v + e·v²   (u, v ∈ [−½, ½])
 * Khớp bình phương tối thiểu có trọng số mực, một lượt loại ô lệch > 0,75°
 * so với mặt vừa khớp. Dịch dọc = tích phân giải tích theo x từ tâm trang,
 * nên tâm trang đứng yên và không có bậc thang giữa các ô.
 * Hàm thuần, chạy được trong Worker/kiểm thử. Chưa nối vào chuỗi lọc.
 */
import { lineSkewMap, type SkewCell } from "./line-skew";

export type SkewField = { coef: [number, number, number, number, number]; used: number; dropped: number };

const DEG = Math.PI / 180;
const basis = (u: number, v: number) => [1, u, v, u * v, v * v];

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/** Toạ độ chuẩn hoá tâm ô, khớp với bố cục lineSkewMap. */
function cellCenter(c: SkewCell, W: number, H: number, bands: number) {
  const mx = (W * 0.06) | 0, my = (H * 0.04) | 0;
  const bh = ((H - 2 * my) / bands) | 0, half = ((W - 2 * mx) / 2) | 0;
  const x = mx + half * (c.side + 0.5), y = my + bh * (c.band + 0.5);
  return { u: x / W - 0.5, v: y / H - 0.5 };
}

export function fitSkewField(
  cells: SkewCell[], W: number, H: number, bands = 6,
  opts: { minInk?: number; outlierDeg?: number } = {},
): SkewField | null {
  const minInk = opts.minInk ?? 60, tol = Math.tan((opts.outlierDeg ?? 0.75) * DEG);
  const pts = cells.filter((c) => c.ink > minInk).map((c) => ({ ...cellCenter(c, W, H, bands), s: Math.tan(c.angle * DEG), w: Math.sqrt(c.ink) }));
  const fit = (P: typeof pts) => {
    // ít điểm → giảm bậc: chỉ hằng + tuyến tính
    const k = P.length >= 8 ? 5 : P.length >= 3 ? 3 : P.length >= 1 ? 1 : 0;
    if (!k) return null;
    const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
    for (const p of P) {
      const f = basis(p.u, p.v).slice(0, k);
      for (let i = 0; i < k; i++) { b[i] += p.w * f[i] * p.s; for (let j = 0; j < k; j++) A[i][j] += p.w * f[i] * f[j]; }
    }
    for (let i = 1; i < k; i++) A[i][i] += 1e-6; // ổn định khi điểm thẳng hàng
    const x = solve(A, b);
    if (!x) return null;
    while (x.length < 5) x.push(0);
    return x as SkewField["coef"];
  };
  const at = (c: number[], u: number, v: number) => basis(u, v).reduce((s, f, i) => s + f * c[i], 0);
  let coef = fit(pts);
  if (!coef) return null;
  // loại dần ô có sai số lớn nhất (mỗi lượt một ô) để ô lệch không kéo theo ô lành
  let keep = pts;
  for (let it = 0; it < pts.length && keep.length > 3; it++) {
    let wi = -1, we = tol;
    // sai số "bỏ-một-ra": khớp không có ô đó rồi đo ô đó, để ô lệch không tự kéo mặt về phía mình
    keep.forEach((p, i) => {
      const c = fit(keep.filter((_, j) => j !== i));
      const e = c ? Math.abs(at(c, p.u, p.v) - p.s) : 0;
      if (e > we) { we = e; wi = i; }
    });
    if (wi < 0) break;
    keep = keep.filter((_, i) => i !== wi);
    coef = fit(keep) ?? coef;
  }
  const dropped = pts.length - keep.length;
  return { coef, used: keep.length || pts.length, dropped };
}

/** Góc (độ) của trường tại toạ độ chuẩn hoá – để đo/kiểm thử. */
export function fieldAngle(f: SkewField, u: number, v: number) {
  return Math.atan(basis(u, v).reduce((s, b, i) => s + b * f.coef[i], 0)) / DEG;
}

/** Nắn theo trường: lấy mẫu dọc song tuyến tại y + ∫ độ dốc dx (từ tâm). */
export function skewFieldApply(d: Uint8ClampedArray, W: number, H: number, f: SkewField): Uint8ClampedArray {
  const [a, b, c, dd, e] = f.coef;
  const out = new Uint8ClampedArray(d.length);
  for (let y = 0; y < H; y++) {
    const v = y / H - 0.5, k0 = a + c * v + e * v * v, k1 = b + dd * v;
    for (let x = 0; x < W; x++) {
      const u = (x - W / 2) / W;
      let sy = y + W * (k0 * u + (k1 * u * u) / 2);
      sy = Math.min(H - 1.001, Math.max(0, sy));
      const y0 = sy | 0, t = sy - y0, i0 = (y0 * W + x) * 4, i1 = i0 + W * 4, o = (y * W + x) * 4;
      for (let ch = 0; ch < 4; ch++) out[o + ch] = d[i0 + ch] * (1 - t) + d[i1 + ch] * t + 0.5;
    }
  }
  return out;
}

const gray = (p: Uint8ClampedArray, W: number, H: number) => {
  const g = new Uint8Array(W * H);
  for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8;
  return g;
};

/** Điểm toàn trang: max |góc| ô đủ mực + cong lớn nhất (trên/dưới). */
export function pageSkewScore(m: ReturnType<typeof lineSkewMap>, minInk = 60) {
  let a = 0;
  for (const c of m.cells) if (c.ink > minInk) a = Math.max(a, Math.abs(c.angle));
  return a + Math.max(m.top.curve, m.bottom.curve);
}

/**
 * Nắn một lượt bằng trường mượt, có kiểm điểm: chỉ giữ khi điểm toàn trang
 * giảm. Trang đã thẳng (mọi |góc| ≤ minDeg) trả bản sao y nguyên.
 */
export function smoothSkewCorrect(
  d: Uint8ClampedArray, W: number, H: number, bands = 6, minDeg = 0.25,
): { data: Uint8ClampedArray; applied: boolean; before: number; after: number } {
  const m = lineSkewMap(gray(d, W, H), W, H, bands), before = pageSkewScore(m);
  const same = { data: new Uint8ClampedArray(d), applied: false, before, after: before };
  if (m.cells.every((c) => c.ink <= 60 || Math.abs(c.angle) < minDeg)) return same;
  const f = fitSkewField(m.cells, W, H, bands);
  if (!f) return same;
  const next = skewFieldApply(d, W, H, f);
  const after = pageSkewScore(lineSkewMap(gray(next, W, H), W, H, bands));
  return after < before ? { data: next, applied: true, before, after } : same;
}
