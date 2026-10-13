import { describe, expect, it } from "vitest";
import { edgeCurves, makeSrcMap, warpCurved } from "@/lib/dewarp";
import { buildWarpMesh, meshLookup } from "@/lib/warp-mesh";
import { pickLeastBusy, poolSizeFor } from "@/lib/worker-call";

type Pt = [number, number];

// Trang cong tổng hợp: cạnh trên/dưới võng theo cùng mô hình, các dòng chữ là đường cong nội suy giữa hai cạnh.
const W = 900, H = 1100, L = 120, R = 780, T = 120, B = 980, BOW = 26;
const bow = (x: number) => { const t = (x - L) / (R - L); return BOW * 4 * t * (1 - t); };
const topAt = (x: number) => T + bow(x), botAt = (x: number) => B + bow(x);
function page() {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; let v = 50;
    if (x >= L && x <= R && y >= topAt(x) && y <= botAt(x)) {
      v = 232; const s = (y - topAt(x)) / (botAt(x) - topAt(x)); // toạ độ dọc trong trang
      if (x > L + 60 && x < R - 60) for (let k = 1; k <= 12; k++) if (Math.abs(s - k / 13) * (B - T) < 1.6) v = 30;
    }
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
}
const quad: Pt[] = [[L, T], [R, T], [R, B], [L, B]];

/** Độ cong dòng: (max − min) toạ độ y (trọng tâm dưới điểm ảnh) của dòng tối nhất theo cột, chia cho bề rộng dòng. */
function lineCurvature(d: Uint8ClampedArray, w: number, h: number) {
  let worst = 0;
  for (let k = 3; k <= 10; k++) {
    const y0 = Math.round((k / 13) * h); const ys: number[] = [];
    const x0 = Math.round(w * 0.15), x1 = Math.round(w * 0.85);
    for (let x = x0; x < x1; x += 4) {
      let best = 999, by = y0;
      for (let y = y0 - 25; y <= y0 + 25; y++) { const v = d[(y * w + x) * 4]; if (v < best) { best = v; by = y; } }
      if (best < 120) { let sw = 0, sy = 0; for (let y = by - 4; y <= by + 4; y++) { const wgt = Math.max(0, 200 - d[(y * w + x) * 4]); sw += wgt; sy += wgt * y; } ys.push(sy / sw); }
    }
    if (ys.length < 20) continue;
    worst = Math.max(worst, (Math.max(...ys) - Math.min(...ys)) / (x1 - x0));
  }
  return worst;
}

describe("B7 – lưới ánh xạ + bicubic + pool Worker", () => {
  const src = page();
  const ow = 660, oh = 860;

  it("lưới ánh xạ 8 px lệch ánh xạ đúng < 0,05 px (GPU lấy mẫu cùng toạ độ với CPU)", () => {
    const curves = edgeCurves(src, W, H, quad);
    const map = makeSrcMap(quad, ow, oh, curves), mesh = buildWarpMesh(quad, ow, oh, curves);
    let err = 0;
    for (let y = 0; y < oh; y += 7) for (let x = 0; x < ow; x += 5) {
      const a = map(x, y), b = meshLookup(mesh, x, y); err = Math.max(err, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
    expect(err).toBeLessThan(0.05);
  });

  it("độ cong dòng sau nắn ≤ 0,5 % (trước nắn > 2 %)", () => {
    const curves = edgeCurves(src, W, H, quad);
    expect(curves[0]).not.toBeNull();
    const flat = warpCurved(src, W, H, quad, ow, oh, curves);
    const plain = warpCurved(src, W, H, quad, ow, oh, []);
    expect(lineCurvature(plain, ow, oh)).toBeGreaterThan(0.02);
    expect(lineCurvature(flat, ow, oh)).toBeLessThanOrEqual(0.005);
  });

  it("pool Worker 2–4 theo số lõi và giao việc cho Worker rảnh nhất", () => {
    expect(poolSizeFor(undefined)).toBe(2);
    expect(poolSizeFor(2)).toBe(2);
    expect(poolSizeFor(4)).toBe(3);
    expect(poolSizeFor(16)).toBe(4);
    const list = [{ id: "a", pending: { size: 2 } }, { id: "b", pending: { size: 0 } }, { id: "c", pending: { size: 1 } }];
    expect(pickLeastBusy(list).id).toBe("b");
  });
});
