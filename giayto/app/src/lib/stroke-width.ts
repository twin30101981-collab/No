/**
 * G4-09 — Xóa viết tay, bước 2: lọc theo độ dày nét, tạo bản đề sạch.
 *
 * Nét mực (kể cả mực đen) được tách thành từng mảng liền. Độ dày nét mỗi mảng =
 * 2 × khoảng cách lớn nhất từ trong nét ra giấy (biến đổi khoảng cách chessboard).
 * Độ dày "chữ in" là trung vị có trọng số diện tích; mảng nào lệch quá tỉ lệ cho phép
 * (bút bi mảnh hơn, bút dạ dày hơn) được coi là viết tay. `cleanSheet` gộp cả lọc màu
 * (G4-08) và lọc độ dày để tạo bản đề sạch.
 */
import { classifyInk, dilateHand, HAND, PRINT } from "./handwriting-ink";

type Img = { data: Uint8ClampedArray; width: number; height: number };

/** Khoảng cách từ mỗi điểm mực tới giấy gần nhất (hai lượt, 8 hướng). */
export function distanceMap(ink: Uint8Array, w: number, h: number) {
  const D = new Uint16Array(w * h), BIG = 65535;
  for (let p = 0; p < w * h; p++) D[p] = ink[p] ? BIG : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x; if (!D[p]) continue;
    let m = D[p];
    if (x > 0) m = Math.min(m, D[p - 1] + 1); else m = 1;
    if (y > 0) { m = Math.min(m, D[p - w] + 1); if (x > 0) m = Math.min(m, D[p - w - 1] + 1); if (x < w - 1) m = Math.min(m, D[p - w + 1] + 1); } else m = 1;
    D[p] = m;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const p = y * w + x; if (!D[p]) continue;
    let m = D[p];
    if (x < w - 1) m = Math.min(m, D[p + 1] + 1); else m = 1;
    if (y < h - 1) { m = Math.min(m, D[p + w] + 1); if (x < w - 1) m = Math.min(m, D[p + w + 1] + 1); if (x > 0) m = Math.min(m, D[p + w - 1] + 1); } else m = 1;
    D[p] = m;
  }
  return D;
}

export interface Stroke { id: number; area: number; width: number }

/** Gán nhãn mảng liền (8 hướng) và đo độ dày nét từng mảng. */
export function measureStrokes(ink: Uint8Array, w: number, h: number) {
  const D = distanceMap(ink, w, h), label = new Int32Array(w * h).fill(-1);
  const strokes: Stroke[] = [], stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!ink[s] || label[s] >= 0) continue;
    const id = strokes.length; let area = 0, maxD = 0;
    label[s] = id; stack.push(s);
    while (stack.length) {
      const p = stack.pop()!, x = p % w, y = (p - x) / w;
      area++; if (D[p] > maxD) maxD = D[p];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx; if (ink[q] && label[q] < 0) { label[q] = id; stack.push(q); }
      }
    }
    strokes.push({ id, area, width: 2 * maxD - 1 });
  }
  return { label, strokes };
}

/** Độ dày nét chủ đạo (trung vị theo diện tích, bỏ chấm nhỏ < minArea). */
export function dominantWidth(strokes: Stroke[], minArea = 6) {
  const s = strokes.filter((k) => k.area >= minArea).sort((a, b) => a.width - b.width);
  const total = s.reduce((t, k) => t + k.area, 0); let acc = 0;
  for (const k of s) { acc += k.area; if (acc >= total / 2) return k.width; }
  return 0;
}

export interface WidthOptions { tolerance?: number; minArea?: number; refWidth?: number }

/** Mặt nạ 1 = mảng nét có độ dày lệch khỏi chữ in (coi là viết tay). */
export function oddWidthMask(ink: Uint8Array, w: number, h: number, o: WidthOptions = {}) {
  const { tolerance = 1.6, minArea = 6 } = o;
  const { label, strokes } = measureStrokes(ink, w, h);
  const ref = o.refWidth ?? dominantWidth(strokes, minArea);
  const odd = new Uint8Array(strokes.length);
  if (ref > 0) for (const k of strokes) {
    if (k.area < minArea) continue;
    const r = k.width / ref;
    if (r > tolerance || r < 1 / tolerance) odd[k.id] = 1;
  }
  const out = new Uint8Array(w * h);
  for (let p = 0; p < out.length; p++) if (label[p] >= 0 && odd[label[p]]) out[p] = 1;
  return { mask: out, refWidth: ref, strokes: strokes.length };
}

/** Bản đề sạch: xóa nét viết tay màu + nét có độ dày khác chữ in, về màu giấy. */
export function cleanSheet(img: Img, o: WidthOptions & { byColor?: boolean; byWidth?: boolean } = {}) {
  const { byColor = true, byWidth = true } = o, { width: w, height: h } = img;
  const { mask, paper } = classifyInk(img);
  const hand = new Uint8Array(w * h);
  if (byColor) for (let p = 0; p < hand.length; p++) if (mask[p] === HAND) hand[p] = HAND;
  let refWidth = 0;
  if (byWidth) {
    const ink = new Uint8Array(w * h);
    for (let p = 0; p < ink.length; p++) ink[p] = mask[p] === PRINT ? 1 : 0;
    const r = oddWidthMask(ink, w, h, o); refWidth = r.refWidth;
    for (let p = 0; p < hand.length; p++) if (r.mask[p]) hand[p] = HAND;
  }
  const m = dilateHand(hand, w, h, 1), out = new Uint8ClampedArray(img.data);
  const { y, cb, cr } = paper, rgb = [y + 1.402 * cr, y - 0.344136 * cb - 0.714136 * cr, y + 1.772 * cb];
  let removed = 0;
  for (let p = 0; p < m.length; p++) if (m[p] === HAND) { const i = p * 4; out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2]; removed++; }
  return { data: out, width: w, height: h, removed, refWidth };
}

/** Mặt nạ 0/1 nét viết tay (màu + độ dày) — dùng làm gợi ý để người dùng chỉnh tay. */
export function handMask(img: Img, o: WidthOptions & { byColor?: boolean; byWidth?: boolean } = {}): Uint8Array | null {
  const { byColor = true, byWidth = true } = o, { width: w, height: h } = img;
  const { mask } = classifyInk(img), hand = new Uint8Array(w * h);
  if (byColor) for (let p = 0; p < hand.length; p++) if (mask[p] === HAND) hand[p] = HAND;
  if (byWidth) {
    const ink = new Uint8Array(w * h);
    for (let p = 0; p < ink.length; p++) ink[p] = mask[p] === PRINT ? 1 : 0;
    const r = oddWidthMask(ink, w, h, o);
    for (let p = 0; p < hand.length; p++) if (r.mask[p]) hand[p] = HAND;
  }
  const m = dilateHand(hand, w, h, 1); let any = false;
  for (let p = 0; p < m.length; p++) { m[p] = m[p] === HAND ? 1 : 0; if (m[p]) any = true; }
  return any ? m : null;
}
