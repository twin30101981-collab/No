/**
 * B4 — Mặt nạ giấy + xoá nêm góc (O6).
 *
 * Sau khi nắn, khung tinh chỉnh lệch vài px hoặc giấy cong để lại "nêm" nền tối ở góc/mép.
 * - paperColor: ước lượng màu giấy từ vành trong (4–12 % mỗi cạnh), chỉ lấy điểm sáng.
 * - paperMaskFill: dựng mặt nạ "ngoài giấy" = vùng tối hơn giấy rõ rệt, nối liền với viền ảnh,
 *   nằm trong dải mép (tối đa 6 %), nở thêm vài px để nuốt viền chuyển tiếp, rồi tô màu giấy (mép mềm).
 * - darkBorderRegions: đo các vùng tối dính viền còn sót (mm theo khổ A4) — dùng cho nghiệm thu "0 vùng tối > 3 mm".
 */
type Px = Uint8ClampedArray;

const lumOf = (d: Px, i: number) => d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;

/** Màu giấy (RGB + độ sáng) từ vành trong, bỏ điểm tối (chữ, bóng). */
export function paperColor(d: Px, W: number, H: number) {
  const hist = new Uint32Array(256); const pts: number[] = [];
  const x0 = Math.floor(W * 0.04), x1 = Math.ceil(W * 0.12), y0 = Math.floor(H * 0.04), y1 = Math.ceil(H * 0.12);
  const step = Math.max(1, Math.round(Math.min(W, H) / 400));
  const take = (x: number, y: number) => { const i = y * W + x; hist[Math.round(lumOf(d, i))]++; pts.push(i); };
  for (let y = y0; y < y1; y += step) for (let x = x0; x < W - x0; x += step) { take(x, y); take(x, H - 1 - y); }
  for (let x = x0; x < x1; x += step) for (let y = y1; y < H - y1; y += step) { take(x, y); take(W - 1 - x, y); }
  const n = pts.length; if (!n) return { r: 255, g: 255, b: 255, L: 255 };
  // phân vị 75 % = mức giấy; trung bình màu của các điểm quanh mức đó
  let acc = 0, P = 255; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.75) { P = v; break; } }
  let r = 0, g = 0, b = 0, c = 0;
  for (const i of pts) { const l = lumOf(d, i); if (l >= P - 12 && l <= P + 20) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; c++; } }
  return c ? { r: r / c, g: g / c, b: b / c, L: P } : { r: P, g: P, b: P, L: P };
}

/** Ngưỡng "tối hơn giấy rõ rệt": chịu được giấy tương phản thấp (nền 160 / giấy 215). */
export const darkThreshold = (P: number) => Math.min(P * 0.85, P - 22);

/** Mặt nạ vùng ngoài giấy (1 = nền) — chỉ trong dải mép, nối với viền ảnh. */
export function paperMask(d: Px, W: number, H: number, band = 0.06) {
  const { L: P } = paperColor(d, W, H); const mask = new Uint8Array(W * H);
  if (P < 90) return { mask, count: 0, P, bw: 0 };
  const dark = darkThreshold(P), bw = Math.max(4, Math.round(Math.min(W, H) * band));
  const inBand = (x: number, y: number) => x < bw || y < bw || x >= W - bw || y >= H - bw;
  const stack: number[] = []; let count = 0;
  const push = (x: number, y: number) => { const i = y * W + x; if (!mask[i] && lumOf(d, i) < dark) { mask[i] = 1; count++; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const i = stack.pop()!; const x = i % W, y = (i / W) | 0;
    if (x + 1 < W && inBand(x + 1, y)) push(x + 1, y);
    if (x > 0 && inBand(x - 1, y)) push(x - 1, y);
    if (y + 1 < H && inBand(x, y + 1)) push(x, y + 1);
    if (y > 0 && inBand(x, y - 1)) push(x, y - 1);
  }
  return { mask, count, P, bw };
}

/** Nở mặt nạ r px (hình vuông, tách 2 lượt). V5b: chỉ quét dải viền B px khi biết mặt nạ = 0 ngoài dải bw (B ≥ bw + r). */
function dilate(m: Uint8Array, W: number, H: number, r: number, B = Infinity) {
  const t = new Uint8Array(W * H), o = new Uint8Array(W * H);
  const row = (y: number, a: number, b: number) => { let last = -1e9; for (let x = a; x < b; x++) { if (m[y * W + x]) last = x; if (x - last <= r) t[y * W + x] = 1; } last = 1e9; for (let x = b - 1; x >= a; x--) { if (m[y * W + x]) last = x; if (last - x <= r) t[y * W + x] = 1; } };
  const col = (x: number, a: number, b: number) => { let last = -1e9; for (let y = a; y < b; y++) { if (t[y * W + x]) last = y; if (y - last <= r) o[y * W + x] = 1; } last = 1e9; for (let y = b - 1; y >= a; y--) { if (t[y * W + x]) last = y; if (last - y <= r) o[y * W + x] = 1; } };
  const full = !(B * 2 < W && B * 2 < H);
  for (let y = 0; y < H; y++) { if (full || y < B || y >= H - B) row(y, 0, W); else { row(y, 0, B); row(y, W - B, W); } }
  for (let x = 0; x < W; x++) { if (full || x < B || x >= W - B) col(x, 0, H); else { col(x, 0, B); col(x, H - B, H); } }
  return o;
}

/** Tô vùng ngoài giấy bằng màu giấy ước lượng; viền nở thêm `grow` px pha mềm để không lộ mép. */
export function paperMaskFill(d: Px, W: number, H: number, grow = 3) {
  const { mask, count, bw } = paperMask(d, W, H); if (!count) return d;
  const col = paperColor(d, W, H);
  const g1 = Math.max(1, grow - 1), B = bw + g1 + 2; // V5b: mọi điểm mặt nạ nằm trong dải bw
  const core = dilate(mask, W, H, g1, B), soft = dilate(core, W, H, 1, B);
  const px = (i: number) => {
    if (!soft[i]) return;
    const a = core[i] ? 1 : 0.5, j = i * 4;
    // chỉ làm sáng lên (không xoá chữ sáng hơn giấy — hiếm), pha theo a
    if (lumOf(d, i) >= col.L && !core[i]) return;
    d[j] = d[j] * (1 - a) + col.r * a; d[j + 1] = d[j + 1] * (1 - a) + col.g * a; d[j + 2] = d[j + 2] * (1 - a) + col.b * a;
  };
  const full = !(B * 2 < W && B * 2 < H);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    if (full || y < B || y >= H - B) { for (let x = 0; x < W; x++) px(o + x); }
    else { for (let x = 0; x < B; x++) px(o + x); for (let x = W - B; x < W; x++) px(o + x); }
  }
  return d;
}

