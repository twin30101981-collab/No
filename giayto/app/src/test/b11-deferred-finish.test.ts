import { describe, it, expect } from "vitest";
import { FinishQueue, type IdleScheduler } from "@/lib/deferred-finish";

function manual() { const q: (() => void)[] = []; const s: IdleScheduler = (cb) => { q.push(cb); }; return { s, tick: async () => { const f = q.shift(); f?.(); await new Promise((r) => setTimeout(r, 0)); }, pending: () => q.length }; }

describe("B11 làm nét sau", () => {
  it("không chạy hoàn thiện trên đường găng: chỉ chạy khi lượt rảnh tới", async () => {
    const m = manual(); const fq = new FinishQueue(m.s); let ran = 0; const got: string[] = [];
    fq.add("p1", async () => { ran++; return "full"; }, (s) => got.push(s));
    expect(ran).toBe(0);
    await m.tick();
    expect(ran).toBe(1); expect(got).toEqual(["full"]); expect(fq.size).toBe(0);
  });
  it("xoá trang trước khi rảnh → huỷ, không thay ảnh", async () => {
    const m = manual(); const fq = new FinishQueue(m.s); let ran = 0; const got: string[] = [];
    fq.add("p1", async () => { ran++; return "full"; }, (s) => got.push(s));
    fq.cancel("p1"); await m.tick();
    expect(ran).toBe(0); expect(got).toEqual([]);
  });
  it("xoá trang khi đang chạy → bỏ kết quả", async () => {
    const m = manual(); const fq = new FinishQueue(m.s); let release!: () => void; const got: string[] = [];
    fq.add("p1", () => new Promise<string>((r) => (release = () => r("full"))), (s) => got.push(s));
    await m.tick(); fq.cancel("p1"); release(); await new Promise((r) => setTimeout(r, 0));
    expect(got).toEqual([]);
  });
  it("flush chạy hết việc còn lại theo thứ tự (khi lưu)", async () => {
    const m = manual(); const fq = new FinishQueue(m.s); const got: string[] = [];
    fq.add("a", async () => "A", (s) => got.push(s)); fq.add("b", async () => "B", (s) => got.push(s));
    await fq.flush();
    expect(got).toEqual(["A", "B"]); expect(fq.size).toBe(0);
  });
  it("lỗi dựng giữ bản nháp, hàng đợi chạy tiếp", async () => {
    const m = manual(); const fq = new FinishQueue(m.s); const got: string[] = [];
    fq.add("a", async () => { throw new Error("x"); }, (s) => got.push(s)); fq.add("b", async () => "B", (s) => got.push(s));
    await fq.flush(); expect(got).toEqual(["B"]);
  });
});
