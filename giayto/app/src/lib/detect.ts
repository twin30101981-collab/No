/**
 * Paper-sheet detection: blur → Sobel edges → Hough lines → best convex quad,
 * scored by edge support along each side and paper/background contrast.
 * Pure TypeScript, runs on a downscaled copy (~360 px) so it is fast enough per camera frame.
 */
import type { Quad } from "./db";

export type Detection = { quad: Quad; score: number; area: number };

type Line = { rho: number; theta: number; votes: number };
type Pt = [number, number];

/** V7: lấy mẫu RGBA thu nhỏ (luồng chính, rẻ) — phần dò nặng chạy trong Worker. */
export function sampleRgba(src: CanvasImageSource, w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data; c.width = 0; return d;
}
export function rgbaToGray(d: Uint8ClampedArray, n: number) {
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  return g;
}
/** V7: kích thước bản dò theo cạnh dài size. */
export function detectSize(sw: number, sh: number, size: number) {
  const s = size / Math.max(sw, sh); return { w: Math.max(8, Math.round(sw * s)), h: Math.max(8, Math.round(sh * s)) };
}
/** V7: dò từ RGBA (dùng chung cho Worker và luồng chính → kết quả giống hệt). */
export function detectFromRgba(d: Uint8ClampedArray, w: number, h: number, robust: boolean): Detection | null {
  return detectPaperGray(rgbaToGray(d, w * h), w, h, robust);
}

function boxBlur(g: Float32Array, w: number, h: number, r: number) {
  const t = new Float32Array(g.length), o = new Float32Array(g.length);
  for (let y = 0; y < h; y++) { let s = 0; const row = y * w;
    for (let x = -r; x <= r; x++) s += g[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { t[row + x] = s / (2 * r + 1); s += g[row + Math.min(w - 1, x + r + 1)] - g[row + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0;
    for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { o[y * w + x] = s / (2 * r + 1); s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}

const NT = 120; // theta bins (1.5°)
const COS = Array.from({ length: NT }, (_, i) => Math.cos((i * Math.PI) / NT));
const SIN = Array.from({ length: NT }, (_, i) => Math.sin((i * Math.PI) / NT));

export function detectPaper(src: CanvasImageSource, sw: number, sh: number, size = 360): Detection | null {
  if (!sw || !sh) return null;
  const { w, h } = detectSize(sw, sh, size);
  return detectFromRgba(sampleRgba(src, w, h), w, h, size >= 500);
}

/** Kéo giãn tương phản theo phân vị 1–99 % (ảnh tối, thiếu sáng, chụp qua kính). */
export function stretchGray(g: Float32Array) {
  const hist = new Uint32Array(256); for (let i = 0; i < g.length; i++) hist[Math.max(0, Math.min(255, g[i] | 0))]++;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= g.length * 0.01) { lo = v; break; } }
  acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= g.length * 0.01) { hi = v; break; } }
  const r = Math.max(20, hi - lo), o = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) o[i] = Math.max(0, Math.min(255, ((g[i] - lo) / r) * 255));
  return o;
}

/** Bù sáng không đều (bóng tay/đèn): chia cho nền mờ rộng, giữ biên giấy–nền rõ ở mọi vùng. */
export function evenLight(g: Float32Array, w: number, h: number) {
  const r = Math.max(4, Math.round(Math.max(w, h) / 12));
  const bg = boxBlur(boxBlur(g, w, h, r), w, h, r);
  let mean = 0; for (let i = 0; i < g.length; i++) mean += g[i]; mean /= g.length || 1;
  const o = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) o[i] = Math.max(0, Math.min(255, (g[i] / Math.max(8, bg[i])) * mean));
  return stretchGray(o);
}

/** Core detector on a grayscale buffer (w×h, 0..255); pure, so it runs in tests and the crop benchmark. */
export function detectPaperGray(raw: Float32Array, w: number, h: number, robust = false): Detection | null {
  const base = detectCore(raw, w, h);
  if (!robust || (base && base.score >= 0.85)) return base;
  // ảnh chụp thật (thiếu sáng, bóng đổ, chữ mờ): thử thêm bản kéo giãn và bản bù sáng, giữ kết quả điểm cao nhất
  let best = base;
  for (const g of [stretchGray(raw), evenLight(raw, w, h)]) {
    const d = detectCore(g, w, h);
    if (d && (!best || d.score > best.score + 0.02)) best = d;
  }
  return best;
}

