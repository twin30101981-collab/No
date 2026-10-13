/**
 * S15l — dò "chồng giấy": một cạnh của khung có thêm một mép song song gần đó (tờ lót lòi ra).
 * Thuần (ảnh xám + khung chuẩn hoá 0–1). Dùng để hạ "chắc chắn" của bộ dò trên máy → hỏi AI.
 */
import type { Quad } from "./db";

export type Gray = { data: Uint8Array | Uint8ClampedArray; w: number; h: number };

const at = (g: Gray, x: number, y: number) => {
  const xi = Math.min(g.w - 1, Math.max(0, Math.round(x))), yi = Math.min(g.h - 1, Math.max(0, Math.round(y)));
  return g.data[yi * g.w + xi];
};

/** Trả về chỉ số các cạnh (0..3) có mép thứ hai song song trong dải gần. */
export function stackedSides(g: Gray, quad: Quad, opts: { band?: number; samples?: number } = {}): number[] {
  const dim = Math.min(g.w, g.h), D = Math.max(6, Math.round((opts.band ?? 0.06) * dim));
  const minOff = Math.max(3, Math.round(0.01 * dim)), N = opts.samples ?? 7;
  const pts = quad.map(([x, y]) => [x * g.w, y * g.h] as const);
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 10) continue;
    let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; } // pháp tuyến hướng ra ngoài
    let hits = 0; const signs: number[] = [];
    for (let k = 0; k < N; k++) {
      const t = 0.2 + (0.6 * k) / Math.max(1, N - 1);
      const px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t;
      const prof: number[] = [];
      for (let o = -D; o <= D; o++) prof.push(at(g, px + nx * o, py + ny * o));
      const grad = prof.map((v, j) => (j === 0 || j === prof.length - 1 ? 0 : Math.abs(prof[j + 1] - prof[j - 1]) / 2));
      let main = 0; for (let o = -3; o <= 3; o++) main = Math.max(main, grad[D + o]);
      // V10: mép chồng thật thì phía sáng nằm về phía thân tờ chính (o-3); vạch chữ tối
      // bên trong thì ngược lại → loại bằng chiều sáng qua mép thứ hai.
      const pv = (o: number) => prof[Math.min(2 * D, Math.max(0, D + o))];
      const brighterInward = (o: number) => pv(o - 3) > pv(o + 3) + 5;
      if (main < 10) {
        // V10: khung có thể đã bám vào mép tờ lót — mép tờ chính là một mép mạnh nằm ngay bên trong.
        let inner = 0, io = 0;
        for (let o = -minOff - 4; o <= -minOff; o++) if (grad[D + o] > inner) { inner = grad[D + o]; io = o; }
        if (inner >= 25 && brighterInward(io)) { hits++; signs.push(-1); }
        continue;
      }
      // V10: xét đỉnh gradient GẦN khung nhất (không phải mạnh nhất) — vạch chữ có cặp mép
      // ngược chiều, mép gần nhất của nó đi từ sáng xuống tối nên bị loại bởi chiều sáng.
      let bo = 0;
      for (let o = minOff; o <= D - 1; o++) {
        for (const cand of [o, -o]) {
          const j = D + cand;
          if (grad[j] >= Math.max(10, 0.45 * main) && grad[j] >= grad[j - 1] && grad[j] >= grad[j + 1]) { bo = cand; break; }
        }
        if (bo) break;
      }
      if (bo && brighterInward(bo)) { hits++; signs.push(Math.sign(bo)); }
    }
    const pos = signs.filter((s) => s > 0).length, neg = signs.length - pos;
    if (hits >= Math.ceil(N * 0.6) && Math.max(pos, neg) >= Math.ceil(N * 0.5)) out.push(i);
  }
  return out;
}
