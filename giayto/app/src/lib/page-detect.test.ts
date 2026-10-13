import { describe, expect, it } from "vitest";
import { PageDetector, frameSignature, signatureDiff } from "./page-detect";

const W = 96, H = 128;
function page(seed: number, bright = 0, shift = 0): Uint8ClampedArray {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const line = Math.floor((y + shift) / 8);
    const ink = ((line * 7 + seed * 13) % 5 === 0) || ((x * seed + line) % 11 === 0 && line % 2 === seed % 2);
    const v = Math.max(0, Math.min(255, (ink ? 30 : 230) + bright));
    const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
}
const sig = (s: number, b = 0, sh = 0) => frameSignature(page(s, b, sh), W, H);

describe("page-detect", () => {
  it("bỏ qua thay đổi độ sáng tổng thể, nhận khác trang", () => {
    expect(signatureDiff(sig(1), sig(1, 20))).toBeLessThan(1);
    expect(signatureDiff(sig(1), sig(2))).toBeGreaterThan(10);
  });

  it("chụp trang đầu khi đứng yên, không chụp lại trang cũ", () => {
    const d = new PageDetector();
    const ev = Array.from({ length: 20 }, () => d.push(sig(1)));
    expect(ev.filter((e) => e === "capture").length).toBe(1);
  });

  it("lật trang (có chuyển động) → chụp trang mới đúng một lần", () => {
    const d = new PageDetector();
    const seq = [
      ...Array(10).fill(1).map(() => sig(1)),
      sig(1, 0, 40), sig(3), sig(2, 0, 30), // đang lật
      ...Array(10).fill(0).map(() => sig(2)),
    ];
    const caps = seq.map((s) => d.push(s)).filter((e) => e === "capture").length;
    expect(caps).toBe(2);
  });

  it("rung tay rồi về lại trang cũ → không chụp trùng", () => {
    const d = new PageDetector();
    const seq = [...Array(10).fill(0).map(() => sig(1)), sig(1, 0, 40), ...Array(10).fill(0).map(() => sig(1))];
    expect(seq.map((s) => d.push(s)).filter((e) => e === "capture").length).toBe(1);
  });

  it("khung chưa sẵn sàng thì chờ, sẵn sàng lại thì chụp đúng một lần", () => {
    const d = new PageDetector();
    const wait = Array.from({ length: 10 }, () => d.push(sig(3), false));
    expect(wait.includes("capture")).toBe(false);
    const ev = Array.from({ length: 5 }, () => d.push(sig(3), true));
    expect(ev.filter((e) => e === "capture").length).toBe(1);
  });
});
