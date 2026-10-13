import { describe, expect, it } from "vitest";
import type { Quad } from "./db";
import { checkQuad, isConvex, orderQuad, quadArea, snapCorner, snapTargets, tidyQuad } from "./crop-quad";

const sq: Quad = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];

describe("P3 crop-quad", () => {
  it("diện tích khung 0,8×0,8 = 0,64", () => {
    expect(quadArea(sq)).toBeCloseTo(0.64, 6);
  });
  it("khung chéo (đổi chỗ 2 góc dưới) không lồi và bị chặn", () => {
    const bad: Quad = [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]];
    expect(isConvex(bad)).toBe(false);
    expect(checkQuad(bad)).toMatchObject({ ok: false, reason: "cheo" });
  });
  it("tidyQuad sửa khung chéo về đúng ↖↗↘↙", () => {
    const bad: Quad = [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]];
    expect(tidyQuad(bad)).toEqual(sq);
    expect(orderQuad([sq[2], sq[0], sq[3], sq[1]])).toEqual(sq);
  });
  it("khung < 5% ảnh bị chặn là quá nhỏ", () => {
    const tiny: Quad = [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]]; // 4%
    expect(checkQuad(tiny)).toMatchObject({ ok: false, reason: "nho" });
  });
  it("khung có góc trong < 30° bị chặn là méo", () => {
    const thin: Quad = [[0.1, 0.5], [0.9, 0.3], [0.95, 0.5], [0.9, 0.7]];
    expect(checkQuad(thin)).toMatchObject({ ok: false, reason: "meo" });
  });
  it("khung giấy bình thường hợp lệ", () => {
    expect(checkQuad(sq)).toEqual({ ok: true });
  });
  it("hút góc trong 2% về góc dò được, xa hơn thì giữ nguyên", () => {
    const t = snapTargets([[0.12, 0.11], [0.88, 0.1], [0.9, 0.9], [0.1, 0.9]]);
    const near: Quad = [[0.125, 0.12], sq[1], sq[2], sq[3]];
    expect(snapCorner(near, 0, t)[0]).toEqual([0.12, 0.11]);
    const far: Quad = [[0.2, 0.2], sq[1], sq[2], sq[3]];
    expect(snapCorner(far, 0, t)).toBe(far);
  });
  it("hút về góc ảnh khi kéo sát mép ảnh", () => {
    const q: Quad = [[0.01, 0.005], sq[1], sq[2], sq[3]];
    expect(snapCorner(q, 0, snapTargets(null))[0]).toEqual([0, 0]);
  });
});

import { acceptEdgeRefine, clampTilt, rotateQuad } from "./crop-quad";
describe("P3.2 xoay mịn & hút cạnh", () => {
  it("xoay 0° giữ nguyên, xoay +90° trên ảnh vuông đưa ↖ về vị trí ↗", () => {
    expect(rotateQuad(sq, 0, 1000, 1000)[0][0]).toBeCloseTo(0.1, 9);
    const r = rotateQuad(sq, 90, 1000, 1000);
    expect(r[0][0]).toBeCloseTo(0.9, 9); expect(r[0][1]).toBeCloseTo(0.1, 9);
  });
  it("xoay giữ diện tích theo pixel thật trên ảnh chữ nhật 3000×4000", () => {
    const r = rotateQuad(sq, 5, 3000, 4000);
    expect(quadArea(r)).toBeCloseTo(quadArea(sq), 4);
  });
  it("góc xoay mịn kẹp trong ±5°, bước 0,5°", () => {
    expect(clampTilt(7)).toBe(5); expect(clampTilt(-6)).toBe(-5); expect(clampTilt(1.3)).toBe(1.5);
  });
  it("hút cạnh nhận dời ≤ 3%, chỉ đổi 2 góc của cạnh", () => {
    const ref: Quad = [[0.12, 0.11], [0.88, 0.12], [0.5, 0.5], [0.5, 0.5]];
    const out = acceptEdgeRefine(sq, ref, 0);
    expect(out[0]).toEqual([0.12, 0.11]); expect(out[1]).toEqual([0.88, 0.12]); expect(out[2]).toEqual(sq[2]);
  });
  it("hút cạnh bỏ qua khi dời > 3%", () => {
    const ref: Quad = [[0.2, 0.2], [0.9, 0.1], sq[2], sq[3]];
    expect(acceptEdgeRefine(sq, ref, 0)).toBe(sq);
  });
});
