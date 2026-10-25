import { describe, it, expect, beforeEach } from "vitest";
import { ensurePersist, persistOnce, _resetPersist } from "../persist";

describe("Hồi quy V11 persist", () => {
  beforeEach(() => _resetPersist());
  it("không có API → false", async () => { expect(await ensurePersist(undefined)).toBe(false); });
  it("đã bền thì không hỏi lại", async () => {
    let n = 0;
    expect(await ensurePersist({ persisted: async () => true, persist: async () => { n++; return true; } })).toBe(true);
    expect(n).toBe(0);
  });
  it("lỗi → false, không ném", async () => {
    expect(await ensurePersist({ persist: async () => { throw new Error("x"); } })).toBe(false);
  });
  it("chỉ hỏi một lần", async () => {
    let n = 0; const sm = { persisted: async () => false, persist: async () => { n++; return true; } };
    await persistOnce(sm); await persistOnce(sm);
    expect(n).toBe(1);
  });
});
