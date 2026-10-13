import { describe, expect, it } from "vitest";
import { warpCurved } from "@/lib/dewarp";
import { darkBorderRegions } from "@/lib/paper-mask";
import { deskewPixels, estimateSkewPx } from "@/lib/pixels";
import { deskewQuad, squareToQuad, type Pt } from "@/lib/deskew-quad";

const OW = 620, OH = 877;
// Khung đúng nhưng xoay 3° quanh tâm: nội dung bị nghiêng sau khi nắn (giả lập người dùng/AI đặt khung nghiêng).
function tilted(q: Pt[], deg: number): Pt[] {
  const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  // thu nhỏ để khung nghiêng vẫn nằm trong tờ giấy
  return q.map(([x, y]) => { const dx = (x - cx) * 0.9, dy = (y - cy) * 0.9; return [cx + dx * c - dy * s, cy + dx * s + dy * c] as Pt; });
}

describe("B5 xoay thẳng tích hợp vào khung", () => {
  it("squareToQuad đi qua đúng 4 góc", () => {
    const q: Pt[] = [[10, 20], [300, 35], [320, 400], [5, 380]]; const H = squareToQuad(q);
    [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([u, v], i) => { const p = H(u, v); expect(p[0]).toBeCloseTo(q[i][0], 6); expect(p[1]).toBeCloseTo(q[i][1], 6); });
  });
  it("góc 0 giữ nguyên khung", () => {
    const q: Pt[] = [[0, 0], [10, 0], [10, 20], [0, 20]]; expect(deskewQuad(q, 100, 200, 0)).toEqual(q);
  });

  // Ảnh chụp tổng hợp: nền bàn tối, tờ giấy thẳng có dòng chữ ngang; khung đặt nghiêng (±3°, 2°, −1,5°).
  const SW = 800, SH = 1050;
  const photo = () => { const d = new Uint8ClampedArray(SW * SH * 4);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const j = (y * SW + x) * 4;
      const paper = x >= 100 && x < 700 && y >= 100 && y < 950;
      const ink = paper && x > 160 && x < 640 && y > 170 && y < 880 && y % 22 < 5;
      const v = (paper ? (ink ? 45 : 232) : 48) + ((x * 7 + y * 13) % 20) - 10; d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = 255; }
    return d; };
  it("khung nghiêng: nắn theo khung xoay không tạo góc nền mới, nội dung thẳng", () => {
    const src = photo(); const rect: Pt[] = [[100, 100], [700, 100], [700, 950], [100, 950]];
    let oldWorst = 0;
    for (const t of [3, -3, 2, -1.5]) {
      const q = tilted(rect, t);
      const w0 = warpCurved(src, SW, SH, q, OW, OH, []);
      const deg = estimateSkewPx(w0, OW, OH); expect(Math.abs(deg), `nghiêng ${t}`).toBeGreaterThan(0.9);
      const base = darkBorderRegions(w0, OW, OH).reduce((m, r) => Math.max(m, r.mm), 0);
      const oldWay = darkBorderRegions(deskewPixels(w0.slice(), OW, OH), OW, OH).reduce((m, r) => Math.max(m, r.mm), 0);
      const nw = warpCurved(src, SW, SH, deskewQuad(q, OW, OH, deg), OW, OH, []);
      const newWay = darkBorderRegions(nw, OW, OH).reduce((m, r) => Math.max(m, r.mm), 0);
      oldWorst = Math.max(oldWorst, oldWay);
      expect(newWay, `nghiêng ${t}: base ${base} cũ ${oldWay}`).toBeLessThanOrEqual(Math.max(base, 3));
      expect(Math.abs(estimateSkewPx(nw, OW, OH)), `nghiêng ${t}`).toBeLessThan(0.6);
    }
    console.log(`B5: cách cũ (nắn rồi xoay) vùng tối lớn nhất ${oldWorst.toFixed(1)} mm`);
  }, 180_000);
});