export type DarkRegion = { px: number; mm: number; x: number; y: number };
/** Các vùng tối dính viền (trong dải 6 %); kích thước = cạnh lớn nhất của hộp bao, đổi ra mm theo cạnh ngắn = 210 mm. */
export function darkBorderRegions(d: Px, W: number, H: number, shortMm = 210): DarkRegion[] {
  const { L: P } = paperColor(d, W, H); const dark = darkThreshold(P);
  const bw = Math.max(4, Math.round(Math.min(W, H) * 0.06)); const mmPx = shortMm / Math.min(W, H);
  const seen = new Uint8Array(W * H); const out: DarkRegion[] = [];
  const inBand = (x: number, y: number) => x < bw || y < bw || x >= W - bw || y >= H - bw;
  const border: [number, number][] = [];
  for (let x = 0; x < W; x++) border.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) border.push([0, y], [W - 1, y]);
  for (const [sx, sy] of border) {
    const s = sy * W + sx; if (seen[s] || lumOf(d, s) >= dark) continue;
    let x0 = sx, x1 = sx, y0 = sy, y1 = sy; const st = [s]; seen[s] = 1;
    while (st.length) {
      const i = st.pop()!; const x = i % W, y = (i / W) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !inBand(nx, ny)) continue;
        const k = ny * W + nx; if (!seen[k] && lumOf(d, k) < dark) { seen[k] = 1; st.push(k); }
      }
    }
    const px = Math.max(x1 - x0 + 1, y1 - y0 + 1); out.push({ px, mm: px * mmPx, x: x0, y: y0 });
  }
  return out.sort((a, b) => b.px - a.px);
}

/**
 * S10 – Q1: bóng xám mềm dính mép/góc (tối hơn giấy nhẹ, không đủ "tối rõ rệt" cho paperMask).
 * Loang từ viền ảnh qua điểm "phẳng" (không có nét chữ) tối hơn giấy ≥ 8, trong dải `band` (15 %).
 * Chữ có độ tương phản cục bộ cao nên chặn loang → không xoá chữ. Tô dần về màu giấy theo độ tối.
 */
export function edgeShadowLift(d: Px, W: number, H: number, band = 0.15) {
  const col = paperColor(d, W, H); const P = col.L; if (P < 90) return d;
  const mild = P - 8, bw = Math.max(4, Math.round(Math.min(W, H) * band)), s = 2;
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lumOf(d, i);
  const inBand = (x: number, y: number) => x < bw || y < bw || x >= W - bw || y >= H - bw;
  const smooth = (x: number, y: number) => {
    const v = L[y * W + x];
    return (x < s || Math.abs(L[y * W + x - s] - v) < 14) && (x >= W - s || Math.abs(L[y * W + x + s] - v) < 14)
      && (y < s || Math.abs(L[(y - s) * W + x] - v) < 14) && (y >= H - s || Math.abs(L[(y + s) * W + x] - v) < 14);
  };
  const m = new Uint8Array(W * H); const st: number[] = [];
  const push = (x: number, y: number) => { const i = y * W + x; if (!m[i] && L[i] < mild && smooth(x, y)) { m[i] = 1; st.push(i); } };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (st.length) {
    const i = st.pop()!; const x = i % W, y = (i / W) | 0;
    if (x + 1 < W && inBand(x + 1, y)) push(x + 1, y);
    if (x > 0 && inBand(x - 1, y)) push(x - 1, y);
    if (y + 1 < H && inBand(x, y + 1)) push(x, y + 1);
    if (y > 0 && inBand(x, y - 1)) push(x, y - 1);
  }
  const g = dilate(m, W, H, 2);
  for (let i = 0; i < W * H; i++) {
    if (!g[i]) continue; const j = i * 4;
    // điểm nở thêm mà tối đậm (chữ) thì giữ nguyên
    if (!m[i] && L[i] < P * 0.6) continue;
    d[j] = col.r; d[j + 1] = col.g; d[j + 2] = col.b;
  }
  return d;
}

/**
 * S10 – Q2: rác điểm ảnh ở mép (chấm đen, vệt nhỏ) – thành phần tối nhỏ nằm trọn trong dải mép `band` (2 %).
 * Chữ thật hiếm khi nằm trọn trong 2 % sát mép; thành phần lớn hơn `maxFrac` cạnh ngắn được giữ.
 */
