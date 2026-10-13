/**
 * P1.3: bắt khung 4 góc thời gian thực trên ảnh nhỏ 320–480 px.
 * Bản dò leo 320→480 khi mất khung nhiều nhịp liền (tờ xa/nhỏ cần thêm điểm ảnh),
 * hạ về 320 ngay khi đã khoá khung để giữ nhịp camera mượt và tiết kiệm pin.
 */
export const LIVE_DETECT_MIN = 320;
export const LIVE_DETECT_MAX = 480;
/** Số nhịp mất khung liên tiếp trước khi tăng kích thước bản dò. */
export const LIVE_DETECT_ESCALATE_MISS = 6;
/** Bước tăng kích thước bản dò mỗi lần leo. */
export const LIVE_DETECT_STEP = 80;

/**
 * Kích thước bản dò cho nhịp kế tiếp.
 * - Đã khoá khung (steady) → về 320 cho nhẹ.
 * - Mất khung ≥ LIVE_DETECT_ESCALATE_MISS nhịp → tăng LIVE_DETECT_STEP, trần 480.
 * - Còn lại giữ nguyên.
 */
export function nextDetectSize(cur: number, miss: number, locked: boolean): number {
  if (locked) return LIVE_DETECT_MIN;
  if (miss >= LIVE_DETECT_ESCALATE_MISS) return Math.min(LIVE_DETECT_MAX, cur + LIVE_DETECT_STEP);
  return Math.min(LIVE_DETECT_MAX, Math.max(LIVE_DETECT_MIN, cur));
}
