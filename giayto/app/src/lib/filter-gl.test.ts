import { describe, expect, it } from "vitest";
import { GL_MODE, clampFilterLevel, filterShaderParams, mixPixels } from "./filter-gl";

describe("clampFilterLevel", () => {
  it("mặc định 100 khi thiếu hoặc không hợp lệ", () => {
    expect(clampFilterLevel(undefined)).toBe(100);
    expect(clampFilterLevel(null)).toBe(100);
    expect(clampFilterLevel(Number.NaN)).toBe(100);
  });
  it("kẹp về 0–100 và làm tròn", () => {
    expect(clampFilterLevel(-5)).toBe(0);
    expect(clampFilterLevel(150)).toBe(100);
    expect(clampFilterLevel(42.6)).toBe(43);
    expect(clampFilterLevel(0)).toBe(0);
  });
});

describe("filterShaderParams", () => {
  it("cấp độ 0 → mix 0 (giữ nguyên ảnh gốc), 100 → mix 1", () => {
    expect(filterShaderParams("magic", 0).mix).toBe(0);
    expect(filterShaderParams("magic", 100).mix).toBe(1);
    expect(filterShaderParams("magic", 55).mix).toBeCloseTo(0.55);
    expect(filterShaderParams("magic", undefined).mix).toBe(1);
  });
  it("ánh xạ bộ lọc sang chế độ shader", () => {
    expect(filterShaderParams("original", 100).mode).toBe(GL_MODE.tone);
    expect(filterShaderParams("gray", 100).mode).toBe(GL_MODE.gray);
    expect(filterShaderParams("mono", 100).mode).toBe(GL_MODE.mono);
    expect(filterShaderParams("ink", 100).mode).toBe(GL_MODE.mono);
    expect(filterShaderParams("vivid", 100).mode).toBe(GL_MODE.vivid);
    expect(filterShaderParams("magic", 100).mode).toBe(GL_MODE.magic);
    expect(filterShaderParams("auto", 100).mode).toBe(GL_MODE.magic);
  });
  it("tên bộ lọc cũ/lạ được chuẩn hoá", () => {
    expect(filterShaderParams("bw", 100).mode).toBe(GL_MODE.mono);
    expect(filterShaderParams("khong-co", 100).mode).toBe(GL_MODE.tone);
  });
  it("shadow/denoise đánh dấu cpuOnly (GPU chỉ xem gần đúng)", () => {
    expect(filterShaderParams("shadow", 100).cpuOnly).toBe(true);
    expect(filterShaderParams("denoise", 100).cpuOnly).toBe(true);
    expect(filterShaderParams("magic", 100).cpuOnly).toBe(false);
  });
  it("sáng/tương phản kẹp trong ±80 và chuẩn hoá", () => {
    const p = filterShaderParams("original", 100, 200, -200);
    expect(p.bright).toBeCloseTo(80 / 255);
    expect(p.contrast).toBe(-80);
  });
});

describe("mixPixels", () => {
  const orig = new Uint8ClampedArray([0, 0, 0, 255, 100, 150, 200, 255]);
  it("mix 1 giữ nguyên bản lọc, mix 0 trả về bản gốc", () => {
    const f = new Uint8ClampedArray([200, 200, 200, 255, 0, 0, 0, 255]);
    expect([...mixPixels(orig, new Uint8ClampedArray(f), 1)]).toEqual([...f]);
    expect([...mixPixels(orig, new Uint8ClampedArray(f), 0)]).toEqual([...orig]);
  });
  it("mix 0.5 trộn đều RGB, giữ alpha của bản lọc", () => {
    const f = new Uint8ClampedArray([200, 200, 200, 255, 0, 0, 0, 255]);
    const out = mixPixels(orig, f, 0.5);
    expect(out[0]).toBe(100);
    expect(out[4]).toBe(50);
    expect(out[5]).toBe(75);
    expect(out[3]).toBe(255);
  });
  it("không chạm alpha khi trộn", () => {
    const f = new Uint8ClampedArray([10, 20, 30, 200]);
    const o = new Uint8ClampedArray([0, 0, 0, 255]);
    expect(mixPixels(o, f, 0.5)[3]).toBe(200);
  });
});
