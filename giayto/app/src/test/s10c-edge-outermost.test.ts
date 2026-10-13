import { describe, expect, it } from "vitest";
import { refineQuadSampler } from "@/lib/detect-refine";

// S10c (Q3): mép phải giấy ở x=400, cột chữ đậm sát mép ở x=388–392 (tương phản cao hơn mép giấy).
// Khung tinh chỉnh phải bám mép giấy, không lấn vào chữ.
describe("S10c – khung cắt không lấn chữ mép phải", () => {
  it("chọn mép giấy ngoài cùng thay vì nét chữ sát mép", () => {
    const W = 500, H = 600, edge = 400;
    const L = (x: number, y: number) => {
      if (x < 50 || x > edge || y < 50 || y > 550) return 150; // nền/trang kế (xám vừa)
      if (x >= 388 && x <= 392 && Math.floor(y / 12) % 2 === 0) return 10; // chữ đậm
      return 235; // giấy
    };
    const coarse = [[50 / W, 50 / H], [(edge - 8) / W, 50 / H], [(edge - 8) / W, 550 / H], [50 / W, 550 / H]] as [number, number][];
    const q = refineQuadSampler(L, W, H, coarse as never, 32);
    for (const i of [1, 2]) expect(Math.abs(q[i][0] * W - edge)).toBeLessThan(3);
  });
});
