import { describe, it, expect } from "vitest";
import { srcBytes } from "@/lib/disk-pack";
describe("srcBytes", () => {
  it("data URL base64 tính đúng byte", () => { expect(srcBytes("data:image/jpeg;base64,AAAA")).toBe(3); });
  it("blob không đăng ký = 0, rỗng = 0", () => { expect(srcBytes("blob:x")).toBe(0); expect(srcBytes("")).toBe(0); });
});
