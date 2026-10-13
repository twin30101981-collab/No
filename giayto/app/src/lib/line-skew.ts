/**
 * S11f – Đo độ cong/nghiêng dòng chữ (Q4) theo từng vùng trang.
 * Mỗi vùng (dải ngang × nửa trái/phải) thử góc −3°…+3°, chọn góc làm
 * hình chiếu ngang "sắc" nhất (tổng bình phương chênh lệch hàng kề).
 * Cong = chênh góc trái/phải trong cùng dải; nghiêng = góc trung bình.
 * Hàm thuần trên ảnh xám, chạy được trong Worker/kiểm thử.
 */
export type SkewCell = { band: number; side: 0 | 1; angle: number; ink: number };

export function regionAngle(
  g: Uint8Array, W: number, x0: number, x1: number, y0: number, y1: number,
  maxDeg = 3, step = 0.25, thr = 140,
): { angle: number; ink: number } {
  const H = y1 - y0, cx = (x0 + x1) / 2;
  let best = 0, bestScore = -1, ink = 0;
  const xs = Math.max(1, ((x1 - x0) / 200) | 0);
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += xs) if (g[y * W + x] < thr) ink++;
  for (let a = -maxDeg; a <= maxDeg + 1e-9; a += step) {
    const t = Math.tan((a * Math.PI) / 180);
    const prof = new Float64Array(H + 1);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x += xs) {
        if (g[y * W + x] >= thr) continue;
        const r = Math.round(y - y0 - (x - cx) * t);
        if (r >= 0 && r <= H) prof[r]++;
      }
    }
    let s = 0;
    for (let r = 1; r <= H; r++) { const d = prof[r] - prof[r - 1]; s += d * d; }
    if (s > bestScore) { bestScore = s; best = a; }
  }
  return { angle: best, ink };
}

export function lineSkewMap(g: Uint8Array, W: number, H: number, bands = 6) {
  const mx = (W * 0.06) | 0, my = (H * 0.04) | 0;
  const bh = ((H - 2 * my) / bands) | 0, half = ((W - 2 * mx) / 2) | 0;
  const cells: SkewCell[] = [];
  for (let b = 0; b < bands; b++) {
    const y0 = my + b * bh;
    for (const side of [0, 1] as const) {
      const x0 = mx + side * half;
      const r = regionAngle(g, W, x0, x0 + half, y0, y0 + bh);
      cells.push({ band: b, side, ...r });
    }
  }
  const curve = (from: number, to: number) => {
    let m = 0;
    for (let b = from; b < to; b++) {
      const l = cells[b * 2], r = cells[b * 2 + 1];
      if (l.ink > 50 && r.ink > 50) m = Math.max(m, Math.abs(l.angle - r.angle));
    }
    return m;
  };
  const tilt = (from: number, to: number) => {
    let s = 0, n = 0;
    for (const c of cells) if (c.band >= from && c.band < to && c.ink > 50) { s += c.angle; n++; }
    return n ? s / n : 0;
  };
  const h = bands >> 1;
  return {
    cells,
    top: { curve: curve(0, h), tilt: tilt(0, h) },
    bottom: { curve: curve(h, bands), tilt: tilt(h, bands) },
  };
}

/**
 * S11g – Nắn bù góc dòng nửa dưới theo số đo từng ô (lineSkewMap).
 * Độ dốc dòng tan(góc) được nội suy song tuyến giữa tâm các ô; nửa trên = 0
 * (chuyển mượt qua tâm dải giữa). Dịch dọc tại (x, y) = tích phân độ dốc từ
 * tâm trang tới x, nên tâm trang đứng yên. Ô ít mực hoặc |góc| < minDeg bỏ qua.
 * Lấy mẫu song tuyến; trả ảnh RGBA mới cùng cỡ.
 */
