/** P3.1 – Kính lúp khi kéo góc cắt: đặt kính tránh ngón tay và luôn nằm trong khung ảnh. */
export const LOUPE_SIZE = 112; // px
export const LOUPE_ZOOM = 3;

/** Vị trí góc trên-trái của kính (px trong hộp ảnh). Mặc định đặt phía trên, lệch về phía tâm ảnh. */
export function loupePlacement(fx: number, fy: number, bw: number, bh: number, size = LOUPE_SIZE, gap = 24): { left: number; top: number } {
  const px = fx * bw, py = fy * bh;
  let left = fx > 0.5 ? px - size - gap : px + gap;
  let top = py - size - gap;
  if (top < 0) top = py + gap; // sát mép trên → đặt bên dưới
  left = Math.max(0, Math.min(Math.max(0, bw - size), left));
  top = Math.max(0, Math.min(Math.max(0, bh - size), top));
  return { left, top };
}
