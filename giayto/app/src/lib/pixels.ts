import { deshadowPixels } from "./illum";
import { applyTools, type Tools } from "./tool-levels";
import { autoLevel } from "./auto-level";
import { edgeSaturatedMask, inkCurve, inkDeepen } from "./ink-deepen";
import { lineSkewRefine, lineSkewRefineTop, lineSkewRefineTopSide } from "./line-skew";
import { smoothSkewCorrect } from "./skew-field";
import { textFlattenRGBA } from "./page-curve";
import { detectTextLines } from "./textlines";
import { cleanBorder, sharpenLuma, warpCurved, type Curves } from "./dewarp";
import { sharpenAdaptive } from "./sharpen-adaptive";
import { paperMaskFill, edgeShadowLift, edgeShadowSmooth, edgeSpeckClean, edgeLineClean, edgeDashClean, edgeStrokeClean, edgeFrameClean, greyBlockLift, edgeCornerClean, cornerShadowLift } from "./paper-mask";
/** Thuật toán điểm ảnh thuần (không dùng canvas/DOM) — chạy được cả luồng chính lẫn Web Worker. */
export type Px = Uint8ClampedArray;
export type PixelJob =
  | { op: "warp"; src: Px; W: number; H: number; q: [number, number][]; ow: number; oh: number; curves?: Curves }
  | { op: "sharpen"; d: Px; W: number; H: number; amount: number }
  | { op: "textflat"; d: Px; W: number; H: number }
  | { op: "clean"; d: Px; W: number; H: number }
  | { op: "gray"; d: Px; W: number; H: number }
  | { op: "threshold"; d: Px; W: number; H: number; ink: boolean }
  | { op: "style"; d: Px; W: number; H: number; mode: StyleMode }
  | { op: "unsharp"; d: Px; W: number; H: number; amount: number }
  | { op: "tone"; d: Px; W: number; H: number; brightness: number; contrast: number }
  | { op: "flatten"; d: Px; W: number; H: number }
  | { op: "flatten-apply"; d: Px; W: number; H: number; maps: FlattenMaps }
  | { op: "deshadow"; d: Px; W: number; H: number }
  | { op: "deskew"; d: Px; W: number; H: number }
  | { op: "docchain"; d: Px; W: number; H: number; sharp: boolean }
  | { op: "tools"; d: Px; W: number; H: number; tools: Tools };

function solve(A: number[][], b: number[]) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return x;
}
export function homography(from: [number, number][], to: [number, number][]) {
  const A: number[][] = []; const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i]; const [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  return solve(A, b);
}

/** Nắn phối cảnh, nội suy song tuyến. q = 4 góc (pixel) trên ảnh nguồn. */
export function warpPixels(sd: Px, W: number, H: number, q: [number, number][], ow: number, oh: number): Px {
  const od = new Uint8ClampedArray(ow * oh * 4);
  const h = homography([[0, 0], [ow, 0], [ow, oh], [0, oh]], q);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const d = h[6] * x + h[7] * y + 1;
    const u = Math.min(W - 1.001, Math.max(0, (h[0] * x + h[1] * y + h[2]) / d));
    const v = Math.min(H - 1.001, Math.max(0, (h[3] * x + h[4] * y + h[5]) / d));
    const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0;
    const i00 = (v0 * W + u0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4, oi = (y * ow + x) * 4;
    for (let k = 0; k < 3; k++) od[oi + k] = (sd[i00 + k] * (1 - fu) + sd[i10 + k] * fu) * (1 - fv) + (sd[i01 + k] * (1 - fu) + sd[i11 + k] * fu) * fv;
    od[oi + 3] = 255;
  }
  return od;
}

/** Unsharp mask: out = px + amount·(px − blur3x3). */
export function unsharp(d: Px, W: number, H: number, amount: number, threshold = 3) {
  const src = new Uint8ClampedArray(d); const row = W * 4;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * row + x * 4;
    for (let k = 0; k < 3; k++) {
      const j = i + k;
      const b = (src[j - row - 4] + src[j - row] + src[j - row + 4] + src[j - 4] + src[j] + src[j + 4] + src[j + row - 4] + src[j + row] + src[j + row + 4]) / 9;
      const diff = src[j] - b; if (Math.abs(diff) > threshold) d[j] = src[j] + amount * diff;
    }
  }
  return d;
}

