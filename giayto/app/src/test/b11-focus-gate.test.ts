import { describe, expect, it } from "vitest";
import { FocusGate, laplacianVariance } from "@/lib/focus-gate";

// Trang chữ giả: dòng chữ là các nét đen ngắn trên nền trắng, có nhiễu nhẹ.
function page(w: number, h: number, seed: number): Float32Array {
  let s = seed; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const g = new Float32Array(w * h).fill(240);
  for (let y = 10; y < h - 10; y += 12) for (let x = 8; x < w - 8; x += 3) {
    if (rnd() < 0.55) for (let dy = 0; dy < 7; dy++) g[(y + dy) * w + x] = 30;
  }
  for (let k = 0; k < g.length; k++) g[k] += (rnd() - 0.5) * 4;
  return g;
}
function blur(g: Float32Array, w: number, h: number, r: number): Float32Array {
  let a = g;
  for (let pass = 0; pass < 2; pass++) {
    const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let d = -r; d <= r; d++) { const xx = pass ? x : x + d, yy = pass ? y + d : y; if (xx >= 0 && xx < w && yy >= 0 && yy < h) { s += a[yy * w + xx]; n++; } }
      o[y * w + x] = s / n;
    }
    a = o;
  }
  return a;
}

describe("B11 tự chụp theo độ nét", () => {
  const W = 160, H = 200;
  it("ảnh nét có phương sai Laplacian cao hơn ảnh mờ rõ rệt", () => {
    const p = page(W, H, 1);
    const sharp = laplacianVariance(p, W, H), soft = laplacianVariance(blur(p, W, H, 2), W, H);
    expect(sharp).toBeGreaterThan(soft * 5);
  });

  it("chỉ đo trong vùng giấy: nền ngoài không làm sai điểm", () => {
    const p = page(W, H, 2); const inner = laplacianVariance(p, W, H, [0.1, 0.1, 0.9, 0.9]);
    expect(inner).toBeGreaterThan(20);
  });

  it("cổng chỉ mở sau đủ khung nét liên tiếp, đóng khi rung", () => {
    const gate = new FocusGate(); const p = page(W, H, 3);
    const s = laplacianVariance(p, W, H), b = laplacianVariance(blur(p, W, H, 3), W, H);
    for (let i = 0; i < 4; i++) expect(gate.push(s).ok).toBe(false); // khởi động: chưa biết đỉnh
    expect(gate.push(s).ok).toBe(true);
    gate.restart();
    expect(gate.push(s).ok).toBe(false);
    expect(gate.push(b).ok).toBe(false);
    expect(gate.push(b).state).not.toBe("sharp");
  });

  it("bộ mẫu 40 chuỗi khung: ảnh mờ được chụp < 5 %", () => {
    let shots = 0, blurry = 0;
    for (let seq = 0; seq < 40; seq++) {
      const gate = new FocusGate(); const p = page(W, H, 100 + seq);
      const sharpScore = laplacianVariance(p, W, H);
      const radii = [3, 2, 2, 1, 0, 0, 0, 0, 1, 2, 0, 0, 0, 3, 0, 0]; // lấy nét, rung tay, lấy nét lại
      const scores = radii.map((r) => (r ? laplacianVariance(blur(p, W, H, r), W, H) : sharpScore * (0.95 + (seq % 5) * 0.01)));
      scores.forEach((sc, i) => {
        if (gate.push(sc).ok) { shots++; if (radii[i] > 0) blurry++; gate.restart(); }
      });
    }
    expect(shots).toBeGreaterThan(30);
    expect(blurry / shots).toBeLessThan(0.05);
  });
});
