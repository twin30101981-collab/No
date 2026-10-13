/** P3.4 – Trang báo/sách chụp ngang (2 trang trên 1 ảnh): nhận ảnh ngang và tách khung giữ đúng 1 trang. */
import type { Quad } from "./db";

/** Ảnh được coi là chụp ngang 2 trang khi rộng ≥ 1,15 lần cao. */
export const SPREAD_RATIO = 1.15;
export function isLandscapeSpread(W: number, H: number): boolean {
  return W > 0 && H > 0 && W / H >= SPREAD_RATIO;
}

const mid = (a: number[], b: number[]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Lấy nửa trái/phải của khung 4 góc (↖↗↘↙), cắt theo trung điểm cạnh trên và cạnh dưới. */
export function halfQuad(q: Quad, side: "left" | "right"): Quad {
  const top = mid(q[0], q[1]), bot = mid(q[3], q[2]);
  return side === "left"
    ? [[q[0][0], q[0][1]], top, bot, [q[3][0], q[3][1]]]
    : [top, [q[1][0], q[1][1]], [q[2][0], q[2][1]], bot];
}
