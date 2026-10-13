/**
 * P1.4: cảnh báo chất lượng ngay lúc chụp.
 * Gộp các chỉ số khung ngắm (nét, lóa, sáng, nghiêng, kích thước khung) thành MỘT
 * cảnh báo ưu tiên cao nhất, dùng chung ngưỡng QUALITY_THRESHOLDS với cổng chất lượng.
 * Thuần, kiểm thử được; màn chụp dùng cho cả lời nhắc trực tiếp lẫn cảnh báo khi bấm chụp.
 */
import { QUALITY_THRESHOLDS, lightLevel } from "./quality";

export type LiveMetrics = {
  /** Phương sai Laplacian vùng giấy (độ nét). */
  sharp: number;
  /** Tỉ lệ điểm cháy sáng 0..1. */
  glare: number;
  /** Độ sáng trung bình 0..255. */
  luma: number;
  /** Độ nghiêng khung 0..1 (tilt của quad). */
  tilt: number;
  /** Diện tích khung giấy 0..1; null khi chưa dò được khung. */
  area: number | null;
};

export type CaptureWarningKind = "dark" | "glare" | "blur" | "tilt" | "closer";
export type CaptureWarning = { kind: CaptureWarningKind; level: "warn" | "reject"; message: string };

/** Ngưỡng nghiêng cảnh báo (khớp màn chụp: tilt > 0.28). */
export const TILT_WARNING = 0.28;
/** Khung giấy chiếm dưới 22% khung hình → nhắc lại gần. */
export const AREA_WARNING = 0.22;

/**
 * Cảnh báo quan trọng nhất cho khung hiện tại; null khi chất lượng ổn.
 * Thứ tự ưu tiên: lỗi nặng (reject) trước — tối quá, lóa mất chữ, mờ quá;
 * rồi lỗi nhẹ (warn) — nghiêng, xa, hơi tối, hơi mờ, hơi lóa.
 */
export function captureWarning(m: LiveMetrics): CaptureWarning | null {
  const T = QUALITY_THRESHOLDS;
  const light = lightLevel(m.luma);
  if (light === "dark") return { kind: "dark", level: "reject", message: "Thiếu sáng nặng — bật đèn hoặc ra chỗ sáng hơn rồi chụp lại" };
  if (m.glare > T.GLARE_REJECT) return { kind: "glare", level: "reject", message: "Lóa mạnh — chữ vùng lóa sẽ mất, nghiêng nhẹ máy hoặc đổi góc đèn" };
  if (m.sharp < T.BLUR_REJECT) return { kind: "blur", level: "reject", message: "Hình quá mờ — giữ yên máy, chờ lấy nét rồi chụp" };
  if (m.tilt > TILT_WARNING) return { kind: "tilt", level: "warn", message: "Máy đang nghiêng — đưa máy song song với tờ giấy" };
  if (m.area !== null && m.area < AREA_WARNING) return { kind: "closer", level: "warn", message: "Đưa máy lại gần hơn để chữ đủ lớn" };
  if (light === "dim") return { kind: "dark", level: "warn", message: "Hơi thiếu sáng — thêm đèn để chữ rõ hơn" };
  if (m.sharp < T.BLUR_WARNING) return { kind: "blur", level: "warn", message: "Hình hơi mờ — giữ chắc tay" };
  if (m.glare > T.GLARE_WARNING) return { kind: "glare", level: "warn", message: "Có vùng lóa nhẹ — nghiêng nhẹ máy nếu chữ mờ đi" };
  return null;
}