export function lineSkewCorrect(
  d: Uint8ClampedArray, W: number, H: number, cells: SkewCell[], bands = 6,
  opts: { fromBand?: number; toBand?: number; minDeg?: number; minInk?: number } = {},
): Uint8ClampedArray {
  const from = opts.fromBand ?? bands >> 1, to = opts.toBand ?? bands, minDeg = opts.minDeg ?? 0.25, minInk = opts.minInk ?? 50;
  const mx = (W * 0.06) | 0, my = (H * 0.04) | 0;
  const bh = ((H - 2 * my) / bands) | 0, half = ((W - 2 * mx) / 2) | 0;
  const slope = (b: number, s: number) => {
    if (b < from || b >= to) return 0;
    const c = cells[b * 2 + s];
    if (!c || c.ink <= minInk || Math.abs(c.angle) < minDeg) return 0;
    return Math.tan((c.angle * Math.PI) / 180);
  };
  if (cells.every((_, i) => slope(i >> 1, i & 1) === 0)) return new Uint8ClampedArray(d);
  const xl = mx + half / 2, xr = mx + half * 1.5, cx = W / 2;
  const out = new Uint8ClampedArray(d.length);
  const row = new Float64Array(W);
  for (let y = 0; y < H; y++) {
    const fb = Math.min(bands - 1, Math.max(0, (y - my) / bh - 0.5));
    const b0 = Math.floor(fb), b1 = Math.min(bands - 1, b0 + 1), tb = fb - b0;
    const sl = slope(b0, 0) * (1 - tb) + slope(b1, 0) * tb;
    const sr = slope(b0, 1) * (1 - tb) + slope(b1, 1) * tb;
    // độ dốc tại x (nội suy tuyến tính trái→phải, kẹp ngoài), tích phân từ cx
    const k = (x: number) => { const t = Math.min(1, Math.max(0, (x - xl) / (xr - xl))); return sl * (1 - t) + sr * t; };
    const c0 = Math.round(cx);
    row[c0] = 0;
    for (let x = c0 + 1; x < W; x++) row[x] = row[x - 1] + k(x - 0.5);
    for (let x = c0 - 1; x >= 0; x--) row[x] = row[x + 1] - k(x + 0.5);
    for (let x = 0; x < W; x++) {
      let sy = y + row[x];
      sy = Math.min(H - 1.001, Math.max(0, sy));
      const y0 = sy | 0, f = sy - y0, i0 = (y0 * W + x) * 4, i1 = i0 + W * 4, o = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = d[i0 + c] * (1 - f) + d[i1 + c] * f + 0.5;
    }
  }
  return out;
}

/**
 * S11i – Nắn nhiều lượt: sau lượt 1, đo lại và nắn tiếp các ô còn lệch.
 * Mỗi lượt chỉ được giữ nếu điểm nửa dưới (max |góc| + cong) giảm; dừng khi
 * đạt chỉ tiêu (mọi ô ≤ 0,5°, cong ≤ 0,5°) hoặc hết số lượt.
 */
export function lineSkewRefine(
  d: Uint8ClampedArray, W: number, H: number, passes = 2, bands = 6,
): { data: Uint8ClampedArray; passes: number; score: number } {
  const gray = (p: Uint8ClampedArray) => {
    const g = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8;
    return g;
  };
  const from = bands >> 1;
  const score = (m: ReturnType<typeof lineSkewMap>) => {
    let a = 0;
    for (const c of m.cells) if (c.band >= from && c.ink > 50) a = Math.max(a, Math.abs(c.angle));
    return { a, curve: m.bottom.curve, s: a + m.bottom.curve };
  };
  let cur = d, m = lineSkewMap(gray(cur), W, H, bands), sc = score(m), used = 0;
  for (let p = 0; p < passes; p++) {
    if (sc.a <= 0.5 && sc.curve <= 0.5 && p > 0) break;
    const next = lineSkewCorrect(cur, W, H, m.cells, bands);
    const m2 = lineSkewMap(gray(next), W, H, bands), sc2 = score(m2);
    if (p > 0 && sc2.s >= sc.s) break;
    cur = next; m = m2; sc = sc2; used++;
  }
  return { data: cur === d ? new Uint8ClampedArray(d) : cur, passes: used, score: sc.s };
}

/**
 * S11k – Nắn nửa trên (tiêu đề/bảng gây nhiễu đo). Chỉ tin ô có mực ≥ minInk
 * và góc nhất quán với ô cùng bên ở dải kề (chênh ≤ 0,75°) hoặc với ô đối
 * diện cùng dải; ô lẻ loi bị bỏ. Giữ kết quả chỉ khi điểm nửa trên giảm và
 * nửa dưới không xấu đi. Nửa dưới không bị dịch (toBand = bands/2).
 */
