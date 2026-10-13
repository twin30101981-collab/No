/** B2 – Chụp độ phân giải cao, giữ ảnh gốc. */
export const CAPTURE_MAX = 2560;
export const CAPTURE_Q = 0.88;
export const A4_LONG_MM = 297;

/** Ràng buộc camera thử lần lượt: V13-B02: 2560×1920 trước (≈ 219 dpi A4, ít hơn ~60% điểm ảnh so với 4K), hạ dần khi máy không hỗ trợ. */
export function cameraTries(): MediaTrackConstraints[] {
  return [
    { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1920 } },
    { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
    { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
    { facingMode: "environment" }, {},
  ];
}

/** Cạnh dài ảnh gốc sau khi giữ: không phóng to, chỉ thu khi vượt CAPTURE_MAX. */
export function keptLong(w: number, h: number, max = CAPTURE_MAX) { return Math.min(Math.max(w, h), max); }

/** Mật độ điểm ảnh tương đương nếu ảnh phủ trọn trang A4 theo cạnh dài. */
export function a4Dpi(w: number, h: number) { return Math.round((Math.max(w, h) / A4_LONG_MM) * 25.4); }

/** B12 dùng: cảnh báo khi ảnh gốc dưới 200 dpi. */
export function lowRes(w?: number, h?: number, min = 200) { return !!w && !!h && a4Dpi(w, h) < min; }
