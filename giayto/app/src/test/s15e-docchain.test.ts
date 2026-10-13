import { inkDeepen } from "@/lib/ink-deepen";
import { describe, it, expect } from "vitest";
import { docChain } from "@/lib/pixels";
import { autoLevel } from "@/lib/auto-level";
import { lineSkewRefine, lineSkewRefineTop, lineSkewRefineTopSide } from "@/lib/line-skew";
import { sharpenAdaptive } from "@/lib/sharpen-adaptive";

function page(W: number, H: number) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const ink = y % 20 < 3 && x > 10 && x < W - 10 && (x >> 3) % 3 !== 0;
    const v = ink ? 40 : 225 + ((x * 7 + y * 3) % 9); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
}

describe("S15e docChain", () => {
  for (const sharp of [false, true]) it(`khớp chuỗi cũ trên luồng chính (sharp=${sharp})`, () => {
    const W = 160, H = 200; const a = page(W, H); const b = page(W, H);
    autoLevel(b, sharp ? 1.85 : 1.55); // R6.1a: khớp boost mới trong docChain
    b.set(lineSkewRefine(b, W, H, 2).data); b.set(lineSkewRefineTop(b, W, H, 2).data);
    b.set(sharpenAdaptive(b, W, H, sharp ? 1.4 : 0.9)); b.set(lineSkewRefineTopSide(b, W, H, 2).data);
    inkDeepen(b); // R6.1b-2
    expect(Array.from(docChain(a, W, H, sharp))).toEqual(Array.from(b));
  });
});