export function lineSkewRefineTop(
  d: Uint8ClampedArray, W: number, H: number, passes = 2, bands = 6, minInk = 150,
): { data: Uint8ClampedArray; passes: number; score: number } {
  const gray = (p: Uint8ClampedArray) => {
    const g = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8;
    return g;
  };
  const h = bands >> 1;
  const trusted = (cells: SkewCell[]) => cells.map((c) => {
    if (c.band >= h || c.ink < minInk) return { ...c, ink: 0 };
    const nb = [cells[(c.band - 1) * 2 + c.side], cells[(c.band + 1) * 2 + c.side], cells[c.band * 2 + (1 - c.side)]]
      .filter((n) => n && n.ink >= minInk);
    return nb.some((n) => Math.abs(n.angle - c.angle) <= 0.75) ? c : { ...c, ink: 0 };
  });
  const score = (m: ReturnType<typeof lineSkewMap>) => {
    let a = 0, b = 0;
    for (const c of m.cells) if (c.ink > 50) { if (c.band < h) a = Math.max(a, Math.abs(c.angle)); else b = Math.max(b, Math.abs(c.angle)); }
    return { top: a + m.top.curve, bot: b + m.bottom.curve };
  };
  let cur = d, m = lineSkewMap(gray(cur), W, H, bands), sc = score(m), used = 0;
  for (let p = 0; p < passes; p++) {
    if (sc.top <= 0.5) break;
    const cells = trusted(m.cells);
    const next = lineSkewCorrect(cur, W, H, cells, bands, { fromBand: 0, toBand: h, minInk: 50 });
    const m2 = lineSkewMap(gray(next), W, H, bands), sc2 = score(m2);
    if (sc2.top >= sc.top || sc2.bot > sc.bot) break;
    cur = next; m = m2; sc = sc2; used++;
  }
  return { data: cur === d ? new Uint8ClampedArray(d) : cur, passes: used, score: sc.top };
}

/**
 * S11m – Nắn riêng một nửa (trái/phải) của dải trên khi lượt nắn cả hai nửa
 * bị chặn. Chọn bên lệch nhất ở dải 0–2, đo lại bên đó bằng bước 0,125°,
 * chỉ dịch theo góc bên đó (bên kia độ dốc 0). Giữ lượt khi |góc| tối đa bên
 * đó giảm, bên kia không xấu thêm > 0,25° và nửa dưới không xấu đi.
 */
/**
 * S11p – Ô dải trên có mực ít (lowInk ≤ ink < minInk) vẫn được tin khi góc
 * khớp (≤ 0,75°) một ô cùng bên ở dải kề có đủ mực. Ô không được tin → ink 0.
 */
export function trustTopCells(cells: SkewCell[], h: number, minInk = 150, lowInk = 60, tol = 0.75): SkewCell[] {
  return cells.map((c) => {
    if (c.band >= h) return c;
    if (c.ink >= minInk) return c;
    if (c.ink < lowInk) return { ...c, ink: 0 };
    const ok = cells.some((n) => n.side === c.side && n.band < h && Math.abs(n.band - c.band) === 1 && n.ink >= minInk && Math.abs(n.angle - c.angle) <= tol);
    return ok ? { ...c, ink: minInk } : { ...c, ink: 0 };
  });
}