export function grayPixels(d: Px) {
  for (let i = 0; i < d.length; i += 4) { const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; d[i] = d[i + 1] = d[i + 2] = g; }
  return d;
}

/**
 * Ngưỡng Sauvola (G1-06): T = m · (1 + k · (s/R − 1)), m/s là trung bình/độ lệch chuẩn cục bộ
 * tính bằng 2 ảnh tích phân. Giữ nét chữ mảnh, không sinh nhiễu ở vùng nền phẳng. ink = chữ xám đậm.
 */
export function thresholdPixels(d: Px, W: number, H: number, ink: boolean, k = 0.34, R = 128) {
  const g = new Float32Array(W * H); const W1 = W + 1;
  const I = new Float64Array(W1 * (H + 1)), I2 = new Float64Array(W1 * (H + 1));
  for (let i = 0, p = 0; i < d.length; i += 4, p++) g[p] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  for (let y = 1; y <= H; y++) {
    let row = 0, row2 = 0;
    for (let x = 1; x <= W; x++) {
      const v = g[(y - 1) * W + x - 1]; row += v; row2 += v * v;
      I[y * W1 + x] = I[(y - 1) * W1 + x] + row; I2[y * W1 + x] = I2[(y - 1) * W1 + x] + row2;
    }
  }
  const r = Math.max(8, Math.round(Math.min(W, H) / 24));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r), y0 = Math.max(0, y - r), y1 = Math.min(H, y + r);
    const n = (x1 - x0) * (y1 - y0);
    const a = y1 * W1 + x1, b = y0 * W1 + x1, c = y1 * W1 + x0, e = y0 * W1 + x0;
    const m = (I[a] - I[b] - I[c] + I[e]) / n;
    const s = Math.sqrt(Math.max(0, (I2[a] - I2[b] - I2[c] + I2[e]) / n - m * m));
    const p = y * W + x; const v = g[p] < m * (1 + k * (s / R - 1)) ? (ink ? 24 : 0) : 255; // R6.1b-2: 45 → 24 (L*(45)=49 ⇒ ΔL 51 cố định; 24 ⇒ ΔL ≈ 63)
    d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = v;
  }
  return d;
}

export function tonePixels(d: Px, brightness: number, contrast: number) {
  const cf = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.max(0, cf * (d[i + k] - 128) + 128 + brightness));
  return d;
}

/** Chia nền sáng không đều: ước lượng nền giấy (thu nhỏ + lọc max + làm mờ + phóng lại) rồi chuẩn hoá về trắng. Thuần điểm ảnh. */
/** Ảnh nền giấy ở một tỉ lệ: trung bình khối → max 3×3 hai lần (xoá chữ) → mờ hộp 3×3 hai lần. */
function bgMap(d: Px, W: number, H: number, div: number) {
  const sw = Math.max(8, Math.round(W / div)), sh = Math.max(8, Math.round(H / div));
  let small = new Float32Array(sw * sh * 3);
  const bw = W / sw, bh = H / sh;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const x0 = Math.floor(x * bw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * bw));
    const y0 = Math.floor(y * bh), y1 = Math.max(y0 + 1, Math.floor((y + 1) * bh));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * W + xx) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    const o = (y * sw + x) * 3; small[o] = r / n; small[o + 1] = g / n; small[o + 2] = b / n;
  }
  const pass = (fn: (src: Float32Array, x: number, y: number, k: number) => number) => {
    const src = small; const out = new Float32Array(src.length);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) for (let k = 0; k < 3; k++) out[(y * sw + x) * 3 + k] = fn(src, x, y, k);
    small = out;
  };
  const maxF = (src: Float32Array, x: number, y: number, k: number) => { let m = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = Math.min(sw - 1, Math.max(0, x + dx)), yy = Math.min(sh - 1, Math.max(0, y + dy)); m = Math.max(m, src[(yy * sw + xx) * 3 + k]); }
    return m; };
  const boxF = (src: Float32Array, x: number, y: number, k: number) => { let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && xx < sw && yy >= 0 && yy < sh) { s += src[(yy * sw + xx) * 3 + k]; n++; } }
    return s / n; };
  const minF = (src: Float32Array, x: number, y: number, k: number) => { let m = 255;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = Math.min(sw - 1, Math.max(0, x + dx)), yy = Math.min(sh - 1, Math.max(0, y + dy)); m = Math.min(m, src[(yy * sw + xx) * 3 + k]); }
    return m; };
  // đóng hình thái (max rồi min): xoá chữ nhưng giữ đúng vị trí mép bóng; mịn thì chỉ làm mờ một lượt
  pass(maxF); pass(maxF); pass(minF); pass(minF); pass(boxF); if (div < 48) pass(boxF);
  return { small, sw, sh, bw, bh };
}
/** Bản đồ nền giấy ở một tỉ lệ — độc lập độ phân giải ảnh đích (S15d: đo trên bản nhỏ, áp lên bản lớn). */
export type BgMap = { small: Float32Array; sw: number; sh: number };
export type FlattenMaps = { coarse: BgMap; fine: BgMap | null };

