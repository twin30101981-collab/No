// R3.4: nhận loại tài liệu theo ảnh — tín hiệu màu (dấu đỏ, mực xanh), độ bão hoà,
// tỉ lệ khung (thẻ vs A4). Bổ sung cho doc-type theo chữ (doc-type.ts), không thay thế.
// Thuần, kiểm thử được; phần đọc ảnh (canvas) tách riêng ở cuối file.

import type { DocTypeGuess } from "./doc-type";

/** Tín hiệu ảnh tổng hợp từ điểm ảnh (đã giảm mẫu). */
export type DocImageSignals = {
  /** Tỉ lệ điểm đỏ đậm (dấu / bìa sổ đỏ). 0–1. */
  redRatio: number;
  /** Tỉ lệ điểm xanh dương (mực ký, khung cà vẹt). 0–1. */
  blueRatio: number;
  /** Độ bão hoà trung bình 0–1 (ảnh màu nhiều vs in đen trắng). */
  colorRatio: number;
  /** Tỉ lệ khung rộng/cao (>1 là ngang). */
  aspect: number;
  /** Tỉ lệ điểm tối (chữ/nền tối). 0–1. */
  darkRatio: number;
};

/** Ngưỡng tối thiểu để ảnh được phép quyết loại khi chữ không nhận ra. */
export const IMAGE_MIN_SCORE = 3;
export const IMAGE_MIN_CONFIDENCE = 0.4;

/** Thẻ nhựa/ngang (GPLX, cà vẹt): rộng/cao ≈ 1.4–1.8. A4 dọc ≈ 0.68–0.78. */
const CARD_MIN = 1.35;
const CARD_MAX = 1.85;
const A4_PORTRAIT_MIN = 0.6;
const A4_PORTRAIT_MAX = 0.85;

/**
 * Phân tích điểm ảnh RGBA thành tín hiệu loại tài liệu.
 * Nhận mảng RGBA bất kỳ (đã giảm mẫu sẵn hoặc không) — hàm tự bước mẫu để giới hạn ~4k điểm.
 */
export function analyzeDocImage(data: Uint8ClampedArray, width: number, height: number): DocImageSignals {
  const totalPx = Math.max(1, width * height);
  const step = Math.max(1, Math.floor(totalPx / 4096));
  let red = 0, blue = 0, dark = 0, satSum = 0, n = 0;
  for (let i = 0; i < totalPx; i += step) {
    const o = i * 4;
    const r = data[o]!, g = data[o + 1]!, b = data[o + 2]!;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    satSum += max === 0 ? 0 : (max - min) / max;
    if (r > 120 && r > g * 1.5 && r > b * 1.5) red++;
    else if (b > 80 && b > r * 1.3 && b > g * 1.1) blue++;
    if (max < 90) dark++;
    n++;
  }
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return {
    redRatio: round(red / n),
    blueRatio: round(blue / n),
    colorRatio: round(satSum / n),
    aspect: Math.round((width / Math.max(1, height)) * 1000) / 1000,
    darkRatio: round(dark / n),
  };
}

/** Chấm điểm từng loại theo tín hiệu ảnh. Trả null khi không loại nào đủ chắc. */
export function guessDocTypeFromImage(s: DocImageSignals): { id: string; confidence: number; scores: Record<string, number> } | null {
  const scores: Record<string, number> = { vat: 0, xe: 0, sodo: 0, banglai: 0, khaisinh: 0, hopdong: 0 };
  const isCard = s.aspect >= CARD_MIN && s.aspect <= CARD_MAX;
  const isA4 = s.aspect >= A4_PORTRAIT_MIN && s.aspect <= A4_PORTRAIT_MAX;

  // Dấu đỏ (chỉ chấm trên khung giấy, thẻ nhựa không có dấu): sổ đỏ nhiều đỏ
  // (bìa + dấu), khai sinh đỏ vừa (dấu tròn), hợp đồng ít.
  if (!isCard) {
    if (s.redRatio >= 0.08) { scores["sodo"]! += 3; scores["khaisinh"]! += 1; }
    else if (s.redRatio >= 0.015) { scores["khaisinh"]! += 3; scores["sodo"]! += 1; }
  }

  // Khung thẻ ngang: GPLX (nhiều màu, nền hồng) và cà vẹt (nền xanh dương).
  if (isCard) {
    scores["banglai"]! += 2; scores["xe"]! += 2;
    if (s.colorRatio >= 0.25) scores["banglai"]! += 1;
    if (s.blueRatio >= 0.05 && s.blueRatio > s.redRatio) scores["xe"]! += 2;
    else if (s.redRatio >= 0.05) scores["banglai"]! += 1;
  }

  // A4 dọc ít màu: hoá đơn / hợp đồng in đen trắng.
  if (isA4 && s.colorRatio < 0.2) { scores["vat"]! += 2; scores["hopdong"]! += 1; }
  if (isA4 && s.redRatio < 0.015) scores["vat"]! += 1;

  let best: string | null = null;
  let total = 0;
  for (const [id, sc] of Object.entries(scores)) {
    total += sc;
    if (sc > 0 && (best === null || sc > scores[best]!)) best = id;
  }
  if (!best || scores[best]! < IMAGE_MIN_SCORE || total === 0) return null;
  const confidence = scores[best]! / total;
  if (confidence < IMAGE_MIN_CONFIDENCE) return null;
  return { id: best, confidence: Math.round(confidence * 100) / 100, scores };
}

/**
 * Gộp nhận loại theo chữ (mạnh, ưu tiên) với theo ảnh (bổ sung):
 * - Chữ đã chắc → giữ loại theo chữ; ảnh trùng loại thì tăng độ tin cậy (tối đa 0.99).
 * - Chữ không nhận ra → dùng ảnh nếu ảnh đủ chắc.
 * - Chữ yếu (< 0.6) và ảnh rất chắc (≥ 0.6) khác loại → theo ảnh.
 */
export function combineDocType(
  textGuess: DocTypeGuess | null,
  imageGuess: { id: string; confidence: number } | null,
): { id: string; confidence: number; source: "text" | "image" | "text+image" } | null {
  if (textGuess && imageGuess) {
    if (textGuess.template.id === imageGuess.id) {
      const boosted = Math.min(0.99, Math.round((textGuess.confidence + imageGuess.confidence * 0.3) * 100) / 100);
      return { id: textGuess.template.id, confidence: Math.min(0.99, Math.max(textGuess.confidence, boosted)), source: "text+image" };
    }
    if (textGuess.confidence < 0.6 && imageGuess.confidence >= 0.6) {
      return { id: imageGuess.id, confidence: imageGuess.confidence, source: "image" };
    }
    return { id: textGuess.template.id, confidence: textGuess.confidence, source: "text" };
  }
  if (textGuess) return { id: textGuess.template.id, confidence: textGuess.confidence, source: "text" };
  if (imageGuess) return { id: imageGuess.id, confidence: imageGuess.confidence, source: "image" };
  return null;
}

/**
 * Đọc ảnh trang (URL blob/object) → tín hiệu. Chỉ chạy trên trình duyệt; giảm mẫu về ≤ 96 px
 * cạnh dài để rẻ. Trả null khi không đọc được (SSR, ảnh lỗi) — luồng gọi phải chịu được null.
 */
export async function docImageSignals(src: string): Promise<DocImageSignals | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 96 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) { bmp.close(); return null; }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const img = ctx.getImageData(0, 0, w, h);
    return analyzeDocImage(img.data, w, h);
  } catch {
    return null;
  }
}