export function lineSkewRefineTopSide(
  d: Uint8ClampedArray, W: number, H: number, passes = 2, bands = 6, minInk = 150, lowInk = 60,
): { data: Uint8ClampedArray; passes: number; side: 0 | 1 | -1; worst: number; log: string[] } {
  const log: string[] = [];
  const gray = (p: Uint8ClampedArray) => {
    const g = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8;
    return g;
  };
  const h = bands >> 1;
  const mx = (W * 0.06) | 0, my = (H * 0.04) | 0;
  const bh = ((H - 2 * my) / bands) | 0, half = ((W - 2 * mx) / 2) | 0;
  const fine = (g: Uint8Array): SkewCell[] => {
    const cells: SkewCell[] = [];
    for (let b = 0; b < bands; b++) for (const s of [0, 1] as const) {
      const x0 = mx + s * half, y0 = my + b * bh;
      const r = b < h ? regionAngle(g, W, x0, x0 + half, y0, y0 + bh, 3, 0.125) : { angle: 0, ink: 0 };
      cells.push({ band: b, side: s, ...r });
    }
    return cells;
  };
  const sideMax = (cells: SkewCell[], s: number) => {
    let a = 0;
    for (const c of trustTopCells(cells, h, minInk, lowInk)) if (c.band < h && c.side === s && c.ink >= minInk) a = Math.max(a, Math.abs(c.angle));
    return a;
  };
  const botMax = (p: Uint8ClampedArray) => {
    const m = lineSkewMap(gray(p), W, H, bands);
    let b = 0;
    for (const c of m.cells) if (c.band >= h && c.ink > 50) b = Math.max(b, Math.abs(c.angle));
    return b + m.bottom.curve;
  };
  let cur = d, cells = fine(gray(cur));
  const l0 = sideMax(cells, 0), r0 = sideMax(cells, 1);
  const side: 0 | 1 = r0 >= l0 ? 1 : 0;
  if (Math.max(l0, r0) <= 0.5) return { data: new Uint8ClampedArray(d), passes: 0, side: -1, worst: Math.max(l0, r0), log: [`ok l=${l0} r=${r0} cells=${cells.filter((c) => c.band < h).map((c) => `${c.angle}/${c.ink}`).join(',')}`] };
  let worst = sideMax(cells, side), other = sideMax(cells, 1 - side), bot = botMax(cur), used = 0;
  for (let p = 0; p < passes && worst > 0.5; p++) {
    // S11q: lượt đủ góc có thể vọt quá (…555: 1,625 → 2,375) → thử lại với ½ góc
    let kept = false;
    for (const k of [1, 0.5]) {
      const only = trustTopCells(cells, h, minInk, lowInk).map((c) => (c.side === side && c.band < h && c.ink >= minInk ? { ...c, angle: c.angle * k } : { ...c, ink: 0 }));
      const next = lineSkewCorrect(cur, W, H, only, bands, { fromBand: 0, toBand: h, minInk: 50, minDeg: 0.0625 });
      const c2 = fine(gray(next));
      const w2 = sideMax(c2, side), o2 = sideMax(c2, 1 - side), b2 = botMax(next);
      log.push(`p${p} k=${k} side=${side} worst ${worst}->${w2} other ${other}->${o2} bot ${bot}->${b2} cells=${cells.filter((c) => c.band < h).map((c) => `${c.angle}/${c.ink}`).join(',')} after=${c2.filter((c) => c.band < h).map((c) => `${c.angle}/${c.ink}`).join(',')}`);
      if (w2 >= worst || o2 > other + 0.25 || b2 > bot) continue;
      cur = next; cells = c2; worst = w2; other = o2; bot = b2; used++; kept = true; break;
    }
    if (!kept) break;
  }
  return { data: cur === d ? new Uint8ClampedArray(d) : cur, passes: used, side, worst, log };
}

/**
 * S11r – Nắn riêng ô dải 0 (trên cùng) lệch nhất, lặp tối đa `passes` lượt.
 * Chỉ dịch theo góc ô đó (các ô khác độ dốc 0) nên ô dải 1 ít mực không kéo
 * dải 0 ngược chiều. Giữ lượt khi |góc| ô đó giảm, ô bên kia và dải 1–2 không
 * xấu thêm > 0,25°, nửa dưới không xấu đi.
 */
export function lineSkewRefineBand0(
  d: Uint8ClampedArray, W: number, H: number, passes = 3, bands = 6, minInk = 150,
): { data: Uint8ClampedArray; passes: number; side: 0 | 1 | -1; angle: number } {
  const gray = (p: Uint8ClampedArray) => {
    const g = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8;
    return g;
  };
  const h = bands >> 1;
  let m = lineSkewMap(gray(d), W, H, bands);
  const c0 = m.cells[0], c1 = m.cells[1];
  const cand = [c0, c1].filter((c) => c.ink >= minInk && Math.abs(c.angle) > 0.5);
  if (!cand.length) return { data: new Uint8ClampedArray(d), passes: 0, side: -1, angle: 0 };
  const side = cand.sort((a, b) => Math.abs(b.angle) - Math.abs(a.angle))[0].side;
  const others = (mm: typeof m) => mm.cells.filter((c) => c.ink >= minInk && !(c.band === 0 && c.side === side) && c.band < h).map((c) => Math.abs(c.angle));
  const bot = (mm: typeof m) => Math.max(0, ...mm.cells.filter((c) => c.band >= h && c.ink > 50).map((c) => Math.abs(c.angle))) + mm.bottom.curve;
  let cur = d, used = 0;
  for (let p = 0; p < passes; p++) {
    const a = m.cells[side].angle;
    if (Math.abs(a) <= 0.5) break;
    const cells = m.cells.map((c, i) => (i === side ? { ...c, ink: minInk } : { ...c, ink: 0 }));
    const next = lineSkewCorrect(cur, W, H, cells, bands, { fromBand: 0, toBand: h, minInk: 50 });
    const m2 = lineSkewMap(gray(next), W, H, bands);
    const o1 = others(m), o2 = others(m2);
    const worse = o2.some((v, i) => v > (o1[i] ?? v) + 0.25) || bot(m2) > bot(m) || m2.cells[side].ink < 50;
    if (Math.abs(m2.cells[side].angle) >= Math.abs(a) || worse) break;
    cur = next; m = m2; used++;
  }
  return { data: cur === d ? new Uint8ClampedArray(d) : cur, passes: used, side, angle: m.cells[side].angle };
}

