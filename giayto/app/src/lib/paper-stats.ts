/**
 * S11 – Đo nền giấy (mục 8.3): trung vị độ sáng vùng trống bên trong giấy.
 * Vùng trống = điểm không có mực trong bán kính r (mực = tối hơn ngưỡng Otsu-thô), bỏ lề `margin`.
 * Thuần, chạy được trong kiểm thử/Worker.
 */
type Px = Uint8ClampedArray;
const lum = (d: Px, i: number) => d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;

export type PaperStats = { median: number; p10: number; p90: number; frac: number; inkLost: number };

export function paperStats(d: Px, W: number, H: number, margin = 0.04, r = 4): PaperStats {
  const L = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lum(d, i);
  const hist = new Uint32Array(256); for (let i = 0; i < W * H; i++) hist[L[i]]++;
  // giấy ≈ phân vị 70; mực = tối hơn giấy ≥ 60
  let acc = 0, p70 = 255; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= W * H * 0.7) { p70 = v; break; } }
  const inkT = p70 - 60;
  // tích phân số điểm mực để kiểm tra "không có mực trong ô (2r+1)²"
  const S = new Uint32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += L[y * W + x] < inkT ? 1 : 0; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + row; } }
  const box = (x0: number, y0: number, x1: number, y1: number) => S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0];
  const mx = Math.round(W * margin), my = Math.round(H * margin), ph = new Uint32Array(256); let n = 0, tot = 0;
  for (let y = my; y < H - my; y += 2) for (let x = mx; x < W - mx; x += 2) {
    tot++; if (box(Math.max(0, x - r), Math.max(0, y - r), Math.min(W, x + r + 1), Math.min(H, y + r + 1))) continue;
    ph[L[y * W + x]]++; n++;
  }
  const q = (f: number) => { let a = 0; for (let v = 0; v < 256; v++) { a += ph[v]; if (a >= n * f) return v; } return 255; };
  let ink = 0; for (let v = 0; v < inkT; v++) ink += hist[v];
  return { median: n ? q(0.5) : 0, p10: n ? q(0.1) : 0, p90: n ? q(0.9) : 0, frac: tot ? n / tot : 0, inkLost: ink / (W * H) };
}
