/**
 * G4-15 — Khử nhiễu độ sáng + màu (ảnh chụp thiếu sáng).
 * Độ sáng: lọc song phương 5×5 (giữ cạnh chữ). Màu: làm mờ hộp Cb/Cr bán kính 2.
 * Pure, chạy trên mảng RGBA.
 */
export function denoise(s: Uint8ClampedArray, w: number, h: number, strength = 1): Uint8ClampedArray {
  const n = w * h, Y = new Float32Array(n), U = new Float32Array(n), V = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const r = s[p * 4], g = s[p * 4 + 1], b = s[p * 4 + 2];
    Y[p] = 0.299 * r + 0.587 * g + 0.114 * b; U[p] = b - Y[p]; V[p] = r - Y[p];
  }
  const sig = 18 * strength, inv = -1 / (2 * sig * sig), R = 2;
  const Yo = new Float32Array(n), Uo = new Float32Array(n), Vo = new Float32Array(n);
  const sp: number[] = []; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) sp.push(Math.exp(-(dx * dx + dy * dy) / 4.5));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, c = Y[p]; let sw = 0, sy = 0, su = 0, sv = 0, k = 0, cnt = 0;
    for (let dy = -R; dy <= R; dy++) {
      const yy = Math.min(h - 1, Math.max(0, y + dy));
      for (let dx = -R; dx <= R; dx++, k++) {
        const q = yy * w + Math.min(w - 1, Math.max(0, x + dx)), d = Y[q] - c;
        const wt = sp[k] * Math.exp(d * d * inv); sw += wt; sy += wt * Y[q];
        su += U[q]; sv += V[q]; cnt++;
      }
    }
    Yo[p] = sy / sw; Uo[p] = su / cnt; Vo[p] = sv / cnt;
  }
  const d = new Uint8ClampedArray(s);
  for (let p = 0; p < n; p++) {
    const y = Yo[p], r = Vo[p] + y, b = Uo[p] + y;
    d[p * 4] = r; d[p * 4 + 2] = b; d[p * 4 + 1] = (y - 0.299 * r - 0.114 * b) / 0.587;
  }
  return d;
}

/** Độ nhiễu ước lượng: trung bình |điểm − trung bình 3×3| trên độ sáng. */
export function noiseLevel(s: Uint8ClampedArray, w: number, h: number): number {
  let t = 0, c = 0; const L = (x: number, y: number) => { const p = (y * w + x) * 4; return 0.299 * s[p] + 0.587 * s[p + 1] + 0.114 * s[p + 2]; };
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let m = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m += L(x + dx, y + dy);
    t += Math.abs(L(x, y) - m / 9); c++;
  }
  return c ? t / c : 0;
}