/**
 * S11s – Nắn ô dải 1 (ít mực được, ≥ lowInk) còn lệch, bù dải 0 cùng bên
 * trong cùng lượt. Nắn riêng dải 1 kéo dải 0 lệch theo (nội suy giữa tâm
 * dải) nên trước đây lượt luôn bị bỏ. Thử các mức bù dải 0 = a0 + t·a1
 * (t = 0, −0,25, −0,5, −0,75), chọn lượt làm |góc dải 1| nhỏ nhất mà dải 0
 * không vượt max(0,5°, |a0|), ô khác không xấu thêm > 0,25°, nửa dưới không xấu đi.
 */
export function lineSkewRefineBand1(
  d: Uint8ClampedArray, W: number, H: number, passes = 2, bands = 6, minInk = 150, lowInk = 60,
): { data: Uint8ClampedArray; passes: number; side: 0 | 1 | -1; angle: number; log: string[] } {
  const gray = (p: Uint8ClampedArray) => {
    const g = new Uint8Array(W * H);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (p[i] * 77 + p[i + 1] * 150 + p[i + 2] * 29) >> 8;
    return g;
  };
  const h = bands >> 1, log: string[] = [];
  let m = lineSkewMap(gray(d), W, H, bands);
  const cand = [m.cells[2], m.cells[3]].filter((c) => c.ink >= lowInk && Math.abs(c.angle) > 0.5);
  if (!cand.length) return { data: new Uint8ClampedArray(d), passes: 0, side: -1, angle: 0, log: ["ok"] };
  const side = cand.sort((a, b) => Math.abs(b.angle) - Math.abs(a.angle))[0].side;
  const i0 = side, i1 = 2 + side;
  const others = (mm: typeof m) => mm.cells.map((c, i) => (i !== i0 && i !== i1 && c.band < h && c.ink >= minInk ? Math.abs(c.angle) : 0));
  const bot = (mm: typeof m) => Math.max(0, ...mm.cells.filter((c) => c.band >= h && c.ink > 50).map((c) => Math.abs(c.angle))) + mm.bottom.curve;
  let cur = d, used = 0;
  for (let p = 0; p < passes; p++) {
    const a1 = m.cells[i1].angle, a0 = m.cells[i0].angle;
    if (Math.abs(a1) <= 0.5) break;
    const lim0 = Math.max(0.5, Math.abs(a0)), o1 = others(m), b1 = bot(m);
    let best: { data: Uint8ClampedArray; m: typeof m; a: number } | null = null;
    for (const t of [0, -0.25, -0.5, -0.75]) {
      const cells = m.cells.map((c, i) => (i === i1 ? { ...c, ink: minInk } : i === i0 ? { ...c, angle: a0 + t * a1, ink: minInk } : { ...c, ink: 0 }));
      const next = lineSkewCorrect(cur, W, H, cells, bands, { fromBand: 0, toBand: h, minInk: 50, minDeg: 0.0625 });
      const m2 = lineSkewMap(gray(next), W, H, bands), o2 = others(m2);
      const n1 = Math.abs(m2.cells[i1].angle), n0 = Math.abs(m2.cells[i0].angle);
      const ok = n1 < Math.abs(a1) && n0 <= lim0 && !o2.some((v, i) => v > o1[i] + 0.25) && bot(m2) <= b1 && m2.cells[i1].ink >= 50;
      log.push(`p${p} t=${t} side=${side} d1 ${a1}->${m2.cells[i1].angle} d0 ${a0}->${m2.cells[i0].angle} ${ok ? "giữ" : "bỏ"}`);
      if (ok && (!best || n1 < Math.abs(best.a))) best = { data: next, m: m2, a: m2.cells[i1].angle };
    }
    if (!best) break;
    cur = best.data; m = best.m; used++;
  }
  return { data: cur === d ? new Uint8ClampedArray(d) : cur, passes: used, side, angle: m.cells[i1].angle, log };
}
