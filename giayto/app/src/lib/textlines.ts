// G4-04: dò dòng chữ trên trang (ảnh xám) để biết trang cong thế nào. Thuần, không phụ thuộc trình duyệt.
// Cách làm: chia ảnh thành dải dọc, tìm đỉnh mật độ mực theo hàng ở mỗi dải, rồi nối đỉnh gần nhau giữa các dải.
export type TextLine = { pts: [number, number][]; cover: number }; // pts chuẩn hóa 0..1, cover = tỉ lệ dải có điểm

export type LineOpts = { strips?: number; minCover?: number };

function inkMask(g: ArrayLike<number>, W: number, H: number) {
  let sum = 0; for (let i = 0; i < W * H; i++) sum += g[i];
  const thr = (sum / (W * H)) * 0.72;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = g[i] < thr ? 1 : 0;
  return m;
}

function peaks(p: Float32Array, r: number, min: number) {
  const out: number[] = [];
  for (let y = 0; y < p.length; y++) {
    if (p[y] < min) continue;
    let top = true;
    for (let k = 1; k <= r && top; k++) { if ((y - k >= 0 && p[y - k] > p[y]) || (y + k < p.length && p[y + k] >= p[y])) top = false; }
    if (top) out.push(y);
  }
  return out;
}

const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

export function detectTextLines(gray: ArrayLike<number>, W: number, H: number, o: LineOpts = {}): TextLine[] {
  const S = o.strips ?? 24; const minCover = o.minCover ?? 0.4;
  const m = inkMask(gray, W, H);
  const sw = W / S; const r = Math.max(1, Math.round(H / 160));
  const strips: number[][] = [];
  for (let s = 0; s < S; s++) {
    const x0 = Math.floor(s * sw), x1 = Math.floor((s + 1) * sw);
    const raw = new Float32Array(H);
    for (let y = 0; y < H; y++) { let c = 0; for (let x = x0; x < x1; x++) c += m[y * W + x]; raw[y] = c; }
    const p = new Float32Array(H); // làm mượt hộp
    for (let y = 0; y < H; y++) { let c = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) { c += raw[yy]; n++; } } p[y] = c / n; }
    strips.push(peaks(p, r * 2, (x1 - x0) * 0.08));
  }
  const gaps: number[] = [];
  for (const pk of strips) for (let i = 1; i < pk.length; i++) gaps.push(pk[i] - pk[i - 1]);
  const spacing = median(gaps) || H / 20;
  const tol = spacing * 0.45;
  const used = strips.map((pk) => new Array<boolean>(pk.length).fill(false));
  const lines: TextLine[] = [];
  const order = Array.from({ length: S }, (_, i) => i).sort((a, b) => Math.abs(a - S / 2) - Math.abs(b - S / 2));
  for (const s0 of order) {
    strips[s0].forEach((y0, j0) => {
      if (used[s0][j0]) return;
      used[s0][j0] = true;
      const pts = new Map<number, number>([[s0, y0]]);
      for (const dir of [-1, 1]) {
        let y = y0, dy = 0, miss = 0;
        for (let s = s0 + dir; s >= 0 && s < S && miss < 2; s += dir) {
          const want = y + dy; let best = -1, bd = tol;
          strips[s].forEach((yy, j) => { const d = Math.abs(yy - want); if (!used[s][j] && d <= bd) { bd = d; best = j; } });
          if (best < 0) { miss++; continue; }
          used[s][best] = true; const ny = strips[s][best];
          dy = (ny - y) / (miss + 1) * 0.5 + dy * 0.5; y = ny; miss = 0; pts.set(s, ny);
        }
      }
      const cover = pts.size / S;
      if (cover >= minCover) lines.push({ cover, pts: [...pts.entries()].sort((a, b) => a[0] - b[0]).map(([s, yy]) => [((s + 0.5) * sw) / W, yy / H]) });
    });
  }
  return lines.sort((a, b) => a.pts[0][1] - b.pts[0][1]);
}

/** Độ cong trung bình (độ võng giữa so với đường nối hai đầu, chuẩn hóa theo chiều cao). Dùng để quyết định có cần nắn. */
export function lineBend(l: TextLine) {
  const a = l.pts[0], b = l.pts[l.pts.length - 1];
  let worst = 0;
  for (const [x, y] of l.pts) { const t = (x - a[0]) / (b[0] - a[0] || 1); worst = Math.max(worst, Math.abs(y - (a[1] + t * (b[1] - a[1])))); }
  return worst;
}