function detectCore(raw: Float32Array, w: number, h: number): Detection | null {
  const g = boxBlur(boxBlur(raw, w, h, 1), w, h, 1);

  // Sobel
  const mag = new Float32Array(w * h), ang = new Float32Array(w * h);
  const hist = new Uint32Array(256);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1] - g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1];
    const gy = g[i + w - 1] + 2 * g[i + w] + g[i + w + 1] - g[i - w - 1] - 2 * g[i - w] - g[i - w + 1];
    const m = Math.hypot(gx, gy); mag[i] = m; ang[i] = Math.atan2(gy, gx);
    hist[Math.min(255, m / 4) | 0]++;
  }
  // keep strongest ~7% edge pixels
  let acc = 0, thrBin = 255; const target = w * h * 0.07;
  for (let b = 255; b >= 0; b--) { acc += hist[b]; if (acc >= target) { thrBin = b; break; } }
  const thr = Math.max(40, thrBin * 4);

  // Hough with gradient-direction voting window
  const diag = Math.ceil(Math.hypot(w, h)); const NR = diag * 2 + 1;
  const H = new Float32Array(NT * NR);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; const m = mag[i]; if (m < thr) continue;
    let a = ang[i]; if (a < 0) a += Math.PI; const tc = Math.round((a / Math.PI) * NT);
    for (let k = -6; k <= 6; k++) {
      const t = (tc + k + NT) % NT; const rho = Math.round(x * COS[t] + y * SIN[t]) + diag;
      H[t * NR + rho] += 1;
    }
  }
  // peaks with non-max suppression
  const lines: Line[] = [];
  const cand: number[] = [];
  const minVotes = Math.min(w, h) * 0.18;
  for (let i = 0; i < H.length; i++) if (H[i] >= minVotes) cand.push(i);
  cand.sort((a, b) => H[b] - H[a]);
  for (const i of cand) {
    const t = Math.floor(i / NR), r = (i % NR) - diag;
    const th = (t * Math.PI) / NT;
    if (lines.some((l) => { let dt = Math.abs(l.theta - th); dt = Math.min(dt, Math.PI - dt);
      const rr = Math.abs(dt) > Math.PI / 2 - 0.2 ? Math.abs(l.rho + r) : Math.abs(l.rho - r);
      return dt < 0.14 && rr < Math.min(w, h) * 0.06; })) continue;
    lines.push({ rho: r, theta: th, votes: H[i] });
    if (lines.length >= 18) break;
  }

  // split into roughly horizontal (normal ~ vertical) and vertical lines
  // image borders act as fallback sides when the sheet runs off the frame
  const hor = [...lines.filter((l) => Math.abs(l.theta - Math.PI / 2) < Math.PI / 4).slice(0, 8), { rho: 1, theta: Math.PI / 2, votes: 0 }, { rho: h - 2, theta: Math.PI / 2, votes: 0 }];
  const ver = [...lines.filter((l) => Math.abs(l.theta - Math.PI / 2) >= Math.PI / 4).slice(0, 8), { rho: 1, theta: 0, votes: 0 }, { rho: w - 2, theta: 0, votes: 0 }];

  const inter = (a: Line, b: Line): Pt | null => {
    const c1 = Math.cos(a.theta), s1 = Math.sin(a.theta), c2 = Math.cos(b.theta), s2 = Math.sin(b.theta);
    const det = c1 * s2 - s1 * c2; if (Math.abs(det) < 1e-6) return null;
    return [(a.rho * s2 - b.rho * s1) / det, (c1 * b.rho - c2 * a.rho) / det];
  };
  const onBorder = (p: Pt, q: Pt) => (p[0] < 3 && q[0] < 3) || (p[1] < 3 && q[1] < 3) || (p[0] > w - 4 && q[0] > w - 4) || (p[1] > h - 4 && q[1] > h - 4);
  const edgeSupport = (p: Pt, q: Pt) => {
    if (onBorder(p, q)) return 0.35;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.max(8, Math.round(len / 2)); let hit = 0, cnt = 0;
    for (let k = 1; k < n; k++) {
      const x = p[0] + ((q[0] - p[0]) * k) / n, y = p[1] + ((q[1] - p[1]) * k) / n;
      const xi = Math.round(x), yi = Math.round(y); if (xi < 1 || yi < 1 || xi >= w - 1 || yi >= h - 1) continue; cnt++;
      let best = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) best = Math.max(best, mag[(yi + dy) * w + xi + dx]);
      if (best >= thr * 0.6) hit++;
    }
    return cnt ? hit / n : 0;
  };
  const brightness = (pts: Pt[], inside: boolean) => {
    // sample points shifted inward/outward from each side midpoint region
    const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    let s = 0, n = 0;
    for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4];
      for (let k = 1; k < 8; k++) { const x = a[0] + ((b[0] - a[0]) * k) / 8, y = a[1] + ((b[1] - a[1]) * k) / 8;
        const dx = cx - x, dy = cy - y, dl = Math.hypot(dx, dy) || 1; const off = (inside ? 1 : -1) * Math.min(w, h) * 0.04;
        const xi = Math.round(x + (dx / dl) * off), yi = Math.round(y + (dy / dl) * off);
        if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue; s += g[yi * w + xi]; n++; } }
    return n ? s / n : -1;
  };

  // a wrong side (e.g. keyboard edge above the sheet) leaves a long dark band *inside* the quad,
  // parallel to that side. Scan bands 3–25 % inward and penalise any that is far darker than the centre.
  const innerDark = (pts: Pt[]) => {
    const at = (u: number, v: number) => { // bilinear param inside quad
      const x = (1 - v) * ((1 - u) * pts[0][0] + u * pts[1][0]) + v * ((1 - u) * pts[3][0] + u * pts[2][0]);
      const y = (1 - v) * ((1 - u) * pts[0][1] + u * pts[1][1]) + v * ((1 - u) * pts[3][1] + u * pts[2][1]);
      const xi = Math.round(x), yi = Math.round(y); return xi < 0 || yi < 0 || xi >= w || yi >= h ? -1 : g[yi * w + xi]; };
    const band = (fixed: "u" | "v", t: number) => { let s = 0, n = 0; for (let k = 2; k < 30; k++) { const o = k / 31; const val = fixed === "v" ? at(o, t) : at(t, o); if (val >= 0) { s += val; n++; } } return n ? s / n : 255; };
    let centre = 0; for (const t of [0.4, 0.5, 0.6]) centre += band("v", t) / 3;
    let worst = 0;
    for (let t = 0.03; t <= 0.25; t += 0.02) for (const [f, tt] of [["v", t], ["v", 1 - t], ["u", t], ["u", 1 - t]] as const) {
      const r = band(f, tt) / Math.max(1, centre); if (r < 0.55) worst = Math.max(worst, 0.55 - r); }
    return worst;
  };

  // paper margins are mostly blank: measure edge clutter just inside each side
  const clutter = (pts: Pt[]) => {
    const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    let worst = 0;
    for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; let hit = 0, n = 0;
      for (let k = 1; k < 16; k++) { const x = a[0] + ((b[0] - a[0]) * k) / 16, y = a[1] + ((b[1] - a[1]) * k) / 16;
        const dx = cx - x, dy = cy - y, dl = Math.hypot(dx, dy) || 1;
        for (const f of [0.03, 0.05, 0.07]) { const off = Math.min(w, h) * f;
          const xi = Math.round(x + (dx / dl) * off), yi = Math.round(y + (dy / dl) * off);
          if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue; n++; if (mag[yi * w + xi] >= thr * 0.6) hit++; } }
      worst = Math.max(worst, n ? hit / n : 0); }
    return worst;
  };
  // a real sheet edge has paper on one side and background on the other; a text line or table rule
  // inside the page has paper on both sides. Measure contrast per side and keep the weakest.
  const sideContrast = (pts: Pt[]) => {
    const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    let worst = 1;
    for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; if (onBorder(a, b)) continue;
      const vin: number[] = [], vout: number[] = [];
      for (let k = 1; k < 12; k++) { const x = a[0] + ((b[0] - a[0]) * k) / 12, y = a[1] + ((b[1] - a[1]) * k) / 12;
        const dx = cx - x, dy = cy - y, dl = Math.hypot(dx, dy) || 1; const off = Math.min(w, h) * 0.025;
        const xi = Math.round(x + (dx / dl) * off), yi = Math.round(y + (dy / dl) * off);
        const xo = Math.round(x - (dx / dl) * off), yo = Math.round(y - (dy / dl) * off);
        if (xi < 0 || yi < 0 || xi >= w || yi >= h || xo < 0 || yo < 0 || xo >= w || yo >= h) continue;
        vin.push(g[yi * w + xi]); vout.push(g[yo * w + xo]); }
      if (vin.length < 4) continue;
      // 70th percentile of inside−outside: tolerates a neighbouring sheet along part of a side
      const raw = vin.map((v, k) => v - vout[k]), diff = [...raw].sort((p, q) => p - q);
      let c = diff[Math.floor(diff.length * 0.7)] / 255;
      // S10e: tờ kế bên cùng màu giấy (sách mở, giấy chồng) — sáng tối lệch rõ hai phía và cạnh chạy tới nền tối ở góc;
      // dòng kẻ trong trang thì hai phía gần bằng nhau. Coi là mép thật với tương phản tối thiểu.
      if (c < 0.08 && neighbourEdge(raw)) c = 0.08;
      worst = Math.min(worst, c); }
    return worst;
  };
  const neighbourEdge = (raw: number[]) => {
    const n = raw.length, end = Math.max(raw[0], raw[n - 1]), mid = raw.slice(1, n - 1);
    // phần giữa cạnh: tờ kế sáng hơn hoặc tối hơn đều đặn (không có nét chữ đậm); một đầu chạm nền tối
    const brighter = mid.filter((v) => v <= -3 && v >= -45).length, flat = mid.filter((v) => Math.abs(v) < 40).length;
    return end >= 60 && flat >= mid.length * 0.85 && brighter >= mid.length * 0.5;
  };
  const isNeighbour = (a: Pt, b: Pt, cx: number, cy: number) => {
    const d: number[] = [];
    for (let k = 1; k < 12; k++) { const x = a[0] + ((b[0] - a[0]) * k) / 12, y = a[1] + ((b[1] - a[1]) * k) / 12;
      const dx = cx - x, dy = cy - y, dl = Math.hypot(dx, dy) || 1; const off = Math.min(w, h) * 0.025;
      const xi = Math.round(x + (dx / dl) * off), yi = Math.round(y + (dy / dl) * off), xo = Math.round(x - (dx / dl) * off), yo = Math.round(y - (dy / dl) * off);
      if (xi < 0 || yi < 0 || xi >= w || yi >= h || xo < 0 || yo < 0 || xo >= w || yo >= h) continue; d.push(g[yi * w + xi] - g[yo * w + xo]); }
    return d.length >= 4 && neighbourEdge(d);
  };
  // a side placed on an inner rule (table bottom, signature line) leaves paper *outside* the quad:
  // the band beyond that side is as bright as the band just inside it. Return the worst side's share.
  const spill = (pts: Pt[]) => {
    const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4, cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    const centre = g[Math.round(cy) * w + Math.round(cx)] ?? 0;
    let worst = 0;
    for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; if (onBorder(a, b)) continue; let hit = 0, n = 0;
      for (let k = 1; k < 12; k++) { const x = a[0] + ((b[0] - a[0]) * k) / 12, y = a[1] + ((b[1] - a[1]) * k) / 12;
        const dx = cx - x, dy = cy - y, dl = Math.hypot(dx, dy) || 1;
        const xi = Math.round(x + (dx / dl) * Math.min(w, h) * 0.04), yi = Math.round(y + (dy / dl) * Math.min(w, h) * 0.04);
        if (xi < 0 || yi < 0 || xi >= w || yi >= h) continue; const vin = g[yi * w + xi]; if (vin < centre * 0.75) continue;
        for (const f of [0.04, 0.08]) { const off = Math.min(w, h) * f;
          const xo = Math.round(x - (dx / dl) * off), yo = Math.round(y - (dy / dl) * off);
          if (xo < 0 || yo < 0 || xo >= w || yo >= h) continue; n++; if (g[yo * w + xo] >= vin - 15) hit++; } }
      if (n >= 6 && !isNeighbour(a, b, cx, cy)) worst = Math.max(worst, hit / n); }
    return worst;
  };
  let best: Detection | null = null;
  const m = Math.max(w, h) * 0.04;
  for (let a = 0; a < hor.length; a++) for (let b = a + 1; b < hor.length; b++)
    for (let c = 0; c < ver.length; c++) for (let d = c + 1; d < ver.length; d++) {
      let top = hor[a], bot = hor[b];
      let left = ver[c], right = ver[d];
      const midY = (l: Line) => { const p = inter(l, { rho: w / 2, theta: 0, votes: 0 }); return p ? p[1] : 0; };
      const midX = (l: Line) => { const p = inter(l, { rho: h / 2, theta: Math.PI / 2, votes: 0 }); return p ? p[0] : 0; };
      if (midY(top) > midY(bot)) [top, bot] = [bot, top];
      if (midX(left) > midX(right)) [left, right] = [right, left];
      const tl = inter(top, left), tr = inter(top, right), br = inter(bot, right), bl = inter(bot, left);
      if (!tl || !tr || !br || !bl) continue;
      const pts = [tl, tr, br, bl];
      if (pts.some(([x, y]) => x < -m || y < -m || x > w + m || y > h + m)) continue;
      // convexity
      let sign = 0, convex = true;
      for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4], r = pts[(i + 2) % 4];
        const cr = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
        if (!sign) sign = Math.sign(cr); else if (Math.sign(cr) !== sign) { convex = false; break; } }
      if (!convex) continue;
      // users frame the sheet roughly centred: a quad that misses the middle of the frame is an inner
      // line (signature rule, table border) or a neighbouring sheet, never the document itself
      const inside = (x: number, y: number) => { for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4];
        if (Math.sign((q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])) === -sign) return false; } return true; };
      if (![[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]].every(([u, v]) => inside(u * w, v * h))) continue;
      let area = 0; for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; area += p[0] * q[1] - q[0] * p[1]; }
      area = Math.abs(area) / 2 / (w * h);
      if (area < 0.05 || area > 0.99) continue;
      // corner angles close to 90°
      let angPen = 0;
      for (let i = 0; i < 4; i++) { const p = pts[(i + 3) % 4], q = pts[i], r = pts[(i + 1) % 4];
        const v1 = [p[0] - q[0], p[1] - q[1]], v2 = [r[0] - q[0], r[1] - q[1]];
        const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]) || 1);
        angPen += Math.abs(cos); }
      angPen /= 4; if (angPen > 0.55) continue;
      const sup = [0, 1, 2, 3].map((i) => edgeSupport(pts[i], pts[(i + 1) % 4]));
      const minSup = Math.min(...sup), meanSup = sup.reduce((x, y) => x + y, 0) / 4;
      const borders = [0, 1, 2, 3].filter((i) => onBorder(pts[i], pts[(i + 1) % 4])).length;
      if (minSup < 0.2 || borders > 3 || (borders === 3 && Math.max(...sup.filter((v) => v !== 0.35)) < 0.6)) continue;
      // sheets, cards and receipts stay under ~1:3.5; thinner quads are a stripe of something larger
      const sideLen = [0, 1, 2, 3].map((i) => Math.hypot(pts[(i + 1) % 4][0] - pts[i][0], pts[(i + 1) % 4][1] - pts[i][1]));
      if ((sideLen[0] + sideLen[2]) / (sideLen[1] + sideLen[3] || 1) > 3.5 || (sideLen[1] + sideLen[3]) / (sideLen[0] + sideLen[2] || 1) > 3.5) continue;
      const bin = brightness(pts, true), bout = brightness(pts, false);
      const contrast = bout < 0 ? 0.15 : Math.max(-0.2, Math.min(0.4, (bin - bout) / 255));
      const score = meanSup * 0.55 + minSup * 0.25 + contrast * 0.5 + Math.sqrt(area) * 0.25 - angPen * 0.35 - borders * 0.06 - (borders === 3 ? 0.05 : 0) - clutter(pts) * 0.9 - innerDark(pts) * 1.6
        + Math.min(0.08, sideContrast(pts)) * 1.5 - (sideContrast(pts) < 0.04 ? 0.35 : 0)
        - Math.max(0, spill(pts) - 0.35) * 0.6;
      if (!best || score > best.score) {
        const clamp = (v: number) => Math.min(1, Math.max(0, v));
        best = { quad: pts.map(([x, y]) => [clamp(x / w), clamp(y / h)]) as Quad, score, area };
      }
    }
  return best;
}

