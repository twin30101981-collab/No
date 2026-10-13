// G3-16: ảnh thẻ — tách nền người.
// Đường chính: AI thay nền bằng xanh lục thuần → khoá màu ra mặt nạ alpha (mép mềm, khử ánh xanh).
// Dự phòng (mất mạng/AI lỗi): nền lấy từ viền ảnh, loang từ mép theo độ giống màu.

export type Mask = { w: number; h: number; a: Uint8ClampedArray };

/** Độ "xanh lục nền" của một điểm: 0 = không phải nền, 1 = chắc chắn nền. */
export function greenness(r: number, g: number, b: number): number {
  const d = g - Math.max(r, b);
  if (d <= 30) return 0;
  if (d >= 90) return 1;
  return (d - 30) / 60;
}

/** Khoá màu xanh: trả mặt nạ alpha (255 = người) và khử ánh xanh ở mép ngay trên rgba. */
export function greenKeyMask(rgba: Uint8ClampedArray, w: number, h: number): Mask {
  const a = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < a.length; i++, p += 4) {
    const r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
    const k = greenness(r, g, b);
    a[i] = Math.round((1 - k) * 255);
    const cap = Math.max(r, b);
    if (g > cap) rgba[p + 1] = cap; // khử ánh xanh hắt lên tóc/vai
  }
  return keepLargest({ w, h, a });
}

/** Chỉ giữ vùng người lớn nhất (bỏ đốm nhiễu rời rạc). */
export function keepLargest(m: Mask, thr = 128): Mask {
  const { w, h, a } = m;
  const lab = new Int32Array(w * h);
  let best = 0, bestSize = 0, cur = 0;
  const stack: number[] = [];
  for (let s = 0; s < a.length; s++) {
    if (a[s] < thr || lab[s]) continue;
    cur++; let size = 0; stack.push(s); lab[s] = cur;
    while (stack.length) {
      const i = stack.pop()!; size++;
      const x = i % w, y = (i / w) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const n of nb) if (n >= 0 && !lab[n] && a[n] >= thr) { lab[n] = cur; stack.push(n); }
    }
    if (size > bestSize) { bestSize = size; best = cur; }
  }
  if (!best) return m;
  // điểm mờ (mép tóc) giữ lại nếu kề vùng chính; vùng đặc khác bị xoá
  for (let i = 0; i < a.length; i++) if (a[i] >= thr && lab[i] !== best) a[i] = 0;
  return m;
}

/** Màu nền ước lượng từ viền ảnh (trung vị từng kênh). */
export function borderColor(rgba: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const ch: number[][] = [[], [], []];
  const push = (x: number, y: number) => { const p = (y * w + x) * 4; for (let c = 0; c < 3; c++) ch[c].push(rgba[p + c]); };
  for (let x = 0; x < w; x++) { push(x, 0); }
  for (let y = 1; y < h; y++) { push(0, y); push(w - 1, y); }
  const med = (v: number[]) => { v.sort((a, b) => a - b); return v[v.length >> 1] ?? 0; };
  return [med(ch[0]), med(ch[1]), med(ch[2])];
}

/** Dự phòng không cần AI: loang từ viền trên/trái/phải qua các điểm giống màu nền. Hợp với nền tường phẳng. */
export function floodMask(rgba: Uint8ClampedArray, w: number, h: number, tol = 38): Mask {
  const [br, bg, bb] = borderColor(rgba, w, h);
  const bgSet = new Uint8Array(w * h);
  const near = (i: number) => {
    const p = i * 4, dr = rgba[p] - br, dg = rgba[p + 1] - bg, db = rgba[p + 2] - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tol;
  };
  const stack: number[] = [];
  const seed = (i: number) => { if (!bgSet[i] && near(i)) { bgSet[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) seed(x);
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!; const x = i % w, y = (i / w) | 0;
    if (x > 0) seed(i - 1); if (x < w - 1) seed(i + 1); if (y > 0) seed(i - w); if (y < h - 1) seed(i + w);
  }
  const a = new Uint8ClampedArray(w * h);
  for (let i = 0; i < a.length; i++) a[i] = bgSet[i] ? 0 : 255;
  return keepLargest(featherMask({ w, h, a }));
}

/** Làm mềm mép 1 px (trung bình 3x3) để viền không răng cưa. */
export function featherMask(m: Mask): Mask {
  const { w, h, a } = m; const out = new Uint8ClampedArray(a.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      s += a[yy * w + xx]; n++;
    }
    out[y * w + x] = Math.round(s / n);
  }
  return { w, h, a: out };
}

/** Tỉ lệ diện tích người; dùng để loại kết quả AI hỏng (gần như toàn nền hoặc toàn người). */
export function coverage(m: Mask): number { let s = 0; for (let i = 0; i < m.a.length; i++) s += m.a[i]; return s / (255 * m.a.length); }

export type Cutout = { png: string; w: number; h: number; via: "ai" | "local" };

async function pixels(src: string, max: number) {
  const { loadImg } = await import("./image");
  const img = await loadImg(src);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0, w, h);
  return { c, ctx, data: ctx.getImageData(0, 0, w, h), w, h };
}

/** Ảnh gốc + mặt nạ → PNG nền trong suốt (màu lấy từ ảnh gốc, chỉ alpha từ mặt nạ). */
function compose(base: ImageData, m: Mask, ctx: CanvasRenderingContext2D, despill?: Uint8ClampedArray) {
  const d = base.data;
  for (let i = 0, p = 0; i < m.a.length; i++, p += 4) {
    if (despill && m.a[i] < 250) { d[p] = despill[p]; d[p + 1] = despill[p + 1]; d[p + 2] = despill[p + 2]; }
    d[p + 3] = m.a[i];
  }
  ctx.putImageData(base, 0, 0);
}

/**
 * Tách nền người. `ai` nhận ảnh JPEG, trả ảnh nền xanh lục (hoặc ném lỗi) — tiêm vào để test/hàng đợi.
 * AI lỗi hoặc kết quả bất thường → dùng loang màu viền.
 */
export async function cutoutPerson(src: string, ai?: (jpeg: string) => Promise<string>, max = 1200): Promise<Cutout> {
  const base = await pixels(src, max);
  if (ai) {
    try {
      const green = await ai(base.c.toDataURL("image/jpeg", 0.9));
      const g = await pixels(green, max);
      // ảnh AI có thể khác cỡ: vẽ lại đúng cỡ gốc
      let gd = g.data;
      if (g.w !== base.w || g.h !== base.h) {
        const c = document.createElement("canvas"); c.width = base.w; c.height = base.h;
        const x = c.getContext("2d")!; x.drawImage(g.c, 0, 0, base.w, base.h); gd = x.getImageData(0, 0, base.w, base.h);
      }
      const m = greenKeyMask(gd.data, base.w, base.h);
      const cov = coverage(m);
      if (cov > 0.05 && cov < 0.95) {
        compose(base.data, m, base.ctx, gd.data);
        return { png: base.c.toDataURL("image/png"), w: base.w, h: base.h, via: "ai" };
      }
    } catch (e) { console.warn("cutoutPerson: AI lỗi, dùng dự phòng", e); }
  }
  const m = floodMask(base.data.data, base.w, base.h);
  compose(base.data, m, base.ctx);
  return { png: base.c.toDataURL("image/png"), w: base.w, h: base.h, via: "local" };
}
