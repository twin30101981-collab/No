// G4-05: dựng đường cong cả trang từ các dòng chữ (textlines.ts). Thuần, không phụ thuộc trình duyệt.
// Mỗi dòng → parabol y = a + b·x + c·x² (tọa độ chuẩn hóa). Độ nghiêng b và độ cong c đổi dần theo chiều dọc
// nên được nội suy theo vị trí dòng (a) → trường dịch dọc dy(x, y) cho mọi điểm trên trang.
import type { TextLine } from "./textlines";

export type LineFit = { a: number; b: number; c: number; rms: number };
export type PageCurve = { lines: LineFit[]; bend: number };

/** Bình phương tối thiểu bậc 2, x quanh 0,5 cho ổn định. */
export function fitLine(l: TextLine): LineFit | null {
  const n = l.pts.length; if (n < 3) return null;
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  for (const [px, y] of l.pts) { const x = px - 0.5, x2 = x * x; s0++; s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2; t0 += y; t1 += x * y; t2 += x2 * y; }
  const det = (m: number[]) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const M = [s0, s1, s2, s1, s2, s3, s2, s3, s4]; const D = det(M); if (Math.abs(D) < 1e-12) return null;
  const a = det([t0, s1, s2, t1, s2, s3, t2, s3, s4]) / D;
  const b = det([s0, t0, s2, s1, t1, s3, s2, t2, s4]) / D;
  const c = det([s0, s1, t0, s1, s2, t1, s2, s3, t2]) / D;
  let e = 0; for (const [px, y] of l.pts) { const x = px - 0.5; e += (y - (a + b * x + c * x * x)) ** 2; }
  return { a, b, c, rms: Math.sqrt(e / n) };
}

/** Bỏ dòng khớp kém hoặc cong lệch hẳn số đông (hình minh họa, chú thích lẫn vào). */
export function buildPageCurve(lines: TextLine[]): PageCurve | null {
  let fits = lines.map(fitLine).filter((f): f is LineFit => !!f && f.rms < 0.01);
  if (fits.length < 3) return null;
  const cs = fits.map((f) => f.c).sort((x, y) => x - y); const med = cs[cs.length >> 1];
  const dev = cs.map((c) => Math.abs(c - med)).sort((x, y) => x - y)[cs.length >> 1];
  fits = fits.filter((f) => Math.abs(f.c - med) <= Math.max(3 * dev, 0.02)).sort((p, q) => p.a - q.a);
  if (fits.length < 3) return null;
  // G4-07 (ảnh thật): trang phẳng cho các độ cong lộn xộn, đổi dấu (nhiễu, bảng, chữ ký). Trang sách cong thật
  // thì độ cong đổi êm theo chiều dọc. Khớp c (và b) theo a bằng đường thẳng; lệch nhiều → không nắn.
  const lin = (k: "b" | "c") => { const n = fits.length; let sa = 0, sv = 0, saa = 0, sav = 0; for (const f of fits) { sa += f.a; sv += f[k]; saa += f.a * f.a; sav += f.a * f[k]; } const d = n * saa - sa * sa; const m = Math.abs(d) < 1e-12 ? 0 : (n * sav - sa * sv) / d; return [m, (sv - m * sa) / n] as const; };
  const [mc, kc] = lin("c"), [mb, kb] = lin("b");
  const fitC = fits.map((f) => mc * f.a + kc);
  const res = Math.sqrt(fits.reduce((e, f, i) => e + (f.c - fitC[i]) ** 2, 0) / fits.length);
  const size = fitC.reduce((e, v) => e + Math.abs(v), 0) / fits.length;
  if (res > 0.35 * size + 0.004) return null;
  fits = fits.map((f, i) => ({ ...f, c: fitC[i], b: mb * f.a + kb }));
  return { lines: fits, bend: Math.max(...fits.map((f) => Math.abs(f.c) / 4)) };
}

/** Nội suy (b, c) tại hàng chuẩn hóa y của ảnh phẳng. */
function coefAt(pc: PageCurve, y: number): [number, number] {
  const L = pc.lines; if (y <= L[0].a) return [L[0].b, L[0].c];
  for (let i = 1; i < L.length; i++) if (y <= L[i].a) { const t = (y - L[i - 1].a) / (L[i].a - L[i - 1].a || 1); return [L[i - 1].b + t * (L[i].b - L[i - 1].b), L[i - 1].c + t * (L[i].c - L[i - 1].c)]; }
  const z = L[L.length - 1]; return [z.b, z.c];
}

/** Điểm (x, y) của ảnh phẳng nằm ở đâu trên ảnh cong (dịch dọc, giữ nguyên x). */
export function sourceY(pc: PageCurve, x: number, y: number) { const [b, c] = coefAt(pc, y); const u = x - 0.5; return y + b * u + c * u * u; }

/** Nắn ảnh xám: mỗi cột kéo về để các dòng chữ thẳng hàng. Song tuyến theo chiều dọc. */
export function flattenGray(g: ArrayLike<number>, W: number, H: number, pc: PageCurve): Uint8ClampedArray {
  const out = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sy = sourceY(pc, (x + 0.5) / W, (y + 0.5) / H) * H - 0.5;
    const y0 = Math.floor(sy), f = sy - y0;
    const a = g[Math.min(H - 1, Math.max(0, y0)) * W + x], b = g[Math.min(H - 1, Math.max(0, y0 + 1)) * W + x];
    out[y * W + x] = a + (b - a) * f;
  }
  return out;
}

/** Ảnh RGBA → xám thu nhỏ (cạnh dài ≤ max) để dò dòng nhanh; tọa độ chuẩn hóa nên dùng lại được cho ảnh gốc. */
export function smallGray(d: ArrayLike<number>, W: number, H: number, max = 800) {
  const s = Math.min(1, max / Math.max(W, H)); const w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((Math.floor((y * H) / h) * W) + Math.floor((x * W) / w)) * 4; g[y * w + x] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; }
  return { g, w, h };
}

/** G4-06: nắn ảnh màu theo dòng chữ. Trang không đủ dòng hoặc gần phẳng (võng < minBend) → trả nguyên ảnh. */
export function textFlattenRGBA(d: Uint8ClampedArray, W: number, H: number, detect: (g: Uint8Array, w: number, h: number) => TextLine[], minBend = 0.004): Uint8ClampedArray {
  const { g, w, h } = smallGray(d, W, H);
  const pc = buildPageCurve(detect(g, w, h));
  if (!pc || pc.bend < minBend) return d;
  const out = new Uint8ClampedArray(d.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sy = Math.min(H - 1.001, Math.max(0, sourceY(pc, (x + 0.5) / W, (y + 0.5) / H) * H - 0.5));
    const y0 = sy | 0, f = sy - y0, a = (y0 * W + x) * 4, b = a + W * 4, o = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) out[o + k] = d[a + k] + (d[b + k] - d[a + k]) * f;
    out[o + 3] = 255;
  }
  return out;
}
