/**
 * G2-01 — Tách lớp chiếu sáng (khử bóng). Thuần điểm ảnh, chạy được trong Worker.
 *
 * Mô hình: ảnh = phản xạ (giấy + mực) × chiếu sáng. Lớp chiếu sáng được ước lượng trên
 * kênh độ sáng: thu nhỏ theo khối (lấy phân vị cao — giấy sáng hơn mực), đóng hình thái
 * (max rồi min) để xoá nét chữ, làm mờ cho mượt, rồi phóng lại song tuyến.
 * Chia độ sáng cho lớp chiếu sáng, giữ tỉ lệ màu nên mực màu/con dấu không bị bạc.
 */
type Px = Uint8ClampedArray;

export interface IllumMap {
  /** Lưới chiếu sáng thu nhỏ, giá trị 0..255. */
  grid: Float32Array;
  gw: number;
  gh: number;
  W: number;
  H: number;
}

const luma = (d: Px, i: number) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

function morph(g: Float32Array, w: number, h: number, r: number, isMax: boolean) {
  // tách được: ngang rồi dọc
  const tmp = new Float32Array(g.length), out = new Float32Array(g.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = isMax ? -1 : 1e9;
    for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { const v = g[y * w + k]; m = isMax ? Math.max(m, v) : Math.min(m, v); }
    tmp[y * w + x] = m;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = isMax ? -1 : 1e9;
    for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { const v = tmp[k * w + x]; m = isMax ? Math.max(m, v) : Math.min(m, v); }
    out[y * w + x] = m;
  }
  return out;
}

function boxBlur(g: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(g.length), out = new Float32Array(g.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) { s += g[y * w + k]; n++; }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) { s += tmp[k * w + x]; n++; }
    out[y * w + x] = s / n;
  }
  return out;
}

/** Ước lượng lớp chiếu sáng. `cell` = cỡ khối (px ảnh gốc) — đủ lớn để chứa vài nét chữ. */
export function estimateIllumination(d: Px, W: number, H: number, cell = Math.max(8, Math.round(Math.max(W, H) / 48))): IllumMap {
  const gw = Math.max(2, Math.ceil(W / cell)), gh = Math.max(2, Math.ceil(H / cell));
  const grid = new Float32Array(gw * gh);
  const hist = new Uint32Array(256);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    hist.fill(0);
    const x0 = Math.floor((gx * W) / gw), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * W) / gw));
    const y0 = Math.floor((gy * H) / gh), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * H) / gh));
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { hist[luma(d, (y * W + x) * 4) | 0]++; n++; }
    // phân vị 90%: giấy chiếm đa số, bỏ qua điểm chói lẻ
    let acc = 0, v = 255; const target = n * 0.9;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= target) { v = i; break; } }
    grid[gy * gw + gx] = v;
  }
  let g = morph(grid, gw, gh, 1, true); // xoá mực còn sót
  g = morph(g, gw, gh, 1, false);        // trả lại biên bóng
  g = boxBlur(g, gw, gh, 1);
  return { grid: g, gw, gh, W, H };
}

/** Giá trị chiếu sáng tại điểm (x, y), nội suy song tuyến. */
export function illumAt(m: IllumMap, x: number, y: number) {
  const u = Math.min(m.gw - 1.001, Math.max(0, ((x + 0.5) * m.gw) / m.W - 0.5));
  const v = Math.min(m.gh - 1.001, Math.max(0, ((y + 0.5) * m.gh) / m.H - 0.5));
  const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0, g = m.grid, w = m.gw;
  const a = g[v0 * w + u0], b = g[v0 * w + u0 + 1], c = g[(v0 + 1) * w + u0], e = g[(v0 + 1) * w + u0 + 1];
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + e * fu) * fv;
}

/**
 * Khử bóng: chia độ sáng cho lớp chiếu sáng, đưa giấy về `paper` (mặc định 245).
 * `strength` 0..1 trộn giữa ảnh gốc và ảnh đã khử. Giữ tỉ lệ màu RGB.
 */
export function removeShadow(d: Px, W: number, H: number, strength = 1, paper = 245, map = estimateIllumination(d, W, H)) {
  const s = Math.min(1, Math.max(0, strength));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const L = illumAt(map, x, y);
    const gain = 1 + (paper / Math.max(30, L) - 1) * s;
    for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * gain);
  }
  return d;
}

/** Tỉ lệ diện tích có bóng (chiếu sáng < `ratio` × mức sáng nhất). Dùng để gợi ý bật khử bóng. */
export function shadowCoverage(m: IllumMap, ratio = 0.8) {
  let max = 0; for (const v of m.grid) max = Math.max(max, v);
  if (!max) return 0;
  let n = 0; for (const v of m.grid) if (v < max * ratio) n++;
  return n / m.grid.length;
}

/**
 * G2-02 — Khử bóng đậm/bóng tay: hai lượt (khối thô rồi khối mịn để bám mép bóng tay),
 * sau đó kéo giãn để mực trong vùng bóng đậm không bị xám.
 */
export function deshadowPixels(d: Px, W: number, H: number) {
  const L = Math.max(W, H);
  removeShadow(d, W, H, 1, 245, estimateIllumination(d, W, H, Math.max(8, Math.round(L / 40))));
  removeShadow(d, W, H, 0.8, 245, estimateIllumination(d, W, H, Math.max(6, Math.round(L / 90))));
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) {
    const v = d[i + k]; d[i + k] = v >= 235 ? 255 : Math.max(0, (v - 10) * (255 / 225));
  }
  return d;
}