export function edgeSpeckClean(d: Px, W: number, H: number, band = 0.02, maxFrac = 0.03) {
  const col = paperColor(d, W, H); const dark = darkThreshold(col.L);
  const bw = Math.max(3, Math.round(Math.min(W, H) * band)), maxPx = Math.max(4, Math.round(Math.min(W, H) * maxFrac));
  const inBand = (x: number, y: number) => x < bw || y < bw || x >= W - bw || y >= H - bw;
  const seen = new Uint8Array(W * H);
  const scan = (sx: number, sy: number) => {
    const s = sy * W + sx; if (seen[s] || lumOf(d, s) >= dark) return;
    const comp = [s]; const st = [s]; seen[s] = 1; let inside = true, x0 = sx, x1 = sx, y0 = sy, y1 = sy;
    while (st.length) {
      const i = st.pop()!; const x = i % W, y = (i / W) | 0;
      if (!inBand(x, y)) inside = false;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx; if (!seen[k] && lumOf(d, k) < dark) { seen[k] = 1; st.push(k); comp.push(k); }
      }
    }
    if (inside && Math.max(x1 - x0, y1 - y0) + 1 <= maxPx) for (const i of comp) { d[i * 4] = col.r; d[i * 4 + 1] = col.g; d[i * 4 + 2] = col.b; }
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inBand(x, y)) scan(x, y);
  return d;
}

/**
 * S10f – Q2 sót: vệt mảnh dài song song mép (mép tờ giấy bên dưới) nằm trong dải `band` (8 %).
 * Thành phần tối có bề ngang ≤ 1,2 % cạnh ngắn, dài ≥ 6 % cạnh ngắn và ≥ 8× bề ngang → tô màu giấy.
 * Nét chữ ngắn (l, I) không đủ dài nên giữ nguyên.
 */
export function edgeLineClean(d: Px, W: number, H: number, band = 0.08) {
  const col = paperColor(d, W, H); const dark = darkThreshold(col.L) + 25; const S = Math.min(W, H);
  const bw = Math.round(S * band), maxW = Math.max(3, Math.round(S * 0.012)), minL = Math.round(S * 0.06);
  const seen = new Uint8Array(W * H);
  const isDark = (k: number) => lumOf(d, k) < dark;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!(x < bw || y < bw || x >= W - bw || y >= H - bw)) continue;
    const s = y * W + x; if (seen[s] || !isDark(s)) continue;
    const comp = [s], st = [s]; seen[s] = 1; let x0 = x, x1 = x, y0 = y, y1 = y;
    while (st.length && comp.length < 200000) {
      const i = st.pop()!; const px = i % W, py = (i / W) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx; if (!seen[k] && isDark(k)) { seen[k] = 1; st.push(k); comp.push(k); }
      }
    }
    const bwX = x1 - x0 + 1, bhY = y1 - y0 + 1;
    const vert = bwX <= maxW * 2 && bhY >= minL && bhY >= 8 * bwX && (x1 < bw || x0 >= W - bw);
    const horz = bhY <= maxW * 2 && bwX >= minL && bwX >= 8 * bhY && (y1 < bw || y0 >= H - bw);
    // thickness check: average run per row/col
    const thin = vert ? comp.length / bhY <= maxW : horz ? comp.length / bwX <= maxW : false;
    if ((vert || horz) && thin) for (const i of comp) { d[i * 4] = col.r; d[i * 4 + 1] = col.g; d[i * 4 + 2] = col.b; }
  }
  return d;
}

/**
 * S10b – Q1: bóng xám không chạm mép ảnh. Làm phẳng nền theo nền cục bộ:
 * nền = độ sáng lớn nhất trong ô `cell` px (bỏ chữ), làm mượt 3×3; chỗ nền tối hơn giấy ≥ 6
 * và nằm trong dải mép `band` (25 %) thì nhân điểm ảnh theo tỉ số giấy/nền (giữ chữ, chỉ bỏ bóng).
 */
export function edgeShadowFlatten(d: Px, W: number, H: number, band = 0.25) {
  const col = paperColor(d, W, H); const P = col.L; if (P < 90) return d;
  const cell = Math.max(8, Math.round(Math.min(W, H) / 40));
  const cw = Math.ceil(W / cell), ch = Math.ceil(H / cell); const bg = new Float32Array(cw * ch);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = ((y / cell) | 0) * cw + ((x / cell) | 0); const l = lumOf(d, y * W + x); if (l > bg[k]) bg[k] = l; }
  const sm = new Float32Array(cw * ch);
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    let s = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = cx + dx, Y = cy + dy; if (X >= 0 && Y >= 0 && X < cw && Y < ch) { s += bg[Y * cw + X]; n++; } }
    sm[cy * cw + cx] = s / n;
  }
  const bw = Math.min(W, H) * band;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e > bw) continue;
    // nội suy song tuyến nền
    const fx = Math.min(cw - 1, Math.max(0, x / cell - 0.5)), fy = Math.min(ch - 1, Math.max(0, y / cell - 0.5));
    const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(cw - 1, x0 + 1), y1 = Math.min(ch - 1, y0 + 1), ax = fx - x0, ay = fy - y0;
    const b = (sm[y0 * cw + x0] * (1 - ax) + sm[y0 * cw + x1] * ax) * (1 - ay) + (sm[y1 * cw + x0] * (1 - ax) + sm[y1 * cw + x1] * ax) * ay;
    if (b >= P - 6 || b < 40) continue;
    const g = Math.min(3, P / b), j = (y * W + x) * 4;
    d[j] = Math.min(255, d[j] * g); d[j + 1] = Math.min(255, d[j + 1] * g); d[j + 2] = Math.min(255, d[j + 2] * g);
  }
  return d;
}

/**
 * S10b – Q1 (bản dùng): bóng xám mềm trong dải mép, không cần chạm viền ảnh.
 * Điểm "phẳng" (lệch < 14 so với láng giềng cách 2 px) có độ sáng trong (0,55·P; P−6) → tô màu giấy.
 * Nét chữ có cạnh gắt nên không phẳng; lõi nét đậm < 0,55·P nên được giữ.
 */
