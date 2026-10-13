/** Smart erase, step 1 (G3-23): brush strokes → pixel mask. Pure; G3-24 swaps the fill for real inpainting. */
export type Pt = { x: number; y: number }; // 0..1 of image size
export type Stroke = { pts: Pt[]; r: number; erase?: boolean }; // r = brush radius as a fraction of image width

/** Rasterise strokes into a 0/1 mask (w*h). Eraser strokes clear. Segments are filled densely so fast swipes leave no gaps. */
export function strokesToMask(strokes: Stroke[], w: number, h: number): Uint8Array {
  const m = new Uint8Array(w * h);
  for (const s of strokes) {
    const rad = Math.max(1, s.r * w), v = s.erase ? 0 : 1;
    const dot = (cx: number, cy: number) => {
      const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(w - 1, Math.ceil(cx + rad));
      const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(h - 1, Math.ceil(cy + rad));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) m[y * w + x] = v;
    };
    const p = s.pts.map((q) => ({ x: q.x * w, y: q.y * h }));
    if (p.length === 1) dot(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, rad / 2)));
      for (let k = 0; k <= n; k++) dot(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n);
    }
  }
  return m;
}

export const maskArea = (m: Uint8Array) => { let n = 0; for (let i = 0; i < m.length; i++) n += m[i]; return n; };

/** Interim fill: paint masked pixels with the median colour of the unmasked ring just outside the mask (paper colour). */
export function fillMaskFlat(d: Uint8ClampedArray, w: number, h: number, m: Uint8Array) {
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (m[i]) continue;
    if ((x > 0 && m[i - 1]) || (x < w - 1 && m[i + 1]) || (y > 0 && m[i - w]) || (y < h - 1 && m[i + w])) { rs.push(d[i * 4]); gs.push(d[i * 4 + 1]); bs.push(d[i * 4 + 2]); }
  }
  if (!rs.length) return d;
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  const r = med(rs), g = med(gs), b = med(bs);
  for (let i = 0; i < m.length; i++) if (m[i]) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
  return d;
}

/**
 * Classical inpainting (G3-24): onion-peel fill from the mask edge inward — each ring takes the
 * distance-weighted mean of already-known pixels within radius 3 — then a few smoothing passes inside
 * the mask only. Unmasked pixels are never changed. Cost scales with masked area, not image size.
 */
export function inpaint(d: Uint8ClampedArray, w: number, h: number, mask: Uint8Array, smooth = 4) {
  const m = mask.slice(); const R = 3;
  let todo: number[] = []; for (let i = 0; i < m.length; i++) if (m[i]) todo.push(i);
  const all = todo.slice();
  while (todo.length) {
    const ring: number[] = [], rest: number[] = [];
    for (const i of todo) {
      const x = i % w, y = (i / w) | 0; let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!m[ny * w + nx]) { edge = true; break; }
      }
      (edge ? ring : rest).push(i);
    }
    if (!ring.length) break; // whole image masked: nothing to sample
    const out = new Float32Array(ring.length * 3);
    ring.forEach((i, k) => {
      const x = i % w, y = (i / w) | 0; let r = 0, g = 0, b = 0, ws = 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (m[j]) continue;
        const wt = 1 / (dx * dx + dy * dy); r += d[j * 4] * wt; g += d[j * 4 + 1] * wt; b += d[j * 4 + 2] * wt; ws += wt;
      }
      out[k * 3] = r / ws; out[k * 3 + 1] = g / ws; out[k * 3 + 2] = b / ws;
    });
    ring.forEach((i, k) => { d[i * 4] = out[k * 3]; d[i * 4 + 1] = out[k * 3 + 1]; d[i * 4 + 2] = out[k * 3 + 2]; d[i * 4 + 3] = 255; m[i] = 0; });
    todo = rest;
  }
  for (let s = 0; s < smooth; s++) {
    const tmp = new Float32Array(all.length * 3);
    all.forEach((i, k) => {
      const x = i % w, y = (i / w) | 0; let n = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = (ny * w + nx) * 4; tmp[k * 3] += d[j]; tmp[k * 3 + 1] += d[j + 1]; tmp[k * 3 + 2] += d[j + 2]; n++;
      }
      tmp[k * 3] /= n; tmp[k * 3 + 1] /= n; tmp[k * 3 + 2] /= n;
    });
    all.forEach((i, k) => { d[i * 4] = tmp[k * 3]; d[i * 4 + 1] = tmp[k * 3 + 1]; d[i * 4 + 2] = tmp[k * 3 + 2]; });
  }
  return d;
}

/** YCbCr skin test (Chai & Ngan range), tolerant of warm indoor light. */
export const isSkin = (r: number, g: number, b: number) => {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cr >= 135 && cr <= 180 && cb >= 80 && cb <= 128 && r > 60 && r > b;
};

/**
 * G3-25: suggest finger areas holding a book open — skin-coloured blobs connected to the image border,
 * reaching no deeper than `depth` of the image, at least `minArea` of it. Grown by `grow` px so the fill
 * covers soft edges. Returns null when nothing found.
 */
export function suggestFingers(d: Uint8ClampedArray, w: number, h: number, { depth = 0.25, minArea = 0.002, grow = 0 } = {}): Uint8Array | null {
  const skin = new Uint8Array(w * h);
  for (let i = 0; i < skin.length; i++) skin[i] = isSkin(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) ? 1 : 0;
  const lab = new Int32Array(w * h), out = new Uint8Array(w * h); let id = 0, found = false;
  const g = grow || Math.max(2, Math.round(Math.min(w, h) * 0.008));
  for (let s = 0; s < skin.length; s++) {
    if (!skin[s] || lab[s]) continue;
    id++; const px: number[] = [s]; lab[s] = id; let border = false, x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let k = 0; k < px.length; k++) {
      const i = px[k], x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && skin[j] && !lab[j]) { lab[j] = id; px.push(j); }
    }
    if (!border || px.length < minArea * w * h) continue;
    if ((x1 - x0) / w > depth && (y1 - y0) / h > depth) continue; // spreads deep both ways: background, not a finger
    found = true;
    for (const i of px) {
      const x = i % w, y = (i / w) | 0;
      for (let dy = -g; dy <= g; dy++) for (let dx = -g; dx <= g; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1; }
    }
  }
  return found ? out : null;
}
