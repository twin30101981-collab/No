/**
 * B5: xoay thẳng tích hợp vào khung. Thay vì nắn rồi xoay ảnh (sinh góc nền mới), xoay khung nguồn
 * quanh tâm trang — tương đương đúng phép xoay + thu nhỏ của deskewPixels — rồi nắn một lần.
 * Khung mới nằm gọn trong khung cũ nên không kéo nền ngoài tờ giấy vào ảnh.
 */
export type Pt = [number, number];

/** Ma trận chiếu biến hình vuông đơn vị (0,0)(1,0)(1,1)(0,1) → tứ giác q (thứ tự TL, TR, BR, BL). */
export function squareToQuad(q: Pt[]) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(sx) > 1e-12 || Math.abs(sy) > 1e-12) {
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den; h = (dx1 * sy - sx * dy1) / den;
  }
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u: number, v: number): Pt => { const w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
}

/**
 * Xoay khung nguồn q (toạ độ điểm ảnh) theo góc deg đo trên ảnh đã nắn kích thước ow×oh.
 * Kết quả nắn theo khung mới = deskewPixels(nắn theo q), nhưng không có góc trống.
 */
export function deskewQuad(q: Pt[], ow: number, oh: number, deg: number): Pt[] {
  if (!deg) return q.map((p) => [p[0], p[1]] as Pt);
  const H = squareToQuad(q);
  const a = (deg * Math.PI) / 180; const zoom = 1 + Math.abs(Math.sin(a)) * Math.max(ow / oh, oh / ow);
  const cos = Math.cos(a) / zoom, sin = Math.sin(a) / zoom, cx = ow / 2, cy = oh / 2;
  const corners: Pt[] = [[0, 0], [ow, 0], [ow, oh], [0, oh]];
  return corners.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    return H((dx * cos - dy * sin + cx) / ow, (dx * sin + dy * cos + cy) / oh);
  });
}
