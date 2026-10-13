/** S15h: làm nét thích nghi, bảo vệ nét mảnh.
 *  - Gain giảm dần khi chênh lệch lớn (cạnh đã đậm không bị quầng sáng).
 *  - Kết quả bị kẹp trong [min,max] độ sáng 3×3 quanh điểm → không vọt lố, nét 1 px không bị
 *    "ăn" thành trắng hay loang đen; vùng phẳng (|diff| ≤ threshold) giữ nguyên để không nổi nhiễu. */
type Px = Uint8ClampedArray;
const ci = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export function adaptiveGain(diff: number, amount: number, knee = 40) {
  const a = Math.abs(diff);
  return amount / (1 + a / knee);
}

export function sharpenAdaptive(d: Px, W: number, H: number, amount: number, threshold = 4) {
  const n = W * H, L = new Float32Array(n), t = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  const k = [1, 4, 6, 4, 1];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let j = -2; j <= 2; j++) s += k[j + 2] * L[y * W + ci(x + j, 0, W - 1)]; t[y * W + x] = s / 16; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; for (let j = -2; j <= 2; j++) s += k[j + 2] * t[ci(y + j, 0, H - 1) * W + x]; B[y * W + x] = s / 16; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, diff = L[i] - B[i];
    if (Math.abs(diff) <= threshold) continue;
    let lo = 255, hi = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const v = L[ci(y + dy, 0, H - 1) * W + ci(x + dx, 0, W - 1)]; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    const target = ci(L[i] + adaptiveGain(diff, amount) * diff, lo, hi);
    const add = target - L[i];
    d[i * 4] = d[i * 4] + add; d[i * 4 + 1] = d[i * 4 + 1] + add; d[i * 4 + 2] = d[i * 4 + 2] + add;
  }
  return d;
}