export function edgeShadowSmooth(d: Px, W: number, H: number, band = 0.25) {
  const col = paperColor(d, W, H); const P = col.L; if (P < 90) return d;
  const lo = P * 0.55, hi = P - 6, bw = Math.min(W, H) * band, s = 2;
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lumOf(d, i);
  const m = new Uint8Array(W * H);
  for (let y = s; y < H - s; y++) for (let x = s; x < W - s; x++) {
    if (Math.min(x, y, W - 1 - x, H - 1 - y) > bw) continue;
    const i = y * W + x, v = L[i]; if (v <= lo || v >= hi) continue;
    if (Math.abs(L[i - s] - v) < 14 && Math.abs(L[i + s] - v) < 14 && Math.abs(L[i - s * W] - v) < 14 && Math.abs(L[i + s * W] - v) < 14) m[i] = 1;
  }
  const g = dilate(m, W, H, 2);
  for (let i = 0; i < W * H; i++) {
    if (!g[i] || L[i] < lo) continue; const j = i * 4;
    d[j] = col.r; d[j + 1] = col.g; d[j + 2] = col.b;
  }
  return d;
}

/**
 * S10g/S10h – vệt đứt nét sát mép (mép tờ bên dưới): nhiều mảnh mảnh, dài theo một hướng, nối thành đường gần thẳng
 * (cho phép xiên ≤ 0,2 px/px) trong dải mép `band` (12 %). Điểm "tối" theo tương phản cục bộ: tối hơn nền ô ≥ 14
 * (bắt cả vệt xám nhạt). Mảnh phải cô lập (không có điểm tối bên cạnh như chữ cùng dòng). Tổng dài ≥ 6 % cạnh ngắn → xoá.
 */
/**
 * V5d: điểm tối theo tương phản cục bộ (nền = độ sáng lớn nhất trong ô S/40, kẹp ≤ màu giấy; tối hơn nền ≥ 14).
 * Dùng chung cho edgeDashClean/edgeStrokeClean; chỉ số ô tính theo hàng + bảng cột, không chia cho từng điểm.
 */
function localDark(L: Float32Array, W: number, H: number, S: number, paperL: number) {
  const cell = Math.max(8, Math.round(S / 40)), cw = Math.ceil(W / cell), ch = Math.ceil(H / cell), bg = new Float32Array(cw * ch);
  const cx = new Int32Array(W); for (let x = 0; x < W; x++) cx[x] = (x / cell) | 0;
  for (let y = 0; y < H; y++) { const r = ((y / cell) | 0) * cw, o = y * W; for (let x = 0; x < W; x++) { const k = r + cx[x], v = L[o + x]; if (v > bg[k]) bg[k] = v; } }
  const dk = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) { const r = ((y / cell) | 0) * cw, o = y * W; for (let x = 0; x < W; x++) if (Math.min(paperL, bg[r + cx[x]]) - L[o + x] >= 14) dk[o + x] = 1; }
  return dk;
}

export function edgeDashClean(d: Px, W: number, H: number, band = 0.12) {
  const col = paperColor(d, W, H); const S = Math.min(W, H); if (col.L < 90) return d;
  const bw = Math.round(S * band), maxW = Math.max(3, Math.round(S * 0.008)), minL = Math.round(S * 0.06), maxGap = Math.round(S * 0.05);
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lumOf(d, i);
  const dk = localDark(L, W, H, S, col.L);
  const inBand = (x: number, y: number) => x < bw || y < bw || x >= W - bw || y >= H - bw;
  const seen = new Uint8Array(W * H);
  type C = { px: number[]; c: number; a0: number; a1: number; v: boolean };
  const cs: C[] = [];
  const darkIn = (xa: number, xb: number, ya: number, yb: number) => { let n = 0; for (let y = Math.max(0, ya); y <= Math.min(H - 1, yb); y++) for (let x = Math.max(0, xa); x <= Math.min(W - 1, xb); x++) n += dk[y * W + x]; return n; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inBand(x, y)) continue;
    const s = y * W + x; if (seen[s] || !dk[s]) continue;
    const comp = [s], st = [s]; seen[s] = 1; let x0 = x, x1 = x, y0 = y, y1 = y;
    while (st.length && comp.length < 5000) {
      const i = st.pop()!; const px = i % W, py = (i / W) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      // V5d: 4 láng giềng viết thẳng (không cấp phát mảng cho từng điểm)
      if (px + 1 < W) { const k = i + 1; if (!seen[k] && dk[k]) { seen[k] = 1; st.push(k); comp.push(k); } }
      if (px > 0) { const k = i - 1; if (!seen[k] && dk[k]) { seen[k] = 1; st.push(k); comp.push(k); } }
      if (py + 1 < H) { const k = i + W; if (!seen[k] && dk[k]) { seen[k] = 1; st.push(k); comp.push(k); } }
      if (py > 0) { const k = i - W; if (!seen[k] && dk[k]) { seen[k] = 1; st.push(k); comp.push(k); } }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, r = maxW * 3;
    if (h >= 4 * w && h >= 6 && comp.length / h <= maxW && (x1 < bw || x0 >= W - bw)) {
      if (darkIn(x0 - r, x0 - 2, y0, y1) + darkIn(x1 + 2, x1 + r, y0, y1) <= h * 0.3) cs.push({ px: comp, c: (x0 + x1) / 2, a0: y0, a1: y1, v: true });
    } else if (w >= 4 * h && w >= 6 && comp.length / w <= maxW && (y1 < bw || y0 >= H - bw)) {
      if (darkIn(x0, x1, y0 - r, y0 - 2) + darkIn(x0, x1, y1 + 2, y1 + r) <= w * 0.3) cs.push({ px: comp, c: (y0 + y1) / 2, a0: x0, a1: x1, v: false });
    }
  }
  for (const v of [true, false]) {
    const g = cs.filter((c) => c.v === v).sort((a, b) => a.a0 - b.a0); const used = new Uint8Array(g.length);
    for (let i = 0; i < g.length; i++) {
      if (used[i]) continue; const chain = [i]; used[i] = 1; let last = g[i], tot = last.a1 - last.a0 + 1;
      for (let j = i + 1; j < g.length; j++) {
        if (used[j]) continue; const gap = g[j].a0 - last.a1; if (gap > maxGap) break;
        if (Math.abs(g[j].c - last.c) <= maxW * 1.5 + Math.max(0, gap + (g[j].a1 - g[j].a0)) * 0.2) { chain.push(j); used[j] = 1; tot += g[j].a1 - g[j].a0 + 1; last = g[j]; }
      }
      if (tot >= minL && chain.length > 1) for (const k of chain) for (const p of g[k].px) { d[p * 4] = col.r; d[p * 4 + 1] = col.g; d[p * 4 + 2] = col.b; }
    }
  }
  return d;
}

