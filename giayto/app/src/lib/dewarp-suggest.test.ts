import { describe, expect, it } from "vitest";
import { suggestDewarp, SUGGEST_MIN_CONFIDENCE } from "./dewarp-suggest";

const W = 400, H = 520;

/** Trang trắng trên nền tối; mép trên võng xuống theo parabol (sag px), có vài dòng chữ cong theo. */
function page(sag: number, withText: boolean) {
  const d = new Uint8ClampedArray(W * H * 4);
  const top = (x: number) => 60 + sag * 4 * (x / W) * (1 - x / W);
  const bot = H - 60, l = 40, r = W - 40;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inside = x >= l && x <= r && y >= top(x) && y <= bot;
    const i = (y * W + x) * 4;
    const v = inside ? 235 : 30;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  if (withText) {
    // dòng chữ cong theo cùng biên dạng võng (dịch dọc theo parabol chuẩn hoá)
    for (let row = 0; row < 12; row++) {
      const yb = 120 + row * 28;
      for (let x = l + 20; x < r - 20; x++) {
        const u = x / W - 0.5;
        const y = Math.round(yb + sag * 3 * (0.25 - u * u));
        for (let k = 0; k < 4; k++) { const i = ((y + k) * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = 20; }
      }
    }
  }
  return d;
}

const QUAD = [[40 / W, 60 / H], [(W - 40) / W, 60 / H], [(W - 40) / W, (H - 60) / H], [40 / W, (H - 60) / H]];

describe("suggestDewarp", () => {
  it("trang cong rõ (mép võng + dòng chữ võng) → đề xuất, độ tin cậy cao", () => {
    const s = suggestDewarp(page(26, true), W, H, QUAD);
    expect(s.curved).toBe(true);
    expect(s.confidence).toBeGreaterThanOrEqual(0.6);
    expect(s.edgeBend).toBeGreaterThan(0.02);
    expect(s.lineBend).toBeGreaterThan(0.004);
  });

  it("trang phẳng → không đề xuất", () => {
    const s = suggestDewarp(page(0, true), W, H, QUAD);
    expect(s.curved).toBe(false);
    expect(s.confidence).toBeLessThan(SUGGEST_MIN_CONFIDENCE);
  });

  it("chỉ mép cong, không có chữ → vẫn đề xuất nhưng tin cậy thấp hơn", () => {
    const s = suggestDewarp(page(26, false), W, H, QUAD);
    expect(s.curved).toBe(true);
    expect(s.lineBend).toBe(0);
    expect(s.confidence).toBeLessThan(0.9);
  });

  it("cong rất nhẹ (dưới ngưỡng) → không làm phiền", () => {
    const s = suggestDewarp(page(3, true), W, H, QUAD);
    expect(s.curved).toBe(false);
  });
});
