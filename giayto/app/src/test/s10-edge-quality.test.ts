import { describe, it, expect } from "vitest";
import { edgeShadowLift, edgeSpeckClean } from "@/lib/paper-mask";

const W = 200, H = 280;
const page = () => { const d = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < W * H; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 235; d[i * 4 + 3] = 255; } return d; };
const set = (d: Uint8ClampedArray, x: number, y: number, v: number) => { const j = (y * W + x) * 4; d[j] = d[j + 1] = d[j + 2] = v; };
const get = (d: Uint8ClampedArray, x: number, y: number) => d[(y * W + x) * 4];
const text = (d: Uint8ClampedArray) => { for (let y = 100; y < 104; y++) for (let x = 60; x < 140; x += 3) set(d, x, y, 30); };

describe("S10 Q1 – bóng xám góc", () => {
  it("làm sáng bóng mềm góc dưới trái, giữ chữ", () => {
    const d = page(); text(d);
    for (let y = H - 40; y < H; y++) for (let x = 0; x < 40; x++) set(d, x, y, 235 - Math.round(60 * (1 - Math.hypot(x, H - 1 - y) / 57)) );
    edgeShadowLift(d, W, H);
    expect(get(d, 3, H - 3)).toBeGreaterThan(225);
    expect(get(d, 60, 101)).toBe(30);
  });
});

describe("S10 Q2 – rác mép", () => {
  it("xoá chấm đen nhỏ sát mép, giữ chữ trong trang", () => {
    const d = page(); text(d);
    for (let y = H - 3; y < H - 1; y++) for (let x = 20; x < 23; x++) set(d, x, y, 20);
    edgeSpeckClean(d, W, H);
    expect(get(d, 21, H - 2)).toBeGreaterThan(200);
    expect(get(d, 60, 101)).toBe(30);
  });
});

import { edgeShadowSmooth } from "@/lib/paper-mask";
describe("S10b Q1 – bóng không chạm mép", () => {
  it("xoá bóng mềm cách mép 5 px, giữ chữ", () => {
    const d = page(); text(d);
    for (let y = H - 50; y < H - 5; y++) for (let x = 5; x < 50; x++) set(d, x, y, 170 + Math.round((x - 5) * 1.2));
    edgeShadowSmooth(d, W, H);
    expect(get(d, 20, H - 25)).toBeGreaterThan(225);
    expect(get(d, 60, 101)).toBe(30);
  });
});