/**
 * S10i – vệt đứt nét/xiên bất kỳ góc (mép tờ dưới, vết bút) trong dải mép `band` (15 %).
 * Điểm tối theo tương phản cục bộ (≥ 14). Mảnh nhỏ (≤ 4× bề dày tối đa) nằm thưa (ít điểm tối lạ quanh mảnh) được
 * coi là ứng viên; tìm đường thẳng đi qua ≥ 5 mảnh (≥ 6 mảnh gạch thuôn, phủ ≥ 40 %, lệch ≤ bề dày tối đa, khe ≤ 5 %, dài ≥ 8 % cạnh ngắn; hai bên trống ≥ 98 %),
 * không gần nằm ngang (≥ 35°, tránh dòng chữ nghiêng). Mỗi mảnh trên đường phải trống hai bên (không có chữ) → tô màu giấy.
 */
export function edgeStrokeClean(d: Px, W: number, H: number, band = 0.15) {
  const col = paperColor(d, W, H); const S = Math.min(W, H); if (col.L < 90) return d;
  const bw = Math.round(S * band), maxW = Math.max(3, Math.round(S * 0.008)), minL = S * 0.08, maxGap = S * 0.05;
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lumOf(d, i);
  const dk = localDark(L, W, H, S, col.L);
  const inBand = (x: number, y: number) => x < bw || y < bw || x >= W - bw || y >= H - bw;
  const lab = new Int32Array(W * H).fill(-1);
  type F = { px: number[]; id: number; x: number; y: number; x0: number; x1: number; y0: number; y1: number };
  const fs: F[] = []; let nid = 0;
  const maxS = maxW * 4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x; if (lab[s] !== -1 || !dk[s] || !inBand(x, y)) continue;
    const id = nid++; const comp = [s], st = [s]; lab[s] = id; let x0 = x, x1 = x, y0 = y, y1 = y;
    while (st.length && comp.length < 4000) {
      const i = st.pop()!; const px = i % W, py = (i / W) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx; if (lab[k] === -1 && dk[k]) { lab[k] = id; st.push(k); comp.push(k); }
      }
    }
    const n = comp.length;
    if (n < 3 || x1 - x0 + 1 > maxS || y1 - y0 + 1 > maxS) continue;
    // thưa: điểm tối lạ trong khung nở r
    const r = maxW * 2; let foreign = 0;
    for (let yy = Math.max(0, y0 - r); yy <= Math.min(H - 1, y1 + r); yy += 2) for (let xx = Math.max(0, x0 - r); xx <= Math.min(W - 1, x1 + r); xx += 2) { const k = yy * W + xx; if (dk[k] && lab[k] !== id) foreign++; }
    if (foreign > Math.max(40, n * 1.5)) continue;
    let mx = 0, my = 0; for (const p of comp) { mx += p % W; my += (p / W) | 0; }
    fs.push({ px: comp, id, x: mx / n, y: my / n, x0, x1, y0, y1 });
  }
  const alive = new Uint8Array(fs.length).fill(1); const sinH = Math.sin((35 * Math.PI) / 180);
  for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
    if (!alive[i] || !alive[j]) continue;
    const a = fs[i], b = fs[j]; const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
    if (dist < maxW * 2 || dist > maxGap) continue;
    const ux = dx / dist, uy = dy / dist; if (Math.abs(uy) < sinH) continue;
    const inl: { k: number; t: number }[] = [];
    for (let k = 0; k < fs.length; k++) { if (!alive[k]) continue; const ex = fs[k].x - a.x, ey = fs[k].y - a.y; if (Math.abs(-ex * uy + ey * ux) <= maxW) inl.push({ k, t: ex * ux + ey * uy }); }
    if (inl.length < 5) continue;
    inl.sort((p, q) => p.t - q.t);
    // đoạn liên tục chứa a (t=0)
    let s0 = inl.findIndex((p) => p.k === i), e0 = s0;
    while (s0 > 0 && inl[s0].t - inl[s0 - 1].t <= maxGap) s0--;
    while (e0 < inl.length - 1 && inl[e0 + 1].t - inl[e0].t <= maxGap) e0++;
    const run = inl.slice(s0, e0 + 1); if (run.length < 6 || run[run.length - 1].t - run[0].t < minL) continue;
    // mảnh phải là đoạn gạch thuôn theo hướng đường (chấm tròn của dòng "....." không tính); phủ ≥ 40 % chiều dài
    let cover = 0, along = 0;
    for (const { k } of run) {
      let t0 = Infinity, t1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const p of fs[k].px) { const ex = (p % W) - a.x, ey = ((p / W) | 0) - a.y; const t = ex * ux + ey * uy, v = -ex * uy + ey * ux; if (t < t0) t0 = t; if (t > t1) t1 = t; if (v < v0) v0 = v; if (v > v1) v1 = v; }
      cover += t1 - t0 + 1; if (t1 - t0 >= 1.5 * (v1 - v0)) along++;
    }
    const span = run[run.length - 1].t - run[0].t;
    if (cover < span * 0.4 || along < run.length * 0.6) continue;
    // hai bên đường phải trống (chữ có láng giềng bên cạnh)
    let side = 0, tot = 0; const R = maxW * 3;
    for (const { k } of run) { const f = fs[k]; for (const sg of [-1, 1]) for (let v = maxW; v <= R; v++) { const X = Math.round(f.x - sg * v * uy), Y = Math.round(f.y + sg * v * ux); tot++; if (X >= 0 && Y >= 0 && X < W && Y < H && dk[Y * W + X] && lab[Y * W + X] !== f.id) side++; } }
    if (side > tot * 0.02) continue;
    for (const { k } of run) { alive[k] = 0; for (const p of fs[k].px) { d[p * 4] = col.r; d[p * 4 + 1] = col.g; d[p * 4 + 2] = col.b; } }
  }
  return d;
}