/**
 * B6: chuẩn hoá nền đa tỉ lệ. Nền thô (khối W/24) chịu mảng chữ đậm; nền mịn (W/64) bám mép bóng tay.
 * Dùng nền mịn, trừ chỗ tối sâu hơn 40 % so với nền thô (khối ảnh/chữ lớn) thì giữ nền thô; chia ra rồi đẩy giấy về 250–255.
 */
/** Đo bản đồ nền (thô + mịn) từ ảnh ở bất kỳ độ phân giải nào — S15d: gọi trên bản ≤1000 px. */
export function flattenMap(d: Px, W: number, H: number): FlattenMaps {
  return { coarse: bgMap(d, W, H, 24), fine: Math.min(W, H) >= 256 ? bgMap(d, W, H, 64) : null };
}
/** Bảng nội suy theo một trục: chỉ số ô và phần lẻ cho từng toạ độ (giống hệt sampleBg). */
function axisLut(n: number, cells: number) {
  const b = n / cells, i0 = new Int32Array(n), f = new Float32Array(n);
  for (let p = 0; p < n; p++) { const u = Math.min(cells - 1.001, Math.max(0, (p + 0.5) / b - 0.5)); i0[p] = u | 0; f[p] = u - (u | 0); }
  return { i0, f };
}
/**
 * Áp bản đồ nền lên ảnh ở bất kỳ độ phân giải nào (nội suy song tuyến theo toạ độ chuẩn hoá).
 * V6: tách song tuyến thành 2 trục — nội suy dọc 1 lần/hàng trên lưới nhỏ, mỗi điểm chỉ còn 1 phép nội suy ngang;
 * bảng chỉ số dựng sẵn. Cùng công thức với sampleBg nên kết quả giống (sai lệch làm tròn float ≤ 1 mức).
 */
export function flattenApply(d: Px, W: number, H: number, maps: FlattenMaps) {
  const { coarse, fine } = maps;
  const cx = axisLut(W, coarse.sw), cy = axisLut(H, coarse.sh);
  const fx = fine ? axisLut(W, fine.sw) : null, fy = fine ? axisLut(H, fine.sh) : null;
  const rowC = new Float32Array(coarse.sw * 3), rowF = new Float32Array(fine ? fine.sw * 3 : 0);
  const vRow = (m: BgMap, v0: number, fv: number, out: Float32Array) => {
    const s = m.small, a = v0 * m.sw * 3, b = a + m.sw * 3;
    for (let i = 0; i < m.sw * 3; i++) out[i] = s[a + i] * (1 - fv) + s[b + i] * fv;
  };
  for (let y = 0; y < H; y++) {
    vRow(coarse, cy.i0[y], cy.f[y], rowC);
    if (fine) vRow(fine, fy!.i0[y], fy!.f[y], rowF);
    let o = y * W * 4;
    for (let x = 0; x < W; x++, o += 4) {
      const ci = cx.i0[x] * 3, cf = cx.f[x];
      const fi = fine ? fx!.i0[x] * 3 : 0, ff = fine ? fx!.f[x] : 0;
      for (let k = 0; k < 3; k++) {
        let bg = rowC[ci + k] * (1 - cf) + rowC[ci + 3 + k] * cf;
        if (fine) { const f = rowF[fi + k] * (1 - ff) + rowF[fi + 3 + k] * ff; if (f >= bg * 0.6) bg = f; }
        const v = (d[o + k] * 253) / Math.max(40, bg);
        d[o + k] = v >= 235 ? Math.min(255, 250 + (v - 235) * 0.3) : Math.min(255, v + Math.max(0, (v - 200) / 35) * 15);
      }
    }
  }
  return d;
}
export function flattenPixels(d: Px, W: number, H: number) {
  return flattenApply(d, W, H, flattenMap(d, W, H));
}

