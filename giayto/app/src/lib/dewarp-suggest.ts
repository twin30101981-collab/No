// P4/TD-09: gợi ý nắn phẳng trang cong kèm độ tin cậy. Thuần điểm ảnh (chạy được trong test).
// Kết hợp hai tín hiệu độc lập:
//  - edgeCurves (dewarp.ts): độ cong võng của 4 mép giấy trên ảnh gốc.
//  - buildPageCurve (page-curve.ts): độ cong của các dòng chữ bên trong trang.
// Cả hai cùng yếu → confidence thấp → không làm phiền người dùng.
import { curveAt, edgeCurves } from "./dewarp";
import type { Px } from "./pixels";
import { detectTextLines } from "./textlines";
import { buildPageCurve, smallGray } from "./page-curve";

export type DewarpSuggestion = {
  /** true = nên đề xuất nắn phẳng. */
  curved: boolean;
  /** 0..1 — gộp hai tín hiệu (nới xác suất kết hợp). */
  confidence: number;
  /** Võng mép giấy lớn nhất, tương đối theo chiều dài cạnh (0 = thẳng). */
  edgeBend: number;
  /** Võng dòng chữ (chuẩn hoá theo chiều cao trang). */
  lineBend: number;
  /** Số cạnh đo được độ cong (0..4). */
  edges: number;
};

/** Ngưỡng võng tương đối coi là "cong rõ" (2 % chiều dài cạnh / chiều cao trang). */
const FULL_BEND = 0.02;
/** Dưới độ tin cậy này không đề xuất (trang gần phẳng hoặc tín hiệu mâu thuẫn). */
export const SUGGEST_MIN_CONFIDENCE = 0.35;

/**
 * Đo độ cong của trang trong ảnh RGBA (nên dùng bản thu nhỏ ≤ 800 px cho nhanh —
 * toạ độ chuẩn hoá nên kết quả tương đương ảnh gốc). quad: 4 góc chuẩn hoá 0..1.
 */
export function suggestDewarp(d: Px, W: number, H: number, quad: number[][]): DewarpSuggestion {
  const q = quad.map(([x, y]) => [x * W, y * H] as [number, number]);
  const curves = edgeCurves(d, W, H, q);
  let edgeBend = 0, edges = 0;
  curves.forEach((c, s) => {
    if (!c) return;
    const a = q[s], b = q[(s + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const peak = Math.max(...[0.25, 0.5, 0.75].map((t) => Math.abs(curveAt(c, t))));
    edgeBend = Math.max(edgeBend, peak / len);
    edges++;
  });
  const { g, w, h } = smallGray(d, W, H);
  const pc = buildPageCurve(detectTextLines(g, w, h));
  const lineBend = pc?.bend ?? 0;
  // Mép giấy: tin cậy tăng theo độ võng và số cạnh đo được (1 cạnh = 60 %, 4 cạnh = 100 %).
  const eConf = Math.min(1, edgeBend / FULL_BEND) * (edges ? 0.6 + 0.1 * edges : 0);
  const lConf = Math.min(1, lineBend / FULL_BEND);
  const confidence = Math.round((1 - (1 - eConf) * (1 - lConf)) * 100) / 100;
  return { curved: confidence >= SUGGEST_MIN_CONFIDENCE, confidence, edgeBend, lineBend, edges };
}