/**
 * S10j – (1) khung xám mảnh: hàng/cột gần thẳng trục trong dải mép `band` có ≥ 25 % chiều dài là điểm hơi tối
 * (tương phản ≥ 6), dày ≤ bề dày tối đa, hai bên là giấy → tô màu giấy.
 * (2) vạch liền dài: thành phần tối liền khối, thuôn (dài ≥ 6 % cạnh ngắn, ≥ 8× bề ngang trung bình), góc ≥ 35°,
 * nằm trong dải mép, ít điểm tối lạ quanh → tô màu giấy.
 */
export function edgeFrameClean(d: Px, W: number, H: number, band = 0.15) {
  const col = paperColor(d, W, H); const S = Math.min(W, H); if (col.L < 90) return d;
  const bw = Math.round(S * band), maxW = Math.max(3, Math.round(S * 0.008));
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lumOf(d, i);
  const paint = (i: number) => { d[i * 4] = col.r; d[i * 4 + 1] = col.g; d[i * 4 + 2] = col.b; };
  const faint = (i: number) => col.L - L[i] >= 6 && col.L - L[i] < 120;
  const isPaper = (i: number) => col.L - L[i] < 5;
  // (1) đường thẳng trục: quét từng hàng/cột trong dải; đoạn liên tục dài ≥ 20 % cạnh ngắn
  const minRun = S * 0.2;
  const fM = new Uint8Array(W * H), pM = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { if (faint(i)) fM[i] = 1; if (isPaper(i)) pM[i] = 1; }
  const scan = (horiz: boolean) => {
    const N = horiz ? H : W, M = horiz ? W : H;
    const at = (a: number, b: number) => (horiz ? a * W + b : b * W + a);
    for (let a = 0; a < N; a++) {
      if (a >= bw && a < N - bw) continue;
      let s = -1, gap = 0, hit = 0;
      for (let b = 0; b <= M; b++) {
        let on = false;
        // V5e: mặt nạ dựng sẵn, 3 độ lệch viết thẳng (không cấp phát mảng mỗi điểm)
        if (b < M) for (let o = 0; o < 3 && !on; o++) { const aa = a + (o === 0 ? 0 : o === 1 ? -1 : 1); if (aa < 0 || aa >= N) continue; if (fM[at(aa, b)] && pM[at(aa > 4 ? aa - 4 : 0, b)] && pM[at(aa + 4 < N - 1 ? aa + 4 : N - 1, b)]) on = true; }
        if (on) { if (s < 0) s = b; hit++; gap = 0; continue; }
        if (s >= 0 && b < M && ++gap <= maxW * 2) continue;
        const e = b - gap; if (s >= 0 && e - s >= minRun && hit >= (e - s) * 0.6) {
          for (let k = s; k <= e && k < M; k++) for (let t = -3; t <= 3; t++) { const aa = a + t; if (aa < 0 || aa >= N) continue; const i = at(aa, k); if (faint(i)) paint(i); }
        }
        s = -1; gap = 0; hit = 0;
      }
    }
  };
  scan(true); scan(false);
  // (2) vạch liền dài thuôn
  const dk = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) if (col.L - lumOf(d, i) >= 30) dk[i] = 1;
  const seen = new Uint8Array(W * H); const sinH = Math.sin((35 * Math.PI) / 180);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x; if (seen[s] || !dk[s] || !(x < bw || y < bw || x >= W - bw || y >= H - bw)) continue;
    const comp = [s], st = [s]; seen[s] = 1;
    while (st.length && comp.length < 20000) { const i = st.pop()!; const px = i % W, py = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (!seen[k] && dk[k]) { seen[k] = 1; st.push(k); comp.push(k); } } }
    const n = comp.length; if (n < 20) continue;
    let mx = 0, my = 0; for (const p of comp) { mx += p % W; my += (p / W) | 0; } mx /= n; my /= n;
    let sxx = 0, syy = 0, sxy = 0; for (const p of comp) { const ex = (p % W) - mx, ey = ((p / W) | 0) - my; sxx += ex * ex; syy += ey * ey; sxy += ex * ey; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(th), uy = Math.sin(th);
    let t0 = Infinity, t1 = -Infinity; for (const p of comp) { const t = ((p % W) - mx) * ux + (((p / W) | 0) - my) * uy; if (t < t0) t0 = t; if (t > t1) t1 = t; }
    const len = t1 - t0 + 1, wAvg = n / len;
    // thẳng: lệch vuông góc RMS nhỏ (nét chữ ký cong bị loại)
    let rr = 0; for (const p of comp) { const v = -((p % W) - mx) * uy + (((p / W) | 0) - my) * ux; rr += v * v; }
    if (Math.sqrt(rr / n) > Math.max(1.5, wAvg * 0.6)) continue;
    if (len < S * 0.04 || wAvg > maxW * 1.5 || len < wAvg * 8 || Math.abs(uy) < sinH) continue;
    // ít điểm tối lạ hai bên (không phải nét chữ ký/chữ)
    let side = 0, tot = 0; const R = maxW * 4;
    for (let q = 0; q < n; q += 3) { const p = comp[q]; const px = p % W, py = (p / W) | 0;
      for (const sg of [-1, 1]) for (let v = maxW * 2; v <= R; v += 2) { const X = Math.round(px - sg * v * uy), Y = Math.round(py + sg * v * ux); tot++; if (X >= 0 && Y >= 0 && X < W && Y < H && dk[Y * W + X] && !seen[Y * W + X]) side++; } }
    if (side > tot * 0.02) continue;
    for (const p of comp) { paint(p); const px = p % W, py = (p / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = (py + dy) * W + px + dx; if (k >= 0 && k < W * H && col.L - L[k] >= 6 && col.L - L[k] < 80) paint(k); } }
  }
  return d;
}