/** Projective aspect ratio (width / height) of a rectangle seen as quad, Zhang & He method. */
export function quadAspect(quad: Quad, W: number, H: number) {
  const p = quad.map(([x, y]) => [x * W - W / 2, y * H - H / 2, 1]);
  const m1 = p[0], m2 = p[1], m3 = p[3], m4 = p[2]; // TL, TR, BL, BR
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const d = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const naive = ((d(m1, m2) + d(m3, m4)) / 2) / ((d(m1, m3) + d(m2, m4)) / 2);
  const k2 = dot(cross(m1, m4), m3) / dot(cross(m2, m4), m3);
  const k3 = dot(cross(m1, m4), m2) / dot(cross(m3, m4), m2);
  const n2 = m2.map((v, i) => k2 * v - m1[i]), n3 = m3.map((v, i) => k3 * v - m1[i]);
  if (Math.abs(n2[2]) < 1e-9 || Math.abs(n3[2]) < 1e-9) return naive; // nearly fronto-parallel
  const f2 = -(n2[0] * n3[0] + n2[1] * n3[1]) / (n2[2] * n3[2]);
  if (!(f2 > 0) || !isFinite(f2)) return naive;
  const f = Math.sqrt(f2); if (f < Math.max(W, H) * 0.4 || f > Math.max(W, H) * 5) return naive;
  const r = Math.sqrt((n2[0] ** 2 + n2[1] ** 2) / f2 + n2[2] ** 2) / Math.sqrt((n3[0] ** 2 + n3[1] ** 2) / f2 + n3[2] ** 2);
  return isFinite(r) && r > 0.1 && r < 10 ? r : naive;
}

