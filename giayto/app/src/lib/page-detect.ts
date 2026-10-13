// G2-05: nhận trang mới khi chụp hàng loạt bằng so khác biệt khung hình.
// Thuần điểm ảnh, không cần canvas — dùng được trong Worker và test.

export type Signature = Float32Array; // lưới xám SIG×SIG, giá trị 0..255

export const SIG = 24;

/** Thu khung RGBA về lưới xám SIG×SIG (trung bình khối), đã chuẩn hoá độ sáng trung bình. */
export function frameSignature(data: Uint8ClampedArray | Uint8Array, w: number, h: number, size = SIG): Signature {
  const sum = new Float64Array(size * size);
  const cnt = new Uint32Array(size * size);
  const step = Math.max(1, Math.floor(Math.min(w, h) / (size * 4))); // lấy mẫu thưa cho nhanh
  for (let y = 0; y < h; y += step) {
    const gy = Math.min(size - 1, Math.floor((y * size) / h));
    for (let x = 0; x < w; x += step) {
      const gx = Math.min(size - 1, Math.floor((x * size) / w));
      const i = (y * w + x) * 4;
      sum[gy * size + gx] += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      cnt[gy * size + gx]++;
    }
  }
  const out = new Float32Array(size * size);
  let mean = 0;
  for (let k = 0; k < out.length; k++) { out[k] = cnt[k] ? sum[k] / cnt[k] : 0; mean += out[k]; }
  mean /= out.length;
  // bỏ chênh sáng tổng thể (đèn tự chỉnh phơi sáng) → chỉ so cấu trúc
  for (let k = 0; k < out.length; k++) out[k] = out[k] - mean + 128;
  return out;
}

/** Khác biệt trung bình tuyệt đối giữa hai chữ ký (0..255). */
export function signatureDiff(a: Signature, b: Signature): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 255;
  let s = 0;
  for (let k = 0; k < n; k++) s += Math.abs(a[k] - b[k]);
  return s / n;
}

export interface DetectOptions {
  motion: number;      // khác khung trước > mức này = đang lật/di chuyển
  still: number;       // khác khung trước < mức này = đứng yên
  stableFrames: number; // số khung đứng yên liên tiếp để chụp
  newPage: number;     // khác trang đã chụp > mức này = trang mới
}

export const DEFAULT_DETECT: DetectOptions = { motion: 12, still: 4, stableFrames: 6, newPage: 10 };

export type DetectEvent = "idle" | "moving" | "settling" | "capture";

/**
 * Máy trạng thái: mỗi khung gọi push(sig).
 * Trả "capture" đúng một lần khi khung đã đứng yên đủ lâu và khác trang chụp gần nhất.
 */
export class PageDetector {
  private prev: Signature | null = null;
  private last: Signature | null = null; // trang đã chụp gần nhất
  private still = 0;
  private armed = true; // trang đầu tiên được chụp khi đứng yên
  constructor(private opt: DetectOptions = DEFAULT_DETECT) {}

  /** ready=false: khung chưa đạt điều kiện khác (mờ, lóa, chưa khớp mép) — không chụp, giữ lượt chờ. */
  push(sig: Signature, ready = true): DetectEvent {
    const prev = this.prev;
    this.prev = sig;
    if (!prev) return "idle";
    const d = signatureDiff(prev, sig);
    if (d > this.opt.motion) { this.still = 0; this.armed = true; return "moving"; }
    if (d >= this.opt.still) { this.still = 0; return this.armed ? "settling" : "idle"; }
    this.still++;
    if (!this.armed) return "idle";
    if (this.still < this.opt.stableFrames || !ready) return "settling";
    if (this.last && signatureDiff(this.last, sig) <= this.opt.newPage) {
      this.armed = false; // vẫn là trang cũ, chờ lật trang
      return "idle";
    }
    this.last = sig;
    this.armed = false;
    this.still = 0;
    return "capture";
  }

  /** Gọi khi người dùng chụp tay, để không chụp trùng trang đó. */
  markCaptured(sig: Signature) { this.last = sig; this.armed = false; this.still = 0; }

  reset() { this.prev = this.last = null; this.still = 0; this.armed = true; }
}
