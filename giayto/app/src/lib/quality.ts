import { detectPaper } from "./detect";
import { estimateSkew, glare, loadImg, sharpness } from "./image";
import type { ScanErrorCode } from "./scan-errors";
import { SCAN_ERRORS } from "./scan-errors";

/** Ngưỡng có thể hiệu chỉnh sau khi đo trên nhiều điện thoại thật. */
export const QUALITY_THRESHOLDS = {
  BLUR_REJECT: 12, BLUR_WARNING: 35,
  DARK_REJECT: 55, DARK_WARNING: 90,
  CONTRAST_WARNING: 28,
  GLARE_LIGHT: 0.005, GLARE_WARNING: 0.02, GLARE_REJECT: 0.08,
  SKEW_AUTO_FIX: 5, // độ: nhỏ hơn thì app tự thẳng hoá
  MIN_SIDE_REJECT: 600, MIN_SIDE_WARNING: 1000,
};

/** P1.2: độ sáng trung bình (0–255) của dữ liệu RGBA, lấy mẫu cách bước để chạy nhanh trên khung xem trước. */
export function meanLumaRGBA(d: ArrayLike<number>, step = 4): number {
  let sum = 0, n = 0;
  for (let i = 0; i + 2 < d.length; i += 4 * step) { sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; }
  return n ? sum / n : 0;
}
/** P1.2: thiếu sáng khi chụp — dùng chung ngưỡng DARK_* với cổng chất lượng. */
export function lightLevel(mean: number): "ok" | "dim" | "dark" {
  return mean < QUALITY_THRESHOLDS.DARK_REJECT ? "dark" : mean < QUALITY_THRESHOLDS.DARK_WARNING ? "dim" : "ok";
}

export type GlareLevel = "none" | "light" | "text" | "severe";
export type QualityIssue = { code: ScanErrorCode; level: "warn" | "reject"; message: string };
export type QualityReport = { level: "ok" | "warn" | "reject"; score: number; glareLevel: GlareLevel; issues: QualityIssue[]; metrics: { blur: number; brightness: number; contrast: number; glare: number; glareCenter: number; skew: number; width: number; height: number; score: number } };

function lumaStats(img: HTMLImageElement) {
  const s = 200 / Math.max(img.naturalWidth, img.naturalHeight);
  const w = Math.max(8, Math.round(img.naturalWidth * s)), h = Math.max(8, Math.round(img.naturalHeight * s));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data; let sum = 0, sq = 0; const n = w * h;
  for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += l; sq += l * l; }
  c.width = 0; const mean = sum / n; return { mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
}

/** Phân loại chói: chói vùng giữa (nơi có chữ) nặng hơn chói ở mép. */
export function glareLevel(total: number, center: number): GlareLevel {
  const T = QUALITY_THRESHOLDS;
  if (total > T.GLARE_REJECT) return "severe";
  if (center > T.GLARE_WARNING) return "text";
  if (total > T.GLARE_LIGHT) return "light";
  return "none";
}

/** Điểm chất lượng 0–100 từ các chỉ số (để ghi nhật ký & so sánh). */
export function qualityScore(m: { blur: number; brightness: number; contrast: number; glare: number; side: number }) {
  const T = QUALITY_THRESHOLDS; const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const s = 0.35 * clamp((m.blur - T.BLUR_REJECT) / (T.BLUR_WARNING * 2 - T.BLUR_REJECT))
    + 0.2 * clamp((m.brightness - T.DARK_REJECT) / (150 - T.DARK_REJECT))
    + 0.15 * clamp(m.contrast / 60)
    + 0.15 * clamp(1 - m.glare / T.GLARE_REJECT)
    + 0.15 * clamp((m.side - T.MIN_SIDE_REJECT) / (1600 - T.MIN_SIDE_REJECT));
  return Math.round(s * 100);
}

const issue = (code: ScanErrorCode, level: "warn" | "reject", extra?: string): QualityIssue =>
  ({ code, level, message: `${SCAN_ERRORS[code].message}${extra ? " " + extra : ""} ${level === "reject" ? SCAN_ERRORS[code].hint : ""}`.trim() });

/** Image Quality Gate: kiểm tra mờ, tối, tương phản, chói, nghiêng, mép giấy và độ phân giải trước khi gửi AI. */
export async function checkQuality(src: string, opts: { cropped?: boolean } = {}): Promise<QualityReport> {
  const T = QUALITY_THRESHOLDS;
  const img = await loadImg(src);
  const W = img.naturalWidth, H = img.naturalHeight;
  const blur = sharpness(img, W, H), gl = glare(img, W, H);
  const glCenter = glare(img, W, H, [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]);
  const { mean, std } = lumaStats(img), side = Math.min(W, H);
  let skew = 0;
  try {
    const c = document.createElement("canvas"); const s = Math.min(1, 900 / Math.max(W, H));
    c.width = Math.round(W * s); c.height = Math.round(H * s); c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    skew = estimateSkew(c); c.width = 0;
  } catch { /* bỏ qua */ }
  // Ảnh trong tài liệu thường đã được cắt sát mép; chỉ dò mép giấy khi ảnh là ảnh gốc chưa cắt.
  const paper = opts.cropped === false ? detectPaper(img, W, H) : null;
  const issues: QualityIssue[] = [];
  if (blur < T.BLUR_REJECT) issues.push(issue("SCAN_IMAGE_TOO_BLURRY", "reject"));
  else if (blur < T.BLUR_WARNING) issues.push(issue("SCAN_IMAGE_TOO_BLURRY", "warn", "(nhẹ)"));
  if (mean < T.DARK_REJECT) issues.push(issue("SCAN_LOW_CONTRAST", "reject"));
  else if (mean < T.DARK_WARNING || std < T.CONTRAST_WARNING) issues.push(issue("SCAN_LOW_CONTRAST", "warn"));
  const gLevel = glareLevel(gl, glCenter);
  if (gLevel === "severe" || gLevel === "text") issues.push(issue("SCAN_EXCESSIVE_GLARE", "reject"));
  else if (gLevel === "light") issues.push({ code: "SCAN_EXCESSIVE_GLARE", level: "warn", message: "Có vùng chói nhẹ ngoài vùng chữ — vẫn xử lý được." });
  if (Math.abs(skew) >= T.SKEW_AUTO_FIX - 0.5) issues.push(issue("SCAN_EXCESSIVE_SKEW", "warn"));
  if (opts.cropped === false && !paper) issues.push(issue("SCAN_DOCUMENT_NOT_FOUND", "warn"));
  if (side < T.MIN_SIDE_REJECT) issues.push(issue("SCAN_LOW_RESOLUTION", "reject"));
  else if (side < T.MIN_SIDE_WARNING) issues.push(issue("SCAN_LOW_RESOLUTION", "warn"));
  const level = issues.some((i) => i.level === "reject") ? "reject" : issues.length ? "warn" : "ok";
  const score = qualityScore({ blur, brightness: mean, contrast: std, glare: gl, side });
  return { level, score, glareLevel: gLevel, issues, metrics: { blur: Math.round(blur), brightness: Math.round(mean), contrast: Math.round(std), glare: +gl.toFixed(3), glareCenter: +glCenter.toFixed(3), skew: +skew.toFixed(1), width: W, height: H, score } };
}
