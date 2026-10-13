import { describe, expect, it } from "vitest";
import { gradePage } from "@/lib/page-grade";
import { SharedOcr } from "@/lib/ocr-worker";
import { addEntry, type ScanLogEntry } from "@/lib/scan-log";

describe("B12 chấm điểm trang", () => {
  const good = { blur: 120, glare: 0, skew: 0.5, brightness: 200, contrast: 60 };
  it("trang tốt ≥ 75", () => expect(gradePage(good).level).toBe("tot"));
  it("mờ → kém, gợi ý mờ", () => { const g = gradePage({ ...good, blur: 10 }); expect(g.level).toBe("kem"); expect(g.tip).toMatch(/mờ/); });
  it("lóa nặng hạ điểm", () => expect(gradePage({ ...good, glare: 0.05 }).score).toBeLessThan(75));
  it("nghiêng / nền tối có gợi ý đúng", () => {
    expect(gradePage({ ...good, skew: 9 }).tip).toMatch(/nghiêng/);
    expect(gradePage({ ...good, brightness: 60, contrast: 10 }).tip).toMatch(/Nền/);
  });
});

describe("B12 OCR một Worker (O7)", () => {
  it("nhiều lượt dùng chung 1 Worker, chạy tuần tự", async () => {
    let active = 0, maxActive = 0;
    const o = new SharedOcr(async () => ({
      recognize: async (src: string) => { active++; maxActive = Math.max(maxActive, active); await new Promise((r) => setTimeout(r, 5)); active--; return { data: { text: src } }; },
      terminate: async () => {},
    }));
    const r = await Promise.all(["a", "b", "c"].map((s) => o.run<{ text: string }>("vie", s)));
    expect(r.map((x) => x.data.text)).toEqual(["a", "b", "c"]);
    expect(o.created).toBe(1); expect(maxActive).toBe(1);
  });
  it("lỗi một lượt không chặn lượt sau; reset dựng lại", async () => {
    let n = 0;
    const o = new SharedOcr(async () => ({ recognize: async (s: string) => { if (s === "x") throw new Error("hỏng"); return { data: { text: s } }; }, terminate: async () => { n++; } }));
    await expect(o.run("vie", "x")).rejects.toThrow();
    expect((await o.run<{ text: string }>("vie", "ok")).data.text).toBe("ok");
    await o.reset(); await o.run("vie", "y"); expect(o.created).toBe(2); expect(n).toBe(1);
  });
});

describe("B12 nhật ký sạch (O9)", () => {
  const e = (code: string, at: string): ScanLogEntry => ({ code, message: "m", at });
  it("gộp lỗi trùng trong 60 s, đếm số lần", () => {
    let l: ScanLogEntry[] = [];
    for (let i = 0; i < 10; i++) l = addEntry(l, e("CAM_SLOW", new Date(1e12 + i * 1000).toISOString()));
    expect(l).toHaveLength(1); expect(l[0]!.count).toBe(10);
  });
  it("khác mã hoặc quá 60 s thì tách mục", () => {
    let l = addEntry([], e("A", new Date(1e12).toISOString()));
    l = addEntry(l, e("B", new Date(1e12 + 1000).toISOString()));
    l = addEntry(l, e("A", new Date(1e12 + 120000).toISOString()));
    expect(l).toHaveLength(3);
  });
});
