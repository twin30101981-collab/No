import { describe, expect, it } from "vitest";
import { pickQuad, shouldAskAi } from "./quad-fallback";
import { compareBench } from "./crop-bench";
import type { Quad } from "./db";

const A: Quad = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
const B: Quad = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]];

describe("dự phòng dò mép (G3-22)", () => {
  it("máy chắc chắn thì không hỏi AI; mất mạng cũng không hỏi", () => {
    expect(shouldAskAi({ quad: A, sure: true }, true)).toBe(false);
    expect(shouldAskAi({ quad: A, sure: false }, false)).toBe(false);
    expect(shouldAskAi({ quad: null, sure: false }, true)).toBe(true);
  });
  it("AI hợp lệ thắng kết quả máy chưa chắc; AI lỗi thì quay về máy, rồi kéo tay", () => {
    expect(pickQuad({ quad: A, sure: false }, B)).toEqual({ q: B, how: "ai" });
    expect(pickQuad({ quad: A, sure: false }, null)).toEqual({ q: A, how: "local" });
    expect(pickQuad({ quad: null, sure: false }, null)).toEqual({ q: null, how: "none" });
    expect(pickQuad({ quad: A, sure: true }, B).how).toBe("local");
  });
  it("bộ dò mới không kém bộ dò cũ trên bộ mẫu G2", () => {
    const c = compareBench();
    expect(c.worse).toEqual([]);
    expect(c.cur.correct).toBeGreaterThanOrEqual(c.old.correct);
    expect(c.cur.rate).toBeGreaterThanOrEqual(0.95);
  }, 30000);
});
