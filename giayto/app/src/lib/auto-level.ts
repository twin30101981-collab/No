/**
 * S11b – Kéo mức "Tài liệu sáng" có giới hạn làm trắng.
 * Trước: điểm trắng = P92 độ sáng → ~8 % điểm sáng nhất (cả nền giấy) bị ép 255, nét mảnh/dấu nhạt dễ mất.
 * Nay: trung vị nền giấy → đích ~248 (không kẹp P10 lên 255); điểm sáng hơn nền mới tiến dần về 255.
 * Nét tối giữ tỉ lệ tuyến tính nên dấu tiếng Việt, mực xanh nhạt, chữ ký mảnh không bị tẩy.
 */
export const PAPER_TARGET = 248;

export function levelParams(d: ArrayLike<number>, n = d.length) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i += 16) hist[(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0]++;
  const total = Math.ceil(n / 16);
  let acc = 0, lo = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > total * 0.01) { lo = i; break; } }
  // nền giấy = trung vị các điểm sáng hơn ngưỡng giữa (lo, P99)
  acc = 0; let top = 255;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > total * 0.01) { top = i; break; } }
  const mid = (lo + top) >> 1; let cnt = 0;
  for (let i = mid; i < 256; i++) cnt += hist[i];
  acc = 0; let paper = top;
  for (let i = mid; i < 256; i++) { acc += hist[i]; if (acc >= cnt / 2) { paper = i; break; } }
  paper = Math.max(lo + 30, paper);
  return { lo, paper };
}

/** Áp mức tại chỗ trên RGBA. boost > 1 tăng tương phản nét (chế độ Sắc nét). */
export function autoLevel(d: Uint8ClampedArray, boost = 1) {
  const n = d.length;
  const { lo, paper } = levelParams(d, n);
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let y: number;
    if (v <= paper) {
      const t = Math.max(0, (v - lo) / (paper - lo));
      y = PAPER_TARGET * Math.pow(t, boost); // boost làm đậm nét giữa, không chạm nền
    } else {
      // vùng sáng hơn nền: nén mềm về 255, không cắt cứng
      y = PAPER_TARGET + (255 - PAPER_TARGET) * Math.min(1, (v - paper) / Math.max(1, 255 - paper));
    }
    lut[v] = Math.round(y);
  }
  for (let i = 0; i < n; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
  showThroughLift(d);
  return { lo, paper };
}

/**
 * S11d – Làm nhạt chữ hằn mặt sau (show-through).
 * Chữ hằn sau khi kéo mức: xám nhạt (≈ 200–245), gần như không màu.
 * Điểm xám trong dải đó được đẩy mềm về nền; mực màu (độ bão hoà ≥ SAT_KEEP)
 * và nét thật đậm hơn LIFT_LO giữ nguyên.
 */
export const LIFT_LO = 200;
export const SAT_KEEP = 22;
export function showThroughLift(d: Uint8ClampedArray, lo = LIFT_LO, hi = PAPER_TARGET) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn >= SAT_KEEP) continue;
    const y = r * 0.3 + g * 0.59 + b * 0.11;
    if (y < lo || y >= hi) continue;
    const t = (y - lo) / (hi - lo);
    const k = t * t * (3 - 2 * t); // smoothstep: gần lo giữ, gần nền tan hẳn
    const add = (hi - y) * k;
    d[i] = r + add; d[i + 1] = g + add; d[i + 2] = b + add;
  }
}
