/** S13 – Phần thuần của màn chỉnh tay: phóng 100% (1 điểm ảnh = 1 điểm màn hình), kéo/giữ ảnh trong khung, và đổi hộp OCR/dòng chữ thành hộp nội dung cho cropSafety. */
import type { ContentBox, ContentKind } from "./edit-session";

export type Size = { w: number; h: number };
export type Pan = { x: number; y: number };

/** Tỉ lệ vừa khung (CSS px trên 1 điểm ảnh). */
export function fitScale(view: Size, img: Size): number {
  if (!(view.w > 0 && view.h > 0 && img.w > 0 && img.h > 0)) return 1;
  return Math.min(view.w / img.w, view.h / img.h);
}

/** Tỉ lệ 100%: 1 điểm ảnh = 1 điểm vật lý của màn hình (dpr = devicePixelRatio). */
export function actualScale(dpr: number): number {
  return dpr > 0 ? 1 / dpr : 1;
}

/** Giữ ảnh trong khung: nhỏ hơn khung thì căn giữa, lớn hơn thì không hở mép. `pan` = vị trí góc trên trái của ảnh trong khung. */
export function clampPan(pan: Pan, view: Size, img: Size, scale: number): Pan {
  const cw = img.w * scale, ch = img.h * scale;
  const ax = (p: number, v: number, c: number) => (c <= v ? (v - c) / 2 : Math.min(0, Math.max(v - c, p)));
  return { x: ax(pan.x, view.w, cw), y: ax(pan.y, view.h, ch) };
}

/** Đổi tỉ lệ mà điểm `anchor` (toạ độ trong khung) đứng yên; kết quả đã kẹp trong khung. */
export function zoomAt(pan: Pan, scale: number, next: number, anchor: Pan, view: Size, img: Size): { pan: Pan; scale: number } {
  if (!(scale > 0 && next > 0)) return { pan: clampPan(pan, view, img, scale > 0 ? scale : 1), scale: scale > 0 ? scale : 1 };
  const px = (anchor.x - pan.x) / scale, py = (anchor.y - pan.y) / scale;
  return { scale: next, pan: clampPan({ x: anchor.x - px * next, y: anchor.y - py * next }, view, img, next) };
}

/** Đưa điểm ảnh chuẩn hoá (0..1) về giữa khung ở tỉ lệ `scale` (để nhảy tới vùng bị báo cắt). */
export function centerOn(point: Pan, view: Size, img: Size, scale: number): Pan {
  return clampPan({ x: view.w / 2 - point.x * img.w * scale, y: view.h / 2 - point.y * img.h * scale }, view, img, scale);
}

/** Hộp điểm ảnh (x0,y0,x1,y1; y hướng xuống) → hộp chuẩn hoá, kẹp 0..1, bỏ hộp rỗng/hỏng. */
export function boxFromPixels(b: { x0: number; y0: number; x1: number; y1: number }, img: Size, kind?: ContentKind): ContentBox | null {
  if (!(img.w > 0 && img.h > 0)) return null;
  const x0 = Math.max(0, Math.min(1, b.x0 / img.w)), x1 = Math.max(0, Math.min(1, b.x1 / img.w));
  const y0 = Math.max(0, Math.min(1, b.y0 / img.h)), y1 = Math.max(0, Math.min(1, b.y1 / img.h));
  if (![x0, x1, y0, y1].every(Number.isFinite) || x1 - x0 <= 0 || y1 - y0 <= 0) return null;
  return kind ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, kind } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Dòng chữ (chuỗi điểm chuẩn hoá của textlines) → hộp bao, nới `padY` theo chiều dọc để phủ thân chữ. */
export function boxFromLine(pts: [number, number][], padY = 0.006): ContentBox | null {
  if (!pts.length) return null;
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const [x, y] of pts) { if (!Number.isFinite(x) || !Number.isFinite(y)) return null; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  y0 = Math.max(0, y0 - padY); y1 = Math.min(1, y1 + padY);
  return x1 - x0 > 0 && y1 - y0 > 0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, kind: "text" } : null;
}

/** Từ OCR (điểm ảnh, y hướng xuống, có độ tin cậy 0..100) → hộp nội dung; bỏ từ tin cậy thấp và ký hiệu thuần (gạch bảng, vệt) vì không phải chữ cần giữ. */
export function boxFromOcrWord(w: { text: string; conf: number; x0: number; y0: number; x1: number; y1: number }, img: Size, minConf = 30): ContentBox | null {
  if (!(w.conf >= minConf) || !/[\p{L}\p{N}]/u.test(w.text)) return null;
  return boxFromPixels(w, img, "text");
}
