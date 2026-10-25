// B11: tự chụp theo độ nét. Thuần điểm ảnh — dùng được trong test/Worker.

/** Phương sai Laplacian trên ảnh xám (w×h), chỉ trong khung [x0,y0,x1,y1] (tỉ lệ 0..1). */
export function laplacianVariance(gray: ArrayLike<number>, w: number, h: number, box: [number, number, number, number] = [0, 0, 1, 1]): number {
  const x0 = Math.max(1, Math.floor(box[0] * w)), x1 = Math.min(w - 1, Math.ceil(box[2] * w));
  const y0 = Math.max(1, Math.floor(box[1] * h)), y1 = Math.min(h - 1, Math.ceil(box[3] * h));
  let s = 0, s2 = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * w + x;
    const l = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
    s += l; s2 += l * l; n++;
  }
  if (!n) return 0;
  const m = s / n;
  return s2 / n - m * m;
}

/** RGBA → xám. */
export function toGray(data: ArrayLike<number>, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let k = 0; k < g.length; k++) g[k] = 0.299 * data[k * 4] + 0.587 * data[k * 4 + 1] + 0.114 * data[k * 4 + 2];
  return g;
}

export interface FocusOptions {
  floor: number;      // dưới mức này luôn coi là mờ (khung trống/rất mờ)
  relative: number;   // phải ≥ relative × đỉnh gần đây
  window: number;     // số khung giữ để tính đỉnh
  stable: number;     // số khung nét liên tiếp mới cho chụp
  warmup: number;     // số khung tối thiểu trước khi biết đỉnh nét của máy
}
export const DEFAULT_FOCUS: FocusOptions = { floor: 20, relative: 0.8, window: 16, stable: 3, warmup: 5 };

export type FocusState = "blur" | "focusing" | "sharp";

/** Cổng độ nét: mỗi khung gọi push(score). ok=true khi đủ nét ổn định. */
export class FocusGate {
  private hist: number[] = [];
  private run = 0;
  constructor(private opt: FocusOptions = DEFAULT_FOCUS) {}
  push(score: number): { state: FocusState; ok: boolean; level: number } {
    const h = this.hist; h.push(score); if (h.length > this.opt.window) h.shift();
    const peak = Math.max(...h);
    // Khi chưa đủ khung khởi động, chưa biết đỉnh → không báo đầy (tránh khung mờ đầu tiên hiện 100 %).
    const warm = h.length >= this.opt.warmup;
    const level = score < this.opt.floor ? 0.3 * score / this.opt.floor : peak > 0 ? Math.min(1, score / peak) * (warm ? 1 : 0.5) : 0;
    const sharp = score >= this.opt.floor && score >= peak * this.opt.relative;
    this.run = sharp ? this.run + 1 : 0;
    const ok = this.run >= this.opt.stable && h.length >= this.opt.warmup;
    return { state: !sharp ? (score < this.opt.floor ? "blur" : "focusing") : ok ? "sharp" : "focusing", ok, level };
  }
  /** Ảnh đã chụp có đạt so với đỉnh khung sống không (dùng sau chụp). */
  accept(score: number, ratio = 0.6): boolean {
    const peak = Math.max(0, ...this.hist);
    return score >= this.opt.floor && (peak === 0 || score >= peak * ratio);
  }
  /** Sau mỗi lần chụp: bắt đầu đếm lại nhưng giữ đỉnh nét đã biết (tránh coi khung mờ là đỉnh). */
  restart() { this.run = 0; }
  reset() { this.hist = []; this.run = 0; }
}
