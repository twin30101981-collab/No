/** B12: chấm điểm từng trang theo 4 tiêu chí (nét, lóa, nghiêng, nền) để hiện trên hàng ảnh nhỏ. Thuần, kiểm thử được. */
export type PageMetrics = { blur: number; glare: number; skew: number; brightness: number; contrast: number };
export type PageGrade = { score: number; level: "tot" | "kha" | "kem"; parts: { net: number; loa: number; nghieng: number; nen: number }; tip: string };

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function gradePage(m: PageMetrics): PageGrade {
  const net = clamp((m.blur - 12) / (70 - 12));
  const loa = clamp(1 - m.glare / 0.06);
  const nghieng = clamp(1 - (Math.abs(m.skew) - 1) / 7);
  const nen = clamp((m.brightness - 70) / (170 - 70)) * 0.7 + clamp(m.contrast / 50) * 0.3;
  const parts = { net, loa, nghieng, nen };
  const worst = Math.min(net, loa, nghieng, nen);
  // điểm trung bình có trọng số, nhưng tiêu chí tệ nhất kéo điểm xuống (một trang mờ thì không thể "tốt")
  const avg = 0.4 * net + 0.25 * loa + 0.15 * nghieng + 0.2 * nen;
  const score = Math.round(100 * Math.min(avg, worst + 0.35));
  const level = score >= 75 ? "tot" : score >= 50 ? "kha" : "kem";
  const names: Record<keyof typeof parts, string> = { net: "Ảnh hơi mờ", loa: "Bị lóa sáng", nghieng: "Trang bị nghiêng", nen: "Nền tối / thiếu sáng" };
  const k = (Object.keys(parts) as (keyof typeof parts)[]).reduce((a, b) => (parts[b] < parts[a] ? b : a));
  return { score, level, parts, tip: level === "tot" ? "Trang đạt chất lượng" : names[k] };
}