export type Paper = "auto" | "free" | "a4" | "letter" | "legal" | "id";
export const PAPER_LABEL: Record<Paper, string> = { auto: "Tự nhận", free: "Tự do", a4: "A4 / A5", letter: "Letter", legal: "Legal", id: "Thẻ" };
const PAPER_RATIO: Record<Exclude<Paper, "auto" | "free">, number> = { a4: 297 / 210, letter: 11 / 8.5, legal: 14 / 8.5, id: 85.6 / 54 };

/** Snap a width/height ratio to a standard paper ratio (keeps orientation). */
export function snapAspect(r: number, paper: Paper = "auto") {
  if (paper === "free") return r;
  const portrait = r < 1; const long = portrait ? 1 / r : r;
  let target = long;
  if (paper !== "auto") target = PAPER_RATIO[paper];
  else { let bestD = 0.06; for (const v of Object.values(PAPER_RATIO)) { const dd = Math.abs(long - v) / v; if (dd < bestD) { bestD = dd; target = v; } } }
  return portrait ? 1 / target : target;
}

/** B09: phương sai Laplacian (độ nét) tính thẳng trên RGBA — chạy được trong Worker, không cần canvas. */
export function sharpnessRgba(d: Uint8ClampedArray, w: number, h: number, quad?: Quad | null) {
  const g = rgbaToGray(d, w * h);
  let x0 = 1, y0 = 1, x1 = w - 1, y1 = h - 1;
  if (quad) { const xs = quad.map((p) => p[0] * w), ys = quad.map((p) => p[1] * h);
    x0 = Math.max(1, Math.round(Math.min(...xs) + w * 0.03)); x1 = Math.min(w - 1, Math.round(Math.max(...xs) - w * 0.03));
    y0 = Math.max(1, Math.round(Math.min(...ys) + h * 0.03)); y1 = Math.min(h - 1, Math.round(Math.max(...ys) - h * 0.03)); }
  let sum = 0, sq = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * w + x; const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
    sum += l; sq += l * l; n++; }
  return n ? sq / n - (sum / n) ** 2 : 0;
}

/** B09: tỉ lệ điểm cháy sáng (lóa) trong vùng giấy, 0..1 — trên RGBA, chạy được trong Worker. */
export function glareRgba(d: Uint8ClampedArray, w: number, h: number, quad?: Quad | null) {
  let x0 = 0, y0 = 0, x1 = w, y1 = h;
  if (quad) { const xs = quad.map((p) => p[0] * w), ys = quad.map((p) => p[1] * h);
    x0 = Math.max(0, Math.round(Math.min(...xs))); x1 = Math.min(w, Math.round(Math.max(...xs)));
    y0 = Math.max(0, Math.round(Math.min(...ys))); y1 = Math.min(h, Math.round(Math.max(...ys))); }
  let hot = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; n++;
    if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) hot++; }
  return n ? hot / n : 0;
}