/**
 * S10j – mảng xám phẳng (bóng tờ khác, cạnh sắc) bất kỳ vị trí: nền cục bộ (đóng hình thái max→min trên ảnh ½)
 * thấp hơn giấy 6–70 → chia nền (flat-field) cho điểm đó; chữ vẫn tối, nền về màu giấy.
 */
export function greyBlockLift(d: Px, W: number, H: number) {
  const col = paperColor(d, W, H); if (col.L < 120) return d;
  const w = Math.ceil(W / 2), h = Math.ceil(H / 2), g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = lumOf(d, Math.min(H - 1, y * 2) * W + Math.min(W - 1, x * 2));
  const r = Math.max(4, Math.round(Math.min(w, h) / 180));
  // V5c: lọc max/min trượt van Herk–Gil-Werman (O(1)/điểm, kết quả y hệt cửa sổ [x−r, x+r] kẹp mép)
  const vhgw = (src: Float32Array, dst: Float32Array, n: number, off: number, step: number, isMax: boolean, gF: Float32Array, hF: Float32Array) => {
    const k = 2 * r + 1, fill = isMax ? -Infinity : Infinity;
    const m = Math.ceil((n + 2 * r) / k) * k; // chuỗi đệm: i ∈ [0, m) ↔ vị trí i − r
    const at = (i: number) => { const q = i - r; return q >= 0 && q < n ? src[off + q * step] : fill; };
    for (let b = 0; b < m; b += k) {
      let v = fill; for (let i = b; i < b + k; i++) { const a = at(i); v = isMax ? (a > v ? a : v) : (a < v ? a : v); gF[i] = v; }
      v = fill; for (let i = b + k - 1; i >= b; i--) { const a = at(i); v = isMax ? (a > v ? a : v) : (a < v ? a : v); hF[i] = v; }
    }
    for (let q = 0; q < n; q++) { const a = hF[q], c = gF[q + 2 * r]; dst[off + q * step] = isMax ? (a > c ? a : c) : (a < c ? a : c); }
  };
  const filt = (src: Float32Array, isMax: boolean) => {
    const a = new Float32Array(w * h), b = new Float32Array(w * h);
    const len = Math.max(w, h) + 4 * r + 2, gF = new Float32Array(len), hF = new Float32Array(len);
    for (let y = 0; y < h; y++) vhgw(src, a, w, y * w, 1, isMax, gF, hF);
    for (let x = 0; x < w; x++) vhgw(a, b, h, x, w, isMax, gF, hF);
    return b;
  };
  const bg0 = filt(filt(g, true), false);
  // S10k: nền mỗi điểm = min nền ½ trong lân cận 3×3 → điểm ngay mép mảng (mất khi lấy mẫu ½) cũng được nâng, hết đường mép sắc.
  const bg = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = bg0[y * w + x];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w) v = Math.min(v, bg0[yy * w + xx]); }
    bg[y * w + x] = v;
  }
  const lifted = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b = bg[Math.min(h - 1, y >> 1) * w + Math.min(w - 1, x >> 1)], def = col.L - b; if (def < 6 || def > 70) continue;
    const i = y * W + x, s = col.L / b; lifted[i] = 1;
    for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.min(255, d[i * 4 + c] * s);
  }
  // S10k: đường mép mảnh (≤ 2 px) nhạt còn lại trong vùng đã nâng, hai bên cách 3 px là giấy → tô màu giấy.
  const L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = lumOf(d, i);
  const pap = (k: number) => L[k] >= col.L - 12;
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    const i = y * W + x; if (!lifted[i] && !lifted[i - 3] && !lifted[i + 3] && !lifted[i - 3 * W] && !lifted[i + 3 * W]) continue;
    const def = col.L - L[i]; if (def < 6 || def > 45) continue;
    if ((pap(i - 3) && pap(i + 3)) || (pap(i - 3 * W) && pap(i + 3 * W))) { for (let c = 0; c < 3; c++) d[i * 4 + c] = d[(pap(i - 3) ? i - 3 : i - 3 * W) * 4 + c]; }
  }
  return d;
}

/**
 * S10m – Q2 sót ở góc: vệt mảnh cô lập (dấu tick, đoạn mép tờ dưới) nằm trong vùng góc 12 %.
 * Thành phần tối: dài 2–10 % cạnh ngắn, bề dày TB ≤ 1,2 % cạnh ngắn, quanh nó (lề 2 %) gần như không có
 * điểm tối khác → tô màu giấy. Chữ ký/chữ ở góc lớn hơn hoặc không cô lập nên được giữ.
 */
