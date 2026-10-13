/**
 * R6.1b-2 – Đậm hoá nét mực sau cùng (cổng 17.4: ΔL ≥ 60 ⇒ trung vị mực L* ≤ 40 ⇔ độ sáng ≲ 95).
 * Chỉ tác động vùng tối hơn gối KNEE; nền giấy (≥ KNEE) giữ nguyên nên không làm lệch nền.
 * Màu mực (đỏ/xanh) giữ sắc độ: nhân cả 3 kênh theo cùng tỉ lệ độ sáng.
 */
export const INK_KNEE = 200;
export const INK_GAMMA = 3.0;

export function inkCurve(v: number, knee = INK_KNEE, gamma = INK_GAMMA) {
  return v >= knee ? v : knee * Math.pow(Math.max(0, v) / knee, gamma);
}

/**
 * HM-11 (R6.1e, Q3=a): điểm màu bão hoà-tối Ở MÉP TRANG (số trang đỏ, logo) chỉ được tối đi tối đa còn SAT_FLOOR lần mỗi lượt.
 * Hai lượt đậm hoá (200/3,0 rồi 170/2,2) trước đây ép khối đỏ (độ sáng ≈ 75) xuống ≈ 3 → đen; cổng R6.1 đếm điểm rất tối ở 4 góc
 * (ảnh NB: góc dưới-trái 0,7% → 42,6%). Chỉ bảo vệ dải mép: bảo vệ toàn trang làm ΔL (chữ/nền) tụt 83 → 54 vì trang màu nhiều.
 * Chữ/mực trung tính và mọi điểm thân trang không đổi.
 */
export const SAT_FLOOR = 0.6;
export const EDGE_BAND = 0.08; // dải mép mỗi cạnh (tỉ lệ cạnh)
const saturated = (r: number, g: number, b: number) => { const mx = Math.max(r, g, b), c = mx - Math.min(r, g, b); return c >= 30 && c >= 0.3 * mx; };

/** Mặt nạ 1 byte/điểm ảnh: điểm màu bão hoà-tối (độ sáng < 170) nằm trong dải mép. Tính TRƯỚC khi bộ lọc làm mất màu. */
export function edgeSaturatedMask(d: ArrayLike<number>, W: number, H: number): Uint8Array {
  const m = new Uint8Array(W * H), bx = Math.ceil(W * EDGE_BAND), by = Math.ceil(H * EDGE_BAND);
  for (let y = 0; y < H; y++) {
    const full = y < by || y >= H - by;
    for (let x = 0; x < W; x++) {
      if (!full && x >= bx && x < W - bx) { x = W - bx - 1; continue; }
      const i = (y * W + x) * 4;
      if (d[i + 3] !== 0 && saturated(d[i]!, d[i + 1]!, d[i + 2]!) && d[i]! * 0.3 + d[i + 1]! * 0.59 + d[i + 2]! * 0.11 < 170) m[y * W + x] = 1;
    }
  }
  return m;
}

/** `protect` (tuỳ chọn): mặt nạ từ edgeSaturatedMask; điểm được bảo vệ chỉ giảm tối thiểu đến SAT_FLOOR mỗi lượt. */
export function inkDeepen(d: Uint8ClampedArray, knee = INK_KNEE, gamma = INK_GAMMA, protect?: Uint8Array | null) {
  const lut = new Float32Array(256);
  for (let v = 0; v < 256; v++) lut[v] = v ? inkCurve(v, knee, gamma) / v : 0;
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0;
    if (y >= knee) continue;
    let k = lut[y]!;
    if (protect && k < SAT_FLOOR && protect[i >> 2]) k = SAT_FLOOR;
    d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
  }
  return d;
}
