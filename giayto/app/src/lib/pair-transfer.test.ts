import { describe, expect, it } from "vitest";
import { Assembler, split } from "./pair-transfer";

const img = "data:image/jpeg;base64," + "A".repeat(150_000);

describe("gửi ảnh theo mẩu", () => {
  it("chia rồi ghép lại đúng, kể cả khi đến lộn xộn và trùng", () => {
    const parts = split("a", img);
    expect(parts.length).toBe(4);
    const asm = new Assembler();
    const shuffled = [parts[2], parts[0], parts[2], parts[3]];
    for (const p of shuffled) expect(asm.push(p)).toBeNull();
    expect(asm.progress("a")).toBe(0.75);
    expect(asm.push(parts[1])).toEqual({ id: "a", dataUrl: img });
    expect(asm.progress("a")).toBeNull();
  });
  it("bỏ mẩu sai, không phải ảnh, hoặc quá lớn", () => {
    const asm = new Assembler();
    expect(asm.push({ id: "x", i: 3, n: 2, data: "z" })).toBeNull();
    expect(asm.push({ id: "x", i: 0, n: 1, data: "javascript:alert(1)" })).toBeNull();
    expect(asm.push({ id: "y", i: 0, n: 10_000, data: "z" })).toBeNull();
  });
  it("xóa ảnh dở quá lâu", () => {
    const asm = new Assembler(1000); const p = split("b", img);
    asm.push(p[0], 0); asm.push(p[1], 2000);
    expect(asm.progress("b")).toBe(0.25);
  });
});
