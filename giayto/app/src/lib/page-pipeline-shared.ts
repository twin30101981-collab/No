/** B07: phần tính toán thuần của page-pipeline (tách riêng để kiểm thử không cần Worker). */
export type QuadPts = [number, number][];

/** Hộp vừa khổ: thu nhỏ đều sao cho cạnh dài ≤ max, không phóng to. */
export function fitBox(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

/** Hộp ảnh thu nhỏ: luôn thu về thumbMax kể cả khi ảnh nhỏ hơn? Không — không phóng to. */
export function thumbBox(w: number, h: number, thumbMax: number) {
  return fitBox(w, h, thumbMax);
}