export function edgeCornerClean(d: Px, W: number, H: number, zone = 0.12) {
  const col = paperColor(d, W, H); const dark = darkThreshold(col.L) + 25; const S = Math.min(W, H);
  const cz = Math.round(S * zone), minL = Math.round(S * 0.02), maxL = Math.round(S * 0.1), maxW = Math.max(3, Math.round(S * 0.012)), mg = Math.round(S * 0.02);
  const inCorner = (x: number, y: number) => (x < cz || x >= W - cz) && (y < cz || y >= H - cz);
  const isDark = (k: number) => lumOf(d, k) < dark;
  const seen = new Uint8Array(W * H), mine = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inCorner(x, y)) continue;
    const s = y * W + x; if (seen[s] || !isDark(s)) continue;
    const comp = [s], st = [s]; seen[s] = 1; let x0 = x, x1 = x, y0 = y, y1 = y;
    while (st.length && comp.length < 100000) {
      const i = st.pop()!; const px = i % W, py = (i / W) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx; if (!seen[k] && isDark(k)) { seen[k] = 1; st.push(k); comp.push(k); }
      }
    }
    const len = Math.max(x1 - x0, y1 - y0) + 1;
    if (len < minL || len > maxL || comp.length / len > maxW) continue;
    if (!(inCorner(x0, y0) && inCorner(x1, y1) && inCorner(x0, y1) && inCorner(x1, y0))) continue;
    for (const i of comp) mine[i] = 1;
    let other = 0;
    for (let yy = Math.max(0, y0 - mg); yy <= Math.min(H - 1, y1 + mg); yy++) for (let xx = Math.max(0, x0 - mg); xx <= Math.min(W - 1, x1 + mg); xx++) {
      const k = yy * W + xx; if (!mine[k] && isDark(k)) other++;
    }
    for (const i of comp) mine[i] = 0;
    if (other > comp.length * 0.15) continue;
    // xoá cả quầng xám quanh nét (≤ 3 px)
    for (let yy = Math.max(0, y0 - 3); yy <= Math.min(H - 1, y1 + 3); yy++) for (let xx = Math.max(0, x0 - 3); xx <= Math.min(W - 1, x1 + 3); xx++) {
      const k = yy * W + xx; if (lumOf(d, k) < col.L - 3) { d[k * 4] = col.r; d[k * 4 + 1] = col.g; d[k * 4 + 2] = col.b; }
    }
  }
  // vạch mảnh nhạt dọc/ngang trong vùng góc (đuôi đường kẻ bảng, mép tờ dưới): hai bên cách 4 px là giấy, dài ≥ 2 % → tô giấy
  const grey = (k: number) => lumOf(d, k) < col.L - 15, pap = (k: number) => lumOf(d, k) >= col.L - 8;
  const wipe = (ks: number[]) => { for (const k of ks) { d[k * 4] = col.r; d[k * 4 + 1] = col.g; d[k * 4 + 2] = col.b; } };
  for (let x = 4; x < W - 4; x++) {
    if (!(x < cz || x >= W - cz)) continue;
    for (const [ya, yb] of [[0, cz], [H - cz, H]]) {
      let run: number[] = [];
      for (let y = ya; y <= yb; y++) {
        const k = y * W + x;
        if (y < yb && grey(k) && pap(k - 4) && pap(k + 4)) { run.push(k); continue; }
        if (run.length >= minL) wipe(run); run = [];
      }
    }
  }
  for (let y = 4; y < H - 4; y++) {
    if (!(y < cz || y >= H - cz)) continue;
    for (const [xa, xb] of [[0, cz], [W - cz, W]]) {
      let run: number[] = [];
      for (let x = xa; x <= xb; x++) {
        const k = y * W + x;
        if (x < xb && grey(k) && pap(k - 4 * W) && pap(k + 4 * W)) { run.push(k); continue; }
        if (run.length >= minL) wipe(run); run = [];
      }
    }
  }
  return d;
}

/**
 * R6.1b-3 – Nâng bóng nền tràn vào 4 góc sau khi nắn khung (cổng 17.4: góc tối ≤ 0,2 %).
 * Thành phần tối (luma < 60) trong vùng góc 6 % mà chạm mép ảnh là nền ngoài tờ giấy
 * (nội dung thật hầu như không dính mép) → tô màu giấy cả quầng xám 2 px quanh nó.
 * Vệt tối ở góc nhưng KHÔNG chạm mép (chữ ký, dấu) được giữ nguyên.
 */
export function cornerShadowLift(d: Px, W: number, H: number, zone = 0.06) {
  const col = paperColor(d, W, H); const S = Math.min(W, H);
  const cz = Math.round(S * zone);
  const inCorner = (x: number, y: number) => (x < cz || x >= W - cz) && (y < cz || y >= H - cz);
  const isDark = (k: number) => lumOf(d, k) < 60;
  const seen = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inCorner(x, y)) continue;
    const s = y * W + x; if (seen[s] || !isDark(s)) continue;
    const st = [s]; seen[s] = 1; let touch = false;
    let x0 = x, x1 = x, y0 = y, y1 = y; let n = 0;
    while (st.length && n < 200000) {
      const i = st.pop()!; n++; const px = i % W, py = (i / W) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px === 0 || py === 0 || px === W - 1 || py === H - 1) touch = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || !inCorner(nx, ny)) continue;
        const k = ny * W + nx; if (!seen[k] && isDark(k)) { seen[k] = 1; st.push(k); }
      }
    }
    if (!touch) {
      // Khối đen đặc (khối marker/che nằm trong vùng góc, không chạm mép): lấp đầy > 70 % khung bao,
      // cạnh 0,5–8 % cạnh ngắn → coi là vật lạ, tô giấy. Nét chữ/con dấu loang không đặc nên được giữ.
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, fill = n / (bw * bh);
      const block = fill > 0.7 && bw >= S * 0.005 && bh >= S * 0.005 && bw <= S * 0.08 && bh <= S * 0.08;
      if (!block) continue;
    }
    for (let yy = Math.max(0, y0 - 2); yy <= Math.min(H - 1, y1 + 2); yy++) for (let xx = Math.max(0, x0 - 2); xx <= Math.min(W - 1, x1 + 2); xx++) {
      const k = yy * W + xx; if (lumOf(d, k) < col.L - 3) { d[k * 4] = col.r; d[k * 4 + 1] = col.g; d[k * 4 + 2] = col.b; }
    }
  }
  return d;
}