function otsuPx(g: Uint8ClampedArray | number[]) {
  const hist = new Array(256).fill(0); for (const v of g) hist[v | 0]++;
  const total = g.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, t = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break;
    sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF; const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; t = i; }
  }
  return t;
}

/** Ước lượng độ nghiêng nhỏ (±5°) từ dữ liệu điểm ảnh thô. */
export function estimateSkewPx(d: Px, W: number, H: number) {
  const s = Math.min(1, 600 / Math.max(W, H)); const w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
  const g = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(W - 1, Math.round((x + 0.5) * (W / w))), sy = Math.min(H - 1, Math.round((y + 0.5) * (H / h)));
    const i = (sy * W + sx) * 4; g[y * w + x] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  }
  const t = otsuPx(g);
  const ink: number[] = []; const mx = Math.round(w * 0.05), my = Math.round(h * 0.05);
  for (let y = my; y < h - my; y++) for (let x = mx; x < w - mx; x++) if (g[y * w + x] < t - 10) ink.push(x, y);
  if (ink.length < 400 || ink.length / 2 > w * h * 0.35) return 0;
  const score = (deg: number) => {
    const a = (deg * Math.PI) / 180, tn = Math.tan(a); const rows = new Float64Array(h * 2);
    for (let i = 0; i < ink.length; i += 2) { const r = Math.round(ink[i + 1] - (ink[i] - w / 2) * tn) + h / 2; if (r >= 0 && r < rows.length) rows[r]++; }
    let v = 0; for (let i = 1; i < rows.length; i++) v += (rows[i] - rows[i - 1]) ** 2; return v;
  };
  let best = 0, bs = score(0);
  for (let dg = -5; dg <= 5; dg += 0.5) { const v = score(dg); if (v > bs) { bs = v; best = dg; } }
  const c0 = best; for (let dg = c0 - 0.4; dg <= c0 + 0.4; dg += 0.1) { const v = score(dg); if (v > bs) { bs = v; best = dg; } }
  return Math.abs(best) < 0.25 || bs < score(0) * 1.05 ? 0 : best;
}

/** Xoay thẳng ảnh theo độ nghiêng ước lượng; zoom nhẹ để góc trống khớp màu giấy. Thuần điểm ảnh, kích thước giữ nguyên. */
export function deskewPixels(d: Px, W: number, H: number) {
  const deg = estimateSkewPx(d, W, H); if (!deg) return d;
  const a = (deg * Math.PI) / 180; const zoom = 1 + Math.abs(Math.sin(a)) * Math.max(W / H, H / W);
  const cos = Math.cos(a) / zoom, sin = Math.sin(a) / zoom; // xoay ngược -a, chia zoom
  const out = new Uint8ClampedArray(d.length);
  const cx = W / 2, cy = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy;
    const u = Math.min(W - 1.001, Math.max(0, dx * cos - dy * sin + cx));
    const v = Math.min(H - 1.001, Math.max(0, dx * sin + dy * cos + cy));
    const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0;
    const i00 = (v0 * W + u0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4, oi = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) out[oi + k] = (d[i00 + k] * (1 - fu) + d[i10 + k] * fu) * (1 - fv) + (d[i01 + k] * (1 - fu) + d[i11 + k] * fu) * fv;
    out[oi + 3] = 255;
  }
  return out;
}

export type StyleMode = "eco" | "vivid" | "bright";
/**
 * Bộ lọc G1-07. eco: xám, giấy về trắng, mực đen nhạt về ~xám đậm (tốn ít mực hơn khi in);
 * vivid: tăng độ bão hòa ×1.5 quanh độ sáng + tương phản nhẹ; bright: nâng vùng tối (gamma 0.7), giữ màu.
 */
