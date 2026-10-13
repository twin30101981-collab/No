/** R6.1 – Cổng chất lượng theo chỉ số 17.4 (đo trên ảnh đầu ra RGBA).
 *  - bgDev: độ lệch nền = (P95 − P5 của nền ô 8×8) / 255  → đạt khi ≤ 8%
 *  - deltaL: chênh độ sáng nền − chữ (thang L* 0–100)     → đạt khi ≥ 60
 *  - darkCorner: tỉ lệ điểm rất tối (L* < 20) ở 4 góc 5%  → đạt khi ≤ 5%
 *    (R6.1c 11/10/2026: nới 0,2% → 5% vì góc tối còn lại chủ yếu là chữ thật sát mép giấy)
 *  Không đạt thì không được gạch mục (dùng trong scripts/chat-luong.py và kiểm thử). */
export const GATE = { bgDev: 0.08, deltaL: 60, darkCorner: 0.05 } as const;

export type GateResult = { bgDev: number; deltaL: number; darkCorner: number; pass: boolean; fails: string[] };

const lstar = (y: number) => { const t = y / 255; const f = t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return 116 * f - 16; };
const lumaAt = (d: ArrayLike<number>, i: number) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

function pct(arr: number[], p: number) { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * (a.length - 1)))] : 0; }

export function measureGate(d: ArrayLike<number>, W: number, H: number): GateResult {
  const G = 8, bgs: number[] = [];
  const all: number[] = [];
  const step = Math.max(1, Math.round(Math.sqrt((W * H) / 200_000)));
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const v: number[] = [];
    for (let y = Math.floor((gy * H) / G); y < Math.floor(((gy + 1) * H) / G); y += step)
      for (let x = Math.floor((gx * W) / G); x < Math.floor(((gx + 1) * W) / G); x += step) { const l = lumaAt(d, (y * W + x) * 4); v.push(l); all.push(l); }
    if (v.length) bgs.push(pct(v, 0.9));
  }
  const bgDev = (pct(bgs, 0.95) - pct(bgs, 0.05)) / 255;
  const paper = pct(all, 0.9), inkCut = paper * 0.6;
  const ink = all.filter((l) => l < inkCut);
  const deltaL = ink.length ? lstar(paper) - lstar(pct(ink, 0.5)) : 0;
  const cw = Math.max(1, Math.round(W * 0.05)), chh = Math.max(1, Math.round(H * 0.05));
  let dark = 0, n = 0;
  for (const [x0, y0] of [[0, 0], [W - cw, 0], [0, H - chh], [W - cw, H - chh]])
    for (let y = y0; y < y0 + chh; y++) for (let x = x0; x < x0 + cw; x++) { if (lstar(lumaAt(d, (y * W + x) * 4)) < 20) dark++; n++; }
  const darkCorner = n ? dark / n : 0;
  const fails: string[] = [];
  if (bgDev > GATE.bgDev) fails.push(`Độ lệch nền ${(bgDev * 100).toFixed(1)}% > 8%`);
  if (ink.length && deltaL < GATE.deltaL) fails.push(`ΔL ${deltaL.toFixed(0)} < 60`);
  if (darkCorner > GATE.darkCorner) fails.push(`Góc tối ${(darkCorner * 100).toFixed(2)}% > 5%`);
  return { bgDev, deltaL, darkCorner, pass: fails.length === 0, fails };
}