export function stylePixels(d: Px, mode: StyleMode) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]; const y = r * 0.3 + g * 0.59 + b * 0.11;
    if (mode === "eco") {
      // R6.1a: đường cong dốc hơn — nét xám giữa kéo xuống đậm (ΔL ≥ 60), giấy vẫn về trắng.
      const t = Math.min(1, Math.max(0, (y - 30) / 175)); // 30→0, 205→1
      const v = 255 * Math.pow(t, 2.2);
      d[i] = d[i + 1] = d[i + 2] = inkCurve(v); // R6.1b-2: đậm hoá nét (ΔL eco 36–51 → ≥ 60)
    } else if (mode === "vivid") {
      for (let k = 0; k < 3; k++) { const c = y + (d[i + k] - y) * 1.5; d[i + k] = Math.min(255, Math.max(0, (c - 128) * 1.1 + 128)); }
    } else {
      for (let k = 0; k < 3; k++) d[i + k] = 255 * Math.pow(d[i + k] / 255, 0.7);
    }
  }
  return d;
}

/** Chạy một việc điểm ảnh, trả về bộ đệm kết quả. */
export function runJob(j: PixelJob): Px {
  switch (j.op) {
    case "warp": return warpCurved(j.src, j.W, j.H, j.q, j.ow, j.oh, j.curves ?? []);
    case "textflat": return textFlattenRGBA(j.d, j.W, j.H, detectTextLines);
    case "sharpen": return sharpenAdaptive(j.d, j.W, j.H, j.amount);
    case "clean": return cleanEdges(j.d, j.W, j.H); // S15j: gom bộ làm sạch mép
    case "gray": return grayPixels(j.d);
    case "threshold": return thresholdPixels(flattenPixels(j.d, j.W, j.H), j.W, j.H, j.ink); // B6: chuẩn hoá nền trước Sauvola
    case "unsharp": return unsharp(j.d, j.W, j.H, j.amount);
    case "style": return stylePixels(j.d, j.mode);
    case "tone": return tonePixels(j.d, j.brightness, j.contrast);
    case "flatten": return flattenPixels(j.d, j.W, j.H);
    case "flatten-apply": return flattenApply(j.d, j.W, j.H, j.maps); // S15d: nền đo sẵn trên bản nhỏ
    case "deshadow": return deshadowPixels(j.d, j.W, j.H);
    case "deskew": return deskewPixels(j.d, j.W, j.H);
    case "docchain": return docChain(j.d, j.W, j.H, j.sharp);
    case "tools": return applyTools(j.d, j.W, j.H, j.tools);
  }
}

/** S15e: chuỗi Tài liệu sáng/Sắc nét (kéo mức → nắn dòng → làm nét → nắn nửa trên) trong một việc Worker. */
export function docChain(d: Px, W: number, H: number, sharp: boolean): Px {
  // R6.1a: tăng boost đậm hoá nét mực (ΔL cổng 17.4 ≥ 60); nền giấy vẫn neo ở PAPER_TARGET.
  autoLevel(d, sharp ? 1.85 : 1.55);
  d.set(lineSkewRefine(d, W, H, 2).data);
  d.set(lineSkewRefineTop(d, W, H, 2).data);
  d.set(sharpenAdaptive(d, W, H, sharp ? 1.4 : 0.9)); // S15h
  d.set(lineSkewRefineTopSide(d, W, H, 2).data);
  d.set(smoothSkewCorrect(d, W, H).data); // S15i3: chỉ giữ khi trang thẳng hơn
  inkDeepen(d, undefined, undefined, edgeSaturatedMask(d, W, H)); // R6.1b-2: auto/sharp ΔL trung vị 52/59 → ≥ 60; HM-11: giữ khối màu ở mép
  return d;
}

/** S15j: thứ tự làm sạch mép (giữ đúng thứ tự cũ: xoá nêm → mặt nạ giấy → bóng → chấm/vạch/khung → góc → nâng bóng góc R6.1b-3). */
export const EDGE_CLEAN_STEPS: ReadonlyArray<(d: Px, W: number, H: number) => Px> = [
  cleanBorder, paperMaskFill, edgeShadowLift, edgeShadowSmooth, edgeSpeckClean, edgeLineClean,
  edgeDashClean, edgeStrokeClean, greyBlockLift, edgeFrameClean, edgeCornerClean, cornerShadowLift,
];
export function cleanEdges(d: Px, W: number, H: number): Px {
  return EDGE_CLEAN_STEPS.reduce((a, f) => f(a, W, H), d);
}
